import { TREE } from "@modules/aerial-sanctuary/data/facts";
import { ROOM_OWNERS } from "./models/residencia";
import { TRUNK_HALF } from "./paso";

/**
 * THE RESIDENCIA'S CROWN: FOUR CASTLES ROUND THE PILLOW RING (Berón 2026-11-24: «transformar las literas en castillos
 * o fuertes que rodeen el ring de almohadas, todos los castillos deben tener toboganes que desembocan a orillas del
 * ring… múltiples vías para llegar al tobogán y múltiples uniones y desniveles entre habitáculos… cada habitáculo será
 * un aposento… las camas muy grandes para hacer pijamadas»). The pattern of the play structures of fast-food
 * restaurants (Berón's two photos): a frame of red posts with decks at several heights, joined by stairs, nets and
 * bridges, panels to see through, a tower and a tube slide from the top down to the floor.
 *
 * The crown frame: origin on the trunk's axis, metres, at the crown's floor. The trunk comes up in the middle (the way
 * in); round it a walk, then the pillow ring as a band all round (the arena), a path, and the four castles, one on each
 * side; their corners for the classroom, the reading corner, the shared kitchen and the toilets; a garden all round
 * the edge. Each castle in its own frame: u along its side, v outwards from the path (v = 0 faces the ring), y up.
 *
 * Sizes (ours, after the rules): a deck every 4,2 m of height (the bunk of 3,7 m fits under it), steps of ≤ 0,47 m rise
 * and 0,6 m tread (walk.ts STEP_M 0,6), rails of 1 m (EN 1176-1: guard rails of play equipment, 0,7 m minimum), a
 * ladder of ≤ 4,2 m (climb.ts LADDER_MAX_M), slides of 1 m wide whose last stretch is nearly level so one comes out
 * slowly (EN 1176-3: run-out section), the aposentos the Residencia's 9 × 7 m rooms with their bunk for 8.
 */

/** The trunk's outer half (its water and wall), m. */
export const TRUNK_OUT = TRUNK_HALF + TREE.wall.value;
/** The rings of the crown, as distances from the trunk's axis (a square's half side), m. */
export const CROWN = {
  /** Walk round the trunk. */
  walk: TRUNK_OUT + 2,
  /** The pillow ring: a band of soft mattress all round. */
  arena: TRUNK_OUT + 14,
  /** The path in front of the castles. */
  path: TRUNK_OUT + 16,
  /** The castles' back. */
  castles: TRUNK_OUT + 34,
  /** The crown's edge, after the garden. */
  half: TRUNK_OUT + 39,
} as const;
/** The pillow ring's mattress, over the crown's floor (no step: the soft edge is walked over). */
export const ARENA_Y = 0.25;

/** The castles' levels over the crown's floor, m. */
export const LEVEL = { a: 4.2, b: 5.4, top: 9.6, tower: 13.8 } as const;

export const TEAMS = [
  { id: "rojo", name: "Castillo Rojo", color: 0xd8342a },
  { id: "azul", name: "Castillo Azul", color: 0x2a6fd8 },
  { id: "amarillo", name: "Castillo Amarillo", color: 0xf2c21e },
  { id: "verde", name: "Castillo Verde", color: 0x2fa84f },
] as const;
export type TeamId = (typeof TEAMS)[number]["id"];

export interface Deck {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  readonly y: number;
  readonly kind: "cubierta" | "escalon" | "puente" | "torre";
  /** A climbing net up to this deck: where it stands, below. */
  readonly ladder?: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number };
}
export interface Box3 {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  readonly y0: number;
  readonly y1: number;
}
export interface P3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Castle {
  readonly team: TeamId;
  readonly name: string;
  readonly color: number;
  /** Its side of the crown (0–3) and its turn. */
  readonly side: number;
  readonly yaw: number;
  readonly decks: readonly Deck[];
  readonly rails: readonly Box3[];
  readonly columns: readonly Box3[];
  readonly slides: readonly (readonly P3[])[];
  /** Its aposentos: where each room model stands, its turn and its name. */
  readonly rooms: readonly { readonly x: number; readonly y: number; readonly z: number; readonly yaw: number; readonly name: string; readonly model: string }[];
  /** Where its treasure is kept (on the top deck, under the tower). */
  readonly treasure: P3;
  /** Its footprint on the crown's floor (who is inside it). */
  readonly area: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number };
}

