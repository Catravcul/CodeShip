import { Vec3 } from "@core/math/vec3";

/**
 * Handrails for moving about inside in microgravity (IVA). On the ISS they are short bars bolted to
 * the rack fronts and around the hatches; crew grab them to start, stop, turn and steady themselves
 * (NASA-STD-3000 §8.9.2, docs/design/ingravidez.md).
 */
export interface Handrail {
  readonly id: string;
  /** Ends of the bar (its grip line), m. */
  readonly a: Vec3;
  readonly b: Vec3;
  /** Unit vector from the wall the rail is mounted on into the free space. */
  readonly normal: Vec3;
  /** Where on the bar she lands when hopping to it (0…1, default the middle; hops.ts). */
  readonly landT?: number;
}

/**
 * Game values for the rail layout, rounded from the sources in docs/design/ingravidez.md:
 * one rail per ISPR rack bay (1,05 m), bars long enough for both hands (NASA-STD-3000 asks ≥ 14 cm
 * of grip), standing off the wall (≥ 3,8 cm of clearance for the hand).
 */
export const RAIL_LAYOUT = {
  /** Length of one bar, m. */
  lengthM: 0.5,
  /** Spacing between bars along a wall, m: one per ISPR rack bay. */
  pitchM: 1.05,
  /** Grip line off the wall, m. */
  standoffM: 0.08,
  /** Grip line in from the corner of an aisle, m (so her body still fits beside it). */
  cornerInsetM: 0.35,
} as const;

/** Point of a rail at parameter t (0 = a, 1 = b). */
export function railPoint(r: Handrail, t: number): Vec3 {
  return r.a.add(r.b.sub(r.a).scale(t));
}

/** Closest point of a rail to p: its parameter, the point and the distance. */
export function closestOnRail(r: Handrail, p: Vec3): { t: number; point: Vec3; distance: number } {
  const ab = r.b.sub(r.a);
  const len2 = ab.dot(ab);
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, p.sub(r.a).dot(ab) / len2));
  const point = railPoint(r, t);
  return { t, point, distance: point.sub(p).length() };
}

/** Shortest distance between two rails (sampled; rails are short). */
export function railGap(r: Handrail, s: Handrail): number {
  let best = Infinity;
  for (let i = 0; i <= 8; i++) best = Math.min(best, closestOnRail(s, railPoint(r, i / 8)).distance);
  return best;
}

/**
 * The rails of a place and which ones are within a hand's reach of each other (to go hand over
 * hand from one to the next).
 */
export class RailGraph {
  private readonly byId = new Map<string, Handrail>();
  private readonly next = new Map<string, string[]>();

  constructor(
    readonly rails: readonly Handrail[],
    /** Gap between two rails she can bridge by letting go with one hand, m. */
    readonly handReachM = 0.9,
  ) {
    for (const r of rails) {
      if (this.byId.has(r.id)) throw new Error(`Duplicate rail ${r.id}`);
      this.byId.set(r.id, r);
      this.next.set(r.id, []);
    }
    for (let i = 0; i < rails.length; i++)
      for (let j = i + 1; j < rails.length; j++) {
        const r = rails[i]!;
        const s = rails[j]!;
        // Cheap reject before sampling.
        if (r.a.sub(s.a).length() > handReachM + r.b.sub(r.a).length() + s.b.sub(s.a).length()) continue;
        if (railGap(r, s) <= handReachM) {
          this.next.get(r.id)!.push(s.id);
          this.next.get(s.id)!.push(r.id);
        }
      }
  }

  rail(id: string): Handrail {
    const r = this.byId.get(id);
    if (!r) throw new Error(`No rail ${id}`);
    return r;
  }

  neighbours(id: string): readonly string[] {
    return this.next.get(id) ?? [];
  }

  /** The nearest rail within `reachM` of p, if any (optionally skipping one). */
  nearest(p: Vec3, reachM: number, skip?: string): { rail: Handrail; t: number; point: Vec3; distance: number } | undefined {
    let best: { rail: Handrail; t: number; point: Vec3; distance: number } | undefined;
    for (const r of this.rails) {
      if (r.id === skip) continue;
      const c = closestOnRail(r, p);
      if (c.distance <= reachM && (!best || c.distance < best.distance)) best = { rail: r, ...c };
    }
    return best;
  }
}

/** An axis-aligned box (a module's free aisle) and which of its walls get rails. */
export interface RailBox {
  readonly id: string;
  readonly centre: Vec3;
  readonly half: Vec3;
}

const axisVec = (axis: "x" | "y" | "z", k: number) => new Vec3(axis === "x" ? k : 0, axis === "y" ? k : 0, axis === "z" ? k : 0);

/**
 * Rails along a module's aisle, like the ISS's: the aisle runs along `along`; on the two side walls
 * (normal to `side`), near the upper and lower corners, one bar per rack bay. Bars run along the aisle.
 */
