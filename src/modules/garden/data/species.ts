import type { PlantSpecies } from "../domain/species";

const ASPCA = "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants";

/** Red romaine grown in NASA's Veggie unit on the ISS (VEG-01, eaten by the crew in 2015). */
export const LETTUCE_OUTREDGEOUS: PlantSpecies = {
  id: "lechuga-outredgeous",
  name: "Lechuga romana roja",
  cultivar: "Outredgeous",
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

export const SPECIES: readonly PlantSpecies[] = [LETTUCE_OUTREDGEOUS, CHILE_ESPANOLA];
