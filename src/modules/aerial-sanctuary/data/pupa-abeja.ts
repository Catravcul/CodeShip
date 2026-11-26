import type { Rect, Solid } from "../domain/walk";
import type { AreaDef } from "./layout";
import { CELL } from "../domain/abeja";
import { GIANT, HOLLOW, ceilingAt, type HollowBuilder, type PlacedTree } from "./montana";
import { INNER_HALF } from "./bioma-island";

/**
 * THE BEE'S PUPA (Berón 2026-11-26; docs/design/pupa-abeja.md): it takes the cloud globe's place. In the middle of the
 * hollow pyramid, among the giant trees, a giant worker cell of wax stands on the lake, translucent, and inside it a
 * worker of the Asian honeybee (Apis cerana) lives its real development: egg, larva, prepupa, pupa and adult
 * (domain/abeja.ts). A wooden gallery round its foot and a pier from the root deck of the nearest tree (where the
 * carpets land) bring her to it walking; she can swim round it in the lake too.
 *
 * Nothing here is a fixed number of the world: it stands at the hollow's middle (HOLLOW) and takes the room the
 * campus leaves there (the floors, trunks, decks and the Starship already built), under the pyramid's ceiling, so it
 * fits when the mountain's geometry changes. A real worker cell is ~4,5 mm wide and ~11 mm deep (CELL); here the
 * cell keeps those proportions and its bee is as long as the room allows (ficción, like the octopus's egg of
 * sanctuary 1's globe).
 */
export const PUPA_AREA = "entrenamiento:pupa";
export const PUPA_POINT = `${PUPA_AREA}:mirador`;

/** Its rules (ours): the cell's widest radius, the air kept round the gallery, the gallery's width, the pier's half. */
export const PUPA_RULES = {
  /** The cell's corner radius at most, and at least (else the middle has no room: the test says so), m. */
  maxR: 22,
  minR: 10,
  /** Air kept between the gallery's edge and anything else (the carpets' 2 m and more), m. */
  clear: 8,
  /** The gallery round the cell's foot, m. */
  gallery: 6,
  /** Half the pier's width, m (6 m: a stick's walk drifts, and nothing keeps her from the water). */
  pierHalf: 3,
  /** Air kept under the ceiling over the cell, m. */
  headroom: 12,
} as const;

export interface PupaPlan {
  /** The cell's axis on the plan and its bottom (on the gallery), world m. */
  readonly x: number;
  readonly z: number;
  readonly y0: number;
  /** The cell's corner radius (a hexagon) and its depth: its height, standing. */
  readonly r: number;
  readonly h: number;
  /** The bee's adult length here (the cell's proportions: CELL). */
  readonly beeLength: number;
  /** The gallery's square round the cell, its walking face. */
  readonly gallery: Rect;
  readonly galleryY: number;
}

