import { TREE } from "@modules/aerial-sanctuary/data/facts";
import { carpetStations, STATION_PAD, type CarpetStation } from "./alfombras";
import { ORCHARD_BRANCH, TRUNK_HALF } from "./paso";
import type { Floor, Rect, Solid, Water, WalkWorld } from "@modules/aerial-sanctuary/domain/walk";
import { wallWithGaps } from "@modules/aerial-sanctuary/domain/walk";
import { BASE, CAP_NAME, LOBES, MAP_HALF, NESTS, SEA, onMovedCap, SPECIES_MODEL, STAFF, TOWERS, WATER_Y, capOf, isLand, lobeRadius, type TowerSpec } from "./site";
import { FLOOR_PLANS, type FloorPlan } from "./floors";
import { FLOOR_SIZE } from "./floors/kit";
import { GLOBE, globeCell, globeTopAt, layerBoxes } from "./globo";
import { EGG } from "../domain/pulpo";
import { RING } from "./floors/kit";
import { bedTip, orchardTip } from "./floors/puntas";
import { DRIFT, landscape } from "./paisaje";
import { model, type ModelDef, type Part } from "./catalog";
import { OVERRIDES, resolve, spacing, type Overrides } from "./overrides";
import { GROUPS, plan, split } from "../domain/population";
import { ageInGroup, ageLabel, sizeAt } from "../domain/life-cycle";
import { hash01, type Waypoint } from "../domain/motion";
import { LIFE_CYCLES } from "./ciclos-de-vida";
import { ARENA_Y, arenaRects, CASTILLOS, CROWN, type P3, type TeamId } from "./castillos";
import { CIMA_RESIDENCIA } from "./floors/residencia-cima";

/**
 * Sanctuary 1 as the scene and the walk see it (docs/design/santuario1.md): the caps of ice and the land island as
 * floors, the sea and the trunks of the tree-buildings as water (she swims up a trunk from floor to floor, Cold
 * Sanctuary's magic), the trunks' acrylic walls with their doors as solids, and every placed model as an instance of
 * the catalogue. Plan x, z in metres (Cold Sanctuary's coordinates); y up from the ice.
 *
 * «Escala de interiores» (`k`, reglas.md §2.4) widens each tower's floors and what stands on them on the plan, about
 * the floor's centre; heights stay true and the caps, trunks and towers keep their places.
 */
export interface Instance {
  readonly model: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rot: number;
  readonly area: string;
  readonly name?: string;
  /** Widening on the plan (furniture of a widened floor). */
  readonly plan?: number;
  /** Uniform scale and colour set by a bulk rule (overrides.ts). */
  readonly scale?: number;
  readonly tint?: number;
  /** An animal's territory: it wanders inside (domain/motion.ts wanderAt) at `speed` m/s. */
  readonly wander?: { readonly x: number; readonly z: number; readonly r: number; readonly speed: number; readonly seed: number; readonly climb?: { readonly y0: number; readonly y1: number } };
  /**
   * A wild animal's life (domain/life-cycle.ts): its species (data/ciclos-de-vida.ts, data/etograma.ts), the game day it
   * was born (negative: before the game began), its mother (index in `instances`, for the young) and its day of birth
   * within the season.
   */
  readonly life?: { readonly species: string; readonly born: number; readonly mother?: number; readonly offset: number };
}

export interface S1Area {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  readonly building?: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Ported in full detail, partly, or still empty (docs/design/santuario1.md §Estado). */
  readonly detail: "completo" | "vacio";
  /** For a floor: where she stands outside its door, and the yaw looking in. */
  readonly entry?: { readonly x: number; readonly z: number; readonly yaw: number };
  /** The floor plan it is furnished with (site.ts `furnish`). */
  readonly furnish?: string;
  /** A tower floor's way to its trunk: the tower, and the point inside the trunk's water at its door. */
  readonly link?: { readonly tower: string; readonly inner: { readonly x: number; readonly z: number } };
}

/** A point in the world, m. */
export type Point3 = { readonly x: number; readonly y: number; readonly z: number };

/** A tree's crown floor as drawn: its square, the garden band, the pillow ring and the castles. World coordinates. */
export interface CrownShape {
  readonly area: string;
  readonly y: number;
  readonly rect: Rect;
  readonly arena: readonly Rect[];
  readonly castles: readonly {
    readonly team: TeamId;
    readonly name: string;
    readonly color: number;
    readonly decks: readonly (Rect & { readonly y: number; readonly kind: string; readonly ladder?: Rect })[];
    readonly rails: readonly Solid[];
    readonly columns: readonly Solid[];
    readonly slides: readonly (readonly Point3[])[];
    readonly treasure: Point3;
    readonly rect: Rect;
    /** The tower's top deck (its roof is drawn over it). */
    readonly tower: Rect & { readonly y: number };
  }[];
}

export interface TowerShape {
  readonly id: string;
  readonly building: string;
  readonly x: number;
  readonly z: number;
  readonly rootHeight: number;
  readonly floors: readonly { readonly rect: Rect; readonly y: number; readonly name: string }[];
  readonly tips: readonly { readonly rect: Rect; readonly y: number }[];
  /** The floors' U rings (their four decks). */
  readonly rings: readonly { readonly rects: readonly Rect[]; readonly y: number }[];
  /** The wooden frame (FRAME): the trunk's corner posts and a beam round it at each level, and the edges of each branch. Drawn, never solid. */
  readonly frame: readonly Solid[];
  /**
   * The floors' braces (Berón 2026-11-21: «el piso debería ser levantado por columnas diagonales que las apoyen en el
   * tronco»): two wooden struts under each floor, from the trunk's face up to the floor's underside. World points.
   */
  readonly braces: readonly { readonly foot: Point3; readonly head: Point3 }[];
  /** Its crown's giant floor (castillos.ts), in world coordinates, if it has one. */
  readonly cima?: CrownShape;
  /** Its base at sea (BASE): the deck's outer edge (the trunk's hole in the middle). */
  readonly base: Rect;
  /** The ground door: outside on its base, and inside in the trunk's water. */
  readonly ground: { readonly out: { readonly x: number; readonly z: number }; readonly inner: { readonly x: number; readonly z: number } };
}

export interface S1Layout {
  readonly k: number;
  readonly world: WalkWorld;
  readonly instances: readonly Instance[];
  readonly areas: readonly S1Area[];
  readonly towers: readonly TowerShape[];
  /** Acrylic of the trunks (drawn as glass). */
  readonly walls: readonly Solid[];
  readonly start: { readonly x: number; readonly y: number; readonly z: number; readonly yaw: number };
  /** The work submarine's dive (Berón: «el submarino puede subir por los troncos»): its instance and its way out. */
  readonly submarine?: { readonly index: number; readonly route: readonly Waypoint[] };
  /** The drifting iceberg (Icebergs.cs driftA → driftB at 0,2 m/s): its instance, its solid and the visitors swimming off it. */
  /** The flying-carpet stations: one on every floor and ring, each crown and each foot (alfombras.ts). */
  readonly carpets: readonly CarpetStation[];
  readonly drift?: { readonly index: number; readonly visitors: readonly number[]; readonly a: { x: number; z: number }; readonly b: { x: number; z: number } };
}

const R = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
const around = (x: number, z: number, hx: number, hz = hx): Rect => R(x - hx, x + hx, z - hz, z + hz);

/** A point of a side's frame turned into the tower's frame (side 0: as is; each side a quarter turn). */
export function side(s: number, x: number, z: number): { x: number; z: number } {
  switch (((s % 4) + 4) % 4) {
    case 0:
      return { x, z };
    case 1:
      return { x: z, z: -x };
    case 2:
      return { x: -x, z: -z };
    default:
      return { x: -z, z: x };
  }
}
const sideRect = (s: number, x0: number, x1: number, z0: number, z1: number, o: { x: number; z: number }): Rect => {
  const a = side(s, x0, z0);
  const b = side(s, x1, z1);
  return R(a.x + o.x, b.x + o.x, a.z + o.z, b.z + o.z);
};

/** Ground cells: the caps rasterised (Cold Sanctuary uses 2,5 m; 5 m keeps the walk world small), merged in runs per row. */
const CELL = 5;

