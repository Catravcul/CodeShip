import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import { stepPool } from "@modules/chores/application/catalog";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { batchScale, blueprintKind, canRefine, type Blueprint, type BlueprintKind, type RefineProcess } from "../domain/blueprint";
import type { Amounts, MaterialId } from "../domain/materials";
import type { Station } from "../domain/station";
import { fabricationChore, growthChore, refineChore } from "./challenges";

/** A station chore in progress: same rules as chores on board (in order, a few mistakes allowed). */
export class StationSession {
  constructor(
    readonly chore: Chore,
    readonly run: ChoreRun,
    private readonly onDone: () => void,
  ) {}
  answer(a: Answer): boolean {
    const ok = this.run.submit(a);
    if (this.run.status === "done") this.onDone();
    return ok;
  }
}

/** A blueprint as the Planos tab shows it: can it be built now, and what is missing. */
export interface PlanStatus {
  readonly blueprint: Blueprint;
  readonly kind: BlueprintKind;
  readonly missing: Amounts;
  /** Why it cannot be made whatever the store holds (equipment, port, rack bays, power), if so. */
  readonly locked?: string;
  /** Module or equipment already in the station. */
  readonly built: boolean;
  readonly canBuild: boolean;
  /** Copies waiting in the hangar. */
  readonly inHangar: number;
}

export interface RefineStatus {
  readonly process: RefineProcess;
  /** Share of a full batch the stock allows. */
  readonly scale: number;
  /** The equipment it needs, if it is not there. */
  readonly locked?: string;
  readonly canRun: boolean;
}

/**
 * Use case: running the space station. Refining and fabricating are chains of code challenges; when
 * the chain is solved the materials are taken and the job is queued on its machine.
 */
export class StationOps {
  constructor(
    readonly station: Station,
    readonly blueprints: readonly Blueprint[],
    readonly processes: readonly RefineProcess[],
    private readonly materialName: (id: MaterialId) => string = (id) => id,
  ) {}

  plans(): PlanStatus[] {
    const s = this.station;
    return this.blueprints.map((bp) => {
      const missing = s.stock.missing(bp.inputs);
      const p = bp.product;
      const inHangar = p.kind === "part" ? s.hangar.count(p.partId) : p.kind === "craft" ? s.hangar.crafts.filter((c) => c.id.startsWith(p.craft.id)).length : 0;
      const built = p.kind === "module" ? !!s.outfit?.hasModule(p.module.id) : p.kind === "equipment" ? !!s.outfit?.has(p.equipment.id) : false;
      const locked = s.locked(bp);
      return { blueprint: bp, kind: blueprintKind(bp), missing, ...(locked ? { locked } : {}), built, canBuild: Object.keys(missing).length === 0 && !locked, inHangar };
    });
  }

  refining(): RefineStatus[] {
    return this.processes.map((p) => {
      const locked = this.station.processLocked(p);
      return { process: p, scale: batchScale(p, this.station.stock), ...(locked ? { locked } : {}), canRun: canRefine(p, this.station.stock) && !locked };
    });
  }

  /** Start fabricating a blueprint; throws if the materials are not there. */
  startFabrication(blueprintId: string): StationSession {
    const bp = this.blueprints.find((b) => b.id === blueprintId);
    if (!bp) throw new Error(`Unknown blueprint ${blueprintId}`);
    if (!this.station.canFabricate(bp)) throw new Error(`Cannot fabricate ${blueprintId}: ${this.station.locked(bp) ?? "missing materials"}`);
    const o = this.station.outfit;
    const grows = bp.product.kind === "module" || bp.product.kind === "equipment";
    const chore = grows && o ? growthChore(bp, o, this.station.stock, this.materialName) : fabricationChore(bp, this.station.stock, this.materialName);
    return new StationSession(chore, new ChoreRun(chore, 2), () => {
      // The store may have changed while solving (another job finished): check again.
      if (this.station.canFabricate(bp)) this.station.fabricate(bp);
    });
  }

  startRefining(processId: string): StationSession {
    const p = this.processes.find((x) => x.id === processId);
    if (!p) throw new Error(`Unknown process ${processId}`);
    if (!canRefine(p, this.station.stock) || this.station.processLocked(p)) throw new Error(`Cannot run ${processId}`);
    const pool = stepPool(this.processes.filter((x) => x !== p).map((x) => x.steps.value));
    const chore = refineChore(p, this.station.stock, this.materialName, pool);
    return new StationSession(chore, new ChoreRun(chore, Math.max(2, Math.ceil(chore.exercises.length / 3))), () => {
      if (canRefine(p, this.station.stock) && !this.station.processLocked(p)) this.station.refine(p);
    });
  }
}
