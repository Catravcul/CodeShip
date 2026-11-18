/**
 * How she moves on Earth (Berón, 2026-11-18: «en la Tierra hay gravedad: el santuario 3 se anda, y se nada donde haya
 * agua»; core/realism.ts `moveJoystick`). The world is boxes on the plan: floors she stands on, water she swims in
 * (the sea, the pool, the trees' water trunks) and solids that stop her (walls, railings). A doorway is only a gap in
 * a wall (reglas.md §2.2). She steps up or down at most `STEP_M`: a ledge higher than that is a wall, and the edge
 * of a high floor never lets her fall. Pure, so the scene and the journeys share it.
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
}

export interface Water extends Rect {
  readonly id: string;
  readonly yBottom: number;
  /** The surface. */
  readonly yTop: number;
  readonly area: string;
}

export interface Solid extends Rect {
  readonly y0: number;
  readonly y1: number;
}

export interface WalkWorld {
  readonly floors: readonly Floor[];
  readonly waters: readonly Water[];
  readonly solids: readonly Solid[];
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
/** Swimming at the surface, her feet are this far under it (her eyes just above). */
export const SWIM_DEPTH_M = 1.45;

const inside = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** Whether her body at (x, y, z) runs into a solid. */
export function blocked(w: WalkWorld, x: number, y: number, z: number): boolean {
  const r = BODY_RADIUS_M;
  return w.solids.some((s) => x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1 && y + BODY_HEIGHT_M > s.y0 && y + 0.15 < s.y1);
}

/** The floor that carries her at (x, z) from a height `y`: the highest one within a step of her feet. */
export function floorAt(w: WalkWorld, x: number, y: number, z: number, extra: readonly Floor[] = []): Floor | undefined {
  let best: Floor | undefined;
  for (const f of [...w.floors, ...extra]) if (inside(f, x, z) && Math.abs(f.y - y) <= STEP_M + 1e-6 && (!best || f.y > best.y)) best = f;
  return best;
}

/** The water at (x, z) whose depth range holds `y` (± a step). */
export function waterAt(w: WalkWorld, x: number, y: number, z: number): Water | undefined {
  return w.waters.find((v) => inside(v, x, z) && y >= v.yBottom - STEP_M && y <= v.yTop + STEP_M);
}

const swimY = (v: Water, y: number) => Math.max(v.yBottom, Math.min(v.yTop - SWIM_DEPTH_M, y));

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
  const out = [...w.floors, ...extra].filter((f) => inside(f, x, z) && f.y <= y + SWIM_DEPTH_M + 0.7 && f.y >= y - STEP_M).sort((a, c) => c.y - a.y)[0];
  if (out && !blocked(w, x, out.y, z)) return { x, y: out.y, z, motion: "gravedad", area: out.area };
  const v = w.waters.filter((q) => inside(q, x, z) && y >= q.yBottom - STEP_M && y <= q.yTop + STEP_M).sort((a, c) => c.yTop - a.yTop)[0];
  if (!v) return undefined;
  const sy = swimY(v, y);
  return blocked(w, x, sy, z) ? undefined : { x, y: sy, z, motion: "agua", area: v.area };
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
