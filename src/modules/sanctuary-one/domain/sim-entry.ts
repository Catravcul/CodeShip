/**
 * Entering the simulation machine (Cold Sanctuary, Assets/Scripts/Meditation/VirtualizationTank.cs `Enter`; Berón
 * 2026-11-23: «va de entrar en la máquina con equipos de respiración que se toma de la puerta, colocarse en el centro,
 * flotar hasta la mitad vertical y abrirse en piernas y brazos y la cámara giraba alrededor»), as a timeline: where she
 * is and what the machine does at each moment. Pure: the scene only draws it.
 */
export type SimPhase = "acercarse" | "mascara" | "abrir" | "entrar" | "cerrar" | "centro" | "flotar" | "estrella" | "fin";

/** Each phase's length, s (the whole ≈ 9 s; the orbiting camera's 6,5 s of Cold Sanctuary from «abrir» on). */
export const SIM_PHASES: readonly (readonly [SimPhase, number])[] = [
  ["acercarse", 1.0],
  ["mascara", 1.0],
  ["abrir", 0.8],
  ["entrar", 1.4],
  ["cerrar", 0.6],
  ["centro", 0.6],
  ["flotar", 1.4],
  ["estrella", 2.2],
];
export const SIM_ENTRY_S = SIM_PHASES.reduce((n, [, s]) => n + s, 0);

export interface SimMoment {
  readonly phase: SimPhase;
  /** How far into the phase, 0…1. */
  readonly k: number;
  /** Where she is on her way: 0 at her start, 1 at the door (outside), 2 inside behind the door, 3 at the centre. */
  readonly along: number;
  /** How high she floats over the tank's floor, as a share of the water's height (½ at the end: «la mitad vertical»). */
  readonly rise: number;
  /** The doors' opening, 0 closed … 1 open (they slide to the sides). */
  readonly doors: number;
  /** She has the breathing mask on (taken from its hook at the door). */
  readonly mask: boolean;
  /** Arms and legs opened out, 0…1 (the star at the end). */
  readonly star: number;
  /** The camera's turn round the tank, rad (from «abrir» on, a full turn by the end). */
  readonly orbit: number;
  /** The fade to the simulation, 0…1 (the last 0,6 s). */
  readonly fade: number;
}

const ease = (k: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, k)));

/** The moment `t` s into the entry. */
export function simMoment(t: number): SimMoment {
  let at = 0;
  let phase: SimPhase = "fin";
  let k = 1;
  for (const [p, s] of SIM_PHASES) {
    if (t < at + s) {
      phase = p;
      k = (t - at) / s;
      break;
    }
    at += s;
  }
  const idx = SIM_PHASES.findIndex(([p]) => p === phase);
  const past = (p: SimPhase) => idx < 0 || idx > SIM_PHASES.findIndex(([q]) => q === p);
  const along = phase === "acercarse" ? ease(k) : phase === "entrar" ? 1 + ease(k) : phase === "centro" ? 2 + ease(k) : past("centro") ? 3 : past("acercarse") ? (past("entrar") ? 2 : 1) : 0;
  const doors = phase === "abrir" ? ease(k) : phase === "entrar" ? 1 : phase === "cerrar" ? 1 - ease(k) : 0;
  const rise = phase === "flotar" ? 0.5 * ease(k) : past("flotar") ? 0.5 : 0;
  const star = phase === "estrella" ? ease(Math.min(1, k * 2)) : phase === "fin" ? 1 : 0;
  const startOrbit = SIM_PHASES.slice(0, 2).reduce((n, [, s]) => n + s, 0);
  const orbit = t <= startOrbit ? 0 : (2 * Math.PI * Math.min(1, (t - startOrbit) / (SIM_ENTRY_S - startOrbit))) * 0.75;
  const fade = Math.max(0, Math.min(1, (t - (SIM_ENTRY_S - 0.6)) / 0.6));
  return { phase, k, along, rise, doors, mask: past("acercarse") || (phase === "mascara" && k > 0.5), star, orbit, fade };
}
