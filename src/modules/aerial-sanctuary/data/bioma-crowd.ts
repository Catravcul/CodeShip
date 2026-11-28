import { fact } from "./sources";

/**
 * THE COLONIES OF THE BIOME (docs/design/bioma-s3.md §Colonias): the social insects live as colonies. The food chain
 * (domain/bioma.ts) lives each colony by its reproductive (the honeybee's and the ant's queen; the bumblebee's and the
 * hornet's queen that founds it each spring), so the rule of animals per person counts colonies, as sanctuary 1 counts
 * animals; each colony is drawn with `perAdult` of its workers about its nest (the hive in a rock cavity, the
 * bumblebee's nest in an old burrow, the hornet's paper nest in a tree, the ants' mound of needles). The workers work
 * and sleep with their colony: none are seen while it overwinters.
 *
 * Colony sizes are real, from their source; the workers drawn (`perAdult`), the places of the nests (local m of the
 * island, data/bioma-island.ts) and the share in view by month (`here`) are ours (licencia): a real colony is thousands.
 */

const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const CERANA = `${WIKI("Apis_cerana")}: anida en cavidades (huecos de árboles y rocas) con varios panales paralelos; colonias más pequeñas que las de A. mellifera; Oldroyd y Wongsiri 2006 (unas 6 000–7 000 obreras)`;
const BOMBUS = `${WIKI("Bumblebee")}: colonias anuales de 50 a 400 obreras, a menudo en madrigueras viejas de roedores`;
const VESPA = `${WIKI("Asian_hornet")}: nidos de papel en los árboles, de hasta miles de obreras al final del verano`;
const FORMICA = `${WIKI("Formica")}: hormigueros en montículos de agujas y ramitas, con miles de obreras`;

/** Real colony sizes (each with its source). */
export const DENSITY = {
  ceranaWorkers: fact({ min: 6000, max: 7000 }, "real", CERANA),
  bombusWorkers: fact({ min: 50, max: 400 }, "real", BOMBUS),
  hornetWorkers: fact(1000, "real", VESPA),
  antWorkers: fact(1000, "real", FORMICA),
} as const;

/** Where a colony lives: a hive in a cavity, a nest (in the ground or a tree), an ant mound. */
export type NestKind = "colmena" | "nido" | "hormiguero";

export interface CrowdSpec {
  /** Species of the chain (data/bioma.ts). */
  readonly species: string;
  /** Workers drawn for each colony the chain lives (licencia: see `why`). */
  readonly perAdult: number;
  readonly why: string;
  /** Patches of the island (local m) where the nests are. */
  readonly patches: readonly { readonly x: number; readonly z: number; readonly r: number }[];
  /** Metres between two nests, as drawn. */
  readonly spacingM: number;
  /** Share of the workers in view by month (January first), the rest inside (licencia). */
  readonly here: readonly number[];
  readonly nest: NestKind;
  /** The nest stands all year (a hive, a mound) or only while the colony lives (a bumblebee's, a hornet's). */
  readonly perennial: boolean;
  /** Where on the ground it stands: anywhere, or only on steep rock. */
  readonly footing?: "roca";
  readonly source: string;
}

/** Out foraging by month: few in winter, all in summer (ours, from the Gilgit climate). */
const SEASON = [0.2, 0.3, 0.6, 0.9, 1, 1, 1, 1, 1, 0.8, 0.5, 0.3] as const;

export const CROWDS: readonly CrowdSpec[] = [
  {
    species: "abeja", perAdult: 8, why: "cada colmena de la cadena con 8 obreras a la vista: de sus 6 000–7 000, las que pecorean junto a la piedra",
    patches: [{ x: 40, z: -500, r: 30 }],
    spacingM: 14, here: SEASON, nest: "colmena", perennial: true, source: CERANA,
  },
  {
    species: "abejorro", perAdult: 4, why: "cada reina con 4 obreras: sus colonias son de 50–400",
    patches: [{ x: 290, z: -150, r: 40 }],
    spacingM: 18, here: SEASON, nest: "nido", perennial: false, source: BOMBUS,
  },
  {
    species: "avispon", perAdult: 5, why: "cada nido de papel con 5 obreras a la vista",
    patches: [{ x: -20, z: -250, r: 30 }],
    spacingM: 24, here: SEASON, nest: "nido", perennial: false, source: VESPA,
  },
  {
    species: "hormiga", perAdult: 10, why: "cada hormiguero con 10 obreras fuera: ordeñan pulgones y cazan",
    patches: [{ x: -330, z: -200, r: 40 }],
    spacingM: 20, here: SEASON, nest: "hormiguero", perennial: true, source: FORMICA,
  },
];
