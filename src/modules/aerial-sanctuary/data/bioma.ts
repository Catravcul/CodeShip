import type { Reality } from "@core/reality";
import { allocate, ANIMALS_PER_HUMAN, type PopulationTable, type Trophic } from "@modules/fauna/domain/population";
import { fact } from "./sources";
import { TRAINERS } from "./trainers";
import { CARBON_ANIMALS, CARBON_CLIMATE, CARBON_SCALE, CARBON_SPECIES } from "./carbonifero";

/**
 * THE BIOME of sanctuary 3: the AIR and the HEIGHTS (Berón, 2026-11-20: «sanctuary3 debe ser más aéreo»;
 * docs/design/bioma-s3.md). One real region, so every species truly lives with the others: the Hunza–Nagar valleys of
 * the Karakoram (Gilgit-Baltistan, Pakistan), from the valley floor to Khunjerab. Since 2026-11-25 its fauna is GIANT
 * INSECTS (Berón: «el aire está más poblado por insectos que animales … cambiaríamos la fauna por insectos gigantes …
 * tomando de referencia a un mosquito de la fruta, dicho mosquito medirá 1 m»): bees and bumblebees, the Apollo
 * butterfly, the locust and the fruit fly; ladybirds, lacewings, hoverflies, ants and robber flies; the dragonfly, the
 * mantis and the hornet on top; burying and dung beetles and springtails to recycle; the high jumping spider (an
 * arachnid) closes the chain where no insect hunts. Recorded in the region where the source says so (Hunza's
 * butterflies, Baltistan's grasshoppers, Gilgit's bumblebee); a genus or family where it does not (said in `ours`).
 * The plants are the altitude belts of the Batura valley (Eberhardt, Dickoré y Miehe 2007) and Rakaposhi's forests.
 *
 * Every species carries ONE source for its numbers (all `real` unless the species' `ours` names the field: then that
 * number is `licencia`, a value of ours of the right order, and the note says why). Ages are real days of biology; the
 * game compresses the calendar (domain/bioma.ts, `BIO_DAYS_PER_GAME_DAY`).
 *
 * The food chain (domain/bioma.ts) takes any such set as data (`BiomeDef`): this file is the air biome's.
 */

export type Stage = "cria" | "joven" | "adulto" | "anciano";
/** The zone of the island it lives in (data/bioma-island.ts `ZONES`), or the air. */
export type Habitat = string;
export type BodyShape = "cuadrupedo" | "ave" | "pajaro" | "insecto" | "miriapodo";

/** What a consumer eats: a food (species id or remains) and, for animals, which of its stages. `pref` weighs it. */
export interface Food {
  readonly food: string;
  readonly pref?: number;
  readonly stages?: readonly Stage[];
}

interface Base {
  readonly id: string;
  readonly name: string;
  readonly latin: string;
  readonly habitat: Habitat;
  /** The source of every number of the species. */
  readonly source: string;
  /** Fields that are ours (licencia), with why. Any field not here is real, from `source`. */
  readonly ours?: Readonly<Record<string, string>>;
}

/** A plant (or what the wind brings): biomass that grows with the light and the warmth of the season and is grazed. */
export interface PlantSpec extends Base {
  readonly kind: "planta";
  /** Annual production over the standing crop at half the cover (P/B, per year). */
  readonly perYear: number;
  /** The most it covers in the biome (kg fresh mass). */
  readonly stockKg: number;
  /** No growth under this mean temperature (°C). */
  readonly minTempC: number;
  /** The real altitude it grows at (m): its temperature is the station's less the lapse rate. */
  readonly altitudeM?: number;
  /** Grows on the sea's temperature (Eppley's curve) instead of the air's: phytoplankton. */
  readonly plankton?: boolean;
  readonly sea?: boolean;
  /** Grows faster where animals leave their dung. */
  readonly guano?: boolean;
  /** Habitat for young fish (kelp forests as nurseries): lowers what is eaten of the young of the swarms of its habitat. */
  readonly nursery?: boolean;
  /** Its seeds fly on the wind (a pappus or a wing): drawn drifting in the summer (the scene). */
  readonly windSeeds?: boolean;
}

/** Many small animals (insects, spiders, mice): counted by yearly cohorts, not one by one. */
export interface SwarmSpec extends Base {
  readonly kind: "banco";
  readonly trophic: 1 | 2 | 3 | 4;
  readonly adultMassKg: number;
  readonly maxAgeYears: number;
  readonly matureYears: number;
  /** Breeding: first month (1 = January) and how many months. */
  readonly spawnMonth: number;
  readonly spawnMonths: number;
  /** Annual production over biomass (P/B): how fast the population renews. */
  readonly perYear: number;
  /** Natural mortality (per year), besides being eaten or starving. */
  readonly mortality: number;
  /** What it eats a day, over its own mass. */
  readonly intakePerDay: number;
  readonly diet: readonly Food[];
  /** Standing stock in the biome at the start (kg); the food chain raises it if its eaters need more. */
  readonly stockKg: number;
  /** Its recruitment changes a lot from one year to the next (good and bad years), and its eaters switch away. */
  readonly variable?: boolean;
  /** How it is counted in the census: «individuos», «ratones»… */
  readonly unit?: string;
}

