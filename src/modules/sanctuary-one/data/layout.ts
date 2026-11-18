import { TREE } from "@modules/aerial-sanctuary/data/facts";
import type { Floor, Rect, Solid, Water, WalkWorld } from "@modules/aerial-sanctuary/domain/walk";
import { wallWithGaps } from "@modules/aerial-sanctuary/domain/walk";
import { CAP_NAME, LAGOON, LOBES, MAP_HALF, NESTS, SPECIES_MODEL, STAFF, TOWERS, WATER_Y, capOf, isLand, lobeRadius, type TowerSpec } from "./site";
import { FLOOR_PLANS, type FloorPlan } from "./floors";
import { RING } from "./floors/kit";
import { bedTip, orchardTip } from "./floors/puntas";
import { landscape } from "./paisaje";
import { model, type ModelDef } from "./catalog";
import { OVERRIDES, resolve, spacing, type Overrides } from "./overrides";
import { GROUPS, plan, split } from "../domain/population";

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
  readonly wander?: { readonly x: number; readonly z: number; readonly r: number; readonly speed: number; readonly seed: number };
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
  floors: Floor[];
  waters: Water[];
  solids: Solid[];
  walls: Solid[];
  instances: Instance[];
  areas: S1Area[];
  towers: TowerShape[];
}

