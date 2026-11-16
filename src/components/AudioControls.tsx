import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, LoaderCircle, Volume2, VolumeX, X } from "lucide-react";
import { audio } from "../audio";

export function AudioControls() {
  const state = useSyncExternalStore(audio.subscribe, audio.getSnapshot);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); settingsRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const label = state.enabled ? "关闭声音" : "开启声音";
  return (
    <div className={`audio-controls ${state.enabled ? "sound-on" : ""}`} ref={ref} data-sound="none" data-audio-state={state.status}>
      <div className="audio-buttons">
        <button
          className="audio-toggle"
          aria-label={label}
          aria-pressed={state.enabled}
          title={label}
          onClick={() => audio.setEnabled(!state.enabled)}
        >
          {state.status === "loading" ? <LoaderCircle size={15} className="spin" /> : state.enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{state.enabled ? "声音已开" : "开启声音"}</span>
        </button>
        <button
          ref={settingsRef}
          className="audio-settings"
          aria-label="调整音量"
          aria-expanded={open}
          aria-controls="audio-panel"
          onClick={() => setOpen(!open)}
        >
          <ChevronDown size={13} />
        </button>
      </div>
      {open && (
        <div id="audio-panel" className="audio-panel" role="region" aria-label="声音设置">
          <div className="audio-panel-heading">
            <span>声音</span>
            <button aria-label="关闭声音设置" onClick={() => { setOpen(false); settingsRef.current?.focus(); }}><X size={15} /></button>
          </div>
          {([
            ["musicVolume", "背景音乐"],
            ["effectsVolume", "操作音效"],
          ] as const).map(([channel, text]) => (
            <label className="audio-volume" key={channel}>
              <span>{text}<output>{Math.round(state[channel] * 100)}%</output></span>
              <input
                type="range" min="0" max="100" step="1"
                aria-label={`${text}音量`}
                value={Math.round(state[channel] * 100)}
                onChange={(event) => audio.setVolume(channel, Number(event.target.value) / 100)}
                onPointerUp={() => { if (channel === "effectsVolume") void audio.play("select"); }}
                onKeyUp={(event) => { if (channel === "effectsVolume" && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) void audio.play("select"); }}
              />
            </label>
          ))}
          {state.error && <p className="audio-error" role="status">{state.error}<button onClick={() => { void audio.unlock(); }}>重试</button></p>}
          <p className="audio-track-credit">月下回声 · 原创配乐</p>
        </div>
      )}
    </div>
  );
}