type Box = Rect & { readonly y0: number; readonly y1: number };
const dist = (r: Rect, x: number, z: number) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
const overlaps = (a: Box, b: Box, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m && a.y0 < b.y1 && a.y1 > b.y0;

/** What is already built inside the hollow (its floors as slabs with the room to stand on them, its solids). */
export function hollowObstacles(b: Pick<HollowBuilder, "floors" | "solids">): Box[] {
  const inHollow = (r: Rect) => r.x1 > HOLLOW.x - INNER_HALF && r.x0 < HOLLOW.x + INNER_HALF && r.z1 > HOLLOW.z - INNER_HALF && r.z0 < HOLLOW.z + INNER_HALF;
  return [
    ...b.floors.filter((f) => inHollow(f) && f.y > HOLLOW.floorY - 2).map((f) => ({ x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z1, y0: f.y - 1, y1: f.y + 2.5 })),
    ...b.solids.filter((s) => inHollow(s) && s.y1 > HOLLOW.floorY - 2),
  ];
}

/** The cell at the hollow's middle in the room `obstacles` leave it. */
export function pupaPlan(obstacles: readonly Box[]): PupaPlan {
  const R = PUPA_RULES;
  const x = HOLLOW.x;
  const z = HOLLOW.z;
  const free = Math.min(INNER_HALF, ...obstacles.map((o) => dist(o, x, z)));
  const galleryY = GIANT.deckY;
  const y0 = galleryY + 0.02;
  // Its width by the room on the plan; its height by its real proportions, under the ceiling.
  let r = Math.min(R.maxR, free - R.clear - R.gallery);
  let L = (Math.sqrt(3) * r) / CELL.width;
  const room = ceilingAt(x, z) - R.headroom - y0;
  if (CELL.depth * L > room) {
    L = room / CELL.depth;
    r = (L * CELL.width) / Math.sqrt(3);
  }
  const g = r + R.gallery;
  return { x, z, y0, r, h: CELL.depth * L, beeLength: L, gallery: { x0: x - g, x1: x + g, z0: z - g, z1: z + g }, galleryY };
}

/** The pupa as its area tells it (the scene reads it from the layout: data/layout.ts areas). */
export function pupaOfArea(a: Pick<AreaDef, "centre" | "half">): PupaPlan {
  const h = 2 * a.half.y;
  const y0 = a.centre.y - a.half.y;
  const g = a.half.x;
  const r = g - PUPA_RULES.gallery;
  return { x: a.centre.x, z: a.centre.z, y0, r, h, beeLength: h / CELL.depth, gallery: { x0: a.centre.x - g, x1: a.centre.x + g, z0: a.centre.z - g, z1: a.centre.z + g }, galleryY: y0 - 0.02 };
}

/** The pier from the gallery to the nearest tree's root deck: one or two straight stretches clear of everything. */
function pierTo(p: PupaPlan, t: PlacedTree, obstacles: readonly Box[]): { rects: Rect[]; pts: { x: number; z: number }[] } {
  const D = GIANT.deckHalf;
  const w = PUPA_RULES.pierHalf;
  const g = p.gallery;
  const deck = { x0: t.x - D, x1: t.x + D, z0: t.z - D, z1: t.z + D };
  const band = (r: Rect): Box => ({ ...r, y0: p.galleryY - 0.5, y1: p.galleryY + 2.2 });
  const clear = (rs: readonly Rect[]) => rs.every((r) => obstacles.every((o) => !overlaps(band(r), o, 0.3) || (o.x0 >= deck.x0 - 0.01 && o.x1 <= deck.x1 + 0.01 && o.z0 >= deck.z0 - 0.01 && o.z1 <= deck.z1 + 0.01)));
  const sx = Math.sign(t.x - p.x) || 1;
  const sz = Math.sign(t.z - p.z) || 1;
  const options: { rects: Rect[]; pts: { x: number; z: number }[] }[] = [];
  // Straight out of the gallery along x, then along z to the deck (or straight on if the deck is in line).
  {
    const ex = sx > 0 ? g.x1 : g.x0;
    if (Math.abs(t.z - p.z) <= D - w) {
      const dx = sx > 0 ? deck.x0 : deck.x1;
      options.push({ rects: [{ x0: Math.min(ex, dx), x1: Math.max(ex, dx), z0: p.z - w, z1: p.z + w }], pts: [{ x: ex, z: p.z }, { x: dx, z: p.z }] });
    } else {
      const dz = sz > 0 ? deck.z0 : deck.z1;
      options.push({
        rects: [{ x0: Math.min(ex, t.x - w), x1: Math.max(ex, t.x + w), z0: p.z - w, z1: p.z + w }, { x0: t.x - w, x1: t.x + w, z0: Math.min(p.z, dz), z1: Math.max(p.z, dz) }],
        pts: [{ x: ex, z: p.z }, { x: t.x, z: p.z }, { x: t.x, z: dz }],
      });
    }
  }
  // Or along z first, then x.
  {
    const ez = sz > 0 ? g.z1 : g.z0;
    if (Math.abs(t.x - p.x) <= D - w) {
      const dz = sz > 0 ? deck.z0 : deck.z1;
      options.push({ rects: [{ x0: p.x - w, x1: p.x + w, z0: Math.min(ez, dz), z1: Math.max(ez, dz) }], pts: [{ x: p.x, z: ez }, { x: p.x, z: dz }] });
    } else {
      const dx = sx > 0 ? deck.x0 : deck.x1;
      options.push({
        rects: [{ x0: p.x - w, x1: p.x + w, z0: Math.min(ez, t.z - w), z1: Math.max(ez, t.z + w) }, { x0: Math.min(p.x, dx), x1: Math.max(p.x, dx), z0: t.z - w, z1: t.z + w }],
        pts: [{ x: p.x, z: ez }, { x: p.x, z: t.z }, { x: dx, z: t.z }],
      });
    }
  }
  options.sort((a, b) => a.rects.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0) - b.rects.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0));
  return options.find((o) => clear(o.rects)) ?? options[0]!;
}

