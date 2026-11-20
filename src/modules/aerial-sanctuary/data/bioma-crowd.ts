import { fact } from "./sources";

/**
 * THE CROWDS OF THE BIOME (docs/design/bioma-s3.md §Multitudes): a Karakoram slope has ibex herds of a dozen or two on
 * its cliffs, markhor nannies with their kids in the gorge, marmot families at their burrows over the meadow, pikas
 * calling from every scree and a colony of griffons on the cliff ledges. The food chain (domain/bioma.ts) lives one by
 * one only a few dozen animals (the phone's budget); each of them stands for `perAdult` more drawn around it, so the
 * crowd grows, breeds, sleeps and empties with the chain's own numbers.
 *
 * Group sizes are real, from their source; the scale factors (`perAdult`), the places of the patches (local m of the
 * island, data/bioma-island.ts) and the share in view by month (`here`) are ours (licencia), of the order the sources give.
 */

const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const IBEX = `${WIKI("Siberian_ibex")}: «rebaños de 5 a 30 los más comunes, mucho mayores en el celo»; «los machos se alzan sobre las patas traseras y chocan los cuernos»`;
const MARKHOR = "ADW, Capra falconeri (https://animaldiversity.org/accounts/Capra_falconeri/): «las hembras van en rebaños de 8 a 9 de media»; los machos, solitarios, se les unen en el celo";
const BHARAL = `${WIKI("Bharal")}: en Nepal, grupos de hasta 10 en invierno, cuando bajan a los valles`;
const MARMOT = `${WIKI("Long-tailed_marmot")}: grupos familiares de hasta siete adultos en ~3 ha con unas tres madrigueras; hiberna de septiembre a abril o mayo`;
const PIKA = `${WIKI("Large-eared_pika")}: vive entre las grietas de las pedreras, sin madrigueras; algunas guardan heno para el invierno`;
const GRIFFON = `${WIKI("Himalayan_vulture")}: colonias de 5–7 parejas en repisas de un cantil; un huevo, 54–58 días; pone del 25 de diciembre al 7 de marzo`;
const SNOWCOCK = `${WIKI("Himalayan_snowcock")}: en bandadas pequeñas por las laderas de hierba y piedra de 4 000–5 000 m`;
const PIGEON = `${WIKI("Snow_pigeon")}: anida en colonias en grietas y cuevas de los cantiles; en invierno, bandadas de 150 o más`;
const CHOUGH = `${WIKI("Alpine_chough")}: siempre en bandadas; anida en grietas de los cantiles`;

/** Real group sizes and nest sites (each with its source). */
export const DENSITY = {
  ibexHerd: fact({ min: 5, max: 30 }, "real", IBEX),
  markhorHerd: fact(8.5, "real", MARKHOR),
  bharalGroup: fact(10, "real", BHARAL),
  marmotFamily: fact({ adults: 7, burrows: 3 }, "real", MARMOT),
  griffonColonyPairs: fact({ min: 5, max: 7 }, "real", GRIFFON),
  pigeonWinterFlock: fact(150, "real", PIGEON),
} as const;

/**
 * How a crowd keeps its young: in a burrow (marmots: the mounds stand all year), on a cliff ledge (a griffon's stick
 * nest), in a crevice of the rock (pigeons, choughs), on the ground (snowcock), or none (hoofed mothers' kids follow).
 */
export type NestKind = "madriguera" | "repisa" | "grieta" | "suelo";

export interface CrowdSpec {
  /** Species of the chain (data/bioma.ts). */
  readonly species: string;
  /** Drawn adults for each adult the chain lives (licencia: see `why`). */
  readonly perAdult: number;
  readonly why: string;
  /** Patches of the island (local m) where they gather. */
  readonly patches: readonly { readonly x: number; readonly z: number; readonly r: number }[];
  /** Metres between two places, as drawn. */
  readonly spacingM: number;
  /** Share of the adults in view by month (January first), the rest off feeding elsewhere (licencia). */
  readonly here: readonly number[];
  readonly nest?: NestKind;
  /** Where on the ground it stands: anywhere, or only on steep rock (cliff dwellers). */
  readonly footing?: "roca";
  readonly source: string;
}

