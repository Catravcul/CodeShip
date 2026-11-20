import { S1_SOURCES as S } from "./sources";

/**
 * Sanctuary 1 as Cold Sanctuary builds it (its coordinates, m on the plan; y up): the ice caps and the land island,
 * the lagoon, the tree-buildings with their floors in order, the animals' nests and the staff. Only data: the layout
 * (layout.ts) turns it into floors, water and walls, and the catalogue (catalog.ts) says how each thing looks.
 */

/** A lobe of a cap: caps are overlapping circles (PolarLandscapeBuilder.Islands). */
export interface Lobe {
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly r: number;
}

/** `Cap:Lobe`; the «Sur:» and «Isla:» lobes are land (tundra), the rest ice. Radius 0: retired (kept for its index). */
export const LOBES: readonly Lobe[] = [
  { name: "Norte:Cocina", x: 5, z: 95, r: 30 },
  { name: "Norte:Enfermeria", x: 55, z: 97, r: 28 },
  { name: "Norte:Paso", x: -28, z: 95, r: 22 },
  { name: "Norte:Residencial", x: -60, z: 95, r: 30 },
  { name: "Norte:Guardia", x: -25, z: 65, r: 20 },
  { name: "Norte:Bosque_Comestible", x: -82, z: 52, r: 26 },
  { name: "Centro:Hub", x: 5, z: -10, r: 42 },
  { name: "Centro:Arrozal", x: -55, z: -15, r: 28 },
  { name: "Centro:Pinguinos", x: 55, z: -22, r: 18 },
  { name: "Centro:Textil", x: 52, z: -52, r: 18 },
  { name: "Sur:Rotacion", x: 15, z: -95, r: 22 },
  { name: "Sur:Paso", x: -15, z: -90, r: 20 },
  { name: "Sur:Milpa", x: -45, z: -80, r: 24 },
  { name: "Sur:Andina", x: -10, z: -118, r: 22 },
  { name: "Este:SalaYoga", x: 109, z: 38, r: 0 },
  { name: "Este:Paso", x: 114, z: 10, r: 0 },
  { name: "Este:Mecanica_Osos", x: 118, z: -20, r: 0 },
  { name: "BosqueOeste:Bosque_1", x: -140, z: -30, r: 34 },
  { name: "BosqueOeste:Bosque_2", x: -150, z: 5, r: 26 },
  { name: "BosqueOeste:Bosque_3", x: -160, z: 45, r: 32 },
  { name: "BosqueNorte:Bosque_4", x: 40, z: 175, r: 32 },
  { name: "BosqueNorte:Bosque_5", x: 75, z: 170, r: 24 },
  { name: "BosqueNorte:Bosque_6", x: 110, z: 160, r: 30 },
  { name: "Sur:Quimica", x: 52, z: -110, r: 24 },
  { name: "Sur:Biologia", x: 92, z: -112, r: 26 },
  { name: "Sur:Central", x: 60, z: -162, r: 34 },
  { name: "Isla:Tundra", x: -168, z: -168, r: 66 },
  { name: "Isla:Valle", x: -208, z: -118, r: 36 },
  { name: "Isla:Bahia", x: -132, z: -118, r: 40 },
  { name: "Isla:Istmo", x: -88, z: -128, r: 40 },
  { name: "Isla:Cabo", x: -100, z: -200, r: 46 },
  { name: "Isla:Poniente", x: -214, z: -205, r: 30 },
  { name: "Isla:Meseta", x: -48, z: -172, r: 44 },
  { name: "Isla:Lomas", x: 5, z: -176, r: 36 },
];
export const LOBES_SOURCE = S.csLandscape;

export const CAP_NAME: Readonly<Record<string, string>> = {
  Norte: "Casquete Norte (la aldea)",
  Centro: "Casquete Centro (el hub)",
  Sur: "Isla de tierra: Sur",
  Isla: "Isla de tierra: la tundra",
  BosqueOeste: "Casquete Oeste (salvaje)",
  BosqueNorte: "Casquete Norte salvaje",
  Este: "Casquete Este (retirado)",
};

