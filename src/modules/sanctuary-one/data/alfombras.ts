import type { Floor, Rect, Solid, Water } from "@modules/aerial-sanctuary/domain/walk";
import type { S1Area, TowerShape } from "./layout";
import type { Waypoint } from "../domain/motion";
import { GLOBE } from "./globo";

/**
 * The flying-carpet stations and their flights (Cold Sanctuary's `CarpetPad` areas, csx docs/alfombras-plan.md).
 *
 * Berón 2026-11-20: «existe una estación de alfombras por cada piso… no requiere retos de código… las alfombras vuelan
 * automático»; and later the same day: «las de los pisos deben volar también… alfombras que realizan vuelos internos en
 * un edificio, de un piso a otro, y las que solo se encuentran en la base y tope del edificio, que sirven para vuelos
 * entre edificios… los vuelos verticales van de traspasar estructuras… las estaciones de alfombras en los pisos deben
 * nacer como apéndices para no ocupar los espacios ya destinados y no ponerlos detrás de bloqueos».
 *
 * So: each floor and ring has its station on a landing that juts out of its edge (never on the floor's own space),
 * that one walks to from the door; its carpets fly inside the building (to its floors, its crown and its foot). The
 * crown's also fly to the other crowns, the foot's to the other feet. A flight never goes through anything: every
 * station has its own **lane**, a column of air clear of every floor, landing, tip, ring, branch, trunk and thing (of
 * every building: they stand among each other) from its level up over every crown; a carpet leaves its pad, flies out
 * to its lane, climbs or drops in it to the lowest height at which it can go across clear (straight, or round its
 * trunk) to the other station's lane, and goes down that one and in. The lanes and heights are found from the
 * buildings as they are, so a change of a building moves them; `reglas.test.ts` flies every flight and fails if one
 * touches anything.
 */
export interface CarpetStation {
  /** `<area>:alfombras`. */
  readonly id: string;
  /** The area it stands in: a floor, a ring, the crown (`<tower>:techo`) or the ice at its foot (`<tower>:tronco`). */
  readonly area: string;
  readonly tower: string;
  readonly building: string;
  readonly kind: "piso" | "copa" | "pie";
  /** «Gimnasio», «Copa», «Pie». */
  readonly label: string;
  /** The middle of its pad, m. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The way its carpets leave (level, along an axis; none on a crown). */
  readonly out: { readonly x: number; readonly z: number };
  /** Where its carpets reach: the building, or also the other buildings' crowns (or feet). */
  readonly reach: "edificio" | "santuario";
  /** Its lane: the column of clear air its carpets climb or drop in, and how far down and up it is clear, m. */
  readonly lane: { readonly x: number; readonly z: number; readonly lo: number; readonly hi: number };
  /** The landing it stands on, jutting out of its floor's edge (none on a crown or at a foot). */
  readonly landing?: Rect;
}

/** The station's pad (Cold Sanctuary's carpet area: ~7 × 4 m with two carpets), m. */
export const STATION_PAD = { x: 7.6, z: 4.4 } as const;
/** How far a carpet keeps from anything (half its length and a margin), m. */
export const CARPET_CLEAR_M = 2;
/** The sky way over every crown, m over the highest. */
const HIGH_OVER_M = 10;
/** How high over its pad a carpet flies out to its lane, m (over the people on the landing). */
export const OUT_HIGH_M = 2;

/** The sanctuary as the stations need it. */
export interface StationWorld {
  readonly areas: readonly S1Area[];
  readonly towers: readonly TowerShape[];
  readonly floors: readonly Floor[];
  readonly waters: readonly Water[];
  readonly solids: readonly Solid[];
}

/** Something a carpet keeps clear of. */
export interface Box extends Rect {
  readonly y0: number;
  readonly y1: number;
  readonly area?: string;
}

const overlaps = (a: Rect, b: Rect, m = 0) => a.x0 - m < b.x1 && a.x1 + m > b.x0 && a.z0 - m < b.z1 && a.z1 + m > b.z0;
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

