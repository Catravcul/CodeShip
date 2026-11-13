import { Vec3 } from "@core/math/vec3";
import { railPoint, type RailGraph } from "./handrails";
import { HOP_AIM_S, IVA, type HopPlan } from "./iva";

/**
 * Hop navigation in zero g (docs/design/ingravidez.md, «Fase C: flechas»): the player does not steer
 * a free push; each arrow picks the next landing point that way, she turns to aim at it, pushes off,
 * glides and catches it. Landing points are the configured handholds (rails round the walls, beside
 * the hatches and at the work stations); a hatch between modules is flown through to the first point
 * on the other side. Crew touch the rails at the ends of a free flight and to change direction
 * (NASA-STD-3000 §8.9.2), which is what a hop is.
 */
export const HOP = {
  /** Shortest and longest hop, m. Game values: past an arm's reach, and no more than ~2 module bays. */
  minM: 0.5,
  maxM: 7,
  /** Hop length the pick prefers when several points line up that way, m (game value: ~2 rack bays). */
  preferM: 2.5,
  /** Half-angle of the cone round an arrow's direction, rad (game value). */
  coneRad: (50 * Math.PI) / 180,
  /** Seconds to turn and aim before pushing off (game value). */
  aimS: HOP_AIM_S,
  /**
   * Glide speed by hop length: about 3 s of glide per hop, between Skylab's ordinary point-to-point
   * rate (0,4–0,6 m/s) and a brisk translation of 1 m/s (well under the ~1,8 m/s seen in play),
   * NASA-STD-3000 §8.7.2.
   */
  speed: { min: 0.5, max: 1.0, perM: 1 / 3 },
  /** Line-of-sight sampling step, m. */
  losStepM: 0.1,
  /** Before and after a hatch, she lines up this far from its plane, m (game value). */
  hatchLeadM: 0.4,
} as const;

/** A place she can hop to: a handhold, where her hand grips and where her body centre floats. */
export interface LandingPoint {
  readonly id: string;
  readonly rail: string;
  readonly t: number;
  readonly grip: Vec3;
  readonly body: Vec3;
}

/** A hatch between two modules: its centre, the unit axis through it and its depth either side of the centre. */
export interface Portal {
  readonly centre: Vec3;
  readonly axis: Vec3;
  readonly halfDepth: number;
}

/** A hop from one landing point to another: the body's path (straight legs) and where it first heads. */
export interface HopEdge {
  readonly to: LandingPoint;
  readonly path: readonly Vec3[];
  readonly length: number;
  /** Unit direction the arrows aim along: the first leg, or the hatch it goes through. */
  readonly aim: Vec3;
  /** Whether it goes through a hatch. */
  readonly hatch: boolean;
}

export type Arrow = "arriba" | "abajo" | "izquierda" | "derecha";
export const ARROWS: readonly Arrow[] = ["arriba", "abajo", "izquierda", "derecha"];

/** The camera's frame: forward (where she looks) and right. */
export interface ViewFrame {
  readonly forward: Vec3;
  readonly right: Vec3;
}

/**
 * Each arrow's direction in the world, relative to the view: ▲ ahead (where the camera looks, so
 * looking up at the ceiling and pressing ▲ goes there), ▼ back, ◄ ► to the sides.
 */
export function arrowVector(a: Arrow, v: ViewFrame): Vec3 {
  const f = v.forward.normalize();
  const r = v.right.sub(f.scale(v.right.dot(f))).normalize();
  if (a === "arriba") return f;
  if (a === "abajo") return f.scale(-1);
  return a === "derecha" ? r : r.scale(-1);
}

/** Glide speed for a hop of this length, m/s (HOP.speed). */
export function hopSpeed(lengthM: number): number {
  return Math.max(HOP.speed.min, Math.min(HOP.speed.max, lengthM * HOP.speed.perM));
}

const pathLength = (path: readonly Vec3[]) => path.reduce((s, p, i) => (i === 0 ? 0 : s + p.sub(path[i - 1]!).length()), 0);

/**
 * The landing points of a place and the hops between them. Each rail gives one point (its middle,
 * or `landT`); a hop needs a clear straight line for her body (`fits` along it), or a line to a
 * hatch, through it, and on to the first point beyond. Hops from a point are worked out when first
 * asked for and kept.
 */
export class HopGraph {
  readonly points: readonly LandingPoint[];
  private readonly byRail = new Map<string, LandingPoint>();
  private readonly cache = new Map<string, HopEdge[]>();

  constructor(
    readonly rails: RailGraph,
    private readonly fits: (p: Vec3) => boolean,
    private readonly portals: readonly Portal[] = [],
  ) {
    const pts: LandingPoint[] = [];
    for (const r of rails.rails) {
      const t = r.landT ?? 0.5;
      const grip = railPoint(r, t);
      const body = grip.add(r.normal.scale(IVA.holdM));
      if (!fits(body)) continue;
      const p = { id: r.id, rail: r.id, t, grip, body };
      pts.push(p);
      this.byRail.set(r.id, p);
    }
    this.points = pts;
  }

  /** The landing point on a rail, if it has one. */
  pointOf(rail: string): LandingPoint | undefined {
    return this.byRail.get(rail);
  }

