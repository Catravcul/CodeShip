import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import { stepPool } from "@modules/chores/application/catalog";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { batchScale, canRefine, type Blueprint, type RefineProcess } from "../domain/blueprint";
import type { Amounts, MaterialId } from "../domain/materials";
import type { Station } from "../domain/station";
import { fabricationChore, refineChore } from "./challenges";

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
  readonly missing: Amounts;
  readonly canBuild: boolean;
  /** Copies waiting in the hangar. */
  readonly inHangar: number;
}

export interface RefineStatus {
  readonly process: RefineProcess;
  /** Share of a full batch the stock allows. */
  readonly scale: number;
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
      const inHangar = bp.product.kind === "part" ? s.hangar.count(bp.product.partId) : s.hangar.crafts.filter((c) => c.id.startsWith(bp.product.kind === "craft" ? bp.product.craft.id : "")).length;
      return { blueprint: bp, missing, canBuild: Object.keys(missing).length === 0, inHangar };
    });
  }

  refining(): RefineStatus[] {
    return this.processes.map((p) => ({ process: p, scale: batchScale(p, this.station.stock), canRun: canRefine(p, this.station.stock) }));
  }

  /** Start fabricating a blueprint; throws if the materials are not there. */
  startFabrication(blueprintId: string): StationSession {
    const bp = this.blueprints.find((b) => b.id === blueprintId);
    if (!bp) throw new Error(`Unknown blueprint ${blueprintId}`);
    if (!this.station.canFabricate(bp)) throw new Error(`Missing materials for ${blueprintId}`);
    const chore = fabricationChore(bp, this.station.stock, this.materialName);
    return new StationSession(chore, new ChoreRun(chore, 2), () => {
      // The store may have changed while solving (another job finished): check again.
      if (this.station.canFabricate(bp)) this.station.fabricate(bp);
    });
  }

  startRefining(processId: string): StationSession {
    const p = this.processes.find((x) => x.id === processId);
    if (!p) throw new Error(`Unknown process ${processId}`);
    if (!canRefine(p, this.station.stock)) throw new Error(`Not enough raw material for ${processId}`);
    const pool = stepPool(this.processes.filter((x) => x !== p).map((x) => x.steps.value));
    const chore = refineChore(p, this.station.stock, this.materialName, pool);
    return new StationSession(chore, new ChoreRun(chore, Math.max(2, Math.ceil(chore.exercises.length / 3))), () => {
      if (canRefine(p, this.station.stock)) this.station.refine(p);
    });
  }
}
