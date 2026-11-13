import type { Sourced } from "@core/units";
import type { Amounts, MaterialId, MaterialStock } from "./materials";

/**
 * Living machines of the station (docs/design/autosustento.md): the crop fields and the bioreactors
 * of the biology lab. Unlike the refinery they do not work in batches: once started (a chain of code
 * challenges about their power, their balance per hour and where their outputs go) they run all the
 * time, taking their inputs from the store and putting their outputs in it, hour by hour. Left alone
 * they drift and give half, until someone tunes them again. The biology stays at game level: inputs
 * and outputs per hour, power, mass and the measured yields they are scaled from.
 */

/** A continuous process run by a piece of equipment. Rates are kg per game hour at full speed. */
export interface BioProcess {
  readonly id: string;
  readonly name: string;
  /** The equipment that runs it (installed in a module's racks). */
  readonly equipmentId: string;
  /** Who does the work («Limnospira indica», «trigo y papa»…). */
  readonly organism: string;
  readonly inputs: Amounts;
  readonly outputs: Amounts;
  /** Where the rates come from, and how they were scaled to this equipment. */
  readonly basis: Sourced<string>;
  /** Maintenance round in order (revisa, ajusta el caudal, recoge): the last tuning challenge orders it. */
  readonly steps: readonly string[];
  /** It starts by itself once its equipment is installed (the crop fields are sown when they are built). */
  readonly startsWhenBuilt?: boolean;
}

/** Game tuning of the living machines (not real data). */
export const BIO_TUNING = {
  /** Game hours a tuning lasts before the culture drifts (ten days). */
  tunedHours: 240,
  /** Share of full speed a drifted culture gives. */
  driftEfficiency: 0.5,
} as const;

export type BioState = "parado" | "en-marcha" | "desajustado";

/** What one process did over the last tick. */
export interface BioRun {
  /** Share of full speed it ran at (0 when stopped or missing an input). */
  readonly k: number;
  /** The input that held it back, if any. */
  readonly short?: MaterialId;
}

/** What one crew member needs a day (NASA BVAD) and what the station's ECLSS recovers. */
export interface CrewNeeds {
  readonly o2KgPerDay: number;
  readonly co2KgPerDay: number;
  /** Water used a day (drink, food, hygiene). */
  readonly waterKgPerDay: number;
  /** Share of the water the station's own water recovery gives back. */
  readonly waterRecovered: number;
}

/**
 * The station's living machines: which are tuned, how long ago, and what they did. The clock is the
 * station's game time in hours.
 */
export class BioLab {
  private readonly tunedAt = new Map<string, number>();
  private readonly runs = new Map<string, BioRun>();
  private readonly _made: Record<MaterialId, number> = {};
  clock = 0;

  constructor(
    readonly processes: readonly BioProcess[],
    private readonly tuning: { readonly tunedHours: number; readonly driftEfficiency: number } = BIO_TUNING,
  ) {}

  process(id: string): BioProcess | undefined {
    return this.processes.find((p) => p.id === id);
  }

  /** The chain of challenges was solved: the process runs at full speed again. */
  tune(id: string): void {
    if (!this.process(id)) throw new Error(`Unknown bio process ${id}`);
    this.tunedAt.set(id, this.clock);
  }

  state(id: string): BioState {
    const t = this.tunedAt.get(id);
    if (t === undefined) return "parado";
    return this.clock - t < this.tuning.tunedHours ? "en-marcha" : "desajustado";
  }

  /** Hours left before it drifts (0 when stopped or drifted). */
  hoursLeft(id: string): number {
    const t = this.tunedAt.get(id);
    return t === undefined ? 0 : Math.max(0, this.tuning.tunedHours - (this.clock - t));
  }

  efficiency(id: string): number {
    const s = this.state(id);
    return s === "parado" ? 0 : s === "en-marcha" ? 1 : this.tuning.driftEfficiency;
  }

  run(id: string): BioRun {
    return this.runs.get(id) ?? { k: 0 };
  }

