/**
 * The logic of the map window (map-window.ts), with no DOM so it can be tested: the 3D map's projection, the
 * nearest pick under a finger, and the list's selection with its locked options (docs/design/santuario3-iniciacion.md
 * §5.2: one window model for the start screen, Navigation, Áreas and, later, the islands and the missions).
 */

export interface MapVec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** How the map is seen: turned round the vertical (`yaw`), tilted down from the horizon (`elevation`) and zoomed. */
export interface MapView {
  yaw: number;
  elevation: number;
  zoom: number;
}

/** A point on the canvas: `gy` is its foot on the reference plane (the stalk), `depth` grows towards the eye. */
export interface MapPoint {
  readonly x: number;
  readonly y: number;
  readonly gy: number;
  readonly depth: number;
}

/**
 * The orbit projection every map window draws with: world point → canvas px. `s` is px per world unit, (`cx`, `cy`)
 * the canvas point the map turns round and `o` the world point drawn there.
 */
export function orbitProjector(view: Pick<MapView, "yaw" | "elevation">, s: number, cx: number, cy: number, o: MapVec = { x: 0, y: 0, z: 0 }): (p: MapVec) => MapPoint {
  const cosY = Math.cos(view.yaw);
  const sinY = Math.sin(view.yaw);
  const sinE = Math.sin(view.elevation);
  const cosE = Math.cos(view.elevation);
  return (p) => {
    const x = p.x - o.x;
    const y = p.y - o.y;
    const z = p.z - o.z;
    const xr = x * cosY - z * sinY;
    const zr = x * sinY + z * cosY;
    return { x: cx + xr * s, y: cy + (zr * sinE - y * cosE) * s, gy: cy + zr * sinE * s, depth: zr * cosE + y * sinE };
  };
}

/** The limits of a map window's turn and zoom. */
export interface MapLimits {
  /** Radians of turn per px of finger. */
  readonly turnPerPx: number;
  /** The lowest tilt (the highest is straight down, π/2). */
  readonly minElevation: number;
  readonly minZoom: number;
  readonly maxZoom: number;
}

/** A finger drag of (dx, dy) px: right turns the map left, down tilts it towards straight down. */
export function turnBy(v: MapView, dx: number, dy: number, l: MapLimits): void {
  v.yaw -= dx * l.turnPerPx;
  v.elevation = clampElevation(v.elevation + dy * l.turnPerPx, l);
}

export const clampElevation = (e: number, l: MapLimits) => Math.max(l.minElevation, Math.min(Math.PI / 2, e));
export const clampZoom = (z: number, l: MapLimits) => Math.max(l.minZoom, Math.min(l.maxZoom, z));

/** The nearest of `pts` to (x, y) within `radius` px, if any. */
export function nearestPick<T extends { x: number; y: number }>(pts: readonly T[], x: number, y: number, radius: number): T | undefined {
  let best: { p: T; d: number } | undefined;
  for (const p of pts) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < radius && (!best || d < best.d)) best = { p, d };
  }
  return best?.p;
}

/** An option of the list under the map. */
export interface MapChoice {
  readonly id: string;
  /** Whether a tap (on the map or its row) picks it; default yes. */
  readonly selectable?: boolean;
  /** Why its action cannot be done now («Próximamente», «En construcción…»); none: it can. */
  readonly locked?: string;
}

export type ChoiceResult = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly why: string };

/** Which option of the list is picked, and whether its action can be done. */
export class MapSelection {
  private current: string | undefined;

  constructor(private readonly choices: () => readonly MapChoice[]) {}

  get picked(): string | undefined {
    return this.current;
  }

  private find(id: string | undefined): MapChoice | undefined {
    return id === undefined ? undefined : this.choices().find((c) => c.id === id);
  }

  /** Pick `id` if it is in the list and selectable; says whether it was. */
  pick(id: string | undefined): boolean {
    const c = this.find(id);
    if (!c || c.selectable === false) return false;
    this.current = c.id;
    return true;
  }

  /** Forget the pick if the list no longer has it (or it is no longer selectable). */
  keep(): void {
    const c = this.find(this.current);
    if (!c || c.selectable === false) this.current = undefined;
  }

  clear(): void {
    this.current = undefined;
  }

  /** The action of `id` (the picked one by default): done only for a selectable, unlocked option. */
  act(id: string | undefined = this.current): ChoiceResult {
    const c = this.find(id);
    if (!c) return { ok: false, why: "No hay nada elegido" };
    if (c.selectable === false) return { ok: false, why: c.locked ?? "No se puede elegir" };
    if (c.locked) return { ok: false, why: c.locked };
    return { ok: true, id: c.id };
  }
}