export const isLand = (l: Lobe): boolean => l.name.startsWith("Sur:") || l.name.startsWith("Isla:");
export const capOf = (l: Lobe): string => l.name.split(":")[0]!;

/** The shoreline wobble of Cold Sanctuary (IslandRadius): irregular, without joining caps. */
export function lobeRadius(l: Lobe, i: number, x: number, z: number): number {
  const a = Math.atan2(z - l.z, x - l.x);
  return l.r * (1 + 0.06 * Math.sin(a * 5 + i) + 0.03 * Math.sin(a * 11 + 2 * i));
}

/** The map is [−HALF, HALF] on both axes; the water shows 25 cm under the ice's edge. */
export const MAP_HALF = 250;
export const WATER_Y = -0.25;
export const LAGOON = { x: 60, z: 25, r: 28 } as const;

/** A tree-building (HelixTower): its trunk of water on the plan, its turn and its floors in order (two per level). */
export interface TowerSpec {
  readonly id: string;
  readonly building: string;
  readonly x: number;
  readonly z: number;
  /** Plan of its biggest area: every floor of the tower is a square of the larger side. */
  readonly size: { readonly x: number; readonly z: number };
  /** Turn in quarter turns (Cold Sanctuary's yaw / 90°). */
  readonly quarter: number;
  readonly firstY: number;
  readonly tipGap: number;
  /** Floors bottom up (level 1 sides a, c; level 2 b, d; …). An empty name is a free floor. */
  readonly floors: readonly { readonly name: string; readonly desc: string; readonly furnish?: string }[];
  /** What grows on the tips. */
  readonly tip: string;
  readonly source: string;
}

const FIRST_Y = 64;
const F = (name: string, desc: string, furnish?: string) => ({ name, desc, ...(furnish ? { furnish } : {}) });