  /** The landing point nearest to p (to start from after coming in). */
  nearest(p: Vec3): LandingPoint | undefined {
    let best: LandingPoint | undefined;
    for (const q of this.points) if (!best || q.body.sub(p).length() < best.body.sub(p).length()) best = q;
    return best;
  }

  /** Whether her body fits all along the straight line a→b. */
  clear(a: Vec3, b: Vec3): boolean {
    const d = b.sub(a);
    const n = Math.max(1, Math.ceil(d.length() / HOP.losStepM));
    for (let i = 1; i <= n; i++) if (!this.fits(a.add(d.scale(i / n)))) return false;
    return true;
  }

  /** Every hop from a landing point. */
  edges(from: LandingPoint): readonly HopEdge[] {
    const hit = this.cache.get(from.id);
    if (hit) return hit;
    const out: HopEdge[] = [];
    const direct = new Set<string>();
    for (const q of this.points) {
      if (q.id === from.id) continue;
      const d = q.body.sub(from.body).length();
      if (d < HOP.minM || d > HOP.maxM || !this.clear(from.body, q.body)) continue;
      out.push({ to: q, path: [from.body, q.body], length: d, aim: q.body.sub(from.body).normalize(), hatch: false });
      direct.add(q.id);
    }
    for (const portal of this.portals) {
      const e = this.throughHatch(from, portal, direct);
      if (e) out.push(e);
    }
    this.cache.set(from.id, out);
    return out;
  }

  /** From a point, through a hatch, to the first landing point on the other side. */
  private throughHatch(from: LandingPoint, h: Portal, direct: ReadonlySet<string>): HopEdge | undefined {
    const ax = h.axis.normalize();
    const rel = from.body.sub(h.centre).dot(ax);
    if (Math.abs(rel) < 1e-6) return undefined;
    const side = Math.sign(rel);
    const lead = h.halfDepth + HOP.hatchLeadM;
    // Line up on the hatch's axis first: `lead` before it, or level with her when she is already
    // closer than that (right beside the bulkhead).
    const entry = h.centre.add(ax.scale(side * Math.min(lead, Math.abs(rel))));
    const exit = h.centre.add(ax.scale(-side * lead));
    if (entry.sub(from.body).length() > HOP.maxM) return undefined;
    const onAxis = entry.sub(from.body).length() < 0.05;
    const head = onAxis ? [from.body] : [from.body, entry];
    if (!onAxis && !this.clear(from.body, entry)) return undefined;
    if (!this.clear(onAxis ? from.body : entry, exit)) return undefined;
    let best: { q: LandingPoint; score: number } | undefined;
    for (const q of this.points) {
      const beyond = q.body.sub(h.centre).dot(ax) * -side;
      if (beyond <= h.halfDepth || direct.has(q.id)) continue;
      const to = q.body.sub(exit);
      const d = to.length();
      if (d > HOP.maxM || !this.clear(exit, q.body)) continue;
      // The first point past the hatch, preferring those straight on.
      const along = d < 1e-6 ? 1 : to.normalize().dot(ax.scale(-side));
      const score = d * (2 - along);
      if (!best || score < best.score) best = { q, score };
    }
    if (!best) return undefined;
    const path = [...head, exit, best.q.body];
    // It aims at the far side of the hatch (the first leg may line her up on it from the side, even
    // from right beside the bulkhead).
    return { to: best.q, path, length: pathLength(path), aim: exit.sub(from.body).normalize(), hatch: true };
  }

  /**
   * The hop an arrow takes from a point: among the hops whose first leg lies within HOP.coneRad of
   * `dir`, the one most in line, then nearest HOP.preferM long.
   */
  pick(from: LandingPoint, dir: Vec3): HopEdge | undefined {
    const d = dir.normalize();
    let best: { e: HopEdge; score: number } | undefined;
    for (const e of this.edges(from)) {
      const ang = Math.acos(Math.max(-1, Math.min(1, e.aim.dot(d))));
      if (ang > HOP.coneRad) continue;
      const score = ang / HOP.coneRad + (0.5 * Math.abs(e.length - HOP.preferM)) / HOP.preferM;
      if (!best || score < best.score) best = { e, score };
    }
    return best?.e;
  }

  /** What each arrow would do from a point, given the view. */
  targets(from: LandingPoint, view: ViewFrame): Readonly<Record<Arrow, HopEdge | undefined>> {
    const out = {} as Record<Arrow, HopEdge | undefined>;
    for (const a of ARROWS) out[a] = this.pick(from, arrowVector(a, view));
    return out;
  }

  /** Landing points reachable by hops from `start` (to check that nobody gets stranded). */
  reachable(start: LandingPoint): Set<string> {
    const seen = new Set([start.id]);
    const todo = [start];
    while (todo.length) {
      const p = todo.pop()!;
      for (const e of this.edges(p))
        if (!seen.has(e.to.id)) {
          seen.add(e.to.id);
          todo.push(e.to);
        }
    }
    return seen;
  }
}

/** A hop to carry out (`ivaStep` with `{ hop }`), starting where she is now. */
export function planHop(e: HopEdge, from: Vec3 = e.path[0]!): HopPlan {
  const path = [from, ...e.path.slice(1)];
  return { path, rail: e.to.rail, t: e.to.t, speed: hopSpeed(pathLength(path)) };
}