function groundFloors(): Floor[] {
  const out: Floor[] = [];
  for (let z = -MAP_HALF; z < MAP_HALF; z += CELL) {
    let run: { x0: number; area: string } | undefined;
    const flush = (x1: number) => {
      if (run) out.push({ id: `g${out.length}`, x0: run.x0, x1, z0: z, z1: z + CELL, y: 0, area: run.area });
      run = undefined;
    };
    for (let x = -MAP_HALF; x < MAP_HALF; x += CELL) {
      const cx = x + CELL / 2;
      const cz = z + CELL / 2;
      let area: string | undefined;
      LOBES.forEach((l, i) => {
        if (area || l.r <= 0) return;
        if (Math.hypot(cx - l.x, cz - l.z) <= lobeRadius(l, i, cx, cz)) area = `${isLand(l) ? "tierra" : "hielo"}:${capOf(l)}`;
      });
      if (area !== run?.area) {
        flush(x);
        if (area) run = { x0: x, area };
      }
    }
    flush(MAP_HALF);
  }
  return out;
}

interface Built {
  o: Overrides;
  /** The wooden grid's spacing, m (FRAME.grid, the «Rejilla de madera» setting); 0: only the corners and the levels. */
  grid: number;
  /** The orchards' expert room is placed (in the first orchard tip of Servicios). */
  expertRoom?: boolean;
  floors: Floor[];
  waters: Water[];
  solids: Solid[];
  walls: Solid[];
  instances: Instance[];
  areas: S1Area[];
  towers: TowerShape[];
}

/** How deep a trunk's root goes into the sea under the ice, m (ours: Cold Sanctuary's ends at −1,6 m). */
export const TRUNK_ROOT_Y = -12;

/** Whether a water is a tree-building's (its trunk or a branch), not the sea's. */
/** Clear water (the trees' and the globe's): seen through like filtered water, and its current carries her. */
export const treeWater = (area: string) => /:(tronco|rama)/.test(area) || area === "mar:globo";
/**
 * How much faster she swims in a tree's water (Berón 2026-11-20: «los viajes se alargan mucho entre rama y rama»):
 * ours, its pumps keep a current along the trunk and the branches that carries her (×3: 6,6 m/s, 9 m/s crawling).
 */
export const TREE_CURRENT = 3;

/**
 * Two floors to a level, on opposite sides of the trunk, pinwheeling level after level so none is over the next one
 * (Cold Sanctuary's HelixTower). Every floor grows straight out of the trunk (Berón 2026-11-21: «los pisos solo nacen del
 * tronco, las ramas quedan para los anillos frutales»); the other two sides of each level carry the orchard tips.
 */
export const FLOORS_PER_LEVEL = 2;

/** A tree's square, m (k = 1): every floor's, the kitchen's (floors/kit.ts FLOOR_SIZE, Berón 2026-11-22). */
export function towerSquare(t: Pick<TowerSpec, "floors">): number {
  let s = Math.max(FLOOR_SIZE.x, FLOOR_SIZE.z);
  for (const f of t.floors) {
    const fp = f.furnish ? FLOOR_PLANS.get(f.furnish) : undefined;
    if (fp) s = Math.max(s, fp.size.x, fp.size.z);
  }
  return s;
}

/** The wooden frame of a tree (Berón 2026-11-21: «columnas para el tronco y ramas… para que las personas puedan orientarse fácilmente cuando nadan»): thin posts and beams, m. Ours. */
export const FRAME = {
  beam: 0.3,
  /**
   * The grid (Berón 2026-11-22: «¿puedes agregar más columnas de madera? como una rejilla… cada 4… quizás puede ir por
   * setting para irlo ajustando fácilmente»): a post and a beam every this many metres on the trunk's faces, and a ring
   * round each branch as often. The default of the «Rejilla de madera» setting.
   */
  grid: 4,
} as const;

