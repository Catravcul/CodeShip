import type { Reality } from "@core/reality";

/**
 * THE BIOME of sanctuary 3: the AIR and the HEIGHTS (Berón, 2026-11-20: «cada santuario debe recrear un bioma
 * distintivo … sanctuary3 debe ser más aéreo … las aves y las alturas, quizás las cabras, las montañas, los
 * acantilados … algún tipo de roedor»; docs/design/bioma-s3.md). One real region, so every species truly lives with
 * the others: the Hunza–Nagar valleys of the Karakoram (Gilgit-Baltistan, Pakistan), from the valley floor to
 * Khunjerab. The birds, mammals and the snow leopard are those of Khunjerab National Park's list (Wikipedia), plus the
 * markhor and the woolly flying squirrel of the forests of Nagar and Gilgit next to it; the plants are the altitude
 * belts of the Batura valley (Eberhardt, Dickoré y Miehe 2007) and the moist forests of Rakaposhi across the valley.
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
export type BodyShape = "cuadrupedo" | "ave" | "pajaro";

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
}

const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const ADW = (latin: string) => `https://animaldiversity.org/accounts/${latin.replace(" ", "_")}/`;
const KHUNJERAB = `${WIKI("Khunjerab_National_Park")} (lista de especies del parque: 4 000–5 200 m, Gilgit-Baltistán)`;
const BATURA = "Eberhardt, Dickoré y Miehe 2007, «Vegetation map of the Batura Valley (Hunza Karakorum, North Pakistan)», Erdkunde 61(1): 93–112, doi:10.3112/erdkunde.2007.01.06 (cinturones: submontano hasta ~2 700 m, montano 2 600–3 900, subalpino 3 500–4 400, alpino 3 900–4 600, subnival desde 4 600; plantas vasculares hasta 5 000–5 200 m)";
const OURS_SURV = "supervivencia anual del orden publicado para su grupo; sin serie propia de esta especie";
const OURS_FAST = "días de ayuno del orden de su grupo (los grandes aguantan semanas; los pájaros, horas)";
const OURS_INTAKE_HERB = "ración nuestra: ~3 % de la masa en materia seca al día, ~8–9 % en fresco (rumiantes de montaña)";
const OURS_INTAKE_BIRD = "ración nuestra con la regla de las aves (~10–25 % de la masa al día; más cuanto más pequeña)";
const OURS_CAP = "el presupuesto del móvil (docs/design/bioma-s3.md §Presupuesto), no un censo real: cada uno representa a muchos (§Multitudes)";
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

  // ── Insects, spiders and mice (cohorts) ──────────────────────────────────────────────────────────────────────────
  {
    kind: "banco", id: "insectos", name: "Insectos de la pradera", latin: "Orthoptera, Coleoptera, larvas de Diptera", habitat: "pradera", trophic: 2,
    adultMassKg: 0.0005, maxAgeYears: 1, matureYears: 0, spawnMonth: 6, spawnMonths: 3, perYear: 4, mortality: 2, intakePerDay: 0.3,
    diet: [{ food: "pradera", pref: 2 }, { food: "cojines" }, { food: "artemisa" }], stockKg: 900, unit: "insectos",
    source: `${WIKI("Alpine_chough")} (en verano la chova come escarabajos, caracoles, saltamontes, orugas y larvas de mosca de los pastos)`,
    ours: { adultMassKg: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", spawnMonth: "el verano alpino, nuestro" },
  },
  {
    kind: "banco", id: "voladores", name: "Insectos voladores (plancton aéreo)", latin: "Diptera, Homoptera, Hymenoptera", habitat: "aire", trophic: 2,
    adultMassKg: 0.00002, maxAgeYears: 1, matureYears: 0, spawnMonth: 5, spawnMonths: 4, perYear: 6, mortality: 3, intakePerDay: 0.5,
    diet: [{ food: "pradera" }, { food: "artemisa" }, { food: "pino", pref: 0.5 }, { food: "espino", pref: 0.5 }], stockKg: 250, variable: true, unit: "insectos",
    source: `${WIKI("Alpine_swift")} (el vencejo real come sobre todo insectos voladores: homópteros, dípteros e himenópteros); Swan 1992, BioScience 42: 262 (el viento sube insectos a la zona eólica)`,
    ours: { adultMassKg: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", variable: "años buenos y malos según el tiempo: nuestro" },
  },
  {
    kind: "banco", id: "ratones", name: "Ratón de campo de Cachemira y hámster enano", latin: "Apodemus rusiges, Cricetulus migratorius", habitat: "estepa", trophic: 2,
    adultMassKg: 0.025, maxAgeYears: 2, matureYears: 0, spawnMonth: 5, spawnMonths: 4, perYear: 3, mortality: 1.5, intakePerDay: 0.15,
    diet: [{ food: "artemisa" }, { food: "pradera" }, { food: "enebro", pref: 0.5 }, { food: "espino", pref: 0.5 }], stockKg: 500, unit: "ratones",
    source: `${KHUNJERAB} (ratón de campo de Cachemira y hámster enano gris en su lista); ${WIKI("Common_kestrel")} (el cernícalo come casi solo mamíferos del tamaño de un ratón, 4–8 al día)`,
    ours: { adultMassKg: "nuestro", maxAgeYears: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", spawnMonth: "nuestro" },
  },
  {
    kind: "banco", id: "colembolos", name: "Colémbolos de la nieve", latin: "Collembola", habitat: "nieves", trophic: 2,
    adultMassKg: 1e-7, maxAgeYears: 1, matureYears: 0, spawnMonth: 6, spawnMonths: 3, perYear: 3, mortality: 1.5, intakePerDay: 0.1,
    diet: [{ food: "eolica", pref: 2 }, { food: "liquen" }], stockKg: 25, unit: "colémbolos",
    source: `${WIKI("Euophrys_omnisuperstes")} (Swan vio colémbolos en el Makalu, que comen los restos que sube el viento); Swan 1992, BioScience 42: 262`,
    ours: { adultMassKg: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", spawnMonth: "nuestro" },
  },
  {
    kind: "banco", id: "aranas", name: "Arañas saltarinas de altura", latin: "Salticidae (como Euophrys omnisuperstes)", habitat: "nieves", trophic: 3,
    adultMassKg: 2e-5, maxAgeYears: 2, matureYears: 1, spawnMonth: 7, spawnMonths: 2, perYear: 1, mortality: 0.8, intakePerDay: 0.05,
    diet: [{ food: "colembolos", pref: 2 }, { food: "voladores" }], stockKg: 4, unit: "arañas",
    source: `${WIKI("Euophrys_omnisuperstes")} (hasta 6 700 m, quizá el animal que vive más alto; 4–5 mm; come colémbolos y moscas que trae el viento; descrita por Wanless en 1975)`,
    ours: { habitat: "la especie se conoce del Everest y el Makalu: en el Karakórum la ponemos como representante de las saltícidas de altura (licencia)", adultMassKg: "nuestro", maxAgeYears: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", spawnMonth: "nuestro" },
  },

  // ── Mammals ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    kind: "animal", id: "ibice", name: "Íbice del Himalaya", latin: "Capra sibirica", habitat: "farallon", trophic: 2, shape: "cuadrupedo",
    massKg: 45, size: { x: 0.34, y: 0.8, z: 1.3 }, male: 1.25, color: 0x8a7356, intakeKgDay: 3.8,
    diet: [{ food: "pradera", pref: 2 }, { food: "cojines" }, { food: "abedul", pref: 0.5 }, { food: "enebro", pref: 0.5 }],
    childDays: 180, teenDays: 365, adultDays: 5300, birthSize: 0.4, gestationMonths: 5.8, intervalMonths: 12, birthMonth: 6, young: 1,
    survival: 0.85, fastDays: 20, start: 14, cap: 20,
    source: `${WIKI("Siberian_ibex")} (hembras 34–56 kg, machos 60–130 kg; celo de finales de octubre a principios de enero; 170–180 días de gestación; una cría, gemelos hasta un 14 %; las hembras crían en su segundo año; viven hasta 17 años; pasto y juncias en verano, ramitas de sauce y enebro en invierno; laderas empinadas y pedreras); ${KHUNJERAB}`,
    ours: { intakeKgDay: OURS_INTAKE_HERB, childDays: "lactancia de unos seis meses, nuestra", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, birthMonth: "celo de diciembre + 175 días: junio (cálculo nuestro)" },
  },
  {
    kind: "animal", id: "markhor", name: "Markhor", latin: "Capra falconeri", habitat: "garganta", trophic: 2, shape: "cuadrupedo",
    massKg: 40, size: { x: 0.34, y: 0.78, z: 1.3 }, male: 1.33, color: 0x9a8668, intakeKgDay: 3.4,
    diet: [{ food: "artemisa" }, { food: "abedul" }, { food: "pino", pref: 0.5 }, { food: "pradera" }],
    childDays: 165, teenDays: 560, adultDays: 3700, birthSize: 0.4, gestationMonths: 5, intervalMonths: 12, birthMonth: 5, young: 1,
    survival: 0.85, fastDays: 20, start: 10, cap: 14,
    source: `${ADW("Capra falconeri")} (hembras 32–50 kg, machos 80–110 kg; celo en otoño e invierno; 135–170 días de gestación; nacen en mayo y junio, 1–2; destete a los 5–6 meses; hembras maduras a los 18–30 meses; viven 11–13 años); ${WIKI("Astor_markhor")} (hasta 3 600 m, laderas con matorral y bosque abierto, en Gilgit y Nagar)`,
    ours: { intakeKgDay: OURS_INTAKE_HERB, survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "bharal", name: "Bharal (oveja azul)", latin: "Pseudois nayaur", habitat: "pradera", trophic: 2, shape: "cuadrupedo",
    massKg: 45, size: { x: 0.34, y: 0.78, z: 1.25 }, male: 1.2, color: 0x8d8e94, intakeKgDay: 3.8,
    diet: [{ food: "pradera", pref: 2 }, { food: "artemisa" }, { food: "cojines", pref: 0.5 }],
    childDays: 180, teenDays: 550, adultDays: 3300, birthSize: 0.4, gestationMonths: 5.3, intervalMonths: 12, birthMonth: 6, young: 1,
    survival: 0.85, fastDays: 20, start: 14, cap: 20,
    source: `${ADW("Pseudois nayaur")} (35–75 kg; celo de finales de noviembre a febrero; gestación de 4 a 5,3 meses; nacen de mediados de mayo a principios de julio, 1–2; maduran a los 2 años; viven 4–11 años de normal, hasta 17); ${WIKI("Bharal")} (2 200–5 500 m; pasto; sube a los cantiles y se queda quieta contra la roca); ${KHUNJERAB}`,
    ours: { intakeKgDay: OURS_INTAKE_HERB, childDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "marmota", name: "Marmota de cola larga", latin: "Marmota caudata", habitat: "pradera", trophic: 2, shape: "cuadrupedo",
    massKg: 4, size: { x: 0.22, y: 0.26, z: 0.55 }, male: 1.05, color: 0xc98a3a, intakeKgDay: 0.5,
    diet: [{ food: "pradera", pref: 2 }, { food: "cojines" }],
    childDays: 365, teenDays: 1100, adultDays: 3000, birthSize: 0.3, gestationMonths: 1.1, intervalMonths: 12, birthMonth: 6, young: 4,
    survival: 0.85, fastDays: 15, start: 14, cap: 20, dormant: { from: 9, months: 8 },
    source: `${WIKI("Long-tailed_marmot")} (1,5–7,3 kg; hiberna de septiembre a abril o mayo; se aparea a finales de abril y principios de mayo, 4 semanas y media de gestación, unas cuatro crías que salen a las seis semanas; las hembras crían en su cuarto año; grupos de hasta siete adultos en ~3 ha con unas tres madrigueras; la cazan el zorro, el lobo, el águila real y el leopardo de las nieves); ${KHUNJERAB}`,
    ours: { intakeKgDay: "ración nuestra", childDays: "las crías hibernan con su familia el primer invierno: nuestro", adultDays: "vida desconocida: orden de las marmotas", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, intervalMonths: "nuestro" },
  },
  {
    kind: "animal", id: "pika", name: "Pika orejuda", latin: "Ochotona macrotis", habitat: "pedrera", trophic: 2, shape: "cuadrupedo",
    massKg: 0.15, size: { x: 0.08, y: 0.09, z: 0.18 }, male: 1, color: 0x9c8b72, intakeKgDay: 0.05,
    diet: [{ food: "cojines", pref: 2 }, { food: "pradera" }, { food: "liquen", pref: 0.5 }, { food: "saussurea", pref: 0.5 }, { food: "amapola", pref: 0.3 }],
    childDays: 40, teenDays: 300, adultDays: 750, birthSize: 0.35, gestationMonths: 1, intervalMonths: 12, birthMonth: 6, young: 5,
    survival: 0.55, fastDays: 3, start: 16, cap: 24,
    source: `${WIKI("Large-eared_pika")} (15–20 cm; entre las grietas de las pedreras, sin madrigueras, de 2 300 a 6 130 m; come hierbas, ramitas, líquenes y musgos; algunas guardan heno para el invierno; dos camadas al año de 2–3, unos 30 días de gestación; vive unos tres años; en Pakistán); ${KHUNJERAB}`,
    ours: { massKg: "masa del género, la página no la da", young: "las dos camadas de 2–3 como una de 5: licencia", birthMonth: "nuestro", childDays: "nuestro", teenDays: "nuestro", intakeKgDay: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "ardilla", name: "Ardilla voladora lanuda", latin: "Eupetaurus cinereus", habitat: "bosque", trophic: 2, shape: "cuadrupedo",
    massKg: 2, size: { x: 0.25, y: 0.2, z: 0.5 }, male: 1, color: 0x8f8a84, intakeKgDay: 0.2,
    diet: [{ food: "pino", pref: 3 }, { food: "liquen", pref: 0.3 }],
    childDays: 90, teenDays: 365, adultDays: 3650, birthSize: 0.3, gestationMonths: 1.5, intervalMonths: 12, birthMonth: 6, young: 1,
    survival: 0.85, fastDays: 5, start: 4, cap: 6,
    source: `${WIKI("Western_woolly_flying_squirrel")} (1,4–2,5 kg, 42–60 cm y cola de 43–54 cm; alrededor de Gilgit, valle de Sai; bosques de coníferas altos con cantiles y cuevas; planea bien pese a su tamaño; En peligro según la UICN); Zahler y Khan 2003, «Evidence for dietary specialization on pine needles by the woolly flying squirrel», Journal of Mammalogy 84: 480–486`,
    ours: { intakeKgDay: "nuestro", childDays: "nuestro: su cría no está descrita", teenDays: "nuestro", adultDays: "nuestro", gestationMonths: "nuestro", birthMonth: "nuestro", young: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "zorro", name: "Zorro rojo", latin: "Vulpes vulpes", habitat: "estepa", trophic: 3, shape: "cuadrupedo",
    massKg: 5, size: { x: 0.18, y: 0.38, z: 0.68 }, male: 1.06, color: 0xb8693a, intakeKgDay: 0.5,
    diet: [{ food: "ratones", pref: 2 }, { food: "marmota", stages: ["cria"] }, { food: "pika" }, { food: "perdiz", stages: ["cria"] }, { food: "bharal", stages: ["cria"], pref: 0.3 }, { food: "ibice", stages: ["cria"], pref: 0.3 }, { food: "insectos", pref: 0.5 }, { food: "espino", pref: 0.5 }, { food: "carrona", pref: 0.5 }],
    childDays: 90, teenDays: 270, adultDays: 1300, birthSize: 0.3, gestationMonths: 1.75, intervalMonths: 12, birthMonth: 4, young: 4,
    survival: 0.6, fastDays: 5, start: 4, cap: 6, away: 0.3, huntSuccess: 0.3,
    source: `${WIKI("Red_fox")} (las hembras pesan un 15–20 % menos; celo hacia febrero, 49–58 días de gestación, 4–6 crías en primavera, maduran a los 9–10 meses, viven menos de 5 años en libertad; ~500 g de comida al día; sobre todo roedores, salta sobre ellos guiándose por el oído); ${KHUNJERAB} (zorro rojo de montaña); ${WIKI("Siberian_ibex")} y ${WIKI("Bharal")} (los zorros toman algunas crías)`,
    ours: { massKg: "zorro de montaña, nuestro dentro de 2,2–14 kg", childDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, away: OURS_AWAY, huntSuccess: "nuestro" },
  },
  {
    kind: "animal", id: "leopardo", name: "Leopardo de las nieves", latin: "Panthera uncia", habitat: "farallon", trophic: 4, shape: "cuadrupedo",
    massKg: 37, size: { x: 0.33, y: 0.6, z: 1.15 }, male: 1.1, color: 0xcfcac0, intakeKgDay: 2.5,
    diet: [{ food: "bharal", pref: 3 }, { food: "ibice", pref: 3 }, { food: "markhor" }, { food: "marmota" }, { food: "perdiz", pref: 0.5 }, { food: "pika", pref: 0.3 }],
    childDays: 600, teenDays: 400, adultDays: 4600, birthSize: 0.3, gestationMonths: 3.2, intervalMonths: 24, birthMonth: 5, young: 2,
    survival: 0.88, fastDays: 14, start: 2, cap: 2, away: 0.8, huntSuccess: 0.3,
    source: `${WIKI("Snow_leopard")} (hembras 35–40 kg, machos 45–55 kg; en el Karakórum caza sobre todo íbices; marmotas y picas de presas menores; un adulto necesita 20–30 bharales al año; se aparea a finales del invierno, 90–100 días de gestación, 2–3 crías de abril a junio; las crías se separan de la madre a los 20–22 meses; maduran a los 2–3 años; 15–18 años en libertad; territorio de 12–39 km² en Nepal); ${KHUNJERAB}`,
    ours: { intakeKgDay: "de 20–30 bharales al año, lo que come de verdad: nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: "una pareja: la isla es una parte de su territorio", away: OURS_AWAY, huntSuccess: "nuestro: la fuente no da un porcentaje", intervalMonths: "las crías siguen a la madre casi dos años: un parto cada dos, nuestro" },
  },

  // ── Birds ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    kind: "animal", id: "quebrantahuesos", name: "Quebrantahuesos", latin: "Gypaetus barbatus", habitat: "garganta", trophic: 3, shape: "ave",
    massKg: 6.2, size: { x: 2.6, y: 0.3, z: 1.1 }, male: 0.97, color: 0x4a4540, intakeKgDay: 0.45,
    diet: [{ food: "huesos", pref: 4 }, { food: "carrona", pref: 0.5 }],
    childDays: 115, teenDays: 2550, adultDays: 5100, birthSize: 0.3, gestationMonths: 1.9, intervalMonths: 12, birthMonth: 3, young: 1,
    survival: 0.94, fastDays: 14, start: 2, cap: 2, away: 0.85,
    source: `${WIKI("Bearded_vulture")} (4,5–7,8 kg, 2,31–2,83 m de envergadura; el 70–90 % de lo que come son huesos, que suelta desde 50–150 m sobre las rocas para romperlos; 1–2 huevos, 53–60 días, el pollo pasa 100–130 días en el nido; cría de noviembre a junio en el subcontinente indio; primera cría a los 8 años o más; 21 años de media en libertad; nidos en cuevas y repisas de paredes; hasta 5 000 m en Asia central); ${KHUNJERAB}`,
    ours: { intakeKgDay: "ración nuestra (~7 % de su masa)", young: "de dos huevos sale adelante uno (el mayor mata al menor): nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: "una pareja, nuestro", away: OURS_AWAY },
  },
  {
    kind: "animal", id: "buitre", name: "Buitre del Himalaya", latin: "Gyps himalayensis", habitat: "farallon", trophic: 3, shape: "ave",
    massKg: 9, size: { x: 2.9, y: 0.35, z: 1.15 }, male: 1, color: 0xc9b28c, intakeKgDay: 0.7,
    diet: [{ food: "carrona", pref: 3 }],
    childDays: 150, teenDays: 1800, adultDays: 6000, birthSize: 0.3, gestationMonths: 1.9, intervalMonths: 12, birthMonth: 3, young: 1,
    survival: 0.93, fastDays: 14, start: 6, cap: 8, away: 0.85,
    source: `${WIKI("Himalayan_vulture")} (6–12,5 kg, 9 kg de media; 2,56–3,1 m de envergadura; solo carroña, el 64 % de yak doméstico en el Tíbet; un huevo, 54–58 días; pone del 25 de diciembre al 7 de marzo; colonias de 5–7 parejas en repisas de un cantil; de 1 200 a 5 500 m); ${KHUNJERAB}`,
    ours: { intakeKgDay: "ración nuestra", childDays: "los pollos siguen con los padres 6–7 meses: en el nido, nuestro", teenDays: "madurez del género Gyps, nuestra", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: "una colonia de cuatro parejas, nuestro", away: OURS_AWAY },
  },
  {
    kind: "animal", id: "aguila", name: "Águila real", latin: "Aquila chrysaetos", habitat: "farallon", trophic: 4, shape: "ave",
    massKg: 5.1, size: { x: 2.1, y: 0.3, z: 0.9 }, male: 0.9, color: 0x5a3e28, intakeKgDay: 0.24,
    diet: [{ food: "marmota", pref: 3 }, { food: "pika", pref: 1.5 }, { food: "perdiz" }, { food: "ibice", stages: ["cria"], pref: 0.5 }, { food: "markhor", stages: ["cria"], pref: 0.5 }, { food: "bharal", stages: ["cria"], pref: 0.3 }, { food: "chova", pref: 0.3 }, { food: "carrona", pref: 0.3 }],
    childDays: 75, teenDays: 1640, adultDays: 6000, birthSize: 0.3, gestationMonths: 1.4, intervalMonths: 12, birthMonth: 4, young: 1,
    survival: 0.9, fastDays: 10, start: 2, cap: 2, away: 0.6, huntSuccess: 0.2,
    source: `${WIKI("Golden_eagle")} (hembras ~5,1 kg, machos ~3,6 kg; 1,8–2,34 m; picados de 240–320 km/h; sobre todo liebres y marmotas; 230–250 g al día; hasta cuatro huevos, unas seis semanas, el pollo vuela a los 66–81 días; adulto a los 5,5–6,5 años, territorio propio a los 4–5; hasta 32 años; un 20 % de las cazas acaban en captura); ${KHUNJERAB}; ${WIKI("Siberian_ibex")} y ${ADW("Capra falconeri")} (las águilas toman cabritos); ${WIKI("Alpine_chough")} (las águilas reales cazan chovas)`,
    ours: { young: "suele salir adelante un pollo: nuestro", birthMonth: "pone a finales de invierno en el Himalaya: nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: "una pareja, nuestro", away: OURS_AWAY },
  },
  {
    kind: "animal", id: "cernicalo", name: "Cernícalo vulgar", latin: "Falco tinnunculus", habitat: "pradera", trophic: 3, shape: "ave",
    massKg: 0.18, size: { x: 0.74, y: 0.12, z: 0.34 }, male: 0.95, color: 0xa0603a, intakeKgDay: 0.1,
    diet: [{ food: "ratones", pref: 3 }, { food: "insectos" }],
    childDays: 32, teenDays: 330, adultDays: 1500, birthSize: 0.3, gestationMonths: 1, intervalMonths: 12, birthMonth: 6, young: 4,
    survival: 0.65, fastDays: 1.5, start: 4, cap: 6,
    source: `${WIKI("Common_kestrel")} (hembras 154–314 g; 65–82 cm; se cierne a 10–20 m contra el viento y se lanza en picado corto; 4–8 topillos al día; 3–7 huevos, unas 4 semanas, vuela a las 4–5 semanas; cría en abril o mayo; las hembras crían al año; la mayoría muere antes de los 2 años); ${KHUNJERAB}`,
    ours: { young: "nuestro dentro de 3–7", birthMonth: "nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "chova", name: "Chova piquigualda", latin: "Pyrrhocorax graculus", habitat: "farallon", trophic: 3, shape: "ave",
    massKg: 0.21, size: { x: 0.8, y: 0.12, z: 0.38 }, male: 1.05, color: 0x151515, intakeKgDay: 0.05,
    diet: [{ food: "insectos", pref: 2 }, { food: "enebro" }, { food: "espino" }, { food: "carrona", pref: 0.3 }],
    childDays: 30, teenDays: 700, adultDays: 3650, birthSize: 0.3, gestationMonths: 0.7, intervalMonths: 12, birthMonth: 6, young: 4,
    survival: 0.87, fastDays: 1.5, start: 12, cap: 18,
    source: `${WIKI("Alpine_chough")} (191–244 g la del Himalaya, 75–85 cm; cría a 3 500–5 000 m en el Himalaya y ha anidado a 6 500 m, más alto que ninguna otra ave; sigue a los escaladores a 8 200 m en el Everest; insectos en verano, bayas en invierno; 3–5 huevos, 14–21 días, vuela a los 29–31; empieza a anidar a principios de mayo; supervivencia adulta del 83–92 %; siempre en bandadas; vuelo acrobático); ${KHUNJERAB}`,
    ours: { intakeKgDay: OURS_INTAKE_BIRD, teenDays: "nuestro", adultDays: "nuestro", cap: OURS_CAP },
  },
  {
    kind: "animal", id: "treparriscos", name: "Treparriscos", latin: "Tichodroma muraria", habitat: "garganta", trophic: 3, shape: "pajaro",
    massKg: 0.018, size: { x: 0.28, y: 0.08, z: 0.16 }, male: 1, color: 0x8a9096, intakeKgDay: 0.006,
    diet: [{ food: "aranas", pref: 2 }, { food: "voladores" }, { food: "insectos", pref: 0.5 }],
    childDays: 29, teenDays: 335, adultDays: 1460, birthSize: 0.35, gestationMonths: 0.65, intervalMonths: 12, birthMonth: 7, young: 4,
    survival: 0.6, fastDays: 1, start: 4, cap: 6,
    source: `${WIKI("Wallcreeper")} (17–19 g, 15,5–17 cm; cría entre 3 600 y 5 100 m en el Himalaya; busca insectos y arañas en las paredes de roca; 4–5 huevos, 19–20 días, vuela a los 28–30; baja en invierno); ${KHUNJERAB}`,
    ours: { intakeKgDay: OURS_INTAKE_BIRD, birthMonth: "nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "perdiz", name: "Perdiz nival del Himalaya", latin: "Tetraogallus himalayensis", habitat: "cresta", trophic: 2, shape: "ave",
    massKg: 2.5, size: { x: 0.9, y: 0.4, z: 0.65 }, male: 1.08, color: 0x8f8a80, intakeKgDay: 0.15,
    diet: [{ food: "cojines", pref: 2 }, { food: "pradera" }, { food: "artemisa" }],
    childDays: 60, teenDays: 300, adultDays: 2500, birthSize: 0.25, gestationMonths: 0.9, intervalMonths: 12, birthMonth: 6, young: 7,
    survival: 0.7, fastDays: 4, start: 8, cap: 12,
    source: `${WIKI("Himalayan_snowcock")} (2–3,1 kg, 55–74 cm; 4 000–5 000 m en verano; brotes, bayas, semillas, bulbos y hojas de artemisa, en Hunza sobre todo Sibbaldia cuneata; 5–12 huevos, 27–28 días; cría de abril a junio; sube corriendo la ladera y se lanza en planeo valle abajo; la caza el águila real); ${KHUNJERAB}`,
    ours: { intakeKgDay: "ración nuestra", young: "nuestro dentro de 5–12", childDays: "nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "paloma", name: "Paloma nival", latin: "Columba leuconota", habitat: "garganta", trophic: 2, shape: "ave",
    massKg: 0.3, size: { x: 0.65, y: 0.12, z: 0.34 }, male: 1, color: 0xdcdcd6, intakeKgDay: 0.03,
    diet: [{ food: "pradera" }, { food: "artemisa", pref: 0.5 }, { food: "enebro" }, { food: "espino", pref: 0.5 }],
    childDays: 30, teenDays: 335, adultDays: 2500, birthSize: 0.3, gestationMonths: 0.6, intervalMonths: 12, birthMonth: 6, young: 2,
    survival: 0.7, fastDays: 2, start: 12, cap: 18,
    source: `${WIKI("Snow_pigeon")} (hasta la línea de la nieve; bayas, grano, yemas, bulbos, semillas y brotes; anida en colonias en grietas y cuevas de los cantiles; dos huevos; en invierno bandadas de 150 o más); ${KHUNJERAB}`,
    ours: { massKg: "masa nuestra, la página no la da", intakeKgDay: OURS_INTAKE_BIRD, gestationMonths: "incubación de las palomas, nuestra", birthMonth: "nuestro", childDays: "nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "vencejo", name: "Vencejo real", latin: "Tachymarptis melba", habitat: "aire", trophic: 3, shape: "pajaro",
    massKg: 0.1, size: { x: 0.57, y: 0.08, z: 0.22 }, male: 1, color: 0x6b5a48, intakeKgDay: 0.02,
    diet: [{ food: "voladores" }],
    childDays: 50, teenDays: 700, adultDays: 3000, birthSize: 0.3, gestationMonths: 0.65, intervalMonths: 12, birthMonth: 7, young: 2,
    survival: 0.8, fastDays: 2, start: 0, cap: 14, away: 0.5,
    visitor: { windows: [{ arrive: 5, leave: 9 }], count: 10, breeds: true, from: "inverna en el sur de Asia y en África" },
    source: `${WIKI("Alpine_swift")} (~100 g, 54–60 cm; cría en montañas del sur de Europa al Himalaya y Pakistán; en 2013 el equipo de Liechti midió más de 200 días seguidos en el aire; insectos voladores; 1–4 huevos, los pollos dejan el nido a los ~50 días; colonias en grietas de cantiles; muy migrador)`,
    ours: { intakeKgDay: OURS_INTAKE_BIRD, gestationMonths: "incubación nuestra", birthMonth: "nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, visitor: "llega en mayo y se va en septiembre: meses nuestros, la página no los da", away: OURS_AWAY },
  },
  {
    kind: "animal", id: "ansar", name: "Ánsar indio", latin: "Anser indicus", habitat: "aire", trophic: 2, shape: "ave",
    massKg: 2.5, size: { x: 1.5, y: 0.3, z: 0.75 }, male: 1.05, color: 0xd8d6cf, intakeKgDay: 0.4,
    diet: [{ food: "pradera" }],
    childDays: 55, teenDays: 700, adultDays: 5000, birthSize: 0.3, gestationMonths: 0.95, intervalMonths: 12, birthMonth: 6, young: 4,
    survival: 0.85, fastDays: 7, start: 0, cap: 16, away: 0.9,
    visitor: { windows: [{ arrive: 10, leave: 12 }, { arrive: 3, leave: 5 }], count: 12, from: "cría en los lagos de Asia central y del Tíbet e inverna en la India y Pakistán" },
    source: `${WIKI("Bar-headed_goose")} (1,87–3,2 kg; un ganso marcado subió a 7 290 m, el 95 % del tiempo por debajo de 5 784 m; cruza el Himalaya sin parar en siete horas; pasta hierba corta; 3–8 huevos; cría en Asia central); Köppen et al. 2010, «Seasonal migrations of four individual bar-headed geese Anser indicus from Kyrgyzstan followed by satellite telemetry», Journal of Ornithology 151: 703–712 (de Kirguistán a invernar en Pakistán y la India, cruzando cumbres muy altas)`,
    ours: { intakeKgDay: "ración nuestra", visitor: "pasa en octubre-noviembre y en marzo-abril: meses nuestros del orden de las paradas de la fuente", childDays: "nuestro", teenDays: "nuestro", adultDays: "nuestro", survival: OURS_SURV, fastDays: OURS_FAST, cap: "una bandada, nuestro", away: OURS_AWAY },
  },
];

/** What is left of a body: carrion for the vultures, the fox and the eagle; bones for the bearded vulture. */
export const REMAINS: readonly RemainsSpec[] = [
  {
    id: "carrona", name: "Carroña", share: 0.8, shareKilled: 0.3, rotPerDay: 0.08, inflowKgDay: 2,
    reality: "licencia",
    source: `ritmo de descomposición nuestro; lo que llega de fuera (cadáveres de ganado y de animales del resto de la cordillera) es nuestro, del orden de ${WIKI("Himalayan_vulture")} (el 64 % de su comida en el Tíbet es yak doméstico muerto)`,
  },
  {
    id: "huesos", name: "Huesos", share: 0.15, shareKilled: 0.15, rotPerDay: 0.004, inflowKgDay: 0.5,
    reality: "licencia",
    source: `${WIKI("Bearded_vulture")} (huesos de cadáveres: el 70–90 % de la dieta del quebrantahuesos); que un esqueleto sea ~15 % del cuerpo, que duren meses y lo que llega de fuera, nuestro`,
  },
];

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

/** The air biome: the Hunza–Nagar valleys from the valley floor to Khunjerab. Day 0 is 20 November (Berón's day). */
export const AIR_BIOME: BiomeDef = {
  id: "aire",
  name: "Karakórum (Hunza–Nagar)",
  species: SPECIES,
  remains: REMAINS,
  climate: CLIMATE,
  startDayOfYear: 323,
  elsewhere: "a otra parte de la cordillera",
};

/** The species of the air biome (the census and the scene read them). */
export const BIOME = SPECIES;
export const biomeSpec = (id: string): BiomeSpec | undefined => SPECIES.find((s) => s.id === id);
export const nameOf = (id: string): string => REMAINS.find((r) => r.id === id)?.name ?? biomeSpec(id)?.name ?? id;

/** The reality of a species' field: real from its source, or licencia if it is ours. */
export function realityOf(s: BiomeSpec, field: string): Reality {
  return s.ours && field in s.ours ? "licencia" : "real";
}
