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

/**
 * The distribution rule (Berón 2026-11-22: «una regla de distribución para que los objetos de los pisos ocupen el
 * espacio del piso de forma más uniforme sin dejar grandes huecos»; reglas.md §2.10). Along each axis the things are
 * gathered into bands (things less than `join` m apart stay together, as a desk and its chair, a row of beds), and the
 * bands are laid out from `margin` m off one edge to `margin` m off the other with the same gap between each two: the
 * rows and columns of the room's own layout are kept, its empty sides and its crowded ones are evened out. Their
 * places move, never their size. `sizeOf` gives a thing's footprint half-widths (from the catalogue).
 */
export function evened(p: FloorPlan, sizeOf: (it: Placed) => { readonly hx: number; readonly hz: number }, margin = 2.5, join = 2): FloorPlan {
  const things = p.items.filter((it) => !isFinish(it.model) && it.model !== "plaza-suelo");
  if (things.length < 4) return p;
  const axis = (c: (it: Placed) => number, h: (it: Placed) => number, half: number): Map<Placed, number> => {
    const spans = things.map((it) => ({ it, lo: c(it) - h(it), hi: c(it) + h(it) })).sort((a, b) => a.lo - b.lo);
    const bands: { lo: number; hi: number; its: Placed[] }[] = [];
    for (const s of spans) {
      const last = bands[bands.length - 1];
      if (last && s.lo - last.hi < join) {
        last.hi = Math.max(last.hi, s.hi);
        last.its.push(s.it);
      } else bands.push({ lo: s.lo, hi: s.hi, its: [s.it] });
    }
    const shift = new Map<Placed, number>();
    if (bands.length < 2) return shift;
    const t0 = Math.min(-half + margin, bands[0]!.lo);
    const t1 = Math.max(half - margin, bands[bands.length - 1]!.hi);
    const filled = bands.reduce((n, b) => n + (b.hi - b.lo), 0);
    const gap = (t1 - t0 - filled) / (bands.length - 1);
    if (gap < join) return shift;
    let at = t0;
    for (const b of bands) {
      for (const it of b.its) shift.set(it, at - b.lo);
      at += b.hi - b.lo + gap;
    }
    return shift;
  };
  const dx = axis((it) => it.x, (it) => sizeOf(it).hx, p.size.x / 2);
  const dz = axis((it) => it.z, (it) => sizeOf(it).hz, p.size.z / 2);
  return { ...p, items: p.items.map((it) => (dx.has(it) || dz.has(it) ? { ...it, x: it.x + (dx.get(it) ?? 0), z: it.z + (dz.get(it) ?? 0) } : it)) };
}

/** How far from everything a floor may have a point (its 2,5 m edge, the door's aisle and the carpet's landing left out), m. */
export const MAX_HOLE_M = 5;

/** Things that stay where their room put them: walls and what hangs on them, toilets, the carpet's station. */
const FIXED = /pared|muro|ventana|puerta|rellano|estacion|escalera|aseos|espejo|vestuario|kamiza|-suelo|^suelo|plaza-suelo|ring|anillo|tobogan/;

/**
 * The distribution rule's second half: while a floor has a hole wider than MAX_HOLE_M (a point that far from every
 * thing), the movable thing from its most crowded part (the one nearest another) goes to the middle of the hole,
 * where it fits with 1 m round it. So the things of a fused floor fill it instead of crowding a side.
 */