export const TOWERS: readonly TowerSpec[] = [
  {
    id: "servicios",
    building: "Servicios",
    x: 55,
    z: 102,
    size: { x: 40, z: 38 },
    quarter: 0,
    firstY: FIRST_Y,
    tipGap: 10,
    tip: "Frutales en maceta",
    source: `${S.csTowers}; ${S.csFloors}`,
    floors: [
      F("Restaurante", "Cocina abierta en el centro y el comedor gourmet para 30 en su anillo", "restaurante"),
      F("Hospital: urgencias y ambulatorio", "Urgencias, consultas, observación y maternidad", "hospital-urgencias"),
      F("Hospital: quirófanos y UCI", "Quirófanos, UCI, aislamiento y recuperación", "hospital-quirofanos"),
      F("Hospital veterinario", "Para animales de todo tamaño, con anillo de grandes animales", "hospital-veterinario"),
      F("Cría", "Sala de crías del hielo: recintos, cocina de leche y almacén", "cria"),
      F("Carne cultivada", "Laboratorio: carne para los depredadores sin matar animales, y el almacén de raciones", "carne-cultivada"),
      F("Sala de asambleas", "Donde se reúne el santuario", "asambleas"),
      F("Sala de guardia", "El piso libre del nivel 4: la guardia y sus puestos", "guardia"),
    ],
  },
  {
    id: "entrenamiento",
    building: "Entrenamiento",
    // 20 m west of its old place (2026-11-20): with its yoga in 8 small floors its branches reach Servicios' otherwise.
    x: -97,
    z: 52,
    size: { x: 36, z: 26 },
    quarter: 1,
    firstY: FIRST_Y,
    tipGap: 10,
    tip: "Frutales en maceta",
    source: `${S.csTowers}; ${S.csFloors}; docs/yoga-pisos.md, piso-aula.md y piso-musica.md de Cold Sanctuary; aulas y salas de música rehechas (floors/musica-aulas.ts)`,
    floors: [
      F("Gimnasio", "Máquinas de placas (30) y peso libre", "gimnasio-0"),
      F("Cardio y zona libre", "Cintas, elípticas, escaladoras, bicis, remos, esterillas y sacos", "cardio"),
      F("Calistenia, parkour y crossfit", "Barras, anillas, paralelas, muros, bloques y el rig", "calistenia"),
      F("Yoga Hatha: sala occidental (1)", "Una clase: 8 esterillas, tarima del maestro y altar", "yoga-hatha-occidental-1"),
      F("Yoga Hatha: sala tradicional (1)", "Una clase: 8 durries de algodón, tarima con asiento kusha, altar con lámparas y kund", "yoga-hatha-tradicional-1"),
      F("Yoga Hatha: sala occidental (2)", "Una clase: 8 esterillas, tarima del maestro y altar", "yoga-hatha-occidental-2"),
      F("Yoga Hatha: sala tradicional (2)", "Una clase: 8 durries de algodón, tarima con asiento kusha, altar con lámparas y kund", "yoga-hatha-tradicional-2"),
      F("Yoga Ashtanga: sala occidental (1)", "Una clase: 8 esterillas, tarima del maestro y altar", "yoga-ashtanga-occidental-1"),
      F("Yoga Ashtanga: sala tradicional (1)", "Una clase: 8 durries de algodón, tarima con asiento kusha, altar con lámparas y kund", "yoga-ashtanga-tradicional-1"),
      F("Yoga Ashtanga: sala occidental (2)", "Una clase: 8 esterillas, tarima del maestro y altar", "yoga-ashtanga-occidental-2"),
      F("Yoga Ashtanga: sala tradicional (2)", "Una clase: 8 durries de algodón, tarima con asiento kusha, altar con lámparas y kund", "yoga-ashtanga-tradicional-2"),
      F("Estudio de ballet grande", "15 × 12 m: suelo flotante, espejos con barra doble, barras del centro, piano y vestuario", "ballet-grande"),
      F("Estudio de ballet pequeño", "12 × 10 m: suelo flotante, espejos con barra doble, barras del centro y piano", "ballet-pequeno"),
      F("Dojo de karate", "Tatami de 8 × 8 m, makiwaras y kamiza", "dojo-karate"),
      F("Gimnasio de kickboxing", "Ring, sacos pesados y pera", "dojo-kickboxing"),
      F("Sala de MMA", "Octógono y tapiz de grappling", "dojo-mma"),
      F("Dojo de judo", "Tatami de 10 × 10 m y kamiza", "dojo-judo"),
      // Classrooms and music rooms, each its own floor and two to a side (Berón 2026-11-20).
      F("Aula de matemáticas", "24 pupitres, material manipulativo y vitrina de poliedros", "aula-matematicas"),
      F("Aula de lengua y literatura", "24 pupitres, biblioteca de aula y rincón de lectura", "aula-lengua"),
      F("Laboratorio de ciencias", "5 mesas de laboratorio, mesa de demostración con vitrina de gases, esqueleto y colecciones", "aula-ciencias"),
      F("Aula de historia y geografía", "24 pupitres, globo, mapamundi, línea del tiempo y objetos del mundo", "aula-historia"),
      F("Laboratorio de idiomas", "24 puestos con auriculares y pantalla", "aula-idiomas"),
      F("Taller de arte", "Caballetes, mesas de dibujo, fregadero, torno y horno de cerámica", "aula-arte"),
      F("Sala de estudio y biblioteca", "Biblioteca, mesas de estudio y ordenadores", "aula-estudio"),
      F("Música: sala de ensayo", "Batería, amplificadores, piano de escenario, voces y paredes tratadas", "musica-ensayo"),
      F("Música: estudio de grabación", "Sala de control, sala de grabación con piano de cola y batería, y cabina de voz", "musica-estudio"),
      F("Música: cabinas de estudio", "4 cabinas insonorizadas con piano vertical", "musica-cabinas"),
      F("Música: sala de orquesta", "Podio, 19 atriles de cuerda en arcos, timbales, percusión, arpa y contrabajos", "musica-orquesta"),
      F("Música: auditorio", "Escenario con piano de cola, torres de sonido, 60 butacas en gradas y control de sala", "musica-auditorio"),
    ],
  },
  {
    id: "ciencias",
    building: "Ciencias",
    x: 92,
    z: -117,
    size: { x: 32, z: 20 },
    quarter: 1,
    firstY: FIRST_Y,
    tipGap: 10,
    tip: "Frutales en maceta",
    source: `${S.csTowers}; ${S.csFloors}; docs/plano-edificios.md (2026-11-05: Física y la Central se mudaron al sitio nuclear)`,
    floors: [
      F("Química: síntesis", "Síntesis", "quimica-sintesis"),
      F("Química: análisis", "Análisis", "quimica-analisis"),
      F("Biología: cultivo", "Cultivo, con la fachada de fotobiorreactores", "biologia-cultivo"),
      F("Biología: molecular", "Biología molecular", "biologia-molecular"),
      F("Informática", "El clúster de IA local", "informatica"),
      F("", "Piso libre"),
      F("", "Piso libre"),
      F("", "Piso libre"),
    ],
  },
  {
    id: "produccion",
    building: "Producción",
    x: -180,
    z: -140,
    size: { x: 26, z: 20 },
    quarter: 1,
    firstY: FIRST_Y,
    tipGap: 4,
    tip: "Frutales en maceta",
    source: `${S.csTowers}; ${S.csFloors}; docs/produccion-maquinaria.md`,
    floors: [
      F("Construcción", "Maquinaria, material, herramientas y taller de obra", "construccion"),
      F("Mecánica", "Taller de vehículos y máquinas", "mecanica"),
      F("Estudio textil", "Telares, rueca, lanas, tintes, corte y costura", "textil"),
      F("Huerto vertical (1)", "Estantes de cultivo LED", "huerto-vertical-1"),
      F("Huerto vertical (2)", "Estantes de cultivo LED", "huerto-vertical-2"),
      F("Garaje del submarino", "El submarino de obra", "garaje-submarino"),
    ],
  },
  {
    id: "campos",
    building: "Árbol de los Campos",
    x: -50,
    z: -84,
    size: { x: 32, z: 32 },
    quarter: 0,
    firstY: FIRST_Y,
    tipGap: 4,
    tip: "Cultivos",
    source: `${S.csTree}; docs/edificio-arbol.md de Cold Sanctuary`,
    floors: [
      F("Bosque comestible (P1)", "Dosel, árboles bajos, bananos, trepadoras, hongos y herbáceas", "campos-bosque-1"),
      F("Bambusal (P2)", "Guadua y cáñamo para construir", "campos-bambusal"),
      F("Huerto", "El huerto: una franja de 24 × 9 m del piso 5", "campos-huerto"),
      F("Bosque comestible (P6)", "Los otros árboles del dosel", "campos-bosque-2"),
    ],
  },
  {
    id: "residencia",
    building: "Residencia",
    x: -66,
    // 13 m further south than it was: its floors crossed corners of Producción's and, with the wider trunks (paso.ts),
    // of Campos' (reglas.test.ts).
    z: -228,
    size: { x: 40, z: 38 },
    quarter: 0,
    firstY: FIRST_Y,
    tipGap: 4,
    tip: "Frutales en maceta",
    source: S.csResidence,
    floors: [
      F("Plaza de la Residencia", "La plaza y el ring de almohadas", "residencia-plaza"),
      F("Habitaciones (1)", "7 habitaciones", "habitaciones-1"),
      F("Habitaciones (2)", "7 habitaciones", "habitaciones-2"),
      F("Habitaciones (3)", "7 habitaciones", "habitaciones-3"),
      F("Habitaciones (4)", "7 habitaciones", "habitaciones-4"),
      F("Habitaciones (5)", "2 habitaciones", "habitaciones-5"),
    ],
  },
];

