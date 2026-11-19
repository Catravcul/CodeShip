import { fact } from "./sources";

/**
 * THE CROWDS OF THE BIOME (docs/design/bioma-s3.md §Multitudes): a real South Georgia colony has hundreds of gentoo
 * nests a metre apart, fur seal beaches packed with mothers and pups, tussac slopes closed by their canopies. The food
 * chain (domain/bioma.ts) lives one by one only a few dozen animals (the phone's budget); each of them stands for
 * `perAdult` more drawn around it, so the crowd grows, breeds, moults and empties with the chain's own numbers.
 *
 * Densities are real, from their source; the scale factors (`perAdult`), the places of the patches and the share
 * ashore by month (`ashore`) are ours (licencia), of the order the sources give.
 */

const ADW_GENTOO = "ADW, Pygoscelis papua (https://animaldiversity.org/accounts/Pygoscelis_papua/): «los nidos de papúa están a un metro unos de otros»; nidos de piedras de unos 45 cm de diámetro y 10–20 cm de alto; muda de 25 días tras irse los pollos";
const STANILAND = "Staniland et al. 2011, Mar Ecol Prog Ser 434: 183–196: 2789 crías de lobo marino en ~3,5 km de costa en Cooper Bay (≈ 80 crías por 100 m); 45 826 crías en Bird Island (Boyd 1993)";
const WIKI_FUR = "Wikipedia, Antarctic fur seal: los machos toman territorio en octubre-noviembre, las hembras llegan en diciembre y paren a los pocos días; destete a los cuatro meses; hasta 20 hembras por macho";
const WIKI_ELE = "Wikipedia, Southern elephant seal: harenes de «varias docenas» de hembras; en verano salen a tierra a mudar, a veces justo tras la cría; 113 000 hembras en Georgia del Sur";
const SMITH_CLYMO = "Lewis Smith y Clymo 1984, Nature 309: 617–620 (tussac de Beauchêne, Malvinas): 600–700 matas por hectárea, pedestales de turba de 1–1,5 m y copas de hasta 4,5 m; el 60 % de la isla, pradera cerrada de tussac";
const WIKI_WA = "Wikipedia, Wandering albatross: nidos de hierba y turba de 1 m de ancho en la base y 0,5 m arriba, en colonias sueltas; un huevo puesto del 10 dic al 5 ene, 11 semanas de incubación; Mackley et al. 2025 (ACAP): 1278 parejas en Georgia del Sur";
const WIKI_CP = "Wikipedia, Cape petrel: nidos de piedrecillas bajo una roca o en una grieta, un huevo en noviembre, 45 días de incubación, pollos que vuelan en marzo";

/** Real densities and nest sizes (each with its source). */
export const DENSITY = {
  gentooNestSpacingM: fact(1, "real", ADW_GENTOO),
  gentooNest: fact({ d: 0.45, h: 0.15 }, "real", ADW_GENTOO),
  furPupsPer100m: fact(80, "real", STANILAND),
  furFemalesPerBull: fact(20, "real", WIKI_FUR),
  elephantHarem: fact(40, "licencia", `${WIKI_ELE}; 40 es nuestro dentro de «varias docenas»`),
  tussacPerHa: fact(650, "real", SMITH_CLYMO),
  tussacCanopyM: fact(3.2, "licencia", `${SMITH_CLYMO}; copa de 3,2 m, nuestra, dentro de «hasta 4,5 m»`),
  albatrossNest: fact({ d: 1, h: 0.5 }, "real", WIKI_WA),
  petrelNest: fact("grieta", "real", WIKI_CP),
} as const;

/** How a crowd keeps its young: on a nest (eggs, then chicks), or by its mother (seal pups). */
export type NestKind = "piedras" | "barro" | "grieta";

