import { TREE } from "@modules/aerial-sanctuary/data/facts";
import { carpetStations, STATION_PAD, type CarpetStation } from "./alfombras";
import type { Floor, Rect, Solid, Water, WalkWorld } from "@modules/aerial-sanctuary/domain/walk";
import { wallWithGaps } from "@modules/aerial-sanctuary/domain/walk";
import { CAP_NAME, LAGOON, LOBES, MAP_HALF, NESTS, SPECIES_MODEL, STAFF, TOWERS, WATER_Y, capOf, isLand, lobeRadius, type TowerSpec } from "./site";
import { FLOOR_PLANS, type FloorPlan } from "./floors";
import { RING } from "./floors/kit";
import { bedTip, orchardTip } from "./floors/puntas";
import { DRIFT, landscape } from "./paisaje";
import { model, type ModelDef, type Part } from "./catalog";
import { OVERRIDES, resolve, spacing, type Overrides } from "./overrides";
import { GROUPS, plan, split } from "../domain/population";
import { ageInGroup, ageLabel, sizeAt } from "../domain/life-cycle";
import { hash01, type Waypoint } from "../domain/motion";
import { LIFE_CYCLES } from "./ciclos-de-vida";

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
  /** Where its carpets wait, when not on the line from the trunk through its centre (a floor at the end of a branch). */
  readonly pad?: { readonly x: number; readonly z: number };
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
  /** The ground door: outside on the ice, and inside in the trunk's water. */
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
export const treeWater = (area: string) => /:(tronco|rama)/.test(area);
/**
 * How much faster she swims in a tree's water (Berón 2026-11-20: «los viajes se alargan mucho entre rama y rama»):
 * ours, its pumps keep a current along the trunk and the branches that carries her (×3: 6,6 m/s, 9 m/s crawling).
 */
export const TREE_CURRENT = 3;

/**
 * Where a floor's carpet station goes, in its plan's frame (m about its centre, +z away from its door): on the outer
 * edge, like Cold Sanctuary's carpet strip (Research.cs CarpetKeepOut), at the free spot nearest the middle; if the
 * edge is full, the next row in; a room full to its walls (a classroom) gets it on a landing just outside.
 */
function padSpot(fp: FloorPlan | undefined, k: number, sp: number, width: number, depth: number): { x: number; z: number } {
  const hx = STATION_PAD.x / 2 + 0.4;
  const hz = STATION_PAD.z / 2 + 0.4;
  const edge = depth / 2 - hz - 0.3;
  const area = fp ? fp.size.x * fp.size.z : 0;
  const boxes = (fp?.items ?? []).flatMap((it) => {
    const d = model(it.model);
    if (d.size.x * d.size.z > area * 0.6) return [];
    const turned = Math.abs(Math.sin(it.rot ?? 0)) > 0.7;
    return [{ x: it.x * sp, z: it.z * sp, ax: ((turned ? d.size.z : d.size.x) * k) / 2, az: ((turned ? d.size.x : d.size.z) * k) / 2 }];
  });
  const free = (x: number, z: number) => boxes.every((q) => Math.abs(q.x - x) >= q.ax + hx || Math.abs(q.z - z) >= q.az + hz);
  for (let z = edge; z > -depth / 2 + hz; z -= 1)
    for (let a = 0; a <= width / 2 - hx; a += 1) for (const x of a ? [a, -a] : [0]) if (free(x, z)) return { x, z };
  return { x: 0, z: depth / 2 + hz };
}

/** One floor in its level: a full one against the trunk, a compact one out at its branch's tip. */
interface FloorSlot {
  readonly f: TowerSpec["floors"][number];
  /** 1-based, the floor's number in the tower (its area id). */
  readonly fi: number;
  readonly fp?: FloorPlan;
  readonly compact: boolean;
  /** A compact floor's plan, m (its width along its door's edge, its depth away from it). */
  readonly w: number;
  readonly d: number;
}

/** A level of the tree: two full floors on opposite sides, or up to four compact ones, one on each side. */
export interface TreeLevel {
  readonly compact: boolean;
  readonly slots: readonly FloorSlot[];
}

