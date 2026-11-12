/** Real sources behind the station's processes (docs/design/estacion.md). */
export const SRC = {
  /** Lauretta et al. 2024, Meteoritics & Planetary Science: the Bennu sample (phyllosilicates, sulfides, magnetite). */
  bennuSample: "https://arxiv.org/abs/2404.12536",
  /** Pohl & Britt 2024, Planetary Science Journal 5:252: dehydration of serpentines and extraction of water. */
  serpentineWater: "https://doaj.org/article/198ccfc372ab4952abdfa1e23f2e25cb",
  /** Metzger, Zacny & Morrison, ASCE J. Aerospace Engineering: thermal extraction of volatiles from asteroid regolith. */
  thermalExtraction: "https://arxiv.org/abs/2306.03776",
  /** University of Arizona LPL for NASA: carbonyls of iron and nickel from meteoritic metal, separated by distillation. */
  carbonylAsteroid: "https://ntrs.nasa.gov/citations/19910015913",
  /** Mond process: Ni + 4 CO → Ni(CO)4 at 50–60 °C; decomposes back to Ni at 220–250 °C. */
  mond: "https://en.wikipedia.org/wiki/Mond_process",
  /** Sirk, Sadoway & Sibille 2010 (ECS): molten regolith electrolysis near 1600 °C, O2 at the anode, Fe and Si at the cathode. */
  mre: "https://ntrs.nasa.gov/citations/20110008535",
  /** Muscatello 2017 (NASA KSC): oxygen extraction from minerals; MRE also yields Fe, Si, Al, Ti and glass. */
  oxygenFromMinerals: "https://ntrs.nasa.gov/citations/20170001458",
  /** ESA's metal 3D printer on the ISS (Airbus, Cranfield University): first metal part printed in space, August 2024, stainless steel. */
  metalPrinter: "https://www.tomshardware.com/3d-printing/scientists-print-3d-metal-parts-in-space-for-the-first-time-a-key-ability-for-long-distance-long-duration-missions",
  /** Monopropellant rocket: hydrazine decomposes on Aerojet S-405, granular alumina coated with iridium. */
  s405: "https://en.wikipedia.org/wiki/Monopropellant_rocket",
  /** Metzger et al. 2013, J. Aerospace Engineering: space industry bootstrapped from a sub-replicating system supplied from Earth. */
  bootstrapping: "https://arxiv.org/abs/1612.03238",
  /** Composite overwrapped pressure vessel: a thin metal liner wound with carbon fibre. */
  copv: "https://en.wikipedia.org/wiki/Composite_overwrapped_pressure_vessel",
} as const;
