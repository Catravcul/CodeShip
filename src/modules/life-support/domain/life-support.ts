import type { Sourced } from "@core/units";
import { CREW_BALANCE, crewHeatW, dailyBalance } from "../data/crew-balance";
import { ECLSS_SOURCES as S, GAME_VALUE } from "../data/eclss-sources";
import type { EclssMachineId, EclssMachineSpec, FailureMode, Wear } from "./eclss";

/** Gas constant, J/(mol·K). */
const R = 8.314462618;
const M = { o2: 0.031998, co2: 0.04401, n2: 0.028014 } as const;
const PA_PER_MMHG = 133.322;
/** Cabin air at 22 °C (the ISS keeps 18–27 °C). */
const CABIN_K = 295.15;

/** Partial pressure of `kg` of a gas of molar mass `molarKg` in `m3`, Pa (ideal gas). */
export const partialPressurePa = (kg: number, molarKg: number, m3: number, k = CABIN_K): number => ((kg / molarKg) * R * k) / m3;
const massFor = (pa: number, molarKg: number, m3: number, k = CABIN_K) => (pa * m3 * molarKg) / (R * k);

/** CO₂ limits, mmHg (docs/research/soporte-vital.md §1). */
export const CO2_LIMITS = {
  /** NASA-STD-3001 V2 6004: 1-hour average at most 3 mmHg. Above it the readout turns amber. */
  nasaStd: { value: 3, source: S.co2Brief, note: "Límite de 1 h de NASA-STD-3001 V2 6004" },
  /** The alarm: 5,3 mmHg (0,7 % at 101,3 kPa), the ISS's old 180-day limit; asked by the design brief. */
  alarm: { value: 5.3, source: S.co2Brief, note: "0,7 % a 101,3 kPa: el límite de 180 días de la ISS (SMAC), citado en el brief" },
} as const satisfies Record<string, Sourced<number>>;

/** O₂: normoxia 149 mmHg inspired; 122 mmHg is NASA's absolute lower limit (1 h). */
export const O2_LIMITS = {
  setKPa: { value: 21.3, source: S.atmosphereBrief, note: "21 % de 101,3 kPa, la cabina de la ISS" },
  lowKPa: { value: (122 * PA_PER_MMHG) / 1000, source: S.atmosphereBrief, note: "PIO₂ de 122 mmHg, límite inferior absoluto" },
} as const satisfies Record<string, Sourced<number>>;

/** How the machines behave, from the sources (docs/design/soporte-vital.md, «Modelo»). */
export const ECLSS_MODEL = {
  /** CDRA removal grows with the ppCO₂: 4,8 kg/day at 3 mmHg measured, so 1,6 kg/day per mmHg. */
  cdraKgPerDayPerMmHg: { value: 4.8 / 3, source: S.cdra4eu, note: "Lineal en la ppCO₂ (4,1 personas a 2 torr, 10,5 a 5 torr)" },
  ogaMaxKgPerDay: { value: 9.2, source: S.ogaPerformance },
  ogaStandbyW: { value: 382, source: S.ogaPerformance },
  /** 2 H₂O → 2 H₂ + O₂: 36 g of water per 32 g of O₂, and 4 g of H₂. */
  waterPerO2: { value: 36 / 32, source: S.marshall, note: "Estequiometría de la electrólisis" },
  h2PerO2: { value: 4 / 32, source: S.marshall, note: "Estequiometría de la electrólisis" },
  /** CO₂ + 4 H₂ → CH₄ + 2 H₂O: 36 g of water and 44 g of CO₂ per 8 g of H₂. */
  sabatierWaterPerH2: { value: 36 / 8, source: S.issEclss, note: "Estequiometría de la reacción de Sabatier" },
  sabatierCo2PerH2: { value: 44 / 8, source: S.issEclss, note: "Estequiometría de la reacción de Sabatier" },
  upaRecovery: { value: 0.87, source: S.water2022 },
  upaMaxKgPerDay: { value: 9, source: S.issEclss },
  /** With the BPA, urine recovery reaches 98 %: it recovers this share of the brine. */
  bpaBrineRecovery: { value: (0.98 - 0.87) / 0.13, source: S.water2022, note: "Cuenta nuestra: del 87 % al 98 %" },
  /** WPA product water, L/day (7548 L a year). */
  wpaMaxKgPerDay: { value: 7548 / 365, source: S.water2022 },
  /**
   * What the WPA keeps of what it treats: the share that makes the whole loop the ISS's 98 % with the BPA.
   * Check: without the BPA the same model gives 94 %, the ISS's 93–94 % before June 2023.
   */
  wpaRecovery: { value: 0.98 / (1 - (1.4 / 3.8) * (1 - 0.98)), source: S.water98, note: "Cuenta nuestra a partir del 98 % total" },
  /** Air leakage, kg per person and day: the ISS's O₂ leak (0,011 kg) as air at 21 % O₂. */
  airLeakKgPerCrewDay: { value: 0.011 / 0.21, source: S.logistics2024, note: "Estimación de los autores para el O₂; el aire, cuenta nuestra" },
  /** Without the coolant loops the cabin warms this fast, °C/h. */
  warmCPerHour: { value: 0.5, source: S.atcs, note: GAME_VALUE },
  /** Trace contaminants as a share of their limits (SMAC): made per day, and removed by the TCCS per day. */
  contaminantPerDay: { value: 0.05, source: S.tccs, note: GAME_VALUE },
  tccsRemovalPerDay: { value: 1, source: S.tccs, note: GAME_VALUE },
} as const satisfies Record<string, Sourced<number>>;