/** One tree-building (Cold Sanctuary's HelixTower): the trunk, its doors, the floors pinwheeling round it and the tips at the end of their branches. */
function buildTower(b: Built, t: TowerSpec, k: number): void {
  const WH = TRUNK_HALF;
  const OH = WH + TREE.wall.value;
  const gap = TREE.levelGap.value;
  const FS = towerSquare(t) * k;
  const door = TREE.door.value;
  const levels = Math.max(1, Math.ceil(t.floors.length / FLOORS_PER_LEVEL));
  const levelY = (l: number) => t.firstY + (l - 1) * gap;
  const tipY = (l: number) => levelY(l) + TREE.tipRise.value;
  const rootHeight = levelY(levels) + TREE.tipRise.value + TREE.ringH.value + 7;
  const o = { x: t.x, z: t.z };
  const S = (s: number) => s + t.quarter;
  const trunk = `${t.id}:tronco`;
  // Open to the sea under the ice (Berón 2026-11-19: «los edificios árboles son de agua y están conectados al mar»):
  // its root goes 12 m down, into the sea, so seals, fish and the submarine come up it; nothing inside is a floor.
  b.waters.push({ id: `${t.id}-tronco`, ...around(o.x, o.z, WH), yBottom: TRUNK_ROOT_Y, yTop: rootHeight - 0.5, area: trunk, open: true });
  b.areas.push({ id: trunk, label: `Tronco de agua (${t.building})`, desc: "Se nada por dentro de piso a piso (ficción de Cold Sanctuary)", building: t.building, x: o.x, y: 0, z: o.z, detail: "completo" });
  const gapsOf: { from: number; to: number; y0: number; y1: number }[][] = [[], [], [], []];
  // Ground door (Cold Sanctuary: GroundSide a = +Z), onto the ice, with its threshold.
  gapsOf[0]!.push({ from: door.x - door.w / 2, to: door.x + door.w / 2, y0: 0, y1: door.h });
  b.floors.push({ id: `${t.id}-umbral-suelo`, ...sideRect(S(0), door.x - door.w / 2, door.x + door.w / 2, WH - 0.6, OH + 0.4, o), y: 0, area: trunk });
  // Each door with its frame and, outside beside it, the rack of breathing masks (BreathingMask.cs); one more
  // station inside the water.
  const doorKit = (sd: number, dx: number, y: number, area: string) => {
    const turn = (S(sd) * Math.PI) / 2;
    const f = side(S(sd), dx, OH - 0.5);
    place(b, "marco-puerta-tronco", o.x + f.x, y, o.z + f.z, turn, area, { edificio: t.id }, 1, undefined, false);
    const r = side(S(sd), dx + door.w / 2 + 1.3, OH + 0.35);
    place(b, "perchero-mascaras", o.x + r.x, y, o.z + r.z, turn, area, { edificio: t.id }, 1, undefined, false);
    const st = side(S(sd), dx - door.w / 2 - 1.3, WH - 0.4);
    place(b, "estacion-mascaras", o.x + st.x, y, o.z + st.z, turn + Math.PI, trunk, { edificio: t.id }, 1, undefined, false);
  };
  doorKit(0, door.x, 0, trunk);
  // The photobioreactor facade (Fotobio.cs BuildFotobio, docs/fotobiorreactores.md): on the Árbol de los Campos and on
  // Ciencias, spirulina harps of 28 glass tubes in 3 × 4 m modules, 10 a column from 10 to 56 m, 1,4 m off the acrylic in
  // the corner bay of each face; a pump below, a degasser above and the riser; the control panel at the foot.
  if (t.building === "Árbol de los Campos" || t.building === "Ciencias") {
    const bay = -OH + OH / 6;
    for (let sd = 0; sd < 4; sd++) {
      const turn = (S(sd) * Math.PI) / 2;
      const p = side(S(sd), bay, OH + 1.4);
      for (let j = 0; j < 10; j++) place(b, "fotobio-modulo", o.x + p.x, 10 + j * 4.6, o.z + p.z, turn, trunk, { edificio: t.id }, 1, j === 0 ? "Fotobiorreactores de espirulina" : undefined, false);
      place(b, "fotobio-columna", o.x + p.x, 9.1, o.z + p.z, turn, trunk, { edificio: t.id }, 1, undefined, false);
    }
    const c = side(S(0), -5.5, OH + 0.2);
    place(b, "fotobio-cuadro", o.x + c.x, 0, o.z + c.z, (S(0) * Math.PI) / 2, trunk, { edificio: t.id }, 1, "Cuadro de los fotobiorreactores", false);
  }
  const gOut = side(S(0), door.x, OH + 3);
  const gIn = side(S(0), door.x, WH - 1.5);
  const BH = OH + BASE.walk;
  const shape: TowerShape = { id: t.id, building: t.building, x: o.x, z: o.z, rootHeight, floors: [], tips: [], rings: [], frame: [], braces: [], base: R(o.x - BH, o.x + BH, o.z - BH, o.z + BH), ground: { out: { x: o.x + gOut.x, z: o.z + gOut.z }, inner: { x: o.x + gIn.x, z: o.z + gIn.z } } };
  // Its own base out at sea (Berón 2026-11-21: «que nazca de una propia base artificial… una base negra que tiene la
  // estación de alfombras… una superficie que rodea al tronco y da unos 10 m de espacio para que los humanos puedan
  // caminar»), square (2026-11-22): a black hull, its deck at the ice's height, open where the trunk goes down.
  const baseArea = `base:${t.id}`;
  for (const [x0, x1, z0, z1, kk] of [[-BH, BH, OH, BH, "n"], [-BH, BH, -BH, -OH, "s"], [OH, BH, -OH, OH, "e"], [-BH, -OH, -OH, OH, "o"]] as const)
    b.floors.push({ id: `${baseArea}-${kk}`, x0: o.x + x0, x1: o.x + x1, z0: o.z + z0, z1: o.z + z1, y: 0, area: baseArea });
  b.areas.push({ id: baseArea, label: `Base de ${t.building}`, desc: "La base negra del árbol, en el mar: 10 m de cubierta alrededor del tronco y su estación de alfombras", building: t.building, x: o.x + gOut.x, y: 0, z: o.z + gOut.z, detail: "completo", entry: { x: o.x + gOut.x, z: o.z + gOut.z, yaw: 0 } });
  // The wooden frame (Berón 2026-11-21: «columnas para el tronco y ramas… como un armazón»): a bar between two points of
  // a side's frame (x, z) and two heights, FRAME.beam thick.
  const B = FRAME.beam;
  const bar = (sd: number, xa: number, xb: number, za: number, zb: number, ya: number, yb: number) => {
    const r = sideRect(S(sd), Math.min(xa, xb) - B / 2, Math.max(xa, xb) + B / 2, Math.min(za, zb) - B / 2, Math.max(za, zb) + B / 2, o);
    (shape.frame as Solid[]).push({ ...r, y0: Math.min(ya, yb) - B / 2, y1: Math.max(ya, yb) + B / 2 });
  };
  // The trunk's four corner posts, root to roof, just inside the acrylic, and a beam round it under each level's doors.
  const IN = WH - B / 2;
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) bar(0, px * IN, px * IN, pz * IN, pz * IN, TRUNK_ROOT_Y, rootHeight - 0.5);
  for (const yb of [0, ...Array.from({ length: levels }, (_, i) => levelY(i + 1))])
    for (let sd = 0; sd < 4; sd++) bar(sd, -IN, IN, IN, IN, yb - B / 2, yb - B / 2);
  let tipIndex = 0;
  let fi = 0;
  for (let l = 1; l <= levels; l++) {
    const y = levelY(l);
    const floorSides = l % 2 === 1 ? [0, 2] : [1, 3];
    const branchSides = l % 2 === 1 ? [1, 3] : [0, 2];
    for (const s of floorSides) {
      const f = t.floors[fi++];
      if (!f) continue;
      const area = `${t.id}:piso-${fi}`;
      const fp = f.furnish ? FLOOR_PLANS.get(f.furnish) : undefined;
      // Each floor its own plan, straight out of the trunk's face (Berón 2026-11-21: «edificios con pisos más pequeños…
      // los pisos solo nacen del tronco»): one as wide as the face or wider starts at its corner (Cold Sanctuary's
      // pinwheel); a narrower one sits in the middle of the face. A floor with a ring keeps the tower's square (its U).
      const W = FS;
      const D = FS;
      const x0 = W >= 2 * OH ? -OH : -W / 2;
      const z0 = OH;
      const cxS = x0 + W / 2;
      const rect = sideRect(S(s), x0, x0 + W, z0, z0 + D, o);
      const sp = spacing({ edificio: t.id, piso: area }, b.o) * k;
      // Its door: Cold Sanctuary picks each floor's (pickDoors); here the nearest to 5 m (the middle of a narrow floor)
      // whose way in is clear, on the part of the face the floor touches.
      const lo = Math.max(-OH, x0) + door.w / 2;
      const hi = Math.min(OH, x0 + W) - door.w / 2;
      const preferred = W >= 2 * OH ? door.x : cxS;
      const dx = fp ? doorFor(fp, sp, k, cxS, lo, hi, preferred, { edificio: t.id, piso: area }, b.o) : Math.min(hi, Math.max(lo, preferred));
      b.floors.push({ id: `${area}`, ...rect, y, area });
      b.floors.push({ id: `${area}-umbral`, ...sideRect(S(s), dx - door.w / 2, dx + door.w / 2, WH - 0.6, OH + 0.2, o), y, area });
      gapsOf[s]!.push({ from: dx - door.w / 2, to: dx + door.w / 2, y0: y, y1: y + door.h });
      doorKit(s, dx, y, area);
      (shape.floors as TowerShape["floors"][number][]).push({ rect, y, name: f.name || "Piso libre" });
      // Its two braces: feet on the trunk's face under the floor (inside the face), heads under the slab 70 % out.
      const reach = Math.min(9, 0.7 * D);
      for (const u of [0.25, 0.75]) {
        const bx = Math.min(OH - 1, Math.max(-OH + 1, x0 + W * u));
        const fo = side(S(s), bx, OH);
        const he = side(S(s), bx, OH + reach);
        (shape.braces as TowerShape["braces"][number][]).push({ foot: { x: o.x + fo.x, y: y - 0.6 - reach, z: o.z + fo.z }, head: { x: o.x + he.x, y: y - 0.6, z: o.z + he.z } });
      }
      // The floor's own frame: its centre, +z away from the trunk.
      const c = side(S(s), cxS, z0 + D / 2);
      const centre = { x: o.x + c.x, z: o.z + c.z };
      const out = side(S(s), dx, OH + 3);
      const dir = side(S(s), 0, 1);
      const entry = { x: o.x + out.x, z: o.z + out.z, yaw: Math.atan2(-dir.x, -dir.z) };
      const inn = side(S(s), dx, WH - 1.5);
      b.areas.push({ id: area, label: f.name || `Piso libre (${t.building})`, desc: f.desc, building: t.building, x: centre.x, y, z: centre.z, detail: fp ? "completo" : "vacio", entry, ...(f.furnish ? { furnish: f.furnish } : {}), link: { tower: t.id, inner: { x: o.x + inn.x, z: o.z + inn.z } } });
      if (!fp) continue;
      // Floor frame (Cold Sanctuary's: x across, z away from the trunk) = the side's frame about the floor's centre;
      // Unity's yaw carries over as is (the plan keeps Cold Sanctuary's x and z).
      const turn = (S(s) * Math.PI) / 2;
      for (const it of fp.items) {
        const p = side(S(s), it.x * sp, it.z * sp);
        place(b, it.model, centre.x + p.x, y + (it.y ?? 0), centre.z + p.z, turn + (it.rot ?? 0), area, { edificio: t.id, piso: area }, k, it.name);
      }
      if (fp.ring) {
        // The U ring 8 m up (Levels.cs RingDeck), its balcony against the trunk with its own door, and its things.
        const ry = y + RING.over;
        const ringArea = `${area}:anillo`;
        const hx = FS / 2 - RING.width * RING.inside;
        const ox = hx + RING.width;
        const zb = -FS / 2;
        const cx = cxS;
        const cz = z0 + D / 2;
        const deck = (x0: number, x1: number, z0: number, z1: number, id: string) => b.floors.push({ id: `${ringArea}-${id}`, ...sideRect(S(s), cx + x0, cx + x1, cz + z0, cz + z1, o), y: ry, area: ringArea });
        deck(-ox, ox, hx, hx + RING.width, "frente");
        deck(hx, ox, zb, hx, "ala-1");
        deck(-ox, -hx, zb, hx, "ala-2");
        deck(-hx, hx, zb, zb + RING.balcony, "balcon");
        b.floors.push({ id: `${ringArea}-umbral`, ...sideRect(S(s), dx - door.w / 2, dx + door.w / 2, WH - 0.6, OH + 0.2, o), y: ry, area: ringArea });
        gapsOf[s]!.push({ from: dx - door.w / 2, to: dx + door.w / 2, y0: ry, y1: ry + door.h });
        doorKit(s, dx, ry, ringArea);
        (shape.rings as TowerShape["rings"][number][]).push({ rects: [[-ox, ox, hx, hx + RING.width], [hx, ox, zb, hx], [-ox, -hx, zb, hx], [-hx, hx, zb, zb + RING.balcony]].map(([x0, x1, z0, z1]) => sideRect(S(s), cx + x0!, cx + x1!, cz + z0!, cz + z1!, o)), y: ry });
        b.areas.push({ id: ringArea, label: `Anillo de ${f.name}`, desc: "Anillo en U a 8 m sobre el piso: se llega nadando por su puerta del tronco", building: t.building, x: centre.x, y: ry, z: centre.z, detail: "completo", entry: (() => { const q = side(S(s), dx, OH + 1.5); return { x: o.x + q.x, z: o.z + q.z, yaw: entry.yaw }; })(), link: { tower: t.id, inner: { x: o.x + inn.x, z: o.z + inn.z } } });
        for (const it of fp.ring) {
          const p = side(S(s), it.x * sp, it.z * sp);
          place(b, it.model, centre.x + p.x, ry, centre.z + p.z, turn + (it.rot ?? 0), ringArea, { edificio: t.id, piso: area }, k, it.name);
        }
      }
    }
    for (const s of branchSides) {
      const th = ORCHARD_BRANCH.halfWidth;
      const thH = ORCHARD_BRANCH.halfHeight;
      const mx = TREE.mouthX.value;
      const ts = TREE.tipSize.value;
      const tipC = { x: FS - OH + t.tipGap + ts / 2, z: OH + t.tipGap + ts / 2 };
      const ch = TREE.colHalf.value;
      const colC = { x: tipC.x - ts / 2 + 1 + ch + 0.3, z: tipC.z - ts / 2 + 1 + ch + 0.3 };
      const ty = tipY(l);
      const key = `${t.id}:rama-${l}-${s}`;
      b.waters.push(
        { id: `${key}-a`, ...sideRect(S(s), mx - th, mx + th, WH - 0.5, colC.z + th, o), yBottom: y, yTop: y + 2 * thH, area: key, open: true },
        { id: `${key}-b`, ...sideRect(S(s), mx - th, colC.x + ch, colC.z - th, colC.z + th, o), yBottom: y, yTop: y + 2 * thH, area: key, open: true },
        { id: `${key}-c`, ...sideRect(S(s), colC.x - ch, colC.x + ch, colC.z - ch, colC.z + ch, o), yBottom: y, yTop: ty + 1, area: key, open: true },
      );
      gapsOf[s]!.push({ from: mx - th, to: mx + th, y0: y, y1: y + 2 * thH });
      // Its frame: the long edges of both tubes and the column's four posts.
      for (const yy of [y, y + 2 * thH]) {
        bar(s, mx - th, mx - th, OH, colC.z + th, yy, yy);
        bar(s, mx + th, mx + th, OH, colC.z - th, yy, yy);
        bar(s, mx - th, colC.x - ch, colC.z + th, colC.z + th, yy, yy);
        bar(s, mx + th, colC.x - ch, colC.z - th, colC.z - th, yy, yy);
      }
      for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) bar(s, colC.x + px * ch, colC.x + px * ch, colC.z + pz * ch, colC.z + pz * ch, y, ty);
      // Its grid: a ring round the tubes every b.grid m (FRAME.grid), and round the column.
      if (b.grid > 0) {
        const G = b.grid;
        const y1 = y + 2 * thH;
        for (let zz = OH + G; zz < colC.z - th - 0.5; zz += G) {
          bar(s, mx - th, mx + th, zz, zz, y, y);
          bar(s, mx - th, mx + th, zz, zz, y1, y1);
          bar(s, mx - th, mx - th, zz, zz, y, y1);
          bar(s, mx + th, mx + th, zz, zz, y, y1);
        }
        for (let xx = mx + th + G; xx < colC.x - ch - 0.5; xx += G) {
          bar(s, xx, xx, colC.z - th, colC.z + th, y, y);
          bar(s, xx, xx, colC.z - th, colC.z + th, y1, y1);
          bar(s, xx, xx, colC.z - th, colC.z - th, y, y1);
          bar(s, xx, xx, colC.z + th, colC.z + th, y, y1);
        }
        for (let yy = y1 + G; yy < ty - 0.5; yy += G)
          for (const [xa, xb, za, zb] of [[-ch, ch, -ch, -ch], [-ch, ch, ch, ch], [-ch, -ch, -ch, ch], [ch, ch, -ch, ch]] as const) bar(s, colC.x + xa, colC.x + xb, colC.z + za, colC.z + zb, yy, yy);
      }
      // Its rings: where it leaves the trunk and where it turns towards the tip's column.
      for (const [rx, rz, along] of [[mx, OH + 0.3, 0], [mx + th + 0.3, colC.z, 1]] as const) {
        const p = side(S(s), rx, rz);
        place(b, "aro-rama-huerto", o.x + p.x, y, o.z + p.z, (S(s) * Math.PI) / 2 + along * (Math.PI / 2), key, { edificio: t.id }, 1, undefined, false);
      }
      // The photobioreactor keel (Fotobio.cs, FotobioSpec.Keel) of the Árbol de los Campos: 6 flat panels of 2,4 × 2 m
      // hung 2,4 m under the long run of the branch, between its mouth and its column, with its pump.
      if (t.building === "Árbol de los Campos") {
        const span = colC.x - ch - (mx + th);
        const n = Math.min(6, Math.floor((span + 0.12) / 2.52));
        const x0 = (mx + th + colC.x - ch) / 2 - (n * 2.52 - 0.12) / 2;
        const turn = (S(s) * Math.PI) / 2;
        for (let pi = 0; pi < n; pi++) {
          const q = side(S(s), x0 + pi * 2.52 + 1.2, colC.z);
          place(b, "fotobio-quilla", o.x + q.x, y - 2.4 - 2.08, o.z + q.z, turn, key, { edificio: t.id }, 1, pi === 0 ? "Quilla de fotobiorreactores" : undefined, false);
        }
        if (n > 0) {
          const q = side(S(s), x0 - 0.6, colC.z);
          place(b, "fotobio-bomba", o.x + q.x, y - 2.4 - 0.7, o.z + q.z, turn, key, { edificio: t.id }, 1, undefined, false);
        }
      }
      const tip = sideRect(S(s), tipC.x - ts / 2, tipC.x + ts / 2, tipC.z - ts / 2, tipC.z + ts / 2, o);
      const col = sideRect(S(s), colC.x - ch, colC.x + ch, colC.z - ch, colC.z + ch, o);
      const tipArea = `${t.id}:punta-${l}-${s}`;
      for (const r of [R(tip.x0, tip.x1, tip.z0, col.z0), R(tip.x0, tip.x1, col.z1, tip.z1), R(tip.x0, col.x0, col.z0, col.z1), R(col.x1, tip.x1, col.z0, col.z1)])
        if (r.x1 - r.x0 > 0.01 && r.z1 - r.z0 > 0.01) b.floors.push({ id: `${tipArea}-${b.floors.length}`, ...r, y: ty, area: tipArea });
      (shape.tips as TowerShape["tips"][number][]).push({ rect: tip, y: ty });
      // What grows there, in the tip's frame (its side's axes about its centre).
      const colL = { x0: colC.x - ch - tipC.x, x1: colC.x + ch - tipC.x, z0: colC.z - ch - tipC.z, z1: colC.z + ch - tipC.z };
      const crops = t.tip === "Cultivos";
      // The expert's care room in the first orchard tip of Servicios; a care point in every other.
      const sala = !crops && t.building === "Servicios" && !b.expertRoom;
      if (sala) b.expertRoom = true;
      const tipPlan = crops ? bedTip(ts, colL, tipIndex++) : orchardTip(ts, colL, 3.4, sala ? "sala" : "punto");
      for (const it of tipPlan) {
        const p = side(S(s), tipC.x + it.x, tipC.z + it.z);
        place(b, it.model, o.x + p.x, ty, o.z + p.z, (S(s) * Math.PI) / 2 + (it.rot ?? 0), tipArea, { edificio: t.id, piso: tipArea }, 1, it.name);
      }
      b.areas.push({ id: tipArea, label: `${crops ? "Campo de punta" : t.tip} (${t.building}, nivel ${l})`, desc: crops ? "Bancal de su gremio junto a la columna; se llega nadando por la rama" : "Frutales en maceta, uno de cada especie y otra vuelta; se llega nadando por la rama y su columna", building: t.building, x: (tip.x0 + tip.x1) / 2, y: ty, z: (tip.z0 + tip.z1) / 2, detail: "completo" });
    }
  }
  // The wooden grid on the trunk's faces (FRAME.grid): posts and beams every b.grid m, never across a doorway.
  if (b.grid > 0) {
    const G = b.grid;
    for (let sd = 0; sd < 4; sd++) {
      const g = gapsOf[sd]!;
      // Posts: from one corner to the other, every G m; each cut where a doorway is.
      for (let x = -IN + G; x < IN - G / 2; x += G) {
        const cuts = g.filter((q) => x + B / 2 > q.from && x - B / 2 < q.to).sort((p, q) => p.y0 - q.y0);
        let y0 = TRUNK_ROOT_Y;
        for (const c of cuts) {
          if (c.y0 - y0 > 1) bar(sd, x, x, IN, IN, y0, c.y0 - 0.1);
          y0 = Math.max(y0, c.y1 + 0.1);
        }
        if (rootHeight - 0.5 - y0 > 1) bar(sd, x, x, IN, IN, y0, rootHeight - 0.5);
      }
      // Beams: every G m up; each cut where a doorway is.
      for (let yb = G; yb < rootHeight - 1; yb += G) {
        const cuts = g.filter((q) => yb + B / 2 > q.y0 && yb - B / 2 < q.y1).sort((p, q) => p.from - q.from);
        let x0 = -IN;
        for (const c of cuts) {
          if (c.from - x0 > 1) bar(sd, x0, c.from - 0.1, IN, IN, yb, yb);
          x0 = Math.max(x0, c.to + 0.1);
        }
        if (IN - x0 > 1) bar(sd, x0, IN, IN, IN, yb, yb);
      }
    }
  }
  // The trunk's acrylic: each face cut into bands at every doorway's edges, so a door is a hole.
  for (let s = 0; s < 4; s++) {
    const g = gapsOf[s]!;
    const ys = [...new Set([-1.6, rootHeight, ...g.flatMap((q) => [q.y0, q.y1])])].sort((p, q) => p - q);
    for (let i = 0; i + 1 < ys.length; i++) {
      const y0 = ys[i]!;
      const y1 = ys[i + 1]!;
      const gaps = g.filter((q) => q.y0 <= y0 + 1e-6 && q.y1 >= y1 - 1e-6).map((q) => ({ from: q.from, to: q.to }));
      for (const piece of wallWithGaps({ axis: "x", at: WH + 0.5, from: -OH, to: OH, y0, y1, thick: 1, gaps })) {
        const w = { ...sideRect(S(s), piece.x0, piece.x1, piece.z0, piece.z1, o), y0, y1 };
        b.solids.push(w);
        b.walls.push(w);
      }
    }
  }
  // The roof over the trunk.
  b.floors.push({ id: `${t.id}-techo`, ...around(o.x, o.z, OH), y: rootHeight, area: `${t.id}:techo` });
  if (t.cima) {
    (shape as { cima?: CrownShape }).cima = buildCrown(b, t, o, rootHeight, k);
    // Its braces: from the trunk's faces 24 m down to under the crown's slab, fanned out to its edges.
    for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      for (const along of [-40, -14, 14, 40]) {
        const at = (r: number, a: number) => ({ x: o.x + ux * r + uz * a, z: o.z + uz * r + ux * a });
        const foot = at(OH, Math.max(-OH + 2, Math.min(OH - 2, along / 3)));
        const head = at(42, along);
        (shape.braces as TowerShape["braces"][number][]).push({ foot: { ...foot, y: rootHeight - 24 }, head: { ...head, y: rootHeight - 0.6 } });
      }
  }
  b.towers.push(shape);
}

