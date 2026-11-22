/**
 * The furnishing of each floor that is already ported, in the floor's own frame: metres from its centre, x across,
 * z away from the trunk (whose face is at z = −size/2); `rot` turns the model about y (radians, as Unity's yaw). Each list
 * copies its Cold Sanctuary builder position by position, so a change there is a change of numbers here.
 */
export interface Placed {
  readonly model: string;
  readonly x: number;
  readonly z: number;
  readonly rot?: number;
  readonly name?: string;
  /** Up from the floor (m): a piano on its stage. */
  readonly y?: number;
}

export interface FloorPlan {
  readonly id: string;
  /** The floor's true plan (the area inside the tower's square floor). */
  readonly size: { readonly x: number; readonly z: number };
  readonly items: readonly Placed[];
  /**
   * Cold Sanctuary's RING (Levels.cs RingDeck): a U-deck 8 m over the floor (TreeSpec.RingOverFloor), 10 m wide with
   * 2 m over the floor's edge and the rest flying out, open towards the trunk with a 3 m balcony against it, reached
   * swimming through its own door in the trunk. Its things, in the floor's frame (RingPoint gives their places).
   */
  readonly ring?: readonly Placed[];
  readonly source: string;
  /**
   * How far apart its things were spread to fill the kitchen's square (spreadTo, composed): the «not half empty» rule
   * measures 3 m times this from each thing (room to run between them is the point, Berón 2026-11-22). 1 when not.
   */
  readonly spread?: number;
}

/** Cold Sanctuary's ring numbers (Levels.cs RingDeck, TreeSpec.RingOverFloor). */
export const RING = { over: 8, width: 10, inside: 0.2, balcony: 3 } as const;

/**
 * A point on the ring's centre line at `s` m from the middle of its +z side, clockwise (Levels.cs RingPointFull), and
 * the yaw of a bed laid across it. `corner` marks a corner, or the trunk side of a tree-building's U ring (no deck).
 */
export function ringPoint(floor: number, s: number, cornerClear = RING.width / 2): { x: number; z: number; yaw: number; corner: boolean } {
  const inn = RING.width * RING.inside;
  const c = floor / 2 - inn + RING.width / 2;
  const per = 8 * c;
  s = ((s % per) + per) % per;
  const corner = (along: number, len: number) => along < cornerClear || along > len - cornerClear;
  let r: { x: number; z: number; yaw: number; corner: boolean };
  if (s < c) r = { x: s, z: c, yaw: 0, corner: s > c - cornerClear };
  else if ((s -= c) < 2 * c) r = { x: c, z: c - s, yaw: Math.PI / 2, corner: corner(s, 2 * c) };
  else if ((s -= 2 * c) < 2 * c) r = { x: c - s, z: -c, yaw: 0, corner: corner(s, 2 * c) };
  else if ((s -= 2 * c) < 2 * c) r = { x: -c, z: -c + s, yaw: Math.PI / 2, corner: corner(s, 2 * c) };
  else { s -= 2 * c; r = { x: -c + s, z: c, yaw: 0, corner: s < cornerClear }; }
  if (r.z < -floor / 2 + 1.5) r.corner = true;
  return r;
}

/** Ring length (Levels.cs RingLength). */
export const ringLength = (floor: number): number => 4 * (floor - 2 * RING.width * RING.inside + RING.width);

/** A keep-out rectangle of a packed floor, as Unity's Rect(x, z, w, d): corner and size in the floor's frame. */
export interface Rect {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
}

/** Cold Sanctuary's keep-outs of a lab floor (Research.cs CarpetKeepOut): the carpet strip at the +z edge round `x`, and the +x,+z corner. */
export const carpetKeepOut = (size: { x: number; z: number }, x = 0): Rect[] => [
  { x: x - 4.2, z: size.z / 2 - 5, w: 8.4, d: 5 },
  { x: size.x / 2 - 4, z: size.z / 2 - 4, w: 4, d: 4 },
];

/**
 * Cold Sanctuary's PackFloor (Research.cs): blocks in rows from the −x,−z corner with 2 m of margin and 2,1 m between
 * them; a row wraps when the next block would pass the margin, and a block that would touch a keep-out (grown by half
 * a gap) moves past it. Each block is centred on its slot, yaw 0. Blocks that no longer fit are left out.
 */
