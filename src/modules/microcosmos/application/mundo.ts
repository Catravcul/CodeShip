/**
 * The Academy as a world to walk (aerial-sanctuary/domain/walk.ts) and the ways people take in it. The data are real
 * metres for a full-size place; the insect-humans are half its size (data/academia.ts INSECT_SCALE), so the walk world
 * and the scene are the place times `K` and the figures keep their usual size: the same proportions, and her walking,
 * jumping and climbing work unchanged.
 */
import { STEP_M, wallWithGaps, type Floor, type Solid, type WalkWorld, type Water } from "@modules/aerial-sanctuary/domain/walk";
import { AGUAS, ALTARES, COSAS_FUERA, EDIFICIOS, ENTRE, HALF, HUBS, INSECT_SCALE, LUGARES, PERIBOLO_MUROS, PUENTES, LUGARES_ABIERTOS, trees, ARBOLES, type Cosa, type Edificio, type Lugar, type Muro } from "../data/academia";

/** World units per real metre of the place. */
export const K = 1 / INSECT_SCALE;
/** The area of the open ground. */
export const AREA = "academia";
/** The footbridges' deck over the ground (m, real). */
const BRIDGE_Y = 0.15;

const scaleRect = (r: { x0: number; x1: number; z0: number; z1: number }) => ({ x0: r.x0 * K, x1: r.x1 * K, z0: r.z0 * K, z1: r.z1 * K });

function wallSolids(m: Muro, y0: number): Solid[] {
  return wallWithGaps({ axis: m.axis, at: m.at * K, from: m.from * K, to: m.to * K, y0: y0 * K, y1: (y0 + m.h) * K, thick: m.t * K, gaps: m.gaps?.map((gp) => ({ from: gp.from * K, to: gp.to * K })) });
}

/** A thing's box on the plan (rotation ignored: the solid ones are set square to the walls). */
function thingSolid(c: Cosa, y0: number): Solid {
  return { x0: (c.x - c.w / 2) * K, x1: (c.x + c.w / 2) * K, z0: (c.z - c.d / 2) * K, z1: (c.z + c.d / 2) * K, y0: (y0 + (c.y ?? 0)) * K, y1: (y0 + (c.y ?? 0) + c.h) * K };
}

/** The walk world (world units). `withTrees`: the trunks stop her (left out to test the ways, which people walk). */
export function academiaWorld(withTrees = true): WalkWorld {
  const floors: Floor[] = [{ id: "suelo", area: AREA, y: 0, x0: -HALF * K, x1: HALF * K, z0: -HALF * K, z1: HALF * K }];
  const solids: Solid[] = [];
  const waters: Water[] = [];
  for (const b of EDIFICIOS) {
    floors.push({ id: b.id, area: b.id, y: b.floor * K, ...scaleRect(b) });
    // A floor higher than a step stands on its plinth (Berón 2026-11-24: «el museo… lo atravesaba caminando»), with
    // steps up to it on its stairs' sides.
    if (b.floor * K > STEP_M) {
      const e = 0.05;
      solids.push({ ...scaleRect({ x0: b.x0 + e, x1: b.x1 - e, z0: b.z0 + e, z1: b.z1 - e }), y0: 0, y1: b.floor * K });
      for (const st of b.stairs ?? []) for (const r of stairRects(b, st)) floors.push({ id: `${b.id}-grada-${r.n}`, area: AREA, y: r.y * K, ...scaleRect(r) });
    }
    for (const m of b.walls) solids.push(...wallSolids(m, b.floor));
    for (const c of b.columns ?? []) solids.push({ x0: (c.x - c.d / 2) * K, x1: (c.x + c.d / 2) * K, z0: (c.z - c.d / 2) * K, z1: (c.z + c.d / 2) * K, y0: b.floor * K, y1: (b.floor + c.h) * K });
    for (const c of b.things) if (c.solid) solids.push(thingSolid(c, b.floor));
  }
  for (const m of PERIBOLO_MUROS) solids.push(...wallSolids(m, 0));
  for (const c of [...ALTARES, ...COSAS_FUERA]) if (c.solid) solids.push(thingSolid(c, 0));
  for (const p of PUENTES) floors.push({ id: p.id, area: AREA, y: BRIDGE_Y * K, ...scaleRect(p) });
  // The channel is open water (the ground's floor does not hold her over it), cut where the footbridges cross it.
  for (const a of AGUAS) {
    if (a.id !== "acequia") {
      // The fountain's basin: its stone rim stops her; she drinks and washes at its edge.
      solids.push({ ...scaleRect(a), y0: 0, y1: 0.8 * K });
      continue;
    }
    const cuts = PUENTES.filter((p) => p.x0 <= a.x0 && p.x1 >= a.x1).sort((p, q) => p.z0 - q.z0);
    let z = a.z0;
    for (const p of [...cuts, { z0: a.z1, z1: a.z1 }]) {
      if (p.z0 > z) waters.push({ id: `${a.id}-${waters.length}`, area: a.id, open: true, yBottom: -a.depth * K, yTop: -0.05 * K, ...scaleRect({ x0: a.x0, x1: a.x1, z0: z, z1: p.z0 }) });
      z = p.z1;
    }
  }
  if (withTrees)
    for (const t of trees()) {
      const r = t.kind === "platano" ? 0.6 : t.kind === "olivo" ? 0.3 : 0.35;
      solids.push({ x0: (t.x - r) * K, x1: (t.x + r) * K, z0: (t.z - r) * K, z1: (t.z + r) * K, y0: 0, y1: ARBOLES[t.kind].h * t.s * K });
    }
  return { floors, waters, solids };
}

