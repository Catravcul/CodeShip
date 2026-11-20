import { Vec3 } from "@core/math/vec3";

export interface Obstacle {
  readonly centre: Vec3;
  /** Keep-out radius (hull plus margin), metres. */
  readonly radiusM: number;
}

/** Extra gap the route leaves around a keep-out sphere, as a share of its radius (game value). */
const DETOUR_GAP = 0.6;
const MAX_DEPTH = 6;

/** Distance along the segment a→b where it gets closest to `c`, clamped to the segment, as a fraction 0..1. */
function closestFraction(a: Vec3, b: Vec3, c: Vec3): number {
  const ab = b.sub(a);
  const len2 = ab.dot(ab);
  return len2 === 0 ? 0 : Math.max(0, Math.min(1, c.sub(a).dot(ab) / len2));
}

/** First obstacle the straight segment a→b runs into (ignoring any that already contain a or b). */
export function firstBlocking(a: Vec3, b: Vec3, obstacles: readonly Obstacle[]): { obstacle: Obstacle; fraction: number } | undefined {
  let best: { obstacle: Obstacle; fraction: number } | undefined;
  const ab = b.sub(a);
  for (const o of obstacles) {
    if (a.sub(o.centre).length() <= o.radiusM || b.sub(o.centre).length() <= o.radiusM) continue;
    const f = closestFraction(a, b, o.centre);
    const p = a.add(ab.scale(f));
    if (p.sub(o.centre).length() < o.radiusM && (!best || f < best.fraction)) best = { obstacle: o, fraction: f };
  }
  return best;
}

/**
 * Waypoints from `from` to `to` that steer around the keep-out spheres: when the straight line
 * hits one, a detour point is placed beside it (on the side the line already passes) and both
 * halves are checked again. Ends with `to`. A simple planner, enough for a sparse rock field.
 */
export function planRoute(from: Vec3, to: Vec3, obstacles: readonly Obstacle[], depth = 0): Vec3[] {
  const hit = depth < MAX_DEPTH ? firstBlocking(from, to, obstacles) : undefined;
  if (!hit) return [to];
  const { obstacle: o, fraction } = hit;
  const dir = to.sub(from).normalize();
  const closest = from.add(to.sub(from).scale(fraction));
  let side = closest.sub(o.centre);
  side = side.sub(dir.scale(side.dot(dir)));
  if (side.length() < 1e-6) {
    // Dead centre: go round on any side perpendicular to the path.
    side = dir.cross(Math.abs(dir.y) < 0.9 ? Vec3.Y : Vec3.X);
  }
  const detour = o.centre.add(side.normalize().scale(o.radiusM * (1 + DETOUR_GAP)));
  return [...planRoute(from, detour, obstacles, depth + 1), ...planRoute(detour, to, obstacles, depth + 1)];
}

/** Length of the path from `from` through the waypoints, metres. */
export function pathLength(from: Vec3, waypoints: readonly Vec3[]): number {
  let total = 0;
  let p = from;
  for (const w of waypoints) {
    total += w.sub(p).length();
    p = w;
  }
  return total;
}