const ALL_YEAR = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as const;

/**
 * The crowds. The scale factors are chosen so a full chain shows groups of the real size: ibex herds of ~15 on the
 * cliff ring, markhor nannies of 8–9 in the gorge, bharal groups of ~10 on the meadow, marmot families of ~7 at their
 * burrows, the pikas of two screes, a griffon colony of ~6 pairs, a snowcock covey, the pigeons' and the choughs' flocks.
 */
export const CROWDS: readonly CrowdSpec[] = [
  {
    species: "ibice", perAdult: 2, why: "14 íbices de la cadena × 2 ≈ 28: dos rebaños de ~14, dentro de los 5–30 reales",
    patches: [{ x: 80, z: -20, r: 26 }, { x: 260, z: 30, r: 26 }],
    spacingM: 3.2, here: ALL_YEAR, footing: "roca", source: IBEX,
  },
  {
    species: "markhor", perAdult: 1.6, why: "10 markhores × 1,6 = 16: dos rebaños de 8 hembras con sus crías en las paredes de la garganta",
    patches: [{ x: -320, z: 120, r: 22 }, { x: -470, z: 120, r: 22 }],
    spacingM: 3.4, here: ALL_YEAR, footing: "roca", source: MARKHOR,
  },
  {
    species: "bharal", perAdult: 1.5, why: "14 bharales × 1,5 ≈ 20: dos grupos de ~10 en la pradera alta",
    patches: [{ x: 330, z: -60, r: 22 }, { x: 230, z: -170, r: 20 }],
    spacingM: 3, here: ALL_YEAR, source: BHARAL,
  },
  {
    species: "marmota", perAdult: 2.5, why: "14 marmotas × 2,5 = 35: cinco familias de ~7 con sus madrigueras en la pradera",
    patches: [{ x: 280, z: -130, r: 12 }, { x: 315, z: -175, r: 12 }, { x: 245, z: -150, r: 11 }, { x: 340, z: -110, r: 11 }, { x: 300, z: -95, r: 10 }],
    spacingM: 3, here: ALL_YEAR, nest: "madriguera", source: MARMOT,
  },
  {
    species: "pika", perAdult: 2, why: "16 pikas × 2 = 32 por la pedrera, cada una en su grieta",
    patches: [{ x: 190, z: -84, r: 18 }, { x: 160, z: -62, r: 14 }],
    spacingM: 2.6, here: ALL_YEAR, source: PIKA,
  },
  {
    species: "buitre", perAdult: 2, why: "6 buitres × 2 = 12: una colonia de 6 parejas en las repisas del farallón",
    patches: [{ x: 115, z: -20, r: 14 }],
    spacingM: 4, here: ALL_YEAR, nest: "repisa", footing: "roca", source: GRIFFON,
  },
  {
    species: "perdiz", perAdult: 1.5, why: "8 perdices × 1,5 = 12: un bando en el collado",
    patches: [{ x: 312, z: 72, r: 20 }],
    spacingM: 2.5, here: ALL_YEAR, nest: "suelo", source: SNOWCOCK,
  },
  {
    species: "paloma", perAdult: 4, why: "12 palomas × 4 = 48: la colonia de la garganta (en invierno las bandadas pasan de 150)",
    patches: [{ x: -560, z: 95, r: 16 }],
    spacingM: 1.6, here: ALL_YEAR, nest: "grieta", footing: "roca", source: PIGEON,
  },
  {
    species: "chova", perAdult: 3, why: "12 chovas × 3 = 36 en la bandada del farallón",
    patches: [{ x: 150, z: -30, r: 16 }],
    spacingM: 2, here: ALL_YEAR, nest: "grieta", footing: "roca", source: CHOUGH,
  },
];
