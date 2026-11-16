import { CREW_BALANCE, dailyBalance } from "../data/crew-balance";

/** Drinking and food water per person and day (no hygiene water in the LM), kg. */
const drinkKgPerDay = (crew: number) => CREW_BALANCE.drinkFoodWaterKg.value * crew;

/**
 * An open-loop life support, like the Apollo LM's (docs/design/modulo-lunar-juventas.md, «Soporte vital»):
 * nothing is recovered. O₂ comes from tanks, CO₂ is taken by lithium-hydroxide cartridges that are
 * changed by hand, water is drunk and boiled off in the sublimator that cools the cabin, and batteries
 * feed it all. Only the crew aboard breathe (Doménica is in one vehicle at a time). Pure and
 * vehicle-agnostic: the host gives an `OpenLoopConfig`.
 */
export interface OpenLoopConfig {
  /** Crew it is built for. */
  readonly crew: number;
  /** Free cabin air, m³ (the LM: 4,5 habitable). */
  readonly freeAirM3: number;
  readonly o2Kg: number;
  /** LiOH cartridges aboard, the one in use included. */
  readonly cartridges: number;
  /** CO₂ one cartridge takes before it is spent, kg. */
  readonly co2PerCartridgeKg: number;
  readonly waterKg: number;
  /** Water the sublimator boils off per hour to carry the cabin's heat away, kg/h. */
  readonly sublimatorKgPerH: number;
  readonly batteryWh: number;
  /** Average electric load, W. */
  readonly loadW: number;
  /** O₂ to fill the cabin again after it is emptied for an EVA, kg. */
  readonly repressO2Kg: number;
}

export interface OpenLoopReadout {
  readonly crewAboard: number;
  readonly o2Kg: number;
  readonly cartridges: number;
  /** Share of the cartridge in use still free, 0..1. */
  readonly cartridgeLeft: number;
  readonly ppCO2MmHg: number;
  readonly waterKg: number;
  readonly batteryWh: number;
  /** Hours left at this crew, and what runs out first. */
  readonly enduranceH: number;
  readonly limit: "O₂" | "LiOH" | "agua" | "baterías";
}

export type OpenLoopEvent = { readonly kind: "cartucho-agotado" } | { readonly kind: "co2-alto"; readonly mmHg: number } | { readonly kind: "agotado"; readonly what: OpenLoopReadout["limit"] };

/** Above this the cabin readout warns and a cartridge change is a task (NASA-STD-3001's 1-hour 3 mmHg). */
export const LIOH_CO2_WARN_MMHG = 3;
/** The alarm: 5,3 mmHg, as the station's (life-support.ts). */
export const LIOH_CO2_ALARM_MMHG = 5.3;

const R = 8.314462618;
const CABIN_K = 295.15;
const CO2_MOLAR = 0.04401;
const PA_PER_MMHG = 133.322;

export class OpenLoopEcs {
  private o2: number;
  private cartridges: number;
  private used = 0;
  private co2Free = 0;
  private water: number;
  private battery: number;
  private aboard: number;
  private warned = false;
  private gone = new Set<string>();

  constructor(readonly config: OpenLoopConfig) {
    this.o2 = config.o2Kg;
    this.cartridges = config.cartridges;
    this.water = config.waterKg;
    this.battery = config.batteryWh;
    this.aboard = config.crew;
  }

  get crewAboard(): number {
    return this.aboard;
  }
  setCrewAboard(n: number): void {
    this.aboard = Math.max(0, n);
  }

  /** The cartridge in use is spent (CO₂ builds up in the cabin). */
  get cartridgeSpent(): boolean {
    return this.used >= this.config.co2PerCartridgeKg - 1e-9;
  }

