/**
 * What she can reach (reglas.md §5.8: the orange button shows while something is at hand). The distance from her
 * to a thing's footprint: a rectangle of `sx` × `sz` metres centred on (x, z) and turned `rot` about the vertical
 * (the same turn the scene gives the model). Zero inside it.
 */
export function footprintDistance(px: number, pz: number, x: number, z: number, rot: number, sx: number, sz: number): number {
  const dx = px - x;
  const dz = pz - z;
  // Into the model's own frame: undo its turn about +y.
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  const ox = Math.max(0, Math.abs(lx) - sx / 2);
  const oz = Math.max(0, Math.abs(lz) - sz / 2);
  return Math.hypot(ox, oz);
}

/** Things this big (a floor, a field) only offer their task when nothing smaller is at hand, m². */
export const BIG_FOOTPRINT_M2 = 40;

export interface Reachable {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rot: number;
  readonly sx: number;
  readonly sz: number;
  /** Height of the thing, to tell floors apart (she must be within its height plus a step). */
  readonly sy: number;
}

/**
 * The nearest thing at hand: within `reach` of its footprint, on her level (from 1 m below its base to its top),
 * small things before big ones (a machine before the floor it stands on).
 */
export function nearest<T extends Reachable>(px: number, py: number, pz: number, things: Iterable<T>, reach: number): T | undefined {
  let best: T | undefined;
  let score = Infinity;
  for (const t of things) {
    if (py < t.y - 1 || py > t.y + Math.max(2, t.sy) + 0.5) continue;
    const d = footprintDistance(px, pz, t.x, t.z, t.rot, t.sx, t.sz);
    if (d > reach) continue;
    const sc = d + (t.sx * t.sz > BIG_FOOTPRINT_M2 ? 10 : 0);
    if (sc < score) {
      score = sc;
      best = t;
    }
  }
  return best;
}
