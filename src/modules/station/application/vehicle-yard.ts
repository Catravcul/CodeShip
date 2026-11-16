import type { Blueprint } from "../domain/blueprint";
import type { Craft } from "../domain/hangar";
import type { Station } from "../domain/station";
import { assemble, assemblySite, canBuild, componentMass, lineStatus, type CatalogueInventory, type LineStatus, type VehicleEntry } from "../domain/vehicle-catalogue";

/** A catalogue entry as the Hangar tab shows it. */
export interface YardRow {
  readonly entry: VehicleEntry;
  readonly lines: readonly LineStatus[];
  readonly missing: readonly LineStatus[];
  readonly canBuild: boolean;
  readonly site: "hangar" | "dique";
  readonly massKg: number;
}

/**
 * Use case: the vehicle catalogue at the station (docs/design/naves-reales.md). Parts are made from
 * their blueprints (Planos) and wait in the hangar; when a vehicle's recipe is complete it is
 * assembled in the hangar, or in the dry dock if it does not fit.
 */
export class VehicleYard {
  constructor(
    readonly station: Station,
    private readonly blueprints: readonly Blueprint[],
    readonly entries: readonly VehicleEntry[],
    private readonly massOf: (partId: string) => number | undefined,
    private readonly hangarSize: { x: number; y: number; z: number },
  ) {}

  /** Parts in the hangar, and each part's blueprint with why it is locked (the machine it needs). */
  inventory(): CatalogueInventory {
    const s = this.station;
    return {
      count: (id) => s.hangar.count(id),
      blueprint: (id) => {
        const bp = this.blueprints.find((b) => b.product.kind === "part" && b.product.partId === id);
        if (!bp) return undefined;
        const locked = s.locked(bp);
        return locked ? { id: bp.id, locked } : { id: bp.id };
      },
    };
  }

  rows(): YardRow[] {
    const inv = this.inventory();
    return this.entries.map((entry) => {
      const lines = lineStatus(entry, inv);
      return { entry, lines, missing: lines.filter((l) => l.missing > 0), canBuild: canBuild(entry, inv), site: assemblySite(entry.specs.sizeM, this.hangarSize), massKg: componentMass(entry, this.massOf).kg };
    });
  }

  /** Put the vehicle together from the hangar's parts; throws if something is missing. */
  build(entryId: string): Craft {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry) throw new Error(`Unknown vehicle ${entryId}`);
    return assemble(entry, this.station.hangar, this.inventory(), this.massOf);
  }
}
