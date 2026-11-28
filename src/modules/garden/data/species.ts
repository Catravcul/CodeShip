import type { PlantSpecies } from "../domain/species";

const ASPCA = "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants";
const BPC = "https://ntrs.nasa.gov/api/citations/20140017323/downloads/20140017323.pdf";
const BPC_NOTE = "NASA Biomass Production Chamber (Wheeler): crops grown hydroponically (NFT) under electric lights.";

/** Red romaine grown in NASA's Veggie unit on the ISS (VEG-01, eaten by the crew in 2015). */
export const LETTUCE_OUTREDGEOUS: PlantSpecies = {
  id: "lechuga-outredgeous",
  name: "Lechuga romana roja",
  cultivar: "Outredgeous",
  form: "hoja",
  color: 0x8c2a3c,
  harvestDays: {
    value: [33],
    source: "https://ntrs.nasa.gov/citations/20190028955",
    note: "Single terminal harvest after 33 days; cut-and-come-again harvesting reached 64 days of growth.",
  },
  needsShaking: { value: false, source: "https://www.scientificamerican.com/article/astronauts-take-first-bites-of-lettuce-grown-in-space/" },
  toxicToCats: { value: "unknown", source: ASPCA, note: "No lettuce entry in the ASPCA toxic/non-toxic plant list." },
};

/** Hatch chile grown in the ISS Advanced Plant Habitat (PH-04, 2021). */
export const CHILE_ESPANOLA: PlantSpecies = {
  id: "chile-espanola",
  name: "Chile",
  cultivar: "Española Improved",
  form: "fruto",
  color: 0x3f8a3a,
  harvestDays: {
    value: [100, 120],
    source: "https://www.nasa.gov/sites/default/files/atoms/files/plant_habitat-04.pdf",
    note: "Growing time 120 days with harvests on days 100 and 120.",
  },
  needsShaking: {
    value: true,
    source: "https://www.nasa.gov/sites/default/files/atoms/files/plant_habitat-04.pdf",
    note: "Self-pollinating: fruit only requires agitating the plants.",
  },
  toxicToCats: { value: "unknown", source: ASPCA, note: "No Capsicum entry found in the ASPCA list." },
};

/** Dwarf tomato grown in Veggie on the ISS (VEG-05, 2023). */
export const TOMATO_RED_ROBIN: PlantSpecies = {
  id: "tomate-red-robin",
  name: "Tomate enano",
  cultivar: "Red Robin",
  form: "fruto",
  color: 0x4a8f3c,
  harvestDays: {
    value: [83, 90, 100],
    source: "https://ntrs.nasa.gov/citations/20240001505",
    note: "VEG-05: fruit harvested at days 83, 90 and 100 after planting.",
  },
  needsShaking: {
    value: true,
    source: "https://ntrs.nasa.gov/citations/20210026897",
    note: "Tomato flowers release pollen when vibrated; VEG-05 planned crew pollination procedures.",
  },
  toxicToCats: { value: "toxic", source: ASPCA, note: "ASPCA lists the tomato plant (leaves and green parts) as toxic to cats." },
};

/** Radish grown in the ISS Advanced Plant Habitat (PH-02, harvested 30 Nov 2020). */
export const RADISH_CHERRY_BELLE: PlantSpecies = {
  id: "rabano-cherry-belle",
  name: "Rábano",
  cultivar: "Cherry Belle",
  form: "raiz",
  color: 0x5c9a40,
  harvestDays: {
    value: [27],
    source: "https://astrobiology.com/2020/12/03/astronauts-harvest-first-radish-crop-on-international-space-station/",
    note: "PH-02 radishes reach maturity in 27 days.",
  },
  needsShaking: { value: false, source: "https://astrobiology.com/2020/12/03/astronauts-harvest-first-radish-crop-on-international-space-station/", note: "Root crop: no fruit." },
  toxicToCats: { value: "unknown", source: ASPCA },
};

