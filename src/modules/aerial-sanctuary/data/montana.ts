import type { Body, Floor, Rect, Solid, Water } from "../domain/walk";
import type { WayPoint } from "../domain/route";
import type { AreaDef, MachineDef, Prop } from "./layout";
import type { CarpetStation, CarpetTower } from "@modules/sanctuary-one/data/alfombras";
import { carpetRoute, Grid, obstaclesOf, touches, STATION_PAD, CARPET_CLEAR_M, OUT_HIGH_M } from "@modules/sanctuary-one/data/alfombras";
import { heightAt } from "../domain/mountain";
import { APRON_M, BIOME_ISLAND, MOUNTAIN, CORE_DEF, CAVE_HALF_M, CAVE_VAULT_M, INNER_HALF, INNER_H, caves, innerAt, innerY } from "./bioma-island";
import { scaleInteriorPlan } from "@modules/station/domain/interior";
import { starshipInteriorPlan, STARSHIP_DECKS } from "@modules/mothership/data/starship-interior";

/**
 * INSIDE THE HOLLOW MOUNTAIN (docs/design/montana-hueca.md; Berón 2026-11-25): the buried pyramid's hollow is the
 * astronauts' campus. Its floor is a lake 4 m deep, so bright and clear that the bottom shows; four giant trees rise
 * from it to the ceiling and hold it up like columns, and their floors carry every room of the campus, laid out by
 * sanctuary 1's tree rules (docs/design/edificios-y-pisos.md): two floors a level on opposite sides, each level turned
 * a quarter (pinwheel), 22 m between levels at least, a carpet station on the outer edge of every floor, a giant floor
 * («cima») alone on top. The flying carpets join the floors of a tree, its foot on the lake, the three caves' ends
 * and the flooded Starship. Everything here is ficción (the trees, the pyramid) holding real rooms.
 */

/** The hollow's middle on the world plan, and its floor and the lake's surface. */
export const HOLLOW = {
  x: BIOME_ISLAND.centre.value.x + CORE_DEF.x,
  z: BIOME_ISLAND.centre.value.z + CORE_DEF.z,
  floorY: CORE_DEF.baseY,
  /** Berón: «la base está cubierta por agua, con una profundidad de 4 m». */
  lakeTop: CORE_DEF.baseY + 4,
} as const;
/** The inner face's height over world (x, z). */
export const ceilingAt = (x: number, z: number): number => innerY(Math.max(Math.abs(x - HOLLOW.x), Math.abs(z - HOLLOW.z)));

/**
 * The middle of the hollow kept free of the trees, their floors and the carpets' stations, from the lake to the apex
 * (Berón 2026-11-26: the pupa stands there, ringed by the trees; its fauna and flora are another branch's), m of radius
 * on the plan.
 */
export const CENTRE_FREE_M = 45;
/**
 * The inside of the hollow mountain, for whoever furnishes it (the pupa, the carboniferous fauna and flora, the lake's
 * nymphs): its middle on the world plan, its floor and the lake's surface, half its floor, its apex, the ceiling over
 * any point, the free middle and whether a point is inside. World m.
 */
export const HOLLOW_INSIDE = {
  x: HOLLOW.x,
  z: HOLLOW.z,
  floorY: HOLLOW.floorY,
  lakeTop: HOLLOW.lakeTop,
  half: INNER_HALF,
  apexY: HOLLOW.floorY + INNER_H,
  ceilingAt,
  centreFree: CENTRE_FREE_M,
} as const;
/** Is world (x, y, z) inside the hollow (over its floor, under its ceiling)? */
export const inHollow = (x: number, y: number, z: number): boolean =>
  Math.max(Math.abs(x - HOLLOW.x), Math.abs(z - HOLLOW.z)) < INNER_HALF && y >= HOLLOW.floorY - 1 && y < ceilingAt(x, z);
/** Off an island's edge she does not jump more than the highest Olympic diving platform (World Aquatics), m. */
export const ISLAND_DROP_M = 10;
/**
 * How far she lets herself fall off an edge (application/free-walk.ts `maxDrop`; edificios-y-pisos.md E13): off a
 * tree's floor inside the hollow mountain, all the way down to the floor under it or the lake (as off sanctuary 1's
 * floors); anywhere else, off an island's edge, 10 m.
 */
export const dropLimit = (from: Body, _to: Body): number => (inHollow(from.x, from.y, from.z) ? Infinity : ISLAND_DROP_M);

/** The giant trees' rules (sanctuary 1's tree-buildings: data/site.ts TREE, reglas.md §2.7–2.13). */
export const GIANT = {
  /** Half the trunk (it is solid wood, a column of the ceiling), m. */
  trunkHalf: 9,
  /** The first level over the lake (room for the carpets under it), m. */
  firstY: HOLLOW.lakeTop + 14,
  /** Levels at least this far apart (Cold Sanctuary's TREE.levelGap). */
  levelGap: 22,
  /** The free strip round the rooms of a floor (its walkway and the ring her way goes round), m. */
  margin: 5,
  /** Between two rooms of a mixed floor, m. */
  gap: 5,
  /** The station's landing out of the floor's outer edge (deep × wide), m. */
  landing: { d: 7, w: 12 },
  /** Air kept under the ceiling over a room's roof, m. */
  headroom: 6,
  /** The root deck round the trunk on the lake. */
  deckHalf: 22,
  deckY: HOLLOW.lakeTop + 0.3,
} as const;

export type Side = "e" | "w" | "n" | "s";
const OUT: Record<Side, { x: number; z: number }> = { e: { x: 1, z: 0 }, w: { x: -1, z: 0 }, n: { x: 0, z: 1 }, s: { x: 0, z: -1 } };

export interface GiantTreeDef {
  readonly id: string;
  readonly label: string;
  /** Its category (sanctuary 1's: entrenamiento, servicios, ciencias, produccion…). */
  readonly building: string;
  readonly desc: string;
  /** From the hollow's middle, m. */
  readonly at: { readonly x: number; readonly z: number };
  /** Its floors from the bottom, two a level (a mixed floor holds two rooms or more). */
  readonly floors: readonly (readonly string[])[];
  /** The giant floor on top, alone on its level (sanctuary 1's «cima»), and the side of the trunk its room stands. */
  readonly cima?: { readonly room: string; readonly side: Side };
  /** The first level's two sides (then each level turns a quarter). */
  readonly first: "ew" | "ns";
}

