import type { Sourced } from "@core/units";
import type { Propellant } from "../domain/components";

export const NTO_DENSITY = 1442.46; // kg/m³, liquid at 21 °C
export const MMH_DENSITY = 875; // kg/m³ at 20 °C
/** Oxidizer-to-fuel mass ratio assumed for the MMH/NTO pair. Game value until an engine sheet gives it. */
export const MMH_NTO_MIXTURE_RATIO = 1.65;

/**
 * Bulk density of what each tank holds, kg/m³. Tank volume (and so the tank drawn outside the hull)
 * follows from capacity / density. MMH/NTO is a pair of tanks; its density is that of the mix.
 */
export const PROPELLANT_DENSITY: Readonly<Record<Propellant, Sourced<number>>> = {
  Hydrazine: { value: 1021, source: "https://en.wikipedia.org/wiki/Hydrazine", note: "1.021 g/cm³, anhydrous liquid" },
  "MMH/NTO": {
    value: (1 + MMH_NTO_MIXTURE_RATIO) / (1 / MMH_DENSITY + MMH_NTO_MIXTURE_RATIO / NTO_DENSITY),
    source: "https://en.wikipedia.org/wiki/Monomethylhydrazine",
    note: "MMH 0.875 g/cm³ (Wikipedia, Monomethylhydrazine); NTO 1.44246 g/cm³ (Wikipedia, Dinitrogen tetroxide); mixture ratio 1.65 is a game value",
  },
};

/** Tank volume in m³ for a capacity in kg. */
export const tankVolumeM3 = (p: Propellant, capacityKg: number): number => capacityKg / PROPELLANT_DENSITY[p].value;
