import { ChoreRun } from "@modules/chores/domain/chore";
import { BioLab, selfSufficiencyGauge, type BioProcess, type BioRun, type BioState, type CrewNeeds, type GaugeRow, type NitrogenSource } from "../domain/bioreactor";
import type { Amounts, MaterialId, MaterialStock } from "../domain/materials";
import type { StationOutfit } from "../domain/outfit";
import { bioTuneChore } from "./challenges";
import { StationSession } from "./station-ops";

/** The mothership's larder, as the station sees it (habitat stores by item id). */
export interface Larder {
  stock(item: string, amount: number): void;
}

/** One station material shipped to the larder in whole units of a larder item. */
export interface LarderUnit {
  readonly material: MaterialId;
  readonly item: string;
  readonly kgPerUnit: number;
  readonly label: string;
}

export interface BioOpsConfig {
  readonly needs: CrewNeeds;
  readonly kcalPerKg: Readonly<Record<MaterialId, number>>;
  /** Where each output goes, for the tuning challenge and the Vida tab. */
  readonly uses: Readonly<Record<MaterialId, string>>;
  readonly larderUnits: readonly LarderUnit[];
  /** People living at the station (their exhaled CO₂ feeds the crops). */
  readonly crew: () => number;
  /** Food everyone on board eats a day, kcal (crew and animals). */
  readonly eatersKcalPerDay: () => number;
  /** Resin that came from outside at the start, kg. */
  readonly resinImportedKg: number;
  readonly materialName?: (id: MaterialId) => string;
}

/** A living machine as the Vida tab shows it. */
export interface BioStatus {
  readonly process: BioProcess;
  readonly installed: boolean;
  readonly state: BioState;
  readonly hoursLeft: number;
  readonly run: BioRun;
  /** Power its equipment draws, kW (0 when not installed). */
  readonly powerKw: number;
}

const N_IN_NH3 = 14.007 / 17.031;

/**
 * Use case: the station's living machines (docs/design/autosustento.md). The crop fields and the
 * biology lab's reactors run on the station's game clock; starting or retuning one is a chain of code
 * challenges about power, balance per hour and where its outputs go. Food goes to the mothership's
 * larder; nitrogen the loop cannot recover is shown as imported, and other supplies plug in through
 * `nitrogenSources` (comet ammonia, `cometas-importacion`) or the store's ammonia.
 */
export class BioOps {
  readonly lab: BioLab;
  /** Nitrogen supplies besides the loop: the hook for comet ammonia. */
  readonly nitrogenSources: NitrogenSource[] = [];
  /**
   * Top up the fertiliser with ammonia from the store: comet ammonia (docs/design/importacion.md) or the
   * propellant plant's. On by default: it is what closes the nitrogen the loop cannot.
   */
  ammoniaFertiliser = true;
  /** Sublimate comet CO₂ ice for the crops when the crew's breath is not enough. */
  co2FromIce = true;
  private ammoniaNPerHour = 0;
  private iceCo2PerHour = 0;

  constructor(
    readonly outfit: StationOutfit,
    readonly stock: MaterialStock,
    processes: readonly BioProcess[],
    private readonly cfg: BioOpsConfig,
  ) {
    this.lab = new BioLab(processes);
  }

  installed(p: BioProcess): boolean {
    return this.outfit.has(p.equipmentId);
  }

  private powerKw(p: BioProcess): number {
    return this.outfit.equipment.find((e) => e.spec.id === p.equipmentId)?.spec.powerKw ?? 0;
  }

  /** Let the living machines work for some game hours. */
  tick(hours: number): void {
    if (hours <= 0) return;
    for (const p of this.lab.processes) if (p.startsWhenBuilt && this.installed(p) && this.lab.state(p.id) === "parado") this.lab.tune(p.id);
    this.ammoniaNPerHour = this.ammoniaFertiliser ? this.topUpNitrogen(hours) / hours : 0;
    const crewCo2 = (this.cfg.crew() * this.cfg.needs.co2KgPerDay) / 24;
    this.iceCo2PerHour = this.co2FromIce ? this.topUpCo2(hours, crewCo2 * hours) / hours : 0;
    this.lab.tick(hours, this.stock, (id) => this.outfit.has(id), crewCo2);
  }

  /** What the running processes would take of a material this tick at their tuned speed, kg. */
  private demand(m: MaterialId, hours: number): number {
    return this.lab.processes.reduce((s, p) => s + (this.installed(p) ? (p.inputs[m] ?? 0) * this.lab.efficiency(p.id) * hours : 0), 0);
  }