export const POTATO_NORLAND: PlantSpecies = {
  id: "papa-norland",
  name: "Papa",
  cultivar: "Norland",
  form: "raiz",
  color: 0x3d7a34,
  harvestDays: { value: [91], source: BPC, note: `${BPC_NOTE} Potatoes were harvested at 91 or 105 days.` },
  needsShaking: { value: false, source: BPC, note: "Tubers: no pollination needed." },
  toxicToCats: { value: "toxic", source: ASPCA, note: "ASPCA lists the potato plant as toxic to cats (solanine in green parts)." },
};

export const SOYBEAN_HOYT: PlantSpecies = {
  id: "soja-hoyt",
  name: "Soja",
  cultivar: "Hoyt",
  form: "grano",
  color: 0x6a9c3a,
  harvestDays: { value: [90], source: BPC, note: `${BPC_NOTE} Soybean was harvested at 90 or 97 days.` },
  needsShaking: { value: false, source: BPC, note: "Soybean flowers self-pollinate before they open." },
  toxicToCats: { value: "unknown", source: ASPCA },
};

export const WHEAT_APOGEE: PlantSpecies = {
  id: "trigo-apogee",
  name: "Trigo",
  cultivar: "Apogee",
  form: "grano",
  color: 0x8fae4a,
  harvestDays: { value: [77], source: BPC, note: `${BPC_NOTE} Wheat was harvested at maturity, 77–86 days.` },
  needsShaking: { value: false, source: BPC, note: "Wind-free chamber: wheat self-pollinates inside the floret." },
  toxicToCats: { value: "unknown", source: ASPCA },
};

/** Oat sprouts for the cats. Plant eating is normal in cats: 65 % ate plants weekly (Hart et al. 2021). */
export const CAT_GRASS: PlantSpecies = {
  id: "hierba-gatos",
  name: "Hierba para gatos",
  cultivar: "Avena sativa (brotes)",
  form: "hierba",
  color: 0x5fbf4a,
  forCats: true,
  harvestDays: {
    value: [10],
    source: "https://escholarship.org/content/qt8x40j557/qt8x40j557.pdf",
    note: "Game tuning: ready to chew after ~10 days (typical for oat-grass kits). The source is for cats eating plants, not for the days.",
  },
  needsShaking: { value: false, source: "https://escholarship.org/content/qt8x40j557/qt8x40j557.pdf" },
  toxicToCats: { value: "non-toxic", source: "https://escholarship.org/content/qt8x40j557/qt8x40j557.pdf", note: "Grown to be eaten by cats." },
};

/** Peanut grown hydroponically (NFT) at Tuskegee University for NASA's life-support program. */
const PEANUT_NFT = "https://journals.ashs.org/downloadpdf/view/journals/hortsci/35/1/article-p46.pdf";
export const PEANUT_GEORGIA_RED: PlantSpecies = {
  id: "cacahuete-georgia-red",
  name: "Cacahuete",
  cultivar: "Georgia Red",
  form: "hoja",
  color: 0x4f8d34,
  harvestDays: {
    value: [110],
    source: PEANUT_NFT,
    note: "Mortley et al. 2000, HortScience 35(1):46–48 (doi:10.21273/HORTSCI.35.1.46): harvested 110 d after transplanting (124 d from seeding).",
  },
  needsShaking: {
    value: false,
    source: PEANUT_NFT,
    note: "Flowers self-pollinate; the gynophores (pegs) grow down into the medium, where the pods form.",
  },
  toxicToCats: { value: "unknown", source: ASPCA, note: "No peanut (Arachis) entry in the ASPCA list." },
  edibleYield: {
    value: { gPerM2: 588, portionG: 50 },
    source: PEANUT_NFT,
    note: "Total seed dry weight 588 g/m² at 85 % RH (427 g/m² at 50 %). Raw kernels are ~6.5 % water (USDA), so dry ≈ edible. Portion 50 g: game value (USDA serving is 28 g).",
  },
};

