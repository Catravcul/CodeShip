import { STEP_M, blocked, floorAt, type Body, type Floor, type WalkWorld } from "@modules/aerial-sanctuary/domain/walk";

/**
 * «Trepar» (Berón 2026-11-19): up onto what is right in front of her (a parkour wall, a box, a ledge, a higher
 * floor) when its top is more than a step and at most `CLIMB_MAX_M` above her feet. The top of a solid becomes a
 * floor she can walk on (walk.ts takes extra floors), so she can stand and walk on what she climbed.
 */
export const CLIMB_MAX_M = 2.6;
/** How far ahead she reaches for a hold, m. */
const REACH = [0.45, 0.7, 0.95];

export interface Climb {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The top she stands on (a new floor if it was a solid's), or the floor past a thin wall she climbed over. */
  readonly floor: Floor;
  /** Over a wall too thin to stand on: the top she passes on her way down the other side. */
  readonly over?: number;
}

/** What she climbs onto facing `yaw` (forward is (−sin yaw, −cos yaw)), if anything. */
export function climbTarget(w: WalkWorld, b: Body, yaw: number, extra: readonly Floor[] = []): Climb | undefined {
  if (b.motion !== "gravedad") return undefined;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const tops: { y: number; floor: Floor }[] = [];
  for (const d of REACH) {
    const x = b.x + fx * d;
    const z = b.z + fz * d;
    for (const s of w.solids)
      if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && s.y1 > b.y + STEP_M && s.y1 <= b.y + CLIMB_MAX_M) tops.push({ y: s.y1, floor: { id: `trepar:${s.x0.toFixed(2)},${s.z0.toFixed(2)},${s.y1.toFixed(2)}`, x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1, y: s.y1, area: b.area } });
    for (const f of [...w.floors, ...extra]) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1 && f.y > b.y + STEP_M && f.y <= b.y + CLIMB_MAX_M) tops.push({ y: f.y, floor: f });
  }
  // The lowest hold first; she lands a body's width onto it, where nothing above blocks her.
  for (const t of tops.sort((a, c) => a.y - c.y)) {
    const f = t.floor;
    if (f.x1 - f.x0 < 0.62 || f.z1 - f.z0 < 0.62) {
      // Too thin to stand on (a parkour wall): up and over, down onto the floor on the other side.
      for (let d = 0.6; d <= 2.2; d += 0.15) {
        const x = b.x + fx * d;
        const z = b.z + fz * d;
        if (x > f.x0 - 0.3 && x < f.x1 + 0.3 && z > f.z0 - 0.3 && z < f.z1 + 0.3) continue;
        const g = floorAt(w, x, b.y, z, extra);
        if (g && !blocked(w, x, g.y, z)) return { x, y: g.y, z, floor: g, over: t.y };
      }
      continue;
    }
    for (const d of [0.6, 0.9, 1.2, 1.6]) {
      const x = Math.max(f.x0 + 0.31, Math.min(f.x1 - 0.31, b.x + fx * d));
      const z = Math.max(f.z0 + 0.31, Math.min(f.z1 - 0.31, b.z + fz * d));
      if (!blocked(w, x, t.y, z)) return { x, y: t.y, z, floor: f };
    }
  }
  return undefined;
}

/** A jump's height above her feet after `t` s, for a take-off speed `v0` (m/s) under gravity; 0 once landed. */
export const GRAVITY_MS2 = 9.81;
export function jumpHeight(v0: number, t: number): number {
  return Math.max(0, v0 * t - (GRAVITY_MS2 * t * t) / 2);
}
/** Take-off speed of a full-effort jump of 50 cm (a countermovement jump with arm swing: active adults 0,4–0,6 m; Markovic et al., J Strength Cond Res 18:551, 2004). */
export const JUMP_V0_MS = Math.sqrt(2 * GRAVITY_MS2 * 0.5);
