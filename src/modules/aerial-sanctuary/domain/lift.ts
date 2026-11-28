/**
 * The trunk lift of the aerial sanctuary (Cold Sanctuary's AereoLift and AereoRule; docs/sitio-nuclear.md §23):
 * a watertight cab that runs inside a tree-building's water trunk, from the cap's platform to each floor, the roof
 * and, in the launch tree, the launch crown. In Codeship the ride is seen (reglas.md §3.1: no fade to black).
 */
export interface LiftSpec {
  /** Cruise speed, m/s. */
  readonly speedMs: number;
  /** Acceleration and braking, m/s². */
  readonly accelMs2: number;
  /** Doors at each end, s. */
  readonly doorS: number;
}

/**
 * A run of `len` m that speeds up at `a` to `v` and brakes the same (Cold Sanctuary's SiteLineRule.Run): with room
 * to reach cruise, len / v + v / a; if not, a triangle, 2·√(len / a).
 */
export function runSeconds(len: number, v: number, a: number): number {
  const l = Math.abs(len);
  return l >= (v * v) / a ? l / v + v / a : 2 * Math.sqrt(l / a);
}

/** A whole ride, doors included (AereoRule.LiftSeconds). */
export function liftSeconds(rise: number, s: LiftSpec): number {
  return runSeconds(rise, s.speedMs, s.accelMs2) + 2 * s.doorS;
}

/** Where the cab is `t` s into a run from `from` to `to` (m): trapezoid or triangle of speed, so it is seen. */
export function cabHeight(from: number, to: number, t: number, s: LiftSpec): number {
  const len = Math.abs(to - from);
  const dir = Math.sign(to - from);
  const v = s.speedMs;
  const a = s.accelMs2;
  const total = runSeconds(len, v, a);
  const tc = Math.max(0, Math.min(total, t));
  let d: number;
  if (len >= (v * v) / a) {
    const ta = v / a;
    if (tc <= ta) d = 0.5 * a * tc * tc;
    else if (tc <= total - ta) d = 0.5 * a * ta * ta + v * (tc - ta);
    else {
      const r = total - tc;
      d = len - 0.5 * a * r * r;
    }
  } else {
    const half = total / 2;
    d = tc <= half ? 0.5 * a * tc * tc : len - 0.5 * a * (total - tc) ** 2;
  }
  return from + dir * d;
}

/** The phases of one ride, with their times: doors close, run, doors open. */
export type LiftPhase = "cerrando" | "viajando" | "abriendo" | "parado";

export function liftPhase(rise: number, t: number, s: LiftSpec): LiftPhase {
  const run = runSeconds(rise, s.speedMs, s.accelMs2);
  if (t < s.doorS) return "cerrando";
  if (t < s.doorS + run) return "viajando";
  if (t < 2 * s.doorS + run) return "abriendo";
  return "parado";
}