/** A vertebrate lived one by one: born, grows, breeds by its calendar, hunts or flees, and dies. */
export interface AnimalSpec extends Base {
  readonly kind: "animal";
  readonly trophic: 2 | 3 | 4;
  readonly shape: BodyShape;
  /** The adult female's mass (kg) and size (m: x across, y up, z long; a bird's x is its wingspan). */
  readonly massKg: number;
  readonly size: { readonly x: number; readonly y: number; readonly z: number };
  /** The male over the female (size). */
  readonly male: number;
  readonly color: number;
  /** Food a day (kg fresh mass). */
  readonly intakeKgDay: number;
  readonly diet: readonly Food[];
  /** The life cycle (Cold Sanctuary's StageProfile + Reproduction.Calendar; fauna/domain/life-cycle.ts): days of each stage. */
  readonly childDays: number;
  readonly teenDays: number;
  readonly adultDays: number;
  readonly birthSize: number;
  readonly gestationMonths: number;
  readonly intervalMonths: number;
  /** Month the young hatch or are born (1 = January). */
  readonly birthMonth: number;
  /** Young per brood. */
  readonly young: number;
  /** Yearly survival of adults (all causes); the model keeps half as «other causes»: eating and old age do the rest. */
  readonly survival: number;
  /** Days it can go without food. */
  readonly fastDays: number;
  /** Starting individuals and the most kept (mobile budget; more leave as young: natal dispersal). */
  readonly start: number;
  readonly cap: number;
  /**
   * Present only in some months (1 = January): from each window's `arrive` to before its `leave`. `breeds`: it breeds
   * here while present (a summer visitor); otherwise it only passes (a migrant on passage). `from`: where it is the
   * rest of the year, in words.
   */
  readonly visitor?: { readonly windows: readonly { readonly arrive: number; readonly leave: number }[]; readonly count: number; readonly breeds?: boolean; readonly from: string };
  /** Asleep underground (hibernation) from month `from` for `months`: it neither eats nor is seen. */
  readonly dormant?: { readonly from: number; readonly months: number };
  /** Share of its food it finds beyond the island (wide-ranging hunters and scavengers): only the rest is asked of the island. */
  readonly away?: number;
  /** Chance a hunt of this predator ends in a catch. */
  readonly huntSuccess?: number;
  // Insects (sanctuary 3's giant insects): optional, a vertebrate has none of them.
  /** Its first days are an egg: it neither eats nor moves nor is hunted (an insect's egg, a mantis's ootheca). */
  readonly eggDays?: number;
  /** Its «joven» stage is a pupa (complete metamorphosis): it neither eats nor moves nor is hunted. */
  readonly pupa?: boolean;
  /** Its young are nymphs: the adult's shape without wings (incomplete metamorphosis: locusts, dragonflies, mantises). */
  readonly nymph?: boolean;
  /** Its young feed by themselves (or the colony feeds them): no mother carries their food, none dies for losing her. */
  readonly selfFed?: boolean;
  /** All of a generation are born together in its laying month (one generation a year): day 0 finds them at their age of the year, not spread over a lifetime. */
  readonly annual?: boolean;
  /** Its young live out of sight (in the soil, in dung, a carcass's crypt, the river's water). */
  readonly hiddenYoung?: boolean;
  /** A social insect: each one of the chain is a colony, drawn with its workers about its nest (bioma-crowd.ts). */
  readonly social?: "colmena" | "nido" | "hormiguero";
}

export type BiomeSpec = PlantSpec | SwarmSpec | AnimalSpec;

/** What is left of a body: carrion (meat, rots in days) or bones (last months). */
export interface RemainsSpec {
  readonly id: string;
  readonly name: string;
  /** Share of a body that becomes this when it dies of other causes, and when a hunter ate it. */
  readonly share: number;
  readonly shareKilled: number;
  readonly rotPerDay: number;
  /** Kg a day that come from beyond the island (carcasses of the wider range), if any. */
  readonly inflowKgDay?: number;
  readonly source: string;
  readonly reality: Reality;
}

export interface ClimateSpec {
  readonly latitude: number;
  /** The station's altitude (m) and its mean air temperature by month (°C, January first). */
  readonly stationM: number;
  readonly airC: readonly number[];
  /** The sea's, for marine plants (°C by month), if any. */
  readonly seaC?: readonly number[];
  readonly source: string;
  readonly reality: { readonly airC: Reality; readonly seaC?: Reality };
}

/** A whole biome as data: the food chain lives any of them. */
export interface BiomeDef {
  readonly id: string;
  readonly name: string;
  readonly species: readonly BiomeSpec[];
  readonly remains: readonly RemainsSpec[];
  readonly climate: ClimateSpec;
  /** Day 0 of the island (0-based day of the year). */
  readonly startDayOfYear: number;
  /** Where a starving grown animal goes in words («a otra parte del valle»). */
  readonly elsewhere: string;
  /** Its animals are drawn this many times their real size (sanctuary 3's giant insects: `INSECT_SCALE`); 1 if none. */
  readonly drawScale?: number;
}

const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const BATURA = "Eberhardt, Dickoré y Miehe 2007, «Vegetation map of the Batura Valley (Hunza Karakorum, North Pakistan)», Erdkunde 61(1): 93–112, doi:10.3112/erdkunde.2007.01.06 (cinturones: submontano hasta ~2 700 m, montano 2 600–3 900, subalpino 3 500–4 400, alpino 3 900–4 600, subnival desde 4 600; plantas vasculares hasta 5 000–5 200 m)";
const OURS_SURV = "supervivencia anual del orden publicado para su grupo; sin serie propia de esta especie";
const OURS_FAST = "días de ayuno del orden de su grupo: nuestro (los que pasan el invierno de adultos viven de su grasa semanas)";
const OURS_CAP_S3 = "la regla de animales por persona (S3_POPULATION): cada santuario tantos como personas × el ajuste; aquí, los de 4 por persona";
const OURS_AWAY = "cuánto caza o come fuera de la isla: nuestro, del tamaño de su territorio real frente a la isla (~1,9 km²)";

/** The altitude belts of the Karakoram (Batura valley): real, from Eberhardt et al. 2007; boundaries between overlaps, ours. */
export const BELT_ALTITUDES = {
  submontano: 2400,
  montano: 2700,
  subalpino: 3500,
  alpino: 3900,
  subnival: 4600,
  nival: 5200,
} as const;