/** The four giant trees and what each holds (the audit: data/campus.ts CAMPUS_SERVICES). */
export const GIANT_TREES: readonly GiantTreeDef[] = [
  { id: "arbol-entrenamiento", label: "Árbol del entrenamiento", building: "entrenamiento", desc: "Las instalaciones reales de formación de astronautas, un piso de árbol cada una; arriba, la NBL", at: { x: -115, z: 95 }, first: "ew", floors: [["supervivencia"], ["gimnasio", "trajes"], ["simulador-dragon", "simulador-lm"], ["robotica", "control"], ["svmf"]], cima: { room: "nbl", side: "e" } },
  { id: "arbol-servicios", label: "Árbol de los servicios", building: "servicios", desc: "Donde se vive: la residencia, el restaurante, la clínica, el médico de selección y la sala de asambleas", at: { x: 105, z: -70 }, first: "ns", floors: [["residencia"], ["restaurante"], ["clinica"], ["medico"], ["asambleas"]] },
  { id: "arbol-ciencias", label: "Árbol de las ciencias y el estudio", building: "ciencias", desc: "Las aulas, la biblioteca, el laboratorio de muestras y el área de crianza", at: { x: 95, z: 120 }, first: "ew", floors: [["aulas"], ["biblioteca"], ["laboratorio"], ["crianza"]] },
  { id: "arbol-produccion", label: "Árbol de la producción y los campos", building: "produccion", desc: "El huerto y el taller; arriba, la centrífuga", at: { x: -85, z: -115 }, first: "ns", floors: [["huerto"], ["taller"]], cima: { room: "centrifuga", side: "e" } },
];

/** The flooded Starship (Berón: «un starship relleno de agua, de modo que se puede nadar en su interior»). */
export const LAKE_STARSHIP = {
  at: { x: -160, z: -20 },
  /** The real ship: 50 m tall, 9 m across; its crew decks start this far over its base (ours: the payload section). */
  heightM: 50,
  radiusM: 4.5,
  crewDeckM: 36,
} as const;

export interface RoomSize {
  readonly hx: number;
  readonly hz: number;
  readonly h: number;
  readonly pool: number;
}

export interface PlacedFloor {
  readonly tree: string;
  readonly level: number;
  readonly side: Side | "cima";
  readonly y: number;
  readonly slab: Rect;
  readonly rooms: readonly { readonly id: string; readonly x: number; readonly z: number }[];
  /** The station's landing and its pad's middle, and the way its carpets leave. */
  readonly landing: Rect;
  readonly pad: { readonly x: number; readonly z: number };
  readonly out: { readonly x: number; readonly z: number };
  readonly top: number;
}

export interface PlacedTree {
  readonly def: GiantTreeDef;
  readonly x: number;
  readonly z: number;
  readonly floors: readonly PlacedFloor[];
  readonly top: number;
}

/**
 * Where each floor of a tree goes (world m), from its rooms' sizes as drawn: the levels from `firstY` up, two floors a
 * level on opposite sides of the trunk, each level a quarter turn from the one below, and the cima alone on top.
 */
export function placeTree(t: GiantTreeDef, size: (id: string) => RoomSize): PlacedTree {
  const tx = HOLLOW.x + t.at.x;
  const tz = HOLLOW.z + t.at.z;
  const T = GIANT.trunkHalf;
  const M = GIANT.margin;
  const floors: PlacedFloor[] = [];
  const levels: { floors: { rooms: readonly string[]; side: Side | "cima"; cimaSide?: Side }[] }[] = [];
  for (let i = 0; i < t.floors.length; i += 2) {
    const ew = (levels.length % 2 === 0) === (t.first === "ew");
    const sides: Side[] = ew ? ["e", "w"] : ["n", "s"];
    levels.push({ floors: t.floors.slice(i, i + 2).map((rooms, j) => ({ rooms, side: sides[j]! })) });
  }
  if (t.cima) levels.push({ floors: [{ rooms: [t.cima.room], side: "cima", cimaSide: t.cima.side }] });
  let y: number = GIANT.firstY;
  levels.forEach((lv, li) => {
    if (li > 0) {
      const below = levels[li - 1]!.floors.flatMap((f) => f.rooms.map(size));
      const here = lv.floors.flatMap((f) => f.rooms.map(size));
      y += Math.max(GIANT.levelGap, Math.max(...below.map((s) => s.h)) + 4 + Math.max(0, ...here.map((s) => s.pool)));
    }
    for (const f of lv.floors) {
      const sz = f.rooms.map(size);
      const side = f.side === "cima" ? f.cimaSide! : f.side;
      const o = OUT[side];
      const alongX = o.x === 0;
      // Depth: away from the trunk; width: along it, the rooms side by side.
      const depth = Math.max(...sz.map((s) => 2 * (alongX ? s.hz : s.hx)));
      const width = sz.reduce((a, s) => a + 2 * (alongX ? s.hx : s.hz), 0) + GIANT.gap * (sz.length - 1);
      const near = f.side === "cima" ? -T - M : T;
      const d0 = near;
      const d1 = T + 2 * M + depth;
      const w0 = -Math.max(width / 2 + M, f.side === "cima" ? T + M : 0);
      const w1 = -w0;
      // Rooms: in the middle of the depth past the trunk, side by side along the width.
      const rooms: { id: string; x: number; z: number }[] = [];
      let at = -width / 2;
      f.rooms.forEach((id, i) => {
        const s = sz[i]!;
        const ww = 2 * (alongX ? s.hx : s.hz);
        const dd = T + M + depth / 2;
        const ac = at + ww / 2;
        rooms.push({ id, x: tx + (alongX ? ac : o.x * dd), z: tz + (alongX ? o.z * dd : ac) });
        at += ww + GIANT.gap;
      });
      const slab = alongX
        ? { x0: tx + w0, x1: tx + w1, z0: tz + Math.min(o.z * d0, o.z * d1), z1: tz + Math.max(o.z * d0, o.z * d1) }
        : { x0: tx + Math.min(o.x * d0, o.x * d1), x1: tx + Math.max(o.x * d0, o.x * d1), z0: tz + w0, z1: tz + w1 };
      const L = GIANT.landing;
      const edge = d1;
      const landing = alongX
        ? { x0: tx - L.w / 2, x1: tx + L.w / 2, z0: tz + Math.min(o.z * edge, o.z * (edge + L.d)), z1: tz + Math.max(o.z * edge, o.z * (edge + L.d)) }
        : { x0: tx + Math.min(o.x * edge, o.x * (edge + L.d)), x1: tx + Math.max(o.x * edge, o.x * (edge + L.d)), z0: tz - L.w / 2, z1: tz + L.w / 2 };
      const pad = { x: tx + o.x * (edge + L.d / 2), z: tz + o.z * (edge + L.d / 2) };
      floors.push({ tree: t.id, level: li, side: f.side, y, slab, rooms, landing, pad, out: o, top: y + Math.max(...sz.map((s) => s.h)) });
    }
  });
  return { def: t, x: tx, z: tz, floors, top: ceilingAt(tx, tz) };
}

