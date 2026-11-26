import type { AnimalSpec, BiomeSpec, ClimateSpec } from "./bioma";
import { fact } from "./sources";
import type { BiomeZone } from "./bioma-island";

/**
 * THE CARBONIFEROUS FOREST AT THE PYRAMID'S FOOT (Berón 2026-11-26; docs/design/carbonifero.md): the giant insects that
 * really lived ~300 million years ago, when the air held ~35 % oxygen, with the plants of their coal swamps. They live
 * outside the hollow pyramid, on the gentle ground at its north-east foot and on its summit, a forest of the Late
 * Carboniferous of Euramerica (the basins of Commentry and Montceau-les-Mines in France, Mazon Creek in Illinois, the
 * Coal Measures of England; Meganeuropsis is of the Early Permian of Kansas). They keep the shared food chain
 * (domain/bioma.ts, its own `BiomeDef`) and the rule of animals per person (data/bioma.ts `s3Plan`: one rule for the
 * whole sanctuary, these and Gilgit-Baltistán's insects together).
 *
 * THEIR SIZE IS REAL (fósil): they are drawn at their fossil size (×1, `drawScale` 1), not ×400 like the insects of
 * today: a Meganeura spans 70 cm and an Arthropleura is 2,6 m long, beside lycopsid trees 35 m tall; they were giants
 * because of the oxygen, so their scale needs no fiction. Every number has its source; what no fossil tells (how long
 * they lived, how many young, their rations) is ours (`ours`, licencia), and what is invented outright is ficción.
 */
const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;

/** The zone they live in (local metres of the Isla de las alturas, like data/bioma-island.ts BIOME_ZONES). */
export const CARBON_ZONE = fact<BiomeZone>(
  {
    id: "bosque-carbonifero",
    label: "Bosque del Carbonífero",
    desc: "Al pie noreste de la pirámide, un bosque de los pantanos del carbón de hace ~300 millones de años: lepidodendros, sigilarias, calamites, helechos arborescentes y cordaites, con sus insectos gigantes a tamaño real",
    reality: "ficcion",
    point: { x: 400, z: 300 },
    r: 90,
  },
  "ficcion",
  "nuestro: el suelo suave al pie noreste de la pirámide (pendiente < 0,6), fuera de las zonas de Gilgit-Baltistán",
);
/** The summit's grove (local metres): a few of the same trees on the pyramid's top. */
export const CARBON_SUMMIT = fact({ point: { x: 175, z: 190 }, r: 45 }, "ficcion", "nuestro: la cima de la pirámide (~510 m sobre el mar)");

/** The oxygen of the air then (the reason of their size). */
export const CARBON_O2 = fact(
  0.35,
  "real",
  "Berner 2006, «GEOCARBSULF: A combined model for Phanerozoic atmospheric O2 and CO2», Geochimica et Cosmochimica Acta 70: 5653–5664 (máximo de ~30–35 % al final del Carbonífero y comienzo del Pérmico); Harrison, Kaiser y VandenBrooks 2010, «Atmospheric oxygen level and the evolution of insect body size», Proceedings of the Royal Society B 277: 2863–2869 (más oxígeno, insectos más grandes)",
);

/** How the giants are drawn: their real fossil size (a scale of one: no fiction). */
export const CARBON_SCALE = fact(1, "real", "tamaño fósil real: los insectos del Carbonífero ya eran gigantes por el oxígeno (CARBON_O2)");

const OURS_LIFE = "ningún fósil dice cuánto vivía, cuántas crías tenía ni cuánto comía: nuestro, del orden de sus parientes de hoy";
const OURS_CAP = "la regla de animales por persona del santuario 3 (data/bioma.ts s3Plan), con los insectos de Gilgit-Baltistán";
const DIMICHELE = "DiMichele y Phillips 1994, «Paleobotanical and paleoecological constraints on models of peat formation in the Late Carboniferous of Euramerica», Palaeogeography, Palaeoclimatology, Palaeoecology 106: 39–90 (los bosques de los pantanos del carbón: licópsidos arborescentes, helechos arborescentes, calamites y cordaites)";

