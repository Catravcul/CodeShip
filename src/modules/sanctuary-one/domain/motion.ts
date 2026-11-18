/**
 * MOVEMENT of sanctuary 1 (docs/design/santuario1.md §Movimiento): the animals wander inside their family's territory
 * and the people follow the workday from place to place along real routes (walking on the ice, swimming in the sea and
 * up the trunks). Pure functions of time, so the same moment always looks the same and nothing needs saving.
 */
export interface P2 {
  readonly x: number;
  readonly z: number;
}

/**
 * Real seconds a day of sanctuary 1 lasts: Cold Sanctuary's (its TimeController, 60 real minutes), so its workday works
 * as there («de un árbol a otro se tarda casi una hora de juego»). The ship's days are shorter (core/board-time.ts).
 */
export const S1_DAY_REAL_S = 3600;
/** The hour the scene opens at: breakfast is over and everyone heads to the first training. */
export const S1_START_HOUR = 7.8;

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

/** A point of a route; `swim` marks the way TO it as swimming (sea, trunk). */
export interface Waypoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly swim?: boolean;
}

/** A route with its cumulative lengths. */
export interface Route {
  readonly points: readonly Waypoint[];
  readonly at: readonly number[];
  readonly length: number;
}

export function route(points: readonly Waypoint[]): Route {
  const at = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    at.push(at[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  return { points, at, length: at[at.length - 1] ?? 0 };
}

/** The point `s` metres along a route, its heading on the plan and whether that stretch is swum. */
export function along(r: Route, s: number): { x: number; y: number; z: number; yaw: number; swim: boolean; done: boolean } {
  const p = r.points;
  if (p.length === 0) return { x: 0, y: 0, z: 0, yaw: 0, swim: false, done: true };
  if (s >= r.length || p.length === 1) {
    const e = p[p.length - 1]!;
    const q = p[Math.max(0, p.length - 2)]!;
    return { x: e.x, y: e.y, z: e.z, yaw: Math.atan2(e.x - q.x, e.z - q.z), swim: !!e.swim, done: true };
  }
  let i = 1;
  while (i < p.length - 1 && r.at[i]! < s) i++;
  const a = p[i - 1]!;
  const b = p[i]!;
  const seg = r.at[i]! - r.at[i - 1]!;
  const f = seg > 0 ? (s - r.at[i - 1]!) / seg : 1;
  const flat = Math.hypot(b.x - a.x, b.z - a.z) > 0.05;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, yaw: flat ? Math.atan2(b.x - a.x, b.z - a.z) : NaN, swim: !!b.swim, done: false };
}

/**
 * THE WORKDAY (Cold Sanctuary's WorkdayDirector: «8–9 entrenamiento · 9–11 tareas · 11–12 comida · 12–14 tareas ·
 * 14–15 entrenamiento · 15–16 tareas · LIBRE»), with the breakfast before it and the night in their rooms.
 */
export type Activity = "dormir" | "desayuno" | "entrenamiento" | "tareas" | "comida" | "libre";

export const WORKDAY: readonly (readonly [from: number, activity: Activity])[] = [
  [0, "dormir"], [7, "desayuno"], [8, "entrenamiento"], [9, "tareas"], [11, "comida"], [12, "tareas"], [14, "entrenamiento"], [15, "tareas"], [16, "libre"], [22, "dormir"],
];

export function activityAt(hour: number): Activity {
  const h = ((hour % 24) + 24) % 24;
  let a: Activity = "dormir";
  for (const [from, act] of WORKDAY) if (h >= from) a = act;
  return a;
}
