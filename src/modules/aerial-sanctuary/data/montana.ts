import type { Body, Floor, Rect, Solid, Water } from "../domain/walk";
import type { WayPoint } from "../domain/route";
import type { AreaDef, MachineDef, Prop, RoomDef } from "./layout";
import type { CarpetStation, CarpetTower } from "@modules/sanctuary-one/data/alfombras";
import { Grid, obstaclesOf, touches, STATION_PAD, OUT_HIGH_M } from "@modules/sanctuary-one/data/alfombras";
import { buildTowers, type TowersLayout } from "@modules/sanctuary-one/data/layout";
import { BASE, TOWERS, WATER_Y, type TowerSpec } from "@modules/sanctuary-one/data/site";
import { TRUNK_HALF } from "@modules/sanctuary-one/data/paso";
import { TREE } from "./facts";
import { heightAt } from "../domain/mountain";
import { floorWay } from "../domain/floor-way";
import { APRON_M, BIOME_ISLAND, CORE_DEF, GATE_H_M, GATE_HALF_M, INNER_HALF, MOUNTAIN, gates } from "./bioma-island";
import { scaleInteriorPlan } from "@modules/station/domain/interior";
import { starshipInteriorPlan, STARSHIP_DECKS } from "@modules/mothership/data/starship-interior";
import { buildPupa, type PupaPlan } from "./pupa-abeja";
import { CAMPUS_IN_S1 } from "./campus";

/**
 * INSIDE THE MOUNTAIN (docs/design/montana-hueca.md; Berón 2026-11-25, rebuilt 2026-11-28): a scene of its own, entered
 * through the steel gates of the mountain's south face (Berón: «el interior de la montaña podría ser un cambio de
 * escena… en lugar de cuevas se colocarían compuertas»). It is a HALL excavated in the rock, wider than the pyramid and
 * dug 40 m under the sea (Berón: «el interior baja más del nivel del mar, como si se hubiera excavado dentro de la
 * montaña, para poder obtener la altura necesaria para los edificios de sanctuary1»), its floor a lake as deep as
 * sanctuary 1's sea. In it stand SANCTUARY 1'S BUILDINGS, AS THEY ARE (Berón: «tomar los de sanctuary1 y migrarlos tal
 * cual dentro de la montaña»: the same code and data, `buildTowers`), each at its own place round the hall's middle,
 * where the bee's pupa stands; and two more tree-buildings by the same rules carry the floors that only sanctuary 3
 * has: the astronauts' training rooms (Berón: «agregar los pisos especiales de sanctuary3… los de entrenamiento para
 * ser astronauta») and the giant insects' breeding room. The campus's services are done on sanctuary 1's floors that
 * do them (data/campus.ts CAMPUS_IN_S1). The carpets: a floor's fly inside its building; the gates', the feet's, the
 * crowns' and the Starship's go straight to any station (Berón: «las alfombras de las entradas… llevan a cualquier
 * edificio directamente»). Everything here is ficción (the hall, the trees) holding real rooms.
 */

/** The hall inside the mountain, in a part of the plan of its own (no island is near: it is another scene). */
export const NAVE = {
  x: 9000,
  z: 9000,
  /** Half its floor: room for sanctuary 1's ring of buildings (≈ 400 m from the middle) and their floors, m. */
  half: INNER_HALF,
  /** Its rock floor, 40 m under the sea: the lake is as deep as sanctuary 1's sea under its buildings. */
  bottomY: -40,
  /** The walls' top and the roof's apex (a pyramid like the mountain's, over the walls), m. */
  wallTopY: 200,
  apexY: 330,
  /** The carpets' sky way, over every building and the pupa, under the roof (montana.test.ts checks both), m. */
  skyY: 170,
} as const;

/** The hall's middle on the plan, its floor and the lake's surface (sanctuary 1's sea level). */
export const HOLLOW = {
  x: NAVE.x,
  z: NAVE.z,
  floorY: NAVE.bottomY,
  lakeTop: WATER_Y,
} as const;
/** The roof's height over world (x, z). */
export const ceilingAt = (x: number, z: number): number => {
  const d = Math.max(Math.abs(x - HOLLOW.x), Math.abs(z - HOLLOW.z));
  return NAVE.wallTopY + (NAVE.apexY - NAVE.wallTopY) * Math.max(0, 1 - d / NAVE.half);
};

/**
 * THE SHORE (Berón 2026-11-28: «todos los insectos gigantes estarían dentro de la montaña»): a band of rock floor along
 * the walls, at the lake's level, outside sanctuary 1's ring of buildings: the giant insects' ground (their flowers,
 * nests and hunts) and the Carboniferous forest; the gates' docks stand on it.
 */
export const SHORE = { inner: 520, y: 0 } as const;
/** Is world (x, z) on the shore of the hall? */
export const onShore = (x: number, z: number): boolean => {
  const d = Math.max(Math.abs(x - HOLLOW.x), Math.abs(z - HOLLOW.z));
  return d >= SHORE.inner && d < NAVE.half - 1;
};