export function packFloor(size: { x: number; z: number }, blocks: readonly (readonly [model: string, w: number, d: number])[], keepOut: readonly Rect[] = [], gap = 2.1, margin = 2): Placed[] {
  const out: Placed[] = [];
  let x = -size.x / 2 + margin, z = -size.z / 2 + margin, rowD = 0;
  const hit = (x0: number, z0: number, w: number, d: number) =>
    keepOut.find((r) => x0 < r.x + r.w + gap / 2 && x0 + w > r.x - gap / 2 && z0 < r.z + r.d + gap / 2 && z0 + d > r.z - gap / 2);
  for (const [model, w, d] of blocks) {
    for (let guard = 0; guard < 50; guard++) {
      if (x + w > size.x / 2 - margin) { x = -size.x / 2 + margin; z += rowD + gap; rowD = 0; }
      const r = hit(x, z, w, d);
      if (!r) break;
      x = r.x + r.w + gap / 2;
    }
    if (z + d > size.z / 2 - margin / 2) continue;
    out.push({ model, x: x + w / 2, z: z + d / 2 });
    x += w + gap;
    rowD = Math.max(rowD, d);
  }
  return out;
}

/**
 * Every floor the size of the kitchen's and the hospital's (Berón 2026-11-22: «en un principio el tamaño base de los
 * pisos era el mismo que el de cocina o de los hospitales, vamos a recuperar esa regla porque genera una forma más
 * simétrica… el personaje posiblemente siempre vaya corriendo por lo que es ideal generar grandes espacios»): the
 * tower's square the kitchen's ring sits on, 40 × 40 m (its plan is 40 × 38, centred on it).
 */
export const FLOOR_SIZE = { x: 40, z: 40 } as const;
/** How far a smaller room is spread out at most to fill its floor (its things further apart, never bigger). */
export const MAX_SPREAD = 1.8;

/** A floor finish (a rubber floor, a lab's or the hospital's): it fits only its own plan. */
const isFinish = (model: string) => model.startsWith("suelo-") || model.endsWith("-suelo");

/**
 * A room spread out over `size` (its things further apart, up to MAX_SPREAD; at least as it was), centred; its own floor
 * finish left out when it no longer fits (the wooden floor shows).
 */
export function spreadTo(p: FloorPlan, size: { readonly x: number; readonly z: number }): FloorPlan {
  // A room within 6 % of its part is left as it is (the kitchen's 40 × 38 on its 40 × 40).
  const k = (r: number) => (r < 1.06 ? 1 : Math.min(MAX_SPREAD, r));
  const sx = k(size.x / p.size.x);
  const sz = k(size.z / p.size.z);
  if (sx === 1 && sz === 1 && p.size.x === size.x && p.size.z === size.z) return p;
  if (sx === 1 && sz === 1) return { ...p, size: { x: Math.max(p.size.x, size.x), z: Math.max(p.size.z, size.z) } };
  const items = p.items.filter((it) => !isFinish(it.model)).map((it) => ({ ...it, x: it.x * sx, z: it.z * sz }));
  return { ...p, size: { x: size.x, z: size.z }, items, spread: Math.max(p.spread ?? 1, sx, sz) };
}

/** A room turned a quarter (its x becomes z): its plan, its things and their facing. */
export function turned(p: FloorPlan): FloorPlan {
  return { ...p, size: { x: p.size.z, z: p.size.x }, items: p.items.map((it) => ({ ...it, x: it.z, z: -it.x, rot: (it.rot ?? 0) + Math.PI / 2 })) };
}

/**
 * Several rooms on one floor of FLOOR_SIZE: each spread over its part (x0…x1 across, z0…z1 away from the trunk, in the
 * floor's frame) and put there.
 */
export function composed(id: string, parts: readonly { readonly plan: FloorPlan; readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number }[], source: string): FloorPlan {
  const items: Placed[] = [];
  let spread = 1;
  for (const { plan, x0, x1, z0, z1 } of parts) {
    const s = spreadTo(plan, { x: x1 - x0, z: z1 - z0 });
    spread = Math.max(spread, s.spread ?? 1);
    items.push(...s.items.map((it) => ({ ...it, x: it.x + (x0 + x1) / 2, z: it.z + (z0 + z1) / 2 })));
  }
  return { id, size: { x: FLOOR_SIZE.x, z: FLOOR_SIZE.z }, items, source, spread };
}