/** A point of a side's castle frame (u, v from the path, y) in the crown frame. */
export function onSide(side: number, u: number, v: number): { x: number; z: number } {
  const x = u;
  const z = CROWN.path + v;
  switch (((side % 4) + 4) % 4) {
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

const rect = (side: number, u0: number, u1: number, v0: number, v1: number) => {
  const a = onSide(side, u0, v0);
  const b = onSide(side, u1, v1);
  return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) };
};

/** How long the landing at the top of a flight is, m (one turns there onto the deck, through the rail's gap). */
export const LANDING_M = 1.4;

/**
 * A flight of steps along u from (uLow, yLow) to (uHigh, yHigh), each `tread` long, between v0 and v1, and its landing
 * at the top (LANDING_M on, at the deck's height) beside the deck it serves.
 */
function stairs(side: number, uLow: number, uHigh: number, yLow: number, yHigh: number, v0: number, v1: number): Deck[] {
  const n = Math.ceil((yHigh - yLow) / 0.47);
  const dir = Math.sign(uHigh - uLow);
  const tread = Math.abs(uHigh - uLow) / n;
  return Array.from({ length: n }, (_, i) => {
    const ua = uLow + dir * tread * i;
    const ub = ua + dir * tread + (i === n - 1 ? dir * LANDING_M : 0);
    return { ...rect(side, Math.min(ua, ub), Math.max(ua, ub), v0, v1), y: yLow + ((yHigh - yLow) * (i + 1)) / n, kind: "escalon" as const };
  });
}

/** A rail of 1 m along u at v (or along v at u) over a deck at y, with gaps (in u or v). */
function rail(side: number, along: "u" | "v", at: number, from: number, to: number, y: number, gaps: readonly (readonly [number, number])[] = []): Box3[] {
  const cuts = [...gaps].sort((a, b) => a[0] - b[0]);
  const out: Box3[] = [];
  let a = from;
  for (const [g0, g1] of [...cuts, [to, to] as const]) {
    if (g0 > a + 0.05) {
      const r = along === "u" ? rect(side, a, g0, at - 0.04, at + 0.04) : rect(side, at - 0.04, at + 0.04, a, g0);
      out.push({ ...r, y0: y, y1: y + 1 });
    }
    a = Math.max(a, g1);
  }
  return out;
}

/** A post from y0 to y1 at (u, v). */
const post = (side: number, u: number, v: number, y0: number, y1: number): Box3 => ({ ...rect(side, u - 0.14, u + 0.14, v - 0.14, v + 0.14), y0, y1 });

/** The tube slide from the tower: a chute down to a helix in front of the castle, out onto the ring's edge. */
function bigSlide(side: number): P3[] {
  const pts: P3[] = [];
  const add = (u: number, v: number, y: number) => {
    const p = onSide(side, u, v);
    pts.push({ x: p.x, y, z: p.z });
  };
  // The chute from the tower's front, over the top deck.
  for (let i = 0; i <= 6; i++) add(0, 12 - (8 * i) / 6, LEVEL.tower - (1.8 * i) / 6);
  // The helix round (0, 1), radius 3, two turns, from 12 m down to 1 m.
  const turns = 2;
  const n = 48;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const a = Math.PI / 2 + t * turns * Math.PI * 2;
    add(Math.cos(a) * 3, 1 + Math.sin(a) * 3, LEVEL.tower - 1.8 - (LEVEL.tower - 1.8 - 1) * t);
  }
  // The run-out, nearly level, onto the ring's edge.
  for (let i = 1; i <= 4; i++) add(0, 4 - (8 * i) / 4 - 3, 1 - (0.7 * i) / 4);
  return pts;
}