/** The middle of the hall kept free of the buildings and their stations, from the lake to the roof (the pupa's), m. */
export const CENTRE_FREE_M = 45;
/** The inside of the hall, for whoever furnishes it (the pupa, the giant insects, the Carboniferous forest, the larvae). */
export const HOLLOW_INSIDE = {
  x: HOLLOW.x,
  z: HOLLOW.z,
  floorY: HOLLOW.floorY,
  lakeTop: HOLLOW.lakeTop,
  half: NAVE.half,
  apexY: NAVE.apexY,
  ceilingAt,
  centreFree: CENTRE_FREE_M,
} as const;
/** Is world (x, y, z) inside the hall (over its floor, under its roof)? */
export const inHollow = (x: number, y: number, z: number): boolean =>
  Math.max(Math.abs(x - HOLLOW.x), Math.abs(z - HOLLOW.z)) < NAVE.half && y >= HOLLOW.floorY - 1 && y < ceilingAt(x, z);
/** Off an island's edge she does not jump more than the highest Olympic diving platform (World Aquatics), m. */
export const ISLAND_DROP_M = 10;
/**
 * How far she lets herself fall off an edge (application/free-walk.ts `maxDrop`; edificios-y-pisos.md E13): inside the
 * hall, all the way down to the floor under her or the lake (as off sanctuary 1's floors); elsewhere, 10 m.
 */
export const dropLimit = (from: Body, _to: Body): number => (inHollow(from.x, from.y, from.z) ? Infinity : ISLAND_DROP_M);

/** A tree-building's base on the lake (sanctuary 1's BASE: 10 m of deck round the trunk), where the pupa's pier lands. */
export const GIANT = {
  deckHalf: TRUNK_HALF + TREE.wall.value + BASE.walk,
  deckY: 0,
  /** Air kept under the roof over anything that stands, m. */
  headroom: 6,
} as const;

/** The tree-buildings only sanctuary 3 has: sanctuary 1's rules, the training rooms on their floors (bottom up). */
export interface TrainingTowerDef {
  readonly id: string;
  readonly building: string;
  readonly desc: string;
  /** From the hall's middle, m (in the gap of sanctuary 1's ring, west). */
  readonly at: { readonly x: number; readonly z: number };
  readonly quarter: number;
  /** Each floor's rooms (a mixed floor holds two). */
  readonly floors: readonly (readonly string[])[];
}
export const TRAINING_TOWERS: readonly TrainingTowerDef[] = [
  { id: "astronautas", building: "Entrenamiento de astronautas", desc: "Las grandes instalaciones de la formación de astronautas, un piso de árbol cada una", at: { x: -390, z: 215 }, quarter: 0, floors: [["nbl"], ["svmf"], ["centrifuga"], ["supervivencia"]] },
  { id: "astronautas-salas", building: "Simuladores y control", desc: "Los simuladores, la robótica, el control de misión, el gimnasio y los trajes, el centro médico de selección y el criadero de insectos gigantes", at: { x: -420, z: -105 }, quarter: 1, floors: [["gimnasio", "trajes"], ["simulador-dragon", "simulador-lm"], ["robotica", "control"], ["medico"], ["crianza"]] },
];
/** The free strip round the rooms of a training floor, and between two rooms of a mixed one, m. */
const ROOM_MARGIN = 5;
const ROOM_GAP = 6;

