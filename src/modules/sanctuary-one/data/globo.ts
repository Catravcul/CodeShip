import { LOBES, SEA, WATER_Y, lobeRadius } from "./site";

/**
 * The whales' globe (Berón 2026-11-22: «el 62 % era sobre el espacio total disponible… el espacio entre casquetes e
 * islas… no hace falta que el globo de agua sea redondo ni su base, si no más bien que siga la forma de la base total…
 * en mi mente es más pixelado y el ángulo de nacimiento de la boquilla es menos visible y cuando se va abriendo hacia
 * arriba sigue abriéndose y alineándose para formar el globo… una sola estructura incluso junto al área de agua entre
 * casquetes e islas… al ser una masa de agua natural tan grande quizás debería ser más oscura»).
 *
 * Ours, built from the map: the open sea between the caps and the islands (its shape on a grid of GLOBE_CELL m), and a
 * body of water that rises out of it in layers of GLOBE_LAYER m, each layer that sea's own shape grown or shrunk by the
 * same distance all round: at the water it covers 6/10 of the sea, narrows to a soft nozzle, then keeps opening up,
 * wider than the sea, and closes over the top. Pixelated: whole cells. It is one with the sea under it.
 */
export const GLOBE_CELL = 8;
export const GLOBE_LAYER = 8;
/** Its foot under the sea surface, m. */
export const GLOBE_FOOT_Y = -16;
/** Its foot and nozzle, by height (y m → share of the sea's area): 6/10 at the water, narrowing to the nozzle. */
export const GLOBE_PROFILE: readonly (readonly [y: number, share: number])[] = [
  [GLOBE_FOOT_Y, 0.6],
  [0, 0.6],
  [40, 0.16],
];
/**
 * The globe itself, a sphere on the nozzle (Berón 2026-11-22: «ha perdido forma de globo y ahora se ve más como
 * útero»): its centre's height and its radius, m. Its layers are round from the nozzle up (`ROUND_FROM`…`ROUND_BY`),
 * the foot's follow the sea.
 */
export const GLOBE_SPHERE = { y: 185, r: 140 } as const;
const ROUND_FROM = 20;
const ROUND_BY = 90;
/** How close the sea's shape comes to a cap, m (its water never touches the ice). */
const SHORE = 6;
/** How far out the sea between the caps reaches at most from its centre, m (beyond, the gaps lead out to the ocean). */
const SEA_REACH = 270;

export interface GlobeLayer {
  readonly y0: number;
  readonly y1: number;
  /** Its cells: "i,j" (centre at (i + ½) × GLOBE_CELL, (j + ½) × GLOBE_CELL). */
  readonly cells: ReadonlySet<string>;
}

export interface Globe {
  /** The sea between the caps: its cells and area (m²). */
  readonly sea: ReadonlySet<string>;
  readonly seaArea: number;
  readonly layers: readonly GlobeLayer[];
  readonly topY: number;
  /** Its belly: the widest layer's height, and the centre of its foot on the plan. */
  readonly bellyY: number;
  readonly x: number;
  readonly z: number;
  /** The embryo's size (a third of the globe across its belly, Berón 2026-11-22), m. */
  readonly embryo: number;
}

const key = (i: number, j: number) => `${i},${j}`;
const centre = (i: number) => (i + 0.5) * GLOBE_CELL;

/** Where the sea between the caps ends along the ray from the sea's centre at angle a (the first cap's shore). */
function reachAt(a: number): number {
  const ux = Math.cos(a);
  const uz = Math.sin(a);
  for (let r = 0; r < SEA_REACH; r += 2) {
    const x = SEA.x + ux * r;
    const z = SEA.z + uz * r;
    if (LOBES.some((l, i) => l.r > 0 && Math.hypot(x - l.x, z - l.z) < lobeRadius(l, i, x, z) + SHORE)) return r;
  }
  return SEA_REACH;
}

/** The share of the sea at height y: the foot and nozzle (GLOBE_PROFILE, eased), then the sphere's round section. */
export function globeShare(y: number): number {
  const P = GLOBE_PROFILE;
  let neck = 0;
  if (y <= P[0]![0]) neck = P[0]![1];
  else if (y >= P[P.length - 1]![0]) neck = P[P.length - 1]![1];
  else
    for (let k = 1; k < P.length; k++) {
      const [y0, s0] = P[k - 1]!;
      const [y1, s1] = P[k]!;
      if (y <= y1) {
        neck = s0 + (s1 - s0) * (0.5 - 0.5 * Math.cos((Math.PI * (y - y0)) / (y1 - y0)));
        break;
      }
    }
  const dy = y - GLOBE_SPHERE.y;
  const r2 = GLOBE_SPHERE.r ** 2 - dy * dy;
  const sphere = r2 > 0 ? (Math.PI * r2) / SEA_AREA_M2 : 0;
  // Above the sphere's widest the nozzle is long gone: only the sphere.
  return y > GLOBE_SPHERE.y ? sphere : Math.max(neck, sphere);
}
/** The sea's area, m² (filled in by build: the sphere's sections are shares of it). */
let SEA_AREA_M2 = 1;

