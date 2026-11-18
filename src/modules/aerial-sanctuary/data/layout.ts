import type { Reality } from "@core/reality";
import type { Floor, Rect, Solid, Water, WalkWorld } from "../domain/walk";
import { wallWithGaps } from "../domain/walk";
import type { WayGraph, WayPoint } from "../domain/route";
import type { IslandPad } from "../domain/travel";
import { requiredPadHeight, launchFirstFloorY, type ElevatedThing } from "../domain/launch-height";
import { turbineTopM } from "../domain/energy";
import { CREW_PAD, CROWN, HEIGHT_RULE, HELIDECK_M, SITE, TABLE, TRAINING, TREE, TURBINE, TURBINES, TIDAL_UNITS, STORAGE, SOLAR, FLOORS_KW, ELECTRON, FALCON9_CREW } from "./facts";
import { tablesFor } from "../domain/energy";
import { S3_SOURCES as S } from "./sources";
import { furnishIsland, furnishRoom, type PlacedFixture, type WalkCheck } from "./fixtures";

/**
 * Sanctuary 3 as the scene and the rules see it (docs/design/santuario3-escena.md): the islands, their floors, water
 * and walls, the areas of the Áreas window, the machines she uses, the lifts and the paths she walks by herself.
 * Plan x, z in metres (Cold Sanctuary's coordinates); y up from the sea's datum.
 *
 * Cold Sanctuary's caps keep their sizes and coordinates in the data (Berón, 2026-11-18). The training island is ours,
 * and each of its buildings copies a real facility. The presentation layer («Escala de interiores», src/core/scale.ts)
 * draws every area `k` times bigger on the plan, Cold Sanctuary's too (§2.4): each room about its centre, each cap,
 * the dock and the crew pad about theirs (`Builder.widen`); heights stay true, and the islands keep their places.
 */
export type IslandId = "entrenamiento" | "lanzadera" | "parque" | "muelle" | "plataforma";

export interface IslandDef {
  readonly id: IslandId;
  readonly name: string;
  readonly desc: string;
  readonly reality: Reality;
  readonly source: string;
  /** The ground or deck on the plan. */
  readonly rect: Rect;
  readonly deckY: number;
  readonly pad: IslandPad;
  /** Where she stands when she gets off the craft, and the point of the navigation machine. */
  readonly arrival: string;
  readonly nav: string;
}

export interface AreaDef {
  readonly id: string;
  readonly island: IslandId;
  readonly label: string;
  readonly desc: string;
  readonly reality: Reality;
  readonly centre: { x: number; y: number; z: number };
  readonly half: { x: number; y: number; z: number };
  /** The way point «Ir» takes her to. */
  readonly point: string;
}

export type MachineKind = "navegacion" | "ascensor" | "esterilla" | "puesto";

export interface MachineDef {
  readonly id: string;
  readonly kind: MachineKind;
  readonly island: IslandId;
  readonly area: string;
  readonly label: string;
  readonly what: string;
  /** Where she stands to use it (its action shows within reach of this). */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly point: string;
  readonly lift?: { readonly id: string; readonly stop: number };
  /** For a training post: which one (docs/design/santuario3-iniciacion.md §4.1) and that its challenge is still to come. */
  readonly post?: number;
}

export interface LiftDef {
  readonly id: string;
  readonly island: IslandId;
  readonly building: string;
  readonly x: number;
  readonly z: number;
  readonly half: number;
  readonly stops: readonly { readonly label: string; readonly y: number; readonly point: string }[];
}

/** What the scene draws that is not a plain box: models placed with their data. */
export interface Prop {
  readonly kind:
    | "electron"
    | "falcon9"
    | "crew-tower"
    | "umbilical"
    | "deflector"
    | "tank-lox"
    | "tank-rp1"
    | "turbine"
    | "tidal"
    | "solar-table"
    | "helideck"
    | "carpet-pad"
    | "nav-machine"
    | "mat"
    | "console"
    | "big-screen"
    | "iss-mockup"
    | "centrifuge"
    | "tree"
    | "lift-shaft"
    | "battery"
    | "sign";
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rot?: number;
  readonly size?: { x: number; y: number; z: number };
  readonly label?: string;
  readonly on?: boolean;
  /** For a tree: its trunk height and floors. */
  readonly tree?: TreeShape;
  /** How much the presentation layer widened it on the plan (Cold Sanctuary's areas at «Escala de interiores»). */
  readonly plan?: number;
}

export interface TreeShape {
  readonly building: string;
  readonly rootHeight: number;
  readonly waterTop: number;
  readonly floors: readonly { side: number; y: number; name: string; rect: Rect }[];
  readonly tips: readonly { side: number; y: number; name: string; rect: Rect; column: Rect }[];
  readonly tubes: readonly Water[];
  readonly crownY?: number;
}

/** A box the scene draws (walls, consoles, slabs), with its look. */
export interface Block extends Solid {
  readonly look: string;
}

export interface S3Layout {
  readonly k: number;
  readonly world: WalkWorld;
  readonly islands: readonly IslandDef[];
  readonly areas: readonly AreaDef[];
  readonly machines: readonly MachineDef[];
  readonly lifts: readonly LiftDef[];
  readonly graph: WayGraph;
  readonly props: readonly Prop[];
  readonly blocks: readonly Block[];
  /** The launch crown: its face and why (the height rule). */
  readonly crown: { readonly y: number; readonly why: string; readonly x: number; readonly z: number };
  /** Where she starts: the training island's helipad, at the start of her initiation. */
  readonly start: string;
  /** Footprints of what is inhabited (the safety distances are measured to them). */
  readonly inhabited: readonly { id: string; x0: number; x1: number; z0: number; z1: number }[];
  readonly installedTables: number;
  /** The real equipment, furniture and fixtures of the training island at true size (data/fixtures.ts). */
  readonly fixtures: readonly PlacedFixture[];
  /** Walks that must go through (each sub-room and platform is walkable: reglas.md §2.1). */
  readonly walkChecks: readonly WalkCheck[];
}

// ── Small helpers ──
const R = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
const around = (x: number, z: number, hx: number, hz: number = hx): Rect => R(x - hx, x + hx, z - hz, z + hz);

/** A rectangle minus a hole inside it, as up to four rectangles. */
export function subtract(r: Rect, h: Rect): Rect[] {
  const hx0 = Math.max(r.x0, h.x0);
  const hx1 = Math.min(r.x1, h.x1);
  const hz0 = Math.max(r.z0, h.z0);
  const hz1 = Math.min(r.z1, h.z1);
  if (hx0 >= hx1 || hz0 >= hz1) return [r];
  return [R(r.x0, hx0, r.z0, r.z1), R(hx1, r.x1, r.z0, r.z1), R(hx0, hx1, r.z0, hz0), R(hx0, hx1, hz1, r.z1)].filter((q) => q.x1 - q.x0 > 1e-6 && q.z1 - q.z0 > 1e-6);
}

const subtractAll = (r: Rect, holes: readonly Rect[]): Rect[] => holes.reduce<Rect[]>((acc, h) => acc.flatMap((q) => subtract(q, h)), [r]);

/** A point of a tree side's own frame (x along the face, z out of it) in the building frame (Cold Sanctuary's HelixTower.FromSide). */
const side = (s: number, x: number, z: number): { x: number; z: number } => {
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
};
const sideRect = (s: number, x0: number, x1: number, z0: number, z1: number, o: { x: number; z: number }): Rect => {
  const a = side(s, x0, z0);
  const b = side(s, x1, z1);
  return R(a.x + o.x, b.x + o.x, a.z + o.z, b.z + o.z);
};

/** The sea: everywhere under the decks. */
export const SEA_Y = -0.6;
const SEA: Water = { id: "mar", x0: -4000, x1: 4000, z0: -4000, z1: 4000, yBottom: -40, yTop: SEA_Y, area: "mar" };

class Builder {
  readonly floors: Floor[] = [];
  readonly waters: Water[] = [SEA];
  readonly solids: Solid[] = [];
  readonly blocks: Block[] = [];
  readonly points: WayPoint[] = [];
  readonly links: [string, string][] = [];
  readonly areas: AreaDef[] = [];
  readonly machines: MachineDef[] = [];
  readonly lifts: LiftDef[] = [];
  readonly props: Prop[] = [];
  readonly fixtures: PlacedFixture[] = [];
  readonly walkChecks: WalkCheck[] = [];
  private n = 0;