  /** Board hours pass. */
  advance(hours: number): OpenLoopEvent[] {
    const ev: OpenLoopEvent[] = [];
    if (hours <= 0) return ev;
    const day = dailyBalance(this.aboard);
    const h = hours / 24;
    this.o2 = Math.max(0, this.o2 - day.o2Kg * h);
    // The cartridge takes what it can; the rest stays in the air.
    const co2 = day.co2Kg * h;
    const room = Math.max(0, this.config.co2PerCartridgeKg - this.used);
    const wasFull = this.cartridgeSpent;
    const into = this.cartridges > 0 ? Math.min(room, co2 + this.co2Free) : 0;
    this.used += into;
    this.co2Free = Math.max(0, this.co2Free + co2 - into);
    if (!wasFull && this.cartridgeSpent) ev.push({ kind: "cartucho-agotado" });
    // Drinking (its share of the day's water) and the sublimator (while anyone is aboard: the cabin is on).
    if (this.aboard > 0) this.water = Math.max(0, this.water - drinkKgPerDay(this.aboard) * h - this.config.sublimatorKgPerH * hours);
    this.battery = Math.max(0, this.battery - this.config.loadW * hours * (this.aboard > 0 ? 1 : 0.1));
    const mm = this.ppCO2MmHg();
    if (mm > LIOH_CO2_ALARM_MMHG && !this.warned) {
      this.warned = true;
      ev.push({ kind: "co2-alto", mmHg: mm });
    }
    if (mm < LIOH_CO2_WARN_MMHG) this.warned = false;
    for (const [what, left] of [["O₂", this.o2], ["agua", this.water], ["baterías", this.battery]] as const)
      if (left <= 0 && !this.gone.has(what)) {
        this.gone.add(what);
        ev.push({ kind: "agotado", what });
      }
    return ev;
  }

  private ppCO2MmHg(): number {
    // A cartridge in use keeps the cabin near zero; what it cannot take builds up in the free air.
    return ((this.co2Free / CO2_MOLAR) * R * CABIN_K) / this.config.freeAirM3 / PA_PER_MMHG;
  }

  /** Change the spent cartridge for a new one (the LM's ECS: by hand, behind the LMP's station). */
  changeCartridge(): string | undefined {
    if (this.cartridges <= 1) return "No quedan cartuchos de LiOH de repuesto";
    this.cartridges -= 1;
    this.used = 0;
    return undefined;
  }

  /** The cabin was emptied for an EVA: filling it again takes O₂ from the tanks. */
  repressurise(): void {
    this.o2 = Math.max(0, this.o2 - this.config.repressO2Kg);
  }

  /** Docked to a host that can top it up (Starship, the station): back to the starting stocks. Licence. */
  replenish(): void {
    this.o2 = this.config.o2Kg;
    this.cartridges = this.config.cartridges;
    this.used = 0;
    this.co2Free = 0;
    this.water = this.config.waterKg;
    this.battery = this.config.batteryWh;
    this.gone.clear();
  }

  readout(): OpenLoopReadout {
    const day = dailyBalance(Math.max(1, this.aboard));
    const left = (this.cartridges - 1) * this.config.co2PerCartridgeKg + Math.max(0, this.config.co2PerCartridgeKg - this.used);
    const hours = {
      "O₂": (this.o2 / day.o2Kg) * 24,
      LiOH: (left / day.co2Kg) * 24,
      agua: this.water / (drinkKgPerDay(Math.max(1, this.aboard)) / 24 + this.config.sublimatorKgPerH),
      baterías: this.battery / this.config.loadW,
    } as const;
    const limit = (Object.keys(hours) as OpenLoopReadout["limit"][]).reduce((a, b) => (hours[b] < hours[a] ? b : a));
    return {
      crewAboard: this.aboard,
      o2Kg: this.o2,
      cartridges: this.cartridges,
      cartridgeLeft: Math.max(0, 1 - this.used / this.config.co2PerCartridgeKg),
      ppCO2MmHg: this.ppCO2MmHg(),
      waterKg: this.water,
      batteryWh: this.battery,
      enduranceH: hours[limit],
      limit,
    };
  }
}