/** Share of the used water recovered when everything works: urine by UPA (+BPA), the rest by the WPA. */
export function nominalWaterRecovery(opts: { bpa: boolean }): number {
  const m = ECLSS_MODEL;
  const use = CREW_BALANCE.drinkFoodWaterKg.value + CREW_BALANCE.hygieneWaterKg.value;
  const urine = CREW_BALANCE.urineKg.value / use;
  const urineRec = m.upaRecovery.value + (opts.bpa ? (1 - m.upaRecovery.value) * m.bpaBrineRecovery.value : 0);
  return (urine * urineRec + (1 - urine)) * m.wpaRecovery.value;
}

/**
 * How much of a mode's driver a crew makes in a day with everything running (for the resupply's spares):
 * machines that run all day count 24 h, the CDRA its 16 half-cycles, the rest what that crew's urine and water give.
 */
export function nominalDriverPerDay(w: Wear, crew: number): number {
  const day = dailyBalance(crew);
  const m = ECLSS_MODEL;
  switch (w.driver) {
    case "horas":
      return 24;
    case "ciclos":
      return 24 / CDRA_HALF_CYCLE_H.value;
    case "m3-aire":
      return 24 * TCCS_M3_PER_H;
    case "horas-proceso":
      return (day.urineKg / m.upaMaxKgPerDay.value) * 24;
    case "kg-orina":
      return day.urineKg;
    case "kg-agua":
      return day.waterUseKg;
    case "kg-salmuera":
      return day.urineKg * (1 - m.upaRecovery.value);
  }
}

/** What the host carries: crew, free air and stocks. Spares by id. */
export interface LifeSupportConfig {
  readonly crew: number;
  /** Free air volume, m³ (the ISS: 388 m³ habitable). */
  readonly freeAirM3: number;
  readonly waterKg: number;
  readonly foodKg: number;
  readonly o2TankKg: number;
  readonly n2TankKg: number;
  readonly spares: Readonly<Record<string, number>>;
}

/** From this share of its life a failure mode asks for its preventive maintenance (game value). */
export const SERVICE_AT = { value: 0.8, source: S.eclsStatus2024, note: `${GAME_VALUE}: la ISS cambia piezas por tendencia de sus datos, antes de que fallen` } as const satisfies Sourced<number>;

/** CDRA half-cycle: 90 min, so 16 half-cycles a day while it runs. */
export const CDRA_HALF_CYCLE_H = { value: 1.5, source: S.cdra4eu, note: "Medio ciclo de 90 min" } as const satisfies Sourced<number>;
/** TCCS blower flow, m³/h. */
const TCCS_M3_PER_H = 15.3;

export interface LifeSupportOptions {
  /**
   * Failures come from their causes (`FailureMode.wear`): each mode's driver accumulates while its machine
   * runs and it fails at its life. Off, nothing wears (unit tests of the balance; `fail` still works).
   */
  readonly wear: boolean;
}