/** Day-neutral strawberry chosen at Purdue (NASA NSCORT) as a low-maintenance crop for long missions. */
const STRAWBERRY_PURDUE = "https://ashs.confex.com/ashs/2010/webprogram/Paper4007.html";
export const STRAWBERRY_SEASCAPE: PlantSpecies = {
  id: "fresa-seascape",
  name: "Fresa",
  cultivar: "Seascape",
  form: "fruto",
  color: 0x3f8f3a,
  fruitColor: 0xd8203a,
  harvestDays: {
    value: [65, 100, 135, 170, 205, 240, 275],
    source: STRAWBERRY_PURDUE,
    note: "Massa & Mitchell (Purdue): fruit collection began 65 d after planting and plants were grown 282 d (also https://www.purdue.edu/newsroom/research/2010/100503MitchellStrawberrie.html). One pick every 35 d is game tuning.",
  },
  needsShaking: {
    value: true,
    source: "https://extension.umn.edu/agriculture/specialty-crops/commercial-fruit-production/strawberry-farming/small-or-misshapen-strawberries",
    note: "Self-pollination alone does not pollinate all ovules; there are no bees on board, so the flowers are shaken. Game simplification: unshaken flowers give no fruit.",
  },
  toxicToCats: { value: "non-toxic", source: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/strawberry" },
  edibleYield: {
    value: { gPerM2: 990, portionG: 150 },
    source: "https://projects.sare.org/project-reports/lne06-241/",
    note: "SARE LNE06-241: Seascape 0.59 lb (268 g) marketable per plant in its worst year (about half its average), at 15,000 plants/acre → ≈ 990 g/m² per season. Conservative. Portion 150 g ≈ 1 cup (USDA).",
  },
};

/**
 * Fig trees in planters. Dwarf fruit trees are being studied for space (NASA KSC's dwarf PtFT1 plum,
 * https://ntrs.nasa.gov/citations/20170011641) but have no yield data yet, so the farm deck grows
 * figs, whose greenhouse yield in pots is measured.
 */
const FIG_POTS = "https://www.cambridge.org/core/journals/experimental-agriculture/article/abs/intensive-production-systems-of-fig-ficus-carica-l-under-greenhouse-conditions/E508363F501D2011BBFCA6FA023386EE";
export const FIG_TREE: PlantSpecies = {
  id: "higo",
  name: "Higuera",
  cultivar: "Ficus carica (higo común, en maceta)",
  form: "arbol",
  color: 0x3c7a30,
  fruitColor: 0x5b2a4a,
  harvestDays: {
    value: [120, 160, 200, 240, 280],
    source: "https://www.freshfruitportal.com/news/2019/01/14/mexico-pioneering-project-uses-greenhouses-new-growing-methods-to-triple-fig-yields/",
    note: "Greenhouse figs with heavy pruning fruit about 4 months after planting; the potted-fig trial ran Nov 2010–Sep 2011 (~300 d). One pick every 40 d is game tuning.",
  },
  needsShaking: {
    value: false,
    source: "https://en.wikipedia.org/wiki/Common_fig",
    note: "Persistent ('common') figs do not need pollination: the fruit develops by parthenocarpy.",
  },
  toxicToCats: {
    value: "toxic",
    source: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/fig",
    note: "ASPCA lists Ficus as toxic to cats (ficin and psoralen: stomach and skin irritation). Keep the cats off the planters.",
  },
  edibleYield: {
    value: { gPerM2: 7860, portionG: 100 },
    source: FIG_POTS,
    note: "Mendoza-Castillo et al. 2017, Exp. Agric. 53(3):339–350 (doi:10.1017/S0014479716000405): hydroponic potted figs at 1.25 plants/m², 78.6 t/ha with six productive stems (109.5 t/ha with eight). Portion 100 g = two figs.",
  },
  areaPerPlantM2: { value: 0.8, source: FIG_POTS, note: "1.25 plants per m²." },
};

export const SPECIES: readonly PlantSpecies[] = [
  LETTUCE_OUTREDGEOUS,
  CHILE_ESPANOLA,
  TOMATO_RED_ROBIN,
  RADISH_CHERRY_BELLE,
  POTATO_NORLAND,
  SOYBEAN_HOYT,
  WHEAT_APOGEE,
  PEANUT_GEORGIA_RED,
  STRAWBERRY_SEASCAPE,
  FIG_TREE,
  CAT_GRASS,
];
