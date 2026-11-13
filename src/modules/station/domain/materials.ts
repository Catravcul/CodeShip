/** A material the station keeps: raw rock from a hold, refined stock or imported kits. Ids come from the catalog. */
export type MaterialId = string;

/** Amounts by material: kg, or units for imported kits. */
export type Amounts = Readonly<Record<MaterialId, number>>;

const EPS = 1e-9;

/** Scale every amount (a partial batch of a process). */
export const scaleAmounts = (a: Amounts, k: number): Amounts => Object.fromEntries(Object.entries(a).map(([id, n]) => [id, n * k]));

/** How big the store is and what its contents weigh (docs/design/estacion.md, «Almacén»). */
export interface StockOptions {
  /** Capacity of the store now, kg (it grows with the modules); unlimited by default. */
  readonly capacityKg?: () => number;
  /** Mass of `n` of a material, kg (kits are counted in units); `n` by default. */
  readonly kgOf?: (id: MaterialId, n: number) => number;
}

/**
 * The station's materials store. Never goes negative: taking what is not there throws. It has a
 * capacity (HC-02 in docs/qa): whoever brings something new (extraction, deliveries, the refinery's
 * batches, a hold) asks `fits` first and keeps it while it does not; `add` itself never refuses, so
 * what goes back (a transfer to a craft that left) is never lost.
 */
export class MaterialStock {
  private readonly kg = new Map<MaterialId, number>();

  constructor(
    initial: Amounts = {},
    private readonly opts: StockOptions = {},
  ) {
    this.add(initial);
  }

  /** Mass of some amounts, kg. */
  massKg(a: Amounts): number {
    const of = this.opts.kgOf;
    return Object.entries(a).reduce((s, [id, n]) => s + (of ? of(id, n) : n), 0);
  }

  get capacityKg(): number {
    return this.opts.capacityKg?.() ?? Infinity;
  }

  /** What the store holds, kg. */
  get usedKg(): number {
    return this.massKg(Object.fromEntries(this.kg));
  }

  /** Free room, kg (never negative). */
  get roomKg(): number {
    const c = this.capacityKg;
    return c === Infinity ? Infinity : Math.max(0, c - this.usedKg);
  }

  /** Whether `a` fits in the free room. */
  fits(a: Amounts): boolean {
    return this.massKg(a) <= this.roomKg + 1e-6;
  }

  /** «Almacén lleno»: less than a gram of room. */
  get full(): boolean {
    return this.roomKg <= 1e-3;
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