export const SPECIES: readonly BiomeSpec[] = [
  // ── Producers, by belt ───────────────────────────────────────────────────────────────────────────────────────────
  {
    kind: "planta", id: "artemisa", name: "Estepa de artemisa", latin: "Artemisia brevifolia, Stipa himalaica, Ephedra intermedia", habitat: "estepa",
    perYear: 0.6, stockKg: 60_000, minTempC: 3, altitudeM: 2600, windSeeds: true,
    source: `${BATURA}: matorral enano de Artemisia fragrans–Ephedra intermedia hasta ~2 700 m y estepa de Artemisia brevifolia–Stipa himalaica en el cinturón montano`,
    ours: { perYear: "productividad de estepa árida, nuestra", stockKg: "matas sobre las laderas bajas", minTempC: "umbral nuestro del crecimiento" },
  },
  {
    kind: "planta", id: "espino", name: "Espino amarillo", latin: "Hippophae rhamnoides subsp. turkestanica", habitat: "rio",
    perYear: 0.5, stockKg: 8_000, minTempC: 4, altitudeM: 2450,
    source: `${BATURA}: matorrales de Hippophae rhamnoides subsp. turkestanica en el fondo del valle y a lo largo del río Hunza; ${WIKI("Hippophae_rhamnoides")} (bayas naranjas que comen aves y mamíferos)`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "pino", name: "Bosque de pino azul", latin: "Pinus wallichiana, Picea smithiana", habitat: "bosque",
    perYear: 0.06, stockKg: 900_000, minTempC: 3, altitudeM: 3100, windSeeds: true,
    source: `${WIKI("Pinus_wallichiana")} (Himalaya, Karakórum e Hindu Kush, 1 800–4 300 m; agujas de 12–18 cm en grupos de cinco; semillas con un ala de 20–30 mm); ${BATURA} (el bosque húmedo de Pinus wallichiana y Picea smithiana, en Rakaposhi, al otro lado del valle)`,
    ours: { perYear: "renovación de agujas y madera de un bosque de montaña, nuestra", stockKg: "biomasa de ~20 ha de bosque, nuestra", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "abedul", name: "Abedul y sauce del límite del bosque", latin: "Betula jacquemontii, Salix karelinii", habitat: "enebral",
    perYear: 0.12, stockKg: 120_000, minTempC: 2, altitudeM: 3800, windSeeds: true,
    source: `${BATURA}: Betula jacquemontii con Salix hasta ~4 150 m, krummholz de Salix karelinii; ${WIKI("Betula_utilis")} (crece doblado por la nieve)`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "enebro", name: "Enebral", latin: "Juniperus semiglobosa, J. turkestanica", habitat: "enebral",
    perYear: 0.05, stockKg: 150_000, minTempC: 2, altitudeM: 3700,
    source: `${BATURA}: matorral de Juniperus semiglobosa de 2–3 m y bosque estepario de J. semiglobosa–J. turkestanica en el subalpino (3 500–4 400 m); sus gálbulas las comen aves en invierno`,
    ours: { perYear: "crecimiento lento de los enebros, nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "pradera", name: "Pradera alpina", latin: "Kobresia humilis, Poa, Festuca", habitat: "pradera",
    perYear: 1.0, stockKg: 70_000, minTempC: 1, altitudeM: 4150,
    source: `${BATURA}: césped y pradera alpina entre 3 900 y 4 600 m, céspedes de Kobresia humilis desde 3 840 m`,
    ours: { perYear: "productividad de pradera alpina, nuestra", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "cojines", name: "Plantas en cojín", latin: "Bistorta affinis, Potentilla venusta, Sibbaldia cuneata", habitat: "pradera",
    perYear: 0.4, stockKg: 20_000, minTempC: 0, altitudeM: 4450,
    source: `${BATURA}: césped en cojín de Bistorta affinis–Potentilla venusta en el alpino alto; ${WIKI("Himalayan_snowcock")} (en Hunza las perdices nivales preferían Sibbaldia cuneata)`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "amapola", name: "Amapola azul", latin: "Meconopsis aculeata", habitat: "pedrera",
    perYear: 0.8, stockKg: 600, minTempC: 1, altitudeM: 4100, windSeeds: true,
    source: `${WIKI("Meconopsis_aculeata")} (amapola azul espinosa del Himalaya occidental, solo en Pakistán e India; recolectada por la medicina amchi)`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro", altitudeM: "altitud nuestra: la página no la da", windSeeds: "semilla pequeña que dispersa el viento: nuestro" },
  },
  {
    kind: "planta", id: "saussurea", name: "Saussurea, bola de nieve", latin: "Saussurea (S. gossypiphora y afines)", habitat: "cresta",
    perYear: 0.3, stockKg: 400, minTempC: 0, altitudeM: 4800, windSeeds: true,
    source: `${WIKI("Saussurea_gossypiphora")} (nativa del Himalaya, 4 300–5 600 m); ${BATURA} (vegetación subnival desde 4 600 m)`,
    ours: { habitat: "su presencia en el Karakórum es del género, no de esta especie: licencia", perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "liquen", name: "Líquenes de roca", latin: "Xanthoria elegans, Rhizocarpon geographicum", habitat: "nieves",
    perYear: 0.04, stockKg: 5_000, minTempC: -2, altitudeM: 5300,
    source: `${WIKI("Xanthoria_elegans")} (líquen anaranjado de las rocas de alta montaña); ${WIKI("Large-eared_pika")} (las picas comen líquenes y musgos)`,
    ours: { perYear: "crecimiento de milímetros al año, en biomasa nuestro", stockKg: "nuestro", minTempC: "nuestro", altitudeM: "nuestra" },
  },
  {
    kind: "planta", id: "eolica", name: "Lluvia eólica (polen e insectos que sube el viento)", latin: "zona eólica", habitat: "nieves",
    perYear: 6, stockKg: 300, minTempC: 4, altitudeM: 2450,
    source: `Swan 1961, «The ecology of the high Himalayas», Scientific American 205: 68–78, y Swan 1992, «The aeolian biome», BioScience 42: 262–270 (por encima de las plantas vive una comunidad que come lo que trae el viento de los valles); ${WIKI("Euophrys_omnisuperstes")} (restos orgánicos arrastrados por el viento sostienen a los colémbolos)`,
    ours: { perYear: "nuestro: se renueva cada verano con el viento del valle", stockKg: "nuestro", minTempC: "llega mientras el valle está templado (nuestro)", altitudeM: "crece con el calor del valle, 2 450 m: nuestro" },
  },

  {
    kind: "planta", id: "flores", name: "Flores (néctar y polen)", latin: "flores de la pradera, la estepa y los albaricoqueros de Hunza", habitat: "pradera",
    perYear: 3, stockKg: 3_000, minTempC: 5, altitudeM: 3000,
    source: `${BATURA} (praderas en flor del alpino y del subalpino); ${WIKI("Apis_cerana")} (la abeja asiática liba néctar y recoge polen de flores silvestres y frutales); ${WIKI("Hunza_Valley")} (los albaricoqueros del valle)`,
    ours: { perYear: "flores que se renuevan cada pocos días en verano: nuestro", stockKg: "nuestro", minTempC: "nuestro", altitudeM: "la altitud media de las flores: nuestra" },
  },

  // ── Small ones by cohorts: aphids, midges, springtails, spiders ──────────────────────────────────────────────────
  {
    kind: "banco", id: "pulgones", name: "Pulgones", latin: "Aphidoidea (como Cinara en los pinos)", habitat: "bosque", trophic: 2,
    adultMassKg: 3e-7, maxAgeYears: 1, matureYears: 0, spawnMonth: 4, spawnMonths: 6, perYear: 12, mortality: 4, intakePerDay: 1,
    diet: [{ food: "pino", pref: 2 }, { food: "espino" }, { food: "abedul" }, { food: "pradera" }], stockKg: 60, unit: "pulgones",
    source: `${WIKI("Aphid")} (1–10 mm; chupan la savia del floema; muchas generaciones al año, las de verano sin machos y paridas vivas; los cuidan las hormigas por su melaza; los comen mariquitas, larvas de crisopa y de sírfido); ${WIKI("Coccinella_septempunctata")}`,
    ours: { adultMassKg: "nuestro", perYear: "nuestro: muchas generaciones al año", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", habitat: "los pulgones de los pinos, del espino y de la pradera, en el bosque: nuestro" },
  },
  {
    kind: "banco", id: "voladores", name: "Mosquitos y moscas pequeñas (plancton aéreo)", latin: "Chironomidae, Diptera, Homoptera", habitat: "aire", trophic: 2,
    adultMassKg: 2e-6, maxAgeYears: 1, matureYears: 0, spawnMonth: 5, spawnMonths: 5, perYear: 8, mortality: 3, intakePerDay: 0.5,
    diet: [{ food: "pradera" }, { food: "artemisa" }, { food: "eolica" }, { food: "espino", pref: 0.5 }], stockKg: 40, variable: true, unit: "insectos",
    source: `Swan 1992, «The aeolian biome», BioScience 42: 262–270 (el viento sube insectos pequeños de los valles a las alturas); ${WIKI("Chironomidae")} (larvas en el agua de los ríos y los charcos, nubes de adultos en el aire)`,
    ours: { adultMassKg: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", variable: "años buenos y malos según el tiempo: nuestro" },
  },
  {
    kind: "banco", id: "colembolos", name: "Colémbolos de la nieve", latin: "Collembola", habitat: "nieves", trophic: 2,
    adultMassKg: 1e-7, maxAgeYears: 1, matureYears: 0, spawnMonth: 6, spawnMonths: 3, perYear: 3, mortality: 1.5, intakePerDay: 0.1,
    diet: [{ food: "eolica", pref: 2 }, { food: "liquen" }], stockKg: 25, unit: "colémbolos",
    source: `${WIKI("Euophrys_omnisuperstes")} (Swan vio colémbolos en el Makalu, que comen los restos que sube el viento); Swan 1992, BioScience 42: 262; ${WIKI("Springtail")} (descomponedores del suelo: hongos y restos de plantas)`,
    ours: { adultMassKg: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", spawnMonth: "nuestro" },
  },
  {
    kind: "banco", id: "aranas", name: "Arañas saltarinas de altura (arácnidos)", latin: "Salticidae (como Euophrys omnisuperstes)", habitat: "nieves", trophic: 3,
    adultMassKg: 2e-5, maxAgeYears: 2, matureYears: 1, spawnMonth: 7, spawnMonths: 2, perYear: 1, mortality: 0.8, intakePerDay: 0.05,
    diet: [{ food: "colembolos", pref: 2 }, { food: "voladores" }], stockKg: 4, unit: "arañas",
    source: `${WIKI("Euophrys_omnisuperstes")} (hasta 6 700 m, quizá el animal que vive más alto; 4–5 mm; come colémbolos y moscas que trae el viento; descrita por Wanless en 1975). No es un insecto: es el arácnido que cierra la cadena de la zona eólica, donde no llega ningún insecto cazador`,
    ours: { habitat: "la especie se conoce del Everest y el Makalu: en el Karakórum la ponemos como representante de las saltícidas de altura (licencia)", adultMassKg: "nuestro", maxAgeYears: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", spawnMonth: "nuestro" },
  },

  // ── Insects lived one by one (giant: INSECT_SCALE) ──────────────────────────────────────────────────────────────
  // Herbivores and pollinators.
  {
    kind: "animal", id: "abeja", name: "Abeja melífera asiática", latin: "Apis cerana", habitat: "pradera", trophic: 2, shape: "insecto",
    massKg: 8e-5, size: { x: 0.019, y: 0.004, z: 0.011 }, male: 1.1, color: 0x5a3e20, intakeKgDay: 0.02,
    diet: [{ food: "flores", pref: 3 }, { food: "espino", pref: 0.3 }],
    childDays: 8, teenDays: 8, adultDays: 1000, birthSize: 0.12, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 4, young: 2,
    survival: 0.7, fastDays: 40, start: 7, cap: 7, eggDays: 3, pupa: true, selfFed: true, dormant: { from: 12, months: 2 }, social: "colmena",
    source: `${WIKI("Apis_cerana")} (la abeja melífera nativa del sur y el este de Asia, del Himalaya incluido; obreras de unos 10 mm; colonias en cavidades; enjambran en primavera; se defienden del avispón formando una bola a su alrededor y calentándolo hasta matarlo); Oldroyd y Wongsiri 2006, «Asian Honey Bees: Biology, Conservation, and Human Interactions», Harvard University Press (la obrera se desarrolla en ~19–20 días; danza como A. mellifera); Winston 1987, «The Biology of the Honey Bee», Harvard University Press (reina: huevo 3 días, larva 5,5, pupa 7,5; vive años)`,
    ours: { massKg: "masa de obrera, nuestra del orden de la fuente", intakeKgDay: "lo que liba la colonia que representa: nuestro", childDays: "huevo y larva de la reina (Winston 1987, de A. mellifera)", teenDays: "pupa de la reina (Winston 1987, de A. mellifera)", adultDays: "la cadena vive las reinas: unos tres años", survival: OURS_SURV, fastDays: "vive de la miel guardada: nuestro", cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "dos enjambres al año salen adelante: nuestro", dormant: "en diciembre y enero la colonia se apiña dentro y no sale: nuestro, del clima de Gilgit", social: "cada abeja de la cadena es una colonia: se ve con sus obreras (bioma-crowd.ts)", birthSize: "nuestro", selfFed: "las larvas las alimentan las nodrizas de la colonia, no su madre", gestationMonths: "nuestro" },
  },
  {
    kind: "animal", id: "abejorro", name: "Abejorro de Gilgit", latin: "Bombus tunicatus (= B. gilgitensis)", habitat: "pradera", trophic: 2, shape: "insecto",
    massKg: 6e-4, size: { x: 0.034, y: 0.009, z: 0.02 }, male: 0.8, color: 0x2a2a2a, intakeKgDay: 0.004,
    diet: [{ food: "flores", pref: 3 }],
    childDays: 14, teenDays: 14, adultDays: 377, birthSize: 0.12, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 7, young: 3,
    survival: 0.6, fastDays: 60, start: 7, cap: 7, eggDays: 4, pupa: true, selfFed: true, annual: true, dormant: { from: 10, months: 6 }, social: "nido",
    source: `GBIF 11075556 (Bombus gilgitensis Cockerell 1905, descrito de Gilgit, sinónimo de B. tunicatus); Williams 1991, «The bumble bees of the Kashmir Himalaya», Bulletin of the British Museum (Natural History), Entomology 60: 1–204; ${WIKI("Bumblebee")} (las reinas nuevas se aparean al final del verano, hibernan bajo tierra y en primavera fundan solas su colonia anual; huevo ~4 días, larva ~10–19, pupa ~2 semanas; vuelan con frío)`,
    ours: { massKg: "reina: nuestro del orden del género", intakeKgDay: "la colonia que representa: nuestro", adultDays: "la reina, de un verano al siguiente", survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "tres reinas nuevas por colonia salen adelante: nuestro", dormant: "las reinas hibernan de octubre a marzo: meses nuestros del clima", birthMonth: "las celdas de las reinas nuevas, en julio: nuestro", social: "cada reina representa su colonia de obreras", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  {
    kind: "animal", id: "mariposa", name: "Apolo del Himalaya", latin: "Parnassius epaphus", habitat: "pedrera", trophic: 2, shape: "insecto",
    massKg: 3e-4, size: { x: 0.055, y: 0.012, z: 0.022 }, male: 0.95, color: 0x2a2a2a, intakeKgDay: 3e-4,
    diet: [{ food: "cojines", pref: 2 }, { food: "flores", pref: 1 }],
    childDays: 290, teenDays: 20, adultDays: 95, birthSize: 0.06, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 8, young: 4,
    survival: 0.7, fastDays: 5, start: 7, cap: 7, selfFed: true, eggDays: 230, pupa: true, annual: true,
    source: `Smith, Naseer, Bálint y Hasan 2007, «Butterflies of the Hunza region, northern Pakistan, and adjacent Afghanistan», Holarctic Lepidoptera 11: 1–57 (Parnassius epaphus en la meseta de Khunjerab, ~4 700 m, el 5 de julio, y en el Fakar, Nagar; P. charltonius y P. delphius en Hunza); ${WIKI("Parnassius_epaphus")} (alas blancas con manchas negras y rojas; ~5,5 cm); ${WIKI("Parnassius")} (los huevos pasan el invierno; las orugas comen crasuláceas como Sedum y Rhodiola)`,
    ours: { massKg: "nuestro", intakeKgDay: "nuestro", eggDays: "el huevo pasa el invierno: de agosto a abril, nuestro", childDays: "huevo y oruga: nuestro", teenDays: "crisálida: nuestro", adultDays: "un mes y medio de vuelo en verano: nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "de cientos de huevos, los que el valle sostiene: nuestro", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  {
    kind: "animal", id: "saltamontes", name: "Langosta migratoria", latin: "Locusta migratoria", habitat: "estepa", trophic: 2, shape: "insecto",
    massKg: 2e-3, size: { x: 0.09, y: 0.012, z: 0.05 }, male: 0.85, color: 0x8a7a4a, intakeKgDay: 0.002,
    diet: [{ food: "pradera", pref: 2 }, { food: "artemisa" }],
    childDays: 280, teenDays: 20, adultDays: 105, birthSize: 0.12, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 9, young: 4,
    survival: 0.7, fastDays: 4, start: 7, cap: 7, selfFed: true, eggDays: 235, annual: true, nymph: true,
    source: `Mahmood, Abbas y Shah 2004, «A preliminary study of grasshoppers (Acrididae: Orthoptera) of Baltistan», Pakistan Journal of Zoology 36(1): 21–25 (Locusta migratoria en Baltistán, medida a varias altitudes); ${WIKI("Migratory_locust")} (4–6 cm; pone en el suelo y los huevos pasan el invierno; cinco estadios de ninfa sin alas; come gramíneas; come cada día casi su propio peso)`,
    ours: { eggDays: "de septiembre a mayo en el suelo: nuestro", childDays: "huevo y primeras ninfas: nuestro", teenDays: "las últimas ninfas: nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "los que el valle sostiene: nuestro", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  {
    kind: "animal", id: "drosophila", name: "Mosca de la fruta", latin: "Drosophila melanogaster", habitat: "rio", trophic: 2, shape: "insecto",
    massKg: 1e-6, size: { x: 0.0055, y: 0.0012, z: 0.0025 }, male: 0.8, color: 0xb08a50, intakeKgDay: 2e-7,
    diet: [{ food: "espino", pref: 3 }, { food: "flores", pref: 0.5 }],
    childDays: 5, teenDays: 4, adultDays: 396, birthSize: 0.2, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 8, young: 6,
    survival: 0.6, fastDays: 60, start: 7, cap: 7, selfFed: true, eggDays: 1, pupa: true, annual: true, dormant: { from: 12, months: 3 },
    source: `${WIKI("Drosophila_melanogaster")} (las hembras miden unos 2,5 mm y los machos algo menos; ojos rojos; huevo ~1 día, larva ~4 días en tres estadios, pupa ~4 días a 25 °C; comen las levaduras de la fruta que fermenta; en los climas templados pasan el invierno de adultas, en diapausa reproductiva; cosmopolita, también en Pakistán)`,
    ours: { habitat: "junto al río, en las bayas del espino amarillo y los albaricoques de Hunza: nuestro", adultDays: "la generación de otoño, que pasa el invierno de adulta: una sola generación al año en la cadena (licencia: en la realidad, muchas)", survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", dormant: "diapausa invernal: nuestros meses", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  // Decomposers.
  {
    kind: "animal", id: "carronero", name: "Escarabajo enterrador", latin: "Nicrophorus nepalensis", habitat: "enebral", trophic: 2, shape: "insecto",
    massKg: 4e-4, size: { x: 0.03, y: 0.007, z: 0.02 }, male: 1, color: 0x151515, intakeKgDay: 2e-4,
    diet: [{ food: "carrona", pref: 3 }],
    childDays: 19, teenDays: 20, adultDays: 366, birthSize: 0.15, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 7, young: 4,
    survival: 0.7, fastDays: 60, start: 7, cap: 7, selfFed: true, eggDays: 5, pupa: true, annual: true, hiddenYoung: true, dormant: { from: 11, months: 4 },
    source: `${WIKI("Nicrophorus_nepalensis")} (de Pakistán, 73° E, a Japón, en las montañas; ~20 mm; entierra cadáveres de roedores y aves y los dos padres crían y alimentan a las larvas, que tras unas dos semanas en la cripta se van a pupar; adultos de hasta cuatro meses)`,
    ours: { adultDays: "la cadena le deja pasar el invierno de adulto (licencia: la fuente da hasta cuatro meses)", survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", dormant: "nuestro, del clima", teenDays: "pupa: nuestro", eggDays: "nuestro", birthMonth: "nuestro", birthSize: "nuestro", gestationMonths: "nuestro", habitat: "nuestro" },
  },
  {
    kind: "animal", id: "pelotero", name: "Escarabajo del estiércol", latin: "Aphodius (Aphodiinae)", habitat: "pradera", trophic: 2, shape: "insecto",
    massKg: 1e-4, size: { x: 0.012, y: 0.003, z: 0.007 }, male: 1, color: 0x4a3020, intakeKgDay: 5e-4,
    diet: [{ food: "estiercol", pref: 3 }],
    childDays: 290, teenDays: 15, adultDays: 100, birthSize: 0.15, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 6, young: 4,
    survival: 0.7, fastDays: 5, start: 7, cap: 7, selfFed: true, eggDays: 7, pupa: true, annual: true, hiddenYoung: true,
    source: `${WIKI("Aphodiinae")} (escarabajos pequeños del estiércol, de 3–15 mm, que viven y crían dentro de las boñigas; los más abundantes en los pastos de montaña); ${WIKI("Dung_beetle")} (descomponedores: entierran y reciclan el estiércol)`,
    ours: { habitat: "en los pastos de yaks y cabras de Hunza: nuestro (la fuente es de la subfamilia)", childDays: "la larva pasa el invierno en el suelo: nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", massKg: "nuestro", birthMonth: "nuestro", eggDays: "nuestro", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  // Middle predators.
  {
    kind: "animal", id: "mariquita", name: "Mariquita de siete puntos", latin: "Coccinella septempunctata", habitat: "bosque", trophic: 3, shape: "insecto",
    massKg: 4e-5, size: { x: 0.011, y: 0.004, z: 0.007 }, male: 0.95, color: 0xd02a20, intakeKgDay: 2e-5,
    diet: [{ food: "pulgones", pref: 3 }],
    childDays: 24, teenDays: 7, adultDays: 374, birthSize: 0.15, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 5, young: 5,
    survival: 0.7, fastDays: 60, start: 3, cap: 3, selfFed: true, eggDays: 4, pupa: true, annual: true, dormant: { from: 12, months: 3 },
    source: `${WIKI("Coccinella_septempunctata")} (7–8 mm; élitros rojos con siete puntos negros; adultos y larvas comen pulgones, un adulto unos 100 al día; pasa el invierno de adulto en grupos; huevo 3–6 días, larva unas 3 semanas en cuatro estadios, pupa una semana; Europa y Asia, Pakistán incluido)`,
    ours: { survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", dormant: "nuestro, del clima", birthMonth: "nuestro", habitat: "en los pinos de los pulgones: nuestro", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  {
    kind: "animal", id: "crisopa", name: "Crisopa verde", latin: "Chrysoperla carnea", habitat: "rio", trophic: 3, shape: "insecto",
    massKg: 1e-5, size: { x: 0.025, y: 0.004, z: 0.012 }, male: 1, color: 0x9ad070, intakeKgDay: 1e-5,
    diet: [{ food: "pulgones", pref: 2 }, { food: "flores", pref: 1 }],
    childDays: 19, teenDays: 10, adultDays: 376, birthSize: 0.15, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 5, young: 4,
    survival: 0.7, fastDays: 60, start: 3, cap: 3, selfFed: true, eggDays: 4, pupa: true, annual: true, dormant: { from: 12, months: 3 },
    source: `${WIKI("Chrysoperla_carnea")} (alas grandes y transparentes con venas verdes, ojos dorados; la larva, el «león de los pulgones», come pulgones y el adulto néctar, polen y melaza; pasa el invierno de adulto y entonces se vuelve pardo; Paleártico, Pakistán incluido)`,
    ours: { survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", dormant: "nuestro", childDays: "nuestro", teenDays: "nuestro", birthMonth: "nuestro", habitat: "nuestro", birthSize: "nuestro", gestationMonths: "nuestro", eggDays: "nuestro" },
  },
  {
    kind: "animal", id: "sirfido", name: "Sírfido de bandas", latin: "Episyrphus balteatus", habitat: "pradera", trophic: 3, shape: "insecto",
    massKg: 1.5e-5, size: { x: 0.02, y: 0.003, z: 0.01 }, male: 1, color: 0xd88a2a, intakeKgDay: 1e-5,
    diet: [{ food: "pulgones", pref: 2 }, { food: "flores", pref: 2 }],
    childDays: 13, teenDays: 8, adultDays: 384, birthSize: 0.15, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 4, young: 4,
    survival: 0.7, fastDays: 60, start: 3, cap: 3, selfFed: true, eggDays: 3, pupa: true, annual: true, dormant: { from: 12, months: 3 },
    source: `${WIKI("Episyrphus_balteatus")} (9–12 mm; abdomen naranja con dobles bandas negras, imita a las avispas; se cierne inmóvil en el aire; la larva come pulgones, el adulto polen y néctar; migra en masa, también por los pasos de montaña; algunas hembras pasan el invierno de adultas; de Europa a Asia)`,
    ours: { survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", dormant: "nuestro", adultDays: "la hembra que pasa el invierno: nuestro", birthMonth: "nuestro", childDays: "nuestro", teenDays: "nuestro", birthSize: "nuestro", gestationMonths: "nuestro", eggDays: "nuestro" },
  },
  {
    kind: "animal", id: "hormiga", name: "Hormiga de los bosques", latin: "Formica (reina)", habitat: "bosque", trophic: 3, shape: "insecto",
    massKg: 3e-5, size: { x: 0.02, y: 0.004, z: 0.009 }, male: 0.8, color: 0x2a1a14, intakeKgDay: 0.002,
    diet: [{ food: "pulgones", pref: 2 }, { food: "voladores" }, { food: "carrona", pref: 0.5 }],
    childDays: 35, teenDays: 15, adultDays: 3650, birthSize: 0.15, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 7, young: 2,
    survival: 0.85, fastDays: 30, start: 3, cap: 3, eggDays: 10, pupa: true, selfFed: true, dormant: { from: 11, months: 4 }, social: "hormiguero",
    source: `${WIKI("Formica")} (hormigas de los bosques templados de Eurasia; ordeñan a los pulgones por su melaza y cazan insectos; hormigueros de agujas y ramitas; reinas que viven muchos años; vuelo nupcial en verano)`,
    ours: { habitat: "en el pinar: el género, no una especie de Gilgit con fuente (licencia)", massKg: "nuestro", intakeKgDay: "la colonia que representa: nuestro", childDays: "nuestro", teenDays: "nuestro", adultDays: "una reina, unos diez años: nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "dos reinas nuevas que fundan: nuestro", dormant: "nuestro, del clima", social: "cada reina es su hormiguero", birthMonth: "nuestro", birthSize: "nuestro", gestationMonths: "nuestro", eggDays: "nuestro", selfFed: "las larvas las crían las obreras" },
  },
  {
    kind: "animal", id: "asilido", name: "Mosca ladrona", latin: "Asilidae (como Machimus)", habitat: "estepa", trophic: 3, shape: "insecto",
    massKg: 5e-5, size: { x: 0.03, y: 0.005, z: 0.02 }, male: 0.9, color: 0x6a5a48, intakeKgDay: 2e-5,
    diet: [{ food: "voladores", pref: 2 }, { food: "drosophila" }, { food: "sirfido", pref: 0.5, stages: ["adulto", "anciano"] }, { food: "abeja", pref: 0.3, stages: ["adulto", "anciano"] }],
    childDays: 290, teenDays: 15, adultDays: 100, birthSize: 0.1, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 7, young: 4,
    survival: 0.7, fastDays: 4, start: 3, cap: 3, selfFed: true, eggDays: 10, pupa: true, annual: true, hiddenYoung: true, huntSuccess: 0.4,
    source: `${WIKI("Asilidae")} (moscas cazadoras de ojos grandes y «barba» que acechan en una percha y cazan al vuelo otros insectos, abejas y avispas incluidas, y les inyectan saliva que los paraliza; las larvas viven en el suelo; de todo el mundo, más en las zonas secas y soleadas)`,
    ours: { habitat: "la familia, en la estepa: no una especie de Gilgit con fuente (licencia)", childDays: "la larva en el suelo: nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", massKg: "nuestro", huntSuccess: "nuestro", birthMonth: "nuestro", eggDays: "nuestro", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  // Top predators.
  {
    kind: "animal", id: "libelula", name: "Libélula migradora", latin: "Pantala flavescens", habitat: "rio", trophic: 4, shape: "insecto",
    massKg: 3e-4, size: { x: 0.08, y: 0.008, z: 0.048 }, male: 1, color: 0xd8a040, intakeKgDay: 6e-5,
    diet: [{ food: "voladores", pref: 3 }, { food: "drosophila" }, { food: "sirfido", pref: 0.5, stages: ["adulto", "anciano"] }, { food: "mariposa", pref: 0.3, stages: ["adulto", "anciano"] }],
    childDays: 50, teenDays: 10, adultDays: 150, birthSize: 0.1, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 6, young: 2,
    survival: 0.7, fastDays: 3, start: 0, cap: 2, selfFed: true, eggDays: 6, hiddenYoung: true, nymph: true, huntSuccess: 0.9, away: 0.3,
    visitor: { windows: [{ arrive: 5, leave: 10 }], count: 2, breeds: true, from: "migra con los monzones entre la India y África, cruzando el Himalaya" },
    source: `${WIKI("Pantala_flavescens")} (envergadura de 72–84 mm; el insecto que vuela más lejos, generaciones que cruzan el océano Índico con los monzones; vista a 6 300 m en el Himalaya; pone en charcas temporales y la ninfa crece en 38–65 días; caza al vuelo mosquitos y otros insectos); Combes, Rundle, Iwasaki y Crall 2012, «Linking biomechanics and ecology through predator–prey interactions: flight performance of dragonflies and their prey», Journal of Experimental Biology 215: 903–913 (las libélulas aciertan más del 90 % de sus cazas)`,
    ours: { survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", visitor: "llega en mayo y se va en octubre con el monzón: nuestro", birthMonth: "nuestro", teenDays: "nuestro", adultDays: "la cadena las deja vivir el verano: en la realidad se suceden las generaciones", fastDays: OURS_FAST, away: OURS_AWAY, birthSize: "nuestro", gestationMonths: "nuestro", eggDays: "nuestro" },
  },
  {
    kind: "animal", id: "mantis", name: "Mantis religiosa", latin: "Mantis religiosa", habitat: "estepa", trophic: 4, shape: "insecto",
    massKg: 2.5e-3, size: { x: 0.05, y: 0.015, z: 0.07 }, male: 0.8, color: 0x7a9a48, intakeKgDay: 1e-4,
    diet: [{ food: "saltamontes", pref: 2, stages: ["joven", "adulto", "anciano"] }, { food: "mariposa", pref: 1, stages: ["adulto", "anciano"] }, { food: "sirfido", pref: 1, stages: ["adulto", "anciano"] }, { food: "abeja", pref: 0.5, stages: ["adulto", "anciano"] }, { food: "voladores", pref: 1 }],
    childDays: 290, teenDays: 20, adultDays: 95, birthSize: 0.1, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 9, young: 3,
    survival: 0.7, fastDays: 10, start: 2, cap: 2, selfFed: true, eggDays: 230, annual: true, nymph: true, huntSuccess: 0.5,
    source: `${WIKI("European_mantis")} (6–7 cm la hembra, verde o parda; patas delanteras raptoras; caza al acecho saltamontes, mariposas, moscas y abejas; la hembra a veces se come al macho; la ooteca pasa el invierno y las ninfas salen en primavera; de Europa a Asia, también en Pakistán)`,
    ours: { habitat: "en la estepa cálida del fondo del valle: nuestro", eggDays: "la ooteca de septiembre a mayo: nuestro", childDays: "nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", intakeKgDay: "nuestro", massKg: "nuestro", huntSuccess: "nuestro", birthSize: "nuestro", gestationMonths: "nuestro" },
  },
  {
    kind: "animal", id: "avispon", name: "Avispón asiático", latin: "Vespa velutina", habitat: "enebral", trophic: 4, shape: "insecto",
    massKg: 6e-4, size: { x: 0.045, y: 0.008, z: 0.03 }, male: 0.8, color: 0x241810, intakeKgDay: 0.003,
    diet: [{ food: "abeja", pref: 2, stages: ["adulto", "anciano"] }, { food: "voladores", pref: 1 }, { food: "sirfido", pref: 1, stages: ["adulto", "anciano"] }, { food: "drosophila", pref: 0.5 }, { food: "saltamontes", pref: 0.5 }, { food: "carrona", pref: 0.3 }],
    childDays: 20, teenDays: 12, adultDays: 373, birthSize: 0.12, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 9, young: 3,
    survival: 0.6, fastDays: 60, start: 2, cap: 2, eggDays: 5, pupa: true, selfFed: true, annual: true, dormant: { from: 11, months: 4 }, social: "nido", huntSuccess: 0.3,
    source: `${WIKI("Asian_hornet")} (nativo de Pakistán, el norte de la India y Afganistán al sudeste de Asia; reinas de ~30 mm y obreras de ~20; se cierne sobre las colmenas y caza abejas al vuelo, sobre todo Apis cerana, que se defiende formando una bola y calentándolo; también moscas, libélulas y saltamontes; las reinas fundan solas en primavera y las nuevas hibernan)`,
    ours: { habitat: "nuestro", intakeKgDay: "la colonia que representa: nuestro", childDays: "nuestro", teenDays: "nuestro", adultDays: "la reina, de un otoño al siguiente", survival: OURS_SURV, cap: OURS_CAP_S3, start: OURS_CAP_S3, young: "nuestro", dormant: "las reinas hibernan de noviembre a febrero: nuestro", massKg: "nuestro", huntSuccess: "nuestro: la bola de calor de A. cerana frena muchas cazas", social: "cada reina, su nido de obreras", birthMonth: "las reinas nuevas, en septiembre: nuestro", birthSize: "nuestro", gestationMonths: "nuestro", eggDays: "nuestro", selfFed: "las larvas las alimentan las obreras" },
  },
];

/** What is left: the bodies (carrion) for the burying beetle, the ants and the hornets; the dung of the valley's herds for the dung beetles. */
export const REMAINS: readonly RemainsSpec[] = [
  {
    id: "carrona", name: "Carroña", share: 0.8, shareKilled: 0.3, rotPerDay: 0.08, inflowKgDay: 0.01,
    reality: "licencia",
    source: `ritmo de descomposición nuestro; lo que llega de fuera (cadáveres de ratones y aves del resto del valle, que la isla no muestra) es nuestro, del orden de lo que come el escarabajo enterrador (${WIKI("Nicrophorus_nepalensis")})`,
  },
  {
    id: "estiercol", name: "Estiércol de los pastos", share: 0, shareKilled: 0, rotPerDay: 0.03, inflowKgDay: 0.05,
    reality: "licencia",
    source: `${WIKI("Dung_beetle")} (reciclan el estiércol del ganado); los yaks y las cabras de Hunza pastan en verano en los pastos altos (${WIKI("Hunza_Valley")}): lo que dejan llega de fuera de la isla, cantidad nuestra`,
  },
];

/**
 * THE SCALE OF THE GIANT INSECTS (Berón 2026-11-25: «se respetará la escala tomando de referencia a un mosquito de la
 * fruta, dicho mosquito medirá 1 m de largo»): the fruit fly's real length, and the factor every insect of the island
 * is drawn at. All the biology stays real (masses, rations, days): only the drawing and its distances are ×400.
 */
export const FRUIT_FLY_M = fact(0.0025, "real", `${WIKI("Drosophila_melanogaster")}: «las hembras miden unos 2,5 mm de largo; los machos son algo más pequeños»`);
export const INSECT_SCALE = fact(1 / FRUIT_FLY_M.value, "ficcion", "Berón 2026-11-25: la mosca de la fruta mide 1 m; 1 m ÷ 2,5 mm = 400 para todos los insectos (ficción: la regla del santuario 3)");

/**
 * THE PEOPLE AND THE RULE OF ANIMALS PER PERSON (the same as sanctuary 1's: Cold Sanctuary's PopulationPlan,
 * fauna/domain/population.ts): K animals per person (setting «Animales por persona», 4 by default), shared out 70 / 22 /
 * 8 % by trophic level (presas = herbivores and decomposers, trophic 2; meso = middle predators, 3; ápice = top, 4)
 * and inside a level by each species' weight; two of each at least. The people of sanctuary 3: the trainers and
 * Doménica. The weights are ours (licencia), of the order of how common each is.
 */
export const S3_PER_HUMAN: Readonly<Record<string, number>> = {
  abeja: 1, abejorro: 1, mariposa: 1, saltamontes: 1, drosophila: 1, carronero: 1, pelotero: 1,
  mariquita: 1, crisopa: 1, sirfido: 1, hormiga: 1, asilido: 1, libelula: 1, mantis: 1, avispon: 1,
};

/**
 * The climate of the valley floor: Gilgit (1 500 m, 35,9°N), mean of the daily maximum and minimum of each month
 * (Wikipedia, Gilgit: Pakistan Meteorological Department); higher up, the standard lapse rate (domain/mountain.ts).
 */
const GILGIT_MAX = [9.6, 12.6, 18.4, 24.2, 29.0, 34.2, 36.2, 35.3, 31.8, 25.6, 18.4, 11.6];
const GILGIT_MIN = [-2.7, 0.4, 5.4, 9.2, 11.8, 14.9, 18.2, 17.5, 12.4, 6.3, 0.4, -2.3];
export const CLIMATE: ClimateSpec = {
  latitude: 35.9,
  stationM: 1500,
  airC: GILGIT_MAX.map((x, i) => Math.round(((x + GILGIT_MIN[i]!) / 2) * 100) / 100),
  source: `${WIKI("Gilgit")} (tabla del clima: máximas y mínimas medias de cada mes, Pakistan Meteorological Department); más arriba, −6,5 °C por km (atmósfera estándar de la OACI)`,
  reality: { airC: "real" },
};

/** The trophic level of a species for the rule (presas 2, meso 3, ápice 4). */
const levelOfTrophic = (t: number): Trophic => (t >= 4 ? "apice" : t === 3 ? "meso" : "presa");
const ANIMALS = SPECIES.filter((s): s is AnimalSpec => s.kind === "animal");
/** Every animal of sanctuary 3 under the rule: Gilgit-Baltistán's insects and the Carboniferous giants (data/carbonifero.ts). */
const RULED = [...ANIMALS, ...CARBON_ANIMALS];
/** The tables of the rule for sanctuary 3 (fauna/domain/population.ts `allocate`): one rule for the whole sanctuary. */
export const S3_POPULATION: PopulationTable = {
  perHuman: { ...S3_PER_HUMAN, ...Object.fromEntries(CARBON_ANIMALS.map((s) => [s.id, 1])) },
  level: Object.fromEntries(RULED.map((s) => [s.id, levelOfTrophic(s.trophic)])),
};

/** The people of sanctuary 3 (the rule's humans): the trainers of the initiation (data/trainers.ts) and Doménica. */
export function s3People(): number {
  return TRAINERS.length + 1;
}

/** How many of each insect live on the island for `k` animals per person (the setting): species → individuals. */
export function s3Plan(k: number = ANIMALS_PER_HUMAN, people = s3People()): Map<string, number> {
  return allocate(Math.max(0, k * people), RULED.map((s) => s.id), S3_POPULATION).counts;
}

/** The air biome for `k` animals per person: every insect's start and cap by the rule (a visitor brings as many). */
export function airBiome(k = 4): BiomeDef {
  const species = ruled(SPECIES, s3Plan(k));
  return { id: `aire-${k}`, name: "Karakórum (Hunza–Nagar)", species, remains: REMAINS, climate: CLIMATE, startDayOfYear: 323, elsewhere: "a otra parte del valle", drawScale: INSECT_SCALE.value };
}

/** The species of a biome with their start and cap by the rule's plan. */
const ruled = (species: readonly BiomeSpec[], plan: ReadonlyMap<string, number>): BiomeSpec[] =>
  species.map((s): BiomeSpec => {
    if (s.kind !== "animal") return s;
    const n = plan.get(s.id) ?? s.cap;
    return s.visitor ? { ...s, start: 0, cap: n, visitor: { ...s.visitor, count: n } } : { ...s, start: n, cap: n };
  });

/**
 * The Carboniferous forest at the pyramid's foot for `k` animals per person (data/carbonifero.ts): its own food chain
 * on the same calendar as the island, its giants at their fossil size, its numbers from the same rule.
 */
export function carbonBiome(k = 4): BiomeDef {
  return { id: `carbonifero-${k}`, name: "Bosque del Carbonífero (Euramérica, ~300 Ma)", species: ruled(CARBON_SPECIES, s3Plan(k)), remains: [], climate: CARBON_CLIMATE, startDayOfYear: 323, elsewhere: "a otra parte del bosque", drawScale: CARBON_SCALE.value };
}

/** The air biome: the Hunza–Nagar valleys from the valley floor to Khunjerab, at 4 animals per person (the default). Day 0 is 20 November (Berón's day). */
export const AIR_BIOME: BiomeDef = airBiome(4);

/** The species of the air biome (the census and the scene read them). */
export const BIOME = AIR_BIOME.species;
export const biomeSpec = (id: string): BiomeSpec | undefined => BIOME.find((s) => s.id === id);
export const nameOf = (id: string): string => REMAINS.find((r) => r.id === id)?.name ?? biomeSpec(id)?.name ?? id;

/** The reality of a species' field: real from its source, or licencia if it is ours. */
export function realityOf(s: BiomeSpec, field: string): Reality {
  return s.ours && field in s.ours ? "licencia" : "real";
}