  floor(area: string, y: number, r: Rect, id = `f${this.n++}`): void {
    this.floors.push({ id, area, y, ...r });
  }
  water(w: Water): void {
    this.waters.push(w);
  }
  solid(s: Solid): void {
    this.solids.push(s);
  }
  /** A fixture, and its box as a solid when she cannot go through it. */
  fixture(f: PlacedFixture, solids: readonly Solid[] = []): void {
    this.fixtures.push(f);
    for (const s of solids) this.solids.push(s);
  }
  walkCheck(c: WalkCheck): void {
    this.walkChecks.push(c);
  }
  /** Cut a hole in an area's floors at height y (a sunken row of consoles, a pit). */
  cut(area: string, y: number, hole: Rect): void {
    for (let i = this.floors.length - 1; i >= 0; i--) {
      const f = this.floors[i]!;
      if (f.area !== area || Math.abs(f.y - y) > 1e-6) continue;
      const parts = subtract(f, hole);
      if (parts.length === 1 && parts[0] === f) continue;
      this.floors.splice(i, 1, ...parts.map((r, j) => ({ ...r, id: `${f.id}-${j}`, area: f.area, y: f.y })));
    }
  }
  block(look: string, s: Solid, solid = true): void {
    this.blocks.push({ ...s, look });
    if (solid) this.solids.push(s);
  }
  point(id: string, x: number, y: number, z: number, lift?: WayPoint["lift"]): string {
    this.points.push(lift ? { id, x, y, z, lift } : { id, x, y, z });
    return id;
  }
  link(...ids: string[]): void {
    for (let i = 0; i + 1 < ids.length; i++) this.links.push([ids[i]!, ids[i + 1]!]);
  }
  area(a: AreaDef): void {
    this.areas.push(a);
  }
  /** Where every list stands now: what is added after it can be widened with `widen`. */
  mark(): Record<"floors" | "waters" | "solids" | "blocks" | "points" | "areas" | "machines" | "lifts" | "props", number> {
    return { floors: this.floors.length, waters: this.waters.length, solids: this.solids.length, blocks: this.blocks.length, points: this.points.length, areas: this.areas.length, machines: this.machines.length, lifts: this.lifts.length, props: this.props.length };
  }
  /**
   * The presentation layer's scale (§2.4) on what was built since `m`: the plan (x, z) `k` times wider about `o`,
   * heights unchanged. Uniform on the plan, so whatever was walkable stays walkable and nothing goes through anything.
   */
  widen(m: ReturnType<Builder["mark"]>, o: { x: number; z: number }, k: number): void {
    if (k === 1) return;
    const X = (x: number) => o.x + (x - o.x) * k;
    const Z = (z: number) => o.z + (z - o.z) * k;
    const rect = <T extends Rect>(r: T): T => ({ ...r, x0: X(r.x0), x1: X(r.x1), z0: Z(r.z0), z1: Z(r.z1) });
    const each = <T>(list: T[], from: number, f: (t: T) => T) => {
      for (let i = from; i < list.length; i++) list[i] = f(list[i]!);
    };
    each(this.floors, m.floors, rect);
    each(this.waters, m.waters, rect);
    each(this.solids, m.solids, rect);
    each(this.blocks, m.blocks, rect);
    each(this.points, m.points, (p) => ({ ...p, x: X(p.x), z: Z(p.z) }));
    each(this.areas, m.areas, (a) => ({ ...a, centre: { ...a.centre, x: X(a.centre.x), z: Z(a.centre.z) }, half: { ...a.half, x: a.half.x * k, z: a.half.z * k } }));
    each(this.machines, m.machines, (q) => ({ ...q, x: X(q.x), z: Z(q.z) }));
    each(this.lifts, m.lifts, (l) => ({ ...l, x: X(l.x), z: Z(l.z), half: l.half * k }));
    each(this.props, m.props, (p) => ({
      ...p,
      x: X(p.x),
      z: Z(p.z),
      plan: k,
      ...(p.size ? { size: { x: p.size.x * k, y: p.size.y, z: p.size.z * k } } : {}),
      ...(p.tree ? { tree: { ...p.tree, floors: p.tree.floors.map((f) => ({ ...f, rect: rect(f.rect) })), tips: p.tree.tips.map((f) => ({ ...f, rect: rect(f.rect), column: rect(f.column) })), tubes: p.tree.tubes.map(rect) } } : {}),
    }));
  }
  machine(m: Omit<MachineDef, "point">, link: string): string {
    const p = this.point(`m:${m.id}`, m.x, m.y, m.z, m.lift);
    this.machines.push({ ...m, point: p });
    if (link !== p) this.link(link, p);
    return p;
  }
}

// ── The tree-buildings (Cold Sanctuary's HelixTower, with all their magic) ──
interface TreeSpec {
  readonly id: string;
  readonly island: IslandId;
  readonly building: string;
  readonly site: { x: number; z: number };
  readonly firstY: number;
  /** Names of the floors: level 1 sides a, c; level 2 sides b, d. */
  readonly floors: readonly [string, string, string, string];
  readonly floorDesc: readonly [string, string, string, string];
  readonly tip: string;
  /** A machine on some floors (by index, as `floors`): a training post there. */
  readonly floorMachines?: readonly (Omit<MachineDef, "island" | "area" | "x" | "y" | "z" | "point"> | undefined)[];
  /** The launch crown on the roof (the launch tree). */
  readonly crownRise?: number;
  /** Way point on the cap by the trunk's ground door. */
  readonly groundLink: string;
}

const CAB = 1.2;
const WALK = 0.6;