export interface CrowdSpec {
  /** Species of the chain (data/bioma.ts). */
  readonly species: string;
  /** Drawn adults for each adult the chain lives (licencia: see `why`). */
  readonly perAdult: number;
  readonly why: string;
  /** Patches of the island (local m, before the presentation's scale) where they gather. */
  readonly patches: readonly { readonly x: number; readonly z: number; readonly r: number }[];
  /** Metres between two places, as drawn. */
  readonly spacingM: number;
  /** Share of the adults ashore by month (January first): the rest are at sea (licencia, from the calendar of `source`). */
  readonly ashore: readonly number[];
  readonly nest?: NestKind;
  readonly source: string;
}

/**
 * The five crowds. The scale factors are chosen so a full chain fills the patches at the real density: the gentoo
 * patches hold ~1000 nests a metre apart (22 chain adults × 50 ≈ 1100 birds), the beach ~170 pups and their mothers
 * at Cooper Bay's 80 pups per 100 m along ~180 m of shore, one harem of elephant seals, a loose colony of albatross
 * nests and a cliff of cape petrels.
 */
export const CROWDS: readonly CrowdSpec[] = [
  {
    species: "papua", perAdult: 50, why: "22 adultos de la cadena × 50 ≈ 1100 papúas: unos 550 nidos ocupados a 1 m, como una colonia de Georgia del Sur",
    patches: [{ x: 100, z: -4, r: 8 }, { x: 113, z: 9, r: 6 }, { x: 111, z: -18, r: 6 }, { x: 124, z: -4, r: 5 }],
    spacingM: 1.05, ashore: [1, 1, 1, 0.9, 0.7, 0.6, 0.6, 0.6, 0.7, 0.9, 1, 1], nest: "piedras", source: ADW_GENTOO,
  },
  {
    species: "lobo", perAdult: 30, why: "14 lobos de la cadena × 30 ≈ 420: en diciembre, unas 80 crías por 100 m (Cooper Bay) con sus madres y un macho por cada 20, en ~180 m de playa",
    // A band along the beach above the tide line: harems side by side.
    patches: [-36, -27, -18, -9, 0, 9, 18, 27, 36].map((x) => ({ x, z: -86 + Math.abs(x) * 0.1, r: 6 })),
    spacingM: 1.7, ashore: [1, 1, 0.9, 0.7, 0.3, 0.15, 0.1, 0.1, 0.15, 0.4, 0.8, 1], source: `${STANILAND}; ${WIKI_FUR}`,
  },
  {
    species: "elefante", perAdult: 8, why: "6 elefantes de la cadena × 8 ≈ 48: un harén de unas 40 hembras con su macho",
    patches: [{ x: 56, z: -76, r: 9 }],
    spacingM: 2.8, ashore: [0.9, 1, 0.8, 0.5, 0.15, 0.05, 0.05, 0.1, 0.7, 1, 0.9, 0.6], source: WIKI_ELE,
  },
  {
    species: "albatros", perAdult: 3, why: "4 albatros de la cadena × 3 = 12 nidos en colonia suelta por la ladera de tussac",
    patches: [{ x: -80, z: 5, r: 55 }],
    spacingM: 16, ashore: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], nest: "barro", source: WIKI_WA,
  },
  {
    species: "damero", perAdult: 6, why: "10 petreles de la cadena × 6 = 60 en las grietas de las rocas del norte",
    patches: [{ x: 62, z: 62, r: 11 }, { x: 40, z: 72, r: 8 }],
    spacingM: 1.6, ashore: [1, 1, 0.9, 0.4, 0.1, 0.05, 0.05, 0.1, 0.3, 0.7, 1, 1], nest: "grieta", source: WIKI_CP,
  },
];

/**
 * The moult: gentoos stay ashore 25 days after their chicks fledge (ADW, real); elephant seals moult ashore in summer
 * after the breeding (Wikipedia, real): the share moulting by month is ours (females first, January–February; males
 * after, to April).
 */
export const MOULT = {
  papua: fact({ days: 25 }, "real", ADW_GENTOO),
  elefante: fact([0.6, 0.8, 0.6, 0.3, 0, 0, 0, 0, 0, 0, 0, 0.1], "licencia", `${WIKI_ELE}; reparto por meses nuestro`),
} as const;