/** Everything up in the air a carpet must not touch: the floors (and what stands on them), tips, rings, branches, trunks. */
export function obstaclesOf(w: Pick<StationWorld, "floors" | "waters" | "solids">): Box[] {
  const out: Box[] = [];
  for (const f of w.floors) if (f.y > 1) out.push({ x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z1, y0: f.y - 0.8, y1: f.y + 3, area: f.area });
  for (const q of w.waters) if (q.yTop > 1) out.push({ x0: q.x0 - 1, x1: q.x1 + 1, z0: q.z0 - 1, z1: q.z1 + 1, y0: q.yBottom, y1: q.yTop + 0.5, area: q.area });
  for (const s of w.solids) if (s.y1 > 1) out.push(s);
  return out;
}

/** A plan grid over boxes, to ask quickly what is near a point. */
export class Grid {
  private readonly cells = new Map<number, Box[]>();
  private readonly cell = 8;
  constructor(boxes: readonly Box[]) {
    for (const b of boxes) this.add(b);
  }
  add(b: Box): void {
    const c = this.cell;
    for (let i = Math.floor((b.x0 - CARPET_CLEAR_M) / c); i <= Math.floor((b.x1 + CARPET_CLEAR_M) / c); i++)
      for (let k = Math.floor((b.z0 - CARPET_CLEAR_M) / c); k <= Math.floor((b.z1 + CARPET_CLEAR_M) / c); k++) {
        const key = i * 100003 + k;
        const list = this.cells.get(key);
        if (list) list.push(b);
        else this.cells.set(key, [b]);
      }
  }
  at(x: number, z: number): readonly Box[] {
    return this.cells.get(Math.floor(x / this.cell) * 100003 + Math.floor(z / this.cell)) ?? [];
  }
}

/** What a point of a flight touches (a box within the carpet's clearance), but for the boxes `skip` lets through. */
export function touches(g: Grid, x: number, y: number, z: number, skip?: (b: Box) => boolean): Box | undefined {
  return g.at(x, z).find((b) => y > b.y0 - CARPET_CLEAR_M && y < b.y1 + CARPET_CLEAR_M && inRect(b, x, z, CARPET_CLEAR_M) && !skip?.(b));
}

/** How far down and up from `y` a column is clear (every metre), `undefined` if not at `y` itself. */
function span(g: Grid, x: number, z: number, y: number, floor: number, top: number): { lo: number; hi: number } | undefined {
  if (touches(g, x, y, z)) return undefined;
  let lo = y;
  while (lo - 1 >= floor && !touches(g, x, lo - 1, z)) lo -= 1;
  let hi = y;
  while (hi + 1 <= top && !touches(g, x, hi + 1, z)) hi += 1;
  return { lo, hi };
}

/**
 * Whether one walks from a floor's door to its landing (a 0,5 m grid over the floor and the landing, the things standing
 * on it in the way, with half a body round them): a station is never behind furniture.
 */
function reachable(floor: Rect, y: number, things: readonly Solid[], from: { x: number; z: number }, landing: Rect): boolean {
  const c = 0.5;
  const r = { x0: Math.min(floor.x0, landing.x0), x1: Math.max(floor.x1, landing.x1), z0: Math.min(floor.z0, landing.z0), z1: Math.max(floor.z1, landing.z1) };
  const nx = Math.ceil((r.x1 - r.x0) / c);
  const nz = Math.ceil((r.z1 - r.z0) / c);
  const open = new Uint8Array(nx * nz);
  const goal = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      const x = r.x0 + (i + 0.5) * c;
      const z = r.z0 + (k + 0.5) * c;
      if (inRect(floor, x, z) || inRect(landing, x, z)) open[i * nz + k] = 1;
      if (inRect(landing, x, z, -0.3)) goal[i * nz + k] = 1;
    }
  for (const s of things) {
    if (s.y1 < y + 0.3 || s.y0 > y + 1.6) continue;
    for (let i = Math.max(0, Math.floor((s.x0 - 0.3 - r.x0) / c)); i < Math.min(nx, Math.ceil((s.x1 + 0.3 - r.x0) / c)); i++)
      for (let k = Math.max(0, Math.floor((s.z0 - 0.3 - r.z0) / c)); k < Math.min(nz, Math.ceil((s.z1 + 0.3 - r.z0) / c)); k++) open[i * nz + k] = 0;
  }
  // From the floor's cells within 2 m of its door (the door's own sill may be in a wall's margin).
  const ex = Math.min(floor.x1 - 0.3, Math.max(floor.x0 + 0.3, from.x));
  const ez = Math.min(floor.z1 - 0.3, Math.max(floor.z0 + 0.3, from.z));
  const seen = new Uint8Array(nx * nz);
  const queue: number[] = [];
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      const q = i * nz + k;
      if (open[q] && Math.hypot(r.x0 + (i + 0.5) * c - ex, r.z0 + (k + 0.5) * c - ez) < 2) {
        seen[q] = 1;
        queue.push(q);
      }
    }
  while (queue.length) {
    const q = queue.pop()!;
    if (goal[q]) return true;
    const i = Math.floor(q / nz);
    const k = q % nz;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const a = i + di;
      const b = k + dk;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const n = a * nz + b;
      if (open[n] && !seen[n]) {
        seen[n] = 1;
        queue.push(n);
      }
    }
  }
  return false;
}