function build(): Globe {
  // The sea between the caps: star-shaped from its centre, each direction out to the first cap (a little eased so a
  // gap between two caps does not cut a channel out to the ocean).
  const N = 360;
  const raw = Array.from({ length: N }, (_, k) => reachAt((k / N) * Math.PI * 2));
  const reach = raw.map((_, k) => Math.min(...Array.from({ length: 9 }, (_, d) => raw[(k + d - 4 + N) % N]!)));
  const span = Math.ceil((SEA_REACH + 200) / GLOBE_CELL);
  const sea = new Set<string>();
  for (let i = -span; i < span; i++)
    for (let j = -span; j < span; j++) {
      const dx = centre(i) - SEA.x;
      const dz = centre(j) - SEA.z;
      const a = Math.atan2(dz, dx);
      const k = Math.round(((a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2)) * N) % N;
      if (Math.hypot(dx, dz) < reach[k]!) sea.add(key(i, j));
    }
  // Signed distance to the sea's shore, cell by cell (+ inside, − outside), m.
  const shore: [number, number][] = [];
  for (const c of sea) {
    const [i, j] = c.split(",").map(Number) as [number, number];
    if (!sea.has(key(i + 1, j)) || !sea.has(key(i - 1, j)) || !sea.has(key(i, j + 1)) || !sea.has(key(i, j - 1))) shore.push([i, j]);
  }
  const dist = new Map<string, number>();
  for (let i = -span; i < span; i++)
    for (let j = -span; j < span; j++) {
      let d = Infinity;
      for (const [a, b] of shore) d = Math.min(d, Math.hypot(i - a, j - b));
      const inside = sea.has(key(i, j));
      dist.set(key(i, j), (inside ? d + 0.5 : -d + 0.5) * GLOBE_CELL);
    }
  const sorted = [...dist.entries()].sort((p, q) => q[1] - p[1]);
  const seaCells = sea.size;
  SEA_AREA_M2 = seaCells * GLOBE_CELL * GLOBE_CELL;
  // The centre of its foot (the deepest cells of the sea): the sphere stands over it.
  const deep = sorted.slice(0, Math.max(1, Math.round(0.05 * seaCells)));
  const x = deep.reduce((s, [k]) => s + centre(Number(k.split(",")[0])), 0) / deep.length;
  const z = deep.reduce((s, [k]) => s + centre(Number(k.split(",")[1])), 0) / deep.length;
  /**
   * The cells of a layer holding `share` of the sea's area: at the foot the sea's shape grown or shrunk evenly; from
   * the nozzle up, more and more round about the centre (t from 0 to 1), so the globe is a globe.
   */
  const cellsFor = (share: number, t: number): Set<string> => {
    const score = (k: string, d: number) => {
      const [i, j] = k.split(",").map(Number) as [number, number];
      return (1 - t) * d - t * Math.hypot(centre(i) - x, centre(j) - z);
    };
    const ranked = t <= 0 ? sorted : [...dist.entries()].map(([k, d]) => [k, score(k, d)] as const).sort((p, q) => q[1] - p[1]);
    return new Set(ranked.slice(0, Math.round(share * seaCells)).map(([k]) => k));
  };
  const layers: GlobeLayer[] = [];
  let top = 0;
  let belly = 0;
  let widest = 0;
  for (let y0 = GLOBE_FOOT_Y; ; y0 += GLOBE_LAYER) {
    const ym = y0 + GLOBE_LAYER / 2;
    const share = globeShare(ym);
    if (share <= 0.002) break;
    const cells = cellsFor(share, Math.max(0, Math.min(1, (ym - ROUND_FROM) / (ROUND_BY - ROUND_FROM))));
    if (!cells.size) break;
    layers.push({ y0, y1: y0 + GLOBE_LAYER, cells });
    top = y0 + GLOBE_LAYER;
    if (cells.size > widest) {
      widest = cells.size;
      belly = y0 + GLOBE_LAYER / 2;
    }
  }
  const across = 2 * Math.sqrt((widest * GLOBE_CELL * GLOBE_CELL) / Math.PI);
  return { sea, seaArea: seaCells * GLOBE_CELL * GLOBE_CELL, layers, topY: top, bellyY: belly, x, z, embryo: across / 3 };
}