function buildTree(b: Builder, t: TreeSpec): { roofY: number; crownY?: number; shape: TreeShape } {
  const WH = TREE.waterHalf.value;
  const OH = WH + TREE.wall.value;
  const gap = TREE.levelGap.value;
  const FS = TREE.floorSize.value;
  const door = TREE.door.value;
  const levelY = (l: number) => t.firstY + (l - 1) * gap;
  const tipY = (l: number) => levelY(l) + TREE.tipRise.value;
  const rootHeight = levelY(2) + TREE.tipRise.value + TREE.ringH.value + 7;
  const waterTop = rootHeight - 0.5;
  const o = t.site;
  const trunk = `${t.id}:tronco`;
  b.water({ id: `${t.id}-tronco`, ...around(o.x, o.z, WH), yBottom: -30, yTop: waterTop, area: trunk });
  b.area({ id: trunk, island: t.island, label: `Tronco de agua (${t.building})`, desc: "El tronco de agua del edificio-árbol: se nada por dentro de piso a piso, y por él sube el ascensor en su cabina estanca (ficción de Cold Sanctuary)", reality: "ficcion", centre: { x: o.x, y: rootHeight / 2, z: o.z }, half: { x: WH, y: rootHeight / 2, z: WH }, point: `${t.id}:L0` });

  // The lift's shaft, by Cold Sanctuary's pad stop (−7, −7) so the flame hole stays free.
  const cab = { x: o.x - 7, z: o.z - 7 };
  const P0 = { x: cab.x + 1.9, z: cab.z + 1.9 };
  const stops: { label: string; y: number; point: string }[] = [];
  const landing = (y: number, label: string, area: string) => {
    const i = stops.length;
    b.floor(area, y, R(cab.x + CAB, cab.x + 2.5, cab.z - CAB, cab.z + 2.5));
    b.floor(area, y, R(cab.x - CAB, cab.x + 2.5, cab.z + CAB, cab.z + 2.5));
    const id = b.machine({ id: `${t.id}-ascensor-${i}`, kind: "ascensor", island: t.island, area, label: `Ascensor: ${label}`, what: `Cabina estanca del tronco (${t.building}): andén, pisos, techo${t.crownRise ? " y plataforma" : ""}`, x: P0.x, y, z: P0.z, lift: { id: t.id, stop: i } }, `m:${t.id}-ascensor-${i}`);
    stops.push({ label, y, point: id });
    return id;
  };
  /** A gangway from the landing to a door on the trunk's inner face, and the door's way points. */
  const gangway = (y: number, s: number, area: string, from: string, key: string): string => {
    const dIn = side(s, door.x, WH - 0.6);
    const D = { x: o.x + dIn.x, z: o.z + dIn.z };
    const zFace = s % 2 === 0;
    if (zFace) {
      b.floor(trunk, y, R(P0.x - WALK, D.x + (D.x > P0.x ? WALK : -WALK), P0.z - WALK, P0.z + WALK));
      b.floor(trunk, y, R(D.x - WALK, D.x + WALK, P0.z, D.z + (D.z > P0.z ? WALK : -WALK)));
    } else {
      b.floor(trunk, y, R(P0.x - WALK, P0.x + WALK, P0.z, D.z + (D.z > P0.z ? WALK : -WALK)));
      b.floor(trunk, y, R(P0.x, D.x + (D.x > P0.x ? WALK : -WALK), D.z - WALK, D.z + WALK));
    }
    // The threshold through the acrylic wall (the door's magnetic field keeps the water in).
    b.floor(area, y, sideRect(s, door.x - door.w / 2, door.x + door.w / 2, WH - 0.6, OH + 0.2, o));
    const corner = zFace ? { x: D.x, z: P0.z } : { x: P0.x, z: D.z };
    const c = b.point(`${key}:esquina`, corner.x, y, corner.z);
    const inner = b.point(`${key}:dentro`, D.x, y, D.z);
    const out = side(s, door.x, OH + 3);
    const outer = b.point(`${key}:fuera`, o.x + out.x, y, o.z + out.z);
    b.link(from, c, inner, outer);
    return outer;
  };

  // Walls of the trunk: each face with its doors and branch mouths (gaps), from under the sea to the roof.
  const gapsOf: { from: number; to: number; y0: number; y1: number }[][] = [[], [], [], []];
  const floorsShape: TreeShape["floors"][number][] = [];
  const tipsShape: TreeShape["tips"][number][] = [];
  const tubes: Water[] = [];
  // Ground door (side c), onto the cap.
  gapsOf[2]!.push({ from: door.x - door.w / 2, to: door.x + door.w / 2, y0: 0, y1: door.h });
  const L0 = landing(0, "Andén", `${t.island}:casquete`);
  const groundOut = gangway(0, 2, `${t.island}:casquete`, L0, `${t.id}:suelo`);
  b.link(groundOut, t.groundLink);
  b.point(`${t.id}:L0`, P0.x, 0, P0.z);
  b.link(`${t.id}:L0`, L0);

  let floorIdx = 0;
  for (const l of [1, 2]) {
    const y = levelY(l);
    const floorSides = l % 2 === 1 ? [0, 2] : [1, 3];
    const branchSides = l % 2 === 1 ? [1, 3] : [0, 2];
    const Ll = landing(y, `Nivel ${l}`, trunk);
    for (const s of floorSides) {
      const name = t.floors[floorIdx]!;
      const desc = t.floorDesc[floorIdx]!;
      floorIdx++;
      const area = `${t.id}:piso-${l}-${s}`;
      const rect = sideRect(s, -OH, FS - OH, OH, OH + FS, o);
      b.floor(area, y, rect);
      floorsShape.push({ side: s, y, name, rect });
      gapsOf[s]!.push({ from: door.x - door.w / 2, to: door.x + door.w / 2, y0: y, y1: y + door.h });
      const outer = gangway(y, s, area, Ll, `${t.id}:p${l}${s}`);
      const mid = side(s, door.x, OH + FS / 2);
      const centre = b.point(`${area}:centro`, o.x + mid.x, y, o.z + mid.z);
      b.link(outer, centre);
      const fm = t.floorMachines?.[floorIdx - 1];
      if (fm) {
        const mp = side(s, door.x - 4, OH + FS / 2);
        b.machine({ ...fm, island: t.island, area, x: o.x + mp.x, y, z: o.z + mp.z }, centre);
      }
      b.area({ id: area, island: t.island, label: `${name} (${t.building}, nivel ${l})`, desc, reality: "ficcion", centre: { x: (rect.x0 + rect.x1) / 2, y: y + 3, z: (rect.z0 + rect.z1) / 2 }, half: { x: (rect.x1 - rect.x0) / 2, y: 3, z: (rect.z1 - rect.z0) / 2 }, point: centre });
    }
    // Branches: a square water tube out of the face that turns right to the tip's column; the tip is a field on top.
    for (const s of branchSides) {
      const th = TREE.tubeHalf.value;
      const mx = TREE.mouthX.value;
      const ts = TREE.tipSize.value;
      const tipC = { x: FS - OH + TREE.tipGap.value + ts / 2, z: OH + TREE.tipGap.value + ts / 2 };
      const colC = { x: tipC.x - ts / 2 + 1 + TREE.colHalf.value + 0.3, z: tipC.z - ts / 2 + 1 + TREE.colHalf.value + 0.3 };
      const ch = TREE.colHalf.value;
      const ty = tipY(l);
      const key = `${t.id}:rama-${l}-${s}`;
      const tube1: Water = { id: `${key}-a`, ...sideRect(s, mx - th, mx + th, WH - 0.5, colC.z + th, o), yBottom: y, yTop: y + 2 * th, area: key };
      const tube2: Water = { id: `${key}-b`, ...sideRect(s, mx - th, colC.x + ch, colC.z - th, colC.z + th, o), yBottom: y, yTop: y + 2 * th, area: key };
      const column: Water = { id: `${key}-c`, ...sideRect(s, colC.x - ch, colC.x + ch, colC.z - ch, colC.z + ch, o), yBottom: y, yTop: ty + 1, area: key };
      for (const w of [tube1, tube2, column]) {
        b.water(w);
        tubes.push(w);
      }
      gapsOf[s]!.push({ from: mx - th, to: mx + th, y0: y, y1: y + 2 * th });
      const tipArea = `${t.id}:punta-${l}-${s}`;
      const tipRect = sideRect(s, tipC.x - ts / 2, tipC.x + ts / 2, tipC.z - ts / 2, tipC.z + ts / 2, o);
      const colRect: Rect = { x0: column.x0, x1: column.x1, z0: column.z0, z1: column.z1 };
      for (const r of subtract(tipRect, colRect)) b.floor(tipArea, ty, r);
      tipsShape.push({ side: s, y: ty, name: t.tip, rect: tipRect, column: colRect });
      // The swim: from the landing into the trunk, out of the mouth, along the tube, up the column, onto the field.
      const pm = side(s, mx, WH - 2);
      const p1 = side(s, mx, colC.z);
      const p2 = side(s, colC.x, colC.z);
      const pf = side(s, tipC.x + ts / 2 - 3, tipC.z + ts / 2 - 3);
      const a = b.point(`${key}:boca`, o.x + pm.x, y + 1, o.z + pm.z);
      const bb = b.point(`${key}:codo`, o.x + p1.x, y + 1, o.z + p1.z);
      const c = b.point(`${key}:columna`, o.x + p2.x, y + 1, o.z + p2.z);
      const d = b.point(`${key}:arriba`, o.x + p2.x, ty - 0.6, o.z + p2.z);
      const e = b.point(`${tipArea}:centro`, o.x + pf.x, ty, o.z + pf.z);
      b.link(Ll, a, bb, c, d, e);
      b.area({ id: tipArea, island: t.island, label: `${t.tip} (${t.building}, nivel ${l})`, desc: "Campo de punta al final de una rama de agua: se llega nadando por la rama y subiendo por su columna (ficción de Cold Sanctuary)", reality: "ficcion", centre: { x: (tipRect.x0 + tipRect.x1) / 2, y: ty + 2, z: (tipRect.z0 + tipRect.z1) / 2 }, half: { x: ts / 2, y: 2, z: ts / 2 }, point: e });
    }
  }
  for (let s = 0; s < 4; s++) {
    const g = gapsOf[s]!;
    // Each face, in bands of height so a doorway is a hole: the wall is cut into horizontal bands at every gap edge.
    const ys = [...new Set([-3, rootHeight, ...g.flatMap((q) => [q.y0, q.y1])])].sort((p, q) => p - q);
    for (let i = 0; i + 1 < ys.length; i++) {
      const y0 = ys[i]!;
      const y1 = ys[i + 1]!;
      const inBand = g.filter((q) => q.y0 <= y0 + 1e-6 && q.y1 >= y1 - 1e-6).map((q) => ({ from: q.from, to: q.to }));
      // The face in its side frame: z = WH + wall/2, x from −OH to OH; turned to the building frame.
      for (const piece of wallWithGaps({ axis: "x", at: WH + 0.5, from: -OH, to: OH, y0, y1, thick: 1, gaps: inBand })) {
        const r = sideRect(s, piece.x0, piece.x1, piece.z0, piece.z1, o);
        b.block("acrilico", { ...r, y0, y1 });
      }
    }
  }
  // The roof, over the trunk (the cab comes up through it).
  const roof = `${t.id}:techo`;
  for (const r of subtract(around(o.x, o.z, OH), around(cab.x, cab.z, CAB))) b.floor(roof, rootHeight, r);
  const Lr = landing(rootHeight, "El techo", roof);
  const roofView = b.point(`${roof}:centro`, o.x + 4, rootHeight, o.z + 4);
  b.link(Lr, roofView);
  b.area({ id: roof, island: t.island, label: `Techo (${t.building})`, desc: "El techo del tronco, sobre el agua", reality: "ficcion", centre: { x: o.x, y: rootHeight + 1, z: o.z }, half: { x: OH, y: 1, z: OH }, point: roofView });
  let crownY: number | undefined;
  if (t.crownRise) {
    crownY = rootHeight + t.crownRise;
    const pad = `${t.id}:plataforma`;
    const sl = CROWN.slab.value;
    for (const r of subtractAll(around(o.x, o.z, sl.half), [around(o.x, o.z, sl.hole), around(cab.x, cab.z, CAB)])) b.floor(pad, crownY, r);
    b.block("hormigon", { ...around(o.x, o.z, sl.half), y0: crownY - sl.thick, y1: crownY - 0.05 }, false);
    // The crown's pillars from the roof, the deluge tank, the umbilical tower, the shield and the rocket on its table.
    const p = CROWN.pillars.value;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) b.block("hormigon", { ...around(o.x + sx * p.at, o.z + sz * p.at, p.size / 2), y0: rootHeight, y1: crownY - sl.thick });
    const dt = CROWN.delugeTank.value;
    b.block("deposito", { ...around(o.x + dt.x, o.z + dt.z, dt.w / 2), y0: crownY, y1: crownY + dt.h });
    b.block("escudo", { ...R(o.x + sl.half, o.x + sl.half + 1.5, o.z - sl.half, o.z + sl.half), y0: crownY, y1: crownY + CROWN.shieldM.value });
    b.block("cubeta", { ...R(o.x - sl.half, o.x + sl.half, o.z + sl.half - 0.5, o.z + sl.half), y0: crownY, y1: crownY + 1.5 });
    b.block("cubeta", { ...R(o.x - sl.half, o.x - sl.half + 0.5, o.z - sl.half, o.z + sl.half), y0: crownY, y1: crownY + 1.5 });
    b.block("torre-umbilical", { ...around(o.x + 4.5, o.z - 4.5, 1), y0: crownY, y1: crownY + CROWN.umbilicalM.value }, true);
    b.block("cohete", { ...around(o.x, o.z, ELECTRON.diameterM.value / 2 + 0.1), y0: crownY, y1: crownY + ELECTRON.heightM.value + 1.2 }, false);
    b.solids.push({ ...around(o.x, o.z, 2.2), y0: crownY - 0.1, y1: crownY + 20 });
    b.props.push({ kind: "electron", x: o.x, y: crownY + 1.2, z: o.z, label: "Electron" });
    b.props.push({ kind: "umbilical", x: o.x + 4.5, y: crownY, z: o.z - 4.5 });
    b.props.push({ kind: "deflector", x: o.x, y: crownY, z: o.z });
    const Lp = landing(crownY, "Plataforma de lanzamiento", pad);
    const look = b.point(`${pad}:mirador`, o.x - 7, crownY, o.z + 6);
    b.link(Lp, look);
    b.area({ id: pad, island: t.island, label: "Plataforma de lanzamiento (corona)", desc: `La corona sobre el techo, con el Electron en su mesa: deflector, trinchera, diluvio, cubeta y escudo. Regla de altura de Cold Sanctuary (ficción): ningún pad real está en alto`, reality: "ficcion", centre: { x: o.x, y: crownY + 5, z: o.z }, half: { x: sl.half, y: 5, z: sl.half }, point: look });
  }
  b.lifts.push({ id: t.id, island: t.island, building: t.building, x: cab.x, z: cab.z, half: CAB, stops });
  // The lift: consecutive stops are linked (ridden, not walked).
  for (let i = 0; i + 1 < stops.length; i++) b.link(stops[i]!.point, stops[i + 1]!.point);
  b.props.push({ kind: "tree", x: o.x, y: 0, z: o.z, tree: { building: t.building, rootHeight, waterTop, floors: floorsShape, tips: tipsShape, tubes, crownY } });
  b.props.push({ kind: "lift-shaft", x: cab.x, y: 0, z: cab.z, size: { x: CAB * 2, y: crownY ?? rootHeight, z: CAB * 2 } });
  return { roofY: rootHeight, crownY, shape: { building: t.building, rootHeight, waterTop, floors: floorsShape, tips: tipsShape, tubes, crownY } };
}

