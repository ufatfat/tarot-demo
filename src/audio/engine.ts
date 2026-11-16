import { DEFAULT_AUDIO, MUSIC_ID, SOUND_NAMES, audioPreferences, type AudioPreferences, type SoundName } from "../../shared/audio.ts";

export interface AudioSnapshot extends AudioPreferences {
  status: "off" | "paused" | "loading" | "playing" | "error";
  error: string;
}
export interface AudioPlatform {
  createContext: () => AudioContext;
  fetch: typeof fetch;
  now: () => number;
  read: () => string | null;
  write: (value: string) => void;
}

/** One audio graph per page. All sounds are local files; failures never interrupt a game action. */
export class MoonlitAudio {
  private state: AudioSnapshot;
  private listeners = new Set<() => void>();
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private effectsGain?: GainNode;
  private music?: AudioBufferSourceNode;
  private musicStartedAt = 0;
  private musicOffset = 0;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private voices = new Set<AudioBufferSourceNode>();
  private recent = new Map<SoundName, number>();
  private epoch = 0;
  private hidden = false;
  private unlocked = false;
  private resuming?: Promise<void>;
  private musicTask?: Promise<void>;
  private suspendTimer?: ReturnType<typeof setTimeout>;

  constructor(private platform: AudioPlatform) {
    let preferences = DEFAULT_AUDIO;
    try { preferences = audioPreferences(JSON.parse(platform.read() ?? "null")); } catch {}
    this.state = { ...preferences, status: preferences.enabled ? "paused" : "off", error: "" };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<AudioSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private save() {
    const { enabled, musicVolume, effectsVolume } = this.state;
    try { this.platform.write(JSON.stringify({ enabled, musicVolume, effectsVolume })); } catch {}
  }
  private graph() {
    if (!this.context) {
      const context = this.platform.createContext();
      const master = context.createGain();
      const music = context.createGain();
      const effects = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.knee.value = 12;
      compressor.ratio.value = 12;
      compressor.attack.value = .003;
      compressor.release.value = .18;
      master.gain.value = 0;
      music.gain.value = this.state.musicVolume;
      effects.gain.value = this.state.effectsVolume;
      music.connect(master);
      effects.connect(master);
      // Keep overlapping card sounds from producing sudden volume spikes.
      master.connect(compressor);
      compressor.connect(context.destination);
      this.context = context;
      this.master = master;
      this.musicGain = music;
      this.effectsGain = effects;
      context.onstatechange = () => {
        if (context.state !== "running" && this.state.enabled && this.state.status !== "error")
          this.update({ status: "paused" });
        else if (context.state === "running" && this.state.enabled && !this.hidden && this.music)
          this.update({ status: "playing" });
      };
    }
    return this.context;
  }
  private ramp(gain: GainNode | undefined, value: number, seconds = .045) {
    if (!gain || !this.context) return;
    gain.gain.cancelScheduledValues(this.context.currentTime);
    gain.gain.setTargetAtTime(value, this.context.currentTime, seconds);
  }
  private load(id: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const context = this.graph();
    const task = (async () => {
      for (const format of ["ogg", "mp3"]) {
        try {
          const response = await this.platform.fetch(`/audio/v1/${id}.${format}`, { signal: AbortSignal.timeout(12000) });
          if (!response.ok) throw new Error("Audio asset unavailable");
          return await context.decodeAudioData(await response.arrayBuffer());
        } catch { /* MP3 is a compatibility fallback when Ogg decoding is unavailable. */ }
      }
      throw new Error("Audio asset unavailable");
    })();
    this.buffers.set(id, task);
    void task.catch(() => { if (this.buffers.get(id) === task) this.buffers.delete(id); });
    return task;
  }
  private startMusic() {
    if (this.music || this.musicTask || !this.state.enabled || this.hidden) return;
    const epoch = this.epoch;
    this.update({ status: "loading", error: "" });
    const task = (async () => {
      try {
        const buffer = await this.load(MUSIC_ID);
        if (epoch !== this.epoch || !this.state.enabled || this.hidden || this.music) return;
        const context = this.graph();
        if (context.state !== "running") { this.update({ status: "paused" }); return; }
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(this.musicGain!);
        source.onended = () => source.disconnect();
        this.musicOffset %= buffer.duration;
        source.start(0, this.musicOffset);
        this.musicStartedAt = context.currentTime;
        this.music = source;
        this.update({ status: "playing", error: "" });
      } catch {
        if (epoch === this.epoch && this.state.enabled && !this.hidden)
          this.update({ status: "error", error: "音乐暂时未能加载，可以重试。" });
      }
    })();
    this.musicTask = task;
    void task.finally(() => { if (this.musicTask === task) this.musicTask = undefined; });
  }
  /** Call from a real pointer/keyboard gesture; resume is invoked before awaiting anything. */
  unlock = (): Promise<void> => {
    if (!this.state.enabled || this.hidden) return Promise.resolve();
    if (this.resuming) return this.resuming;
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    const epoch = this.epoch;
    const task = (async () => {
      try {
        const context = this.graph();
        await context.resume();
        if (epoch !== this.epoch || !this.state.enabled || this.hidden) return;
        if (context.state !== "running") throw new Error("Audio is suspended");
        this.unlocked = true;
        this.ramp(this.master, 1, .18);
        this.startMusic();
        // Decode short clips once so the actual interaction has no network latency.
        for (const name of SOUND_NAMES) void this.load(name).catch(() => {});
      } catch {
        if (epoch === this.epoch && this.state.enabled)
          this.update({ status: "error", error: "声音暂时无法开启，请点击重试。" });
      }
    })();
    this.resuming = task;
    void task.finally(() => { if (this.resuming === task) this.resuming = undefined; });
    return task;
  };
  setEnabled(enabled: boolean) {
    this.update({ enabled, error: "" });
    this.save();
    if (enabled) void this.unlock();
    else { this.pause(); this.update({ status: "off" }); }
  }
  setVolume(channel: "musicVolume" | "effectsVolume", value: number) {
    const preferences = audioPreferences({ ...this.state, [channel]: value });
    this.update(preferences);
    this.save();
    this.ramp(channel === "musicVolume" ? this.musicGain : this.effectsGain, preferences[channel]);
  }
  setHidden(hidden: boolean) {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    if (hidden) this.pause();
    else if (this.state.enabled && this.unlocked) void this.unlock();
  }
  private pause() {
    this.epoch++;
    this.resuming = undefined;
    this.musicTask = undefined;
    const context = this.context;
    if (this.music && context) {
      this.musicOffset = (this.musicOffset + context.currentTime - this.musicStartedAt) % this.music.buffer!.duration;
      this.music.stop(context.currentTime + .12);
      this.music = undefined;
    }
    for (const voice of this.voices) voice.stop((context?.currentTime ?? 0) + .12);
    this.voices.clear();
    this.ramp(this.master, 0, .025);
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    if (context) this.suspendTimer = setTimeout(() => {
      if (!this.state.enabled || this.hidden) void context.suspend().catch(() => {});
    }, 150);
    this.update({ status: this.state.enabled ? "paused" : "off" });
  }
  play = async (name: SoundName) => {
    if (!this.state.enabled || this.hidden || this.state.effectsVolume === 0) return;
    const requestedAt = this.platform.now();
    if (requestedAt - (this.recent.get(name) ?? -Infinity) < 85) return;
    this.recent.set(name, requestedAt);
    const epoch = this.epoch;
    try {
      await this.unlock();
      const buffer = await this.load(name);
      if (epoch !== this.epoch || !this.state.enabled || this.hidden || this.state.effectsVolume === 0 || this.platform.now() - requestedAt > 800) return;
      const context = this.graph();
      if (context.state !== "running") return;
      if (this.voices.size >= 6) {
        const oldest = this.voices.values().next().value!;
        oldest.stop();
        this.voices.delete(oldest);
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.effectsGain!);
      source.onended = () => { this.voices.delete(source); source.disconnect(); };
      source.start();
      this.voices.add(source);
    } catch { /* Audio is optional: network/codec errors must never block the game. */ }
  };
  dispose() {
    this.hidden = true;
    this.pause();
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); }
    this.listeners.clear();
  }
}