/** The short straight slide from the low deck A to the ring. */
function smallSlide(side: number): P3[] {
  const pts: P3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const v = 4 - 8 * t;
    const y = t < 0.8 ? LEVEL.a - (LEVEL.a - 0.6) * (t / 0.8) : 0.6 - 0.3 * ((t - 0.8) / 0.2);
    const p = onSide(side, -24, v);
    pts.push({ x: p.x, y, z: p.z });
  }
  return pts;
}

/** The castles' aposentos in their frame, in the order they are given to their owners (u, v, y). */
const ROOM_SLOTS: readonly (readonly [number, number, number])[] = [
  [-13.5, 13.5, LEVEL.top],
  [13.5, 13.5, LEVEL.top],
  [-23.5, 13, LEVEL.a],
  [-13, 13, LEVEL.a],
  [13, 13, LEVEL.b],
  [23.5, 13, LEVEL.b],
  [-22, 11, 0],
  [22, 11, 0],
];

/** How many aposentos each castle has: the 30 rooms of the Residencia, 8, 8, 7, 7. */
export const ROOMS_PER_CASTLE = [8, 8, 7, 7] as const;

function castle(side: number, firstRoom: number): Castle {
  const team = TEAMS[side]!;
  const D: Deck[] = [];
  const deck = (u0: number, u1: number, v0: number, v1: number, y: number, kind: Deck["kind"] = "cubierta", ladder?: [number, number, number, number]) =>
    D.push({ ...rect(side, u0, u1, v0, v1), y, kind, ...(ladder ? { ladder: rect(side, ...ladder) } : {}) });
  // Deck A (left, 4,2 m) and deck B (right, 5,4 m): a half level apart, joined by a stepped bridge at the back.
  deck(-30, -4, 4, 18, LEVEL.a);
  deck(4, 30, 4, 18, LEVEL.b);
  deck(-4, -1.33, 12, 18, LEVEL.a + 0.4, "puente");
  deck(-1.33, 1.33, 12, 18, LEVEL.a + 0.8, "puente");
  deck(1.33, 4, 12, 18, LEVEL.b, "puente");
  // The top deck (9,6 m) over the middle, and the tower (13,8 m) on it, with its climbing net from the top deck.
  deck(-18, 18, 8.4, 18, LEVEL.top);
  deck(-4, 4, 12, 18, LEVEL.tower, "torre", [4, 4.6, 14, 16]);
  // The ways up: from the floor to A and to B along the front; from A and from B to the top; from the top to the tower.
  D.push(...stairs(side, -6, -11.4, 0, LEVEL.a, 0.6, 4));
  D.push(...stairs(side, 6, 13.2, 0, LEVEL.b, 0.6, 4));
  D.push(...stairs(side, -8, -15.2, LEVEL.a, LEVEL.top, 4.6, 8.4));
  D.push(...stairs(side, 8, 14, LEVEL.b, LEVEL.top, 4.6, 8.4));
  D.push(...stairs(side, -9, -3, LEVEL.top, LEVEL.tower, 8.4, 12));
  // A second way onto A: a climbing net from the floor at its far end (her climb, climb.ts).
  D.push({ ...rect(side, -30, -26, 4, 8), y: LEVEL.a, kind: "cubierta", ladder: rect(side, -29.5, -27.5, 3.4, 4) });
  // Rails all round the decks, open where a stair, the bridge, a net or a slide comes in.
  const R: Box3[] = [
    ...rail(side, "u", 4, -30, -4, LEVEL.a, [[-13, -10.6], [-24.8, -23.2], [-29.6, -27.4]]),
    ...rail(side, "u", 18, -30, -4, LEVEL.a),
    ...rail(side, "v", -30, 4, 18, LEVEL.a),
    ...rail(side, "v", -4, 4, 12, LEVEL.a),
    ...rail(side, "u", 4, 4, 30, LEVEL.b, [[12.4, 14.8]]),
    ...rail(side, "u", 18, 4, 30, LEVEL.b),
    ...rail(side, "v", 30, 4, 18, LEVEL.b),
    ...rail(side, "v", 4, 4, 12, LEVEL.b),
    ...rail(side, "u", 18, -4, 4, LEVEL.b),
    ...rail(side, "u", 8.4, -18, 18, LEVEL.top, [[-16.8, -14.4], [13.2, 15.6]]),
    ...rail(side, "u", 18, -18, 18, LEVEL.top),
    ...rail(side, "v", -18, 8.4, 18, LEVEL.top),
    ...rail(side, "v", 18, 8.4, 18, LEVEL.top),
    ...rail(side, "u", 12, -4, 4, LEVEL.tower, [[-3.8, -1.4], [-0.7, 0.7]]),
    ...rail(side, "u", 18, -4, 4, LEVEL.tower),
    ...rail(side, "v", -4, 12, 18, LEVEL.tower),
    ...rail(side, "v", 4, 12, 18, LEVEL.tower, [[13.8, 16.2]]),
  ];
  // The red posts: under the corners of every deck and every few metres.
  const C: Box3[] = [];
  for (const u of [-30, -22, -14, -4]) for (const v of [4, 18]) C.push(post(side, u, v, 0, LEVEL.a + 1));
  for (const u of [4, 14, 22, 30]) for (const v of [4, 18]) C.push(post(side, u, v, 0, LEVEL.b + 1));
  for (const u of [-18, 18]) for (const v of [8.4, 18]) C.push(post(side, u, v, u < 0 ? LEVEL.a : LEVEL.b, LEVEL.top + 1));
  for (const u of [-4, 4]) for (const v of [12, 18]) C.push(post(side, u, v, LEVEL.top, LEVEL.tower + 2.6));
  // Its aposentos, given to the Residencia's owners in order (as the rooms were).
  const rooms = ROOM_SLOTS.slice(0, ROOMS_PER_CASTLE[side]!).map(([u, v, y], i) => {
    const n = firstRoom + i;
    const p = onSide(side, u, v);
    const who = ROOM_OWNERS[n];
    return { x: p.x, y, z: p.z, yaw: (side * Math.PI) / 2, name: who ? `Aposento de ${who}` : `Aposento libre ${n + 1}`, model: `res-habitacion-${(n % 2) + 1}` };
  });
  const tp = onSide(side, 0, 15.5);
  return {
    team: team.id,
    name: team.name,
    color: team.color,
    side,
    yaw: (side * Math.PI) / 2,
    decks: D,
    rails: R,
    columns: C,
    slides: [bigSlide(side), smallSlide(side)],
    rooms,
    treasure: { x: tp.x, y: LEVEL.top, z: tp.z },
    area: rect(side, -30.5, 30.5, -0.5, 18.5),
  };
}