  /** Everything the living machines have made since the start, kg by material. */
  get made(): Amounts {
    return this._made;
  }

  /**
   * Let the living machines work for some game hours. The crew's exhaled CO₂ goes to the store first;
   * then each installed and started process, in catalogue order, takes what it needs (it slows down
   * to the scarcest input) and gives its outputs.
   */
  tick(hours: number, stock: MaterialStock, installed: (equipmentId: string) => boolean, crewCo2KgPerHour = 0): void {
    if (hours <= 0) return;
    this.clock += hours;
    if (crewCo2KgPerHour > 0) stock.add({ co2: crewCo2KgPerHour * hours });
    for (const p of this.processes) {
      const eff = installed(p.equipmentId) ? this.efficiency(p.id) : 0;
      if (eff <= 0) {
        this.runs.set(p.id, { k: 0 });
        continue;
      }
      let k = eff;
      let short: MaterialId | undefined;
      for (const [id, rate] of Object.entries(p.inputs)) {
        const need = rate * hours;
        if (need <= 0) continue;
        const can = stock.amount(id) / need;
        if (can < k) {
          k = Math.max(0, can);
          short = id;
        }
      }
      if (k > 0) {
        stock.take(scale(p.inputs, k * hours));
        const out = scale(p.outputs, k * hours);
        stock.add(out);
        for (const [id, n] of Object.entries(out)) this._made[id] = (this._made[id] ?? 0) + n;
      }
      this.runs.set(p.id, short ? { k, short } : { k });
    }
  }

  /** What the processes make and take a day at the speed they last ran, kg by material. */
  perDay(): { made: Amounts; used: Amounts } {
    const made: Record<MaterialId, number> = {};
    const used: Record<MaterialId, number> = {};
    for (const p of this.processes) {
      const k = this.run(p.id).k;
      if (k <= 0) continue;
      for (const [id, n] of Object.entries(p.outputs)) made[id] = (made[id] ?? 0) + n * k * 24;
      for (const [id, n] of Object.entries(p.inputs)) used[id] = (used[id] ?? 0) + n * k * 24;
    }
    return { made, used };
  }
}

const scale = (a: Amounts, k: number): Amounts => Object.fromEntries(Object.entries(a).map(([id, n]) => [id, n * k]));

// --- Self-sufficiency ---------------------------------------------------------------------------

export type GaugeId = "oxigeno" | "comida" | "co2" | "agua" | "nitrogeno" | "resina";

/** One row of the self-sufficiency gauge: what is made here against what is needed. */
export interface GaugeRow {
  readonly id: GaugeId;
  readonly label: string;
  /** Made (or absorbed, recovered) here, per day or in total for resin. */
  readonly local: number;
  /** Needed per day, or used in total for resin. */
  readonly need: number;
  /** What has to come from outside to cover the need (need − local, never below 0). */
  readonly imported: number;
  readonly unit: string;
  /** local / need, 0..1. */
  readonly share: number;
  readonly note: string;
}

/**
 * Nitrogen that does not come from the waste loop. The loop only gives back what the residues carry,
 * so the crops' nitrogen never closes on its own (docs/design/autosustento.md, «Nitrógeno»). Every
 * other supply plugs in here: ammonia from the propellant plant today, comet ammonia when the
 * `cometas-importacion` work lands. `local` says whether it counts as made here or imported.
 */
export interface NitrogenSource {
  readonly id: string;
  readonly label: string;
  /** kg of nitrogen a day it supplies. */
  readonly kgNPerDay: number;
  readonly local: boolean;
}

export interface GaugeInput {
  readonly perDay: { readonly made: Amounts; readonly used: Amounts };
  readonly crew: number;
  readonly needs: CrewNeeds;
  /** Food everyone on board eats a day (crew and animals), kcal. */
  readonly eatersKcalPerDay: number;
  /** kcal per kg of each food the bioreactors and crops make. */
  readonly kcalPerKg: Readonly<Record<MaterialId, number>>;
  /** The waste loop runs: it closes the water the ECLSS loses (brine, solids). */
  readonly wasteLoopRuns: boolean;
  /** Resin made here and resin that came in from outside, kg (all time). */
  readonly resinLocalKg: number;
  readonly resinImportedKg: number;
  /** Nitrogen supplies besides the loop (none yet: the hook for comet ammonia). */
  readonly nitrogen?: readonly NitrogenSource[];
}

