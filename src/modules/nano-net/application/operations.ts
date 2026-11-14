import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { NANO_TUNING, type Fault, type NetEffects, type Stage } from "../domain/core";
import { NanoNet } from "../domain/network";
import { convertChore, repairNanoChore, stageChore, type NanoSite } from "./challenges";

export type NanoEvent =
  | { type: "core-planted"; coreId: string }
  | { type: "stage-learned"; coreId: string; stage: Stage }
  | { type: "fault"; fault: Fault }
  | { type: "repaired"; fault: Fault }
  | { type: "chore-failed"; choreId: string };

/** A chore being done on a core: same rules as chores on board (in order, a few mistakes allowed). */
export class NanoSession {
  constructor(
    readonly chore: Chore,
    readonly run: ChoreRun,
    private readonly onDone: () => void,
    private readonly onFailed: () => void,
  ) {}
  answer(a: Answer): boolean {
    const ok = this.run.submit(a);
    if (this.run.status === "done") this.onDone();
    if (this.run.status === "failed") this.onFailed();
    return ok;
  }
}

/** A ship that the network's energy can keep up (maintenance drones fix the hull). */
export interface PoweredShip {
  readonly hullIntegrity: number;
  repair(fraction: number): void;
}

/**
 * Use case: building and keeping up the nano_net. A persuaded asteroid can be turned into a core;
 * each stage it learns, and each repair, is a chain of code challenges done while landed on it.
 */
export class NanoNetOps {
  private readonly subjugated = new Set<string>();
  private events: NanoEvent[] = [];
  private repairs = 0;

  constructor(
    readonly net: NanoNet,
    private readonly rng: () => number,
  ) {}

  /** The asteroid's mind was persuaded: it may become a core. */
  subjugate(siteId: string): void {
    this.subjugated.add(siteId);
  }
  isSubjugated(siteId: string): boolean {
    return this.subjugated.has(siteId);
  }

  /** What can be done landed on a site, most urgent first: repairs, then the next stage (or the conversion). */
  actionsAt(site: NanoSite, landed: boolean): Chore[] {
    if (!landed) return [];
    const core = this.net.core(site.id);
    if (!core) return this.subjugated.has(site.id) ? [convertChore(site)] : [];
    const out = core.faults().map((f) => repairNanoChore(core, site, f, this.repairs));
    const next = core.nextStage;
    if (next && core.programWorking) {
      const remote = next === "enlazar" ? this.net.remoteInRange(core) : undefined;
      if (next !== "enlazar" || remote) out.push(stageChore(core, site, next, remote));
    }
    return out;
  }

  start(chore: Chore, site: NanoSite): NanoSession {
    const run = new ChoreRun(chore, Math.max(2, Math.ceil(chore.exercises.length / 2)));
    const onDone = () => {
      switch (chore.kind) {
        case "nano-convertir":
          this.net.plant(site);
          this.events.push({ type: "core-planted", coreId: site.id });
          break;
        case "nano-programar": {
          const core = this.net.core(site.id)!;
          const stage = core.nextStage!;
          core.learn(stage, stage === "enlazar" ? this.net.remoteInRange(core) : undefined);
          this.events.push({ type: "stage-learned", coreId: core.id, stage });
          break;
        }
        case "nano-reparar": {
          const core = this.net.core(site.id)!;
          const fault = core.faults().find((f) => f.id === chore.targetId);
          if (!fault) break;
          core.repair(fault.id);
          this.repairs++;
          this.events.push({ type: "repaired", fault });
          break;
        }
        default:
          throw new Error(`Not a nano_net chore: ${chore.kind}`);
      }
    };
    return new NanoSession(chore, run, onDone, () => this.events.push({ type: "chore-failed", choreId: chore.id }));
  }

  /** Time passes for every core (days). */
  tick(dtDays: number): void {
    for (const fault of this.net.tick(dtDays, this.rng)) this.events.push({ type: "fault", fault });
  }

  /** A strong jolt at a site (an enraged asteroid nearby) shakes its core. */
  jolt(siteId: string, severity: number): void {
    for (const fault of this.net.core(siteId)?.jolt(severity, this.rng) ?? []) this.events.push({ type: "fault", fault });
  }

  /** Apply what the network gives at the ship's position for `dtS` seconds of simulated time. */
  powerShip(ship: PoweredShip, fx: NetEffects, dtS: number): void {
    if (fx.energyKw > 0 && ship.hullIntegrity < 1) ship.repair(fx.energyKw * NANO_TUNING.hullRepairPerKwH * (dtS / 3600));
  }

  drainEvents(): NanoEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