/**
 * A giant tree's crown (Berón 2026-11-26: «los árboles colosales deben parecer árboles: corteza, ramas, hojas, frutos y
 * flores»): its limbs, leaves, fruit and flowers spread round the trunk from a little over its highest room up to the
 * ceiling it holds, so no floor, lane or flight goes through it. Ours (ficción, like the trees). World m.
 */
export const CROWN = { over: 12, caveOver: 20, reach: 34, minDepth: 18 } as const;
export interface Crown {
  readonly tree: string;
  readonly x: number;
  readonly z: number;
  readonly y0: number;
  readonly y1: number;
  readonly r: number;
}
/**
 * A tree's crown: all the crowns start over the highest room of any tree and over the caves' ends (`caveOver` m over
 * the highest cave floor), so the carpets cross from tree to tree and to the caves under them.
 */
export function crownOf(t: PlacedTree, all: readonly PlacedTree[]): Crown | undefined {
  const y0 = Math.max(Math.max(...all.flatMap((q) => q.floors.map((f) => f.top))) + CROWN.over, Math.max(...caves().map((c) => c.y)) + CROWN.caveOver);
  const y1 = t.top;
  if (y1 - y0 < CROWN.minDepth) return undefined;
  return { tree: t.def.id, x: t.x, z: t.z, y0, y1, r: CROWN.reach };
}

/** The highest point under the ceiling a rectangle keeps (its corner farthest out). */
export function ceilingOver(r: Rect): number {
  return Math.min(ceilingAt(r.x0, r.z0), ceilingAt(r.x0, r.z1), ceilingAt(r.x1, r.z0), ceilingAt(r.x1, r.z1));
}

/** What a carpet flies over without keeping clear of it: the sea and the lake (it skims them, 2 m up). */
export const flownOver = (w: Water): boolean => w.id !== "mar" && w.id !== "lago-montana";
/** The world as the carpets inside the mountain plan their flights (sanctuary 1's carpetRoute). */
export function flightWorld(L: { readonly world: { readonly floors: readonly Floor[]; readonly waters: readonly Water[]; readonly solids: readonly Solid[] }; readonly hollow: HollowPlan }) {
  return { floors: L.world.floors, waters: L.world.waters.filter(flownOver), solids: L.world.solids, towers: L.hollow.towers };
}

/**
 * What a flight touches, if anything (every 1,5 m, off its two pads: the take-off and the landing are over their own
 * floor), or the ceiling within 2 m: a description, or undefined when it is clear.
 */
export function flightTouches(g: Grid, pts: readonly { x: number; y: number; z: number }[], s: { x: number; y: number; z: number }, t: { x: number; y: number; z: number }): string | undefined {
  const near = (x: number, y: number, z: number, p: { x: number; y: number; z: number }) => Math.hypot(x - p.x, z - p.z) < 9 && y < p.y + 6;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) / 1.5));
    for (let j = 0; j <= n; j++) {
      const x = p.x + ((q.x - p.x) * j) / n;
      const y = p.y + ((q.y - p.y) * j) / n;
      const z = p.z + ((q.z - p.z) * j) / n;
      if (near(x, y, z, s) || near(x, y, z, t)) continue;
      const hit = touches(g, x, y, z);
      if (hit || y > ceilingAt(x, z) - 2) return `(${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)}): ${hit?.area ?? "techo"}`;
    }
  }
  return undefined;
}

/** The plan of a layout's hollow mountain. */
export const hollowPlan = (L: { readonly hollow: HollowPlan }): HollowPlan => L.hollow;

/** What the mountain's builder offers (data/layout.ts Builder). */
export interface HollowBuilder {
  floor(area: string, y: number, r: Rect, id?: string): void;
  water(w: Water): void;
  block(look: string, s: Solid, solid?: boolean): void;
  point(id: string, x: number, y: number, z: number, lift?: WayPoint["lift"], carpet?: string): string;
  link(...ids: string[]): void;
  area(a: AreaDef): void;
  machine(m: Omit<MachineDef, "point">, link: string): string;
  walkCheck(c: { id: string; pts: readonly { x: number; y: number; z: number }[] }): void;
  readonly props: Prop[];
  readonly points: readonly WayPoint[];
  readonly floors: readonly Floor[];
  readonly waters: readonly Water[];
  readonly solids: readonly Solid[];
}

/** A carpet station of the mountain and the way point of its pad. */
export interface HollowStation extends CarpetStation {
  readonly point: string;
}