/** How worn a failure mode is, for the rack's card. */
export interface WearStatus {
  readonly failure: FailureMode;
  /** Share of its life used (1 = it fails). */
  readonly share: number;
  /** Driver count now, in `failure.wear.unit`. */
  readonly count: number;
  /** Board days left at the rate of the last hour (Infinity if it is not wearing now). */
  readonly daysLeft: number;
  /** Its preventive maintenance is due. */
  readonly due: boolean;
}

export type Level = "ok" | "aviso" | "alarma";

export interface MachineStatus {
  readonly id: EclssMachineId;
  readonly short: string;
  readonly capacity: number;
  readonly working: boolean;
  /** Why it is off or slow (the failure's name, or «sin refrigeración»). */
  readonly why?: string;
  readonly powerW: number;
  /** Its most worn failure mode that has not happened yet. */
  readonly wear?: WearStatus;
}

export interface Readout {
  readonly pressureKPa: number;
  readonly ppO2KPa: number;
  readonly ppCO2MmHg: number;
  readonly co2State: Level;
  readonly o2State: Level;
  /** CO₂ going up or down since the last step, mmHg per hour. */
  readonly co2TrendMmHgH: number;
  readonly waterKg: number;
  readonly urineTankKg: number;
  readonly wasteTankKg: number;
  readonly waterRecovery: number;
  readonly foodKg: number;
  readonly foodDays: number;
  readonly o2TankKg: number;
  readonly n2TankKg: number;
  readonly powerW: number;
  readonly heatW: number;
  readonly cabinC: number;
  /** Trace contaminants, share of their limits. */
  readonly contaminants: number;
  readonly machines: readonly MachineStatus[];
}

export type LifeSupportEvent =
  | { readonly kind: "averia"; readonly failure: FailureMode }
  /** A failure mode reached `SERVICE_AT` of its life: its preventive maintenance is due. */
  | { readonly kind: "desgaste"; readonly failure: FailureMode }
  | { readonly kind: "alarma-co2"; readonly mmHg: number }
  | { readonly kind: "co2-normal"; readonly mmHg: number }
  | { readonly kind: "sin-agua" }
  | { readonly kind: "sin-comida" };

const co2Level = (mmHg: number): Level => (mmHg >= CO2_LIMITS.alarm.value ? "alarma" : mmHg > CO2_LIMITS.nasaStd.value ? "aviso" : "ok");

/**
 * The life-support system of one vehicle: its machines, cabin air and stocks, stepped in board hours.
 * Pure and vehicle-agnostic (docs/design/soporte-vital.md).
 */
export class LifeSupport {
  private o2: number;
  private co2: number;
  private n2: number;
  private water: number;
  private food: number;
  private o2Tank: number;
  private n2Tank: number;
  private urineTank = 0;
  private wasteTank = 0;
  private tempC = 22;
  private contam = 0.05;
  private hours = 0;
  private lastCo2 = 0;
  private trend = 0;
  private lastPowerW = 0;
  private readonly failed = new Map<EclssMachineId, FailureMode[]>();
  private readonly stock = new Map<string, number>();
  private ogaRate = 0;
  /** Driver count of each failure mode, and its rate in the last step (per hour). */
  private readonly worn = new Map<string, number>();
  private readonly wearRate = new Map<string, number>();
  /** Food already taken out of the pantry for a meal at the galley, eaten before the pantry is touched again. */
  private mealCredit = 0;
  /** Crew aboard now; `config.crew` is the crew it is built for. */
  private aboard: number;

  constructor(
    readonly specs: readonly EclssMachineSpec[],
    readonly config: LifeSupportConfig,
    private readonly opts: LifeSupportOptions = { wear: false },
  ) {
    this.aboard = config.crew;
    const v = config.freeAirM3;
    this.o2 = massFor(O2_LIMITS.setKPa.value * 1000, M.o2, v);
    this.n2 = massFor(101325 - O2_LIMITS.setKPa.value * 1000 - 0.7 * PA_PER_MMHG, M.n2, v);
    // Start where one person's CO₂ settles with the CDRA working.
    const eq = dailyBalance(config.crew).co2Kg / ECLSS_MODEL.cdraKgPerDayPerMmHg.value;
    this.co2 = massFor(eq * PA_PER_MMHG, M.co2, v);
    this.lastCo2 = eq;
    this.water = config.waterKg;
    this.food = config.foodKg;
    this.o2Tank = config.o2TankKg;
    this.n2Tank = config.n2TankKg;
    for (const [k, n] of Object.entries(config.spares)) this.stock.set(k, n);
    for (const f of this.allFailures()) this.worn.set(f.id, f.wear.startShare * f.wear.life);
    this.lastPowerW = this.power();
  }

