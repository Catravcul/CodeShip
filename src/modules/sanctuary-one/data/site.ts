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
    x: -77,
    z: 52,
    size: { x: 36, z: 26 },
    quarter: 1,
    firstY: FIRST_Y,
    tipGap: 10,
    tip: "Frutales en maceta",
    source: `${S.csTowers}; ${S.csFloors}; docs/yoga-pisos.md, piso-aula.md y piso-musica.md de Cold Sanctuary`,
    floors: [
      F("Gimnasio", "Máquinas de placas (30) y peso libre", "gimnasio-0"),
      F("Cardio y zona libre", "Cintas, elípticas, escaladoras, bicis, remos, esterillas y sacos", "cardio"),
      F("Calistenia, parkour y crossfit", "Barras, anillas, paralelas, muros, bloques y el rig", "calistenia"),
      F("Yoga Hatha (1)", "Sala occidental y sala tradicional, 8 esterillas cada una", "yoga-hatha-1"),
      F("Yoga Hatha (2)", "Sala occidental y sala tradicional, 8 esterillas cada una", "yoga-hatha-2"),
      F("Yoga Ashtanga (1)", "Sala occidental y sala tradicional, 8 esterillas cada una", "yoga-ashtanga-1"),
      F("Yoga Ashtanga (2)", "Sala occidental y sala tradicional, 8 esterillas cada una", "yoga-ashtanga-2"),
      F("Sala de Ballet (en obras)", "En obras, con su equipo de 3", "ballet-1"),
      F("Sala de Ballet (piso 2, en obras)", "En obras, con su equipo de 3", "ballet-2"),
      F("Dojo (en obras)", "MMA, kickboxing y karate; en obras", "dojo-1"),
      F("Dojo (piso 2, en obras)", "MMA, kickboxing y karate; en obras", "dojo-2"),
      F("Aula", "Aula de clases (24 plazas) y sala de estudio", "aula-1"),
      F("Aula (piso 2)", "Aula de clases (6 plazas) y sala de estudio", "aula-2"),
      F("Música: conciertos", "Escenario grande, segundo escenario y butacas", "musica-conciertos"),
      F("Música: estudios (1)", "4 salas de ensayo, 2 de control y 2 cabinas de grabación", "musica-estudios-1"),
      F("Música: estudios (2)", "4 salas de ensayo, 2 de control y 2 cabinas de grabación", "musica-estudios-2"),
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
      F("Química: síntesis", "Síntesis"),
      F("Química: análisis", "Análisis"),
      F("Biología: cultivo", "Cultivo, con la fachada de fotobiorreactores"),
      F("Biología: molecular", "Biología molecular"),
      F("Informática", "El clúster de IA local"),
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
      F("Construcción", "Maquinaria, material, herramientas y taller de obra"),
      F("Mecánica", "Taller de vehículos y máquinas"),
      F("Estudio textil", "Telares, rueca, lanas, tintes, corte y costura"),
      F("Huerto vertical (1)", "Estantes de cultivo LED"),
      F("Huerto vertical (2)", "Estantes de cultivo LED"),
      F("Garaje del submarino", "El submarino de obra"),
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
      F("Cultivos (P1)", "Cultivos del Árbol de los Campos"),
      F("Cultivos (P2)", "Cultivos del Árbol de los Campos"),
      F("Huerto", "El huerto: una franja de 24 × 9 m del piso 5"),
      F("Cultivos (P6)", "Cultivos del Árbol de los Campos"),
    ],
  },
  {
    id: "residencia",
    building: "Residencia",
    x: -66,
    z: -215,
    size: { x: 40, z: 38 },
    quarter: 0,
    firstY: FIRST_Y,
    tipGap: 4,
    tip: "Frutales en maceta",
    source: S.csResidence,
    floors: [
      F("Plaza de la Residencia", "La plaza y el ring de almohadas"),
      F("Habitaciones (1)", "7 habitaciones"),
      F("Habitaciones (2)", "7 habitaciones"),
      F("Habitaciones (3)", "7 habitaciones"),
      F("Habitaciones (4)", "7 habitaciones"),
      F("Habitaciones (5)", "2 habitaciones"),
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
];
export const STAFF_SOURCE = S.csStaff;