export interface HollowPlan {
  readonly trees: readonly PlacedTree[];
  /** The trees' crowns (their limbs, leaves, fruit and flowers). */
  readonly crowns: readonly Crown[];
  readonly stations: readonly HollowStation[];
  readonly towers: readonly CarpetTower[];
  /** The carpets' way over everything inside (under the ceiling). */
  readonly sky: number;
  /** Where the helipad of the campus is (outside, at the south cave's mouth) and its way point. */
  readonly heli: { readonly x: number; readonly y: number; readonly z: number; readonly half: number };
  readonly starship: { readonly x: number; readonly z: number; readonly baseY: number; readonly k: number; readonly deck3Y: number };
}

const around = (x: number, z: number, hx: number, hz = hx): Rect => ({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz });
/** A rectangle less a hole: up to four pieces round it. */
function subtract(r: Rect, h: Rect): Rect[] {
  if (h.x0 >= r.x1 || h.x1 <= r.x0 || h.z0 >= r.z1 || h.z1 <= r.z0) return [r];
  const out: Rect[] = [];
  if (h.z0 > r.z0) out.push({ ...r, z1: h.z0 });
  if (h.z1 < r.z1) out.push({ ...r, z0: h.z1 });
  const z0 = Math.max(r.z0, h.z0);
  const z1 = Math.min(r.z1, h.z1);
  if (h.x0 > r.x0) out.push({ x0: r.x0, x1: h.x0, z0, z1 });
  if (h.x1 < r.x1) out.push({ x0: h.x1, x1: r.x1, z0, z1 });
  return out;
}
const subtractAll = (r: Rect, holes: readonly Rect[]): Rect[] => holes.reduce<Rect[]>((acc, h) => acc.flatMap((q) => subtract(q, h)), [r]);
const inRect = (r: Rect, x: number, z: number, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;

/**
 * The way round a floor: a ring 2,5 m in from its edges, with each door's outside point and the landing joined to it
 * by straight lines that cross no room.
 */
function ringWays(b: HollowBuilder, prefix: string, slab: Rect, y: number, rooms: readonly Rect[], extra: readonly string[]): void {
  const inset = GIANT.margin / 2;
  const r = { x0: slab.x0 + inset, x1: slab.x1 - inset, z0: slab.z0 + inset, z1: slab.z1 - inset };
  const sides: { pts: { id: string; t: number }[]; fix: "x" | "z"; at: number }[] = [
    { pts: [], fix: "z", at: r.z0 },
    { pts: [], fix: "x", at: r.x1 },
    { pts: [], fix: "z", at: r.z1 },
    { pts: [], fix: "x", at: r.x0 },
  ];
  const c = [b.point(`${prefix}:anillo-0`, r.x0, y, r.z0), b.point(`${prefix}:anillo-1`, r.x1, y, r.z0), b.point(`${prefix}:anillo-2`, r.x1, y, r.z1), b.point(`${prefix}:anillo-3`, r.x0, y, r.z1)];
  sides[0]!.pts.push({ id: c[0]!, t: r.x0 }, { id: c[1]!, t: r.x1 });
  sides[1]!.pts.push({ id: c[1]!, t: r.z0 }, { id: c[2]!, t: r.z1 });
  sides[2]!.pts.push({ id: c[3]!, t: r.x0 }, { id: c[2]!, t: r.x1 });
  sides[3]!.pts.push({ id: c[0]!, t: r.z0 }, { id: c[3]!, t: r.z1 });
  const blockedBy = (ax: number, az: number, bx: number, bz: number) =>
    rooms.some((q) => {
      for (let i = 1; i < 20; i++) if (inRect(q, ax + ((bx - ax) * i) / 20, az + ((bz - az) * i) / 20, 0.45)) return true;
      return false;
    });
  let n = 0;
  for (const id of extra) {
    const p = b.points.find((q) => q.id === id)!;
    // Straight to each side of the ring (the nearest first) until a line that crosses no room.
    const tries = sides.map((s, i) => ({ s, i, d: s.fix === "z" ? Math.abs(p.z - s.at) : Math.abs(p.x - s.at) })).sort((a, c2) => a.d - c2.d);
    for (const { s, d } of tries) {
      const hx = s.fix === "z" ? Math.min(r.x1, Math.max(r.x0, p.x)) : s.at;
      const hz = s.fix === "z" ? s.at : Math.min(r.z1, Math.max(r.z0, p.z));
      if (blockedBy(p.x, p.z, hx, hz)) continue;
      if (d < 0.05) {
        s.pts.push({ id, t: s.fix === "z" ? p.x : p.z });
      } else {
        const q = b.point(`${prefix}:paso-${n++}`, hx, y, hz);
        b.link(id, q);
        s.pts.push({ id: q, t: s.fix === "z" ? hx : hz });
      }
      break;
    }
  }
  for (const s of sides) {
    s.pts.sort((a, c2) => a.t - c2.t);
    for (let i = 1; i < s.pts.length; i++) if (s.pts[i]!.id !== s.pts[i - 1]!.id) b.link(s.pts[i - 1]!.id, s.pts[i]!.id);
  }
}

/**
 * A station's lane: out along its way from `from` m off its pad, the first column of clear air from just over the lake
 * up to `top` (over every floor of its tree), so a flight to any floor or foot climbs or drops in it.
 */
function laneOut(g: Grid, s: { x: number; y: number; z: number; out: { x: number; z: number } }, from: number, top: number, minLo: number): { x: number; z: number; lo: number; hi: number } {
  const o = s.out;
  const n = Math.hypot(o.x, o.z);
  for (let d = from; d < from + 160; d += 1.5) {
    const x = s.x + (o.x / n) * d;
    const z = s.z + (o.z / n) * d;
    const cap = Math.min(top, ceilingAt(x, z) - 4);
    const l = lane(g, x, z, s.y);
    if (l.lo <= Math.max(s.y + OUT_HIGH_M, HOLLOW.lakeTop + 3) && l.hi >= cap - 0.5) return { ...l, lo: Math.max(l.lo, minLo) };
  }
  const l = lane(g, s.x + (o.x / n) * from, s.z + (o.z / n) * from, s.y);
  return { ...l, lo: Math.max(l.lo, minLo) };
}

/** Of the eight ways out of a tree's trunk, the one that leaves its floors soonest (the foot's station looks that way). */
function openSide(t: PlacedTree): { x: number; z: number } {
  let best = { x: 1, z: 0 };
  let bd = Infinity;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const d = { x: Math.round(Math.cos(a) * 1e6) / 1e6, z: Math.round(Math.sin(a) * 1e6) / 1e6 };
    let r = GIANT.deckHalf;
    while (r < 200 && t.floors.some((f) => inRect(f.slab, t.x + d.x * r, t.z + d.z * r, CARPET_CLEAR_M + 1) || inRect(f.landing, t.x + d.x * r, t.z + d.z * r, CARPET_CLEAR_M + 1))) r += 1;
    if (r < bd) [best, bd] = [d, r];
  }
  return best;
}