/** The axis unit vector of the dominant direction of (dx, dz). */
const axis = (dx: number, dz: number) => (Math.abs(dx) > Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) });

/** The sky way: over every crown. */
/** The carpets' sky way: over every crown and over the whales' globe (globo.ts, 2026-11-22). */
const skyOf = (towers: readonly { readonly rootHeight: number }[]) => Math.ceil(Math.max(GLOBE.topY, ...towers.map((t) => t.rootHeight))) + HIGH_OVER_M;

/**
 * Every station: one on a landing out of each floor's and ring's edge (the spot whose lane is nearest and that one walks
 * to from the door), one on each crown and one at each foot (on the ice near the ground door, under open sky).
 */
export function carpetStations(w: StationWorld): CarpetStation[] {
  const out: CarpetStation[] = [];
  const grid = new Grid(obstaclesOf(w));
  const sky = skyOf(w.towers);
  // A landing chosen is in the way of the lanes after it; a lane chosen keeps the landings after it out.
  const lanes: { x: number; z: number }[] = [];
  const ground = w.floors.filter((f) => Math.abs(f.y) < 0.01 && /^(hielo|tierra|base):/.test(f.area));
  for (const t of w.towers) {
    for (const a of w.areas) {
      if (a.link?.tower !== t.id || !a.entry) continue;
      const ring = a.id.endsWith(":anillo");
      const deck = ring ? w.floors.find((f) => f.id === `${a.id}-frente`) : w.floors.find((f) => f.id === a.id);
      if (!deck) continue;
      const away = axis(a.entry.x - t.x, a.entry.z - t.z);
      const mid = { x: (deck.x0 + deck.x1) / 2, z: (deck.z0 + deck.z1) / 2 };
      const things = w.solids.filter((s) => overlaps(s, deck) && s.y0 < a.y + 2 && s.y1 > a.y + 0.2);
      // Its own floor and what stands on it: out of the way of its carpets only on their way out.
      const own = (b: Box) => b.area === a.id || (b.area === undefined && overlaps(b, deck, 6) && b.y0 >= a.y - 0.5 && b.y1 <= a.y + 3.5);
      let best: { x: number; z: number; o: { x: number; z: number }; lane: CarpetStation["lane"]; cost: number; landing: Rect } | undefined;
      // The outer edge first; if it is full (rooms wall to wall), a side edge (never the door's).
      for (const [o, penalty] of [[away, 0], [{ x: away.z, z: away.x }, 4], [{ x: -away.z, z: -away.x }, 4]] as const) {
        const across = { x: o.z === 0 ? 0 : 1, z: o.z === 0 ? 1 : 0 };
        const edge = o.x > 0 ? deck.x1 : o.x < 0 ? deck.x0 : o.z > 0 ? deck.z1 : deck.z0;
        // Along the edge, as long as 3 m of the landing stay against the floor (to step on it).
        const half = (across.x ? deck.x1 - deck.x0 : deck.z1 - deck.z0) / 2 + STATION_PAD.x / 2 - 3;
        for (let s = 0; s <= half; s += 1)
          for (const sg of s ? [1, -1] : [1]) {
            const along = s * sg;
            const cx = (across.x ? mid.x + along : 0) + (o.x ? edge + (o.x * (STATION_PAD.z + 0.6)) / 2 : 0);
            const cz = (across.z ? mid.z + along : 0) + (o.z ? edge + (o.z * (STATION_PAD.z + 0.6)) / 2 : 0);
            const hx = (o.x ? STATION_PAD.z + 0.6 : STATION_PAD.x + 0.8) / 2;
            const hz = (o.z ? STATION_PAD.z + 0.6 : STATION_PAD.x + 0.8) / 2;
            const landing = { x0: cx - hx, x1: cx + hx, z0: cz - hz, z1: cz + hz };
            // Nothing else where the landing goes (another floor, a branch at its level, a thing), no lane through it.
            const lb = [grid.at(cx, cz), grid.at(landing.x0, landing.z0), grid.at(landing.x1, landing.z1), grid.at(landing.x0, landing.z1), grid.at(landing.x1, landing.z0)].flat();
            if (lb.some((b) => !own(b) && !(b.area === undefined && overlaps(b, deck)) && b.y1 > a.y - 1 && b.y0 < a.y + 3 && overlaps(b, landing, 0.5))) continue;
            if (lanes.some((l) => inRect(landing, l.x, l.z, CARPET_CLEAR_M + 0.5))) continue;
            // Its lane: straight out from the pad, the first column past its landing clear from over the pad up to the
            // sky way; and the way out to it clear.
            let lane: CarpetStation["lane"] | undefined;
            for (let d = 0; d < 200 && !lane; d += 1) {
              const lx = cx + o.x * d;
              const lz = cz + o.z * d;
              if (inRect(landing, lx, lz, CARPET_CLEAR_M + 0.5) || inRect(deck, lx, lz, CARPET_CLEAR_M + 0.5)) continue;
              const sp = span(grid, lx, lz, a.y + OUT_HIGH_M, 4, sky);
              if (!sp || sp.hi < sky) continue;
              let clear = true;
              for (let k = 0; k <= d && clear; k += 1) for (const h of k === 0 ? [1, OUT_HIGH_M] : [OUT_HIGH_M]) if (touches(grid, cx + o.x * k, a.y + h, cz + o.z * k, own)) clear = false;
              if (!clear) break;
              lane = { x: lx, z: lz, ...sp };
            }
            if (!lane) continue;
            const cost = Math.hypot(lane.x - cx, lane.z - cz) + penalty + s * 0.1;
            if (best && cost >= best.cost) continue;
            if (!reachable(deck, a.y, things, a.entry, landing)) continue;
            best = { x: cx, z: cz, o, lane, cost, landing };
          }
      }
      if (!best) continue;
      grid.add({ ...best.landing, y0: a.y - 0.8, y1: a.y + 3, area: a.id });
      lanes.push(best.lane);
      out.push({ id: `${a.id}:alfombras`, area: a.id, tower: t.id, building: t.building, kind: "piso", label: a.label, x: best.x, y: a.y, z: best.z, out: best.o, reach: "edificio", lane: best.lane, landing: best.landing });
    }
  }
  for (const t of w.towers) {
    // The crown's: on the roof, over the trunk; its lane straight up.
    const up = t.rootHeight + 3 + CARPET_CLEAR_M + 0.5;
    const crown = span(grid, t.x, t.z, up, up, sky);
    out.push({ id: `${t.id}:techo:alfombras`, area: `${t.id}:techo`, tower: t.id, building: t.building, kind: "copa", label: "Copa", x: t.x, y: t.rootHeight, z: t.z, out: { x: 0, z: 0 }, reach: "santuario", lane: { x: t.x, z: t.z, lo: up, hi: crown?.hi ?? up } });
    // The foot's: on the ice, the nearest spot to the ground door with open sky over it.
    // The foot is on the tree's own base (Berón 2026-11-21: «una base negra que tiene la estación de alfombras»).
    const deck = ground.filter((f) => f.area === `base:${t.id}`);
    const onDeck = (x: number, z: number, m: number) => [[-m, -m], [m, -m], [-m, m], [m, m], [0, 0]].every(([dx, dz]) => deck.some((f) => inRect(f, x + dx!, z + dz!)));
    const door = t.ground.out;
    const fo = axis(door.x - t.x, door.z - t.z);
    let foot: { x: number; z: number; lo: number; hi: number } | undefined;
    for (let r = 0; r < 80 && !foot; r += 1)
      for (let k = 0; k < Math.max(1, Math.round((2 * Math.PI * r) / 4)) && !foot; k++) {
        const ang = Math.atan2(fo.z, fo.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (4 / Math.max(r, 1));
        const x = door.x + Math.cos(ang) * r;
        const z = door.z + Math.sin(ang) * r;
        if (!onDeck(x, z, STATION_PAD.x / 2 + 1)) continue;
        if (lanes.some((l) => Math.hypot(l.x - x, l.z - z) < STATION_PAD.x + CARPET_CLEAR_M)) continue;
        const sp = span(grid, x, z, 1, 1, sky);
        if (sp && sp.hi >= sky) foot = { x, z, ...sp };
      }
    // Where the tree's crown covers all its base (Servicios' rings), a jetty out of the base to the nearest open sky
    // (ours, 2026-11-21): the station at its end, the jetty its landing.
    let jetty: Rect | undefined;
    if (!foot) {
      const B = t.base;
      const cx = (B.x0 + B.x1) / 2;
      const cz = (B.z0 + B.z1) / 2;
      const hx = STATION_PAD.x / 2 + 0.4;
      const hz = STATION_PAD.z / 2 + 0.3;
      for (let d = 2; d < 140 && !foot; d += 2)
        for (const [ux, uz] of [[fo.x, fo.z], [fo.z, -fo.x], [-fo.z, fo.x], [-fo.x, -fo.z]] as const) {
          if (foot) break;
          for (const off of [0, 8, -8, 16, -16]) {
            const edge = ux ? (ux > 0 ? B.x1 : B.x0) : uz > 0 ? B.z1 : B.z0;
            const x = ux ? edge + ux * (d + hz) : cx + off;
            const z = uz ? edge + uz * (d + hz) : cz + off;
            if (lanes.some((l) => Math.hypot(l.x - x, l.z - z) < STATION_PAD.x + CARPET_CLEAR_M)) continue;
            const sp = span(grid, x, z, 1, 1, sky);
            if (!sp || sp.hi < sky) continue;
            const w = ux ? hz : hx;
            const v = ux ? hx : hz;
            const far = ux ? x + ux * w : z + uz * w;
            jetty = ux ? { x0: Math.min(edge, far), x1: Math.max(edge, far), z0: z - v, z1: z + v } : { x0: x - w, x1: x + w, z0: Math.min(edge, far), z1: Math.max(edge, far) };
            foot = { x, z, ...sp };
            break;
          }
        }
    }
    if (!foot) continue;
    lanes.push(foot);
    out.push({ id: `${t.id}:pie:alfombras`, area: `${t.id}:tronco`, tower: t.id, building: t.building, kind: "pie", label: "Pie", x: foot.x, y: 0, z: foot.z, out: fo, reach: "santuario", lane: { x: foot.x, z: foot.z, lo: 1, hi: foot.hi }, ...(jetty ? { landing: jetty } : {}) });
  }
  return out;
}

/** Where a station's carpets go: its building's other stations; from a crown also the other crowns, from a foot the other feet. */
export function carpetDestinations(all: readonly CarpetStation[], from: CarpetStation): CarpetStation[] {
  return all.filter((s) => s.id !== from.id && (s.tower === from.tower || (from.kind !== "piso" && s.kind === from.kind)));
}

/** The station she stands on, if any (on its pad, at its height). */
export function stationAt(all: readonly CarpetStation[], x: number, y: number, z: number): CarpetStation | undefined {
  return all.find((s) => Math.abs(y - s.y) < 1.2 && Math.abs(x - s.x) <= STATION_PAD.x / 2 + 0.3 && Math.abs(z - s.z) <= STATION_PAD.x / 2 + 0.3);
}

/** Round a centre from one point to another at height y, the short way or the long one: points every 10°. */
function around(c: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }, y: number, long: boolean): Waypoint[] {
  const ra = Math.hypot(a.x - c.x, a.z - c.z);
  const rb = Math.hypot(b.x - c.x, b.z - c.z);
  const aa = Math.atan2(a.z - c.z, a.x - c.x);
  let d = Math.atan2(b.z - c.z, b.x - c.x) - aa;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  if (long) d -= Math.sign(d || 1) * 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 18)));
  // A little wider than the chord's sag, so the arc never cuts in nearer than its ends.
  const r = Math.max(ra, rb) / Math.cos(Math.PI / 36);
  const pts: Waypoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = aa + (d * i) / n;
    pts.push({ x: c.x + Math.cos(t) * r, y, z: c.z + Math.sin(t) * r, fly: true });
  }
  pts.push({ x: b.x, y, z: b.z, fly: true });
  return pts;
}