/** A cap of Cold Sanctuary: square deck on the sea, a parapet with a gap, a hole for the trunk. */
function buildCap(b: Builder, island: IslandId, c: { x: number; z: number }, half: number, holeHalf: number, gapSide: "e" | "n"): void {
  const area = `${island}:casquete`;
  for (const r of subtract(around(c.x, c.z, half), around(c.x, c.z, holeHalf))) b.floor(area, 0, r);
  const H = SITE.parapetM.value;
  const sides = [
    { axis: "x" as const, at: c.z + half - 0.5, from: c.x - half, to: c.x + half, gap: gapSide === "n" },
    { axis: "x" as const, at: c.z - half + 0.5, from: c.x - half, to: c.x + half, gap: false },
    { axis: "z" as const, at: c.x + half - 0.5, from: c.z - half, to: c.z + half, gap: gapSide === "e" },
    { axis: "z" as const, at: c.x - half + 0.5, from: c.z - half, to: c.z + half, gap: false },
  ];
  for (const s of sides) {
    const mid = (s.from + s.to) / 2;
    for (const w of wallWithGaps({ axis: s.axis, at: s.at, from: s.from, to: s.to, y0: -3, y1: H, thick: 1, gaps: s.gap ? [{ from: mid - 3, to: mid + 3 }] : [] })) b.block("pretil", w);
  }
}

// ── The training island's buildings (real facilities; interiors drawn k times bigger on the plan) ──
interface RoomItem {
  readonly look: string;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly h: number;
  readonly y0?: number;
  readonly solid?: boolean;
  readonly prop?: Prop["kind"];
}
interface Compartment {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly h: number;
  readonly floorY: number;
  /** Its hatch on its −x («w») or +x («e») end, metres wide (not scaled: it is her body's). */
  readonly hatch: { readonly side: "w" | "e"; readonly width: number };
  readonly reality: Reality;
  /** A shell that is not a box (the Orion capsule): its walls stop her but the scene draws the shell (data/fixtures.ts). */
  readonly shell?: "capsula";
  /** For a compartment with no machine: the way (local) from the door's inside point to its middle. */
  readonly via?: readonly { x: number; z: number }[];
}
interface RoomMachine {
  readonly id: string;
  readonly kind: MachineKind;
  readonly label: string;
  readonly what: string;
  readonly x: number;
  readonly z: number;
  /** In a compartment (its id). */
  readonly inside?: string;
  readonly post?: number;
  /** Way points (local) to reach it from the door's inside point, in order. */
  readonly via?: readonly { x: number; z: number }[];
}
interface RoomDef {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
  readonly reality: Reality;
  readonly centre: { x: number; z: number };
  readonly half: { x: number; z: number };
  readonly height: number;
  readonly door: { readonly side: "n" | "s" | "e" | "w"; readonly at: number; readonly width: number };
  /** How its door's outside point reaches the island's roads: straight to the x = 170 road, or to the z = −5 road. */
  readonly road: "x" | "z";
  readonly pool?: { x: number; z: number; depth: number };
  readonly items?: readonly RoomItem[];
  readonly compartments?: readonly Compartment[];
  readonly machines: readonly RoomMachine[];
}

const ROAD_X = 170;
const ROAD_Z = -5;