/** The steps up a building's side (real metres): each 0,35 m deep and as high as its share of the floor's height. */
export function stairRects(b: Edificio, st: NonNullable<Edificio["stairs"]>[number]): { n: number; y: number; x0: number; x1: number; z0: number; z1: number }[] {
  const n = Math.max(1, Math.ceil(b.floor / 0.2)) - 1;
  const out: { n: number; y: number; x0: number; x1: number; z0: number; z1: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const y = (b.floor * i) / (n + 1);
    // Step i is (n + 1 − i) treads out from the edge.
    const o0 = (n - i) * 0.35;
    const o1 = (n + 1 - i) * 0.35;
    if (st.side === "z1") out.push({ n: i, y, x0: st.from, x1: st.to, z0: b.z1 + o0, z1: b.z1 + o1 });
    else if (st.side === "z0") out.push({ n: i, y, x0: st.from, x1: st.to, z0: b.z0 - o1, z1: b.z0 - o0 });
    else if (st.side === "x1") out.push({ n: i, y, z0: st.from, z1: st.to, x0: b.x1 + o0, x1: b.x1 + o1 });
    else out.push({ n: i, y, z0: st.from, z1: st.to, x0: b.x0 - o1, x1: b.x0 - o0 });
  }
  return out;
}

const inRect = (r: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** Which named place (room, court, open place or water) a point is in (real metres); the open ground otherwise. */
export function zonaAt(x: number, z: number): string {
  for (const b of EDIFICIOS) {
    if (!inRect(b, x, z)) continue;
    for (const c of b.courts ?? []) if (inRect(c, x, z)) return c.id;
    for (const r of b.rooms) if (inRect(r, x, z)) return r.id;
    return b.id;
  }
  for (const a of AGUAS) if (inRect(a, x, z)) return a.id;
  for (const l of LUGARES_ABIERTOS) if (inRect(l, x, z)) return l.id;
  return AREA;
}

/** The label of a place for the HUD. */
export function zonaLabel(id: string): string {
  for (const b of EDIFICIOS) {
    if (b.id === id) return b.label;
    for (const r of [...b.rooms, ...(b.courts ?? [])]) if (r.id === id) return `${b.label} · ${r.label}`;
  }
  for (const l of [...LUGARES_ABIERTOS, ...AGUAS]) if (l.id === id) return l.label;
  return "La Academia";
}

const LUGAR = new Map(LUGARES.map((l) => [l.id, l]));
export function lugar(id: string): Lugar {
  const l = LUGAR.get(id);
  if (!l) throw new Error(`Lugar desconocido: ${id}`);
  return l;
}

/** She is at a story place: within its spread (and a little more) of its point, or in the room it names. */
export function estaEn(id: string, x: number, z: number): boolean {
  const l = LUGAR.get(id);
  if (!l) return false;
  return Math.hypot(x - l.x, z - l.z) <= l.r + 2.5 || zonaAt(x, z) === id;
}

type P = readonly [number, number];
function link(a: Lugar["region"], b: Lugar["region"]): P[] {
  if (a === b) return [];
  const k = `${a}>${b}`;
  if (ENTRE[k]) return [...ENTRE[k]!];
  const back = ENTRE[`${b}>${a}`];
  if (back) return [...back].reverse();
  // fuera ↔ casa: through the gymnasium.
  return [...link(a, "dentro"), ...link("dentro", b)];
}

/** The way from one place to another (real metres), keeping to gates and doors. */
export function ruta(from: string, to: string): P[] {
  const a = lugar(from);
  const b = lugar(to);
  const out: P[] = [[a.x, a.z], ...[...a.path].reverse(), HUBS[a.region], ...link(a.region, b.region), HUBS[b.region], ...b.path, [b.x, b.z]];
  // Drop repeated points.
  return out.filter((p, i) => i === 0 || Math.hypot(p[0] - out[i - 1]![0], p[1] - out[i - 1]![1]) > 1e-6);
}