  private allFailures(): FailureMode[] {
    return this.specs.flatMap((m) => m.failures);
  }

  private failureSpec(id: string): FailureMode {
    const f = this.allFailures().find((x) => x.id === id);
    if (!f) throw new Error(`Unknown failure ${id}`);
    return f;
  }

  /** Share of its life a failure mode has used (1 = it fails). */
  wearShare(failureId: string): number {
    const f = this.failureSpec(failureId);
    return (this.worn.get(f.id) ?? 0) / f.wear.life;
  }

  /** Set a mode's wear (a share of its life): for the experience suite and tests. */
  setWear(failureId: string, share: number): void {
    const f = this.failureSpec(failureId);
    this.worn.set(f.id, Math.max(0, share) * f.wear.life);
  }

  wearStatus(failureId: string): WearStatus {
    const f = this.failureSpec(failureId);
    const count = this.worn.get(f.id) ?? 0;
    const share = count / f.wear.life;
    const rate = this.wearRate.get(f.id) ?? 0;
    const failed = this.active().some((x) => x.id === f.id);
    return { failure: f, share, count, daysLeft: rate > 0 ? Math.max(0, f.wear.life - count) / rate / 24 : Infinity, due: !failed && share >= SERVICE_AT.value };
  }

  /** Preventive maintenance due now: modes past `SERVICE_AT` of their life that have not failed. */
  due(): FailureMode[] {
    return this.allFailures().filter((f) => this.wearStatus(f.id).due);
  }

  /**
   * The preventive maintenance is done: the wear goes back to its `resetTo` (a new part, or a cleaned one).
   * False (and nothing changes) if it is not due or it needs a spare there is not.
   */
  service(failureId: string): boolean {
    const f = this.failureSpec(failureId);
    if (!this.wearStatus(f.id).due) return false;
    if (f.wear.service.usesSpare) {
      if (this.spares(f.spare.id) <= 0) return false;
      this.stock.set(f.spare.id, this.spares(f.spare.id) - 1);
    }
    this.worn.set(f.id, f.wear.service.resetTo * f.wear.life);
    return true;
  }

  /** One meal at the galley: `kg` out of the pantry now (eaten over the next hours). False if there is not enough. */
  drawMeal(kg: number): boolean {
    if (kg <= 0 || this.food + 1e-9 < kg) return false;
    this.food = Math.max(0, this.food - kg);
    this.mealCredit += kg;
    return true;
  }

  /** Food out of the pantry to somewhere else (trip stores for another vehicle); returns what went. */
  takeFood(kg: number): number {
    const k = Math.max(0, Math.min(kg, this.food));
    this.food -= k;
    return k;
  }

  /** A cargo vehicle (or another vehicle) unloads into this one's stores. */
  restock(c: { readonly foodKg?: number; readonly waterKg?: number; readonly o2Kg?: number; readonly n2Kg?: number; readonly spares?: Readonly<Record<string, number>> }): void {
    this.food += Math.max(0, c.foodKg ?? 0);
    this.water += Math.max(0, c.waterKg ?? 0);
    this.o2Tank += Math.max(0, c.o2Kg ?? 0);
    this.n2Tank += Math.max(0, c.n2Kg ?? 0);
    for (const [id, n] of Object.entries(c.spares ?? {})) this.addSpare(id, n);
  }

  /** How many people are aboard now: only they breathe, eat, drink and give off heat. */
  get crewAboard(): number {
    return this.aboard;
  }

  /**
   * Who is aboard now (Doménica is in one vehicle at a time, or in the lander). An empty vehicle still runs
   * its machines, leaks and fails; it just has no crew metabolic load.
   */
  setCrewAboard(n: number): void {
    this.aboard = Math.max(0, n);
  }

  spec(id: EclssMachineId): EclssMachineSpec | undefined {
    return this.specs.find((m) => m.id === id);
  }

  /** Failures not fixed yet, in the order they happened. */
  active(): FailureMode[] {
    return [...this.failed.values()].flat();
  }