export function filledHoles(p: FloorPlan, sizeOf: (it: Placed) => { readonly hx: number; readonly hz: number }, maxHole = MAX_HOLE_M): FloorPlan {
  let items = [...p.items];
  const hx = p.size.x / 2, hz = p.size.z / 2;
  for (let round = 0; round < 40; round++) {
    const cur = { ...p, items };
    const hole = largestHole(cur, sizeOf, 2);
    if (hole.r <= maxHole) break;
    const solids = items.filter((it) => countsAsThing(cur, it, sizeOf));
    // The movable thing with the nearest neighbour, put in the middle of the hole (inside the floor), where it fits.
    const crowd = solids
      .filter((it) => !FIXED.test(it.model))
      .map((it) => ({ it, n: Math.min(...solids.filter((o) => o !== it).map((o) => gapTo(o, it.x, it.z, sizeOf))) }))
      .sort((a, b) => a.n - b.n);
    const at = (it: Placed) => {
      const h = sizeOf(it);
      return { x: Math.max(-hx + 1 + h.hx, Math.min(hx - 1 - h.hx, hole.x)), z: Math.max(-hz + 1 + h.hz, Math.min(hz - 1 - h.hz, hole.z)) };
    };
    const fits = (it: Placed) => {
      const h = sizeOf(it);
      const q = at(it);
      return solids.every((o) => o === it || Math.abs(o.x - q.x) > sizeOf(o).hx + h.hx + 1 || Math.abs(o.z - q.z) > sizeOf(o).hz + h.hz + 1);
    };
    const pick = crowd.find(({ it }) => fits(it));
    if (!pick) break;
    const q = at(pick.it);
    items = items.map((it) => (it === pick.it ? { ...it, ...q } : it));
  }
  return { ...p, items };
}

/** Does a thing count for the distribution (not the room's finish, not one as big as the floor)? */
const countsAsThing = (p: FloorPlan, it: Placed, sizeOf: (it: Placed) => { readonly hx: number; readonly hz: number }) =>
  !isFinish(it.model) && it.model !== "plaza-suelo" && sizeOf(it).hx * sizeOf(it).hz * 4 <= p.size.x * p.size.z * 0.6;
const gapTo = (a: Placed, x: number, z: number, sizeOf: (it: Placed) => { readonly hx: number; readonly hz: number }) => {
  const h = sizeOf(a);
  return Math.hypot(Math.max(0, Math.abs(x - a.x) - h.hx), Math.max(0, Math.abs(z - a.z) - h.hz));
};

/**
 * The floor's widest hole: the point furthest from every thing, and how far (on a grid of `step` m; the 2,5 m along
 * the edges, the door's aisle and the carpet's landing left out, as they are kept clear on purpose).
 */
export function largestHole(p: FloorPlan, sizeOf: (it: Placed) => { readonly hx: number; readonly hz: number }, step = 1): { x: number; z: number; r: number } {
  const hx = p.size.x / 2, hz = p.size.z / 2;
  const keep = carpetKeepOut(p.size);
  const solids = p.items.filter((it) => countsAsThing(p, it, sizeOf));
  let best = { x: 0, z: 0, r: 0 };
  for (let x = -hx + 2.5; x <= hx - 2.5 + 1e-9; x += step)
    for (let z = -hz + 2.5; z <= hz - 2.5 + 1e-9; z += step) {
      if ((Math.abs(x) < 2.5 && z < -hz + 6) || keep.some((k) => Math.abs(x - k.x) < k.w / 2 + 1 && Math.abs(z - k.z) < k.d / 2 + 1)) continue;
      let d = Infinity;
      for (const it of solids) d = Math.min(d, gapTo(it, x, z, sizeOf));
      if (d > best.r) best = { x, z, r: d };
    }
  return best;
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

/**
 * Things laid evenly over a rectangle (the distribution rule, reglas.md §2.10): as many columns as keep the cells near
 * square, each thing in the middle of its cell, the last row centred. So a zone has no crowded side and no empty one.
 */
export function gridIn(things: readonly { readonly model: string; readonly name?: string; readonly rot?: number }[], r: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number }, cols?: number): Placed[] {
  const n = things.length;
  if (!n) return [];
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const c = cols ?? Math.max(1, Math.min(n, Math.round(Math.sqrt((n * w) / d))));
  const rows = Math.ceil(n / c);
  return things.map((t, i) => {
    const row = Math.floor(i / c);
    const inRow = row === rows - 1 ? n - row * c : c;
    const col = i % c;
    return { model: t.model, x: r.x0 + (w / inRow) * (col + 0.5), z: r.z0 + (d / rows) * (row + 0.5), ...(t.rot ? { rot: t.rot } : {}), ...(t.name ? { name: t.name } : {}) };
  });
}