/** The wild families (BuildWildlifePopulation): species, nest and spread. Marine nests are in the lagoon's water. */
export interface Nest {
  readonly species: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly marine: boolean;
}

const EMPEROR = { x: 50, z: -55 };
export const NESTS: readonly Nest[] = [
  { species: "Bear", x: -180 + 19, z: -140, radius: 12, marine: false },
  { species: "Whale", x: 60, z: 25, radius: 14, marine: true },
  { species: "Seal", x: 48, z: 14, radius: 8, marine: true },
  { species: "Seal", x: 74, z: 36, radius: 8, marine: true },
  { species: "Seal", x: 66, z: 8, radius: 8, marine: true },
  { species: "Whale", x: 50, z: 34, radius: 14, marine: true },
  { species: "Penguin", x: 60, z: -22, radius: 6, marine: false },
  { species: "Penguin", x: 66, z: -19, radius: 6, marine: false },
  { species: "Orca", x: 72, z: 32, radius: 12, marine: true },
  { species: "Walrus", x: 52, z: 34, radius: 8, marine: true },
  { species: "Walrus", x: 70, z: 12, radius: 8, marine: true },
  { species: "EmperorPenguin", x: EMPEROR.x - 3, z: EMPEROR.z + 2, radius: 5, marine: false },
  { species: "EmperorPenguin", x: EMPEROR.x + 3, z: EMPEROR.z - 2, radius: 5, marine: false },
  { species: "Reindeer", x: -100, z: -148, radius: 10, marine: false },
  { species: "Reindeer", x: -62, z: -150, radius: 10, marine: false },
  { species: "MuskOx", x: -112, z: -205, radius: 10, marine: false },
  { species: "ArcticHare", x: -205, z: -112, radius: 8, marine: false },
  { species: "ArcticHare", x: -28, z: -178, radius: 8, marine: false },
  { species: "ArcticFox", x: -118, z: -132, radius: 6, marine: false },
  { species: "Wolf", x: -205, z: -190, radius: 8, marine: false },
];
export const NESTS_SOURCE = `${S.csFauna}; ${S.csTerritory}`;

