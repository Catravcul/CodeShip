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

export const SPECIES: readonly PlantSpecies[] = [
  LETTUCE_OUTREDGEOUS,
  CHILE_ESPANOLA,
  TOMATO_RED_ROBIN,
  RADISH_CHERRY_BELLE,
  POTATO_NORLAND,
  SOYBEAN_HOYT,
  WHEAT_APOGEE,
  CAT_GRASS,
];
