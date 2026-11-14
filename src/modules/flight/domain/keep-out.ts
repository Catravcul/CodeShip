import { Vec3 } from "@core/math/vec3";
import type { Quat } from "@core/math/quat";

/**
 * Keep-out geometry of a big structure (the mothership, a station) in its own body frame. Game
 * rule like the region's rocks: a small craft cannot fly through it.
 */
export type Obstacle =
  | { readonly kind: "capsule"; readonly a: Vec3; readonly b: Vec3; readonly radiusM: number }
  | { readonly kind: "ring"; readonly centreZ: number; readonly radiusM: number; readonly tubeM: number }
  | { readonly kind: "box"; readonly centre: Vec3; readonly half: Vec3 };

/** Distance from a body-frame point to an obstacle's surface (negative inside) and the outward direction there. */
export function obstacleGap(o: Obstacle, p: Vec3): { d: number; n: Vec3 } {
  if (o.kind === "capsule") {
    const ab = o.b.sub(o.a);
    const t = Math.max(0, Math.min(1, p.sub(o.a).dot(ab) / ab.dot(ab)));
    const rel = p.sub(o.a.add(ab.scale(t)));
    const len = rel.length();
    return { d: len - o.radiusM, n: len < 1e-9 ? Vec3.Y : rel.scale(1 / len) };
  }
  if (o.kind === "ring") {
    const rho = Math.hypot(p.x, p.y);
    const radial = rho < 1e-9 ? Vec3.X : new Vec3(p.x / rho, p.y / rho, 0);
    const onCircle = radial.scale(o.radiusM).add(new Vec3(0, 0, o.centreZ));
    const rel = p.sub(onCircle);
    const len = rel.length();
    return { d: len - o.tubeM, n: len < 1e-9 ? radial : rel.scale(1 / len) };
  }
  const q = p.sub(o.centre);
  const ex = new Vec3(Math.abs(q.x) - o.half.x, Math.abs(q.y) - o.half.y, Math.abs(q.z) - o.half.z);
  const out = new Vec3(Math.max(ex.x, 0), Math.max(ex.y, 0), Math.max(ex.z, 0));
  const d = out.length() > 0 ? out.length() : Math.max(ex.x, ex.y, ex.z);
  const axis = ex.x >= ex.y && ex.x >= ex.z ? new Vec3(Math.sign(q.x) || 1, 0, 0) : ex.y >= ex.z ? new Vec3(0, Math.sign(q.y) || 1, 0) : new Vec3(0, 0, Math.sign(q.z) || 1);
  return { d, n: out.length() > 0 ? new Vec3(Math.sign(q.x) * out.x, Math.sign(q.y) * out.y, Math.sign(q.z) * out.z).normalize() : axis };
}

/** A structure placed in the world: where it is, how it is turned and what it is made of. */
export interface KeepOutBody {
  readonly position: Vec3;
  readonly orientation: Quat;
  readonly obstacles: readonly Obstacle[];
  /** Docking ports in world space: near them the rule is off so a craft can reach the port. */
  readonly freePorts: readonly Vec3[];
}

export interface KeepOutRule {
  /** Margin the craft keeps from the structure (its own half-size plus a little), m. */
  readonly marginM: number;
  /** Radius round each port where the rule is off, m. */
  readonly portFreeM: number;
}

/** Game rule values shared by the mothership and the stations. */
export const KEEP_OUT: KeepOutRule = { marginM: 4, portFreeM: 14 };

/** Shortest gap between a world point and the structure, m (negative inside). */
export function clearanceTo(s: KeepOutBody, world: Vec3): number {
  const p = s.orientation.conjugate().rotate(world.sub(s.position));
  return Math.min(...s.obstacles.map((o) => obstacleGap(o, p).d));
}

/**
 * The change of velocity (world) that cancels any motion into the structure within the margin,
 * and nudges a craft already deep in the margin slowly out. Off near the docking ports, where the
 * docking contact takes over.
 */
export function keepOutDelta(s: KeepOutBody, world: Vec3, velocity: Vec3, rule: KeepOutRule = KEEP_OUT): Vec3 {
  if (s.freePorts.some((p) => world.sub(p).length() < rule.portFreeM)) return Vec3.ZERO;
  const inv = s.orientation.conjugate();
  const p = inv.rotate(world.sub(s.position));
  let v = inv.rotate(velocity);
  const v0 = v;
  for (const o of s.obstacles) {
    const { d, n } = obstacleGap(o, p);
    if (d > rule.marginM) continue;
    const vIn = v.dot(n);
    if (vIn < 0) v = v.sub(n.scale(vIn));
    if (d < rule.marginM * 0.5) v = v.add(n.scale(0.05));
  }
  return s.orientation.rotate(v.sub(v0));
}