/** Cold Sanctuary's species → the catalogue's model. */
export const SPECIES_MODEL: Readonly<Record<string, string>> = {
  Bear: "oso-polar",
  Whale: "ballena",
  Seal: "foca",
  Penguin: "pinguino",
  Orca: "orca",
  Walrus: "morsa",
  EmperorPenguin: "pinguino-emperador",
  Reindeer: "reno",
  MuskOx: "buey-almizclero",
  ArcticHare: "liebre-artica",
  ArcticFox: "zorro-artico",
  Wolf: "lobo-artico",
  SnowPetrel: "petrel-niveo",
};

/** The staff in its fixed order (WorkdayDirector.Staff); «Player» is Kushal there, Doménica here. */
export const STAFF: readonly string[] = [
  "Linduarda", "Lizmibet", "Goluis", "Panterilia", "Gohageneis", "Irosene", "JefeConstruccion", "Andrea",
  "Nesvitor", "Amykhuz", "Karen", "Alicita", "Ducristin", "Josedrilo", "Maite", "Shalva", "Adaguchi",
  "Gallarle", "Julian", "Fausto",
  "David", "Adonis", "Yulo", "Lale", "Ivelyna", "Luciana", "Malena",
  "Consol", "Fernando",
  // Not in WorkdayDirector.Staff but in Cold Sanctuary all the same (Berón 2026-11-19: «todos los humanos»): Kushal (its
  // player), the Magnate (Nevaeh here), Sadhguru (MakeCharacter, yoga teacher) and Neo, Ducristin and Gallarle's child
  // (1,23 m in the exported scene, Enfermeria_AUTO/Neo; their room is «Ducristin, Gallarle y Neo»).
  "Kushal", "Nevaeh", "Sadhguru", "Neo",
];
export const STAFF_SOURCE = S.csStaff;
