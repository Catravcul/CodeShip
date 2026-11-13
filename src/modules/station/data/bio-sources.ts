/**
 * Real sources behind the station's crops and bioreactors (docs/design/autosustento.md). Checked
 * 2026-11-13. Each entry says what was taken from it.
 */
export const BIO_SRC = {
  /** Wheeler et al., NASA KSC: Biomass Production Chamber, 20 m², 1200+ days: 481 kg dry biomass, 196 kg edible, 540 kg O₂, 739 kg CO₂ fixed, 94 700 kg condensed water. */
  bpc: "https://ntrs.nasa.gov/citations/20040089951",
  /** Wheeler 2021 review (Frontiers): 40–50 m² of high-light crops feed one person and make all of their O₂; LEDs > 3 µmol/J. */
  cropsPerPerson: "https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2021.734343/full",
  /** Lunar Palace 1 (Yuegong-1): 160 m², 58 m² of plants, 105 days with 3 crew in 2014; mealworms fed on inedible biomass. */
  lunarPalace: "https://en.wikipedia.org/wiki/Yuegong-1",
  /** Fu et al. (Lunar Palace 365, 370 days, 4 crew): 120 m² of plants, 98,2 % closure, 100 % O₂ and water, 73 % of food (dry); the solid-waste fermenter degraded 67 %, ~400 g dry/day, ~670 g CO₂/day; 99,7 % of urine N recovered. */
  lunarPalace365: "https://www.biorxiv.org/content/10.1101/2021.01.12.426282v1.full-text",
  /** MELiSSA (ESA): C1 thermophilic anaerobic liquefying at 55 °C, C2 photoheterotrophic, C3 nitrifying (Nitrosomonas, Nitrobacter), C4a Arthrospira, C4b higher plants; pilot plant at the UAB, Barcelona, since 2009. */
  melissa: "https://en.wikipedia.org/wiki/MELiSSA",
  /** Limnospira indica in the MELiSSA pilot plant: up to 0,58 g/L/day of biomass and 1,19 mmol O₂/L/h at 932 µmol/m²/s; ArtEMISS on the ISS at 33 °C (Frontiers 2023). */
  limnospira: "https://frontiersin.org/articles/10.3389/fspas.2023.1178332/full",
  /** 83 L air-lift photobioreactor of L. indica: best O₂ at a dilution rate of 0,025 h⁻¹ and 930 µmol/m²/s; photoinhibition above 1700 (Microbial Biotechnology 2022). */
  limnospiraAirlift: "https://doaj.org/article/bb8e6ed6571146e4addeff6e13d2624d",
  /** ESA: ArtEMISS, spirulina on the ISS (December 2017), four photobioreactors, about a month. */
  artemiss: "https://www.esa.int/Our_Activities/Human_Spaceflight/Research/Green_smoothies_in_space",
  /** Airbus 2019: PBR@LSR, Chlorella vulgaris in Columbus' Life Support Rack, up to 180 days; algae could replace some 30 % of the crew's food. */
  pbrLsr: "https://www.airbus.com/en/newsroom/press-releases/2019-04-photobioreactor-oxygen-and-a-source-of-nutrition-for-astronauts",
  /** USDA FDC, «Seaweed, spirulina, dried»: 290 kcal and 57,47 g protein per 100 g. */
  spirulinaFood: "https://fdc.nal.usda.gov/food-search?query=Seaweed%2C%20spirulina%2C%20dried&type=SR%20Legacy",
  /** USDA FDC, «Wheat flour, whole-grain»: 340 kcal per 100 g (the station's grain goes to the larder as flour). */
  wheatFlour: "https://fdc.nal.usda.gov/food-search?query=Wheat%20flour%2C%20whole-grain&type=SR%20Legacy",
  /** Verseux et al. 2021: Anabaena sp. PCC 7938 grows at 100 hPa (96 % N₂, 4 % CO₂) and on Mars regolith simulant with no added nutrients; its lysate feeds E. coli. */
  anabaena: "https://www.frontiersin.org/articles/10.3389/fmicb.2021.611798",
  /** Cockell et al. 2020 (BioRock, ISS, 21 days at ~20 °C): Sphingomonas desiccabilis leached rare earths from basalt at 111,9–429,2 % of the sterile controls, 0,024–0,117 % of what the rock held; Bacillus subtilis did worse, Cupriavidus metallidurans no better. */
  biorock: "https://link.springer.com/10.1038/s41467-020-19276-w",
  /** Bioleaching: Acidithiobacillus oxidises iron and sulfur and frees nickel, copper and cobalt from sulfide ores, in heaps or stirred tanks. */
  bioleaching: "https://en.wikipedia.org/wiki/Bioleaching",
  /** Takeshita, Tanaka, Ishizaki & Stanbury 1993 (Kyushu Univ.): Alcaligenes eutrophus (now Cupriavidus necator) uses H₂:O₂:CO₂ at 21,36 : 6,21 : 4,09 to grow and 33 : 12 : 4 to make PHB. */
  knallgasStoichiometry: "https://catalog.lib.kyushu-u.ac.jp/opac_download_md/24037/p055.pdf",
  /** Bioengineering 2023 (MDPI), on Tanaka et al. 1995: autotrophic C. necator H16 reached 91,3 g/L of cells and 62 g/L of PHB in 40 h; O₂ kept below ~4 % vol, the lower explosion limit. */
  phbAutotrophic: "https://www.mdpi.com/2306-5354/10/11/1304",
  /** Solar Foods: Solein, Xanthobacter sp. SoF1 grown on H₂, CO₂, ammonium and minerals, ~50 % protein, 5–10 % fat, 20–25 % carbohydrate; ESA incubator; a 40 L bioreactor for a crew of six. */
  solein: "https://en.wikipedia.org/wiki/Solar_Foods",
  /** Life Support Baseline Values and Assumptions Document (Anderson et al. 2018): 0,816 kg O₂ consumed, 1,04 kg CO₂ exhaled, 2,5 kg of drinking water per crew-day. */
  bvad: "https://ntrs.nasa.gov/citations/20180001338",
  /** Calculator that lists the BVAD per crew-day values (0,816 kg O₂, 1,04 kg CO₂, 2,50 kg drinking water). */
  bvadTable: "https://lifesupportcalc.neocities.org/",
  /** NASA 2023: with the Brine Processor Assembly the ISS recovers 98 % of its water (93–94 % before); about a gallon (3,8 L) per crew member a day. */
  issWater98: "https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf",
  /** ISS ECLSS: the Sabatier (ACLS) turns 50 % of the captured CO₂ into methane and water, ~400 L/year less resupply; urine processor 9 kg/day. */
  issEclss: "https://en.wikipedia.org/wiki/ISS_ECLSS",
  /** Sabatier reaction: CO₂ + 4 H₂ → CH₄ + 2 H₂O on nickel at 300–400 °C. */
  sabatier: "https://en.wikipedia.org/wiki/Sabatier_reaction",
  /** Methanogens: archaea that make methane from H₂ and CO₂ (the biological Sabatier). */
  methanogen: "https://en.wikipedia.org/wiki/Methanogen",
  /** ISS Life Sciences Glovebox (Kibo, 2018): sealed bench for biology, the model for the station's lab. */
  lsg: "https://www.nasa.gov/humans-in-space/partnership-teamwork-enable-landmark-science-glovebox-launch-to-space-station",
  /** Photosynthetic efficiency: at least 8 photons per O₂ (in practice ~10). */
  photosynthesis: "https://en.wikipedia.org/wiki/Photosynthetic_efficiency",
  /** CFRP: carbon fibre in a polymer matrix; the fibre is usually 50–65 % of the volume. */
  cfrp: "https://en.wikipedia.org/wiki/Carbon-fiber_reinforced_polymer",
  /** Polyhydroxybutyrate: a thermoplastic polyester bacteria store as granules; used in bioplastics and composites. */
  phb: "https://en.wikipedia.org/wiki/Polyhydroxybutyrate",
} as const;
