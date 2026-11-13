/**
 * Short synthesized cues (Web Audio, no files): the ram warning and the thud of an impact. Silent where
 * the browser has no audio or has not been allowed to play yet.
 */
let ctx: AudioContext | null | undefined;
/** General setting «Sonido» (docs/design/habitaculo.md §Ajustes): off, the cues stay silent. */
let soundOn = true;
export function setSound(on: boolean): void {
  soundOn = on;
}

function audio(): AudioContext | null {
  if (!soundOn) return null;
  if (ctx !== undefined) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = AC ? new AC() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(a: AudioContext, at: number, freq: number, dur: number, gain: number, type: OscillatorType, endFreq = freq): void {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** Browsers start audio suspended: wake it on the first touch or key. */
export function unlockAudio(): void {
  const wake = () => void audio()?.resume().catch(() => undefined);
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
}

/** Three falling two-tone beeps: something big is coming at you. */
export function ramAlarm(): void {
  const a = audio();
  if (!a || a.state !== "running") return;
  const t = a.currentTime;
  for (let i = 0; i < 3; i++) {
    tone(a, t + i * 0.45, 880, 0.18, 0.12, "square", 660);
    tone(a, t + i * 0.45 + 0.2, 660, 0.18, 0.12, "square", 440);
  }
}

/** A low thud with a rumble: the impact. */
export function impactThud(): void {
  const a = audio();
  if (!a || a.state !== "running") return;
  const t = a.currentTime;
  tone(a, t, 90, 0.8, 0.4, "sine", 30);
  tone(a, t, 160, 0.35, 0.15, "sawtooth", 40);
}