  spares(id: string): number {
    return this.stock.get(id) ?? 0;
  }

  addSpare(id: string, n = 1): void {
    this.stock.set(id, this.spares(id) + n);
  }

  /** Share of its capacity a machine has now (failures multiply; no cooling stops a cooled one). */
  capacity(id: EclssMachineId): number {
    const s = this.spec(id);
    if (!s) return 0;
    if (s.cooled && id !== "itcs" && !this.cooling()) return 0;
    return (this.failed.get(id) ?? []).reduce((c, f) => c * f.capacity, 1);
  }

  working(id: EclssMachineId): boolean {
    return this.capacity(id) > 0;
  }

  private cooling(): boolean {
    return !this.spec("itcs") || (this.failed.get("itcs") ?? []).every((f) => f.capacity > 0);
  }

  /** Something breaks (or a bed reaches the end of its life). Returns false if it already had. */
  fail(failureId: string): boolean {
    const f = this.failureSpec(failureId);
    const list = this.failed.get(f.machine) ?? [];
    if (list.some((x) => x.id === f.id)) return false;
    this.failed.set(f.machine, [...list, f]);
    return true;
  }

  /** The repair is done: it uses its spare. False (and nothing changes) without the spare or the failure. */
  repair(failureId: string): boolean {
    const f = this.active().find((x) => x.id === failureId);
    if (!f || this.spares(f.spare.id) <= 0) return false;
    this.stock.set(f.spare.id, this.spares(f.spare.id) - 1);
    // A new part: its wear starts again.
    this.worn.set(f.id, 0);
    this.failed.set(
      f.machine,
      (this.failed.get(f.machine) ?? []).filter((x) => x.id !== f.id),
    );
    return true;
  }

  private ppCo2MmHg(): number {
    return partialPressurePa(this.co2, M.co2, this.config.freeAirM3) / PA_PER_MMHG;
  }
  private ppO2KPa(): number {
    return partialPressurePa(this.o2, M.o2, this.config.freeAirM3) / 1000;
  }

  /** Advance `hours` of board time; long spans are cut into steps of at most one hour. */
  advance(hours: number): LifeSupportEvent[] {
    const out: LifeSupportEvent[] = [];
    let left = hours;
    while (left > 1e-9) {
      const h = Math.min(1, left);
      this.step(h, out);
      left -= h;
    }
    return out;
  }