/** How many full floors a level holds (opposite sides, never one over another), and how many compact ones. */
export const FULL_PER_LEVEL = 2;
export const COMPACT_PER_LEVEL = 4;
/** A compact floor's branch (Berón 2026-11-20: «utilizar ramas en lugar de entradas directas al tronco… pueden nacer
 * en las puntas»): a water tube as wide and tall as a door (half, m) from the trunk out to the floor at the tip. */
export const ROOM_BRANCH = { half: 3.5 } as const;

/**
 * The tower's levels bottom up (Berón 2026-11-20: «el edificio árbol debe mostrar la estructura de árbol y debe ser
 * espacioso… los pisos grandes están reducidos a 2 y los pequeños a 4»): full floors (their plan the tower's) two to
 * a level on opposite sides, pinwheeling so none is over another; compact ones (a classroom, a studio, a dojo) four to
 * a level, one on each side, each at the tip of its own branch, out past the full floors' squares.
 */
export function packFloors(t: Pick<TowerSpec, "floors" | "size">): TreeLevel[] {
  const out: TreeLevel[] = [];
  let cur: FloorSlot[] = [];
  let curCompact = false;
  const close = () => {
    if (cur.length) out.push({ compact: curCompact, slots: cur });
    cur = [];
  };
  t.floors.forEach((f, i) => {
    const fp = f.furnish ? FLOOR_PLANS.get(f.furnish) : undefined;
    const compact = !!fp && (fp.size.x < t.size.x || fp.size.z < t.size.z);
    if (cur.length && (compact !== curCompact || cur.length >= (compact ? COMPACT_PER_LEVEL : FULL_PER_LEVEL))) close();
    curCompact = compact;
    cur.push({ f, fi: i + 1, fp, compact, w: fp ? fp.size.x : 0, d: fp ? fp.size.z : 0 });
  });
  close();
  return out;
}