export const GLOBE: Globe = build();

/** The cell (i, j) of a point on the plan. */
export const globeCell = (x: number, z: number): [number, number] => [Math.floor(x / GLOBE_CELL), Math.floor(z / GLOBE_CELL)];

/** The globe's water surface over (x, z): the top of its highest layer there (undefined if none). */
export function globeTopAt(x: number, z: number): number | undefined {
  const [i, j] = globeCell(x, z);
  const k = key(i, j);
  let top: number | undefined;
  for (const l of GLOBE.layers) if (l.cells.has(k)) top = l.y1;
  return top;
}

/**
 * How deep in the globe's water a point is, for its light (Berón 2026-11-22: «la luz debe venir de la superficie y
 * oscurecerse con la profundidad… ¿cómo es posible que el fondo sea más claro que la superficie?»): in the sea, below
 * its surface; in the nozzle and the globe, to the nearest face of its skin (up to its top, or out through its side,
 * since the sky is all round it), m.
 */
export function globeDepth(x: number, y: number, z: number): number {
  if (y <= WATER_Y) return WATER_Y - y;
  const l = GLOBE.layers.find((q) => y >= q.y0 && y < q.y1);
  const top = globeTopAt(x, z);
  if (!l || top === undefined) return 0;
  const [i, j] = globeCell(x, z);
  // The nearest cell of this layer that is not water, ring by ring (at most 16 cells out: the belly's half-width).
  let side = 16 * GLOBE_CELL;
  for (let r = 1; r <= 16 && side === 16 * GLOBE_CELL; r++)
    for (let a = -r; a <= r; a++)
      for (const [di, dj] of [[a, -r], [a, r], [-r, a], [r, a]] as const)
        if (!l.cells.has(key(i + di, j + dj))) side = Math.min(side, (r - 0.5) * GLOBE_CELL);
  return Math.max(0, Math.min(top - y, side));
}

/** The layer's cells as boxes on the plan (runs along x, merged across rows when equal), m. */
export function layerBoxes(l: GlobeLayer): { x0: number; x1: number; z0: number; z1: number }[] {
  const rows = new Map<number, number[]>();
  for (const c of l.cells) {
    const [i, j] = c.split(",").map(Number) as [number, number];
    rows.set(j, [...(rows.get(j) ?? []), i]);
  }
  const runs = new Map<string, { i0: number; i1: number; j0: number; j1: number }>();
  for (const j of [...rows.keys()].sort((a, b) => a - b)) {
    const is = rows.get(j)!.sort((a, b) => a - b);
    let s = is[0]!;
    for (let k = 1; k <= is.length; k++) {
      if (k < is.length && is[k] === is[k - 1]! + 1) continue;
      const e = is[k - 1]!;
      const prev = runs.get(`${s},${e},${j - 1}`);
      if (prev) {
        runs.delete(`${s},${e},${j - 1}`);
        prev.j1 = j;
        runs.set(`${s},${e},${j}`, prev);
      } else runs.set(`${s},${e},${j}`, { i0: s, i1: e, j0: j, j1: j });
      if (k < is.length) s = is[k]!;
    }
  }
  return [...runs.values()].map((r) => ({ x0: r.i0 * GLOBE_CELL, x1: (r.i1 + 1) * GLOBE_CELL, z0: r.j0 * GLOBE_CELL, z1: (r.j1 + 1) * GLOBE_CELL }));
}

/**
 * The globe's skin: a quad (two triangles, as x, y, z positions) on every face between a cell of water and air, the
 * foot's underside left open to the sea. What the scene draws, and what the performance budget counts (rendimiento.test.ts).
 */
export function globeSkin(): number[] {
  const C = GLOBE_CELL;
  const L0 = GLOBE.layers;
  const pos: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  L0.forEach((l, n) => {
    const below = L0[n - 1]?.cells;
    const above = L0[n + 1]?.cells;
    for (const k of l.cells) {
      const [i, j] = k.split(",").map(Number) as [number, number];
      const x0 = i * C, x1 = x0 + C, z0 = j * C, z1 = z0 + C, y0 = l.y0, y1 = l.y1;
      if (!l.cells.has(`${i + 1},${j}`)) quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
      if (!l.cells.has(`${i - 1},${j}`)) quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]);
      if (!l.cells.has(`${i},${j + 1}`)) quad([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]);
      if (!l.cells.has(`${i},${j - 1}`)) quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]);
      if (!above?.has(k)) quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
      if (!below?.has(k) && n > 0) quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]);
    }
  });
  return pos;
}