/** A station's lane: the column of clear air out of its landing, and how far down and up it is clear. */
function lane(g: Grid, x: number, z: number, y: number): { x: number; z: number; lo: number; hi: number } {
  const top = ceilingAt(x, z) - 4;
  let lo = y + OUT_HIGH_M;
  // Up out of whatever is at the pad's height (the floor it juts from, the lake), then as low as it is clear.
  while (touches(g, x, lo, z) && lo < top) lo += 1;
  while (lo - 1 >= HOLLOW.lakeTop + 3 && !touches(g, x, lo - 1, z)) lo -= 1;
  let hi = y + OUT_HIGH_M;
  while (hi + 1 <= top && !touches(g, x, hi + 1, z)) hi += 1;
  return { x, z, lo, hi };
}

/**
 * Builds the inside of the mountain: the lake, the caves, the giant trees with their floors (each room through
 * `buildRoom`, which builds it and carries it to its place), the root decks, the stations and the Starship.
 */
export function buildHollow(b: HollowBuilder, k: number, size: (id: string) => RoomSize, labelOf: (id: string) => string, buildRoom: (id: string, at: { x: number; y: number; z: number }) => void, heliHalf: number): HollowPlan {
  const H = HOLLOW;
  const C = BIOME_ISLAND.centre.value;
  // ── The lake: the hollow's whole floor under 4 m of clear water ──
  const ih = INNER_HALF - 0.5;
  b.water({ id: "lago-montana", x0: H.x - ih, x1: H.x + ih, z0: H.z - ih, z1: H.z + ih, yBottom: H.floorY, yTop: H.lakeTop, area: "entrenamiento:lago" });

  // ── The caves: from their mouths on the south face to a ledge over the lake, each ending at a station ──
  const caveEnds: { id: string; label: string; point: string; pad: { x: number; y: number; z: number } }[] = [];
  for (const cv of caves()) {
    const x = C.x + cv.from.x;
    const zMouth = C.z + cv.from.z;
    const zEnd = C.z + cv.to.z;
    const area = `entrenamiento:cueva-${cv.id}`;
    const half = CAVE_HALF_M;
    b.floor(area, cv.y, { x0: x - half, x1: x + half, z0: zMouth - 1, z1: zEnd + 1 });
    // Its rock: walls and the vault (drawn; the walls stop her).
    for (const s of [-1, 1]) b.block("roca-cueva", { x0: x + s * half - (s > 0 ? 0 : 1.5), x1: x + s * half + (s > 0 ? 1.5 : 0), z0: zMouth, z1: zEnd, y0: cv.y - 1, y1: cv.y + CAVE_VAULT_M });
    b.block("roca-cueva", { x0: x - half - 1.5, x1: x + half + 1.5, z0: zMouth + 3, z1: zEnd, y0: cv.y + CAVE_VAULT_M, y1: cv.y + CAVE_VAULT_M + 2 }, false);
    b.block("suelo-cueva", { x0: x - half, x1: x + half, z0: zMouth - 1, z1: zEnd + 1, y0: cv.y - 1, y1: cv.y - 0.02 }, false);
    // The ledge over the lake: from the wall inwards, its station at the end.
    const wallZ = H.z - innerAt(cv.y);
    const ledge = { x0: x - half - 2, x1: x + half + 2, z0: zEnd, z1: Math.max(wallZ, zEnd) + 22 };
    b.floor(area, cv.y, ledge);
    b.block("repisa-cueva", { ...ledge, y0: cv.y - 1.2, y1: cv.y - 0.02 }, false);
    // Steps down from the mouth to the slope where it lies lower (0,4 m each, a metre apart: walked, not climbed).
    let sy = cv.y;
    let sz0 = zMouth - 1;
    let stepN = 0;
    while (heightAt(MOUNTAIN.value, cv.from.x, sz0 - C.z - 1) < sy - 0.45 && stepN < 40) {
      sy -= 0.4;
      b.floor(area, sy, { x0: x - 2, x1: x + 2, z0: sz0 - 1, z1: sz0 });
      b.block("suelo-cueva", { x0: x - 2, x1: x + 2, z0: sz0 - 1, z1: sz0, y0: sy - 0.6, y1: sy - 0.02 }, false);
      sz0 -= 1;
      stepN++;
    }
    const mouth = b.point(`${area}:boca`, x, cv.y, zMouth + 1);
    if (stepN) b.link(b.point(`${area}:escalones`, x, sy, sz0 + 0.5), mouth);
    const mid = b.point(`${area}:galeria`, x, cv.y, (zMouth + zEnd) / 2);
    const end = b.point(`${area}:fondo`, x, cv.y, zEnd + 3);
    const pad = { x, y: cv.y, z: ledge.z1 - STATION_PAD.z / 2 - 1.5 };
    b.link(mouth, mid, end);
    b.area({ id: area, island: "entrenamiento", label: cv.label, desc: `Una cueva de ${Math.round(zEnd - zMouth)} m por la cara sur de la montaña hasta su interior hueco, a ${Math.round(cv.y - H.lakeTop)} m sobre el lago: termina en una estación de alfombras voladoras`, reality: "ficcion", centre: { x, y: cv.y + CAVE_VAULT_M / 2, z: (zMouth + ledge.z1) / 2 }, half: { x: half, y: CAVE_VAULT_M / 2, z: (ledge.z1 - zMouth) / 2 }, point: end });
    caveEnds.push({ id: `cueva-${cv.id}`, label: cv.label, point: end, pad });
    b.walkCheck({ id: `${cv.label}: de la boca al fondo`, pts: [{ x, y: cv.y, z: zMouth + 1 }, { x, y: cv.y, z: pad.z }] });
  }

  // ── The giant trees and their floors ──
  const trees = GIANT_TREES.map((t) => placeTree(t, size));
  const stationsDraft: { id: string; area: string; tower: string; building: string; kind: "piso" | "pie"; label: string; x: number; y: number; z: number; out: { x: number; z: number }; point: string; landing?: Rect }[] = [];
  for (const t of trees) {
    const T = GIANT.trunkHalf;
    // The trunk: solid wood from the lake's bottom up to the ceiling it holds.
    const trunk = around(t.x, t.z, T);
    b.block("tronco-gigante", { ...trunk, y0: H.floorY - 1, y1: t.top + 6 });
    b.props.push({ kind: "giant-tree", x: t.x, y: H.floorY, z: t.z, size: { x: 2 * T, y: t.top - H.floorY, z: 2 * T }, label: t.def.label });
    // Its crown under the ceiling (drawn by adapters/three/s3-giant-trees.ts): solid air for the carpets.
    const cr = crownOf(t, trees);
    if (cr) b.block("oculto", { ...around(t.x, t.z, cr.r), y0: cr.y0, y1: cr.y1 });
    // The root deck on the lake, round the trunk, with its station («pie»).
    const D = GIANT.deckHalf;
    const deck = around(t.x, t.z, D);
    const deckArea = `entrenamiento:${t.def.id}:pie`;
    for (const r of [{ ...deck, z1: trunk.z0 }, { ...deck, z0: trunk.z1 }, { x0: deck.x0, x1: trunk.x0, z0: trunk.z0, z1: trunk.z1 }, { x0: trunk.x1, x1: deck.x1, z0: trunk.z0, z1: trunk.z1 }]) b.floor(deckArea, GIANT.deckY, r);
    b.block("raices", { ...deck, y0: H.floorY, y1: GIANT.deckY - 0.02 }, false);
    // Its station on the side where the open air is nearest (out from under every floor of the tree: its lane).
    const toCentre = openSide(t);
    const deckPad = { x: t.x + toCentre.x * (D - 4), z: t.z + toCentre.z * (D - 4) };
    const deckP = b.point(`${deckArea}:estacion`, deckPad.x, GIANT.deckY, deckPad.z);
    ringWays(b, deckArea, { x0: deck.x0, x1: deck.x1, z0: deck.z0, z1: deck.z1 }, GIANT.deckY, [trunk], [deckP]);
    b.area({ id: deckArea, island: "entrenamiento", label: `${t.def.label} · pie`, desc: `Las raíces de ${t.def.label.toLowerCase()} sobre el lago: una plataforma de madera alrededor del tronco con su estación de alfombras (a sus pisos y a los demás pies)`, reality: "ficcion", centre: { x: t.x, y: GIANT.deckY + 1, z: t.z }, half: { x: D, y: 1, z: D }, point: deckP });
    stationsDraft.push({ id: `${deckArea}:alfombras`, area: deckArea, tower: t.def.id, building: t.def.label, kind: "pie", label: "Pie", x: deckPad.x, y: GIANT.deckY, z: deckPad.z, out: toCentre, point: deckP });
    for (const f of t.floors) {
      const fa = `entrenamiento:${t.def.id}:piso-${t.floors.indexOf(f) + 1}`;
      // The slab and its braces to the trunk (drawn), the landing out of its edge.
      const roomRects: Rect[] = f.rooms.map((r) => {
        const s = size(r.id);
        return around(r.x, r.z, s.hx, s.hz);
      });
      for (const q of subtractAll(f.slab, [...roomRects, trunk])) b.floor(fa, f.y, q);
      b.floor(fa, f.y, f.landing);
      b.block("piso-arbol", { ...f.slab, y0: f.y - 0.8, y1: f.y - 0.02 }, false);
      b.block("piso-arbol", { ...f.landing, y0: f.y - 0.5, y1: f.y - 0.02 }, false);
      const o = f.out;
      for (const s of [-1, 1]) {
        const along = o.x === 0 ? { x: s * (T - 1), z: 0 } : { x: 0, z: s * (T - 1) };
        const reach = f.side === "cima" ? 0 : 14;
        if (!reach) continue;
        b.block("riostra", { ...around(t.x + along.x + o.x * (T + reach / 2), t.z + along.z + o.z * (T + reach / 2), o.x ? reach / 2 : 0.6, o.z ? reach / 2 : 0.6), y0: f.y - 7, y1: f.y - 0.8 }, false);
      }
      for (const r of f.rooms) buildRoom(r.id, { x: r.x, y: f.y, z: r.z });
      const outs = f.rooms.map((r) => `entrenamiento:${r.id}:fuera`);
      const padP = b.point(`${fa}:estacion`, f.pad.x, f.y, f.pad.z);
      ringWays(b, fa, f.slab, f.y, [...roomRects, trunk], [...outs, padP]);
      const names = f.rooms.map((r) => labelOf(r.id)).join(" y ");
      b.area({ id: fa, island: "entrenamiento", label: `${t.def.label} · piso ${t.floors.indexOf(f) + 1}${f.side === "cima" ? " (cima)" : ""}`, desc: `Piso de árbol a ${Math.round(f.y - H.lakeTop)} m sobre el lago: ${names}`, reality: "ficcion", centre: { x: (f.slab.x0 + f.slab.x1) / 2, y: f.y + 1, z: (f.slab.z0 + f.slab.z1) / 2 }, half: { x: (f.slab.x1 - f.slab.x0) / 2, y: 1, z: (f.slab.z1 - f.slab.z0) / 2 }, point: padP, floorY: f.y });
      stationsDraft.push({ id: `${fa}:alfombras`, area: fa, tower: t.def.id, building: t.def.label, kind: "piso", label: f.side === "cima" ? "Cima" : `Piso ${t.floors.indexOf(f) + 1}`, x: f.pad.x, y: f.y, z: f.pad.z, out: f.out, point: padP, landing: f.landing });
    }
  }

  // ── The flooded Starship, standing on the lake's bottom ──
  const ss = LAKE_STARSHIP;
  const sx = H.x + ss.at.x;
  const sz = H.z + ss.at.z;
  const R = ss.radiusM * k;
  const deck3Y = H.floorY + ss.crewDeckM * k;
  const plan = scaleInteriorPlan(starshipInteriorPlan(), k);
  // Its frame: +y to the nose; deck 3's middle at its crew height. Every volume is water she swims through.
  const base = { x: sx, y: deck3Y + (plan.volumes.find((v) => v.id === "cubierta-3")!.half.y), z: sz };
  for (const v of plan.volumes) {
    const deck = STARSHIP_DECKS.find((d) => d.id === v.id);
    const area = `entrenamiento:starship:${v.id}`;
    const c = { x: base.x + v.centre.x, y: base.y + v.centre.y, z: base.z + v.centre.z };
    b.water({ id: `starship-${v.id}`, x0: c.x - v.half.x, x1: c.x + v.half.x, z0: c.z - v.half.z, z1: c.z + v.half.z, yBottom: c.y - v.half.y, yTop: c.y + v.half.y, area });
    b.area({ id: area, island: "entrenamiento", label: `Starship inundado · ${deck?.label ?? v.label}`, desc: `${v.label} de la Starship (distribución nuestra: docs/design/nodriza-starship.md), llena de agua: se visita nadando`, reality: "ficcion", centre: c, half: { x: v.half.x, y: v.half.y, z: v.half.z }, point: `${area}:centro` });
    b.point(`${area}:centro`, c.x, c.y - v.half.y + 0.3, c.z);
  }
  for (const f of plan.fixtures) {
    const v = plan.volumes.find((q) => q.id === f.volume);
    if (!v) continue;
    const c = { x: base.x + f.at.x, y: base.y + f.at.y, z: base.z + f.at.z };
    b.block(f.id.startsWith("puerta-") ? "escotilla-starship" : "equipo-starship", { x0: c.x - f.size.x / 2, x1: c.x + f.size.x / 2, z0: c.z - f.size.z / 2, z1: c.z + f.size.z / 2, y0: c.y - f.size.y / 2, y1: c.y + f.size.y / 2 }, false);
  }
  // The way in: the airlock on deck 3's forward (−z) wall, out through the hull to a gangway with its station.
  const d3 = plan.volumes.find((v) => v.id === "cubierta-3")!;
  const d3c = { x: base.x + d3.centre.x, y: base.y + d3.centre.y, z: base.z + d3.centre.z };
  const lockFloor = d3c.y - d3.half.y;
  const lockZ0 = sz - R - 1.5;
  b.water({ id: "starship-esclusa-paso", x0: sx - 1.2, x1: sx + 1.2, z0: lockZ0, z1: d3c.z - d3.half.z + 0.2, yBottom: lockFloor, yTop: lockFloor + 2.6, area: "entrenamiento:starship:esclusa" });
  b.area({ id: "entrenamiento:starship:esclusa", island: "entrenamiento", label: "Starship inundado · esclusa", desc: "La esclusa de la tripulación, abierta y llena de agua: de la pasarela se entra nadando a la cubierta 3", reality: "ficcion", centre: { x: sx, y: lockFloor + 1.3, z: (lockZ0 + d3c.z - d3.half.z) / 2 }, half: { x: 1.2, y: 1.3, z: (d3c.z - d3.half.z - lockZ0) / 2 }, point: "entrenamiento:starship:esclusa:dentro" });
  const gang = { x0: sx - 5, x1: sx + 5, z0: lockZ0 - 16, z1: lockZ0 + 0.3 };
  const gangY = lockFloor + 0.6;
  b.floor("entrenamiento:starship:pasarela", gangY, gang);
  b.block("pasarela", { ...gang, y0: gangY - 0.4, y1: gangY - 0.02 }, false);
  for (const s of [-1, 1]) b.block("pasarela", { ...around(sx + s * 4, (gang.z0 + gang.z1) / 2, 0.4, 0.4), y0: H.floorY, y1: gangY - 0.4 }, false);
  // The hull: a ring of steel plates round the crew decks (she swims inside the volumes; outside them is the hull).
  b.props.push({ kind: "lake-starship", x: sx, y: H.floorY, z: sz, size: { x: 2 * R, y: ss.heightM * k, z: 2 * R }, label: "Starship inundado" });
  const top = H.floorY + ss.heightM * k * 0.82;
  const hull = (x0: number, x1: number, z0: number, z1: number, y0: number = H.floorY, y1: number = top) => b.block("oculto", { x0, x1, z0, z1, y0, y1 });
  hull(sx - R, sx + R, sz + R - 1.2, sz + R);
  hull(sx - R, sx - R + 1.2, sz - R, sz + R);
  hull(sx + R - 1.2, sx + R, sz - R, sz + R);
  hull(sx - R, sx - 1.4, sz - R, sz - R + 1.2);
  hull(sx + 1.4, sx + R, sz - R, sz - R + 1.2);
  // The doorway in the forward plate: the plate stops under the lock and starts over it.
  hull(sx - 1.4, sx + 1.4, sz - R, sz - R + 1.2, H.floorY, lockFloor);
  hull(sx - 1.4, sx + 1.4, sz - R, sz - R + 1.2, lockFloor + 2.6, top);
  const lockIn = b.point("entrenamiento:starship:esclusa:dentro", sx, lockFloor + 0.4, d3c.z - d3.half.z - 0.5);
  const gangIn = b.point("entrenamiento:starship:pasarela:puerta", sx, gangY, lockZ0 - 0.6);
  const gangPad = { x: sx, z: gang.z0 + STATION_PAD.z / 2 + 1.5 };
  const gangP = b.point("entrenamiento:starship:pasarela:estacion", gangPad.x, gangY, gangPad.z);
  const deckIn = `entrenamiento:starship:cubierta-3:centro`;
  b.link(gangP, gangIn, lockIn, deckIn);
  for (const [lower, upper] of [["cubierta-3", "escotilla-3-2"], ["escotilla-3-2", "cubierta-2"], ["cubierta-2", "escotilla-2-1"], ["escotilla-2-1", "cubierta-1"]] as const) b.link(`entrenamiento:starship:${lower}:centro`, `entrenamiento:starship:${upper}:centro`);
  for (const v of plan.volumes) {
    if (!v.id.startsWith("camarote")) continue;
    const door = plan.volumes.find((q) => q.id !== v.id && q.id.endsWith(v.id));
    b.link("entrenamiento:starship:cubierta-2:centro", ...(door ? [`entrenamiento:starship:${door.id}:centro`] : []), `entrenamiento:starship:${v.id}:centro`);
  }
  b.area({ id: "entrenamiento:starship:pasarela", island: "entrenamiento", label: "Starship inundado · pasarela", desc: "Una Starship de pie en el lago, llena de agua hasta la proa: por la pasarela se llega a su esclusa abierta y se entra nadando a visitar cada cubierta", reality: "ficcion", centre: { x: sx, y: gangY + 1, z: (gang.z0 + gang.z1) / 2 }, half: { x: 5, y: 1, z: 8 }, point: gangP });
  stationsDraft.push({ id: "entrenamiento:starship:alfombras", area: "entrenamiento:starship:pasarela", tower: "starship", building: "Starship inundado", kind: "pie", label: "Starship", x: gangPad.x, y: gangY, z: gangPad.z, out: { x: 0, z: -1 }, point: gangP });
  for (const c of caveEnds) {
    const area = `entrenamiento:${c.id}`;
    const p = b.point(`${area}:estacion`, c.pad.x, c.pad.y, c.pad.z);
    b.link(c.point, p);
    stationsDraft.push({ id: `${area}:alfombras`, area, tower: c.id, building: c.label, kind: "pie", label: c.label, x: c.pad.x, y: c.pad.y, z: c.pad.z, out: { x: 0, z: 1 }, point: p });
  }

  // ── The stations: their pads, consoles and lanes (found from what was built) ──
  const g = new Grid(obstaclesOf({ floors: b.floors, waters: b.waters.filter(flownOver), solids: b.solids }));
  const treeTop = new Map(trees.map((t) => [t.def.id, Math.max(...t.floors.map((f) => f.y)) + 8]));
  const stations: HollowStation[] = stationsDraft.map((s) => {
    const off = (s.landing ? GIANT.landing.d / 2 : 8) + CARPET_CLEAR_M + 1.5;
    const ln = laneOut(g, s, off, Math.max(treeTop.get(s.tower) ?? 0, s.y + 12, HOLLOW.lakeTop + 30), s.kind === "pie" ? s.y + 5.5 : 0);
    return { ...s, reach: s.kind === "piso" ? "edificio" : "santuario", lane: ln };
  });
  for (const s of stations) {
    // The station's point is its pad: a carpet way point. Its pad, carpets and orrery are sanctuary 1's, drawn by the
    // scene (adapters/three/carpet-stations.ts); on it the orange button «Volar» opens its carpets (ui/carpet-stations.ts).
    const i = b.points.findIndex((p) => p.id === s.point);
    (b.points as WayPoint[])[i] = { ...b.points[i]!, carpet: s.id };
  }
  // The carpet links: a floor's station to the others of its tree; the feet, caves and the Starship to one another;
  // each only if its flight is clear of everything (else «Ir» goes by another station: flown in two hops).
  const towers: CarpetTower[] = [...trees.map((t) => ({ id: t.def.id, x: t.x, z: t.z, rootHeight: t.top })), { id: "starship", x: sx, z: sz, rootHeight: H.floorY + ss.heightM * k }, ...caveEnds.map((c) => ({ id: c.id, x: c.pad.x, z: c.pad.z, rootHeight: c.pad.y }))];
  const sky = Math.min(...trees.map((t) => t.top)) - 10;
  const fw = { floors: b.floors, waters: b.waters.filter(flownOver), solids: b.solids, towers };
  for (let i = 0; i < stations.length; i++)
    for (let j = i + 1; j < stations.length; j++) {
      const a = stations[i]!;
      const c = stations[j]!;
      if (!(a.tower === c.tower || (a.kind === "pie" && c.kind === "pie"))) continue;
      if (!flightTouches(g, carpetRoute(fw, a, c, sky), a, c)) b.link(a.point, c.point);
    }

  const firstDeck = `entrenamiento:${trees[0]!.def.id}:pie:estacion`;
  b.area({ id: "entrenamiento:lago", island: "entrenamiento", label: "Lago de la montaña", desc: "El suelo de la pirámide hueca, cubierto por 4 m de agua tan clara que se ve el fondo; la luz viene de todas partes, sin sombras, como dentro de una nave", reality: "ficcion", centre: { x: H.x, y: H.floorY + 2, z: H.z }, half: { x: ih, y: 2, z: ih }, point: firstDeck });
  b.area({ id: "entrenamiento:montana", island: "entrenamiento", label: "Campus de la montaña hueca", desc: "Dentro de la montaña artificial: la pirámide enterrada, sus árboles colosales que sostienen el techo y el campus de los astronautas en sus pisos", reality: "ficcion", centre: { x: H.x, y: 250, z: H.z }, half: { x: ih, y: 150, z: ih }, point: firstDeck });

  // ── The campus's helipad: outside, on the apron at the south cave's mouth ──
  const sur = caves()[0]!;
  const heli = { x: C.x + sur.from.x, y: heightAt(MOUNTAIN.value, sur.from.x, sur.from.z - APRON_M) + 0.05, z: C.z + sur.from.z - APRON_M, half: heliHalf };
  const crowns = trees.map((t) => crownOf(t, trees)).filter((c): c is Crown => !!c);
  return { trees, crowns, stations, towers, sky, heli, starship: { x: sx, z: sz, baseY: H.floorY, k, deck3Y } };
}