const ROOMS: readonly RoomDef[] = [
  {
    id: "nbl",
    label: "Laboratorio de flotabilidad neutra (NBL)",
    desc: "La piscina de la NBL de Houston, 62 × 31 m y 12 m de fondo, con maquetas de la ISS, Dragon y Cygnus en el fondo, sus grúas, la zona de vestirse con los soportes del EMU, los puestos de los buzos, la sala de control con ventanas sobre la piscina y la cámara hiperbárica: paseos espaciales bajo el agua (puestos 3 y 7)",
    reality: "real",
    centre: { x: 95, z: 45 },
    half: { x: 44, z: 28 },
    height: 18,
    door: { side: "s", at: 0, width: 6 },
    road: "z",
    pool: { x: TRAINING.nblPool.value.x, z: TRAINING.nblPool.value.z, depth: TRAINING.nblPool.value.depth },
    items: [{ look: "maqueta", x: 0, z: 0, w: 8.5, d: 4.3, h: 4.3, y0: -12, prop: "iss-mockup" }],
    machines: [
      { id: "nbl-piscina", kind: "puesto", label: "Piscina NBL", what: "El EMU, el lastre de los buzos hasta la flotabilidad neutra y la maqueta en el fondo", x: -10, z: -19, post: 7 },
      { id: "nbl-supervivencia", kind: "puesto", label: "Prueba de natación", what: "3 largos de 25 m, otros 3 con el mono, 10 min flotando; la balsa y el izado", x: 10, z: -19, post: 3 },
    ],
  },
  {
    id: "centrifuga",
    label: "Centrífuga humana",
    desc: "Una centrífuga como la TsF-18 o la de NASTAR: perfiles de lanzamiento, reentrada y aborto de Dragon, en Gx (puesto 5)",
    reality: "real",
    centre: { x: 225, z: 55 },
    half: { x: 22, z: 22 },
    height: 14,
    door: { side: "w", at: -10, width: 3 },
    road: "x",
    items: [
      { look: "maquina", x: 0, z: 0, w: 4, d: 4, h: 4, prop: "centrifuge" },
      { look: "gondola", x: 18, z: 0, w: 3, d: 3, h: 3 },
      { look: "consola", x: -16, z: 12, w: 2.2, d: 0.9, h: 0.76, prop: "console" },
    ],
    machines: [
      { id: "centrifuga-consola", kind: "puesto", label: "Consola de la centrífuga", what: "Programar el perfil de g de un vuelo de Dragon", x: -16, z: 10.6, post: 5, via: [{ x: -19, z: -10 }, { x: -19, z: 10.6 }] },
      { id: "centrifuga-gondola", kind: "puesto", label: "Góndola de la centrífuga", what: "Sentarse en la góndola: Gx sobre el pecho, como en la reentrada", x: 15, z: 0, post: 5, via: [{ x: -19, z: -10 }, { x: 0, z: -10 }, { x: 15, z: -10 }] },
    ],
  },
  {
    id: "svmf",
    label: "Nave de maquetas (SVMF)",
    desc: "Como el edificio 9 de Johnson: maquetas a escala real de la ISS y de Dragon para entrenar sistemas, emergencias y la vida a bordo (puesto 8)",
    reality: "real",
    centre: { x: 95, z: -45 },
    half: { x: 30, z: 18 },
    height: 16,
    door: { side: "n", at: 0, width: 4 },
    road: "z",
    compartments: [
      { id: "svmf-orion", label: "Maqueta de Orion", desc: "La cápsula Orion a escala real (Ø 5,02 m, 3,3 m de alto), en su soporte con la escalera de acceso", x: 20, z: -10, w: 3, d: 3, h: 3.3, floorY: 0.6, hatch: { side: "w", width: 1.1 }, reality: "real", shell: "capsula", via: [{ x: 0, z: 12 }, { x: 15, z: 12 }, { x: 15, z: -10 }] },
      { id: "svmf-destiny", label: "Maqueta de Destiny", desc: "El laboratorio estadounidense a escala real (8,5 m × Ø 4,3 m): sus bastidores y su puesto robótico", x: -12, z: 0, w: TRAINING.destiny.value.length, d: TRAINING.destiny.value.diameter, h: 4.3, floorY: 0.4, hatch: { side: "e", width: 1.3 }, reality: "real" },
      { id: "svmf-dragon", label: "Maqueta de Crew Dragon", desc: "La cápsula a escala real (Ø 4 m): cuatro asientos, las tres pantallas táctiles y los botones bajo la tapa", x: 12, z: 0, w: 4, d: 4, h: 3.5, floorY: 0.6, hatch: { side: "w", width: 1.2 }, reality: "real" },
    ],
    machines: [
      { id: "svmf-destiny-robotica", kind: "puesto", label: "Puesto robótico (maqueta de Destiny)", what: "Mandos del brazo en la maqueta: el reto llega con los puestos de robótica", x: -14.5, z: 0, inside: "svmf-destiny", post: 9, via: [{ x: 0, z: 8 }, { x: -3, z: 8 }, { x: -3, z: 0 }] },
      { id: "svmf-dragon-sim", kind: "puesto", label: "Simulador de Dragon", what: "Las tres pantallas táctiles, los botones bajo la tapa y el tirador EJECT", x: 12.8, z: 0, inside: "svmf-dragon", post: 8, via: [{ x: 0, z: 8 }, { x: 8, z: 8 }, { x: 8, z: 0 }] },
    ],
  },
  {
    id: "control",
    label: "Control de misión",
    desc: "Una sala de control como la FCR-1 de Houston: dieciséis consolas en cuatro filas (la «trinchera» delante, más baja), las cinco pantallas grandes del frente con nueve pequeñas encima, el puesto del director de vuelo y el de CAPCOM. Robótica, telemetría y el diálogo con la tripulación (puestos 9 y 10)",
    reality: "real",
    centre: { x: 215, z: -25 },
    half: { x: 12, z: 10 },
    height: 6,
    door: { side: "s", at: 8, width: 2.4 },
    road: "x",
    // The consoles, the screens and the sunken rows are the room's fixtures (data/fixtures.ts).
    machines: [
      { id: "control-director", kind: "puesto", label: "Puesto del director de vuelo", what: "Telemetría, meteorología y la cuenta atrás", x: -2.5, z: -2.4, post: 10, via: [{ x: 10.6, z: -8.4 }, { x: 10.6, z: -3.4 }, { x: -2.5, z: -3.4 }] },
      { id: "control-robotica", kind: "puesto", label: "Puesto de robótica", what: "Los mandos del brazo robótico en simulador", x: 7.5, z: -2.4, post: 9, via: [{ x: 10.6, z: -8.4 }, { x: 10.6, z: -2.4 }] },
    ],
  },
  {
    id: "gimnasio",
    label: "Gimnasio y vestuarios",
    desc: "El gimnasio de los candidatos (como el de los astronautas en Johnson): cintas, bicicletas, jaulas de sentadillas, mancuernas, remo, poleas, el ARED de entrenamiento, el tapiz y la esterilla de yoga donde se cambian los ajustes generales; vestuarios con taquillas",
    reality: "real",
    centre: { x: 270, z: -25 },
    half: { x: 12, z: 9 },
    height: 4,
    door: { side: "w", at: 0, width: 2 },
    road: "z",
    items: [{ look: "cinta", x: -3, z: 3.5, w: 2, d: 0.9, h: 1.4 }],
    machines: [{ id: "gimnasio-esterilla", kind: "esterilla", label: "Esterilla de yoga", what: "Sentarse en loto: los ajustes generales", x: 3, z: -1.5 }],
  },
  {
    id: "medico",
    label: "Centro médico y de selección",
    desc: "Entrevistas del tribunal, el reconocimiento médico de larga duración (camilla, ECG, ecógrafo, optotipo a 6,1 m, cabina de audiometría), la sala de espera con el archivo y la cámara hipobárica con su esclusa (puestos 1, 2 y 4)",
    reality: "real",
    centre: { x: 95, z: -100 },
    half: { x: 20, z: 9.75 },
    height: 4,
    door: { side: "n", at: 0, width: 2.4 },
    road: "x",
    items: [
      { look: "mesa", x: -9, z: 2, w: 3, d: 1, h: 0.75 },
      { look: "camilla", x: -2, z: 2.5, w: 2, d: 0.8, h: 0.7 },
    ],
    compartments: [{ id: "medico-hipobarica", label: "Cámara hipobárica", desc: "Cámara de baja presión con ventanillas, como las de Sonny Carter: hipoxia y la máscara de O₂", x: 8, z: -1, w: 6, d: 6, h: 2.6, floorY: 0.2, hatch: { side: "w", width: 1 }, reality: "real" }],
    machines: [
      { id: "medico-tribunal", kind: "puesto", label: "Tribunal de selección", what: "Las entrevistas y los requisitos reales de la NASA", x: -9, z: 0.6, post: 1, via: [{ x: 0, z: 4.6 }, { x: -6, z: 4.6 }, { x: -6, z: 0.6 }] },
      { id: "medico-camilla", kind: "puesto", label: "Reconocimiento médico", what: "Tensión, ECG y báscula: las constantes fuera de rango, con forma y color", x: -2, z: 1.2, post: 2, via: [{ x: 0, z: 4.6 }, { x: 0, z: 1.2 }] },
      { id: "medico-hipobarica", kind: "puesto", label: "Cámara hipobárica", what: "Bajar la presión por etapas y ponerse la máscara a tiempo", x: 9, z: -1, inside: "medico-hipobarica", post: 4, via: [{ x: 0, z: 4.6 }, { x: 2.5, z: 4.6 }, { x: 2.5, z: -1 }] },
    ],
  },
  {
    id: "supervivencia",
    label: "Supervivencia en el agua",
    desc: "Como la piscina del Naval Survival Training Institute de Pensacola: el simulador de amerizaje de helicóptero (METS), la balsa salvavidas y el izado con el collar de rescate",
    reality: "real",
    centre: { x: 260, z: -85 },
    half: { x: 20, z: 13 },
    height: 10,
    door: { side: "w", at: 6, width: 3 },
    road: "x",
    pool: { x: 25, z: 12, depth: 5 },
    machines: [],
  },
];