export function aisleRails(box: RailBox, along: "x" | "z", side: "x" | "z", up: "y" = "y"): Handrail[] {
  const L = RAIL_LAYOUT;
  const out: Handrail[] = [];
  const len = 2 * box.half[along];
  const bays = Math.max(1, Math.round(len / L.pitchM));
  const pitch = len / bays;
  const half = Math.min(L.lengthM, pitch * 0.8) / 2;
  for (const s of [-1, 1])
    for (const u of [-1, 1])
      for (let i = 0; i < bays; i++) {
        const c = box.centre
          .add(axisVec(side, s * (box.half[side] - L.standoffM)))
          .add(axisVec(up, u * Math.max(0, box.half[up] - L.cornerInsetM)))
          .add(axisVec(along, -box.half[along] + (i + 0.5) * pitch));
        out.push({ id: `${box.id}:${s < 0 ? "i" : "d"}${u < 0 ? "b" : "a"}${i}`, a: c.add(axisVec(along, -half)), b: c.add(axisVec(along, half)), normal: axisVec(side, -s) });
      }
  return out;
}

/**
 * Two upright bars on an end bulkhead of an aisle, either side of its hatch (crew push off and land
 * around hatches). `end` is −1 or +1 along `along`; skipped if the bulkhead has no room beside the hatch.
 */
export function hatchRails(box: RailBox, along: "x" | "z", side: "x" | "z", end: -1 | 1, hatchHalf: number): Handrail[] {
  const L = RAIL_LAYOUT;
  const off = hatchHalf + 0.15;
  if (off > box.half[side] - 0.1) return [];
  const half = Math.min(L.lengthM, box.half.y) / 2;
  return [-1, 1].map((s) => {
    const c = box.centre.add(axisVec(along, end * (box.half[along] - L.standoffM))).add(axisVec(side, s * off));
    return { id: `${box.id}:m${end < 0 ? "p" : "q"}${s < 0 ? "i" : "d"}`, a: c.add(new Vec3(0, -half, 0)), b: c.add(new Vec3(0, half, 0)), normal: axisVec(along, -end) };
  });
}

/**
 * A grid of bars on the inside faces of a big open volume (a hangar), every `spacingM`, for the
 * faces listed. Bars on the floor and side walls run along z, on the fore/aft walls along x.
 */
export function gridRails(box: RailBox, faces: readonly ("-x" | "+x" | "-y" | "+y" | "-z" | "+z")[], spacingM: number): Handrail[] {
  const L = RAIL_LAYOUT;
  const out: Handrail[] = [];
  for (const f of faces) {
    const axis = f[1] as "x" | "y" | "z";
    const s = f[0] === "-" ? -1 : 1;
    const [u, v] = axis === "x" ? (["y", "z"] as const) : axis === "y" ? (["x", "z"] as const) : (["x", "y"] as const);
    const runs: "x" | "z" = axis === "z" ? "x" : "z";
    const nu = Math.max(1, Math.floor((2 * box.half[u] - 1) / spacingM));
    const nv = Math.max(1, Math.floor((2 * box.half[v] - 1) / spacingM));
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const c = box.centre
          .add(axisVec(axis, s * (box.half[axis] - L.standoffM)))
          .add(axisVec(u, -box.half[u] + 0.5 + (i * (2 * box.half[u] - 1)) / nu))
          .add(axisVec(v, -box.half[v] + 0.5 + (j * (2 * box.half[v] - 1)) / nv));
        out.push({ id: `${box.id}:${f}:${i}:${j}`, a: c.add(axisVec(runs, -L.lengthM / 2)), b: c.add(axisVec(runs, L.lengthM / 2)), normal: axisVec(axis, -s) });
      }
  }
  return out;
}

/**
 * Rails inside a cylinder along x (the mothership's hub and spine): `count` rows round the wall at
 * radius `radius − standoff`, one bar every rack bay from x0 to x1.
 */
export function tubeRails(id: string, axisY: number, axisZ: number, radius: number, x0: number, x1: number, count = 4, phase = Math.PI / 4): Handrail[] {
  const L = RAIL_LAYOUT;
  const out: Handrail[] = [];
  const bays = Math.max(1, Math.round((x1 - x0) / L.pitchM));
  const pitch = (x1 - x0) / bays;
  const half = Math.min(L.lengthM, pitch * 0.8) / 2;
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + phase;
    const r = radius - L.standoffM;
    const y = axisY + Math.cos(a) * r;
    const z = axisZ + Math.sin(a) * r;
    const normal = new Vec3(0, -Math.cos(a), -Math.sin(a));
    for (let i = 0; i < bays; i++) {
      const x = x0 + (i + 0.5) * pitch;
      out.push({ id: `${id}:${k}:${i}`, a: new Vec3(x - half, y, z), b: new Vec3(x + half, y, z), normal });
    }
  }
  return out;
}

/** Bars on a round end wall at x = `x` (normal `dir` into the tube), `count` of them round a hatch. */
export function discRails(id: string, x: number, dir: -1 | 1, axisY: number, axisZ: number, radius: number, count = 4): Handrail[] {
  const out: Handrail[] = [];
  const half = RAIL_LAYOUT.lengthM / 2;
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2;
    const c = new Vec3(x + dir * RAIL_LAYOUT.standoffM, axisY + Math.cos(a) * radius, axisZ + Math.sin(a) * radius);
    // Tangential bar.
    const t = new Vec3(0, -Math.sin(a), Math.cos(a)).scale(half);
    out.push({ id: `${id}:${k}`, a: c.sub(t), b: c.add(t), normal: new Vec3(dir, 0, 0) });
  }
  return out;
}