export const CARBON_SPECIES: readonly BiomeSpec[] = [
  // ── The trees of the coal swamps (real size, drawn by adapters/three/s3-carbon.ts) ──
  {
    kind: "planta", id: "lepidodendron", name: "Lepidodendron (árbol escamoso)", latin: "Lepidodendron aculeatum", habitat: "bosque-carbonifero",
    perYear: 0.08, stockKg: 400_000, minTempC: 10,
    source: `${WIKI("Lepidodendron")} (licópsido arborescente de hasta 40–50 m y 1 m de tronco, con la corteza en rombos de cojinetes foliares; copa de ramas que se bifurcan con hojas como agujas y conos en las puntas); ${DIMICHELE}`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "sigillaria", name: "Sigillaria (árbol sello)", latin: "Sigillaria", habitat: "bosque-carbonifero",
    perYear: 0.08, stockKg: 200_000, minTempC: 10,
    source: `${WIKI("Sigillaria")} (licópsido de hasta 20–30 m, tronco casi sin ramas o con una o dos bifurcaciones, cicatrices de hojas en filas verticales como sellos y un penacho de hojas largas en lo alto); ${DIMICHELE}`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "calamites", name: "Calamites (cola de caballo gigante)", latin: "Calamites", habitat: "bosque-carbonifero",
    perYear: 0.3, stockKg: 80_000, minTempC: 10,
    source: `${WIKI("Calamites")} (pariente arborescente de las colas de caballo, de 5 a más de 20 m; tallo hueco con nudos y entrenudos y verticilos de ramas en cada nudo, con hojas en estrella, Annularia; crecía en las orillas)`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "psaronius", name: "Psaronius (helecho arborescente)", latin: "Psaronius (frondes Pecopteris)", habitat: "bosque-carbonifero",
    perYear: 0.2, stockKg: 120_000, minTempC: 10,
    source: `${WIKI("Psaronius")} (helecho arborescente de hasta 10 m, con el tronco envuelto por un manto de raíces que lo ensancha abajo y una copa de grandes frondes, Pecopteris); ${DIMICHELE} (dominan al final del Carbonífero)`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "cordaites", name: "Cordaites", latin: "Cordaites", habitat: "bosque-carbonifero",
    perYear: 0.06, stockKg: 300_000, minTempC: 10,
    source: `${WIKI("Cordaites")} (gimnosperma, pariente lejano de las coníferas, árbol de hasta 30 m con hojas en cinta de hasta 1 m en espiral al final de las ramas); ${DIMICHELE}`,
    ours: { perYear: "nuestro", stockKg: "nuestro", minTempC: "nuestro" },
  },
  {
    kind: "planta", id: "hojarasca", name: "Hojarasca y madera caída", latin: "restos de licópsidos, helechos y cordaites", habitat: "bosque-carbonifero",
    perYear: 2, stockKg: 50_000, minTempC: 10,
    source: `${DIMICHELE} (la turba del pantano se hacía de lo que caía); Davies et al. 2021 (Arthropleura comía restos de plantas del suelo del bosque)`,
    ours: { perYear: "nuestro: lo que cae del bosque cada año", stockKg: "nuestro", minTempC: "nuestro" },
  },
  // ── The small ones, by cohorts ──
  {
    kind: "banco", id: "insectos-carbonifero", name: "Insectos pequeños del bosque", latin: "Paoliida, Archaeorthoptera, Hypoperlida", habitat: "bosque-carbonifero", trophic: 2,
    adultMassKg: 5e-5, maxAgeYears: 1, matureYears: 0, spawnMonth: 3, spawnMonths: 8, perYear: 6, mortality: 2.5, intakePerDay: 0.5,
    diet: [{ food: "hojarasca", pref: 2 }, { food: "psaronius" }], stockKg: 30, unit: "insectos",
    source: `Grimaldi y Engel 2005, «Evolution of the Insects», Cambridge University Press, cap. 6 (los insectos alados del Carbonífero: paoliidos, arqueortópteros, hipopérlidos, de pocos centímetros)`,
    ours: { adultMassKg: "nuestro", perYear: "nuestro", mortality: "nuestro", intakePerDay: "nuestro", stockKg: "nuestro", spawnMonth: "nuestro", habitat: "nuestro" },
  },
  // ── The giants, one by one (real fossil size) ──
  {
    kind: "animal", id: "arthropleura", name: "Artropleura (miriápodo gigante)", latin: "Arthropleura armata", habitat: "bosque-carbonifero", trophic: 2, shape: "miriapodo",
    massKg: 50, size: { x: 0.55, y: 0.2, z: 2.6 }, male: 1, color: 0x4a3c30, intakeKgDay: 0.8,
    diet: [{ food: "hojarasca", pref: 3 }, { food: "psaronius" }, { food: "calamites", pref: 0.5 }],
    childDays: 900, teenDays: 700, adultDays: 2500, birthSize: 0.04, gestationMonths: 1, intervalMonths: 12, birthMonth: 5, young: 6,
    survival: 0.85, fastDays: 40, start: 2, cap: 2, selfFed: true, eggDays: 40,
    source: `Davies et al. 2021, «The largest arthropod in Earth history: insights from newly discovered Arthropleura remains (Serpukhovian Stainmore Formation, Northumberland, England)», Journal of the Geological Society 179: jgs2021-115 (hasta ~2,6 m y ~50 kg; vivía en bosques abiertos y comía restos de plantas); Lhéritier et al. 2024, «Head anatomy and phylogenomics show the Carboniferous giant Arthropleura belonged to a millipede-centipede group», Science Advances 10: eadp6362 (la cabeza, de juveniles de Montceau-les-Mines, Francia); ${WIKI("Arthropleura")} (unos 30 segmentos con placas y dos pares de patas cada uno)`,
    ours: { childDays: OURS_LIFE, teenDays: OURS_LIFE, adultDays: OURS_LIFE, young: OURS_LIFE, eggDays: OURS_LIFE, intakeKgDay: OURS_LIFE, survival: OURS_LIFE, fastDays: OURS_LIFE, birthSize: OURS_LIFE, birthMonth: OURS_LIFE, gestationMonths: OURS_LIFE, cap: OURS_CAP, start: OURS_CAP, color: "pardo oscuro: nuestro" },
  },
  {
    kind: "animal", id: "cucaracha", name: "Cucaracha primitiva", latin: "Archimylacris eggintoni", habitat: "bosque-carbonifero", trophic: 2, shape: "insecto",
    massKg: 2e-3, size: { x: 0.035, y: 0.008, z: 0.04 }, male: 1, color: 0x6a4a2a, intakeKgDay: 4e-4,
    diet: [{ food: "hojarasca", pref: 3 }, { food: "psaronius", pref: 0.5 }],
    childDays: 150, teenDays: 60, adultDays: 195, birthSize: 0.1, gestationMonths: 1, intervalMonths: 12, birthMonth: 4, young: 6,
    survival: 0.6, fastDays: 20, start: 2, cap: 2, selfFed: true, eggDays: 40, nymph: true, annual: true,
    source: `Garwood y Sutton 2010, «X-ray micro-tomography of Carboniferous stem-Dictyoptera: new insights into early insects», Biology Letters 6: 699–702 (Archimylacris eggintoni de las Coal Measures de Inglaterra, ~300 Ma, reconstruida en 3D: cabeza bajo un pronoto en escudo, tegminas, patas para correr); Grimaldi y Engel 2005 (las «cucarachas» del Carbonífero ponían con un ovipositor largo, sin ooteca, y comían restos del suelo)`,
    ours: { size: "del orden del fósil (unos 4 cm): nuestro", massKg: "nuestro", childDays: OURS_LIFE, teenDays: OURS_LIFE, adultDays: OURS_LIFE, young: OURS_LIFE, eggDays: OURS_LIFE, intakeKgDay: OURS_LIFE, survival: OURS_LIFE, fastDays: OURS_LIFE, birthSize: OURS_LIFE, birthMonth: OURS_LIFE, gestationMonths: OURS_LIFE, cap: OURS_CAP, start: OURS_CAP },
  },
  {
    kind: "animal", id: "mazothairos", name: "Mazothairos (paleodictióptero)", latin: "Mazothairos enormis", habitat: "bosque-carbonifero", trophic: 2, shape: "insecto",
    massKg: 0.012, size: { x: 0.55, y: 0.03, z: 0.13 }, male: 1, color: 0x3a3028, intakeKgDay: 1.5e-3,
    diet: [{ food: "sigillaria", pref: 2 }, { food: "lepidodendron", pref: 2 }, { food: "cordaites" }],
    childDays: 280, teenDays: 60, adultDays: 65, birthSize: 0.08, gestationMonths: 1, intervalMonths: 12, birthMonth: 3, young: 4,
    survival: 0.6, fastDays: 10, start: 2, cap: 2, selfFed: true, eggDays: 30, nymph: true, annual: true,
    source: `Kukalová-Peck y Richardson 1983, «New Homoiopteridae (Insecta: Paleodictyoptera) with wing articulation from Upper Carboniferous strata of Mazon Creek, Illinois», Canadian Journal of Zoology 61: 1670–1687 (Mazothairos enormis, envergadura estimada de ~55 cm, ~307 Ma); Labandeira 1997, «Insect mouthparts: ascertaining the paleobiology of insect feeding strategies», Annual Review of Ecology and Systematics 28: 153–193 (los paleodictiópteros chupaban con un pico los jugos y las esporas de los conos); Kukalová-Peck 1978, Journal of Morphology 156: 53–126 (sus ninfas tenían esbozos de alas y no plegaban las alas de adultos; un par de aletas pequeñas en el protórax)`,
    ours: { size: "envergadura de la estimación; el cuerpo, nuestro", massKg: "nuestro", childDays: OURS_LIFE, teenDays: OURS_LIFE, adultDays: OURS_LIFE, young: OURS_LIFE, eggDays: OURS_LIFE, intakeKgDay: OURS_LIFE, survival: OURS_LIFE, fastDays: OURS_LIFE, birthSize: OURS_LIFE, birthMonth: OURS_LIFE, gestationMonths: OURS_LIFE, cap: OURS_CAP, start: OURS_CAP, color: "nuestro (sus alas tenían bandas oscuras en algunos fósiles)" },
  },
  {
    kind: "animal", id: "meganeura", name: "Meganeura (libélula gigante)", latin: "Meganeura monyi", habitat: "bosque-carbonifero", trophic: 3, shape: "insecto",
    massKg: 0.025, size: { x: 0.68, y: 0.04, z: 0.32 }, male: 1, color: 0x3a5a4a, intakeKgDay: 4e-3,
    diet: [{ food: "insectos-carbonifero", pref: 3 }, { food: "cucaracha", pref: 1, stages: ["adulto", "anciano"] }],
    childDays: 300, teenDays: 30, adultDays: 75, birthSize: 0.06, gestationMonths: 1, intervalMonths: 12, birthMonth: 6, young: 3,
    survival: 0.6, fastDays: 5, start: 2, cap: 2, selfFed: true, eggDays: 25, nymph: true, annual: true, hiddenYoung: true, huntSuccess: 0.7,
    source: `Brongniart 1884 (descrita de Commentry, Francia, Carbonífero tardío, ~300 Ma); Nel, Fleck, Garrouste et al. 2009, «Revision of Permo-Carboniferous griffenflies (Insecta: Odonatoptera: Meganisoptera)», Palaeontographica A 289: 89–121; ${WIKI("Meganeura")} (envergadura de ~65–70 cm; cazaba otros insectos al vuelo, con patas espinosas)`,
    ours: { size: "el largo del cuerpo, nuestro del orden de la fuente", massKg: "nuestro", hiddenYoung: "ficción: no se conocen sus ninfas; las suponemos en el agua como las de las libélulas de hoy, fuera de la vista en las charcas del pantano", childDays: "ficción: ninfa acuática de un año (una generación al año)", annual: "una generación al año: nuestro", teenDays: OURS_LIFE, adultDays: OURS_LIFE, young: OURS_LIFE, eggDays: OURS_LIFE, intakeKgDay: OURS_LIFE, survival: OURS_LIFE, fastDays: OURS_LIFE, birthSize: OURS_LIFE, birthMonth: OURS_LIFE, gestationMonths: OURS_LIFE, huntSuccess: "algo menos que las libélulas de hoy (0,9): nuestro", cap: OURS_CAP, start: OURS_CAP },
  },
  {
    kind: "animal", id: "meganeuropsis", name: "Meganeuropsis (la mayor libélula gigante)", latin: "Meganeuropsis permiana", habitat: "bosque-carbonifero", trophic: 4, shape: "insecto",
    massKg: 0.035, size: { x: 0.71, y: 0.05, z: 0.43 }, male: 1, color: 0x4a4a3a, intakeKgDay: 6e-3,
    diet: [{ food: "mazothairos", pref: 2, stages: ["adulto", "anciano"] }, { food: "cucaracha", pref: 1, stages: ["adulto", "anciano"] }, { food: "insectos-carbonifero", pref: 1 }, { food: "meganeura", pref: 0.3, stages: ["adulto", "anciano"] }],
    childDays: 300, teenDays: 30, adultDays: 75, birthSize: 0.06, gestationMonths: 1, intervalMonths: 12, birthMonth: 6, young: 3,
    survival: 0.6, fastDays: 5, start: 2, cap: 2, selfFed: true, eggDays: 25, nymph: true, annual: true, hiddenYoung: true, huntSuccess: 0.7,
    source: `Carpenter 1939 (describió Meganeuropsis permiana de Elmo, Kansas, Pérmico inferior, ~275 Ma); ${WIKI("Meganeuropsis")} (ala de ~33 cm, envergadura estimada de ~71 cm y cuerpo de ~43 cm: el insecto más grande conocido)`,
    ours: { habitat: "licencia: vivió unos 25 millones de años después que Meganeura y en Kansas; aquí comparten bosque", massKg: "nuestro", hiddenYoung: "ficción: ninfas no conocidas, supuestas acuáticas", childDays: "ficción: como Meganeura", annual: "nuestro", teenDays: OURS_LIFE, adultDays: OURS_LIFE, young: OURS_LIFE, eggDays: OURS_LIFE, intakeKgDay: OURS_LIFE, survival: OURS_LIFE, fastDays: OURS_LIFE, birthSize: OURS_LIFE, birthMonth: OURS_LIFE, gestationMonths: OURS_LIFE, huntSuccess: "nuestro", cap: OURS_CAP, start: OURS_CAP, diet: "come insectos voladores como Meganeura; que cace Meganeura es nuestro" },
  },
];

