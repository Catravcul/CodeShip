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
/** The lobes where Cold Sanctuary has them (its PolarLandscapeBuilder.Islands); `LOBES` is where they are here (MAP_PLAN). */
export const LOBES_CS: readonly Lobe[] = [
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

/**
 * The map in rings (Berón 2026-11-21, ours): «en el centro de todo debe haber un área grande mar circular donde residen
 * las ballenas… los casquetes y la isla quedan en el centro… los edificios árbol… como bordes del mapa». In the middle
 * the whales' sea (open water, no ice), round it the caps and the land, each moved as a whole (its lobes, nests and all
 * keep their places on it), and the tree-buildings on their own bases out at the edge.
 */
export const SEA = { x: 0, z: 0, r: 120 } as const;
/** How far each cap moved from Cold Sanctuary's place (Sur and the island go together: they touch). */
export const CAP_MOVES: Readonly<Record<string, { readonly x: number; readonly z: number }>> = {
  Norte: { x: -44, z: 74 },
  Centro: { x: 209, z: -39 },
  BosqueOeste: { x: -27, z: 1 },
  BosqueNorte: { x: 43, z: -30 },
  Sur: { x: -3, z: -72 },
  Isla: { x: -3, z: -72 },
  Este: { x: 0, z: 0 },
};
/**
 * A tree's base at sea (Berón 2026-11-21, ours): square like its trunk (Berón 2026-11-22: «las bases de los edificios
 * árbol no deben ser circulares»), 10 m to walk round the trunk, and its hull's depth under the deck, m.
 */
export const BASE = { walk: 10, hull: 3 } as const;
/**
 * The tree-buildings' ring: their trunks this far from the sea's centre, at the edge of the map; each tree half as far
 * from its nearest cap as on 2026-11-21 (Berón 2026-11-22: «el espacio entre edificios-árbol y los casquetes e islas se
 * debe disminuir a la mitad, para disminuir trayectos»), m.
 */
export const TREE_RING_R: Readonly<Record<string, number>> = { servicios: 371, entrenamiento: 388, ciencias: 408, produccion: 435, campos: 414, residencia: 379 };

export const LOBES: readonly Lobe[] = LOBES_CS.map((l) => {
  const m = CAP_MOVES[l.name.split(":")[0]!] ?? { x: 0, z: 0 };
  return { ...l, x: l.x + m.x, z: l.z + m.z };
});

/** A point of Cold Sanctuary's map moved with the cap it is on (or the nearest one): nests, groves, colonies. */
export function onMovedCap(x: number, z: number): { x: number; z: number } {
  let best = LOBES_CS[0]!;
  let d = Infinity;
  for (const l of LOBES_CS) {
    if (l.r <= 0) continue;
    const e = Math.hypot(x - l.x, z - l.z) - l.r;
    if (e < d) {
      d = e;
      best = l;
    }
  }
  const m = CAP_MOVES[best.name.split(":")[0]!] ?? { x: 0, z: 0 };
  return { x: x + m.x, z: z + m.z };
}
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

/** The caps' map is [−HALF, HALF] on both axes (the trees stand out beyond it); the water shows 25 cm under the ice's edge. */
export const MAP_HALF = 400;
export const WATER_Y = -0.25;

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
/** A tree's place on the ring, by its angle (degrees, from +x towards +z). */
const ring = (id: string, deg: number) => ({ x: Math.round(TREE_RING_R[id]! * Math.cos((deg * Math.PI) / 180)), z: Math.round(TREE_RING_R[id]! * Math.sin((deg * Math.PI) / 180)) });
const F = (name: string, desc: string, furnish?: string) => ({ name, desc, ...(furnish ? { furnish } : {}) });

/**
 * The roomy buildings as they were until 2026-11-20 (63 floors: two gym floors, 8 of yoga, 7 classrooms, 5 music
 * rooms, 4 dojos, 3 hospital floors…), kept for when the sanctuary has people enough to fill them (Berón 2026-11-21:
 * «dejar los existentes guardados y reemplazarlos por otros edificios con pisos más pequeños»). Their floor plans stay
 * in `floors/`; `buildS1Layout(k, o, TOWERS_AMPLIOS)` builds them with today's tree rules. The exact scene of that day
 * is the git branch `edificios-amplios`.
 */
export const TOWERS_AMPLIOS: readonly TowerSpec[] = [
  {
    id: "servicios",
    building: "Servicios",
    x: ring("servicios", 100).x,
    z: ring("servicios", 100).z,
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
    x: ring("entrenamiento", 40).x,
    z: ring("entrenamiento", 40).z,
    size: { x: 36, z: 26 },
    quarter: 1,
    firstY: FIRST_Y,
    tipGap: 10,
    tip: "Frutales en maceta",
    source: `${S.csTowers}; ${S.csFloors}; docs/yoga-pisos.md, piso-aula.md y piso-musica.md de Cold Sanctuary; aulas y salas de música rehechas (floors/musica-aulas.ts)`,
    floors: [
      F("Gimnasio", "Máquinas de placas (30) y peso libre", "gimnasio-0"),
      F("Cardio y zona libre", "Cintas, elípticas, escaladoras, bicis, remos, esterillas y sacos", "cardio"),
      F("Calistenia", "Parque de calistenia: barras, anillas, paralelas, monkey bars y bandera", "calistenia"),
      F("Parkour", "Sala de parkour: muros, lache, cajones, barandillas y bloques", "parkour"),
      F("Crossfit", "Box de crossfit: rig, plataformas, remos, bicis, skiergs, trineo y kettlebells", "crossfit"),
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
    x: ring("ciencias", -80).x,
    z: ring("ciencias", -80).z,
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
    x: ring("produccion", -140).x,
    z: ring("produccion", -140).z,
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
    x: ring("campos", -20).x,
    // 30 m north of its old place (2026-11-20): Entrenamiento's yoga floor at the end of its south branch reached it.
    z: ring("campos", -20).z,
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
    x: ring("residencia", 160).x,
    // 13 m further south than it was: its floors crossed corners of Producción's and, with the wider trunks (paso.ts),
    // of Campos' (reglas.test.ts).
    z: ring("residencia", 160).z,
    size: { x: 40, z: 38 },
    quarter: 0,
    firstY: FIRST_Y,
    tipGap: 4,
    tip: "Frutales en maceta",
    source: S.csResidence,
    floors: [
      F("Plaza de la Residencia", "La plaza, el ring de almohadas y el aula", "residencia-plaza"),
      F("Habitaciones (1)", "7 habitaciones", "habitaciones-1"),
      F("Habitaciones (2)", "7 habitaciones", "habitaciones-2"),
      F("Habitaciones (3)", "7 habitaciones", "habitaciones-3"),
      F("Habitaciones (4)", "7 habitaciones", "habitaciones-4"),
      F("Habitaciones (5)", "2 habitaciones", "habitaciones-5"),
    ],
  },
];

/**
 * The buildings for the people there are now (Berón 2026-11-21: «se va a reconstruir los edificios en base a los
 * miembros actuales con la idea de que muy pocas veces van a coincidir todos en el mismo piso»): 24 floors instead of
 * 63, every one the kitchen's 40 × 40 m (Berón 2026-11-22: «el tamaño base de los pisos era el mismo que el de cocina»),
 * rooms joined by affinity and hours (Berón 2026-11-22: «fusionar pisos por afinidad»): the gym on its whole floor,
 * calisthenics with parkour and crossfit, the four fighting arts, yoga and music with ballet and the social dances, the assembly hall with
 * the watch, one hospital, cría with the cultured meat, both labs on one floor, mechanics with the submarine's garage,
 * textiles with the vertical farm, the classroom in the Residencia's plaza. Straight out of the trunk, two to a level on
 * opposite sides (reglas.md §2.7).
 */
export const TOWERS: readonly TowerSpec[] = [
  {
    ...TOWERS_AMPLIOS[0]!,
    source: `${S.csTowers}; ${S.csFloors}; pisos reducidos a los miembros actuales (Berón 2026-11-21)`,
    floors: [
      F("Restaurante", "Cocina abierta en el centro y el comedor gourmet para 30 en su anillo", "restaurante"),
      F("Hospital", "Urgencias, consultas, paritorios, 2 quirófanos, UCI y aislamiento; las camas en su anillo", "hospital"),
      F("Hospital veterinario", "Para animales de todo tamaño, con anillo de grandes animales", "hospital-veterinario"),
      F("Cría y carne cultivada", "Recintos de crías, cocina de leche y el laboratorio de carne para los depredadores", "cria-carne-cultivada"),
      F("Asambleas y guardia", "La sala donde se reúne el santuario y, junto a la puerta, la sala de guardia", "asambleas-guardia"),
    ],
  },
  {
    ...TOWERS_AMPLIOS[1]!,
    source: `${S.csTowers}; ${S.csFloors}; un piso por actividad para los miembros actuales (Berón 2026-11-21)`,
    floors: [
      F("Gimnasio", "Dos o tres máquinas de cada tipo, peso libre, abdominales, spinning y cardio, en todo el piso", "gimnasio"),
      F("Calistenia, parkour y crossfit", "Barras, anillas, muros y cajones delante; el box de crossfit detrás", "funcional"),
      F("Combate", "Judo, karate, kickboxing y MMA, una sala por cuarto", "combate"),
      F("Salas", "Yoga y música delante; detrás el ballet junto a la sala de bailes (salsa, bachata, merengue, reguetón…)", "salas"),
    ],
  },
  {
    ...TOWERS_AMPLIOS[2]!,
    floors: [
      F("Laboratorios", "Química (síntesis y análisis) delante y biología (cultivo y molecular) detrás", "laboratorios"),
      F("Informática", "El clúster de IA local", "informatica"),
    ],
  },
  {
    ...TOWERS_AMPLIOS[3]!,
    floors: [
      F("Construcción", "Maquinaria, material, herramientas y taller de obra", "construccion"),
      F("Mecánica y garaje", "El taller de vehículos y máquinas delante y el submarino de obra detrás", "mecanica-garaje"),
      F("Textil y huerto", "Telares, rueca, tintes y costura delante; los estantes de cultivo LED detrás", "textil-huerto"),
    ],
  },
  TOWERS_AMPLIOS[4]!,
  TOWERS_AMPLIOS[5]!,
];

/**
 * The wild families (BuildWildlifePopulation): species, nest and spread. The land ones where Cold Sanctuary has them, on
 * their moved caps; the marine ones in the whales' sea and up in the globe (`y`: their swimming height, else the
 * sea's surface).
 */
export interface Nest {
  readonly species: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly marine: boolean;
  readonly y?: number;
}

const EMPEROR = onMovedCap(50, -55);
const land = (species: string, x: number, z: number, radius: number): Nest => ({ species, ...onMovedCap(x, z), radius, marine: false });
const sea = (species: string, deg: number, at: number, radius: number, y?: number): Nest => ({ species, x: SEA.x + at * Math.cos((deg * Math.PI) / 180), z: SEA.z + at * Math.sin((deg * Math.PI) / 180), radius, marine: true, ...(y !== undefined ? { y } : {}) });
export const NESTS: readonly Nest[] = [
  land("Bear", -180 + 19, -140, 12),
  // Whales: one family round the sea, the other up in the globe over the embryo (Berón: «podría contener toda la vida
  // marina en su interior»; data/globo.ts).
  sea("Whale", 0, 0, 80),
  sea("Seal", 20, 100, 8),
  sea("Seal", 140, 100, 8),
  sea("Seal", 260, 100, 8),
  sea("Whale", 0, 0, 80, 240),
  land("Penguin", 60, -22, 6),
  land("Penguin", 66, -19, 6),
  sea("Orca", 140, 80, 25),
  sea("Walrus", 80, 104, 8),
  sea("Walrus", 320, 104, 8),
  { species: "EmperorPenguin", x: EMPEROR.x - 3, z: EMPEROR.z + 2, radius: 5, marine: false },
  { species: "EmperorPenguin", x: EMPEROR.x + 3, z: EMPEROR.z - 2, radius: 5, marine: false },
  land("Reindeer", -100, -148, 10),
  land("Reindeer", -62, -150, 10),
  land("MuskOx", -112, -205, 10),
  land("ArcticHare", -205, -112, 8),
  land("ArcticHare", -28, -178, 8),
  land("ArcticFox", -118, -132, 6),
  land("Wolf", -205, -190, 8),
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
