import type { Sourced } from "@core/units";
import type { Propellant } from "../domain/components";

/** Propellant and pressurant data (docs/design/componentes.md, «Tanques»). Checked 2026-11-13. */
export const PROP_SRC = {
  l3harrisBiprop: "https://www.l3harris.com/sites/default/files/2025-05/l3harris-ar-bipropellant-rocket-engines.pdf",
  mmh: "https://en.wikipedia.org/wiki/Monomethylhydrazine",
  nto: "https://en.wikipedia.org/wiki/Dinitrogen_tetroxide",
  hydrazine: "https://en.wikipedia.org/wiki/Hydrazine",
  marshallSoa: "https://ntrs.nasa.gov/api/citations/20205006456/downloads/Marshall%20StateoftheArt_2020Final%20%28AFRL%20PA%20Approved%29-Final.pdf",
  nistHelium: "https://webbook.nist.gov/cgi/fluid.cgi?Action=Load&ID=C7440597&Type=IsoTherm&Digits=5&PLow=20&PHigh=310&PInc=10&T=293.15&RefState=DEF&TUnit=K&PUnit=bar&DUnit=kg%2Fm3&HUnit=kJ%2Fkg&WUnit=m%2Fs&VisUnit=uPa*s&STUnit=N%2Fm",
  ngPmd: "https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks/data-sheets-sorted-by-part-number",
  gr1: "https://ntrs.nasa.gov/api/citations/20170001286/downloads/20170001286.pdf",
} as const;

export const NTO_DENSITY = 1442.46; // kg/m³, liquid at 21 °C
export const MMH_DENSITY = 875; // kg/m³ at 20 °C
/** Oxidizer-to-fuel mass ratio of the MMH/NTO pair: the nominal 1.65 of every MMH engine on the L3Harris and ArianeGroup sheets. */
export const MMH_NTO_MIXTURE_RATIO = 1.65;

/**
 * Bulk density of what each tank holds, kg/m³. Tank volume (and so the tank drawn outside the hull)
 * follows from capacity / density. MMH/NTO is a pair of tanks; its density is that of the mix. At
 * O/F 1.65 the fuel and the oxidizer take the same volume, so the pair is two equal tanks.
 */
export const PROPELLANT_DENSITY: Readonly<Record<Propellant, Sourced<number>>> = {
  Hydrazine: { value: 1021, source: PROP_SRC.hydrazine, note: "1.021 g/cm³, anhydrous liquid" },
  "MMH/NTO": {
    value: (1 + MMH_NTO_MIXTURE_RATIO) / (1 / MMH_DENSITY + MMH_NTO_MIXTURE_RATIO / NTO_DENSITY),
    source: PROP_SRC.mmh,
    note: "MMH 0.875 g/cm³ (Wikipedia, Monomethylhydrazine); NTO 1.44246 g/cm³ (Wikipedia, Dinitrogen tetroxide); O/F 1.65 from the L3Harris sheet",
  },
  "LMP-103S": { value: 1240, source: PROP_SRC.marshallSoa, note: "1.24 g/cm³ (NASA MSFC state of the art 2020); ADN, methanol, ammonia and water" },
};

/** Tank volume in m³ for a capacity in kg. */
export const tankVolumeM3 = (p: Propellant, capacityKg: number): number => capacityKg / PROPELLANT_DENSITY[p].value;

/** Helium at 20 °C (NIST WebBook, real gas): in the bottle at 310 bar and in the tanks at the regulated pressure. */
export const HELIUM_KG_M3 = {
  bottle: { value: 44.427, source: PROP_SRC.nistHelium, note: "310 bar, 293.15 K" },
  tank: { value: 3.2527, source: PROP_SRC.nistHelium, note: "20 bar, 293.15 K" },
} as const;
/** Regulated tank pressure: just under the 22 bar MEOP of the titanium tanks, above the R-4D's 15 bar inlet. Estimate. */
export const REGULATED_BAR = 20;
/** Regulator, latch and check valves, filters and lines of one helium line. Estimate (no catalogue mass found). */
export const PRESSURANT_HARDWARE_KG = 5;

/** Share of a tank that can be filled. */
export const FILL = {
  /** Regulated PMD tank: «95% max fill fraction» (Northrop Grumman 80433-1, MESSENGER). */
  pmd: { value: 0.95, source: PROP_SRC.ngPmd, note: "Copiado: 95 % de llenado máximo en la hoja del 80433-1" },
  /**
   * Blowdown diaphragm tank: the gas in a quarter of the tank expands to all of it, so the pressure
   * falls 4:1 (ideal gas). The ratio is an estimate; the GR-1 works from 37.9 to 6.9 bar (5.5:1).
   */
  blowdown: { value: 0.75, source: PROP_SRC.gr1, note: "Estimación: purga 4:1 (el GR-1 trabaja de 37,9 a 6,9 bar)" },
} as const;

/** Spanish name of each propellant, for in-game text. */
export const PROPELLANT_NAME: Readonly<Record<Propellant, string>> = { "MMH/NTO": "MMH/NTO", Hydrazine: "hidracina", "LMP-103S": "LMP-103S" };
