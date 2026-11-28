/**
 * How she moves on Earth (Berón, 2026-11-18: «en la Tierra hay gravedad: el santuario 3 se anda, y se nada donde haya
 * agua»; core/realism.ts `moveJoystick`). The world is boxes on the plan: floors she stands on, water she swims in
 * (the sea, the pool, the trees' water trunks) and solids that stop her (walls, railings). A doorway is only a gap in
 * a wall (reglas.md §2.2). She steps up or down at most `STEP_M`: a ledge higher than that is a wall; off the edge
 * of a high floor she can jump down (`dropTo`, where the scene allows it). Pure, so the scene and the journeys share it.
 */
export interface Rect {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

export interface Floor extends Rect {
  readonly id: string;
  /** Its walking face, m above the sea's datum. */
  readonly y: number;
  /** The area it belongs to (the Áreas window's node). */
  readonly area: string;
  /** A ladder up to it (a bunk's): climbed («Trepar») from below, higher than a ledge, only where it stands. */
  readonly ladder?: Rect;
}

export interface Water extends Rect {
  readonly id: string;
  readonly yBottom: number;
  /** The surface. */
  readonly yTop: number;
  readonly area: string;
  /**
   * An open column (sanctuary 1's water trunks, open to the sea): nothing inside it is a floor, so a floor that crosses
   * it (the ice it rises through) neither holds her nor pulls her out of the water.
   */
  readonly open?: boolean;
}

export interface Solid extends Rect {
  readonly y0: number;
  readonly y1: number;
}

/**
 * A ground that is not a box: a height field (the mountain of the air island, docs/design/bioma-s3.md). Where it is
 * gentle enough to stand on (`walkable`), it carries her like a floor at its height there; a cliff is not walkable:
 * she climbs it by its ledges (floors) or falls off its edge. Optional: worlds of boxes alone have none.
 */
export interface Ground extends Rect {
  readonly id: string;
  /** The ground's height at (x, z), or undefined where it is not (the sea). */
  heightAt(x: number, z: number): number | undefined;
  /** Gentle enough to stand and walk on. */
  walkable(x: number, z: number): boolean;
  /** The area (Áreas node) of the point. */
  areaAt(x: number, z: number): string;
}

export interface WalkWorld {
  readonly floors: readonly Floor[];
  readonly waters: readonly Water[];
  readonly solids: readonly Solid[];
  readonly grounds?: readonly Ground[];
}

export type Motion = "gravedad" | "agua";

/** Her feet (walking) or her feet while swimming, and how she moves now. */
export interface Body {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly motion: Motion;
  readonly area: string;
}

/** Highest step up or down she takes, m. */
export const STEP_M = 0.6;
/** Her body for the walls: radius and height, m (Doménica is 1,60 m; the eye is lower). */
export const BODY_RADIUS_M = 0.3;
export const BODY_HEIGHT_M = 1.7;
/** Her body's height swimming (lying in the water, from her feet's height): what has to fit through a doorway. */
export const SWIM_BODY_M = 0.6;
/** Swimming at the surface, her feet are this far under it (her eyes just above). */
export const SWIM_DEPTH_M = 1.45;

const inside = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** The grounds under (x, z) as floors there (a small square at the ground's height), where they can be stood on. */
export function groundFloors(w: WalkWorld, x: number, z: number): Floor[] {
  const out: Floor[] = [];
  for (const g of w.grounds ?? []) {
    if (!inside(g, x, z)) continue;
    const y = g.heightAt(x, z);
    if (y === undefined || !g.walkable(x, z)) continue;
    out.push({ id: `suelo:${g.id}`, x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35, y, area: g.areaAt(x, z) });
  }
  return out;
}
function allFloors(w: WalkWorld, x: number, z: number, extra: readonly Floor[]): readonly Floor[] {
  const g = w.grounds?.length ? groundFloors(w, x, z) : [];
  return g.length || extra.length ? [...w.floors, ...extra, ...g] : w.floors;
}

/** Whether her body at (x, y, z) runs into a solid (`height`: standing; lying in the water she is less, SWIM_BODY_M). */
export function blocked(w: WalkWorld, x: number, y: number, z: number, height = BODY_HEIGHT_M): boolean {
  const r = BODY_RADIUS_M;
  return w.solids.some((s) => x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1 && y + height > s.y0 && y + 0.15 < s.y1);
}

/** Whether a floor at height `fy` lies inside an open water column at (x, z): it is not there. */
const inOpen = (w: WalkWorld, x: number, fy: number, z: number) => w.waters.some((v) => v.open && inside(v, x, z) && v.yBottom < fy - 0.05 && v.yTop > fy + 0.5);

/** The floor that carries her at (x, z) from a height `y`: the highest one within a step of her feet. */
export function floorAt(w: WalkWorld, x: number, y: number, z: number, extra: readonly Floor[] = []): Floor | undefined {
  let best: Floor | undefined;
  for (const f of allFloors(w, x, z, extra)) if (inside(f, x, z) && Math.abs(f.y - y) <= STEP_M + 1e-6 && (!best || f.y > best.y) && !inOpen(w, x, f.y, z)) best = f;
  return best;
}

/** How high over a floor she can still be, swimming, and come out onto it through a doorway (its top, ~2,4 m). */
const OUT_FROM_ABOVE_M = 2.4;

/**
 * Off an edge (Berón 2026-11-19: «los pisos no deben tener barrera, de modo que es fácil tirarse abajo»): where she
 * lands from (x, y, z): the highest floor under her, or the water under her (she swims there). Undefined if nothing.
 */
export function dropTo(w: WalkWorld, x: number, y: number, z: number, extra: readonly Floor[] = []): Body | undefined {
  const f = allFloors(w, x, z, extra).filter((q) => inside(q, x, z) && q.y < y - STEP_M && !inOpen(w, x, q.y, z)).sort((a, c) => c.y - a.y)[0];
  const v = w.waters.filter((q) => inside(q, x, z) && q.yBottom < y && (!f || q.yTop > f.y)).sort((a, c) => c.yTop - a.yTop)[0];
  if (v && (!f || v.yTop >= f.y)) return { x, y: swimY(v, Math.min(y, v.yTop)), z, motion: "agua", area: v.area };
  return f ? { x, y: f.y, z, motion: "gravedad", area: f.area } : undefined;
}

/** The water at (x, z) whose depth range holds `y` (± a step). */
export function waterAt(w: WalkWorld, x: number, y: number, z: number): Water | undefined {
  return w.waters.find((v) => inside(v, x, z) && y >= v.yBottom - STEP_M && y <= v.yTop + STEP_M);
}

const swimY = (v: Water, y: number, top = v.yTop) => Math.max(v.yBottom, Math.min(top - SWIM_DEPTH_M, y));

/**
 * The surface over (x, z) from a water up: its top, or the top of the waters stacked on it (a tall water in layers,
 * as sanctuary 1's globe: Berón 2026-11-22 «en el globo de agua no puedo nadar»: each layer's top stopped her).
 */
export function surfaceAbove(w: WalkWorld, v: Water, x: number, z: number): number {
  let top = v.yTop;
  for (let more = true; more; ) {
    more = false;
    for (const q of w.waters)
      if (q.yBottom <= top + 0.01 && q.yTop > top && inside(q, x, z)) {
        top = q.yTop;
        more = true;
      }
  }
  return top;
}

/** Where she would be after trying to go to (x, y, z), or undefined if nothing holds her there. */
function settle(w: WalkWorld, b: Body, x: number, y: number, z: number, extra: readonly Floor[]): Body | undefined {
  if (b.motion === "gravedad") {
    const f = floorAt(w, x, b.y, z, extra);
    if (f) return blocked(w, x, f.y, z) ? undefined : { x, y: f.y, z, motion: "gravedad", area: f.area };
    // No floor within a step: into the water if there is some here (off a quay, through a trunk's door).
    const v = waterAt(w, x, b.y, z);
    if (!v) return undefined;
    const sy = swimY(v, b.y);
    return blocked(w, x, sy, z) ? undefined : { x, y: sy, z, motion: "agua", area: v.area };
  }
  // Swimming: out onto a floor near her (a quay at the surface, a doorway at her height), or on in the water.
  const out = allFloors(w, x, z, extra).filter((f) => inside(f, x, z) && f.y <= y + SWIM_DEPTH_M + 0.7 && f.y >= y - OUT_FROM_ABOVE_M && !inOpen(w, x, f.y, z)).sort((a, c) => c.y - a.y)[0];
  if (out && !blocked(w, x, out.y, z)) return { x, y: out.y, z, motion: "gravedad", area: out.area };
  const v = w.waters.filter((q) => inside(q, x, z) && y >= q.yBottom - STEP_M && y <= q.yTop + STEP_M).sort((a, c) => c.yTop - a.yTop)[0];
  if (!v) return undefined;
  const sy = swimY(v, y, surfaceAbove(w, v, x, z));
  // Lying in the water she fits where standing she would not (the top of a doorway).
  return blocked(w, x, sy, z, SWIM_BODY_M) ? undefined : { x, y: sy, z, motion: "agua", area: v.area };
}

/**
 * One move: walking she goes (dx, dz) on the plan; swimming she also goes dy (up or down, where she looks).
 * Blocked whole, she slides along the wall on one axis.
 */
export function step(w: WalkWorld, b: Body, d: { dx: number; dy?: number; dz: number }, extra: readonly Floor[] = []): Body {
  const dy = b.motion === "agua" ? (d.dy ?? 0) : 0;
  return (
    settle(w, b, b.x + d.dx, b.y + dy, b.z + d.dz, extra) ??
    settle(w, b, b.x + d.dx, b.y + dy, b.z, extra) ??
    settle(w, b, b.x, b.y + dy, b.z + d.dz, extra) ??
    (dy ? settle(w, b, b.x, b.y + dy, b.z, extra) : undefined) ??
    b
  );
}

/** Put her at a point: on the floor there, or in the water there. */
export function placeAt(w: WalkWorld, x: number, y: number, z: number): Body | undefined {
  const f = floorAt(w, x, y, z);
  if (f) return { x, y: f.y, z, motion: "gravedad", area: f.area };
  const v = waterAt(w, x, y, z);
  return v ? { x, y: swimY(v, y), z, motion: "agua", area: v.area } : undefined;
}

/** A wall along one side of a rectangle, with doorways (gaps along it, from its start), as solids. */
export function wallWithGaps(o: { axis: "x" | "z"; at: number; from: number; to: number; y0: number; y1: number; thick: number; gaps?: readonly { from: number; to: number; y1?: number }[] }): Solid[] {
  const out: Solid[] = [];
  const gaps = [...(o.gaps ?? [])].sort((a, b) => a.from - b.from);
  const piece = (a: number, b: number, y0: number, y1: number) => {
    if (b - a < 1e-6 || y1 - y0 < 1e-6) return;
    const h = o.thick / 2;
    out.push(o.axis === "x" ? { x0: a, x1: b, z0: o.at - h, z1: o.at + h, y0, y1 } : { x0: o.at - h, x1: o.at + h, z0: a, z1: b, y0, y1 });
  };
  let cur = o.from;
  for (const g of gaps) {
    piece(cur, g.from, o.y0, o.y1);
    if (g.y1 !== undefined) piece(g.from, g.to, g.y1, o.y1);
    cur = g.to;
  }
  piece(cur, o.to, o.y0, o.y1);
  return out;
}
