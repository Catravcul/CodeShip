import type { Reality } from "@core/reality";

/**
 * THE BIOME of sanctuary 3 (Berón, 2026-11-19: «crear un bioma donde hay animales y plantas de todo tipo para cumplir
 * una cadena alimenticia y que sigan sus ciclos de vida naturales»; docs/design/bioma-s3.md). A subantarctic island
 * food web like South Georgia's (Bird Island, King Edward Point): the same cold world as Cold Sanctuary, «entre polos
 * y tierra». Cold Sanctuary's four aerial birds and its marine fish keep their keys and numbers
 * (docs/fauna-fria-santuarios.md); the rest comes from the literature.
 *
 * Every species carries ONE source for its numbers (all `real` unless the species' `ours` names the field: then that
 * number is `licencia`, a value of ours of the right order, and the note says why). Ages are real days of biology; the
 * game compresses the calendar (domain/bioma.ts, `BIO_DAYS_PER_GAME_DAY`).
 */

export type Stage = "cria" | "joven" | "adulto" | "anciano";
export type Habitat = "colonia" | "playa" | "tussac" | "musgo" | "roca" | "mar" | "aire" | "suelo";
export type BodyShape = "pinnipedo" | "pinguino" | "ave" | "pajaro";

/** What a consumer eats: a food (species id or "carrona") and, for animals, which of its stages. `pref` weighs it. */
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

/** A plant (or the phytoplankton): biomass that grows with the light and the warmth of the season and is grazed. */
export interface PlantSpec extends Base {
  readonly kind: "planta";
  /** Annual production over the standing crop at half the cover (P/B, per year). */
  readonly perYear: number;
  /** The most it covers in the biome (kg fresh mass). */
  readonly stockKg: number;
  /** No growth under this mean temperature (°C). */
  readonly minTempC: number;
  /** Grows on the sea's temperature (Eppley's curve) instead of the air's. */
  readonly sea?: boolean;
  /** Grows faster where seals and birds leave their guano (tussac: Smith 1985). */
  readonly guano?: boolean;
  /** Habitat for young fish (kelp forests as nurseries): lowers what is eaten of the fish's young. */
  readonly nursery?: boolean;
}

/** Many small animals (krill, fish, squid, soil invertebrates): counted by yearly cohorts, not one by one. */
export interface SwarmSpec extends Base {
  readonly kind: "banco";
  readonly trophic: 1 | 2 | 3 | 4;
  readonly adultMassKg: number;
  readonly maxAgeYears: number;
  readonly matureYears: number;
  /** Spawning: first month (1 = January) and how many months. */
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
  /** Krill's recruitment changes a lot from one year to the next (Murphy et al. 2007). */
  readonly variable?: boolean;
}

/** A vertebrate lived one by one: born, grows, breeds by its calendar, hunts or flees, and dies. */
export interface AnimalSpec extends Base {
  readonly kind: "animal";
  readonly trophic: 2 | 3 | 4;
  readonly shape: BodyShape;
  /** The adult female's mass (kg) and size (m: x across, y up, z long or the wingspan in x for a bird). */
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
  /** A summer visitor that breeds elsewhere: present from `arrive` to before `leave` (months). */
  readonly visitor?: { readonly arrive: number; readonly leave: number; readonly count: number };
  /** Chance a hunt of this predator ends in a catch. */
  readonly huntSuccess?: number;
}

export type BiomeSpec = PlantSpec | SwarmSpec | AnimalSpec;

const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const CS_FAUNA = "Cold Sanctuary, docs/fauna-fria-santuarios.md (NZ Birds Online, ADW, FishBase, CCAMLR)";
const CS_CHAIN = "Cold Sanctuary, Assets/Scripts/World/FoodChain.cs (Intake: ración diaria)";
const OURS_SURV = "supervivencia anual del orden publicado para su grupo; sin serie propia de esta especie";
const OURS_FAST = "días de ayuno del orden de su grupo (las focas y pingüinos ayunan semanas en la cría y la muda; los pájaros, horas)";
const OURS_INTAKE = "ración estimada con la regla de las aves marinas y focas (~10–15 % de la masa en aves, ~5–7 % en focas)";
const OURS_CAP = "el presupuesto del móvil (docs/design/bioma-s3.md §Presupuesto), no un censo real";