function buildRoom(b: Builder, r: RoomDef, k: number): void {
  const c = r.centre;
  const hx = r.half.x * k;
  const hz = r.half.z * k;
  const P = (x: number, z: number) => ({ x: c.x + x * k, z: c.z + z * k });
  const area = `entrenamiento:${r.id}`;
  const inner = around(c.x, c.z, hx - 0.2, hz - 0.2);
  // Floor (minus the pool), and the pool's water.
  const pool = r.pool ? around(c.x, c.z, (r.pool.x / 2) * k, (r.pool.z / 2) * k) : undefined;
  for (const q of pool ? subtract(inner, pool) : [inner]) b.floor(area, 0, q);
  if (pool && r.pool) b.water({ id: `${r.id}-piscina`, ...pool, yBottom: -r.pool.depth, yTop: -0.3, area: `${area}:piscina` });
  // Walls with the door (a doorway: only a gap).
  const t = 0.4;
  const d = r.door;
  const along = d.side === "n" || d.side === "s" ? c.x + d.at * k : c.z + d.at * k;
  const gap = [{ from: along - d.width / 2, to: along + d.width / 2, y1: Math.min(r.height, 2.6) }];
  const walls = [
    { side: "n", axis: "x" as const, at: c.z + hz - t / 2, from: c.x - hx, to: c.x + hx },
    { side: "s", axis: "x" as const, at: c.z - hz + t / 2, from: c.x - hx, to: c.x + hx },
    { side: "e", axis: "z" as const, at: c.x + hx - t / 2, from: c.z - hz, to: c.z + hz },
    { side: "w", axis: "z" as const, at: c.x - hx + t / 2, from: c.z - hz, to: c.z + hz },
  ];
  for (const w of walls) for (const s of wallWithGaps({ axis: w.axis, at: w.at, from: w.from, to: w.to, y0: 0, y1: r.height, thick: t, gaps: w.side === d.side ? gap : [] })) b.block("pared", s);
  b.block("tejado", { ...around(c.x, c.z, hx, hz), y0: r.height, y1: r.height + 0.3 }, false);
  // The door's points, outside and inside, and the road it joins.
  const n = d.side === "n" ? { x: 0, z: 1 } : d.side === "s" ? { x: 0, z: -1 } : d.side === "e" ? { x: 1, z: 0 } : { x: -1, z: 0 };
  const doorAt = d.side === "n" || d.side === "s" ? { x: along, z: c.z + n.z * hz } : { x: c.x + n.x * hx, z: along };
  const out = b.point(`${area}:fuera`, doorAt.x + n.x * 2.5, 0, doorAt.z + n.z * 2.5);
  const ins = b.point(`${area}:dentro`, doorAt.x - n.x * 2, 0, doorAt.z - n.z * 2);
  b.link(out, ins);
  const op = b.points.find((p) => p.id === out)!;
  const road = r.road === "x" ? b.point(`${area}:camino`, ROAD_X, 0, op.z) : b.point(`${area}:camino`, op.x, 0, ROAD_Z);
  b.link(out, road);
  b.area({ id: area, island: "entrenamiento", label: r.label, desc: r.desc, reality: r.reality, centre: { x: c.x, y: r.height / 2, z: c.z }, half: { x: hx, y: r.height / 2, z: hz }, point: ins });
  for (const it of r.items ?? []) {
    const p = P(it.x, it.z);
    const y0 = it.y0 ?? 0;
    b.block(it.look, { ...around(p.x, p.z, (it.w * k) / 2, (it.d * k) / 2), y0, y1: y0 + it.h }, it.solid ?? true);
    if (it.prop) b.props.push({ kind: it.prop, x: p.x, y: y0, z: p.z, size: { x: it.w * k, y: it.h, z: it.d * k } });
  }
  for (const cp of r.compartments ?? []) {
    const p = P(cp.x, cp.z);
    const w = (cp.w * k) / 2;
    const dd = (cp.d * k) / 2;
    const ca = `entrenamiento:${cp.id}`;
    b.floor(ca, cp.floorY, around(p.x, p.z, w - 0.15, dd - 0.15));
    const hatchX = cp.hatch.side === "e" ? p.x + w : p.x - w;
    // The sill outside the hatch, one step up from the hall.
    b.floor(ca, cp.floorY, R(hatchX - 0.6, hatchX + 0.6, p.z - cp.hatch.width / 2, p.z + cp.hatch.width / 2));
    const cw = [
      { axis: "x" as const, at: p.z + dd - 0.1, from: p.x - w, to: p.x + w, gaps: [] },
      { axis: "x" as const, at: p.z - dd + 0.1, from: p.x - w, to: p.x + w, gaps: [] },
      { axis: "z" as const, at: p.x + w - 0.1, from: p.z - dd, to: p.z + dd, gaps: cp.hatch.side === "e" ? [{ from: p.z - cp.hatch.width / 2, to: p.z + cp.hatch.width / 2, y1: cp.floorY + 1.9 }] : [] },
      { axis: "z" as const, at: p.x - w + 0.1, from: p.z - dd, to: p.z + dd, gaps: cp.hatch.side === "w" ? [{ from: p.z - cp.hatch.width / 2, to: p.z + cp.hatch.width / 2, y1: cp.floorY + 1.9 }] : [] },
    ];
    for (const s of cw) for (const q of wallWithGaps({ ...s, y0: 0, y1: cp.h, thick: 0.2 })) b.block(cp.shell ? "oculto" : "maqueta", q);
    if (!cp.shell) b.block("maqueta-techo", { ...around(p.x, p.z, w, dd), y0: cp.h, y1: cp.h + 0.15 }, false);
    let cpPoint = `m:${r.machines.find((m) => m.inside === cp.id)?.id ?? ""}`;
    if (cp.via) {
      let prev = ins;
      cp.via.forEach((v, i) => {
        const q = P(v.x, v.z);
        const id = b.point(`${ca}:${i}`, q.x, 0, q.z);
        b.link(prev, id);
        prev = id;
      });
      cpPoint = b.point(`${ca}:centro`, p.x, cp.floorY, p.z);
      b.link(prev, cpPoint);
    }
    b.area({ id: ca, island: "entrenamiento", label: cp.label, desc: cp.desc, reality: cp.reality, centre: { x: p.x, y: cp.h / 2, z: p.z }, half: { x: w, y: cp.h / 2, z: dd }, point: cpPoint });
  }
  for (const m of r.machines) {
    const p = P(m.x, m.z);
    const cp = r.compartments?.find((q) => q.id === m.inside);
    const y = cp ? cp.floorY : 0;
    let prev = ins;
    (m.via ?? []).forEach((v, i) => {
      const q = P(v.x, v.z);
      const id = b.point(`${area}:${m.id}:${i}`, q.x, 0, q.z);
      b.link(prev, id);
      prev = id;
    });
    b.machine({ id: m.id, kind: m.kind, island: "entrenamiento", area: cp ? `entrenamiento:${cp.id}` : area, label: m.label, what: m.what, x: p.x, y, z: p.z, ...(m.post ? { post: m.post } : {}) }, prev);
    if (m.kind === "esterilla") b.props.push({ kind: "mat", x: p.x, y: 0, z: p.z });
  }
  // The real equipment, furniture and fixtures of the room (data/fixtures.ts), at true size where the room is k times wider.
  furnishRoom(b, {
    id: r.id,
    k,
    centre: c,
    half: { x: hx, z: hz },
    height: r.height,
    area,
    inside: ins,
    ...(r.pool ? { pool: r.pool } : {}),
    compartments: (r.compartments ?? []).map((cp) => ({ id: cp.id, ...P(cp.x, cp.z), hx: (cp.w * k) / 2, hz: (cp.d * k) / 2, floorY: cp.floorY, h: cp.h, hatch: cp.hatch.side })),
  });
}

