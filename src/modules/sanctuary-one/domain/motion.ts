/**
 * MOVEMENT of sanctuary 1 (docs/design/santuario1.md §Movimiento): the animals wander inside their family's territory
 * and the people follow the workday from place to place along real routes (walking on the ice, swimming in the sea and
 * up the trunks). Pure functions of time, so the same moment always looks the same and nothing needs saving.
 */
import { hash01, waypoint, wanderAt, type P2 } from "@modules/fauna/domain/roam";

export { hash01, waypoint, wanderAt, type P2 };

/**
 * Real seconds a day of sanctuary 1 lasts: Cold Sanctuary's (its TimeController, 60 real minutes), so its workday works
 * as there («de un árbol a otro se tarda casi una hora de juego»). The ship's days are shorter (core/board-time.ts).
 */
export const S1_DAY_REAL_S = 3600;
/** The hour the scene opens at: breakfast is over and everyone heads to the first training. */
export const S1_START_HOUR = 7.8;

/** A point of a route; `swim` marks the way TO it as swimming (sea, trunk), `fly` as flown on a carpet. */
export interface Waypoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly swim?: boolean;
  readonly fly?: boolean;
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
export function along(r: Route, s: number): { x: number; y: number; z: number; yaw: number; swim: boolean; fly: boolean; done: boolean } {
  const p = r.points;
  if (p.length === 0) return { x: 0, y: 0, z: 0, yaw: 0, swim: false, fly: false, done: true };
  if (s >= r.length || p.length === 1) {
    const e = p[p.length - 1]!;
    const q = p[Math.max(0, p.length - 2)]!;
    return { x: e.x, y: e.y, z: e.z, yaw: Math.atan2(e.x - q.x, e.z - q.z), swim: !!e.swim, fly: !!e.fly, done: true };
  }
  let i = 1;
  while (i < p.length - 1 && r.at[i]! < s) i++;
  const a = p[i - 1]!;
  const b = p[i]!;
  const seg = r.at[i]! - r.at[i - 1]!;
  const f = seg > 0 ? (s - r.at[i - 1]!) / seg : 1;
  const flat = Math.hypot(b.x - a.x, b.z - a.z) > 0.05;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, yaw: flat ? Math.atan2(b.x - a.x, b.z - a.z) : NaN, swim: !!b.swim, fly: !!b.fly, done: false };
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

/**
 * A vehicle that goes out along a route and comes back, over and over: `rest` s at the start, the way out at `speed`
 * m/s, `away` s at the end, and the way back. Its heading is the way it moves (the last one while it waits).
 */
export function shuttle(r: Route, t: number, speed: number, rest: number, away: number): { x: number; y: number; z: number; yaw: number; moving: boolean } {
  const go = r.length / speed;
  const cycle = rest + go + away + go;
  const k = ((t % cycle) + cycle) % cycle;
  const back = k >= rest + go + away;
  const s = k < rest ? 0 : k < rest + go ? (k - rest) * speed : !back ? r.length : r.length - (k - rest - go - away) * speed;
  const p = along(r, Math.min(r.length, Math.max(0, s)));
  // The heading of the stretch it is on (or the last flat one), turned round on the way back.
  const ahead = along(r, Math.min(r.length, s + 0.5));
  const behind = along(r, Math.max(0, s - 0.5));
  const dx = ahead.x - behind.x;
  const dz = ahead.z - behind.z;
  let yaw = Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : flatYaw(r, s);
  if (back) yaw += Math.PI;
  return { x: p.x, y: p.y, z: p.z, yaw, moving: k >= rest && (k < rest + go || back) };
}

function flatYaw(r: Route, s: number): number {
  const p = r.points;
  let i = 1;
  while (i < p.length - 1 && r.at[i]! < s) i++;
  for (let j = i; j >= 1; j--) {
    const a = p[j - 1]!;
    const b = p[j]!;
    if (Math.hypot(b.x - a.x, b.z - a.z) > 0.05) return Math.atan2(b.x - a.x, b.z - a.z);
  }
  return 0;
}

/** Where something drifting from `a` to `b` and back at `speed` m/s is at time `t` (Cold Sanctuary's Iceberg.Update). */
export function drift(a: P2, b: P2, speed: number, t: number): P2 {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  if (len < 1e-6) return { x: a.x, z: a.z };
  const leg = len / speed;
  const k = ((t % (2 * leg)) + 2 * leg) % (2 * leg);
  const f = k < leg ? k / leg : 2 - k / leg;
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
}

/**
 * A flying carpet's speed like a car's (Berón 2026-11-22: «las alfombras voladoras deben ir unas 2 veces más rápido,
 * sería ideal que su velocidad fuera gradual para incrementar y disminuir, como un coche»): along each stretch flown
 * it speeds up from `start` at `accel` m/s² to its cruise, slows down the same way to stop at the stretch's end, and
 * eases off before each sharp turn (more than 45°) to `turn`. `s` metres along the route.
 */
export const CARPET_RIDE = { cruise: 12, accel: 2.5, start: 1.2, turn: 4 } as const;

export function flightSpeed(r: Route, s: number, ride: { readonly cruise: number; readonly accel: number; readonly start: number; readonly turn: number } = CARPET_RIDE): number {
  const p = r.points;
  if (p.length < 2) return ride.start;
  let i = 1;
  while (i < p.length - 1 && r.at[i]! < s) i++;
  // The stretch flown round s: its first and last points (consecutive points flown to).
  let a = i;
  while (a > 1 && p[a - 1]!.fly) a--;
  let b = i;
  while (b < p.length - 1 && p[b + 1]!.fly) b++;
  const from = r.at[a - 1]!;
  const to = r.at[b]!;
  const ease = (d: number, floor: number) => floor + Math.sqrt(2 * ride.accel * Math.max(0, d));
  let v = Math.min(ride.cruise, ease(s - from, ride.start), ease(to - s, ride.start));
  // The sharp turns of this stretch: slowing before each one, speeding up again after it.
  for (let k = a; k < b; k++) {
    const p0 = p[k - 1]!;
    const p1 = p[k]!;
    const p2 = p[k + 1]!;
    const u = [p1.x - p0.x, p1.y - p0.y, p1.z - p0.z];
    const w = [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z];
    const lu = Math.hypot(u[0]!, u[1]!, u[2]!);
    const lw = Math.hypot(w[0]!, w[1]!, w[2]!);
    if (lu < 0.01 || lw < 0.01) continue;
    const cos = (u[0]! * w[0]! + u[1]! * w[1]! + u[2]! * w[2]!) / (lu * lw);
    if (cos > Math.SQRT1_2) continue;
    const d = Math.abs(r.at[k]! - s);
    v = Math.min(v, ease(d, ride.turn));
  }
  return Math.max(ride.start, v);
}
