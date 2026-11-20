/**
 * The LM's last 150 m flown by hand in the SVMF's mock-up (post 8; docs/design/santuario3-puestos.md): the descent
 * engine's throttle (10–60 % of 45 040 N, Isp 311 s) against the Moon's 1,62 m/s², and the RCS's taps for the
 * drift across the ground. It touches down when the altitude reaches 0; the landing gear took up to 3,05 m/s down
 * and 1,22 m/s across (NASA TN D-6850). Pure: the scene, the tests and the journeys share it.
 */
export interface LmSimSpec {
  readonly dryKg: number;
  readonly thrustN: number;
  readonly minThrottle: number;
  readonly maxThrottle: number;
  readonly ispS: number;
  readonly moonG: number;
  readonly startAltM: number;
  readonly propKg: number;
  readonly touchdown: { readonly verticalMs: number; readonly horizontalMs: number };
}

export interface LmSim {
  readonly altM: number;
  /** Vertical speed, m/s (+ up). */
  readonly vzMs: number;
  /** Speed across the ground, m/s (x right, y forward). */
  readonly vxMs: number;
  readonly vyMs: number;
  /** 0 (engine off) or between the minimum and the top of the throttle's range. */
  readonly throttle: number;
  readonly propKg: number;
  readonly t: number;
  /** Down: how it touched, if it has. */
  readonly landed?: { readonly ok: boolean; readonly vzMs: number; readonly acrossMs: number };
}

/** Each tap of the throttle: 5 % of full thrust. Each tap of the RCS across: 0,1 m/s (ours). */
export const THROTTLE_STEP = 0.05;
export const ACROSS_STEP_MS = 0.1;
const G0 = 9.80665;

export function lmStart(s: LmSimSpec): LmSim {
  // In at the low gate coming down at 3 m/s and drifting forward and to one side: hover is about a third of thrust.
  return { altM: s.startAltM, vzMs: -3, vxMs: 0.6, vyMs: 1.4, throttle: hoverThrottle(s, s.propKg), propKg: s.propKg, t: 0 };
}

/** The throttle that holds it still at this mass. */
export function hoverThrottle(s: LmSimSpec, propKg: number): number {
  return ((s.dryKg + propKg) * s.moonG) / s.thrustN;
}

/** One tap of the throttle (+ up, − down, 0 cut): it stays in the engine's range. */
export function lmThrottle(s: LmSimSpec, m: LmSim, step: 1 | -1 | 0): LmSim {
  if (m.landed) return m;
  if (step === 0) return { ...m, throttle: 0 };
  const from = m.throttle === 0 && step > 0 ? s.minThrottle - THROTTLE_STEP : m.throttle;
  const next = Math.round((from + step * THROTTLE_STEP) * 1000) / 1000;
  return { ...m, throttle: next < s.minThrottle - 1e-9 ? 0 : Math.min(s.maxThrottle, next) };
}

/** One tap of the RCS across the ground (x right, y forward). */
export function lmAcross(m: LmSim, axis: "x" | "y", sign: 1 | -1): LmSim {
  if (m.landed) return m;
  return axis === "x" ? { ...m, vxMs: m.vxMs + sign * ACROSS_STEP_MS } : { ...m, vyMs: m.vyMs + sign * ACROSS_STEP_MS };
}

/** Let `dt` seconds pass; on touching the ground it says how. */
export function lmStep(s: LmSimSpec, m: LmSim, dt: number): LmSim {
  if (m.landed || dt <= 0) return m;
  const on = m.propKg > 0 ? m.throttle : 0;
  const thrust = on * s.thrustN;
  const mass = s.dryKg + m.propKg;
  const az = thrust / mass - s.moonG;
  const vz = m.vzMs + az * dt;
  const alt = m.altM + ((m.vzMs + vz) / 2) * dt;
  const prop = Math.max(0, m.propKg - (thrust / (s.ispS * G0)) * dt);
  const next = { ...m, altM: alt, vzMs: vz, propKg: prop, t: m.t + dt, throttle: prop > 0 ? m.throttle : 0 };
  if (alt > 0) return next;
  const across = Math.hypot(m.vxMs, m.vyMs);
  return { ...next, altM: 0, landed: { ok: -vz <= s.touchdown.verticalMs + 1e-9 && across <= s.touchdown.horizontalMs + 1e-9, vzMs: vz, acrossMs: across } };
}
