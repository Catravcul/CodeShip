import type { Floor, Solid, Water, WalkWorld } from "@modules/aerial-sanctuary/domain/walk";

/**
 * A grid over the walk world (docs/design/santuario1.md §Rendimiento): the sanctuary has thousands of solids (every
 * piece of furniture of 60 floors) and the walk scans them all at every step. `near(x, z)` gives the part of the world
 * round a point (its cell and the 8 around it, `cell` m each), cached per cell, so a step scans tens instead of
 * thousands. Anything wider than `huge` m (the sea, long ground runs) is in every cell. The walk itself (walk.ts) is
 * shared with sanctuary 3 and stays as it is.
 */
/** Solids farther than this above or below her are left out of `near` (m: more than a level of a tree-building). */
export const SOLID_BAND = 24;

export class WalkIndex {
  private readonly cells = new Map<string, { floors: Floor[]; waters: Water[]; solids: Solid[] }>();
  private readonly huge: { floors: Floor[]; waters: Water[]; solids: Solid[] } = { floors: [], waters: [], solids: [] };
  private readonly cache = new Map<string, WalkWorld>();

  constructor(
    readonly world: WalkWorld,
    private readonly cell = 32,
    huge = 400,
  ) {
    const put = <K extends "floors" | "waters" | "solids">(k: K, it: WalkWorld[K][number]) => {
      if (it.x1 - it.x0 > huge || it.z1 - it.z0 > huge) {
        (this.huge[k] as WalkWorld[K][number][]).push(it);
        return;
      }
      for (let i = Math.floor(it.x0 / cell); i <= Math.floor(it.x1 / cell); i++)
        for (let j = Math.floor(it.z0 / cell); j <= Math.floor(it.z1 / cell); j++) {
          const key = `${i},${j}`;
          let c = this.cells.get(key);
          if (!c) this.cells.set(key, (c = { floors: [], waters: [], solids: [] }));
          (c[k] as WalkWorld[K][number][]).push(it);
        }
    };
    for (const f of world.floors) put("floors", f);
    for (const w of world.waters) put("waters", w);
    for (const s of world.solids) put("solids", s);
  }

  /**
   * The world round (x, z): its 3 × 3 cells and the huge pieces, each piece once, in the world's own order. With her
   * height `y`, only the solids within `SOLID_BAND` m above or below (a tree-building stacks a dozen floors of furniture
   * on the same cells); floors and waters stay all, so she always finds the ground under her.
   */
  near(x: number, z: number, y?: number): WalkWorld {
    if (y === undefined) return this.flat(x, z);
    const band = Math.floor(y / (SOLID_BAND / 2));
    const key = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)},${band}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const w = this.flat(x, z);
    const lo = (band - 2) * (SOLID_BAND / 2);
    const hi = (band + 3) * (SOLID_BAND / 2);
    const out: WalkWorld = { floors: w.floors, waters: w.waters, solids: w.solids.filter((s) => s.y1 > lo && s.y0 < hi) };
    this.cache.set(key, out);
    return out;
  }

  private flat(x: number, z: number): WalkWorld {
    const ci = Math.floor(x / this.cell);
    const cj = Math.floor(z / this.cell);
    const key = `${ci},${cj}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const pick = <T>(k: "floors" | "waters" | "solids", all: readonly T[]): T[] => {
      const s = new Set<T>(this.huge[k] as T[]);
      for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const it of (this.cells.get(`${i},${j}`)?.[k] ?? []) as T[]) s.add(it);
      return all.filter((it) => s.has(it));
    };
    const w: WalkWorld = { floors: pick("floors", this.world.floors), waters: pick("waters", this.world.waters), solids: pick("solids", this.world.solids) };
    if (this.cache.size > 800) this.cache.clear();
    this.cache.set(key, w);
    return w;
  }
}
