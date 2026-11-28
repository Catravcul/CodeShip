/**
 * THE MOUNTAIN OF THE AIR ISLAND (docs/design/bioma-s3.md): sanctuary 3's biome is the air and the heights (Berón,
 * 2026-11-20), so its island is one giant mountain from the shore to the snows, procedural and deterministic. This is
 * the pure shape: a height for every point (summit pyramid, a ring of cliffs with a gentler ridge through it, meadow
 * shoulders, forested slopes, a coastal plain and a deep gorge cut to the sea), how steep it is there, and which real
 * altitude belt a height stands for. The numbers of the shape are data (data/bioma-island.ts `MOUNTAIN`), so its
 * place and size change by data. Coordinates are the island's own plan metres (true size), y up from the sea.
 */
export interface Knot {
  /** Distance from the summit, m. */
  readonly d: number;
  /** Height there, m. */
  readonly h: number;
}

export interface MountainDef {
  /** Half the island's extent on the plan (an ellipse with a wavy shore), m. */
  readonly half: { readonly x: number; readonly z: number };
  /** The summit, local m. */
  readonly peak: { readonly x: number; readonly z: number };
  /** The height by distance from the summit where the cliffs ring it, and along the ridge that breaks through them. */
  readonly cliffs: readonly Knot[];
  readonly ridge: readonly Knot[];
  /** The ridge's bearing from the summit (rad, atan2(z, x)) and its half width (rad). */
  readonly ridgeAt: number;
  readonly ridgeWidth: number;
  /** Bumps of rock and hollows (m of noise at the shore and at the summit). */
  readonly roughShore: number;
  readonly roughTop: number;
  /** Flats levelled for the station, the helipad and the meadows: centre, radius where it is flat, and its height. */
  readonly flats: readonly { readonly x: number; readonly z: number; readonly r: number; readonly h?: number; readonly share?: number }[];
  /** The gorge: its line from the sea inland, the river's height at each point and the canyon's floor half width. */
  readonly gorge: readonly { readonly x: number; readonly z: number; readonly floor: number }[];
  readonly gorgeFloorHalf: number;
  /** Paths graded into the slope (her trails up the mountain): their points, the ground levelled along them. */
  readonly trails?: readonly (readonly { readonly x: number; readonly z: number }[])[];
  /** Real altitude of the sea line and how many real metres each metre of the island stands for. */
  readonly baseAltitudeM: number;
  readonly altitudePerM: number;
  /** Steepest ground she walks on (rad). */
  readonly walkSlope: number;
  /** The hollow pyramid buried under the mountain and its caves (Berón 2026-11-25), if it has one. */
  readonly core?: MountainCore;
}

/**
 * THE ARTIFICIAL MOUNTAIN (Berón 2026-11-25: «la montaña pasará a ser una montaña artificial, tendrá cuevas hacia su
 * interior que estará hueco… imagino que la construcción es una pirámide que ha sido cubierta por tierra y piedra hasta
 * llegar a parecer una montaña»): a square pyramid (centre, half base, base level, height) buried under at least
 * `cover` m of earth and stone, and the caves that bore into it, each a straight tunnel at its floor level from the
 * mouth on the slope to the pyramid's wall. Local m, as the rest of the mountain.
 */
export interface MountainCore {
  readonly x: number;
  readonly z: number;
  readonly half: number;
  readonly baseY: number;
  readonly height: number;
  readonly cover: number;
  readonly caves: readonly CaveDef[];
}

export interface CaveDef {
  readonly id: string;
  /** From the mouth (on the slope) to the end (at the pyramid's inner wall), local m. */
  readonly from: { readonly x: number; readonly z: number };
  readonly to: { readonly x: number; readonly z: number };
  /** Its floor's height (over the lake inside: the caves never end under water). */
  readonly y: number;
  /** Half its width, and its height to the vault, m. */
  readonly half: number;
  readonly vault: number;
}

/** The pyramid's own height at (x, z) (its outer face), or −∞ off it. */
export function pyramidTop(c: MountainCore, x: number, z: number): number {
  const d = Math.max(Math.abs(x - c.x), Math.abs(z - c.z));
  return d > c.half ? -Infinity : c.baseY + c.height * (1 - d / c.half);
}

/** The least height of the ground over the buried pyramid: its face plus the cover, falling at 45° past its base. */
function coverAt(c: MountainCore, x: number, z: number): number {
  const d = Math.max(Math.abs(x - c.x), Math.abs(z - c.z));
  return d <= c.half ? c.baseY + c.height * (1 - d / c.half) + c.cover : c.baseY + c.cover - (d - c.half);
}

/** Distance from (x, z) to a cave's line, and how far along it (0 the mouth … 1 the end). */
export function caveAt(cave: CaveDef, x: number, z: number): { q: number; t: number } {
  const dx = cave.to.x - cave.from.x;
  const dz = cave.to.z - cave.from.z;
  const L2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - cave.from.x) * dx + (z - cave.from.z) * dz) / L2));
  return { q: Math.hypot(x - (cave.from.x + dx * t), z - (cave.from.z + dz * t)), t };
}