/** Whether a flown stretch is clear (every 1,5 m). */
function clearPath(g: Grid, pts: readonly { x: number; y: number; z: number }[]): boolean {
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) / 1.5));
    for (let k = 1; k <= n; k++) if (touches(g, p.x + ((q.x - p.x) * k) / n, p.y + ((q.y - p.y) * k) / n, p.z + ((q.z - p.z) * k) / n)) return false;
  }
  return true;
}

/** The world a flight is planned in (built once per world). */
const grids = new WeakMap<object, Grid>();
function gridOf(w: Pick<StationWorld, "floors" | "waters" | "solids">): Grid {
  let g = grids.get(w.floors);
  if (!g) {
    g = new Grid(obstaclesOf(w));
    grids.set(w.floors, g);
  }
  return g;
}

/**
 * The flight from one station to another (automatic, no challenge; never through anything): out to its lane, up or
 * down it to the height nearest its two pads at which it can cross clear to the other's lane (straight, or round the
 * trunk either way), across, down that lane and in. Over every crown the sky way is always clear.
 */
export function carpetRoute(w: Pick<StationWorld, "floors" | "waters" | "solids" | "towers">, a: CarpetStation, b: CarpetStation): Waypoint[] {
  const g = gridOf(w);
  const ya = Math.max(a.y + OUT_HIGH_M, a.lane.lo);
  const yb = Math.max(b.y + OUT_HIGH_M, b.lane.lo);
  const lo = Math.max(a.lane.lo, b.lane.lo);
  const hi = Math.min(a.lane.hi, b.lane.hi);
  const hs: number[] = [];
  for (let h = Math.ceil(lo); h <= hi; h += 1) hs.push(h);
  hs.sort((p, q) => Math.abs(p - ya) + Math.abs(p - yb) - (Math.abs(q - ya) + Math.abs(q - yb)) || p - q);
  const t = w.towers.find((q) => q.id === a.tower)!;
  let across: Waypoint[] | undefined;
  for (const h of hs) {
    const from = { x: a.lane.x, y: h, z: a.lane.z, fly: true };
    const options: Waypoint[][] = [[{ x: b.lane.x, y: h, z: b.lane.z, fly: true }]];
    if (a.tower === b.tower && a.kind === "piso" && b.kind === "piso") options.push(around(t, a.lane, b.lane, h, false), around(t, a.lane, b.lane, h, true));
    const way = options.find((o) => clearPath(g, [from, ...o]));
    if (way) {
      across = [from, ...way];
      break;
    }
  }
  // Over every crown (never needed: the sky way is clear).
  const sky = skyOf(w.towers);
  across ??= [{ x: a.lane.x, y: sky, z: a.lane.z, fly: true }, { x: b.lane.x, y: sky, z: b.lane.z, fly: true }];
  const pts: Waypoint[] = [
    { x: a.x, y: a.y, z: a.z },
    { x: a.x, y: a.y + 1, z: a.z, fly: true },
    { x: a.x, y: ya, z: a.z, fly: true },
    { x: a.lane.x, y: ya, z: a.lane.z, fly: true },
    ...across,
    { x: b.lane.x, y: yb, z: b.lane.z, fly: true },
    { x: b.x, y: yb, z: b.z, fly: true },
    { x: b.x, y: b.y + 1, z: b.z, fly: true },
    { x: b.x, y: b.y, z: b.z, fly: true },
  ];
  // Without repeated points (a crown's or a foot's lane is its pad).
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y, p.z - pts[i - 1]!.z) > 0.01);
}