const share = (local: number, need: number) => (need > 0 ? Math.max(0, Math.min(1, local / need)) : 0);
const row = (id: GaugeId, label: string, local: number, need: number, unit: string, note: string, full = false): GaugeRow => ({
  id,
  label,
  local,
  need,
  imported: Math.max(0, need - local),
  unit,
  share: need > 0 ? share(local, need) : full ? 1 : 0,
  note,
});

/**
 * How self-sufficient the station is: oxygen, food, CO₂ absorption, water and nitrogen per day,
 * and the share of all resin that was grown here. Oxygen is net of what the hydrogen-eating bacteria
 * breathe. Nitrogen is honest: what the loop gives back plus local sources, against what the crops
 * and reactors take; the rest is imported fertiliser.
 */
export function selfSufficiencyGauge(g: GaugeInput): GaugeRow[] {
  const made = (id: MaterialId) => g.perDay.made[id] ?? 0;
  const used = (id: MaterialId) => g.perDay.used[id] ?? 0;
  const o2 = Math.max(0, made("oxigeno") - used("oxigeno"));
  const kcal = Object.entries(g.kcalPerKg).reduce((s, [id, k]) => s + made(id) * k, 0);
  const co2 = Math.max(0, used("co2") - made("co2"));
  const waterNeed = g.crew * g.needs.waterKgPerDay;
  const waterShare = g.wasteLoopRuns ? 1 : g.needs.waterRecovered;
  const nLocal = made("fertilizante") + (g.nitrogen ?? []).filter((n) => n.local).reduce((s, n) => s + n.kgNPerDay, 0);
  const nNeed = used("fertilizante");
  const resinAll = g.resinLocalKg + g.resinImportedKg;
  const nNote = nNeed > 0 && nLocal < nNeed ? `El bucle devuelve ${pct(nLocal / nNeed)} del nitrógeno que comen cultivos y biorreactores: el resto es fertilizante importado` : "Fertilizante que el bucle saca de los residuos frente al que comen cultivos y biorreactores";
  return [
    row("oxigeno", "Oxígeno", o2, g.crew * g.needs.o2KgPerDay, "kg/día", "Neto: lo que dan las plantas y la espirulina menos lo que respiran las bacterias del hidrógeno"),
    row("comida", "Comida", kcal, g.eatersKcalPerDay, "kcal/día", "Cosecha, espirulina y proteína frente a lo que comen la tripulación y los animales"),
    row("co2", "CO₂ absorbido", co2, g.crew * g.needs.co2KgPerDay, "kg/día", "Lo que los cultivos y biorreactores se comen del CO₂ que exhala la tripulación"),
    row("agua", "Agua", waterNeed * waterShare, waterNeed, "kg/día", g.wasteLoopRuns ? "El ECLSS recupera el 98 % y el bucle de residuos cierra el resto" : "El ECLSS recupera el 98 %, como la ISS; el resto se repone con agua de la roca o importada"),
    row("nitrogeno", "Nitrógeno", nLocal, nNeed, "kg N/día", nNote, nLocal > 0),
    row("resina", "Resina", g.resinLocalKg, resinAll, "kg", "Parte de toda la resina de la estación que salió del biorreactor de PHB"),
  ];
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** One number for the whole station: the mean of the life rows (oxygen, food, water) and resin. */
export const overallSelfSufficiency = (rows: readonly GaugeRow[]): number => {
  const keep = rows.filter((r) => r.id === "oxigeno" || r.id === "comida" || r.id === "agua" || r.id === "resina");
  return keep.reduce((s, r) => s + r.share, 0) / Math.max(1, keep.length);
};
