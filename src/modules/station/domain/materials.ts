/** A material the station keeps: raw rock from a hold, refined stock or imported kits. Ids come from the catalog. */
export type MaterialId = string;

/** Amounts by material: kg, or units for imported kits. */
export type Amounts = Readonly<Record<MaterialId, number>>;

const EPS = 1e-9;

/** Scale every amount (a partial batch of a process). */
export const scaleAmounts = (a: Amounts, k: number): Amounts => Object.fromEntries(Object.entries(a).map(([id, n]) => [id, n * k]));

/** The station's materials store. Never goes negative: taking what is not there throws. */
export class MaterialStock {
  private readonly kg = new Map<MaterialId, number>();

  constructor(initial: Amounts = {}) {
    this.add(initial);
  }

  amount(id: MaterialId): number {
    return this.kg.get(id) ?? 0;
  }

  add(a: Amounts): void {
    for (const [id, n] of Object.entries(a)) {
      if (n < 0) throw new Error(`Cannot add a negative amount of ${id}`);
      if (n > 0) this.kg.set(id, this.amount(id) + n);
    }
  }

  /** What is short to cover `a`, by material (empty when everything is there). */
  missing(a: Amounts): Amounts {
    const out: Record<MaterialId, number> = {};
    for (const [id, n] of Object.entries(a)) if (this.amount(id) + EPS < n) out[id] = n - this.amount(id);
    return out;
  }

  has(a: Amounts): boolean {
    return Object.keys(this.missing(a)).length === 0;
  }

  take(a: Amounts): void {
    if (!this.has(a)) throw new Error(`Not enough materials: ${JSON.stringify(this.missing(a))}`);
    for (const [id, n] of Object.entries(a)) {
      const left = this.amount(id) - n;
      if (left <= EPS) this.kg.delete(id);
      else this.kg.set(id, left);
    }
  }

  /** Everything in store, largest first. */
  entries(): [MaterialId, number][] {
    return [...this.kg.entries()].sort((a, b) => b[1] - a[1]);
  }
}