/**
 * Builds the pupa into the hollow (data/montana.ts calls it once the campus stands, before the carpets plan their
 * flights, so they fly round or over it): the cell as a solid, its gallery and pier as floors over root wood, the way
 * points from the deck's ring to the gallery, its area and a walk check. Returns its plan.
 */
export function buildPupa(b: HollowBuilder, trees: readonly PlacedTree[]): PupaPlan {
  const obstacles = hollowObstacles(b);
  const p = pupaPlan(obstacles);
  const g = p.gallery;
  const flat = (p.r * Math.sqrt(3)) / 2;
  // The cell and its wax foot (drawn by the scene: adapters/three/s3-bee-pupa.ts): she stops at it, walking or swimming.
  b.block("oculto", { x0: p.x - flat, x1: p.x + flat, z0: p.z - flat, z1: p.z + flat, y0: HOLLOW.floorY - 1, y1: p.y0 + p.h });
  // The gallery round its foot: a ring of four boards (the cell stands in its hole).
  const inner = { x0: p.x - flat, x1: p.x + flat, z0: p.z - flat, z1: p.z + flat };
  for (const r of [{ ...g, z1: inner.z0 }, { ...g, z0: inner.z1 }, { x0: g.x0, x1: inner.x0, z0: inner.z0, z1: inner.z1 }, { x0: inner.x1, x1: g.x1, z0: inner.z0, z1: inner.z1 }]) {
    b.floor(PUPA_AREA, p.galleryY, r);
    b.block("raices", { ...r, y0: HOLLOW.floorY, y1: p.galleryY - 0.02 }, false);
  }
  // The pier to the root deck of the tree nearest the middle.
  const D = GIANT.deckHalf;
  const t = [...trees].sort((a, c) => dist({ x0: a.x - D, x1: a.x + D, z0: a.z - D, z1: a.z + D }, p.x, p.z) - dist({ x0: c.x - D, x1: c.x + D, z0: c.z - D, z1: c.z + D }, p.x, p.z))[0]!;
  const pier = pierTo(p, t, obstacles);
  for (const r of pier.rects) {
    b.floor(PUPA_AREA, p.galleryY, r);
    b.block("raices", { ...r, y0: HOLLOW.floorY, y1: p.galleryY - 0.02 }, false);
  }
  // Its way points: the lookout at the gallery's edge, the pier's corner, its end on the deck, joined to the deck's ring.
  const ids = pier.pts.map((q, i) => b.point(i === 0 ? PUPA_POINT : `${PUPA_AREA}:muelle-${i}`, q.x, p.galleryY, q.z));
  b.link(...ids);
  const deckArea = `entrenamiento:${t.def.id}:pie`;
  const end = pier.pts.at(-1)!;
  const corners = [0, 1, 2, 3].map((k) => b.points.find((q) => q.id === `${deckArea}:anillo-${k}`)).filter((q): q is NonNullable<typeof q> => !!q);
  for (const c of corners.sort((a, c2) => Math.hypot(a.x - end.x, a.z - end.z) - Math.hypot(c2.x - end.x, c2.z - end.z)).slice(0, 2)) b.link(ids.at(-1)!, c.id);
  b.area({
    id: PUPA_AREA,
    island: "entrenamiento",
    label: "La pupa de la abeja",
    desc: `En el centro de la pirámide, entre los árboles colosales: una celda de cera de ${Math.round(p.h)} m, translúcida, donde una obrera de abeja asiática (Apis cerana) vive su metamorfosis real: huevo, larva, prepupa, pupa y adulta. Se llega andando por el muelle desde el pie de ${t.def.label.toLowerCase()}`,
    reality: "ficcion",
    centre: { x: p.x, y: p.y0 + p.h / 2, z: p.z },
    half: { x: g.x1 - p.x, y: p.h / 2, z: g.z1 - p.z },
    point: PUPA_POINT,
    floorY: p.galleryY,
  });
  b.walkCheck({ id: "La pupa de la abeja: del pie del árbol al mirador", pts: [...pier.pts].reverse().map((q) => ({ x: q.x, y: p.galleryY, z: q.z })) });
  return p;
}

/** The cell as a solid (the tests). */
export const pupaSolid = (p: PupaPlan): Solid => {
  const f = (p.r * Math.sqrt(3)) / 2;
  return { x0: p.x - f, x1: p.x + f, z0: p.z - f, z1: p.z + f, y0: HOLLOW.floorY - 1, y1: p.y0 + p.h };
};
