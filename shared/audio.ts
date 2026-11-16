export const SOUND_NAMES = [
  "tap", "open", "close", "shuffle", "select", "deselect", "deal", "flip",
  "reveal-all", "send", "ready", "answer", "cancel", "reset", "erase", "error", "success",
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];
export const MUSIC_ID = "moonlit-nocturne";
export const AUDIO_STORAGE_KEY = "moonlit-audio-v1";
export interface AudioPreferences {
  enabled: boolean;
  musicVolume: number;
  effectsVolume: number;
}
export const DEFAULT_AUDIO: AudioPreferences = {
  enabled: false,
  musicVolume: 0.36,
  effectsVolume: 0.55,
};
export function audioPreferences(value: unknown): AudioPreferences {
  const candidate = value && typeof value === "object" ? value as Partial<AudioPreferences> : {};
  const volume = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  return {
    enabled: candidate.enabled === true,
    musicVolume: volume(candidate.musicVolume, DEFAULT_AUDIO.musicVolume),
    effectsVolume: volume(candidate.effectsVolume, DEFAULT_AUDIO.effectsVolume),
  };
}