export const CARBON_ANIMALS = CARBON_SPECIES.filter((s): s is AnimalSpec => s.kind === "animal");

/** The tropics of Euramerica then: warm and wet all year, a little latitude (licencia: one mean, no series). */
export const CARBON_CLIMATE: ClimateSpec = {
  latitude: 5,
  stationM: 0,
  airC: [25, 25, 26, 26, 27, 27, 27, 27, 26, 26, 25, 25],
  source: "Montañez y Poulsen 2013, «The Late Paleozoic Ice Age: An Evolving Paradigm», Annual Review of Earth and Planetary Sciences 41: 629–656 (los pantanos del carbón de Euramérica, cerca del ecuador, cálidos y húmedos); la serie mensual es nuestra",
  reality: { airC: "licencia" },
};

/** The food chain, said in words (the census and the doc): who eats whom. */
export const CARBON_CHAIN = [
  "Los árboles del pantano (Lepidodendron, Sigillaria, Calamites, Psaronius y Cordaites) dejan hojarasca y madera caída",
  "Artropleura, las cucarachas primitivas y los insectos pequeños comen esa hojarasca y helechos",
  "Mazothairos chupa con su pico los jugos y las esporas de los conos de Sigillaria, Lepidodendron y Cordaites",
  "Meganeura caza al vuelo insectos pequeños y cucarachas; Meganeuropsis, además, Mazothairos y alguna Meganeura",
] as const;
