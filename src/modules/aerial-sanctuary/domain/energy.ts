/**
 * The energy park's rules that work without a scene (Cold Sanctuary's EnergyRule, WindTurbineUnit and
 * TidalTurbineUnit; docs/energia.md there): the turbines' power curve, the bird stop (a bird within 200 m stops a
 * turbine, which rearms 30 s after the last one), the tidal pilot's tip-speed governor and its marine stop, the
 * ice-throw screening and how many solar tables a demand asks for.
 */
export interface WindTurbineSpec {
  readonly ratedKW: number;
  readonly rotorM: number;
  readonly hubM: number;
  readonly cutInMs: number;
  readonly ratedMs: number;
  readonly cutOutMs: number;
}

/** One turbine's power with wind `v`, kW: cubic up to rated, nothing outside cut-in/cut-out. */
export function windPowerKW(v: number, t: WindTurbineSpec): number {
  if (v < t.cutInMs || v > t.cutOutMs) return 0;
  if (v >= t.ratedMs) return t.ratedKW;
  return (t.ratedKW * (v ** 3 - t.cutInMs ** 3)) / (t.ratedMs ** 3 - t.cutInMs ** 3);
}

/** The top of the blade, m. */
export const turbineTopM = (t: WindTurbineSpec): number => t.hubM + t.rotorM / 2;

/** Ice-throw screening (Seifert/DEWI): 1,5 × (hub + rotor). */
export const iceThrowRadiusM = (t: WindTurbineSpec): number => 1.5 * (t.hubM + t.rotorM);

export interface StopRule {
  /** An animal within this distance stops the machine, m. */
  readonly radiusM: number;
  /** With none, it rearms this long after the last one, s. */
  readonly resumeS: number;
}

/** A turbine's stop state: stopped since a detection, free again at `freeAtS`. */
export interface StopState {
  readonly stopped: boolean;
  readonly freeAtS: number;
  readonly stops: number;
  readonly why: string;
}

export const RUNNING: StopState = { stopped: false, freeAtS: -1, stops: 0, why: "" };

/**
 * Once a second (EnergySite.ScanNow): the distances to the animals near this machine. One within the radius
 * stops it (or keeps it stopped) and resets the rearm clock; with none, it rearms once the clock has run out.
 */
export function scan(s: StopState, nowS: number, distancesM: readonly number[], rule: StopRule, what = "un ave"): StopState {
  const near = distancesM.some((d) => d <= rule.radiusM);
  if (near) return { stopped: true, freeAtS: nowS + rule.resumeS, stops: s.stopped ? s.stops : s.stops + 1, why: `${what} a ≤ ${rule.radiusM} m` };
  if (s.stopped && nowS >= s.freeAtS) return { ...s, stopped: false, why: "" };
  return s;
}

export interface TidalSpec {
  readonly rotorM: number;
  readonly cp: number;
  readonly tipSpeedRatio: number;
  readonly maxTipMs: number;
  readonly seawaterKgM3: number;
}

/** The governor: the tip never goes faster than the seal-safe limit. */
export const tipSpeedMs = (current: number, t: TidalSpec): number => Math.min(t.maxTipMs, current * t.tipSpeedRatio);

/** One rotor's power, kW: ½ ρ A v³ Cp. */
export function tidalPowerKW(v: number, t: TidalSpec): number {
  const area = (Math.PI * t.rotorM * t.rotorM) / 4;
  return (0.5 * t.seawaterKgM3 * area * v ** 3 * t.cp) / 1000;
}

export interface SolarSpec {
  /** Share of a floor's yearly energy its panels pay. */
  readonly share: number;
  /** kWh per kWp per year. */
  readonly yieldKWhPerKWp: number;
  readonly tableKWp: number;
}

export const requiredKWp = (kW: number, s: SolarSpec): number => (Math.max(0, kW) * 8760 * s.share) / s.yieldKWhPerKWp;
export const tablesFor = (kW: number, s: SolarSpec): number => Math.max(0, Math.ceil(requiredKWp(kW, s) / s.tableKWp - 1e-4));