  private step(h: number, out: LifeSupportEvent[]): void {
    const d = h / 24;
    const m = ECLSS_MODEL;
    const crew = this.config.crew;
    const day = dailyBalance(this.aboard);
    const v = this.config.freeAirM3;
    const before = co2Level(this.ppCo2MmHg());
    const co2Before = this.ppCo2MmHg();
    this.hours += h;

    // Crew aboard: breathe, eat, drink and wash.
    this.o2 = Math.max(0, this.o2 - day.o2Kg * d);
    this.co2 += day.co2Kg * d;
    const hadWater = this.water > 0;
    const hadFood = this.food > 0;
    const used = Math.min(this.water, day.waterUseKg * d);
    this.water -= used;
    // She eats what the galley already took out first, then from the pantry.
    const eat = day.foodKg * d;
    const fromCredit = Math.min(this.mealCredit, eat);
    this.mealCredit -= fromCredit;
    this.food = Math.max(0, this.food - (eat - fromCredit));
    const urineShare = day.waterUseKg > 0 ? day.urineKg / day.waterUseKg : 0;
    this.urineTank += used * urineShare;
    this.wasteTank += used * (1 - urineShare);
    if (hadWater && this.water <= 0) out.push({ kind: "sin-agua" });
    if (hadFood && this.food <= 0 && this.mealCredit <= 0) out.push({ kind: "sin-comida" });

    // Leaks: air out, at the cabin's mix (the hull leaks with or without anyone aboard; rated per crew it is built for).
    const leak = m.airLeakKgPerCrewDay.value * crew * d;
    const air = this.o2 + this.n2 + this.co2;
    if (air > 0) {
      this.o2 -= (leak * this.o2) / air;
      this.n2 -= (leak * this.n2) / air;
    }

    // CDRA: removal grows with the ppCO₂.
    const co2Removed = Math.min(this.co2, m.cdraKgPerDayPerMmHg.value * this.ppCo2MmHg() * this.capacity("cdra") * d);
    this.co2 -= co2Removed;

    // OGA: back to the O₂ set point, within its rate and the water it has.
    const target = massFor(O2_LIMITS.setKPa.value * 1000, M.o2, v);
    const want = Math.max(0, target - this.o2);
    const ogaMax = m.ogaMaxKgPerDay.value * this.capacity("oga") * d;
    const o2Made = Math.min(want, ogaMax, this.water / m.waterPerO2.value);
    this.o2 += o2Made;
    this.water -= o2Made * m.waterPerO2.value;
    this.ogaRate = d > 0 ? o2Made / d : 0;
    // Pressure control: O₂ and N₂ from the tanks when the OGA cannot keep up, N₂ for the leaks.
    const o2Gap = Math.max(0, target - this.o2);
    const fromTank = Math.min(o2Gap, this.o2Tank);
    this.o2 += fromTank;
    this.o2Tank -= fromTank;
    const n2Target = massFor(101325 - O2_LIMITS.setKPa.value * 1000 - 0.7 * PA_PER_MMHG, M.n2, v);
    const n2Add = Math.min(Math.max(0, n2Target - this.n2), this.n2Tank);
    this.n2 += n2Add;
    this.n2Tank -= n2Add;

    // Sabatier: the OGA's hydrogen and the CDRA's CO₂ make water; the rest of the CO₂ and the methane go overboard.
    const h2 = o2Made * m.h2PerO2.value;
    const h2Used = Math.min(h2, co2Removed / m.sabatierCo2PerH2.value) * Math.min(1, this.capacity("sabatier"));
    this.water += h2Used * m.sabatierWaterPerH2.value;

    // Water: UPA distils urine (the BPA recovers its brine); the WPA cleans the rest into drinking water.
    const upa = Math.min(this.urineTank, m.upaMaxKgPerDay.value * this.capacity("upa") * d);
    this.urineTank -= upa;
    const distillate = upa * m.upaRecovery.value;
    const brine = upa - distillate;
    const fromBrine = brine * m.bpaBrineRecovery.value * Math.min(1, this.capacity("bpa"));
    this.wasteTank += distillate + fromBrine;
    const wpa = Math.min(this.wasteTank, m.wpaMaxKgPerDay.value * this.capacity("wpa") * d);
    this.wasteTank -= wpa;
    this.water += wpa * m.wpaRecovery.value;

    // What each failure feeds on, this step: its cause, not dice.
    if (this.opts.wear)
      this.wearStep(h, {
        upaKg: upa,
        wpaKg: wpa,
        brineKg: brine * Math.min(1, this.capacity("bpa")),
        upaHours: m.upaMaxKgPerDay.value > 0 ? (upa / m.upaMaxKgPerDay.value) * 24 : 0,
      }, out);

    // Trace contaminants and heat.
    this.contam = Math.max(0, this.contam + (m.contaminantPerDay.value - m.tccsRemovalPerDay.value * this.capacity("tccs") * this.contam) * d);
    this.tempC = this.cooling() ? Math.max(22, this.tempC - 2 * h) : Math.min(40, this.tempC + m.warmCPerHour.value * h);
    this.lastPowerW = this.power();

    const now = this.ppCo2MmHg();
    this.trend = (now - co2Before) / h;
    this.lastCo2 = now;
    const after = co2Level(now);
    if (after === "alarma" && before !== "alarma") out.push({ kind: "alarma-co2", mmHg: now });
    if (after === "ok" && before !== "ok") out.push({ kind: "co2-normal", mmHg: now });
  }

  /** Driver gained by a mode in `h` hours, from what its machine did this step. */
  private driverGain(w: Wear, machine: EclssMachineId, h: number, done: { upaKg: number; wpaKg: number; brineKg: number; upaHours: number }): number {
    const on = this.capacity(machine) > 0 ? 1 : 0;
    switch (w.driver) {
      case "horas":
        return on * h;
      case "ciclos":
        // The CDRA's half-cycles drive its beds and valves, and the Sabatier's compressor starts with each one.
        return (this.capacity("cdra") > 0 ? 1 : 0) * on * (h / CDRA_HALF_CYCLE_H.value);
      case "m3-aire":
        return on * h * TCCS_M3_PER_H;
      case "horas-proceso":
        return done.upaHours;
      case "kg-orina":
        return done.upaKg;
      case "kg-agua":
        return done.wpaKg;
      case "kg-salmuera":
        return done.brineKg;
    }
  }

