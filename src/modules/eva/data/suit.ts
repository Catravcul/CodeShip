import type { Sourced } from "@core/units";

const WIKI_EMU = "https://en.wikipedia.org/wiki/Extravehicular_Mobility_Unit";
const NASA_EVA = "https://ntrs.nasa.gov/api/citations/20140009556/downloads/20140009556.pdf";
const WIKI_SAFER = "https://en.wikipedia.org/wiki/Simplified_Aid_For_EVA_Rescue";
const NASA_SAFER = "https://mailman.amsat.org/hyperkitty/list/sarex@amsat.org/thread/G5ZE64VCGDIWIY5TPJHNYJPU35RAO2NH/";

/** What a spacesuit carries and how long it lasts. Times are at the design average metabolic rate. */
export interface SuitSpec {
  readonly name: string;
  /** Primary oxygen, seconds at the average metabolic rate. */
  readonly primaryOxygenS: Sourced<number>;
  /** Secondary (emergency) oxygen, seconds. Only used once the primary runs out. */
  readonly secondaryOxygenS: Sourced<number>;
  /** CO2 scrubber (METOX cartridge) capacity, seconds at the average metabolic rate. */
  readonly co2ScrubberS: Sourced<number>;
  /** Battery (fans, pump, radio, lights), seconds at constant draw. */
  readonly batteryS: Sourced<number>;
  /** Average and maximum metabolic rate the suit is designed for, watts. */
  readonly metabolicW: Sourced<{ average: number; max: number }>;
  readonly pressureKPa: Sourced<number>;
  readonly massKg: Sourced<number>;
}

/** NASA's EMU as used on the ISS (values copied from the cited pages on 2026-11-12). */
export const EMU: SuitSpec = {
  name: "EMU (NASA)",
  primaryOxygenS: { value: 8 * 3600, source: WIKI_EMU, note: "Primary life support: 8 hours (480 minutes)" },
  secondaryOxygenS: { value: 30 * 60, source: WIKI_EMU, note: "Backup life support: 30 minutes (two 6000 psi secondary O2 tanks, NASA 2014)" },
  co2ScrubberS: {
    value: 8.5 * 3600,
    source: NASA_EVA,
    note: "METOX cartridge removes CO2 and trace contaminants; the deck gives no hours, so it is sized to the 8.5 h of primary + backup O2 (game assumption)",
  },
  batteryS: { value: 8.5 * 3600, source: NASA_EVA, note: "Li-ion primary battery; no rating in the source, sized to the 8.5 h of life support (game assumption)" },
  metabolicW: { value: { average: 290, max: 580 }, source: NASA_EVA, note: "Average/Max metabolic rates: 1000 BTU/h (290 W) / 2000 BTU/h (580 W)" },
  pressureKPa: { value: 29.6, source: WIKI_EMU, note: "Operating pressure: 4.3 psi (29.6 kPa)" },
  massKg: { value: 144.7, source: WIKI_EMU, note: "Total ISS EVA suit weight: 319 lb (144.7 kg)" },
};

/** A cold-gas jetpack for getting back to safety. */
export interface JetpackSpec {
  readonly name: string;
  readonly thrusters: Sourced<number>;
  readonly thrustPerThrusterN: Sourced<number>;
  /** Thrusters that fire together to translate along one axis. */
  readonly thrustersPerAxis: Sourced<number>;
  readonly deltaVMs: Sourced<number>;
  readonly massKg: Sourced<number>;
}

export const SAFER: JetpackSpec = {
  name: "SAFER (NASA)",
  thrusters: { value: 24, source: WIKI_SAFER, note: "24 gaseous-nitrogen (GN2) thrusters" },
  thrustPerThrusterN: { value: 3.56, source: NASA_SAFER, note: "NASA release (STS-64, 1994): 3.56 newtons (0.8 pounds) each" },
  thrustersPerAxis: { value: 4, source: WIKI_SAFER, note: "Game assumption: four thrusters push along each axis (24 thrusters / 6 directions)" },
  deltaVMs: { value: 3.05, source: WIKI_SAFER, note: "ΔV 3.05 m/s (10 feet/second), 1.4 kg of GN2" },
  massKg: { value: 37.7, source: WIKI_SAFER, note: "37.7 kg (85 pounds)" },
};

/** Tether from the airlock to the suit. */
export const SAFETY_TETHER_M: Sourced<number> = {
  value: 85 * 0.3048,
  source: NASA_EVA,
  note: "Safety Tether (55' and 85'): the long ISS reel, 85 ft = 25.9 m",
};
