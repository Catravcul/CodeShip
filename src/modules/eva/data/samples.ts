import type { Sourced } from "@core/units";

const WIKI = "https://en.wikipedia.org/wiki/101955_Bennu";

/** What can be picked up on Bennu, from what OSIRIS-REx brought back (121.6 g in 2023). */
export interface RegolithSample {
  readonly id: string;
  readonly name: string;
  readonly finding: Sourced<string>;
}

/** Values and findings copied from the cited page on 2026-11-12. */
export const BENNU_SAMPLES: readonly RegolithSample[] = [
  {
    id: "filosilicatos",
    name: "Roca hidratada",
    finding: { value: "Arcillas ricas en magnesio (filosilicatos) que guardan agua en sus minerales", source: WIKI, note: "rich in hydrated minerals, especially Mg-rich phyllosilicates" },
  },
  {
    id: "carbonatos",
    name: "Grano oscuro",
    finding: { value: "Carbonatos, magnetita y sulfuros: el agua circuló por la roca madre de Bennu", source: WIKI, note: "carbonates, magnetite and sulfides among the other major components" },
  },
  {
    id: "fosfatos",
    name: "Costra blanca",
    finding: { value: "Fosfatos de magnesio y sodio en vetas y costras, un hallazgo inesperado", source: WIKI, note: "Mg- and Na-rich phosphates as veins and crusts" },
  },
  {
    id: "organicos",
    name: "Polvo fino",
    finding: {
      value: "Polvo con 14 de los 20 aminoácidos de las proteínas y las 5 nucleobases del ADN y el ARN",
      source: WIKI,
      note: "14 of 20 protein amino acids (mixed chirality) and all five nucleobases",
    },
  },
];

/** Grams she scoops per sample. Game value; for scale, OSIRIS-REx returned 121.6 g in total. */
export const SAMPLE_SCOOP_G = 30;