/** The open cut at a cave's mouth: where the ground is lower than its vault the ground is dug down to its floor. */
function caveCut(c: MountainCore, x: number, z: number, h: number): number {
  for (const cave of c.caves) {
    const { q } = caveAt(cave, x, z);
    if (q > cave.half + 6) continue;
    if (h <= cave.y - 0.05 || h >= cave.y + cave.vault + 2) continue;
    const floor = cave.y - 0.05;
    h = q <= cave.half ? floor : floor + (h - floor) * smooth(cave.half, cave.half + 6, q);
  }
  return h;
}

/** The sea's surface (layout.ts SEA_Y). */
const SEA = -0.6;

// ── Noise (deterministic value noise) ──────────────────────────────────────────────────────────────────────────────
function hash2(i: number, j: number, s: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function value(x: number, z: number, s: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j, s);
  const b = hash2(i + 1, j, s);
  const c = hash2(i, j + 1, s);
  const d = hash2(i + 1, j + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
/** Fractal noise, about −1…1. */
export function fbm(x: number, z: number, wave: number, octaves = 4, seed = 1): number {
  let t = 0;
  let amp = 0.55;
  let f = 1 / wave;
  for (let o = 0; o < octaves; o++) {
    t += amp * value(x * f, z * f, seed + o * 17);
    amp *= 0.5;
    f *= 2.03;
  }
  return t;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A profile between its knots, smoothed (each span eased): no kinks where the slopes meet. */
export function profile(knots: readonly Knot[], d: number): number {
  if (d <= knots[0]!.d) return knots[0]!.h;
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1]!;
    const b = knots[i]!;
    if (d <= b.d) {
      const t = (d - a.d) / (b.d - a.d);
      // Half linear, half eased: the slope of each span keeps its mean, the joins soften.
      const e = 0.5 * t + 0.5 * (t * t * (3 - 2 * t));
      return a.h + (b.h - a.h) * e;
    }
  }
  return knots[knots.length - 1]!.h;
}

/** The shore's radius over the ellipse's at angle `a` (rad): bays and points. */
export const shoreAt = (a: number): number => 1 + 0.06 * Math.sin(3 * a + 0.6) + 0.04 * Math.sin(5 * a + 1.7) + 0.025 * Math.sin(9 * a + 0.3);

/** How far out of the land (local m): < 1 on the island, 1 at the shore. */
export function landRadius(m: MountainDef, x: number, z: number): number {
  const a = Math.atan2(z / m.half.z, x / m.half.x);
  return Math.hypot(x / m.half.x, z / m.half.z) / shoreAt(a);
}

/** Distance from (x, z) to the gorge's line, and the river's height at the nearest point. */
export function gorgeAt(m: MountainDef, x: number, z: number): { q: number; floor: number; t: number } {
  let best = { q: Infinity, floor: 0, t: 0 };
  for (let i = 1; i < m.gorge.length; i++) {
    const a = m.gorge[i - 1]!;
    const b = m.gorge[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const L2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
    const q = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
    if (q < best.q) best = { q, floor: a.floor + (b.floor - a.floor) * u, t: (i - 1 + u) / (m.gorge.length - 1) };
  }
  return best;
}

/** The mountain without its gorge: summit, cliffs or ridge, shoulders and the shore. */
function massif(m: MountainDef, x: number, z: number): number {
  const dx = x - m.peak.x;
  const dz = z - m.peak.z;
  const d = Math.hypot(dx, dz);
  const a = Math.atan2(dz, dx);
  const off = Math.atan2(Math.sin(a - m.ridgeAt), Math.cos(a - m.ridgeAt));
  const w = Math.exp(-((off / m.ridgeWidth) ** 2));
  // The ring of cliffs wanders a little round the mountain (ours: no perfect circle).
  const dd = d * (1 + 0.08 * Math.sin(3 * a + 1.1) + 0.04 * Math.sin(7 * a + 0.4));
  let h = profile(m.cliffs, dd) * (1 - w) + profile(m.ridge, dd) * w;
  const rough = m.roughShore + (m.roughTop - m.roughShore) * Math.min(1, Math.max(0, h / 400));
  h += rough * fbm(x, z, 90, 4, 7);
  // The shore: the land falls to a beach and under the sea.
  const r = landRadius(m, x, z);
  const coast = 1 - smooth(0.86, 1, r);
  h = h * coast + 0.4 * (1 - coast);
  // The beach slopes under the sea past the shore line, then the sea floor falls away.
  if (r > 0.98) h = Math.min(h, r < 1.03 ? 0.4 - ((r - 0.98) / 0.05) * 3.4 : -3 - (r - 1.03) * 120);
  return levelled(m, x, z, h);
}

/** The flats levelled at their height (the station's, the helipad's), blended into the slope around them. */
function levelled(m: MountainDef, x: number, z: number, h: number): number {
  for (const f of m.flats) {
    const k = (1 - smooth(f.r, f.r * 2.8, Math.hypot(x - f.x, z - f.z))) * (f.share ?? 1);
    if (k > 0) h = h + ((f.h ?? h) - h) * k;
  }
  return h;
}

/** Half width of a trail's tread, and how far its cut or fill blends into the slope, m. */
const TRAIL_HALF = 2;
const TRAIL_BLEND = 14;

/** The trails cut into the slope: on a trail the ground follows its even grade from point to point. */
function trails(m: MountainDef, x: number, z: number, h: number): number {
  // The nearest point of all the trails: one tread height, blended once (no steps where two legs or trails meet).
  let best = { q: Infinity, tread: 0 };
  for (const t of m.trails ?? []) {
    for (let i = 1; i < t.length; i++) {
      const a = t[i - 1]!;
      const b = t[i]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      const q = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
      if (q >= best.q || q >= TRAIL_HALF + TRAIL_BLEND) continue;
      const ha = trailHeight(m, a);
      best = { q, tread: ha + (trailHeight(m, b) - ha) * u };
    }
  }
  return best.q < Infinity ? best.tread + (h - best.tread) * smooth(TRAIL_HALF, TRAIL_HALF + TRAIL_BLEND, best.q) : h;
}
const trailCache = new WeakMap<object, number>();
/** A trail point's height: the massif's there (cached per point). */
function trailHeight(m: MountainDef, p: { readonly x: number; readonly z: number }): number {
  let h = trailCache.get(p);
  if (h === undefined) trailCache.set(p, (h = massif(m, p.x, p.z)));
  return h;
}

/** The ground's height at local (x, z): the massif and its trails, with the gorge cut into it down to its river. */
export function heightAt(m: MountainDef, x: number, z: number): number {
  const h = natural(m, x, z);
  if (!m.core) return h;
  // The buried pyramid: never less than its cover over it; the caves' mouths cut into the slope.
  return caveCut(m.core, x, z, Math.max(h, coverAt(m.core, x, z)));
}

/** The ground before the pyramid was buried in it. */
function natural(m: MountainDef, x: number, z: number): number {
  // The flats win over the trails that leave them (a trail starts at the flat's height and climbs from its edge).
  const h = levelled(m, x, z, trails(m, x, z, massif(m, x, z)));
  const g = gorgeAt(m, x, z);
  const depth = h - g.floor;
  if (depth <= 0) return h;
  // The canyon: a narrow floor, walls nearly vertical low down and easing to its rim (half width grows with depth).
  const W = m.gorgeFloorHalf + 18 + 0.28 * depth;
  if (g.q >= W) return h;
  if (g.q <= m.gorgeFloorHalf) return g.floor;
  const u = (g.q - m.gorgeFloorHalf) / (W - m.gorgeFloorHalf);
  // Shallow at the mouth (a river valley), sheer where it is deep.
  return Math.min(h, g.floor + depth * Math.pow(u, 1 - 0.55 * smooth(10, 60, depth)));
}

/** The ground's slope at (x, z), as rise over run (1 = 45°). */
export function slopeAt(m: MountainDef, x: number, z: number, e = 0.75): number {
  const hx = heightAt(m, x + e, z) - heightAt(m, x - e, z);
  const hz = heightAt(m, x, z + e) - heightAt(m, x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

/** Can she stand there: on the land and not steeper than her limit. */
export function walkableAt(m: MountainDef, x: number, z: number): boolean {
  return heightAt(m, x, z) > SEA + 0.05 && slopeAt(m, x, z) <= Math.tan(m.walkSlope);
}

/** The real altitude a height of the island stands for, m (licencia: the belts compressed to fit). */
export const altitudeOf = (m: MountainDef, y: number): number => m.baseAltitudeM + Math.max(0, y) * m.altitudePerM;
/** The island's height for a real altitude. */
export const heightOfAltitude = (m: MountainDef, alt: number): number => (alt - m.baseAltitudeM) / m.altitudePerM;

export interface Belt {
  readonly id: string;
  readonly label: string;
  /** Real altitudes, m. */
  readonly from: number;
  readonly to: number;
}

/** The belt of a real altitude (the highest one that holds it). */
export function beltOf(belts: readonly Belt[], alt: number): Belt {
  return [...belts].reverse().find((b) => alt >= b.from) ?? belts[0]!;
}

/**
 * Mean air temperature at real altitude `alt` from a station's mean (°C at `stationM`), by the standard lapse rate
 * (6,5 °C per km: ICAO standard atmosphere).
 */
export const LAPSE_C_PER_KM = 6.5;
export const tempAtAltitude = (stationC: number, stationM: number, alt: number): number => stationC - (LAPSE_C_PER_KM * (alt - stationM)) / 1000;
