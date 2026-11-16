import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MoonlitAudio } from "../src/audio/engine.ts";
import { DEFAULT_AUDIO, MUSIC_ID, SOUND_NAMES, audioPreferences } from "../shared/audio.ts";

class Gain {
  gain = { value: 0, target: 0, cancelScheduledValues() {}, setTargetAtTime(value: number) { this.target = value; } };
  connect() {}
}
class Source {
  buffer: AudioBuffer | null = null;
  loop = false;
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  offset = 0;
  connect() {}
  disconnect() {}
  start(_when = 0, offset = 0) { this.started = true; this.offset = offset; }
  stop() { this.stopped = true; this.onended?.(); }
}
class Context {
  state = "suspended";
  currentTime = 0;
  destination = {};
  onstatechange: (() => void) | null = null;
  sources: Source[] = [];
  gains: Gain[] = [];
  createGain() { const gain = new Gain(); this.gains.push(gain); return gain; }
  createDynamicsCompressor() { return { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect() {} }; }
  createBufferSource() { const source = new Source(); this.sources.push(source); return source; }
  async decodeAudioData() { return { duration: 106.666667 } as AudioBuffer; }
  async resume() { this.state = "running"; this.onstatechange?.(); }
  async suspend() { this.state = "suspended"; this.onstatechange?.(); }
  async close() { this.state = "closed"; }
}
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
function harness(options: { saved?: string; fetch?: typeof fetch; unavailable?: boolean; brokenStorage?: boolean } = {}) {
  const context = new Context();
  const requests: string[] = [];
  let storage = options.saved ?? null;
  let contexts = 0;
  let now = 1000;
  const engine = new MoonlitAudio({
    createContext: () => { contexts++; if (options.unavailable) throw new Error("unsupported"); return context as unknown as AudioContext; },
    fetch: async (...args) => {
      requests.push(String(args[0]));
      return options.fetch ? options.fetch(...args) : new Response(new Uint8Array([1, 2, 3]));
    },
    now: () => now,
    read: () => { if (options.brokenStorage) throw new Error("blocked"); return storage; },
    write: value => { if (options.brokenStorage) throw new Error("full"); storage = value; },
  });
  return { engine, context, requests, get contexts() { return contexts; }, get storage() { return storage; }, advance: (milliseconds = 100) => { now += milliseconds; } };
}

test("声音默认关闭：不建立音频上下文，也不下载或播放资源", async () => {
  const h = harness({ saved: "bad-json" });
  await h.engine.play("ready");
  await h.engine.unlock();
  assert.equal(h.contexts, 0);
  assert.equal(h.requests.length, 0);
  assert.equal(h.engine.getSnapshot().enabled, false);
  h.engine.dispose();
});

test("开启后只建立一条循环音乐，重复交互复用已解码资源", async () => {
  const h = harness();
  h.engine.setEnabled(true);
  await flush();
  await Promise.all([h.engine.unlock(), h.engine.play("select"), h.engine.play("select")]);
  await flush();
  assert.equal(h.contexts, 1);
  assert.equal(h.context.sources.filter(source => source.loop).length, 1);
  assert.equal(h.context.sources.filter(source => !source.loop).length, 1);
  assert.equal(h.requests.filter(path => path.includes(MUSIC_ID)).length, 1);
  assert.equal(h.engine.getSnapshot().status, "playing");
  assert.equal(JSON.parse(h.storage!).enabled, true);
  h.engine.dispose();
});

test("静音能阻止尚未完成的音乐加载和音效播放，重新开启不会重复开轨", async () => {
  let finish!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  const h = harness({ fetch: async url => String(url).includes(MUSIC_ID) ? pending : new Response(new Uint8Array([1])) });
  h.engine.setEnabled(true);
  await flush();
  const sound = h.engine.play("flip");
  h.engine.setEnabled(false);
  finish(new Response(new Uint8Array([1])));
  await sound;
  await flush();
  assert.equal(h.context.sources.length, 0);
  assert.equal(h.engine.getSnapshot().status, "off");
  h.engine.setEnabled(true);
  await flush();
  assert.equal(h.context.sources.filter(source => source.loop).length, 1);
  h.engine.dispose();
});

