/**
 * The travel ship's cargo hold: where a subjugated asteroid's packages land (subjugation level 2,
 * docs/design/subyugacion.md). Raw rock by material (names as `CompositionEntry.material`), emptied
 * into the station's store when the ship berths there. Capacity is a game value.
 */
export class CargoHold {
  private readonly kg = new Map<string, number>();

  constructor(readonly capacityKg: number) {}

  get loadKg(): number {
    let s = 0;
    for (const v of this.kg.values()) s += v;
    return s;
  }
  get roomKg(): number {
    return Math.max(0, this.capacityKg - this.loadKg);
  }

  /** Load what fits, in proportion; returns the kg that went in (the rest drifts away). */
  load(cargo: readonly { material: string; kg: number }[]): number {
    const total = cargo.reduce((s, c) => s + Math.max(0, c.kg), 0);
    if (total <= 0) return 0;
    const k = Math.min(1, this.roomKg / total);
    for (const c of cargo) if (c.kg > 0) this.kg.set(c.material, (this.kg.get(c.material) ?? 0) + c.kg * k);
    return total * k;
  }

  entries(): { material: string; kg: number }[] {
    return [...this.kg.entries()].map(([material, kg]) => ({ material, kg })).sort((a, b) => b.kg - a.kg);
  }

  /** Empty the hold and return what was in it. */
  unload(): { material: string; kg: number }[] {
    const out = this.entries();
    this.kg.clear();
    return out;
  }
}