/** The flooded Starship (Berón: «un starship relleno de agua, de modo que se puede nadar en su interior»). */
export const LAKE_STARSHIP = {
  at: { x: -200, z: 40 },
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

/** A tree-building of the hall as the rest needs it (the pupa's pier, the fauna's keep-outs). */
export interface PlacedTree {
  readonly def: { readonly id: string; readonly label: string };
  readonly x: number;
  readonly z: number;
  /** Its roof (or crown) height. */
  readonly top: number;
}

/** What a carpet flies over without keeping clear of it: the sea and the lake (it skims them, 2 m up). */
export const flownOver = (w: Water): boolean => w.id !== "mar" && w.id !== "lago-montana";
/** The world as the carpets inside the mountain plan their flights (sanctuary 1's carpetRoute). */
export function flightWorld(L: { readonly world: { readonly floors: readonly Floor[]; readonly waters: readonly Water[]; readonly solids: readonly Solid[] }; readonly hollow: HollowPlan }) {
  return { floors: L.world.floors, waters: L.world.waters.filter(flownOver), solids: L.world.solids, towers: L.hollow.towers };
}

/**
 * What a flight touches, if anything (every 1,5 m, off its two pads: the take-off and the landing are over their own
 * floor), or the roof within 2 m: a description, or undefined when it is clear.
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

/** The plan of a layout's hall. */
export const hollowPlan = (L: { readonly hollow: HollowPlan }): HollowPlan => L.hollow;

/** What the mountain's builder offers (data/layout.ts Builder). */
export interface HollowBuilder {
  floor(area: string, y: number, r: Rect, id?: string): void;
  water(w: Water): void;
  solid(s: Solid): void;
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
  readonly areas: readonly AreaDef[];
}

/** A carpet station of the hall and the way point of its pad. */
export interface HollowStation extends CarpetStation {
  readonly point: string;
}

/** A gate of the mountain: its two sides (outside on the face, inside on its dock in the hall) and their way points. */
export interface MountainGate {
  readonly id: string;
  readonly label: string;
  readonly out: { readonly x: number; readonly y: number; readonly z: number; readonly point: string };
  readonly in: { readonly x: number; readonly y: number; readonly z: number; readonly point: string };
}

export interface HollowPlan {
  readonly trees: readonly PlacedTree[];
  readonly stations: readonly HollowStation[];
  readonly towers: readonly CarpetTower[];
  /** The carpets' way over everything inside (under the roof). */
  readonly sky: number;
  /** Where the helipad of the campus is (outside, on the apron of the south gate). */
  readonly heli: { readonly x: number; readonly y: number; readonly z: number; readonly half: number };
  readonly starship: { readonly x: number; readonly z: number; readonly baseY: number; readonly k: number; readonly deck3Y: number };
  /** The bee's pupa at the middle (data/pupa-abeja.ts). */
  readonly pupa: PupaPlan;
  readonly gates: readonly MountainGate[];
  /** Sanctuary 1's buildings as built here (drawn by sanctuary 1's own scene code, adapters/three/s1-models.ts). */
  readonly s1: TowersLayout;
  /** The floors sanctuary 1's scene draws (the rest of the hall's floors are sanctuary 3's to draw). */
  readonly s1Floors: ReadonlySet<string>;
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
const overlaps = (a: Rect, b: Rect, m = 0) => a.x0 - m < b.x1 && a.x1 + m > b.x0 && a.z0 - m < b.z1 && a.z1 + m > b.z0;

/**
 * A station's lane: out along its way from `from` m off its pad, the first column of clear air from just over the lake
 * up to `top`, so a flight to any station climbs or drops in it.
 */
function laneOut(g: Grid, s: { x: number; y: number; z: number; out: { x: number; z: number } }, from: number, top: number, minLo: number): { x: number; z: number; lo: number; hi: number } {
  const o = s.out;
  const n = Math.hypot(o.x, o.z) || 1;
  for (let d = from; d < from + 160; d += 1.5) {
    const x = s.x + (o.x / n) * d;
    const z = s.z + (o.z / n) * d;
    const l = lane(g, x, z, s.y);
    if (l.lo <= Math.max(s.y + OUT_HIGH_M, HOLLOW.lakeTop + 3) && l.hi >= top - 0.5) return { ...l, lo: Math.max(l.lo, minLo) };
  }
  const l = lane(g, s.x + (o.x / n) * from, s.z + (o.z / n) * from, s.y);
  return { ...l, lo: Math.max(l.lo, minLo) };
}
/** The column of clear air at (x, z): how far down and up from a pad at y it is clear (under the roof). */
function lane(g: Grid, x: number, z: number, y: number): { x: number; z: number; lo: number; hi: number } {
  const top = ceilingAt(x, z) - 4;
  let lo = y + OUT_HIGH_M;
  while (touches(g, x, lo, z) && lo < top) lo += 1;
  while (lo - 1 >= HOLLOW.lakeTop + 3 && !touches(g, x, lo - 1, z)) lo -= 1;
  let hi = y + OUT_HIGH_M;
  while (hi + 1 <= top && !touches(g, x, hi + 1, z)) hi += 1;
  return { x, z, lo, hi };
}

/** Where the rooms of a training floor stand on its square (side by side along z, in its middle), and its side. */
function roomsOnFloor(rooms: readonly string[], size: (id: string) => RoomSize): { side: number; at: (c: { x: number; z: number }) => { id: string; x: number; z: number; rect: Rect }[] } {
  const sz = rooms.map(size);
  const depth = sz.reduce((a, s) => a + 2 * s.hz, 0) + ROOM_GAP * (rooms.length - 1);
  const width = Math.max(...sz.map((s) => 2 * s.hx));
  return {
    side: Math.max(depth, width) + 2 * ROOM_MARGIN,
    at: (c) => {
      let z = c.z - depth / 2;
      return rooms.map((id, i) => {
        const s = sz[i]!;
        const rz = z + s.hz;
        z += 2 * s.hz + ROOM_GAP;
        return { id, x: c.x, z: rz, rect: around(c.x, rz, s.hx, s.hz) };
      });
    },
  };
}

/** The tree-buildings of the hall: sanctuary 1's as they are (at their places round the middle) and the training ones. */
export function naveTowers(size: (id: string) => RoomSize, k: number): TowerSpec[] {
  const template = TOWERS[0]!;
  return [
    ...TOWERS.map((t) => ({ ...t, x: NAVE.x + t.x, z: NAVE.z + t.z })),
    ...TRAINING_TOWERS.map((t): TowerSpec => ({
      id: t.id,
      building: t.building,
      x: NAVE.x + t.at.x,
      z: NAVE.z + t.at.z,
      size: { x: 40, z: 40 },
      quarter: t.quarter,
      firstY: template.firstY,
      tipGap: template.tipGap,
      floors: t.floors.map((rooms) => ({ name: "", desc: t.desc })),
      tip: template.tip,
      source: "nuestro (Berón 2026-11-28): un edificio-árbol del santuario 1 con sus reglas, para los pisos de entrenamiento del santuario 3",
      square: Math.max(...t.floors.map((rooms) => roomsOnFloor(rooms, size).side)) / k,
    })),
  ];
}

/**
 * Builds the inside of the mountain: the hall and its lake, the gates (outside on the face, inside on their docks),
 * sanctuary 1's buildings and the training ones with their rooms (each room through `buildRoom`, which builds it and
 * carries it to its place), the campus's services on sanctuary 1's floors, the Starship, the pupa and the stations.
 */
export function buildHollow(b: HollowBuilder, k: number, size: (id: string) => RoomSize, room: (id: string) => RoomDef, buildRoom: (id: string, at: { x: number; y: number; z: number }) => void, heliHalf: number): HollowPlan {
  const H = HOLLOW;
  const N = NAVE;
  const C = BIOME_ISLAND.centre.value;
  const pt = (id: string) => b.points.find((p) => p.id === id)!;
  const setPoint = (id: string, extra: Partial<WayPoint>) => {
    const i = b.points.findIndex((p) => p.id === id);
    (b.points as WayPoint[])[i] = { ...b.points[i]!, ...extra };
  };
  // ── The hall: its lake over the whole floor, its walls (solid) ──
  const ih = N.half - 0.5;
  b.water({ id: "lago-montana", x0: H.x - ih, x1: H.x + ih, z0: H.z - ih, z1: H.z + ih, yBottom: H.floorY, yTop: H.lakeTop, area: "entrenamiento:lago" });
  for (const [x0, x1, z0, z1] of [[-N.half - 4, N.half + 4, -N.half - 4, -N.half], [-N.half - 4, N.half + 4, N.half, N.half + 4], [-N.half - 4, -N.half, -N.half, N.half], [N.half, N.half + 4, -N.half, N.half]] as const)
    b.solid({ x0: H.x + x0, x1: H.x + x1, z0: H.z + z0, z1: H.z + z1, y0: H.floorY - 1, y1: N.apexY });

  // ── The shore along the walls (the insects' ground): four strips of rock floor at the lake's level ──
  const si = SHORE.inner;
  const so = N.half - 1;
  for (const [x0, x1, z0, z1] of [[-so, so, -so, -si], [-so, so, si, so], [-so, -si, -si, si], [si, so, -si, si]] as const) {
    const r = { x0: H.x + x0, x1: H.x + x1, z0: H.z + z0, z1: H.z + z1 };
    b.floor("entrenamiento:orilla", SHORE.y, r);
    b.block("orilla", { ...r, y0: H.floorY, y1: SHORE.y - 0.02 }, false);
  }

  // ── The tree-buildings: sanctuary 1's as they are, and the training ones (rooms carried onto their free floors) ──
  const specs = naveTowers(size, k);
  const TL = buildTowers(specs, k, undefined, { sky: N.skyY });
  const placed = new Map<string, { id: string; x: number; z: number; rect: Rect }[]>();
  for (const t of TRAINING_TOWERS)
    t.floors.forEach((rooms, i) => {
      const area = `${t.id}:piso-${i + 1}`;
      const slab = TL.world.floors.find((f) => f.id === area);
      if (!slab) return;
      placed.set(area, roomsOnFloor(rooms, size).at({ x: (slab.x0 + slab.x1) / 2, z: (slab.z0 + slab.z1) / 2 }));
    });
  const s1Floors = new Set<string>();
  for (const f of TL.world.floors) {
    const rooms = placed.get(f.id);
    const pieces = rooms ? subtractAll(f, rooms.map((r) => r.rect)) : [f];
    pieces.forEach((q, i) => {
      const id = pieces.length > 1 || rooms ? `${f.id}~${i}` : f.id;
      b.floor(f.area, f.y, { x0: q.x0, x1: q.x1, z0: q.z0, z1: q.z1 }, id);
      s1Floors.add(id);
    });
  }
  for (const w of TL.world.waters) b.water(w);
  for (const s of TL.world.solids) b.solid(s);
  const towerLabel = new Map(TL.towers.map((t) => [t.id, t.building]));
  const holes: { y: number; rect: Rect }[] = [];
  for (const [area, rooms] of placed) {
    const y = TL.areas.find((a) => a.id === area)!.y;
    for (const r of rooms) {
      buildRoom(r.id, { x: r.x, y, z: r.z });
      holes.push({ y, rect: r.rect });
    }
  }
  // As sanctuary 1's scene draws them: the training floors' slabs open where a room stands (its pool goes down).
  const s1Drawn: TowersLayout = {
    ...TL,
    towers: TL.towers.map((t) => ({
      ...t,
      floors: t.floors.flatMap((f) => {
        const hs = holes.filter((h) => Math.abs(h.y - f.y) < 0.05 && overlaps(h.rect, f.rect)).map((h) => h.rect);
        return hs.length ? subtractAll(f.rect, hs).map((rect) => ({ ...f, rect })) : [f];
      }),
    })),
  };

  // The ways across a floor (domain/floor-way.ts): round the furniture standing on it, never through it.
  let wn = 0;
  const level = (y: number, box: Rect) => ({
    floors: b.floors.filter((f) => Math.abs(f.y - y) < 0.05 && overlaps(f, box, 3)),
    things: b.solids.filter((s) => s.y0 < y + 1.6 && s.y1 > y + 0.3 && overlaps(s, box, 3)),
  });
  /** Joins two points of a floor by the way round its things (the intermediate corners as points). */
  const walkWay = (prefix: string, from: string, to: string, box: Rect): boolean => {
    const a = pt(from);
    const c = pt(to);
    const lv = level(a.y, box);
    const w = floorWay(lv.floors, lv.things, a, c);
    if (!w) return false;
    let prev = from;
    for (const q of w.slice(1, -1)) {
      const id = b.point(`${prefix}:paso-${wn++}`, q.x, a.y, q.z);
      b.link(prev, id);
      prev = id;
    }
    b.link(prev, to);
    return true;
  };
  /** From a point of a floor to the free spot nearest to a thing: the way's points, and the spot's id. */
  const walkNear = (prefix: string, from: string, to: { x: number; z: number }, endId: string, box: Rect): string | undefined => {
    const a = pt(from);
    const lv = level(a.y, box);
    const w = floorWay(lv.floors, lv.things, a, to, { near: 3 });
    if (!w) return undefined;
    let prev = from;
    for (const q of w.slice(1, -1)) {
      const id = b.point(`${prefix}:paso-${wn++}`, q.x, a.y, q.z);
      b.link(prev, id);
      prev = id;
    }
    const e = w.at(-1)!;
    b.point(endId, e.x, a.y, e.z);
    b.link(prev, endId);
    return endId;
  };
  const areaBox = (area: string): Rect | undefined => {
    const fs = b.floors.filter((f) => f.area === area);
    if (!fs.length) return undefined;
    return { x0: Math.min(...fs.map((f) => f.x0)), x1: Math.max(...fs.map((f) => f.x1)), z0: Math.min(...fs.map((f) => f.z0)), z1: Math.max(...fs.map((f) => f.z1)) };
  };

  // Each station's pad is a way point of the graph.
  const stationsDraft: (CarpetStation & { point: string })[] = TL.carpets.map((st) => {
    const point = b.point(`${st.area}:estacion`, st.x, st.y, st.z, undefined, st.id);
    return { ...st, point };
  });
  const stationOf = (area: string) => stationsDraft.find((s) => s.area === area && s.kind !== "pie");

  // The bases on the lake: a ring of way points round each trunk, the foot's station joined to it.
  const trees: PlacedTree[] = TL.towers.map((t) => ({ def: { id: t.id, label: t.building }, x: t.x, z: t.z, top: t.cima ? t.cima.y : t.rootHeight }));
  for (const t of TL.towers) {
    const r = GIANT.deckHalf - 2.5;
    const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => b.point(`entrenamiento:${t.id}:pie:anillo-${i}`, t.x + sx! * r, 0, t.z + sz! * r));
    b.link(...ring, ring[0]!);
    const foot = stationsDraft.find((s) => s.tower === t.id && s.kind === "pie");
    if (foot) {
      const near = [...ring].sort((p, q) => Math.hypot(pt(p).x - foot.x, pt(p).z - foot.z) - Math.hypot(pt(q).x - foot.x, pt(q).z - foot.z))[0]!;
      const box = { x0: Math.min(t.base.x0, foot.x - 8), x1: Math.max(t.base.x1, foot.x + 8), z0: Math.min(t.base.z0, foot.z - 8), z1: Math.max(t.base.z1, foot.z + 8) };
      if (!walkWay(`entrenamiento:${t.id}:pie`, foot.point, near, box)) b.link(foot.point, near);
    }
    b.area({ id: `entrenamiento:${t.id}:pie`, island: "entrenamiento", label: `Base de ${t.building}`, desc: `La base negra de ${t.building} en el lago de la nave, con su estación de alfombras: vuela a cualquier estación de la montaña`, reality: "ficcion", centre: { x: t.x, y: 1, z: t.z }, half: { x: GIANT.deckHalf, y: 1, z: GIANT.deckHalf }, point: foot?.point ?? ring[0]!, floorY: 0, tower: { id: t.id, label: t.building } });
  }

  // Sanctuary 1's floors, rings and crowns in Áreas (each by its own station), and the training floors with their rooms.
  for (const a of TL.areas) {
    if (!a.entry) continue;
    const st = stationOf(a.id);
    const box = areaBox(a.id);
    if (!st || !box) continue;
    const building = towerLabel.get(a.link?.tower ?? a.id.split(":")[0]!) ?? a.building ?? "";
    const rooms = placed.get(a.id);
    const names = rooms?.map((r) => room(r.id).label).join(" y ");
    b.area({
      id: a.id,
      island: "entrenamiento",
      label: rooms ? `${building} · piso ${a.id.split("piso-")[1]}` : a.label,
      desc: rooms ? `Piso de árbol a ${Math.round(a.y - H.lakeTop)} m sobre el lago: ${names}` : `${a.desc} (${building}, del santuario 1 tal cual; a ${Math.round(a.y - H.lakeTop)} m sobre el lago)`,
      reality: "ficcion",
      centre: { x: (box.x0 + box.x1) / 2, y: a.y + 1, z: (box.z0 + box.z1) / 2 },
      half: { x: (box.x1 - box.x0) / 2, y: 1, z: (box.z1 - box.z0) / 2 },
      point: st.point,
      floorY: a.y,
      tower: { id: a.link?.tower ?? a.id.split(":")[0]!, label: building },
    });
    for (const r of rooms ?? []) {
      walkWay(a.id, st.point, `entrenamiento:${r.id}:fuera`, box);
      const i = b.areas.findIndex((q) => q.id === `entrenamiento:${r.id}`);
      if (i >= 0) (b.areas as AreaDef[])[i] = { ...b.areas[i]!, floorY: a.y, tower: { id: a.link!.tower, label: building } };
      for (const q of b.areas) if (q.id.startsWith(`entrenamiento:${r.id}-`) && !q.tower) (b.areas as AreaDef[])[b.areas.indexOf(q)] = { ...q, tower: { id: a.link!.tower, label: building } };
    }
  }

  // ── The campus's services on sanctuary 1's floors, at its furniture (data/campus.ts CAMPUS_IN_S1) ──
  const used = new Set<number>();
  for (const [rid, cfg] of Object.entries(CAMPUS_IN_S1)) {
    const r = room(rid);
    const st = stationOf(cfg.area);
    const box = areaBox(cfg.area);
    const s1Area = TL.areas.find((a) => a.id === cfg.area);
    if (!st || !box || !s1Area) continue;
    const roomArea = `entrenamiento:${rid}`;
    let first: { x: number; z: number; point: string } | undefined;
    for (const m of r.machines) {
      const model = cfg.at[m.id];
      if (!model) continue;
      // The piece on the floor's own level, nearest its station (a free bunk for her bed).
      const cands = TL.instances
        .map((it, i) => ({ it, i }))
        .filter(({ it, i }) => it.area === cfg.area && it.model === model && !used.has(i) && Math.abs(it.y - st.y) < 0.1)
        .sort((p, q) => Number(q.it.name?.startsWith("Aposento libre") ?? false) - Number(p.it.name?.startsWith("Aposento libre") ?? false) || Math.hypot(p.it.x - st.x, p.it.z - st.z) - Math.hypot(q.it.x - st.x, q.it.z - st.z));
      for (const { it, i } of cands) {
        const endId = first ? `${roomArea}:${m.id}` : `${roomArea}:dentro`;
        const end = walkNear(roomArea, st.point, it, endId, box);
        if (!end) continue;
        used.add(i);
        const e = pt(end);
        const c = Math.cos(it.rot);
        const s = Math.sin(it.rot);
        const turn = (dx: number, dz: number) => ({ x: it.x + dx * c + dz * s, z: it.z - dx * s + dz * c });
        // A bunk of the crown's aposentos (as sanctuary 1's staff lie: data/jornada.ts), a chair at a table.
        const seat = m.kind === "cama" ? { ...turn(-3.95, 2.3), y: it.y + 0.85, yaw: it.rot + Math.PI } : m.kind === "comedor" ? { ...turn(0, 0.9), y: it.y, yaw: it.rot + Math.PI } : undefined;
        b.machine({ id: m.id, kind: m.kind, island: "entrenamiento", area: roomArea, label: m.label, what: m.what, x: e.x, y: e.y, z: e.z, ...(m.reto ? { reto: m.reto } : {}), ...(m.post ? { post: m.post } : {}), ...(seat ? { seat } : {}) }, end);
        first ??= { x: e.x, z: e.z, point: end };
        break;
      }
    }
    if (!first) continue;
    b.area({ id: roomArea, island: "entrenamiento", label: r.label, desc: `En ${s1Area.label.toLowerCase()} de ${towerLabel.get(st.tower) ?? st.building}, el piso del santuario 1 que lo hace, tal cual: ${r.machines.map((m) => m.what.split(":")[0]!.toLowerCase()).join("; ")}`, reality: "real", centre: { x: first.x, y: st.y + 1.5, z: first.z }, half: { x: 4, y: 1.5, z: 4 }, point: first.point, floorY: st.y, tower: { id: st.tower, label: towerLabel.get(st.tower) ?? st.building } });
  }

  // ── The gates: steel doors on the mountain's south face; each opens on its dock inside the hall ──
  const gateList: MountainGate[] = [];
  const own: { id: string; area: string; tower: string; building: string; label: string; x: number; y: number; z: number; out: { x: number; z: number }; point: string; off: number }[] = [];
  for (const g of gates()) {
    const area = `entrenamiento:compuerta-${g.id}`;
    const x = C.x + g.x;
    const z = C.z + g.z;
    const half = GATE_HALF_M;
    // Outside: its sill at the ground before it, and the steel leaf in the face (it stops her: she goes through it with
    // the orange button «Entrar»).
    const gy = heightAt(MOUNTAIN.value, g.x, g.z - 4) + 0.02;
    b.floor(area, gy, { x0: x - half, x1: x + half, z0: z - 8, z1: z + 1 });
    b.block("suelo-cueva", { x0: x - half, x1: x + half, z0: z - 8, z1: z + 1, y0: gy - 3, y1: gy - 0.02 }, false);
    b.block("compuerta", { x0: x - half, x1: x + half, z0: z + 1, z1: z + 2.2, y0: gy - 0.02, y1: gy + GATE_H_M });
    for (const s of [-1, 1]) b.block("marco-compuerta", { x0: x + s * half - 1.2, x1: x + s * half + 1.2, z0: z + 0.6, z1: z + 2.6, y0: gy - 1, y1: gy + GATE_H_M + 1.5 }, false);
    b.block("marco-compuerta", { x0: x - half - 1.2, x1: x + half + 1.2, z0: z + 0.6, z1: z + 2.6, y0: gy + GATE_H_M, y1: gy + GATE_H_M + 1.5 }, false);
    const outP = b.point(`${area}:fuera`, x, gy, z - 1.5);
    setPoint(outP, { gate: g.id });
    const boca = b.point(`${area}:boca`, x, gy, z - 6);
    b.link(boca, outP);
    b.area({ id: area, island: "entrenamiento", label: g.label, desc: `Una compuerta de acero de ${Math.round(2 * half)} × ${Math.round(GATE_H_M)} m en la cara sur de la montaña, a la medida del mayor insecto gigante: por ella se pasa a la nave excavada dentro (otra escena)`, reality: "ficcion", centre: { x, y: gy + GATE_H_M / 2, z: z - 3 }, half: { x: half, y: GATE_H_M / 2, z: 5 }, point: boca });
    // Inside: the same gate in the hall's south wall (its place along the wall as on the face), a dock on the lake and
    // its carpet station.
    const ix = H.x + ((g.x - CORE_DEF.x) / CORE_DEF.half) * (N.half * 0.46);
    const wall = H.z - N.half;
    const dock = { x0: ix - half - 4, x1: ix + half + 4, z0: wall, z1: wall + 34 };
    const dArea = `${area}:muelle`;
    b.floor(dArea, 0, dock);
    b.block("muelle-compuerta", { ...dock, y0: H.floorY, y1: -0.02 }, false);
    b.block("compuerta", { x0: ix - half, x1: ix + half, z0: wall - 1.2, z1: wall + 0.2, y0: 0, y1: GATE_H_M }, false);
    const inP = b.point(`${dArea}:dentro`, ix, 0, wall + 2.5);
    setPoint(inP, { gate: g.id });
    b.link(outP, inP);
    const pad = { x: ix, z: dock.z1 - STATION_PAD.z / 2 - 2 };
    const padP = b.point(`${dArea}:estacion`, pad.x, 0, pad.z);
    if (!walkWay(dArea, inP, padP, dock)) b.link(inP, padP);
    b.area({ id: dArea, island: "entrenamiento", label: `${g.label} (dentro)`, desc: `El muelle de la ${g.label.toLowerCase()} en el lago de la nave, con su estación de alfombras: vuela directo a cualquier edificio`, reality: "ficcion", centre: { x: ix, y: 1, z: (dock.z0 + dock.z1) / 2 }, half: { x: (dock.x1 - dock.x0) / 2, y: 1, z: (dock.z1 - dock.z0) / 2 }, point: padP, floorY: 0 });
    gateList.push({ id: g.id, label: g.label, out: { x, y: gy, z: z - 1.5, point: outP }, in: { x: ix, y: 0, z: wall + 2.5, point: inP } });
    own.push({ id: `${dArea}:alfombras`, area: dArea, tower: `compuerta-${g.id}`, building: g.label, label: g.label, x: pad.x, y: 0, z: pad.z, out: { x: 0, z: 1 }, point: padP, off: 8 });
  }

  // ── The flooded Starship, standing on the lake's bottom ──
  const ss = LAKE_STARSHIP;
  const sx = H.x + ss.at.x;
  const sz = H.z + ss.at.z;
  const R = ss.radiusM * k;
  const deck3Y = H.floorY + ss.crewDeckM * k;
  const plan = scaleInteriorPlan(starshipInteriorPlan(), k);
  const base = { x: sx, y: deck3Y + plan.volumes.find((v) => v.id === "cubierta-3")!.half.y, z: sz };
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
  b.props.push({ kind: "lake-starship", x: sx, y: H.floorY, z: sz, size: { x: 2 * R, y: ss.heightM * k, z: 2 * R }, label: "Starship inundado" });
  const top = H.floorY + ss.heightM * k * 0.82;
  const hull = (x0: number, x1: number, z0: number, z1: number, y0: number = H.floorY, y1: number = top) => b.block("oculto", { x0, x1, z0, z1, y0, y1 });
  hull(sx - R, sx + R, sz + R - 1.2, sz + R);
  hull(sx - R, sx - R + 1.2, sz - R, sz + R);
  hull(sx + R - 1.2, sx + R, sz - R, sz + R);
  hull(sx - R, sx - 1.4, sz - R, sz - R + 1.2);
  hull(sx + 1.4, sx + R, sz - R, sz - R + 1.2);
  hull(sx - 1.4, sx + 1.4, sz - R, sz - R + 1.2, H.floorY, lockFloor);
  hull(sx - 1.4, sx + 1.4, sz - R, sz - R + 1.2, lockFloor + 2.6, top);
  const lockIn = b.point("entrenamiento:starship:esclusa:dentro", sx, lockFloor + 0.4, d3c.z - d3.half.z - 0.5);
  const gangIn = b.point("entrenamiento:starship:pasarela:puerta", sx, gangY, lockZ0 - 0.6);
  const gangPad = { x: sx, z: gang.z0 + STATION_PAD.z / 2 + 1.5 };
  const gangP = b.point("entrenamiento:starship:pasarela:estacion", gangPad.x, gangY, gangPad.z);
  b.link(gangP, gangIn, lockIn, "entrenamiento:starship:cubierta-3:centro");
  for (const [lower, upper] of [["cubierta-3", "escotilla-3-2"], ["escotilla-3-2", "cubierta-2"], ["cubierta-2", "escotilla-2-1"], ["escotilla-2-1", "cubierta-1"]] as const) b.link(`entrenamiento:starship:${lower}:centro`, `entrenamiento:starship:${upper}:centro`);
  for (const v of plan.volumes) {
    if (!v.id.startsWith("camarote")) continue;
    const door = plan.volumes.find((q) => q.id !== v.id && q.id.endsWith(v.id));
    b.link("entrenamiento:starship:cubierta-2:centro", ...(door ? [`entrenamiento:starship:${door.id}:centro`] : []), `entrenamiento:starship:${v.id}:centro`);
  }
  b.area({ id: "entrenamiento:starship:pasarela", island: "entrenamiento", label: "Starship inundado · pasarela", desc: "Una Starship de pie en el fondo del lago, llena de agua hasta la proa: por la pasarela se llega a su esclusa abierta y se entra nadando a visitar cada cubierta", reality: "ficcion", centre: { x: sx, y: gangY + 1, z: (gang.z0 + gang.z1) / 2 }, half: { x: 5, y: 1, z: 8 }, point: gangP });
  own.push({ id: "entrenamiento:starship:alfombras", area: "entrenamiento:starship:pasarela", tower: "starship", building: "Starship inundado", label: "Starship", x: gangPad.x, y: gangY, z: gangPad.z, out: { x: 0, z: -1 }, point: gangP, off: 8 });

  // ── The bee's pupa at the hall's middle, in the room the buildings leave (data/pupa-abeja.ts) ──
  const pupa = buildPupa(b, trees);

  // ── The stations of the gates and the Starship: their lanes, found from what was built ──
  const g = new Grid(obstaclesOf({ floors: b.floors, waters: b.waters.filter(flownOver), solids: b.solids }));
  for (const s of own) {
    const ln = laneOut(g, s, s.off + 2, N.skyY, s.y + 5.5);
    setPoint(s.point, { carpet: s.id });
    stationsDraft.push({ id: s.id, area: s.area, tower: s.tower, building: s.building, kind: "pie", label: s.label, x: s.x, y: s.y, z: s.z, out: s.out, reach: "santuario", lane: ln, point: s.point });
  }
  const stations: HollowStation[] = stationsDraft;
  // The carpet links: a floor's station to the other stations of its building; the gates', feet's, crowns' and the
  // Starship's to every station, straight (each flight is planned when it is flown: one route a trip).
  for (let i = 0; i < stations.length; i++)
    for (let j = i + 1; j < stations.length; j++) {
      const a = stations[i]!;
      const c = stations[j]!;
      if (a.tower === c.tower || a.reach === "santuario" || c.reach === "santuario") b.link(a.point, c.point);
    }
  const towers: CarpetTower[] = [...TL.towers.map((t) => ({ id: t.id, x: t.x, z: t.z, rootHeight: t.rootHeight })), { id: "starship", x: sx, z: sz, rootHeight: H.floorY + ss.heightM * k }, ...own.filter((s) => s.tower !== "starship").map((s) => ({ id: s.tower, x: s.x, z: s.z, rootHeight: s.y }))];

  const firstDock = gateList[0]!.in.point;
  b.area({ id: "entrenamiento:lago", island: "entrenamiento", label: "Lago de la nave", desc: "El suelo de la nave excavada en la montaña, 40 m bajo el nivel del mar: un lago tan hondo como el mar del santuario 1, de agua clara; la luz viene de todas partes, sin sombras", reality: "ficcion", centre: { x: H.x, y: H.floorY / 2, z: H.z }, half: { x: ih, y: -H.floorY / 2, z: ih }, point: firstDock });
  b.area({ id: "entrenamiento:orilla", island: "entrenamiento", label: "Orilla de la nave", desc: "La franja de roca al pie de los muros, al nivel del lago: el suelo de los insectos gigantes de Gilgit-Baltistán (×400) y el bosque del Carbonífero; en ella atracan las compuertas", reality: "ficcion", centre: { x: H.x, y: 1, z: H.z - (si + so) / 2 }, half: { x: so, y: 1, z: (so - si) / 2 }, point: firstDock });
  b.area({ id: "entrenamiento:montana", island: "entrenamiento", label: "Nave de la montaña", desc: `La nave excavada dentro de la montaña (${Math.round(2 * N.half)} m de lado y ${Math.round(N.apexY - N.bottomY)} m del fondo al techo): los edificios-árbol del santuario 1 tal cual, los del entrenamiento de astronautas, la pupa de la abeja en el centro y los insectos gigantes`, reality: "ficcion", centre: { x: H.x, y: N.apexY / 2, z: H.z }, half: { x: ih, y: N.apexY / 2, z: ih }, point: firstDock });

  // ── The campus's helipad: outside, on the apron of the south gate ──
  const sur = gates()[0]!;
  const heli = { x: C.x + sur.x, y: heightAt(MOUNTAIN.value, sur.x, sur.z - APRON_M) + 0.05, z: C.z + sur.z - APRON_M, half: heliHalf };
  return { trees, stations, towers, sky: N.skyY, heli, pupa, gates: gateList, s1: s1Drawn, s1Floors, starship: { x: sx, z: sz, baseY: H.floorY, k, deck3Y } };
}