test("后台停止所有声音，隐藏期间的回复不播放，回来从原位置继续", async () => {
  const h = harness();
  h.engine.setEnabled(true);
  await flush();
  await h.engine.play("select");
  h.context.currentTime = 17;
  h.engine.setHidden(true);
  assert(h.context.sources.every(source => source.stopped));
  const count = h.context.sources.length;
  await h.engine.play("answer");
  assert.equal(h.context.sources.length, count);
  h.context.currentTime = 22;
  h.engine.setHidden(false);
  await flush();
  assert.equal(h.context.sources.at(-1)?.offset, 17);
  assert.equal(h.engine.getSnapshot().enabled, true);
  h.engine.dispose();
});

test("独立音量支持归零、平滑修改及恢复；损坏数值不会传给音频节点", async () => {
  assert.deepEqual(audioPreferences({ enabled: "true", musicVolume: NaN, effectsVolume: 2 }), { ...DEFAULT_AUDIO, effectsVolume: 1 });
  const h = harness();
  h.engine.setEnabled(true);
  await flush();
  h.engine.setVolume("effectsVolume", 0);
  await h.engine.play("flip");
  assert.equal(h.context.sources.filter(source => !source.loop).length, 0);
  h.engine.setVolume("musicVolume", .22);
  assert.equal(h.context.gains[1].gain.target, .22);
  const restored = harness({ saved: h.storage! });
  assert.equal(restored.engine.getSnapshot().musicVolume, .22);
  assert.equal(restored.engine.getSnapshot().effectsVolume, 0);
  assert.equal(restored.contexts, 0, "刷新后仍须等待浏览器交互再播放");
  restored.engine.dispose();
  h.engine.dispose();
});

test("Ogg 不可用时使用 MP3；两种格式都失败时允许重试", async () => {
  let available = false;
  const h = harness({ fetch: async url => available && String(url).endsWith(".mp3") ? new Response(new Uint8Array([1])) : new Response(null, { status: 404 }) });
  h.engine.setEnabled(true);
  await flush();
  assert.equal(h.engine.getSnapshot().status, "error");
  assert.equal(h.context.sources.length, 0);
  available = true;
  await h.engine.unlock();
  await flush();
  assert.equal(h.engine.getSnapshot().status, "playing");
  assert(h.requests.some(path => path.endsWith(`${MUSIC_ID}.mp3`)));
  h.engine.dispose();
});

test("快速操作的音效最多六个声部，避免累积和音量叠加", async () => {
  const h = harness();
  h.engine.setEnabled(true);
  await flush();
  for (let i = 0; i < 14; i++) { h.advance(); await h.engine.play("select"); }
  assert.equal(h.context.sources.filter(source => !source.loop && !source.stopped).length, 6);
  assert.equal(h.context.sources.filter(source => source.loop && !source.stopped).length, 1);
  h.engine.dispose();
});

test("不支持音频或禁止本地存储时，操作仍然正常结束", async () => {
  const unsupported = harness({ unavailable: true });
  unsupported.engine.setEnabled(true);
  await flush();
  await assert.doesNotReject(unsupported.engine.play("error"));
  assert.equal(unsupported.engine.getSnapshot().status, "error");
  unsupported.engine.dispose();
  const privateMode = harness({ brokenStorage: true });
  privateMode.engine.setEnabled(true);
  await flush();
  assert.equal(privateMode.engine.getSnapshot().status, "playing");
  privateMode.engine.dispose();
});

test("原创配乐和17种音效完整交付，双格式都有独立文件且无重复内容", async () => {
  const directory = new URL("../public/audio/v1/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8"));
  const expected = [MUSIC_ID, ...SOUND_NAMES].sort();
  assert.deepEqual(manifest.tracks.map((track: {id: string}) => track.id).sort(), expected);
  const hashes = new Set<string>();
  for (const track of manifest.tracks) {
    assert(track.peakDbFS <= -3);
    assert(track.duration > .1);
    for (const format of ["ogg", "mp3"]) {
      const file = await readFile(new URL(`${track.id}.${format}`, directory));
      assert(file.length > 500);
      if (format === "ogg") assert.equal(file.subarray(0, 4).toString(), "OggS");
      const hash = createHash("sha256").update(file).digest("hex");
      assert(!hashes.has(hash));
      hashes.add(hash);
    }
  }
  const music = manifest.tracks.find((track: {id: string}) => track.id === MUSIC_ID);
  assert.equal(music.loop, true);
  assert(music.duration > 100 && music.duration < 110);
  assert(music.seamDelta < .01);
});
