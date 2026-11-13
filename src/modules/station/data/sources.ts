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
  // --- Propellant plant and refuelling (docs/design/estacion.md, «Planta de propelente»). Checked 2026-11-13.
  /** Glavin et al. 2025, Nature Astronomy: Bennu aggregates hold N 0.23–0.25 wt% and ~13.6 µmol/g of ammonia, 75 × Ryugu's. */
  bennuNitrogen: "https://ntrs.nasa.gov/api/citations/20250001355/downloads/GlavinAbundantSTI.pdf",
  /** Lodders, Palme & Gail 2009, Table 3: CI chondrites hold N 2950 ppm, Cl 698 ppm, He 9.17 ppb, Ar 1.33 ppb, Kr 0.052 ppb, Xe 0.174 ppb. */
  ciAbundances: "https://arxiv.org/abs/0901.1149",
  /** US DOE technical targets, PEM electrolysis: system 55 kWh/kg H2 (2022 status), 51 kWh/kg (2026 target). */
  pemElectrolysis: "https://www.energy.gov/eere/fuelcells/technical-targets-proton-exchange-membrane-electrolysis",
  /** Electrically driven Haber–Bosch: 40–45 GJ/t NH3 (11.1–12.5 kWh/kg), hydrogen included (Frontiers in Chem. Eng. 2021). */
  haberBoschEnergy: "https://www.frontiersin.org/articles/10.3389/fceng.2021.765457/full",
  /** Haber–Bosch: N2 + 3 H2 ⇌ 2 NH3 on an iron catalyst at high pressure. */
  haber: "https://en.wikipedia.org/wiki/Haber_process",
  /** Peroxide (Pechiney–Ugine–Kuhlmann) process: 2 NH3 + H2O2 → N2H4 + 2 H2O through a ketazine of methyl ethyl ketone; azine at ~50 °C, hydrolysis at 8 bar. */
  peroxideProcess: "https://en.wikipedia.org/wiki/Peroxide_process",
  /** Hydrazine: Olin Raschig (hypochlorite), Bayer ketazine and peroxide processes; monopropellant on iridium–alumina. */
  hydrazine: "https://en.wikipedia.org/wiki/Hydrazine",
  /** Ostwald process: 4 NH3 + 5 O2 → 4 NO + 6 H2O at ~900 °C on Pt with 10 % Rh, strongly exothermic; NO cooled to ~250 °C oxidises to NO2 ⇌ N2O4. */
  ostwald: "https://en.wikipedia.org/wiki/Ostwald_process",
  /** EP 2042483 A1 (background): MMH is made by the modified Raschig process, chloramine from ammonia and sodium hypochlorite reacting with methylamine. */
  mmhProcess: "https://patents.google.com/patent/EP2042483A1/en",
  /** Ammonium dinitramide (the oxidizer of LMP-103S): nitration of sulfamates with nitric and sulfuric acid, or of ammonium nitrate in oleum. */
  adn: "https://en.wikipedia.org/wiki/Ammonium_dinitramide",
  /** Sabatier reaction: CO2 + 4 H2 → CH4 + 2 H2O on nickel at 300–400 °C; the ISS uses it to recover water. */
  sabatier: "https://en.wikipedia.org/wiki/Sabatier_reaction",
  /** NASA Tech Briefs NPO-20679 (JPL): loading hydrazine through the service valve, then purging the flexline with pressurant. */
  hydrazineLoading: "https://www.techbriefs.com/component/content/article/6967-npo-20679",
  /** ESA Biomass before fuelling: each closed valve pressurised with helium on one side and vacuum on the other, helium detectors find leaks. */
  heliumLeakCheck: "https://www.spacedaily.com/reports/Biomass_satellite_prepped_for_launch_fuel_load_999.html",
  /** Tianzhou 1 refuelled Tiangong 2 in orbit (2017): about five days. */
  tianzhouRefuel: "https://spaceflightnow.com/2017/04/27/tianzhou-1-freighter-achieves-chinas-first-in-space-refueling-demo/",
  /** Xenon: boils at −108,1 °C; critical point 289,733 K (16,6 °C) and 5,842 MPa; world production ~5000–7000 m³ in 1998. */
  xenon: "https://en.wikipedia.org/wiki/Xenon",
  // --- Comet ice (docs/design/importacion.md). Checked 2026-11-13.
  /** Läuter et al. 2020, MNRAS: gas 67P lost in 2014–2016, by species (H2O 4,0e9 kg, CO2 7,2e8 kg, NH3 1,5e7 kg). */
  cometGas: "https://arxiv.org/abs/2006.01750",
  /** Enthalpy of fusion of water ice: 333,55 kJ/kg at 0 °C. */
  iceFusion: "https://en.wikipedia.org/wiki/Enthalpy_of_fusion",
  /** Ice: specific heat about 2,05 kJ/(kg·K) near 0 °C; liquid water 4,18 kJ/(kg·K). */
  iceHeat: "https://en.wikipedia.org/wiki/Ice",
  /** MOXIE on Perseverance: solid-oxide electrolysis CO2 → CO + ½ O2 at ~800 °C, 122 g of O2 made on Mars in 2021–2023. */
  moxie: "https://en.wikipedia.org/wiki/Mars_Oxygen_In-Situ_Resource_Utilization_Experiment",
  /** Boudouard reaction: 2 CO ⇌ C + CO2, carbon deposits on iron below ~700 °C. */
  boudouard: "https://en.wikipedia.org/wiki/Boudouard_reaction",
} as const;