export const BIOME: readonly BiomeSpec[] = [
  // ── Producers ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    kind: "planta", id: "fitoplancton", name: "Fitoplancton (diatomeas)", latin: "Bacillariophyceae", habitat: "mar",
    perYear: 40, stockKg: 60_000, minTempC: -2, sea: true,
    source: `Eppley 1972, Fishery Bulletin 70:1063 (crecimiento máximo 0,59·e^(0,0633·T) por día); la floración de verano de Georgia del Sur (Korb et al. 2008, Deep-Sea Res. II 55)`,
    ours: { stockKg: "la biomasa del mar del bioma, de orden de una floración (Chl ~5 mg/m³); la cadena la sube si hace falta", perYear: "P/B de orden de una población que se duplica en días en verano" },
  },
  {
    kind: "planta", id: "kelp", name: "Kelp gigante", latin: "Macrocystis pyrifera", habitat: "mar", perYear: 3, stockKg: 30_000, minTempC: -2, sea: true, nursery: true,
    source: `${WIKI("Macrocystis_pyrifera")} (frondes de hasta 45 m; crece hasta 60 cm al día); bosques de kelp de Georgia del Sur como guardería de peces`,
    ours: { perYear: "renovación anual de la fronda en agua fría", stockKg: "un bosque de kelp de ~1 ha", nursery: "el efecto guardería es real; cuánto protege es nuestro" },
  },
  {
    kind: "planta", id: "tussac", name: "Tussac", latin: "Poa flabellata", habitat: "tussac", perYear: 1.2, stockKg: 180_000, minTempC: 0, guano: true,
    source: `${WIKI("Poa_flabellata")} (matas de ~2 m sobre pedestales; colonias de focas, pingüinos y albatros dentro); Smith 1985, «Growth and production of Poa flabellata in relation to soil nutrient status and exposure at South Georgia»; Walton, Greene y Callaghan 1975, BAS Bulletin 41/42`,
    ours: { perYear: "las fuentes miden más producción junto a las colonias; la tasa es nuestra", stockKg: "matas sobre ~2 ha" },
  },
  {
    kind: "planta", id: "hierba-pilosa", name: "Hierba pilosa antártica", latin: "Deschampsia antarctica", habitat: "musgo", perYear: 0.8, stockKg: 6_000, minTempC: 0,
    source: `${WIKI("Deschampsia_antarctica")} (una de las dos plantas con flor de la Antártida; florece en verano)`,
    ours: { perYear: "tasa nuestra", stockKg: "céspedes sueltos entre el musgo" },
  },
  {
    kind: "planta", id: "musgo", name: "Banco de musgo", latin: "Chorisodontium aciphyllum, Polytrichum strictum", habitat: "musgo", perYear: 0.15, stockKg: 40_000, minTempC: 0,
    source: "Fenton 1980, «The rate of peat accumulation in Antarctic moss banks», Journal of Ecology 68:211–228 (crecen unos milímetros al año)",
    ours: { perYear: "del crecimiento de mm/año pasado a biomasa: nuestro", stockKg: "bancos sobre ~1 ha" },
  },
  {
    kind: "planta", id: "liquen", name: "Liquen", latin: "Usnea antarctica", habitat: "roca", perYear: 0.05, stockKg: 3_000, minTempC: -1,
    source: "Sancho, Green y Pintado 2007, «Slowest to fastest: extreme range in lichen growth rates…», Flora 202:667–673 (de centésimas de mm a mm al año; más rápido en la Antártida marítima)",
    ours: { perYear: "tasa nuestra dentro del rango de la fuente", stockKg: "las rocas de la isla" },
  },

  // ── Invertebrates, squid and fish (cohorts) ───────────────────────────────────────────────────────────────────
  {
    kind: "banco", id: "kril", name: "Kril antártico", latin: "Euphausia superba", habitat: "mar", trophic: 2,
    adultMassKg: 0.001, maxAgeYears: 6, matureYears: 2, spawnMonth: 1, spawnMonths: 3, perYear: 1, mortality: 0.8, intakePerDay: 0.08,
    diet: [{ food: "fitoplancton" }], stockKg: 40_000, variable: true,
    source: `${WIKI("Antarctic_krill")} (hasta 6 cm y 2 g, vive hasta 6 años, madura a los 2–3, desova de enero a marzo, come diatomeas); CCAMLR (mortalidad natural de 0,66–1,35 al año); Murphy et al. 2007, Phil. Trans. R. Soc. B 362:113 (años malos de kril en Georgia del Sur)`,
    ours: { intakePerDay: "ración nuestra (el kril come del 5 al 20 % de su carbono al día)", stockKg: "biomasa del mar del bioma; la cadena la sube", perYear: "P/B de orden de 1" },
  },
  {
    kind: "banco", id: "colembolo", name: "Colémbolo antártico", latin: "Cryptopygus antarcticus", habitat: "suelo", trophic: 2,
    adultMassKg: 5e-8, maxAgeYears: 3, matureYears: 1, spawnMonth: 12, spawnMonths: 3, perYear: 1.2, mortality: 0.8, intakePerDay: 0.05,
    diet: [{ food: "musgo" }, { food: "liquen", pref: 0.5 }, { food: "hierba-pilosa", pref: 0.5 }], stockKg: 40,
    source: `${WIKI("Cryptopygus_antarcticus")} (1–2 mm; come algas, hongos y restos de musgo; decenas de miles por m²)`,
    ours: { maxAgeYears: "vida de varios años en el frío, orden nuestro", perYear: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", mortality: "nuestro", spawnMonth: "verano" },
  },
  {
    kind: "banco", id: "mosquito", name: "Mosquito sin alas", latin: "Belgica antarctica", habitat: "suelo", trophic: 2,
    adultMassKg: 1e-6, maxAgeYears: 2, matureYears: 1, spawnMonth: 12, spawnMonths: 2, perYear: 0.8, mortality: 0.5, intakePerDay: 0.05,
    diet: [{ food: "musgo" }, { food: "tussac", pref: 0.5 }], stockKg: 30,
    source: "US Antarctic Program, The Antarctic Sun (2020-06-29), «Insects in the Extreme» (2 años de larva en el musgo y el guano; el adulto, sin alas ni boca, vive 10–14 días en verano)",
    ours: { perYear: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", mortality: "nuestro", adultMassKg: "larva de ~1 mg" },
  },
  {
    kind: "banco", id: "calamar", name: "Calamar volador de siete estrellas", latin: "Martialia hyadesi", habitat: "mar", trophic: 3,
    adultMassKg: 0.5, maxAgeYears: 1, matureYears: 0, spawnMonth: 7, spawnMonths: 2, perYear: 3, mortality: 1.5, intakePerDay: 0.05,
    diet: [{ food: "kril", pref: 2 }, { food: "linterna" }], stockKg: 3_000,
    source: `${WIKI("Martialia_hyadesi")} (calamar del frente polar; presa de albatros, elefantes marinos y austromerluzas; come kril y mictófidos)`,
    ours: { maxAgeYears: "vida de un año, como los omastréfidos", spawnMonth: "invierno, nuestro", perYear: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", mortality: "nuestro", adultMassKg: "nuestro" },
  },
  {
    kind: "banco", id: "linterna", name: "Pez linterna", latin: "Electrona antarctica", habitat: "mar", trophic: 3,
    adultMassKg: 0.012, maxAgeYears: 4, matureYears: 2, spawnMonth: 12, spawnMonths: 2, perYear: 1, mortality: 0.9, intakePerDay: 0.03,
    diet: [{ food: "kril" }], stockKg: 6_000,
    source: "FishBase, Electrona antarctica (hasta 11,5 cm; come eufausiáceos y copépodos; presa de pingüinos, focas y aves)",
    ours: { maxAgeYears: "orden de los mictófidos antárticos", matureYears: "nuestro", spawnMonth: "nuestro", perYear: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", mortality: "nuestro" },
  },
  {
    kind: "banco", id: "pez-hielo", name: "Pez de hielo", latin: "Chaenocephalus aceratus", habitat: "mar", trophic: 3,
    adultMassKg: 1, maxAgeYears: 15, matureYears: 6, spawnMonth: 4, spawnMonths: 2, perYear: 0.4, mortality: 0.3, intakePerDay: 0.015,
    diet: [{ food: "linterna" }, { food: "kril" }], stockKg: 4_000,
    source: `${CS_FAUNA} (Icefish: 72 cm y 3,7 kg, sin hemoglobina, 5–770 m en Bouvet y el mar de Scotia); FishBase, Chaenocephalus aceratus (come peces y kril)`,
    ours: { maxAgeYears: "nuestro", matureYears: "nuestro", spawnMonth: "otoño, nuestro", perYear: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", mortality: "nuestro", adultMassKg: "adulto típico, menor que el máximo" },
  },
  {
    kind: "banco", id: "austromerluza", name: "Austromerluza antártica", latin: "Dissostichus mawsoni", habitat: "mar", trophic: 4,
    adultMassKg: 25, maxAgeYears: 48, matureYears: 15, spawnMonth: 6, spawnMonths: 3, perYear: 0.2, mortality: 0.13, intakePerDay: 0.01,
    diet: [{ food: "pez-hielo", pref: 2 }, { food: "linterna" }, { food: "calamar" }], stockKg: 3_000,
    source: `${CS_FAUNA} (Toothfish: 2 m y 80 kg, madura a los 13–17 años, vive 48, caza pez de hielo); CCAMLR, evaluaciones del mar de Ross (mortalidad natural 0,13 al año)`,
    ours: { spawnMonth: "invierno, nuestro", perYear: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", adultMassKg: "adulto típico" },
  },

  // ── Birds ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    kind: "animal", id: "papua", name: "Pingüino papúa", latin: "Pygoscelis papua", habitat: "colonia", trophic: 3, shape: "pinguino",
    massKg: 5.5, size: { x: 0.42, y: 0.75, z: 0.4 }, male: 1.05, color: 0x22252a, intakeKgDay: 0.9,
    diet: [{ food: "kril", pref: 2 }, { food: "linterna" }, { food: "pez-hielo", pref: 0.5 }],
    childDays: 85, teenDays: 645, adultDays: 4745, birthSize: 0.25, gestationMonths: 1.2, intervalMonths: 12, birthMonth: 12, young: 2,
    survival: 0.85, fastDays: 20, start: 14, cap: 22,
    source: `${WIKI("Gentoo_penguin")} y ADW, Pygoscelis papua (5–8,5 kg y 51–90 cm; 2 huevos, 34–36 días de incubación, los pollos van al mar a los 80–100 días; crían desde los 2 años; viven 15–20; comen kril y peces); en Georgia del Sur ponen en octubre-noviembre`,
    ours: { intakeKgDay: OURS_INTAKE, survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, birthSize: "pollo de ~100 g: la talla al cubo" },
  },
  {
    kind: "animal", id: "damero", name: "Petrel damero", latin: "Daption capense", habitat: "roca", trophic: 3, shape: "ave",
    massKg: 0.45, size: { x: 0.85, y: 0.12, z: 0.38 }, male: 1, color: 0xf2f2f2, intakeKgDay: 0.1,
    diet: [{ food: "kril", pref: 2 }, { food: "linterna" }, { food: "carrona", pref: 0.5 }],
    childDays: 52, teenDays: 1773, adultDays: 12775, birthSize: 0.35, gestationMonths: 1.5, intervalMonths: 12, birthMonth: 1, young: 1,
    survival: 0.93, fastDays: 5, start: 8, cap: 10,
    source: `${CS_FAUNA} (CapePetrel: 0,85 m, 0,45 kg; 1 huevo, 45 días, pollo 52 días; cría desde los 5 años; más de 40); ${CS_CHAIN}`,
    ours: { survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, birthMonth: "pone en noviembre-diciembre: eclosión en enero", birthSize: "nuestro" },
  },
  {
    kind: "animal", id: "albatros", name: "Albatros viajero", latin: "Diomedea exulans", habitat: "tussac", trophic: 4, shape: "ave",
    massKg: 9, size: { x: 3, y: 0.3, z: 1.2 }, male: 1.1, color: 0xfafafa, intakeKgDay: 0.85,
    diet: [{ food: "calamar", pref: 3 }, { food: "pez-hielo" }, { food: "carrona", pref: 0.5 }],
    childDays: 270, teenDays: 3745, adultDays: 17885, birthSize: 0.3, gestationMonths: 2.6, intervalMonths: 24, birthMonth: 3, young: 1,
    survival: 0.95, fastDays: 20, start: 3, cap: 4,
    source: `${CS_FAUNA} (WanderingAlbatross: 3 m, 9 kg; 1 huevo cada dos años, 11 semanas, pollo 7–10 meses; cría a los 10–15 años; más de 60); ${WIKI("Wandering_albatross")} (pone en diciembre-enero; calamar y peces); ${CS_CHAIN}`,
    ours: { survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, birthSize: "nuestro" },
  },
  {
    kind: "animal", id: "pagalo", name: "Págalo polar", latin: "Stercorarius maccormicki", habitat: "musgo", trophic: 4, shape: "ave",
    massKg: 1.3, size: { x: 1.35, y: 0.18, z: 0.53 }, male: 0.95, color: 0x6b5a48, intakeKgDay: 0.25,
    diet: [{ food: "papua", stages: ["cria"], pref: 2 }, { food: "damero", stages: ["cria"] }, { food: "bisbita", stages: ["cria", "joven"], pref: 0.5 }, { food: "linterna" }, { food: "carrona" }],
    childDays: 52, teenDays: 2503, adultDays: 6570, birthSize: 0.3, gestationMonths: 1, intervalMonths: 12, birthMonth: 1, young: 2,
    survival: 0.9, fastDays: 7, start: 4, cap: 6, huntSuccess: 0.35,
    source: `${CS_FAUNA} (PolarSkua: 1,35 m, 1,3 kg; 1–2 huevos, 26–34 días, pollo 45–59; cría a los 6–9 años; más de 25); ${WIKI("South_polar_skua")} (peces, huevos y pollos de pingüino, carroña); ${CS_CHAIN}`,
    ours: { survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, huntSuccess: "nuestro", birthSize: "nuestro", birthMonth: "pone en diciembre: eclosión en enero" },
  },
  {
    kind: "animal", id: "charran", name: "Charrán ártico", latin: "Sterna paradisaea", habitat: "aire", trophic: 3, shape: "ave",
    massKg: 0.1, size: { x: 0.8, y: 0.08, z: 0.35 }, male: 1, color: 0xe6e9ec, intakeKgDay: 0.03,
    diet: [{ food: "kril", pref: 2 }, { food: "linterna" }],
    childDays: 22, teenDays: 1438, adultDays: 9855, birthSize: 0.3, gestationMonths: 0.7, intervalMonths: 12, birthMonth: 7, young: 2,
    survival: 0.9, fastDays: 2, start: 0, cap: 8, visitor: { arrive: 11, leave: 4, count: 6 },
    source: `${CS_FAUNA} (ArcticTern: 0,8 m, 0,1 kg; cría en el norte —1–3 huevos, 20–24 días, pollo 21–24—, madura a los 4, vive 31; solo visita el hielo del sur por temporadas); ${CS_CHAIN}`,
    ours: { survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, visitor: "en el mar austral de noviembre a marzo; cuántos llegan es nuestro", birthSize: "nuestro" },
  },
  {
    kind: "animal", id: "bisbita", name: "Bisbita de Georgia del Sur", latin: "Anthus antarcticus", habitat: "tussac", trophic: 3, shape: "pajaro",
    massKg: 0.036, size: { x: 0.26, y: 0.1, z: 0.17 }, male: 1, color: 0x8a7350, intakeKgDay: 0.012,
    diet: [{ food: "mosquito", pref: 2 }, { food: "colembolo" }],
    childDays: 30, teenDays: 335, adultDays: 1460, birthSize: 0.4, gestationMonths: 0.5, intervalMonths: 12, birthMonth: 12, young: 4,
    survival: 0.6, fastDays: 1.5, start: 8, cap: 12,
    source: `${WIKI("South_Georgia_pipit")} (17 cm, 36 g; el único pájaro cantor de la Antártida; insectos y arañas; anida en el tussac; 4 huevos al año); BirdLife, Anthus antarcticus (cría de noviembre a febrero)`,
    ours: { intakeKgDay: "un tercio de su masa, la regla de los pájaros pequeños", survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, childDays: "incubación y nido de ~2 semanas cada uno, como sus parientes", teenDays: "cría al año", adultDays: "vida desconocida: orden de los bisbitas", birthSize: "nuestro" },
  },
  {
    kind: "animal", id: "picovaina", name: "Picovaina nevado", latin: "Chionis albus", habitat: "colonia", trophic: 3, shape: "ave",
    massKg: 0.65, size: { x: 0.8, y: 0.2, z: 0.4 }, male: 1.1, color: 0xf6f6f2, intakeKgDay: 0.1,
    diet: [{ food: "papua", stages: ["cria"], pref: 1 }, { food: "kril" }, { food: "carrona", pref: 2 }],
    childDays: 55, teenDays: 1040, adultDays: 3650, birthSize: 0.35, gestationMonths: 1, intervalMonths: 12, birthMonth: 1, young: 2,
    survival: 0.85, fastDays: 4, start: 4, cap: 6, huntSuccess: 0.25,
    source: `${WIKI("Snowy_sheathbill")} (460–780 g; anda más que vuela; carroñero y ladrón de kril, huevos y pollos de pingüino; pone 2–3 huevos en diciembre, 28–32 días, el pollo vuela a los 50–60)`,
    ours: { intakeKgDay: OURS_INTAKE, survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, teenDays: "madurez nuestra", adultDays: "vida nuestra", huntSuccess: "nuestro", birthSize: "nuestro" },
  },

  // ── Seals ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    kind: "animal", id: "lobo", name: "Lobo marino antártico", latin: "Arctocephalus gazella", habitat: "playa", trophic: 3, shape: "pinnipedo",
    massKg: 38, size: { x: 0.4, y: 0.45, z: 1.3 }, male: 1.45, color: 0x5a4a3c, intakeKgDay: 2.7,
    diet: [{ food: "kril", pref: 3 }, { food: "linterna" }, { food: "pez-hielo" }, { food: "calamar", pref: 0.5 }],
    childDays: 120, teenDays: 1158, adultDays: 7118, birthSize: 0.5, gestationMonths: 11.7, intervalMonths: 12, birthMonth: 12, young: 1,
    survival: 0.88, fastDays: 10, start: 10, cap: 14,
    source: `${WIKI("Antarctic_fur_seal")} (hembras 22–51 kg, machos hasta 215 kg; crías a finales de noviembre-diciembre, lactancia de ~4 meses; gestación de ~51 semanas con implantación diferida; hembras maduras a los 3–4 años, viven hasta 23; comen kril, peces y calamar; el 95 % cría en Georgia del Sur)`,
    ours: { intakeKgDay: OURS_INTAKE, survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "elefante", name: "Elefante marino del sur", latin: "Mirounga leonina", habitat: "playa", trophic: 4, shape: "pinnipedo",
    massKg: 500, size: { x: 0.9, y: 0.8, z: 2.8 }, male: 1.6, color: 0x7a6a5a, intakeKgDay: 25,
    diet: [{ food: "calamar", pref: 3 }, { food: "austromerluza" }, { food: "pez-hielo" }],
    childDays: 23, teenDays: 1437, adultDays: 6935, birthSize: 0.45, gestationMonths: 11, intervalMonths: 12, birthMonth: 10, young: 1,
    survival: 0.85, fastDays: 40, start: 5, cap: 6,
    source: `${WIKI("Southern_elephant_seal")} (hembras 400–900 kg y 2,6–3 m, machos hasta 3 700 kg y 4,5–5,8 m; en Georgia del Sur paren de septiembre a noviembre con el pico a mediados de octubre; lactancia de ~23 días; ayunan en tierra; calamar y peces)`,
    ours: { intakeKgDay: OURS_INTAKE, survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP },
  },
  {
    kind: "animal", id: "leopardo", name: "Foca leopardo", latin: "Hydrurga leptonyx", habitat: "playa", trophic: 4, shape: "pinnipedo",
    massKg: 400, size: { x: 0.75, y: 0.65, z: 3.0 }, male: 0.9, color: 0x6e7378, intakeKgDay: 14,
    diet: [{ food: "kril", pref: 1.5 }, { food: "papua", stages: ["joven", "adulto", "anciano"], pref: 2 }, { food: "lobo", stages: ["cria", "joven"], pref: 1.5 }, { food: "pez-hielo" }, { food: "linterna" }],
    childDays: 28, teenDays: 1432, adultDays: 8030, birthSize: 0.45, gestationMonths: 11, intervalMonths: 12, birthMonth: 11, young: 1,
    survival: 0.9, fastDays: 20, start: 2, cap: 3, huntSuccess: 0.5,
    source: `${WIKI("Leopard_seal")} (200–600 kg, la hembra mayor, hasta 3,5 m; crías en noviembre-diciembre, lactancia de ~4 semanas; maduran a los 3–7 años, viven ~26; kril, pingüinos, crías de lobo marino y peces)`,
    ours: { intakeKgDay: OURS_INTAKE, survival: OURS_SURV, fastDays: OURS_FAST, cap: OURS_CAP, huntSuccess: "nuestro" },
  },
];

/** Carrion: what is left of a kill or a body; eaten by sheathbills, skuas, petrels and albatrosses; it rots. */
export const CARRION = { id: "carrona", name: "Carroña", rotPerDay: 0.08, reality: "licencia" as Reality, source: "ritmo de descomposición nuestro" };

export const biomeSpec = (id: string): BiomeSpec | undefined => BIOME.find((s) => s.id === id);
export const nameOf = (id: string): string => (id === CARRION.id ? CARRION.name : (biomeSpec(id)?.name ?? id));

/** The reality of a species' field: real from its source, or licencia if it is ours. */
export function realityOf(s: BiomeSpec, field: string): Reality {
  return s.ours && field in s.ours ? "licencia" : "real";
}

/**
 * The climate of a South Georgia coast (Grytviken, 54°S): mean air temperature of each month (°C) and the sea's.
 * Source: Wikipedia, Grytviken (tabla del clima, 1901–1950); the sea's, ours (≈0–4 °C, the order of the island's shelf).
 */
export const CLIMATE = {
  latitude: -54.3,
  airC: [4.6, 5.2, 4.3, 2.0, -0.1, -1.6, -1.8, -1.6, 0.3, 1.8, 2.9, 3.8],
  seaC: [3.2, 3.8, 3.5, 2.4, 1.2, 0.5, 0.0, -0.2, 0.0, 0.6, 1.5, 2.4],
  source: `${WIKI("Grytviken")} (clima de Grytviken); el mar, nuestro`,
  reality: { airC: "real" as Reality, seaC: "licencia" as Reality },
};