  private wearStep(h: number, done: { upaKg: number; wpaKg: number; brineKg: number; upaHours: number }, out: LifeSupportEvent[]): void {
    const failedIds = new Set(this.active().map((f) => f.id));
    const gains = new Map<string, number>();
    for (const f of this.allFailures()) {
      if (failedIds.has(f.id)) {
        gains.set(f.id, 0);
        continue;
      }
      const by = f.wear.worsenedBy ? Math.min(1, this.wearShare(f.wear.worsenedBy.failure)) : 0;
      gains.set(f.id, this.driverGain(f.wear, f.machine, h, done) * (1 + by));
    }
    for (const f of this.allFailures()) {
      const g = gains.get(f.id)!;
      this.wearRate.set(f.id, h > 0 ? g / h : 0);
      if (g <= 0) continue;
      const before = (this.worn.get(f.id) ?? 0) / f.wear.life;
      const now = before + g / f.wear.life;
      this.worn.set(f.id, now * f.wear.life);
      if (now >= 1) {
        if (this.fail(f.id)) out.push({ kind: "averia", failure: f });
      } else if (before < SERVICE_AT.value && now >= SERVICE_AT.value) out.push({ kind: "desgaste", failure: f });
    }
  }

  private machinePowerW(s: EclssMachineSpec): number {
    const c = this.capacity(s.id);
    if (s.id === "oga") return c > 0 ? ECLSS_MODEL.ogaStandbyW.value + ((s.powerW.value - ECLSS_MODEL.ogaStandbyW.value) * this.ogaRate) / ECLSS_MODEL.ogaMaxKgPerDay.value : 0;
    return c > 0 ? s.powerW.value : 0;
  }

  private power(): number {
    return this.specs.reduce((sum, s) => sum + this.machinePowerW(s), 0);
  }

  readout(): Readout {
    const v = this.config.freeAirM3;
    const pressure = (partialPressurePa(this.o2, M.o2, v) + partialPressurePa(this.n2, M.n2, v) + partialPressurePa(this.co2, M.co2, v)) / 1000;
    const pp = this.ppCo2MmHg();
    const o2 = this.ppO2KPa();
    const perDay = dailyBalance(this.config.crew).foodKg;
    const cool = this.cooling();
    return {
      pressureKPa: pressure,
      ppO2KPa: o2,
      ppCO2MmHg: pp,
      co2State: co2Level(pp),
      o2State: o2 < O2_LIMITS.lowKPa.value ? "alarma" : o2 < O2_LIMITS.setKPa.value - 1 ? "aviso" : "ok",
      co2TrendMmHgH: this.trend,
      waterKg: this.water,
      urineTankKg: this.urineTank,
      wasteTankKg: this.wasteTank,
      waterRecovery: this.working("upa") && this.working("wpa") ? nominalWaterRecovery({ bpa: this.working("bpa") }) : this.working("wpa") ? nominalWaterRecovery({ bpa: false }) * (1 - CREW_BALANCE.urineKg.value / 3.8) : 0,
      foodKg: this.food,
      foodDays: perDay > 0 ? (this.food + this.mealCredit) / perDay : Infinity,
      o2TankKg: this.o2Tank,
      n2TankKg: this.n2Tank,
      powerW: this.lastPowerW,
      heatW: crewHeatW(this.aboard) + this.lastPowerW,
      cabinC: this.tempC,
      contaminants: this.contam,
      machines: this.specs.map((s) => {
        const c = this.capacity(s.id);
        const f = this.failed.get(s.id)?.[0];
        const why = f ? f.name : s.cooled && s.id !== "itcs" && !cool ? "Sin refrigeración" : undefined;
        const worst = s.failures
          .map((x) => this.wearStatus(x.id))
          .filter((w) => !this.active().some((a) => a.id === w.failure.id))
          .sort((a, b) => b.share - a.share)[0];
        return { id: s.id, short: s.short, capacity: c, working: c > 0, ...(why ? { why } : {}), powerW: this.machinePowerW(s), ...(worst ? { wear: worst } : {}) };
      }),
    };
  }
}
