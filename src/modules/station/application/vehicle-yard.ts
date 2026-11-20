import type { Blueprint } from "../domain/blueprint";
import type { Craft } from "../domain/hangar";
import type { Station } from "../domain/station";
import {
  assemble,
  assemblyPlan,
  canBuild,
  componentMass,
  lineStatus,
  type AssemblyLimits,
  type AssemblyPlan,
  type AssemblySite,
  type CatalogueInventory,
  type LineStatus,
  type VehicleEntry,
} from "../domain/vehicle-catalogue";

/** A catalogue entry as the catalogue tab shows it. */
export interface YardRow {
  readonly entry: VehicleEntry;
  readonly lines: readonly LineStatus[];
  readonly missing: readonly LineStatus[];
  readonly canBuild: boolean;
  /** Where it is put together and let go (Bishop, JEM-EF, CBM with the arm, or the dry dock). */
  readonly plan: AssemblyPlan;
  readonly site: AssemblySite;
  readonly massKg: number;
  /** Built here and still at its assembly site (not let go yet). */
  readonly waiting: readonly Craft[];
}

/** A built vehicle as the Cupola view draws it. */
export interface YardShown {
  readonly id: string;
  readonly name: string;
  readonly site: AssemblySite;
  readonly craft: "modulo" | "sonda" | null;
  readonly sizeM: readonly [number, number, number];
}

/** The real sequence of letting a vehicle go from each site (docs/design/modulo-lunar-juventas.md). */
export const RELEASE_STEPS: Readonly<Record<AssemblySite, readonly string[]>> = {
  bishop: ["cargarla en la Bishop", "cerrar la escotilla CBM y vaciar el vestíbulo", "Canadarm2 saca la Bishop", "soltarla con el muelle del lanzador", "la Bishop vuelve a su puerto"],
  "jem-ef": ["el brazo de Kibo la suelta de su puerto EFU", "Canadarm2 la lleva lejos de la estación", "soltarla"],
  "brazo-cbm": ["soltar los 16 pernos del CBM", "Canadarm2 lo saca del puerto", "llevarlo a 10 m bajo la estación", "abrir el efector: queda libre"],
  dique: ["soltar las amarras de la celosía", "empujarlo fuera con el RCS"],
};

/**
 * Use case: the vehicle catalogue at the station (docs/design/naves-reales.md, modulo-lunar-juventas.md).
 * Parts are made from their blueprints (Planos) and wait at the station; when a vehicle's recipe is
 * complete it is put together where the ISS really would: inside the Bishop (smallsats), on a JEM-EF
 * port (small exposed payloads), held by Canadarm2 on a CBM (up to 116 t), or on the dry dock (licence).
 * Then it is let go from there («Botar» / «Desplegar»).
 */
export class VehicleYard {
  constructor(
    readonly station: Station,
    private readonly blueprints: readonly Blueprint[],
    readonly entries: readonly VehicleEntry[],
    private readonly massOf: (partId: string) => number | undefined,
    private readonly limits: AssemblyLimits,
  ) {}

  /** Parts at the station, and each part's blueprint with why it is locked (the machine it needs). */
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

  plan(entry: VehicleEntry): AssemblyPlan {
    return assemblyPlan(entry, componentMass(entry, this.massOf).kg, this.limits);
  }

  /** Vehicles of this entry built here and not let go yet. */
  waiting(entryId: string): Craft[] {
    return this.station.hangar.crafts.filter((c) => c.site && !c.released && (c.id === entryId || c.id.startsWith(`${entryId}-`)));
  }

  rows(): YardRow[] {
    const inv = this.inventory();
    return this.entries.map((entry) => {
      const lines = lineStatus(entry, inv);
      const plan = this.plan(entry);
      return { entry, lines, missing: lines.filter((l) => l.missing > 0), canBuild: canBuild(entry, inv), plan, site: plan.site, massKg: componentMass(entry, this.massOf).kg, waiting: this.waiting(entry.id) };
    });
  }

  /** Put the vehicle together from the station's parts at its assembly site; throws if something is missing. */
  build(entryId: string): Craft {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry) throw new Error(`Unknown vehicle ${entryId}`);
    return assemble(entry, this.station.hangar, this.inventory(), this.massOf, this.plan(entry).site);
  }

  /** What the Cupola view draws of a built vehicle: where it waits, and as what (the LM, Juventas, or a box of its size). */
  shown(craft: Craft): YardShown | undefined {
    if (!craft.site) return undefined;
    const entry = this.entries.find((e) => craft.id === e.id || craft.id.startsWith(`${e.id}-`));
    return { id: craft.id, name: craft.name.split(" (")[0]!, site: craft.site, craft: entry?.playerCraft ?? null, sizeM: entry?.specs.sizeM ?? [2, 2, 2] };
  }

  /** Every built vehicle still at its assembly site, as the Cupola view draws it. */
  parked(): YardShown[] {
    return this.station.hangar.crafts.filter((c) => c.site && !c.released).flatMap((c) => this.shown(c) ?? []);
  }

  /**
   * A built vehicle of this entry leaves its site to ride another vehicle (a Juventas into the Starship's
   * deployer while she is berthed): it is no longer waiting here. Undefined when none is built.
   */
  takeAboard(entryId: string): Craft | undefined {
    const craft = this.waiting(entryId)[0];
    if (!craft) return undefined;
    craft.released = true;
    craft.docked = false;
    return craft;
  }

  /** Let a built vehicle go from its site («Botar» / «Desplegar»): the steps, in order. Throws if it is not waiting. */
  release(craftId: string): { craft: Craft; steps: readonly string[] } {
    const craft = this.station.hangar.crafts.find((c) => c.id === craftId);
    if (!craft || !craft.site) throw new Error(`No built vehicle ${craftId}`);
    if (craft.released) throw new Error(`${craftId} already released`);
    craft.released = true;
    craft.docked = false;
    return { craft, steps: RELEASE_STEPS[craft.site] };
  }
}