/**
 * The giant floor on a tree's crown (organizacion.ts rule 1; castillos.ts, floors/residencia-cima.ts): its square round
 * the trunk's top, the pillow ring, the castles' decks, stairs, nets, rails and posts, and its things. The crown frame
 * (origin on the trunk's axis) turns with the tree's quarter.
 */
function buildCrown(b: Built, t: TowerSpec, o: { x: number; z: number }, y: number, k: number): CrownShape {
  const area = `${t.id}:cima`;
  const q = (((t.quarter % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const P = (x: number, z: number) => (q === 0 ? { x, z } : q === 1 ? { x: z, z: -x } : q === 2 ? { x: -x, z: -z } : { x: -z, z: x });
  const W = (r: { x0: number; x1: number; z0: number; z1: number }): Rect => {
    const a = P(r.x0, r.z0);
    const c = P(r.x1, r.z1);
    return { x0: o.x + Math.min(a.x, c.x), x1: o.x + Math.max(a.x, c.x), z0: o.z + Math.min(a.z, c.z), z1: o.z + Math.max(a.z, c.z) };
  };
  const pt = (p: P3): Point3 => {
    const w = P(p.x, p.z);
    return { x: o.x + w.x, y: y + p.y, z: o.z + w.z };
  };
  const turn = (q * Math.PI) / 2;
  const H = CROWN.half;
  const rect = W({ x0: -H, x1: H, z0: -H, z1: H });
  b.floors.push({ id: area, ...rect, y, area });
  const arena = arenaRects().map(W);
  arena.forEach((r, i) => b.floors.push({ id: `${area}-ring-${i}`, ...r, y: y + ARENA_Y, area }));
  const castles = CASTILLOS.map((c) => {
    const decks = c.decks.map((d, i) => {
      const r = { ...W(d), y: y + d.y, kind: d.kind, ...(d.ladder ? { ladder: W(d.ladder) } : {}) };
      b.floors.push({ id: `${area}-${c.team}-${i}`, x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y: r.y, area, ...(r.ladder ? { ladder: r.ladder } : {}) });
      return r;
    });
    const solid = (s: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }): Solid => ({ ...W(s), y0: y + s.y0, y1: y + s.y1 });
    const rails = c.rails.map(solid);
    const columns = c.columns.map(solid);
    b.solids.push(...rails, ...columns);
    const tower = c.decks.find((d) => d.kind === "torre")!;
    return { team: c.team, name: c.name, color: c.color, decks, rails, columns, slides: c.slides.map((s) => s.map(pt)), treasure: pt(c.treasure), rect: W(c.area), tower: { ...W(tower), y: y + tower.y } };
  });
  for (const it of CIMA_RESIDENCIA.items) {
    const w = P(it.x, it.z);
    place(b, it.model, o.x + w.x, y + (it.y ?? 0), o.z + w.z, turn + (it.rot ?? 0), area, { edificio: t.id, piso: area }, k, it.name);
  }
  const door = P(0, CROWN.walk - 1);
  b.areas.push({
    id: area,
    label: t.cima!.name,
    desc: t.cima!.desc,
    building: t.building,
    x: o.x,
    y,
    z: o.z,
    detail: "completo",
    furnish: t.cima!.furnish,
    entry: { x: o.x + door.x, z: o.z + door.z, yaw: turn + Math.PI },
    link: { tower: t.id, inner: { x: o.x, z: o.z } },
  });
  return { area, y, rect, arena, castles };
}

/**
 * One catalogue model placed, with the bulk rules applied (hidden, swapped, scaled, recoloured) and, if it stands
 * taller than 0,3 m, its footprint as a walk solid. `plan` widens it on the plan (interior scale).
 */
function place(b: Built, id: string, x: number, y: number, z: number, rot: number, area: string, where: { edificio?: string; piso?: string }, plan = 1, name?: string, solid = true): void {
  let r = resolve(model(id), where, b.o);
  if (r.cambiarPor) {
    id = r.cambiarPor;
    r = { ...resolve(model(id), where, b.o), ...(r.escala !== undefined ? { escala: r.escala } : {}), ...(r.color !== undefined ? { color: r.color } : {}) };
  }
  if (r.oculto) return;
  const d = model(id);
  const sc = r.escala ?? 1;
  b.instances.push({ model: id, x, y, z, rot, area, ...(name ? { name } : {}), ...(plan !== 1 ? { plan } : {}), ...(sc !== 1 ? { scale: sc } : {}), ...(r.color !== undefined ? { tint: r.color } : {}) });
  if (d.decks) b.floors.push(...decksOf(d, x, y, z, rot, area, plan * sc));
  if (!solid || d.size.y * sc <= 0.3 || d.shape === "figura") return;
  b.solids.push(...solidsOf(d, x, y, z, rot, plan, sc));
}

/** A placed model's high surfaces (ModelDef.decks) as walk floors, with their ladders, turned and scaled with it. */
export function decksOf(d: ModelDef, x: number, y: number, z: number, rot: number, area: string, k = 1): Floor[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const rect = (cx: number, cz: number, w: number, dd: number) => {
    const px = x + (cx * c + cz * s) * k;
    const pz = z + (-cx * s + cz * c) * k;
    const ex = ((Math.abs(c) * w + Math.abs(s) * dd) / 2) * k;
    const ez = ((Math.abs(s) * w + Math.abs(c) * dd) / 2) * k;
    return { x0: px - ex, x1: px + ex, z0: pz - ez, z1: pz + ez };
  };
  return (d.decks ?? []).map((q, i) => ({ id: `cubierta:${d.id}:${i}:${x.toFixed(2)},${z.toFixed(2)}`, ...rect(q.x, q.z, q.w, q.d), y: y + q.y * k, area, ...(q.ladder ? { ladder: rect(q.ladder.x, q.ladder.z, q.ladder.w, q.ladder.d) } : {}) }));
}

/**
 * The walk solids of a placed model: its footprint, or for a composite model each part that stands in the way of a
 * body (taller than 0,3 m and starting below 2 m), so she walks into a cabin through its door and under a rig's bars.
 * A part turned by a non-square angle keeps the box around it.
 */
export function solidsOf(d: ModelDef, x: number, y: number, z: number, rot: number, plan = 1, sc = 1): Solid[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const box = (cx: number, cz: number, hx: number, hz: number, y0: number, y1: number): Solid => {
    // Three.js turn about y: (x, z) → (x cos + z sin, −x sin + z cos).
    const px = x + (cx * c + cz * s) * plan * sc;
    const pz = z + (-cx * s + cz * c) * plan * sc;
    const ex = (Math.abs(c) * hx + Math.abs(s) * hz) * plan * sc;
    const ez = (Math.abs(s) * hx + Math.abs(c) * hz) * plan * sc;
    return { x0: px - ex, x1: px + ex, z0: pz - ez, z1: pz + ez, y0: y + y0 * sc, y1: y + y1 * sc };
  };
  if (d.walkThrough) return [];
  // A tree stands in the way only by its trunk (the crown is overhead).
  if (d.shape === "arbol") return [box(0, 0, d.size.x * 0.09, d.size.z * 0.09, 0, d.size.y)];
  if (!d.parts) return [box(0, 0, d.size.x / 2, d.size.z / 2, 0, d.size.y)];
  return blockingParts(d).map((p) => box(p[0]!, p[2]!, p[3]! / 2, p[5]! / 2, p[1]! - p[4]! / 2, p[1]! + p[4]! / 2));
}

/**
 * The parts of a model that stand in the way, once per model: those between knee and head height (0,3–2 m), but not thin
 * posts (a desk's legs, a mic stand: under 5 cm both ways, they stop nobody on their own; the tops they hold do) nor
 * parts inside another (the books in a bookcase), so the walk scans far fewer pieces.
 */
const BLOCKING = new WeakMap<ModelDef, readonly Part[]>();
function blockingParts(d: ModelDef): readonly Part[] {
  let out = BLOCKING.get(d);
  if (out) return out;
  const ps = (d.parts ?? []).filter(([, cy, , sx, sy, sz]) => cy! + sy! / 2 > 0.3 && cy! - sy! / 2 < 2 && !(sx! < 0.05 && sz! < 0.05));
  const inside = (a: Part, b: Part) => [0, 1, 2].every((k) => a[k]! - a[k + 3]! / 2 >= b[k]! - b[k + 3]! / 2 - 1e-6 && a[k]! + a[k + 3]! / 2 <= b[k]! + b[k + 3]! / 2 + 1e-6);
  out = ps.filter((a, i) => !ps.some((b, j) => j !== i && inside(a, b) && (!inside(b, a) || j < i)));
  BLOCKING.set(d, out);
  return out;
}

/**
 * The door of a furnished floor on the trunk's face (side frame x, within [`lo`, `hi`]): the nearest to `preferred` with
 * a clear way 1,6 m wide and 9 m deep into the floor. `cx` is the floor centre's x in the side frame.
 */
function doorFor(fp: FloorPlan, sp: number, k: number, cx: number, lo: number, hi: number, preferred: number, where: { edificio: string; piso: string }, o: Overrides): number {
  const half = (fp.ring ? Math.max(fp.size.x, fp.size.z) : fp.size.z) * k / 2;
  const solids: Solid[] = [];
  for (const it of fp.items) {
    const r = resolve(model(it.model), where, o);
    if (r.oculto) continue;
    const d = model(r.cambiarPor ?? it.model);
    if (d.size.y <= 0.3) continue;
    solids.push(...solidsOf(d, it.x * sp, 0, it.z * sp, it.rot ?? 0, k, r.escala ?? 1));
  }
  const clear = (x: number) => !solids.some((q) => q.x0 < x + 0.8 && q.x1 > x - 0.8 && q.z0 < -half + 9 && q.y0 < 1.7);
  for (let d = 0; d <= hi - lo + Math.abs(preferred); d += 0.5)
    for (const x of [preferred + d, preferred - d]) if (x >= lo && x <= hi && clear(x - cx)) return x;
  return Math.min(hi, Math.max(lo, preferred));
}

/** Walking speeds of the animals by body (m/s): a stroll, not a run. */
const SPEED: Partial<Record<ModelDef["shape"], number>> = { cuadrupedo: 0.9, pinguino: 0.4, pinnipedo: 0.7, cetaceo: 1.8, ave: 1.2 };

/** Gives the last placed instance (if it was placed) its territory. */
function wanders(b: Built, model: string, w: NonNullable<Instance["wander"]>): void {
  const last = b.instances[b.instances.length - 1];
  if (last && !last.wander && last.model === model) b.instances[b.instances.length - 1] = { ...last, wander: w };
}

/**
 * A wild animal's age in its family (domain/life-cycle.ts, data/ciclos-de-vida.ts): its size by the real growth
 * curve and a name that says its stage and age, e.g. «Foca, cría de 1 mes».
 */
function lifeOf(species: string, i: number, n: number, first: number): { scale: number; name?: string; life?: NonNullable<Instance["life"]> } {
  const c = LIFE_CYCLES[species];
  if (!c) return { scale: 1 };
  const age = ageInGroup(i, n, c);
  const adults = Math.max(1, Math.ceil(n / 2));
  // The young keep to the family's adults, one mother each in turn (each instance is placed right after the last).
  const mother = i >= adults ? first + ((i - adults) % adults) : undefined;
  const life = { species, born: -age, offset: Math.floor(hash01(first + i, 3) * 21), ...(mother !== undefined ? { mother } : {}) };
  return { scale: sizeAt(age, c), name: `${c.label}, ${ageLabel(age, c)}`, life };
}

function aged(b: Built, model: string, l: ReturnType<typeof lifeOf>): void {
  const last = b.instances[b.instances.length - 1];
  if (!last || last.model !== model) return;
  b.instances[b.instances.length - 1] = { ...last, ...(l.scale < 0.999 ? { scale: (last.scale ?? 1) * l.scale } : {}), ...(l.life ? { life: l.life } : {}) };
}

/**
 * The work submarine's way from its bay to the sea and back (ours; the trunk's water is the sea's, Cold Sanctuary's
 * magic): out of the bay through the floor's trunk door, down the trunk to its root under the ice, then under the ice
 * (8 m down) to the whales' sea, where it surfaces. Its route is swum both ways.
 */
function submarineDive(b: Built): S1Layout["submarine"] {
  const index = b.instances.findIndex((i) => i.model === "sub-obra");
  const sub = b.instances[index];
  const bay = sub && b.areas.find((a) => a.id === sub.area);
  const tower = bay?.link && b.towers.find((t) => t.id === bay.link!.tower);
  if (!sub || !bay?.entry || !bay.link || !tower) return undefined;
  const y = sub.y;
  const route: Waypoint[] = [
    { x: sub.x, y, z: sub.z },
    { x: bay.entry.x, y, z: bay.entry.z, swim: true },
    { x: bay.link.inner.x, y, z: bay.link.inner.z, swim: true },
    { x: tower.x, y, z: tower.z, swim: true },
    { x: tower.x, y: TRUNK_ROOT_Y + 2.5, z: tower.z, swim: true },
    { x: SEA.x, y: -8, z: SEA.z, swim: true },
    { x: SEA.x, y: WATER_Y - 1.4, z: SEA.z, swim: true },
  ];
  return { index, route };
}

/**
 * The ice (or land) under each trunk is open (Berón 2026-11-20: «en la base del edificio árbol todavía veo un suelo
 * blanco y se supone que no hay suelo»): the trunk's water goes down into the sea through a hole as big as it.
 */
function cutTrunkHoles(b: Built): void {
  for (const t of b.towers) {
    const h = { x0: t.x - TRUNK_HALF, x1: t.x + TRUNK_HALF, z0: t.z - TRUNK_HALF, z1: t.z + TRUNK_HALF };
    for (let i = b.floors.length - 1; i >= 0; i--) {
      const f = b.floors[i]!;
      if (f.y !== 0 || !/^(hielo|tierra):/.test(f.area) || f.x0 >= h.x1 || f.x1 <= h.x0 || f.z0 >= h.z1 || f.z1 <= h.z0) continue;
      const mx0 = Math.max(f.x0, h.x0);
      const mx1 = Math.min(f.x1, h.x1);
      const pieces = [
        { x0: f.x0, x1: mx0, z0: f.z0, z1: f.z1 },
        { x0: mx1, x1: f.x1, z0: f.z0, z1: f.z1 },
        { x0: mx0, x1: mx1, z0: f.z0, z1: Math.max(f.z0, h.z0) },
        { x0: mx0, x1: mx1, z0: Math.min(f.z1, h.z1), z1: f.z1 },
      ].filter((r) => r.x1 - r.x0 > 0.01 && r.z1 - r.z0 > 0.01);
      b.floors.splice(i, 1, ...pieces.map((r, k) => ({ ...f, id: `${f.id}-${k}`, ...r })));
    }
  }
}

/** The whales' globe's area (data/globo.ts). */
export const AQUARIUM_AREA = "mar:globo";

/** The octopus egg in the globe's belly (domain/pulpo.ts; its hatchling a third of the globe across, GLOBE.embryo): the box one bumps into, swimming. */
export function embryoBox(): Solid {
  const w = (GLOBE.embryo * EGG.width) / 2;
  const h = (GLOBE.embryo * EGG.length) / 2;
  return { x0: GLOBE.x - w, x1: GLOBE.x + w, z0: GLOBE.z - w, z1: GLOBE.z + w, y0: GLOBE.bellyY - h, y1: GLOBE.bellyY + h };
}

/**
 * The whales' globe (data/globo.ts): its water layer by layer (boxes of its cells; one swims in it like in a trunk,
 * up from the sea), the embryo in its belly, its area, and who lives up there besides its whales (NESTS): a pod of
 * dolphins under the embryo, and dolphins and seals going up and down its nozzle between the sea and the belly. Ours.
 */
function aquarium(b: Built): void {
  const G = GLOBE;
  for (const l of G.layers) layerBoxes(l).forEach((q, n) => b.waters.push({ id: `${AQUARIUM_AREA}-${l.y0}-${n}`, ...q, yBottom: l.y0, yTop: l.y1, area: AQUARIUM_AREA }));
  b.solids.push(embryoBox());
  b.areas.push({ id: AQUARIUM_AREA, label: "El globo de las ballenas", desc: `Una masa de agua que nace del mar entre los casquetes (6/10 de él), se estrecha en su boquilla y se abre hasta ${Math.round(G.topY)} m de alto, más ancha que el mar, con un huevo de pulpo a punto de eclosionar en su vientre: donde viven las ballenas, los delfines y las focas`, x: G.x, y: G.bellyY, z: G.z, detail: "completo" });
  const e = embryoBox();
  const inside = (x: number, y: number, z: number) => (globeTopAt(x, z) ?? -Infinity) > y + 3 && G.layers.some((l) => l.y0 <= y && l.y1 > y && l.cells.has(globeCell(x, z).join(",")));
  const reachAt = (y: number) => {
    let r = 0;
    for (let d = 4; d < 400; d += 4) if ([0, 1, 2, 3].every((k) => inside(G.x + Math.cos((k * Math.PI) / 2) * d, y, G.z + Math.sin((k * Math.PI) / 2) * d))) r = d;
    return r;
  };
  const podY = Math.max(G.layers[0]!.y1, e.y0 - 20);
  const podR = reachAt(podY) * 0.6;
  for (let i = 0; i < 8; i++) {
    const p = scatter(i, Math.min(30, podR));
    place(b, "delfin", G.x + p.x, podY, G.z + p.z, i * 1.3, AQUARIUM_AREA, {}, 1, `Delfín ${i + 1}`, false);
    wanders(b, "delfin", { x: G.x, z: G.z, r: podR, speed: 2.4, seed: b.instances.length * 13 + i });
  }
  // Up and down the nozzle, round its axis.
  (["delfin", "delfin", "foca", "foca"] as const).forEach((id, i) => {
    place(b, id, G.x, 2 + i * 10, G.z, i, AQUARIUM_AREA, {}, 1, id === "delfin" ? `Delfín de la boquilla ${i + 1}` : `Foca de la boquilla ${i - 1}`, false);
    wanders(b, id, { x: G.x, z: G.z, r: 6, speed: id === "delfin" ? 2 : 1.2, seed: b.instances.length * 19 + i, climb: { y0: WATER_Y - 2, y1: e.y0 - 10 } });
  });
  // A pod of dolphins round the sea too.
  for (let i = 0; i < 6; i++) {
    const p = scatter(i, 30);
    place(b, "delfin", SEA.x + 60 + p.x, WATER_Y - 0.6, SEA.z + p.z, i, "mar", {}, 1, `Delfín del mar ${i + 1}`, false);
    wanders(b, "delfin", { x: SEA.x, z: SEA.z, r: 95, speed: 2.4, seed: b.instances.length * 23 + i });
  }
}

/** A deterministic scatter (no Math.random: the same scene on every load). */
function scatter(i: number, radius: number): { x: number; z: number } {
  const a = i * 2.399963;
  const r = radius * Math.sqrt((i + 0.5) / 12);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

/** `towers`: today's buildings, or the roomy ones kept in site.ts (TOWERS_AMPLIOS). */
/** Animals per person in sanctuary 1 unless the setting says otherwise (Berón 2026-11-22: 4, Cold Sanctuary's 3 + 1). */
export const ANIMALS_PER_PERSON_S1 = 4;

export function buildS1Layout(k = 1, o: Overrides = OVERRIDES, towers: readonly TowerSpec[] = TOWERS, opts: { readonly woodGrid?: number; readonly animalsPerPerson?: number } = {}): S1Layout {
  const b: Built = { o, grid: opts.woodGrid ?? FRAME.grid, floors: groundFloors(), waters: [], solids: [], walls: [], instances: [], areas: [], towers: [] };
  b.waters.push({ id: "mar", x0: -4000, x1: 4000, z0: -4000, z1: 4000, yBottom: -40, yTop: WATER_Y, area: "mar" });
  for (const cap of new Set(LOBES.filter((l) => l.r > 0).map(capOf))) {
    const ls = LOBES.filter((l) => l.r > 0 && capOf(l) === cap);
    const big = ls.reduce((a, l) => (l.r > a.r ? l : a));
    b.areas.push({ id: `${ls.some(isLand) ? "tierra" : "hielo"}:${cap}`, label: CAP_NAME[cap] ?? cap, desc: ls.map((l) => l.name.split(":")[1]!.replace(/_/g, " ")).join(", "), x: big.x, y: 0, z: big.z, detail: "vacio" });
  }
  b.areas.push({ id: "mar", label: "El mar de las ballenas", desc: "El mar abierto del centro: ballenas, orcas, delfines, focas y morsas", x: SEA.x, y: WATER_Y, z: SEA.z, detail: "completo" });
  aquarium(b);
  for (const t of towers) buildTower(b, t, k);
  cutTrunkHoles(b);
  // The carpet stations (alfombras.ts): on a landing out of each floor's and ring's edge, on each crown and at each foot.
  const carpets = carpetStations({ areas: b.areas, towers: b.towers, floors: b.floors, waters: b.waters, solids: b.solids });
  for (const st of carpets) {
    if (st.landing) b.floors.push({ id: `${st.area}-rellano-alfombras`, ...st.landing, y: st.y, area: st.area });
    const where = st.kind === "piso" ? { edificio: st.tower, piso: st.area } : { edificio: st.tower };
    place(b, "estacion-alfombras", st.x, st.y, st.z, Math.atan2(st.out.x, st.out.z), st.area, where, 1, `Estación de alfombras (${st.kind === "piso" ? st.label : `${st.label} de ${st.building}`})`, false);
  }
  // Up the trunks from the sea (Berón 2026-11-19: «los animales marinos pueden subir por los troncos»): in each trunk a
  // seal and two penguins swim between its root under the ice and its top (ours: who and how many).
  for (const tw of b.towers) {
    const top = tw.rootHeight - 2.5;
    ["foca", "pinguino", "pinguino"].forEach((id, i) => {
      place(b, id, tw.x, TRUNK_ROOT_Y + 2, tw.z, i, `${tw.id}:tronco`, {}, 1, undefined, false);
      wanders(b, id, { x: tw.x, z: tw.z, r: 6, speed: id === "foca" ? 1.2 : 0.9, seed: b.instances.length * 17 + i * 5, climb: { y0: TRUNK_ROOT_Y + 2, y1: top } });
    });
  }

  // The landscape: wild caps, tundra and icebergs (paisaje.ts). Icebergs float at the water line and stand as solids.
  let drifting: S1Layout["drift"];
  for (const it of landscape()) {
    const y = it.sea ? WATER_Y : 0;
    const at = b.instances.length;
    place(b, it.model, it.x, y, it.z, it.rot, it.sea ? "mar" : "paisaje", {}, 1, it.name, !it.sea);
    if (it.model === "iceberg-deriva") drifting = { index: at, visitors: [], a: DRIFT.a, b: DRIFT.b };
    if (it.sea) {
      const d = model(it.model);
      // (The drifting one moves: its solid goes with it, added round her by the scene, sanctuary-one.ts near.)
      if (it.model !== "iceberg-deriva") b.solids.push({ x0: it.x - d.size.x / 2, x1: it.x + d.size.x / 2, z0: it.z - d.size.z / 2, z1: it.z + d.size.z / 2, y0: -40, y1: y + d.size.y });
      // Its visitors (IcebergVisitor: 4 seals and 4 penguins, adults, swimming off its ledge).
      const seals = 2;
      const penguins = 2;
      for (const [id, n, dz] of [["foca", seals, 0], ["pinguino", penguins, 4]] as const)
        for (let i = 0; i < n; i++) {
          const a = model(id);
          if (drifting && it.model === "iceberg-deriva") (drifting.visitors as number[]).push(b.instances.length);
          place(b, id, it.x - d.size.x / 2 - 12 - 6 + i * 4, WATER_Y - a.size.y * 0.4, it.z + dz, Math.PI / 2, "mar", {}, 1, `${id === "foca" ? "Foca" : "Pingüino"} del ${it.name?.toLowerCase()}`, false);
        }
    }
  }

  // Animals: Cold Sanctuary's plan for the staff of sanctuary 1 (all of them live here), in their nests' families.
  const counts = plan(STAFF.length + 1, opts.animalsPerPerson ?? ANIMALS_PER_PERSON_S1);
  const used = new Map<string, number>();
  for (const n of NESTS) {
    const gi = used.get(n.species) ?? 0;
    used.set(n.species, gi + 1);
    const qty = split(counts.get(n.species) ?? 0, GROUPS[n.species] ?? 1)[gi] ?? 0;
    const id = SPECIES_MODEL[n.species]!;
    const d = model(id);
    const first = b.instances.length;
    for (let i = 0; i < qty; i++) {
      const p = scatter(i, n.radius);
      const life = lifeOf(n.species, i, qty, first);
      const y = n.y ?? (n.marine ? (d.shape === "cetaceo" ? WATER_Y - d.size.y * life.scale * 0.55 : WATER_Y - d.size.y * life.scale * 0.4) : 0);
      place(b, id, n.x + p.x, y, n.z + p.z, i * 1.7, n.y !== undefined ? AQUARIUM_AREA : n.marine ? "mar" : "fauna", {}, 1, life.name, false);
      aged(b, id, life);
      wanders(b, id, { x: n.x, z: n.z, r: n.radius, speed: (SPEED[d.shape] ?? 0.8) * Math.sqrt(life.scale), seed: b.instances.length * 31 + 7 });
    }
  }
  // Snow petrels: one colony (no nest in Cold Sanctuary's list: it is ours) on the wild northern cap.
  const pet = counts.get("SnowPetrel") ?? 0;
  const petrels = b.instances.length;
  const colony = onMovedCap(75, 170);
  for (let i = 0; i < pet; i++) {
    const p = scatter(i, 10);
    const life = lifeOf("SnowPetrel", i, pet, petrels);
    place(b, "petrel-niveo", colony.x + p.x, 0, colony.z + p.z, i, "fauna", {}, 1, life.name, false);
    aged(b, "petrel-niveo", life);
    wanders(b, "petrel-niveo", { x: colony.x, z: colony.z, r: 10, speed: SPEED.ave!, seed: b.instances.length * 31 + 7 });
  }
  // The staff on the hub, 2 m apart (ours: where each one goes comes with the workday).
  const hub = onMovedCap(5, -10);
  STAFF.forEach((name, i) => {
    const ring = i < 12 ? 0 : 1;
    const j = ring ? i - 12 : i;
    const n = ring ? STAFF.length - 12 : 12;
    const r = ring ? 7 : 4;
    const a = (j / n) * Math.PI * 2;
    b.instances.push({ model: "persona", x: hub.x + Math.cos(a) * r, y: 0, z: hub.z + Math.sin(a) * r, rot: -a - Math.PI / 2, area: "hielo:Centro", name });
  });

  // She starts at the gym's door (its floor is the first ported in full).
  const gym = b.areas.find((a) => a.label === "Gimnasio")!;
  const start = { x: gym.entry!.x, y: gym.y, z: gym.entry!.z, yaw: gym.entry!.yaw };
  const submarine = submarineDive(b);
  return { k, world: { floors: b.floors, waters: b.waters, solids: b.solids }, instances: b.instances, areas: b.areas, towers: b.towers, walls: b.walls, carpets, start, ...(submarine ? { submarine } : {}), ...(drifting ? { drift: drifting } : {}) };
}