/** The whole sanctuary at drawing scale `k` (1 or 1,5: the presentation layer). */
export function buildLayout(k = 1): S3Layout {
  const b = new Builder();
  const pads: IslandPad[] = [];

  // ── Training island (real) ──
  const ti = TRAINING.island.value;
  // The island's ground around the buildings (inside each, its own floor: the Áreas window says where she is).
  const halls = ROOMS.map((r) => around(r.centre.x, r.centre.z, r.half.x * k, r.half.z * k));
  for (const r of subtractAll(R(ti.x0, ti.x1, ti.z0, ti.z1), halls)) b.floor("entrenamiento:isla", 0, r);
  for (const r of ROOMS) buildRoom(b, r, k);
  // Roads: the x = 170 and z = −5 lines join every door's road point (in order along them).
  const roadPts = (axis: "x" | "z") => b.points.filter((p) => p.id.startsWith("entrenamiento:") && p.id.endsWith(":camino") && (axis === "x" ? Math.abs(p.x - ROAD_X) < 1e-6 : Math.abs(p.z - ROAD_Z) < 1e-6));
  const cross = b.point("entrenamiento:cruce", ROAD_X, 0, ROAD_Z);
  const heliC = { x: 200, z: -95 };
  const hd = HELIDECK_M.value / 2;
  b.floor("entrenamiento:helipuerto", 0.05, around(heliC.x, heliC.z, hd));
  b.props.push({ kind: "helideck", x: heliC.x, y: 0.05, z: heliC.z, size: { x: hd * 2, y: 0.1, z: hd * 2 } });
  const heliRoad = b.point("entrenamiento:helipuerto:camino", ROAD_X, 0, heliC.z);
  const heliEdge = b.point("entrenamiento:helipuerto:borde", heliC.x - hd + 1.5, 0.05, heliC.z);
  const heliMid = b.point("entrenamiento:helipuerto:centro", heliC.x, 0.05, heliC.z + 4);
  b.link(heliRoad, heliEdge, heliMid);
  const pt = (id: string) => b.points.find((p) => p.id === id)!;
  const xs = [...roadPts("x"), pt(cross)].sort((p, q) => p.z - q.z);
  b.link(...xs.map((p) => p.id));
  const zs = [...roadPts("z"), pt(cross)].sort((p, q) => p.x - q.x);
  b.link(...zs.map((p) => p.id));
  b.area({ id: "entrenamiento:isla", island: "entrenamiento", label: "Isla de entrenamiento (exterior)", desc: "Una isla con las instalaciones reales de formación de astronautas (§1.2): todo aquí es real", reality: "real", centre: { x: (ti.x0 + ti.x1) / 2, y: 0.5, z: (ti.z0 + ti.z1) / 2 }, half: { x: (ti.x1 - ti.x0) / 2, y: 0.5, z: (ti.z1 - ti.z0) / 2 }, point: cross });
  b.area({ id: "entrenamiento:helipuerto", island: "entrenamiento", label: "Helipuerto", desc: "Cubierta de 1 D para el S-92 que la trajo; desde aquí se vuela a las demás islas", reality: "real", centre: { x: heliC.x, y: 0.5, z: heliC.z }, half: { x: hd, y: 0.5, z: hd }, point: heliMid });
  b.machine({ id: "nav-entrenamiento", kind: "navegacion", island: "entrenamiento", area: "entrenamiento:helipuerto", label: "Máquina de navegación", what: "El mapa de las islas: elegir adónde volar en el helicóptero", x: heliC.x - hd - 2.5, y: 0, z: heliC.z - 3 }, heliEdge);
  b.block("kiosco", { ...around(heliC.x - hd - 4.2, heliC.z - 3, 0.5), y0: 0, y1: 1.3 });
  b.props.push({ kind: "nav-machine", x: heliC.x - hd - 4.2, y: 0, z: heliC.z - 3, rot: Math.PI / 2 });
  b.machine({ id: "helipuerto-vuelos", kind: "puesto", island: "entrenamiento", area: "entrenamiento:helipuerto", label: "Vuelos de formación", what: "Vuelo parabólico, geología en el hielo y supervivencia en frío salen de aquí, a sitios fuera del mapa", x: heliC.x - hd + 1.5, y: 0.05, z: heliC.z + 3, post: 6 }, heliEdge);
  pads.push({ island: "entrenamiento", at: { x: heliC.x, y: 0.05, z: heliC.z }, crafts: ["helicoptero"] });
  furnishIsland(b, k, { heli: heliC, heliHalf: hd, rooms: ROOMS.map((r) => ({ id: r.id, ...around(r.centre.x, r.centre.z, r.half.x * k, r.half.z * k) })), island: R(ti.x0, ti.x1, ti.z0, ti.z1), road: { x: ROAD_X, z: ROAD_Z } });

  // ── The aerial sanctuary: three caps of Cold Sanctuary at their coordinates, with all their magic ──
  const L = SITE.launch.value;
  const E = SITE.energy.value;
  const Dk = SITE.dock.value;
  // The height rule: what stands up elsewhere (the energy tree's roof and its turbines) and the birds.
  const energyRoof = TREE.energyFirstY.value + TREE.levelGap.value + TREE.tipRise.value + TREE.ringH.value + 7;
  const elevated: ElevatedThing[] = [
    { label: "el techo del Parque Energético", topM: energyRoof },
    { label: "los aerogeneradores", topM: turbineTopM(TURBINE.value) },
  ];
  const need = requiredPadHeight(elevated, HEIGHT_RULE.value);
  const launchFirst = launchFirstFloorY(need, { minFirstY: TREE.minFirstY.value, padRiseM: CROWN.padRiseM.value, aboveFirstM: TREE.levelGap.value + TREE.tipRise.value + TREE.ringH.value + 7 });

  /** A point of island `o` as the presentation layer widens it (§2.4). */
  const wide = (o: { x: number; z: number }, x: number, z: number) => ({ x: o.x + (x - o.x) * k, z: o.z + (z - o.z) * k });
  const LH = SITE.launchCapHalf.value;
  const launchMark = b.mark();
  buildCap(b, "lanzadera", L, LH, TREE.waterHalf.value + TREE.wall.value, "e");
  const lAnden = b.point("lanzadera:anden", L.x + LH - 14, 0, L.z);
  const lHeli = { x: L.x + 33, z: L.z - 33 };
  b.floor("lanzadera:casquete", 0.05, around(lHeli.x, lHeli.z, hd));
  b.props.push({ kind: "helideck", x: lHeli.x, y: 0.05, z: lHeli.z, size: { x: hd * 2, y: 0.1, z: hd * 2 } });
  b.props.push({ kind: "carpet-pad", x: L.x + LH - 14, y: 0.02, z: L.z });
  const lHeliPt = b.point("lanzadera:helipuerto", lHeli.x, 0.05, lHeli.z);
  const lGround = b.point("lanzadera:pie", L.x - 5, 0, L.z - 18);
  const lMid = b.point("lanzadera:camino", L.x + 20, 0, L.z - 18);
  b.link(lHeliPt, lMid, lGround);
  b.link(lAnden, lMid);
  buildTree(b, { id: "lanzadera-arbol", island: "lanzadera", building: "Lanzadera de cohetes", site: L, firstY: launchFirst, floors: ["Fábrica de cohetes", "Control de misión", "Garaje de la lanzadera", "Piso libre"], floorDesc: ["Etapas del Electron en sus cunas, la carga útil y el puente grúa (integración horizontal, real)", "Doce puestos en tres filas y la pantalla de 16 × 5 m: telemetría, meteorología y la cuenta atrás del Electron (puesto 10)", "Plaza del submarino de obra: trae las etapas por el fondo abierto del tronco (ficción de Cold Sanctuary)", "Un piso del árbol todavía sin uso"], tip: "Mirador de la punta", floorMachines: [undefined, { id: "lanzadera-control", kind: "puesto", label: "Control de misión de la lanzadera", what: "Cuenta atrás del Electron, viento en altura, techo de nubes y evacuar a 300 m", post: 10 }], crownRise: CROWN.padRiseM.value, groundLink: lGround });
  const crownY = launchFirst + TREE.levelGap.value + TREE.tipRise.value + TREE.ringH.value + 7 + CROWN.padRiseM.value;
  b.area({ id: "lanzadera:casquete", island: "lanzadera", label: "Casquete de la lanzadera", desc: "El casquete artificial de 110 × 110 m con su pretil, los depósitos de LOX y RP-1 al aire, el polvorín, el helipuerto y el andén de las alfombras", reality: "ficcion", centre: { x: L.x, y: 1, z: L.z }, half: { x: LH, y: 1, z: LH }, point: lAnden });
  b.machine({ id: "nav-lanzadera", kind: "navegacion", island: "lanzadera", area: "lanzadera:casquete", label: "Máquina de navegación", what: "El mapa de las islas: alfombra al muelle o al parque, helicóptero a la isla de entrenamiento", x: L.x + LH - 14, y: 0, z: L.z + 5 }, lAnden);
  b.block("kiosco", { ...around(L.x + LH - 11.8, L.z + 5, 0.5), y0: 0, y1: 1.3 });
  b.props.push({ kind: "nav-machine", x: L.x + LH - 11.8, y: 0, z: L.z + 5, rot: -Math.PI / 2 });
  const apart = CROWN.tanksApartM.value / 2;
  for (const [kind, x, z] of [["tank-lox", -apart, apart], ["tank-rp1", -apart, -apart]] as const) {
    b.block("deposito", { ...around(L.x + x, L.z + z, 4.2), y0: 0, y1: 9 }, true);
    b.props.push({ kind, x: L.x + x, y: 0.3, z: L.z + z });
  }
  b.block("polvorin", { ...around(L.x + apart, L.z + apart, 3, 2), y0: 0, y1: 2.6 });
  b.widen(launchMark, L, k);
  pads.push({ island: "lanzadera", at: { ...wide(L, lHeli.x, lHeli.z), y: 0.05 }, crafts: ["alfombra", "helicoptero"] });

  const EH = SITE.energyCapHalf.value;
  const energyMark = b.mark();
  buildCap(b, "parque", E, EH, TREE.waterHalf.value + TREE.wall.value, "e");
  const eAnden = b.point("parque:anden", E.x + EH - 12, 0, E.z + 30);
  b.props.push({ kind: "carpet-pad", x: E.x + EH - 12, y: 0.02, z: E.z + 30 });
  const eGround = b.point("parque:pie", E.x - 5, 0, E.z - 18);
  const eMid = b.point("parque:camino", E.x + 40, 0, E.z - 18);
  const eMid2 = b.point("parque:camino2", E.x + 40, 0, E.z + 30);
  b.link(eAnden, eMid2, eMid, eGround);
  buildTree(b, { id: "parque-arbol", island: "parque", building: "Parque Energético", site: E, firstY: TREE.energyFirstY.value, floors: ["Control de energía", "Garaje del parque", "Taller de paneles", "Piso libre"], floorDesc: ["Los puestos del reparto de cargas y la pantalla del balance: reactor, sol, viento, marea, baterías y paradas por las aves", "Plaza del submarino de obra: trae las mesas y las palas (ficción de Cold Sanctuary)", "Bancos de los paneles y los repuestos", "Un piso del árbol todavía sin uso"], tip: "Mirador de fauna", floorMachines: [{ id: "parque-control", kind: "puesto", label: "Control de energía", what: "El balance: sol, viento, marea, baterías y las paradas por aves" }], groundLink: eGround });
  b.area({ id: "parque:casquete", island: "parque", label: "Casquete del parque energético", desc: "240 × 240 m: el campo solar, tres aerogeneradores E-33 en las esquinas, la mareal piloto y el almacén de baterías", reality: "ficcion", centre: { x: E.x, y: 1, z: E.z }, half: { x: EH, y: 1, z: EH }, point: eAnden });
  b.machine({ id: "nav-parque", kind: "navegacion", island: "parque", area: "parque:casquete", label: "Máquina de navegación", what: "El mapa de las islas: alfombra al muelle o a la lanzadera", x: E.x + EH - 12, y: 0, z: E.z + 35 }, eAnden);
  b.block("kiosco", { ...around(E.x + EH - 9.8, E.z + 35, 0.5), y0: 0, y1: 1.3 });
  b.props.push({ kind: "nav-machine", x: E.x + EH - 9.8, y: 0, z: E.z + 35, rot: -Math.PI / 2 });
  const H = EH - 16;
  const corners = [[-H, H], [H, H], [-H, -H]] as const;
  for (let i = 0; i < TURBINES.value; i++) {
    const [x, z] = corners[i]!;
    b.block("torre", { ...around(E.x + x, E.z + z, 2), y0: 0, y1: TURBINE.value.hubM }, true);
    b.props.push({ kind: "turbine", x: E.x + x, y: 0, z: E.z + z, label: `Aerogenerador ${i + 1}` });
  }
  for (let i = 0; i < TIDAL_UNITS.value; i++) b.props.push({ kind: "tidal", x: E.x - EH - 7, y: SEA_Y - 8, z: E.z - 30 + i * 60 });
  const installedTables = tablesFor(FLOORS_KW.value, SOLAR.value);
  const T = TABLE.value;
  let n = 0;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      const x = E.x - 100 + col * (T.length + T.gap) + T.length / 2;
      const z = E.z - 100 + row * T.rowPitch;
      b.block("panel", { ...around(x, z, T.length / 2, 0.15), y0: 0, y1: T.height }, true);
      b.props.push({ kind: "solar-table", x, y: 0, z, on: n++ < installedTables });
    }
  const st = STORAGE.value;
  for (let i = 0; i < st.containers; i++) {
    const x = E.x + 50 + (i % 3) * 9;
    const z = E.z - 60 - Math.floor(i / 3) * 6;
    b.block("bateria", { ...around(x, z, 3, 1.25), y0: 0, y1: 2.6 }, true);
    b.props.push({ kind: "battery", x, y: 0, z });
  }
  b.widen(energyMark, E, k);

  const dz = SITE.dockSize.value;
  const dockMark = b.mark();
  b.floor("muelle:muelle", 0, around(Dk.x, Dk.z, dz.x / 2, dz.z / 2));
  for (const w of [
    ...wallWithGaps({ axis: "x", at: Dk.z + dz.z / 2 - 0.5, from: Dk.x - dz.x / 2, to: Dk.x + dz.x / 2, y0: -3, y1: SITE.parapetM.value, thick: 1 }),
    ...wallWithGaps({ axis: "x", at: Dk.z - dz.z / 2 + 0.5, from: Dk.x - dz.x / 2, to: Dk.x + dz.x / 2, y0: -3, y1: SITE.parapetM.value, thick: 1 }),
    ...wallWithGaps({ axis: "z", at: Dk.x - dz.x / 2 + 0.5, from: Dk.z - dz.z / 2, to: Dk.z + dz.z / 2, y0: -3, y1: SITE.parapetM.value, thick: 1, gaps: [{ from: Dk.z - 3, to: Dk.z + 3 }] }),
    ...wallWithGaps({ axis: "z", at: Dk.x + dz.x / 2 - 0.5, from: Dk.z - dz.z / 2, to: Dk.z + dz.z / 2, y0: -3, y1: SITE.parapetM.value, thick: 1 }),
  ])
    b.block("pretil", w);
  const dPad = b.point("muelle:pista", Dk.x - 6, 0, Dk.z);
  b.props.push({ kind: "carpet-pad", x: Dk.x - 6, y: 0.02, z: Dk.z });
  b.area({ id: "muelle:muelle", island: "muelle", label: "Muelle aéreo", desc: "El muelle de las alfombras voladoras de Cold Sanctuary (32 × 24 m): de aquí salen a la lanzadera y al parque", reality: "ficcion", centre: { x: Dk.x, y: 1, z: Dk.z }, half: { x: dz.x / 2, y: 1, z: dz.z / 2 }, point: dPad });
  b.machine({ id: "nav-muelle", kind: "navegacion", island: "muelle", area: "muelle:muelle", label: "Máquina de navegación", what: "El mapa de las islas: alfombra a la lanzadera o al parque", x: Dk.x + 4, y: 0, z: Dk.z }, dPad);
  b.block("kiosco", { ...around(Dk.x + 6.2, Dk.z, 0.5), y0: 0, y1: 1.3 });
  b.props.push({ kind: "nav-machine", x: Dk.x + 6.2, y: 0, z: Dk.z, rot: -Math.PI / 2 });
  b.widen(dockMark, Dk, k);
  pads.push({ island: "muelle", at: { ...wide(Dk, Dk.x - 6, Dk.z), y: 0.02 }, crafts: ["alfombra"] });
  pads.push({ island: "parque", at: { ...wide(E, E.x + EH - 12, E.z + 30), y: 0.02 }, crafts: ["alfombra"] });

  // ── The crew pad on the sea: Falcon 9 with Crew Dragon (real vehicles; a Falcon 9 from the sea is licence) ──
  const C = CREW_PAD.at.value;
  const cs = CREW_PAD.size.value;
  const cy = CREW_PAD.deckM.value;
  const crewMark = b.mark();
  b.floor("plataforma:cubierta", cy, around(C.x, C.z, cs.x / 2, cs.z / 2));
  b.block("plataforma", { ...around(C.x, C.z, cs.x / 2, cs.z / 2), y0: SEA_Y - 4, y1: cy - 0.05 }, false);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) b.block("columna", { ...around(C.x + sx * (cs.x / 2 - 8), C.z + sz * (cs.z / 2 - 8), 5), y0: -30, y1: cy - 2 }, false);
  const fx = C.x + cs.x / 2 - 25;
  b.solids.push({ ...around(fx, C.z, 4), y0: cy, y1: cy + 80 });
  b.props.push({ kind: "falcon9", x: fx, y: cy, z: C.z, label: "Falcon 9 · Crew Dragon" });
  b.block("torre-acceso", { ...around(fx, C.z + 9, 3.5), y0: cy, y1: cy + 77 }, true);
  b.props.push({ kind: "crew-tower", x: fx, y: cy, z: C.z + 9 });
  const cHeli = { x: C.x - cs.x / 2 + 18, z: C.z };
  b.props.push({ kind: "helideck", x: cHeli.x, y: cy + 0.05, z: cHeli.z, size: { x: hd * 2, y: 0.1, z: hd * 2 } });
  const cHeliPt = b.point("plataforma:helipuerto", cHeli.x, cy, cHeli.z);
  const cWalk = b.point("plataforma:centro", C.x, cy, C.z - 15);
  const cRocket = b.point("plataforma:cohete", fx - 12, cy, C.z - 12);
  b.link(cHeliPt, cWalk, cRocket);
  b.area({ id: "plataforma:cubierta", island: "plataforma", label: "Plataforma de tripulación", desc: `Plataforma semisumergible como la Odyssey de Sea Launch (132,9 × 67 m), con el Falcon 9 y la Crew Dragon y su torre de acceso: a ~1,1 km de todo lo habitado`, reality: "licencia", centre: { x: C.x, y: cy + 2, z: C.z }, half: { x: cs.x / 2, y: 2, z: cs.z / 2 }, point: cWalk });
  b.machine({ id: "nav-plataforma", kind: "navegacion", island: "plataforma", area: "plataforma:cubierta", label: "Máquina de navegación", what: "El mapa de las islas: helicóptero a la isla de entrenamiento o a la lanzadera", x: cHeli.x + hd + 3, y: cy, z: cHeli.z + 6 }, cWalk);
  b.block("kiosco", { ...around(cHeli.x + hd + 5.2, cHeli.z + 6, 0.5), y0: cy, y1: cy + 1.3 });
  b.props.push({ kind: "nav-machine", x: cHeli.x + hd + 5.2, y: cy, z: cHeli.z + 6, rot: -Math.PI / 2 });
  b.machine({ id: "plataforma-acceso", kind: "puesto", island: "plataforma", area: "plataforma:cubierta", label: "Torre de acceso de la tripulación", what: "Traje, brazo de acceso, comprobación de fugas y cuenta atrás (puesto 13)", x: fx - 6, y: cy, z: C.z + 9, post: 13 }, cRocket);
  b.widen(crewMark, C, k);
  pads.push({ island: "plataforma", at: { ...wide(C, cHeli.x, cHeli.z), y: cy + 0.05 }, crafts: ["helicoptero"] });

  const islands: IslandDef[] = [
    { id: "entrenamiento", name: "Isla de entrenamiento", desc: "Las instalaciones reales de formación: la piscina NBL, la centrífuga, las maquetas, el control de misión, el centro médico y el helipuerto. Todo aquí es real", reality: "real", source: S.ours, rect: R(ti.x0, ti.x1, ti.z0, ti.z1), deckY: 0, pad: pads[0]!, arrival: "entrenamiento:helipuerto:centro", nav: "m:nav-entrenamiento" },
    { id: "lanzadera", name: "Lanzadera de cohetes", desc: "El casquete de Cold Sanctuary con su edificio-árbol de agua, el ascensor del tronco y la corona del Electron en lo alto (con toda su magia)", reality: "ficcion", source: S.csBuilder, rect: around(L.x, L.z, LH * k), deckY: 0, pad: pads[1]!, arrival: "lanzadera:helipuerto", nav: "m:nav-lanzadera" },
    { id: "parque", name: "Parque energético", desc: "El casquete del parque: el árbol bajo, el campo solar, los tres E-33 de Ross Island con su parada por aves y la mareal piloto", reality: "ficcion", source: S.csBuilder, rect: around(E.x, E.z, EH * k), deckY: 0, pad: pads.find((p) => p.island === "parque")!, arrival: "parque:anden", nav: "m:nav-parque" },
    { id: "muelle", name: "Muelle aéreo", desc: "El muelle de las alfombras voladoras de Cold Sanctuary", reality: "ficcion", source: S.csBuilder, rect: around(Dk.x, Dk.z, (dz.x / 2) * k, (dz.z / 2) * k), deckY: 0, pad: pads.find((p) => p.island === "muelle")!, arrival: "muelle:pista", nav: "m:nav-muelle" },
    { id: "plataforma", name: "Plataforma de tripulación", desc: "El Falcon 9 con la Crew Dragon en una plataforma en el mar, a ~1,1 km: la distancia de seguridad de un cohete tripulado", reality: "licencia", source: S.odyssey, rect: around(C.x, C.z, (cs.x / 2) * k, (cs.z / 2) * k), deckY: cy, pad: pads.find((p) => p.island === "plataforma")!, arrival: "plataforma:helipuerto", nav: "m:nav-plataforma" },
  ];

  const inhabited = [
    { id: "isla de entrenamiento", ...R(ti.x0, ti.x1, ti.z0, ti.z1) },
    { id: "Parque Energético (tronco)", ...around(E.x, E.z, (TREE.waterHalf.value + TREE.wall.value) * k) },
    { id: "muelle aéreo", ...around(Dk.x, Dk.z, (dz.x / 2) * k, (dz.z / 2) * k) },
  ];
  void FALCON9_CREW;
  return {
    k,
    world: { floors: b.floors, waters: b.waters, solids: b.solids },
    islands,
    areas: b.areas,
    machines: b.machines,
    lifts: b.lifts,
    graph: { points: b.points, links: b.links },
    props: b.props,
    blocks: b.blocks,
    crown: { y: crownY, why: need.why, x: L.x, z: L.z },
    start: "entrenamiento:helipuerto:centro",
    inhabited,
    installedTables,
    fixtures: b.fixtures,
    walkChecks: b.walkChecks,
  };
}

export function islandOf(layout: S3Layout, area: string): IslandId | undefined {
  const head = area.split(":")[0];
  if (layout.islands.some((i) => i.id === head)) return head as IslandId;
  const a = layout.areas.find((q) => q.id === area);
  if (a) return a.island;
  for (const l of layout.lifts) if (area.startsWith(`${l.id}:`)) return l.island;
  return undefined;
}
