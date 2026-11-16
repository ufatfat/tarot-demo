import { AUDIO_STORAGE_KEY, SOUND_NAMES, type SoundName } from "../../shared/audio.ts";
import { MoonlitAudio } from "./engine.ts";

export const audio = new MoonlitAudio({
  createContext: () => new AudioContext(),
  fetch: (...args) => fetch(...args),
  now: () => performance.now(),
  read: () => localStorage.getItem(AUDIO_STORAGE_KEY),
  write: (value) => localStorage.setItem(AUDIO_STORAGE_KEY, value),
});

export function installAudioInteractions() {
  const key = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || ["Escape", "Tab", "Shift", "Control", "Alt", "Meta"].includes(event.key) || /^F\d+$/.test(event.key)) return;
    void audio.unlock();
  };
  const visibility = () => audio.setHidden(document.hidden);
  const hide = () => audio.setHidden(true);
  const click = (event: MouseEvent) => {
    void audio.unlock();
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("button");
    if (!button || button.disabled || button.closest('[data-sound="none"]')) return;
    const name = button.dataset.sound ?? "tap";
    if (SOUND_NAMES.includes(name as SoundName)) void audio.play(name as SoundName);
  };
  visibility();
  document.addEventListener("keydown", key);
  document.addEventListener("click", click, true);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", visibility);
  return () => {
    document.removeEventListener("keydown", key);
    document.removeEventListener("click", click, true);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("pageshow", visibility);
    audio.setHidden(true);
  };
}