/** One tree-building (Cold Sanctuary's HelixTower): the trunk, its doors, the floors pinwheeling round it and the tips at the end of their branches. */
function buildTower(b: Built, t: TowerSpec, k: number): void {
  const WH = TREE.waterHalf.value;
  const OH = WH + TREE.wall.value;
  const gap = TREE.levelGap.value;
  const FS = Math.max(t.size.x, t.size.z) * k;
  const door = TREE.door.value;
  const levels = Math.ceil(t.floors.length / 2);
  const levelY = (l: number) => t.firstY + (l - 1) * gap;
  const tipY = (l: number) => levelY(l) + TREE.tipRise.value;
  const rootHeight = levelY(levels) + TREE.tipRise.value + TREE.ringH.value + 7;
  const o = { x: t.x, z: t.z };
  const S = (s: number) => s + t.quarter;
  const trunk = `${t.id}:tronco`;
  b.waters.push({ id: `${t.id}-tronco`, ...around(o.x, o.z, WH), yBottom: -1.6, yTop: rootHeight - 0.5, area: trunk });
  b.areas.push({ id: trunk, label: `Tronco de agua (${t.building})`, desc: "Se nada por dentro de piso a piso (ficción de Cold Sanctuary)", building: t.building, x: o.x, y: 0, z: o.z, detail: "completo" });
  const gapsOf: { from: number; to: number; y0: number; y1: number }[][] = [[], [], [], []];
  // Ground door (Cold Sanctuary: GroundSide a = +Z), onto the ice, with its threshold.
  gapsOf[0]!.push({ from: door.x - door.w / 2, to: door.x + door.w / 2, y0: 0, y1: door.h });
  b.floors.push({ id: `${t.id}-umbral-suelo`, ...sideRect(S(0), door.x - door.w / 2, door.x + door.w / 2, WH - 0.6, OH + 0.4, o), y: 0, area: trunk });
  const gOut = side(S(0), door.x, OH + 3);
  const gIn = side(S(0), door.x, WH - 1.5);
  const shape: TowerShape = { id: t.id, building: t.building, x: o.x, z: o.z, rootHeight, floors: [], tips: [], rings: [], ground: { out: { x: o.x + gOut.x, z: o.z + gOut.z }, inner: { x: o.x + gIn.x, z: o.z + gIn.z } } };
  let fi = 0;
  let tipIndex = 0;
  for (let l = 1; l <= levels; l++) {
    const y = levelY(l);
    const floorSides = l % 2 === 1 ? [0, 2] : [1, 3];
    const branchSides = l % 2 === 1 ? [1, 3] : [0, 2];
    for (const s of floorSides) {
      const f = t.floors[fi++];
      if (!f) continue;
      const area = `${t.id}:piso-${fi}`;
      const rect = sideRect(S(s), -OH, FS - OH, OH, OH + FS, o);
      const fp = f.furnish ? FLOOR_PLANS.get(f.furnish) : undefined;
      const sp = spacing({ edificio: t.id, piso: area }, b.o) * k;
      // Its door: Cold Sanctuary picks each floor's (pickDoors); here the nearest to 5 m whose way in is clear.
      const dx = fp ? doorFor(fp, sp, k, FS / 2 - OH, OH - door.w / 2, door.x, { edificio: t.id, piso: area }, b.o) : door.x;
      b.floors.push({ id: `${area}`, ...rect, y, area });
      b.floors.push({ id: `${area}-umbral`, ...sideRect(S(s), dx - door.w / 2, dx + door.w / 2, WH - 0.6, OH + 0.2, o), y, area });
      gapsOf[s]!.push({ from: dx - door.w / 2, to: dx + door.w / 2, y0: y, y1: y + door.h });
      (shape.floors as TowerShape["floors"][number][]).push({ rect, y, name: f.name || "Piso libre" });
      // The floor's own frame: centre of the square, +z away from the trunk.
      const c = side(S(s), FS / 2 - OH, OH + FS / 2);
      const centre = { x: o.x + c.x, z: o.z + c.z };
      const out = side(S(s), dx, OH + 3);
      const dir = side(S(s), 0, 1);
      const entry = { x: o.x + out.x, z: o.z + out.z, yaw: Math.atan2(-dir.x, -dir.z) };
      const inn = side(S(s), dx, WH - 1.5);
      b.areas.push({ id: area, label: f.name || `Piso libre (${t.building})`, desc: f.desc, building: t.building, x: centre.x, y, z: centre.z, detail: fp ? "completo" : "vacio", entry, ...(f.furnish ? { furnish: f.furnish } : {}), link: { tower: t.id, inner: { x: o.x + inn.x, z: o.z + inn.z } } });
      if (!fp) continue;
      // Floor frame (Cold Sanctuary's: x across, z away from the trunk, whose face is at z = −FS/2) = the side's frame
      // about the floor's centre; Unity's yaw carries over as is (the plan keeps Cold Sanctuary's x and z).
      const turn = (S(s) * Math.PI) / 2;
      for (const it of fp.items) {
        const p = side(S(s), it.x * sp, it.z * sp);
        place(b, it.model, centre.x + p.x, y, centre.z + p.z, turn + (it.rot ?? 0), area, { edificio: t.id, piso: area }, k, it.name);
      }
      if (fp.ring) {
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
        (shape.rings as TowerShape["rings"][number][]).push({ rects: [[-ox, ox, hx, hx + RING.width], [hx, ox, zb, hx], [-ox, -hx, zb, hx], [-hx, hx, zb, zb + RING.balcony]].map(([x0, x1, z0, z1]) => sideRect(S(s), cx + x0!, cx + x1!, cz + z0!, cz + z1!, o)), y: ry });
        b.areas.push({ id: ringArea, label: `Anillo de ${f.name}`, desc: "Anillo en U a 8 m sobre el piso: se llega nadando por su puerta del tronco", building: t.building, x: centre.x, y: ry, z: centre.z, detail: "completo", entry: (() => { const q = side(S(s), dx, OH + 1.5); return { x: o.x + q.x, z: o.z + q.z, yaw: entry.yaw }; })() });
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
        { id: `${key}-a`, ...sideRect(S(s), mx - th, mx + th, WH - 0.5, colC.z + th, o), yBottom: y, yTop: y + 2 * th, area: key },
        { id: `${key}-b`, ...sideRect(S(s), mx - th, colC.x + ch, colC.z - th, colC.z + th, o), yBottom: y, yTop: y + 2 * th, area: key },
        { id: `${key}-c`, ...sideRect(S(s), colC.x - ch, colC.x + ch, colC.z - ch, colC.z + ch, o), yBottom: y, yTop: ty + 1, area: key },
      );
      gapsOf[s]!.push({ from: mx - th, to: mx + th, y0: y, y1: y + 2 * th });
      const tip = sideRect(S(s), tipC.x - ts / 2, tipC.x + ts / 2, tipC.z - ts / 2, tipC.z + ts / 2, o);
      const col = sideRect(S(s), colC.x - ch, colC.x + ch, colC.z - ch, colC.z + ch, o);
      const tipArea = `${t.id}:punta-${l}-${s}`;
      for (const r of [R(tip.x0, tip.x1, tip.z0, col.z0), R(tip.x0, tip.x1, col.z1, tip.z1), R(tip.x0, col.x0, col.z0, col.z1), R(col.x1, tip.x1, col.z0, col.z1)])
        if (r.x1 - r.x0 > 0.01 && r.z1 - r.z0 > 0.01) b.floors.push({ id: `${tipArea}-${b.floors.length}`, ...r, y: ty, area: tipArea });
      (shape.tips as TowerShape["tips"][number][]).push({ rect: tip, y: ty });
      // What grows there, in the tip's frame (its side's axes about its centre).
      const colL = { x0: colC.x - ch - tipC.x, x1: colC.x + ch - tipC.x, z0: colC.z - ch - tipC.z, z1: colC.z + ch - tipC.z };
      const crops = t.tip === "Cultivos";
      const tipPlan = crops ? bedTip(ts, colL, tipIndex++) : orchardTip(ts, colL);
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
  const out: Solid[] = [];
  for (const [cx, cy, cz, sx, sy, sz] of d.parts) {
    const y0 = cy - sy / 2;
    const y1 = cy + sy / 2;
    if (y1 <= 0.3 || y0 >= 2) continue;
    out.push(box(cx, cz, sx / 2, sz / 2, y0, y1));
  }
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

  // The landscape: wild caps, tundra and icebergs (paisaje.ts). Icebergs float at the water line and stand as solids.
  for (const it of landscape()) {
    const y = it.sea ? WATER_Y : 0;
    place(b, it.model, it.x, y, it.z, it.rot, it.sea ? "mar" : "paisaje", {}, 1, it.name, !it.sea);
    if (it.sea) {
      const d = model(it.model);
      b.solids.push({ x0: it.x - d.size.x / 2, x1: it.x + d.size.x / 2, z0: it.z - d.size.z / 2, z1: it.z + d.size.z / 2, y0: -40, y1: y + d.size.y });
      // Its visitors (IcebergVisitor: 4 seals and 4 penguins, adults, swimming off its ledge).
      const seals = 2;
      const penguins = 2;
      for (const [id, n, dz] of [["foca", seals, 0], ["pinguino", penguins, 4]] as const)
        for (let i = 0; i < n; i++) {
          const a = model(id);
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
    for (let i = 0; i < qty; i++) {
      const p = scatter(i, n.radius);
      const y = n.marine ? (d.shape === "cetaceo" ? WATER_Y - d.size.y * 0.55 : WATER_Y - d.size.y * 0.4) : 0;
      place(b, id, n.x + p.x, y, n.z + p.z, i * 1.7, n.marine ? "mar" : "fauna", {}, 1, undefined, false);
      wanders(b, id, { x: n.x, z: n.z, r: n.radius, speed: SPEED[d.shape] ?? 0.8, seed: b.instances.length * 31 + 7 });
    }
  }
  // Snow petrels: one colony (no nest in Cold Sanctuary's list: it is ours) on the wild northern cap.
  const pet = counts.get("SnowPetrel") ?? 0;
  for (let i = 0; i < pet; i++) {
    const p = scatter(i, 10);
    place(b, "petrel-niveo", 75 + p.x, 0, 170 + p.z, i, "fauna", {}, 1, undefined, false);
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
  return { k, world: { floors: b.floors, waters: b.waters, solids: b.solids }, instances: b.instances, areas: b.areas, towers: b.towers, walls: b.walls, start };
}