/** The four castles, side by side round the ring, the Residencia's 30 aposentos among them. */
export const CASTILLOS: readonly Castle[] = (() => {
  let n = 0;
  return [0, 1, 2, 3].map((s) => {
    const c = castle(s, n);
    n += ROOMS_PER_CASTLE[s]!;
    return c;
  });
})();

/** The pillow ring (the arena): the band between the walk round the trunk and the path, as four rectangles. */
export function arenaRects(): { x0: number; x1: number; z0: number; z1: number }[] {
  const a = CROWN.walk;
  const b = CROWN.arena;
  return [
    { x0: -b, x1: b, z0: a, z1: b },
    { x0: -b, x1: b, z0: -b, z1: -a },
    { x0: a, x1: b, z0: -a, z1: a },
    { x0: -b, x1: -a, z0: -a, z1: a },
  ];
}

/** Which castle a point of the crown is in (its footprint, any height), if any. */
export function castleAt(x: number, z: number): Castle | undefined {
  return CASTILLOS.find((c) => x >= c.area.x0 && x <= c.area.x1 && z >= c.area.z0 && z <= c.area.z1);
}

/** The crown's square of side 2·CROWN.half, its share of a 40 × 40 m floor (organizacion.ts). */
export const CROWN_AREA_M2 = (2 * CROWN.half) ** 2;

export const CASTILLOS_SOURCE =
  "Berón 2026-11-24 (castillos con toboganes alrededor del ring; fotos de las zonas de juego de Burger King y KFC); EN 1176-1 y EN 1176-3 (barandillas, toboganes); Cold Sanctuary docs/guerra-de-almohadas.md";
