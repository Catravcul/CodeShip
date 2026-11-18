import { TREE } from "@modules/aerial-sanctuary/data/facts";
import type { Floor, Rect, Solid, Water, WalkWorld } from "@modules/aerial-sanctuary/domain/walk";
import { wallWithGaps } from "@modules/aerial-sanctuary/domain/walk";
import { CAP_NAME, LAGOON, LOBES, MAP_HALF, NESTS, SPECIES_MODEL, STAFF, TOWERS, WATER_Y, capOf, isLand, lobeRadius, type TowerSpec } from "./site";
import { FLOOR_PLANS } from "./floors";
import { model } from "./catalog";
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
}

export interface TowerShape {
  readonly id: string;
  readonly building: string;
  readonly x: number;
  readonly z: number;
  readonly rootHeight: number;
  readonly floors: readonly { readonly rect: Rect; readonly y: number; readonly name: string }[];
  readonly tips: readonly { readonly rect: Rect; readonly y: number }[];
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
  const shape: TowerShape = { id: t.id, building: t.building, x: o.x, z: o.z, rootHeight, floors: [], tips: [] };
  let fi = 0;
  for (let l = 1; l <= levels; l++) {
    const y = levelY(l);
    const floorSides = l % 2 === 1 ? [0, 2] : [1, 3];
    const branchSides = l % 2 === 1 ? [1, 3] : [0, 2];
    for (const s of floorSides) {
      const f = t.floors[fi++];
      if (!f) continue;
      const area = `${t.id}:piso-${fi}`;
      const rect = sideRect(S(s), -OH, FS - OH, OH, OH + FS, o);
      b.floors.push({ id: `${area}`, ...rect, y, area });
      b.floors.push({ id: `${area}-umbral`, ...sideRect(S(s), door.x - door.w / 2, door.x + door.w / 2, WH - 0.6, OH + 0.2, o), y, area });
      gapsOf[s]!.push({ from: door.x - door.w / 2, to: door.x + door.w / 2, y0: y, y1: y + door.h });
      (shape.floors as TowerShape["floors"][number][]).push({ rect, y, name: f.name || "Piso libre" });
      // The floor's own frame: centre of the square, +z away from the trunk.
      const c = side(S(s), FS / 2 - OH, OH + FS / 2);
      const centre = { x: o.x + c.x, z: o.z + c.z };
      const fp = f.furnish ? FLOOR_PLANS.get(f.furnish) : undefined;
      const out = side(S(s), door.x, OH + 3);
      const dir = side(S(s), 0, 1);
      const entry = { x: o.x + out.x, z: o.z + out.z, yaw: Math.atan2(-dir.x, -dir.z) };
      b.areas.push({ id: area, label: f.name || `Piso libre (${t.building})`, desc: f.desc, building: t.building, x: centre.x, y, z: centre.z, detail: fp ? "completo" : "vacio", entry });
      if (!fp) continue;
      // Floor frame (Cold Sanctuary's: x across, z away from the trunk, whose face is at z = −FS/2) = the side's frame
      // about the floor's centre; Unity's yaw carries over as is (the plan keeps Cold Sanctuary's x and z).
      const turn = (S(s) * Math.PI) / 2;
      const sp = spacing({ edificio: t.id, piso: area }, b.o) * k;
      for (const it of fp.items) {
        const p = side(S(s), it.x * sp, it.z * sp);
        place(b, it.model, centre.x + p.x, y, centre.z + p.z, turn + (it.rot ?? 0), area, { edificio: t.id, piso: area }, k, it.name);
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
      b.areas.push({ id: tipArea, label: `${t.tip} (${t.building}, nivel ${l})`, desc: "Punta al final de una rama de agua: se llega nadando por la rama y su columna", building: t.building, x: (tip.x0 + tip.x1) / 2, y: ty, z: (tip.z0 + tip.z1) / 2, detail: "vacio" });
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
  const hx = (d.size.x * plan * sc) / 2;
  const hz = (d.size.z * plan * sc) / 2;
  const q = Math.abs(Math.sin(rot)) > 0.5;
  b.solids.push({ ...around(x, z, q ? hz : hx, q ? hx : hz), y0: y, y1: y + d.size.y * sc });
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
    }
  }
  // Snow petrels: one colony (no nest in Cold Sanctuary's list: it is ours) on the wild northern cap.
  const pet = counts.get("SnowPetrel") ?? 0;
  for (let i = 0; i < pet; i++) {
    const p = scatter(i, 10);
    place(b, "petrel-niveo", 75 + p.x, 0, 170 + p.z, i, "fauna", {}, 1, undefined, false);
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
