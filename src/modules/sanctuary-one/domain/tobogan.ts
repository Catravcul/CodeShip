/**
 * A ride down a slide (Berón 2026-11-24: «¿es posible hacer un tobogán real?»): she sits at its mouth and goes down
 * its path by gravity against the friction of her clothes on the plastic, sped up on the steep stretches and slowed on
 * the run-out, and comes out at its end. Pure.
 *
 * Facts: on a slide the speed follows a = g (sin θ − μ cos θ) (Newton, a body on an incline); μ of clothes on a
 * polyethylene slide ≈ 0,2–0,3 (real: measured kinetic friction of cotton on HDPE; we take 0,25); EN 1176-3 asks for a
 * run-out section, nearly level, at the end so one comes out at a walking pace (real, licencia: the standard is sold;
 * its rule is cited by the play-equipment makers). The least speed (she pushes herself along a flat bit) is ours.
 */
export const SLIDE_MU = 0.25;
const G = 9.81;
/** She comes out at a walking pace, pushing herself on where it is too flat to carry her. */
export const MIN_SPEED_MS = 1.4;
/** No faster than this (a tube slide's top speed, ours). */
export const MAX_SPEED_MS = 7;

export interface P3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Ride {
  readonly path: readonly P3[];
  /** How far along it, m, and how fast, m/s. */
  readonly s: number;
  readonly v: number;
}

export interface RideAt {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The way she faces (three's yaw: atan2(dx, dz)). */
  readonly yaw: number;
  readonly done: boolean;
}

const lengths = new WeakMap<readonly P3[], number[]>();
function cum(path: readonly P3[]): number[] {
  let c = lengths.get(path);
  if (c) return c;
  c = [0];
  for (let i = 1; i < path.length; i++) c.push(c[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y, path[i]!.z - path[i - 1]!.z));
  lengths.set(path, c);
  return c;
}

/** The slide's whole length, m. */
export const slideLength = (path: readonly P3[]): number => cum(path)[path.length - 1] ?? 0;

/** At the mouth, still. */
export const startRide = (path: readonly P3[]): Ride => ({ path, s: 0, v: 0 });

function segment(r: Ride): number {
  const c = cum(r.path);
  let i = 1;
  while (i < c.length - 1 && c[i]! < r.s) i++;
  return i;
}

/** Where she is on it. */
export function rideAt(r: Ride): RideAt {
  const c = cum(r.path);
  const i = segment(r);
  const a = r.path[i - 1]!;
  const b = r.path[i]!;
  const len = c[i]! - c[i - 1]! || 1;
  const t = Math.min(1, Math.max(0, (r.s - c[i - 1]!) / len));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z), done: r.s >= c[c.length - 1]! - 1e-6 };
}

/** dt seconds on: the speed by the slope under her (a = g (sin θ − μ cos θ)), then the way. */
export function stepRide(r: Ride, dt: number): Ride {
  const c = cum(r.path);
  const total = c[c.length - 1]!;
  const i = segment(r);
  const a = r.path[i - 1]!;
  const b = r.path[i]!;
  const len = c[i]! - c[i - 1]! || 1;
  const sin = (a.y - b.y) / len;
  const cos = Math.sqrt(Math.max(0, 1 - sin * sin));
  const v = Math.min(MAX_SPEED_MS, Math.max(MIN_SPEED_MS, r.v + G * (sin - SLIDE_MU * cos) * dt));
  return { path: r.path, s: Math.min(total, r.s + v * dt), v };
}

/** The mouth of the slide she is at, if any: within `reach` m of a slide's first point, at its height. */
export function slideMouth<T extends { readonly path: readonly P3[] }>(slides: readonly T[], x: number, y: number, z: number, reach = 1.6): T | undefined {
  return slides.find((s) => {
    const m = s.path[0]!;
    return Math.hypot(m.x - x, m.z - z) <= reach && Math.abs(m.y - y) < 1.2;
  });
}
