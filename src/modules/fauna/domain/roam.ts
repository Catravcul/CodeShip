/**
 * How a wild animal roams its territory: pure functions of time, so the same moment always looks the same (shared by
 * the sanctuaries: sanctuary 1's families, sanctuary 3's biome).
 */
export interface P2 {
  readonly x: number;
  readonly z: number;
}

/** A stable random in [0, 1) for (seed, i). */
export function hash01(seed: number, i: number): number {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i | 0, 0x85ebca77)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** The i-th waypoint of a territory: uniform over its disc. */
export function waypoint(home: P2, radius: number, seed: number, i: number): P2 {
  const a = hash01(seed, 2 * i) * Math.PI * 2;
  const r = radius * Math.sqrt(hash01(seed, 2 * i + 1));
  return { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r };
}

/**
 * Where a wandering animal is at time `t` (s): it walks from waypoint to waypoint at `speed` and rests `rest` s at each.
 * Every leg lasts the same (the longest walk plus the rest), so the leg of any moment is found at once.
 */
export function wanderAt(home: P2, radius: number, seed: number, t: number, speed: number, rest = 6): { x: number; z: number; yaw: number; moving: boolean } {
  if (radius <= 0 || speed <= 0) return { x: home.x, z: home.z, yaw: 0, moving: false };
  const leg = (2 * radius) / speed + rest;
  const i = Math.floor(t / leg);
  const into = t - i * leg;
  const a = waypoint(home, radius, seed, i);
  const b = waypoint(home, radius, seed, i + 1);
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  const walk = d / speed;
  if (into >= walk) return { x: b.x, z: b.z, yaw, moving: false };
  const f = into / walk;
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, yaw, moving: true };
}
