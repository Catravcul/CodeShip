import type { CraftSpec } from "./blueprint";

/** A ship or probe the station keeps track of, docked or out flying. */
export interface Craft extends CraftSpec {
  docked: boolean;
}

/** The station's hangar: the player's ships and probes, and spare parts by id. */
export class Hangar {
  private readonly parts = new Map<string, number>();
  readonly crafts: Craft[] = [];

  constructor(parts: Readonly<Record<string, number>> = {}, crafts: readonly Craft[] = []) {
    for (const [id, n] of Object.entries(parts)) this.put(id, n);
    this.crafts.push(...crafts.map((c) => ({ ...c })));
  }

  count(partId: string): number {
    return this.parts.get(partId) ?? 0;
  }

  put(partId: string, n = 1): void {
    if (n > 0) this.parts.set(partId, this.count(partId) + n);
  }

  take(partId: string): void {
    const n = this.count(partId);
    if (n <= 0) throw new Error(`No ${partId} in the hangar`);
    if (n === 1) this.parts.delete(partId);
    else this.parts.set(partId, n - 1);
  }

  /** A part was fitted to a ship: it leaves the hangar and the one it replaced comes in. */
  swap(fitted: string, removed?: string): void {
    this.take(fitted);
    if (removed) this.put(removed);
  }

  addCraft(c: CraftSpec, docked = true): Craft {
    const n = this.crafts.filter((x) => x.id === c.id || x.id.startsWith(`${c.id}-`)).length;
    const craft: Craft = { ...c, id: n ? `${c.id}-${n + 1}` : c.id, name: n ? `${c.name} ${n + 1}` : c.name, docked };
    this.crafts.push(craft);
    return craft;
  }

  /** Spare parts by id, most first. */
  partList(): [string, number][] {
    return [...this.parts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }
}