  /** Sublimate comet CO₂ ice for what the crew's breath and the store do not cover; kg of CO₂. */
  private topUpCo2(hours: number, exhaled: number): number {
    const short = this.demand("co2", hours) - exhaled - this.stock.amount("co2");
    const n = Math.min(Math.max(0, short), this.stock.amount("hielo-co2"));
    if (n <= 1e-12) return 0;
    this.stock.take({ "hielo-co2": n });
    this.stock.add({ co2: n });
    return n;
  }

  /** Comet CO₂ ice sublimated for the crops in the last tick, kg a day. */
  get iceCo2KgPerDay(): number {
    return this.iceCo2PerHour * 24;
  }

  /** Turn store ammonia into fertiliser for what the running processes will take this tick; kg of N. */
  private topUpNitrogen(hours: number): number {
    const short = this.demand("fertilizante", hours) - this.stock.amount("fertilizante");
    const n = Math.min(Math.max(0, short), this.stock.amount("amoniaco") * N_IN_NH3);
    if (n <= 1e-12) return 0;
    this.stock.take({ amoniaco: n / N_IN_NH3 });
    this.stock.add({ fertilizante: n });
    return n;
  }

  status(): BioStatus[] {
    return this.lab.processes.map((p) => ({ process: p, installed: this.installed(p), state: this.lab.state(p.id), hoursLeft: this.lab.hoursLeft(p.id), run: this.lab.run(p.id), powerKw: this.powerKw(p) }));
  }

  /** Why a process cannot be tuned now (undefined if it can). */
  tuneBlocker(id: string): string | undefined {
    const p = this.lab.process(id);
    if (!p) return "No existe";
    return this.installed(p) ? undefined : `Monta antes ${this.outfit.name(p.equipmentId)} (Planos → Equipo)`;
  }

  /** Start (or retune) a living machine: the chain of challenges; solved, it runs at full speed. */
  startTuning(id: string): StationSession {
    const p = this.lab.process(id);
    const why = this.tuneBlocker(id);
    if (!p || why) throw new Error(`Cannot tune ${id}: ${why}`);
    const chore = bioTuneChore(p, { powerKw: this.powerKw(p), stock: this.stock, uses: this.cfg.uses, ...(this.cfg.materialName ? { materialName: this.cfg.materialName } : {}) });
    return new StationSession(chore, new ChoreRun(chore, 2), () => this.lab.tune(id));
  }

  /** Nitrogen supplies counted in the gauge: the store's ammonia, if used, and any plugged-in source. */
  nitrogen(): NitrogenSource[] {
    const out = [...this.nitrogenSources];
    if (this.ammoniaNPerHour > 0) out.push({ id: "amoniaco", label: "Amoníaco de cometas o de la planta", kgNPerDay: this.ammoniaNPerHour * 24, local: true });
    return out;
  }

  gauge(): GaugeRow[] {
    const loop = this.lab.processes.find((p) => p.id === "bucle");
    return selfSufficiencyGauge({
      perDay: this.lab.perDay(),
      crew: this.cfg.crew(),
      needs: this.cfg.needs,
      eatersKcalPerDay: this.cfg.eatersKcalPerDay(),
      kcalPerKg: this.cfg.kcalPerKg,
      wasteLoopRuns: !!loop && this.lab.run(loop.id).k > 0,
      resinLocalKg: this.lab.made.resina ?? 0,
      resinImportedKg: this.cfg.resinImportedKg,
      nitrogen: this.nitrogen(),
    });
  }

  /** Food waiting in the store for the larder, in larder units (whole units only). */
  forLarder(): { unit: LarderUnit; units: number }[] {
    return this.cfg.larderUnits.map((unit) => ({ unit, units: Math.floor(this.stock.amount(unit.material) / unit.kgPerUnit + 1e-9) })).filter((x) => x.units > 0);
  }

  /** Ship the food to the mothership's larder; returns what went. */
  shipToLarder(larder: Larder): { unit: LarderUnit; units: number }[] {
    const sent = this.forLarder();
    for (const { unit, units } of sent) {
      this.stock.take({ [unit.material]: Math.min(this.stock.amount(unit.material), units * unit.kgPerUnit) } as Amounts);
      larder.stock(unit.item, units);
    }
    return sent;
  }
}