/** One tree-building (Cold Sanctuary's HelixTower): the trunk, its doors, the floors pinwheeling round it and the tips at the end of their branches. */
function buildTower(b: Built, t: TowerSpec, k: number): void {
  const WH = TREE.waterHalf.value;
  const OH = WH + TREE.wall.value;
  const gap = TREE.levelGap.value;
  const FS = Math.max(t.size.x, t.size.z) * k;
  const door = TREE.door.value;
  const tree = packFloors(t);
  const levels = Math.max(1, tree.length);
  /** Each level's count of compact levels under it (where its compact floors go takes turns). */
  const compactIndex = tree.map((_, i) => tree.slice(0, i).filter((q) => q.compact).length);
  /** The deepest compact floor straight out of the trunk (the second straight place starts past it). */
  const deepest = Math.max(0, ...tree.flatMap((lv) => lv.slots.filter((q) => q.compact).map((q) => q.d * k)));
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
  const shape: TowerShape = { id: t.id, building: t.building, x: o.x, z: o.z, rootHeight, floors: [], tips: [], rings: [], ground: { out: { x: o.x + gOut.x, z: o.z + gOut.z }, inner: { x: o.x + gIn.x, z: o.z + gIn.z } } };
  let tipIndex = 0;
  for (let l = 1; l <= levels; l++) {
    const y = levelY(l);
    const lev = tree[l - 1];
    const floorSides = lev?.compact ? [0, 1, 2, 3] : l % 2 === 1 ? [0, 2] : [1, 3];
    // A level of compact floors has them at its tips: no orchard tips there.
    const branchSides = lev?.compact ? [] : l % 2 === 1 ? [1, 3] : [0, 2];
    for (const [si, s] of floorSides.entries()) {
      const slot = lev?.slots[si];
      if (!slot) continue;
      const { f, fi, fp } = slot;
      const y = levelY(l);
      const area = `${t.id}:piso-${fi}`;
      // A full floor is the tower's square against the trunk; a compact one its own plan at the end of its branch, out
      // past the full squares (Berón 2026-11-20: «pueden nacer en las puntas… una media de 1 rama torcida por cada 2
      // rectas, distribuir las torcidas en vertical»), in one of three places that take turns side after side and level
      // after level, so none is over another and each level has its bent ones on other sides than the next: straight out
      // of the middle of the trunk's face past the full square (its door towards the trunk), straight on one floor
      // further, or at the tip (TowerHelix's: the tip gap out on both axes; one bend, its door back along the branch, −x).
      const q = slot.compact ? (compactIndex[l - 1]! + s) % 3 : -1;
      const sideDoor = q === 1;
      const W = !slot.compact ? FS : sideDoor ? slot.d * k : slot.w * k;
      const D = !slot.compact ? FS : sideDoor ? slot.w * k : slot.d * k;
      const far = OH + FS + t.tipGap;
      const x0 = !slot.compact ? -OH : sideDoor ? FS - OH + t.tipGap : -W / 2;
      const z0 = !slot.compact ? OH : sideDoor ? OH + t.tipGap : q === 0 ? far : far + deepest + t.tipGap;
      const rect = sideRect(S(s), x0, x0 + W, z0, z0 + D, o);
      const sp = spacing({ edificio: t.id, piso: area }, b.o) * k;
      // Its door: Cold Sanctuary picks each floor's (pickDoors); here the nearest to 5 m whose way in is clear. A compact
      // floor's in the middle of the edge its branch comes in by (along z for a side door, along x for a front one).
      const dx = slot.compact ? (sideDoor ? z0 + D / 2 : x0 + W / 2) : fp ? doorFor(fp, sp, k, FS / 2 - OH, OH - door.w / 2, door.x, { edificio: t.id, piso: area }, b.o) : door.x;
      b.floors.push({ id: `${area}`, ...rect, y, area });
      // Where the way in starts in the trunk (a compact floor's: its branch's mouth).
      let mouth = dx;
      if (slot.compact) {
        // The branch, a door-sized water tube out of the trunk along the face's normal: straight to the door, or to
        // the tip's row and across; a lit ring where it leaves the trunk and where it turns.
        const h = ROOM_BRANCH.half;
        const key = `${area}:rama`;
        const tube = (id: string, ax0: number, ax1: number, az0: number, az1: number) => b.waters.push({ id: `${key}-${id}`, ...sideRect(S(s), ax0, ax1, az0, az1, o), yBottom: y, yTop: y + 2 * h, area: key, open: true });
        const ring = (x: number, z: number, along: "x" | "z") => {
          const p = side(S(s), x, z);
          place(b, "aro-rama", o.x + p.x, y, o.z + p.z, (S(s) * Math.PI) / 2 + (along === "x" ? Math.PI / 2 : 0), key, { edificio: t.id }, 1, undefined, false);
        };
        let turn: number, frame: { x: number; z: number }, rack: { x: number; z: number }, corner: { x: number; z: number };
        if (sideDoor) {
          mouth = TREE.mouthX.value;
          tube("a", mouth - h, mouth + h, WH - 0.5, dx + h);
          tube("b", mouth - h, x0, dx - h, dx + h);
          ring(mouth + h + 0.3, dx, "x");
          turn = (S(s) * Math.PI) / 2 + Math.PI / 2;
          frame = { x: x0 - 0.5, z: dx };
          rack = { x: x0 + 0.35, z: dx - h - 1.3 };
          corner = { x: (mouth + x0) / 2, z: dx };
        } else {
          tube("a", mouth - h, mouth + h, WH - 0.5, z0);
          turn = (S(s) * Math.PI) / 2;
          frame = { x: dx, z: z0 - 0.5 };
          rack = { x: dx + h + 1.3, z: z0 + 0.35 };
          corner = { x: dx, z: (OH + z0) / 2 };
        }
        ring(mouth, OH + 0.3, "z");
        const mid = side(S(s), corner.x, corner.z);
        b.areas.push({ id: key, label: `Rama de ${f.name || "un piso"}`, desc: sideDoor ? "Tubo de agua del tronco a la punta, con un quiebre: se llega nadando" : "Tubo de agua recto del tronco a la puerta del piso: se llega nadando", building: t.building, x: o.x + mid.x, y, z: o.z + mid.z, detail: "completo" });
        gapsOf[s]!.push({ from: mouth - h, to: mouth + h, y0: y, y1: y + 2 * h });
        // The door at the branch's end, with its frame and the rack of masks beside it.
        const fr = side(S(s), frame.x, frame.z);
        place(b, "marco-puerta-tronco", o.x + fr.x, y, o.z + fr.z, turn, area, { edificio: t.id }, 1, undefined, false);
        const rk = side(S(s), rack.x, rack.z);
        place(b, "perchero-mascaras", o.x + rk.x, y, o.z + rk.z, turn, area, { edificio: t.id }, 1, undefined, false);
      } else {
        b.floors.push({ id: `${area}-umbral`, ...sideRect(S(s), dx - door.w / 2, dx + door.w / 2, WH - 0.6, OH + 0.2, o), y, area });
        gapsOf[s]!.push({ from: dx - door.w / 2, to: dx + door.w / 2, y0: y, y1: y + door.h });
        doorKit(s, dx, y, area);
      }
      (shape.floors as TowerShape["floors"][number][]).push({ rect, y, name: f.name || "Piso libre" });
      // The floor's own frame: centre of the square, +z away from the trunk.
      const c = side(S(s), x0 + W / 2, z0 + D / 2);
      const centre = { x: o.x + c.x, z: o.z + c.z };
      // In through the door: a full floor's faces the trunk (+z in), a compact one's its branch (+x in).
      const out = sideDoor ? side(S(s), x0 + 3, dx) : side(S(s), dx, z0 + 3);
      const dir = sideDoor ? side(S(s), 1, 0) : side(S(s), 0, 1);
      const entry = { x: o.x + out.x, z: o.z + out.z, yaw: Math.atan2(-dir.x, -dir.z) };
      const inn = side(S(s), mouth, WH - 1.5);
      // Its carpet station: on the plan's outer edge, the free spot nearest the middle (plan frame → the side's).
      const spot = padSpot(fp, k, sp, fp ? fp.size.x * k : FS, fp ? fp.size.z * k : FS);
      const toSide = (x: number, z: number) => (sideDoor ? side(S(s), z, -x) : side(S(s), x, z));
      const pl = toSide(spot.x, spot.z);
      const pad = { x: c.x + pl.x, z: c.z + pl.z };
      // Out past the floor's edge: its landing (a deck as big as the station's pad).
      const floorHalf = (sideDoor ? W : D) / 2;
      if (spot.z + STATION_PAD.z / 2 + 0.4 > floorHalf) {
        const a = toSide(spot.x - STATION_PAD.x / 2 - 0.4, floorHalf);
        const z = toSide(spot.x + STATION_PAD.x / 2 + 0.4, spot.z + STATION_PAD.z / 2 + 0.4);
        b.floors.push({ id: `${area}-rellano-alfombras`, x0: o.x + c.x + Math.min(a.x, z.x), x1: o.x + c.x + Math.max(a.x, z.x), z0: o.z + c.z + Math.min(a.z, z.z), z1: o.z + c.z + Math.max(a.z, z.z), y, area });
      }
      b.areas.push({ id: area, label: f.name || `Piso libre (${t.building})`, desc: f.desc, building: t.building, x: centre.x, y, z: centre.z, detail: fp ? "completo" : "vacio", entry, pad: { x: o.x + pad.x, z: o.z + pad.z }, ...(f.furnish ? { furnish: f.furnish } : {}), link: { tower: t.id, inner: { x: o.x + inn.x, z: o.z + inn.z } } });
      if (!fp) continue;
      // Floor frame (Cold Sanctuary's: x across, z away from the trunk, whose face is at z = −FS/2) = the side's frame
      // about the floor's centre; Unity's yaw carries over as is (the plan keeps Cold Sanctuary's x and z).
      // A compact floor is turned a quarter: its plan's «away from the door» (+z) runs out along the side's +x.
      const turn = (S(s) * Math.PI) / 2 + (sideDoor ? Math.PI / 2 : 0);
      for (const it of fp.items) {
        const p = sideDoor ? side(S(s), it.z * sp, -it.x * sp) : side(S(s), it.x * sp, it.z * sp);
        place(b, it.model, centre.x + p.x, y + (it.y ?? 0), centre.z + p.z, turn + (it.rot ?? 0), area, { edificio: t.id, piso: area }, k, it.name);
      }
      if (fp.ring && !slot.compact) {
        // The U ring 8 m up (Levels.cs RingDeck), its balcony against the trunk with its own door, and its things.
        const ry = y + RING.over;
        const ringArea = `${area}:anillo`;
        const hx = FS / 2 - RING.width * RING.inside;
        const ox = hx + RING.width;
        const zb = -FS / 2;
        const cx = FS / 2 - OH;
        const cz = OH + FS / 2;
        const deck = (x0: number, x1: number, z0: number, z1: number, id: string) => b.floors.push({ id: `${ringArea}-${id}`, ...sideRect(S(s), cx + x0, cx + x1, cz + z0, cz + z1, o), y: ry, area: ringArea });
        deck(-ox, ox, hx, hx + RING.width, "frente");
        deck(hx, ox, zb, hx, "ala-1");
        deck(-ox, -hx, zb, hx, "ala-2");
        deck(-hx, hx, zb, zb + RING.balcony, "balcon");
        b.floors.push({ id: `${ringArea}-umbral`, ...sideRect(S(s), dx - door.w / 2, dx + door.w / 2, WH - 0.6, OH + 0.2, o), y: ry, area: ringArea });
        gapsOf[s]!.push({ from: dx - door.w / 2, to: dx + door.w / 2, y0: ry, y1: ry + door.h });
        doorKit(s, dx, ry, ringArea);
        (shape.rings as TowerShape["rings"][number][]).push({ rects: [[-ox, ox, hx, hx + RING.width], [hx, ox, zb, hx], [-ox, -hx, zb, hx], [-hx, hx, zb, zb + RING.balcony]].map(([x0, x1, z0, z1]) => sideRect(S(s), cx + x0!, cx + x1!, cz + z0!, cz + z1!, o)), y: ry });
        b.areas.push({ id: ringArea, label: `Anillo de ${f.name}`, desc: "Anillo en U a 8 m sobre el piso: se llega nadando por su puerta del tronco", building: t.building, x: centre.x, y: ry, z: centre.z, detail: "completo", entry: (() => { const q = side(S(s), dx, OH + 1.5); return { x: o.x + q.x, z: o.z + q.z, yaw: entry.yaw }; })(), pad: (() => { const q = side(S(s), 0, hx + RING.width / 2); return { x: centre.x + q.x, z: centre.z + q.z }; })(), link: { tower: t.id, inner: { x: o.x + inn.x, z: o.z + inn.z } } });
        for (const it of fp.ring) {
          const p = side(S(s), it.x * sp, it.z * sp);
          place(b, it.model, centre.x + p.x, ry, centre.z + p.z, turn + (it.rot ?? 0), ringArea, { edificio: t.id, piso: area }, k, it.name);
        }
      }
    }
    for (const s of branchSides) {
      const th = TREE.tubeHalf.value;
      const mx = TREE.mouthX.value;
      const ts = TREE.tipSize.value;
      const tipC = { x: FS - OH + t.tipGap + ts / 2, z: OH + t.tipGap + ts / 2 };
      const ch = TREE.colHalf.value;
      const colC = { x: tipC.x - ts / 2 + 1 + ch + 0.3, z: tipC.z - ts / 2 + 1 + ch + 0.3 };
      const ty = tipY(l);
      const key = `${t.id}:rama-${l}-${s}`;
      b.waters.push(
        { id: `${key}-a`, ...sideRect(S(s), mx - th, mx + th, WH - 0.5, colC.z + th, o), yBottom: y, yTop: y + 2 * th, area: key, open: true },
        { id: `${key}-b`, ...sideRect(S(s), mx - th, colC.x + ch, colC.z - th, colC.z + th, o), yBottom: y, yTop: y + 2 * th, area: key, open: true },
        { id: `${key}-c`, ...sideRect(S(s), colC.x - ch, colC.x + ch, colC.z - ch, colC.z + ch, o), yBottom: y, yTop: ty + 1, area: key, open: true },
      );
      gapsOf[s]!.push({ from: mx - th, to: mx + th, y0: y, y1: y + 2 * th });
      // Its lit rings: where it leaves the trunk and where it turns towards the tip's column.
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
  // Carpet parks: on the crown (the roof) and at the foot, out on the ice beside the ground door.
  place(b, "parqueadero-alfombras", o.x, rootHeight, o.z, (S(0) * Math.PI) / 2, `${t.id}:techo`, { edificio: t.id }, 1, `Parqueadero de alfombras de la copa (${t.building})`, false);
  const foot = side(S(0), door.x - door.w / 2 - 7.5, OH + 5);
  place(b, "parqueadero-alfombras", o.x + foot.x, 0, o.z + foot.z, (S(0) * Math.PI) / 2, trunk, { edificio: t.id }, 1, `Parqueadero de alfombras del pie (${t.building})`, false);
  b.towers.push(shape);
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
  if (!solid || d.size.y * sc <= 0.3 || d.shape === "figura") return;
  b.solids.push(...solidsOf(d, x, y, z, rot, plan, sc));
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
 * The door of a furnished floor on the trunk's face (side frame x, within ±`limit`): the nearest to `preferred` with
 * a clear way 1,6 m wide and 9 m deep into the floor. `cx` is the floor centre's x in the side frame.
 */
function doorFor(fp: FloorPlan, sp: number, k: number, cx: number, limit: number, preferred: number, where: { edificio: string; piso: string }, o: Overrides): number {
  const FS = Math.max(fp.size.x, fp.size.z) * k;
  const solids: Solid[] = [];
  for (const it of fp.items) {
    const r = resolve(model(it.model), where, o);
    if (r.oculto) continue;
    const d = model(r.cambiarPor ?? it.model);
    if (d.size.y <= 0.3) continue;
    solids.push(...solidsOf(d, it.x * sp, 0, it.z * sp, it.rot ?? 0, k, r.escala ?? 1));
  }
  const clear = (x: number) => !solids.some((q) => q.x0 < x + 0.8 && q.x1 > x - 0.8 && q.z0 < -FS / 2 + 9 && q.y0 < 1.7);
  for (let d = 0; d <= 2 * limit; d += 0.5)
    for (const x of [preferred + d, preferred - d]) if (Math.abs(x) <= limit && clear(x - cx)) return x;
  return preferred;
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
 * (8 m down) to the lagoon, where it surfaces. Its route is swum both ways.
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
    { x: LAGOON.x, y: -8, z: LAGOON.z, swim: true },
    { x: LAGOON.x, y: WATER_Y - 1.4, z: LAGOON.z, swim: true },
  ];
  return { index, route };
}

/** A deterministic scatter (no Math.random: the same scene on every load). */
function scatter(i: number, radius: number): { x: number; z: number } {
  const a = i * 2.399963;
  const r = radius * Math.sqrt((i + 0.5) / 12);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

export function buildS1Layout(k = 1, o: Overrides = OVERRIDES): S1Layout {
  const b: Built = { o, floors: groundFloors(), waters: [], solids: [], walls: [], instances: [], areas: [], towers: [] };
  b.waters.push({ id: "mar", x0: -4000, x1: 4000, z0: -4000, z1: 4000, yBottom: -40, yTop: WATER_Y, area: "mar" });
  for (const cap of new Set(LOBES.filter((l) => l.r > 0).map(capOf))) {
    const ls = LOBES.filter((l) => l.r > 0 && capOf(l) === cap);
    const big = ls.reduce((a, l) => (l.r > a.r ? l : a));
    b.areas.push({ id: `${ls.some(isLand) ? "tierra" : "hielo"}:${cap}`, label: CAP_NAME[cap] ?? cap, desc: ls.map((l) => l.name.split(":")[1]!.replace(/_/g, " ")).join(", "), x: big.x, y: 0, z: big.z, detail: "vacio" });
  }
  b.areas.push({ id: "mar", label: "La laguna y el mar", desc: "Ballenas, orcas, focas y morsas en la laguna central", x: LAGOON.x, y: WATER_Y, z: LAGOON.z, detail: "completo" });
  for (const t of TOWERS) buildTower(b, t, k);
  // A carpet station on every floor and ring, where its carpets wait (the crown's and the foot's are their parks).
  const park = (area: string, y: number) => b.instances.find((i) => i.model === "parqueadero-alfombras" && i.area === area && Math.abs(i.y - y) < 0.5)!;
  const carpets = carpetStations(b, (id) => {
    const tw = b.towers.find((q) => q.id === id)!;
    const c = park(`${id}:techo`, tw.rootHeight);
    const f = park(`${id}:tronco`, 0);
    return { crown: { x: c.x, y: c.y, z: c.z }, foot: { x: f.x, y: f.y, z: f.z } };
  });
  for (const st of carpets) if (st.kind === "piso") place(b, "estacion-alfombras", st.x, st.y, st.z, Math.atan2(st.out.x, st.out.z), st.area, { edificio: st.tower, piso: st.area }, 1, `Estación de alfombras (${st.label})`, false);
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
  const counts = plan(STAFF.length + 1);
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
      const y = n.marine ? (d.shape === "cetaceo" ? WATER_Y - d.size.y * life.scale * 0.55 : WATER_Y - d.size.y * life.scale * 0.4) : 0;
      place(b, id, n.x + p.x, y, n.z + p.z, i * 1.7, n.marine ? "mar" : "fauna", {}, 1, life.name, false);
      aged(b, id, life);
      wanders(b, id, { x: n.x, z: n.z, r: n.radius, speed: (SPEED[d.shape] ?? 0.8) * Math.sqrt(life.scale), seed: b.instances.length * 31 + 7 });
    }
  }
  // Snow petrels: one colony (no nest in Cold Sanctuary's list: it is ours) on the wild northern cap.
  const pet = counts.get("SnowPetrel") ?? 0;
  const petrels = b.instances.length;
  for (let i = 0; i < pet; i++) {
    const p = scatter(i, 10);
    const life = lifeOf("SnowPetrel", i, pet, petrels);
    place(b, "petrel-niveo", 75 + p.x, 0, 170 + p.z, i, "fauna", {}, 1, life.name, false);
    aged(b, "petrel-niveo", life);
    wanders(b, "petrel-niveo", { x: 75, z: 170, r: 10, speed: SPEED.ave!, seed: b.instances.length * 31 + 7 });
  }
  // The staff on the hub, 2 m apart (ours: where each one goes comes with the workday).
  STAFF.forEach((name, i) => {
    const ring = i < 12 ? 0 : 1;
    const j = ring ? i - 12 : i;
    const n = ring ? STAFF.length - 12 : 12;
    const r = ring ? 7 : 4;
    const a = (j / n) * Math.PI * 2;
    b.instances.push({ model: "persona", x: 5 + Math.cos(a) * r, y: 0, z: -10 + Math.sin(a) * r, rot: -a - Math.PI / 2, area: "hielo:Centro", name });
  });

  // She starts at the gym's door (its floor is the first ported in full).
  const gym = b.areas.find((a) => a.label === "Gimnasio")!;
  const start = { x: gym.entry!.x, y: gym.y, z: gym.entry!.z, yaw: gym.entry!.yaw };
  const submarine = submarineDive(b);
  return { k, world: { floors: b.floors, waters: b.waters, solids: b.solids }, instances: b.instances, areas: b.areas, towers: b.towers, walls: b.walls, carpets, start, ...(submarine ? { submarine } : {}), ...(drifting ? { drift: drifting } : {}) };
}
