/**
 * Plato's Academy, Athens, a summer day of 360 a. C. (Berón 2026-11-23: «¿Podrías crear el de Platón? … recrear bien
 * el distrito, edificios, calles, sistemas, flora, terreno, personas»). The first microcosm of CodeShip, entered from
 * the simulation machine of the guard's assembly room (data/simulacion.ts), with Cold Sanctuary's rules for the
 * microcosms (docs/microcosmos-musk-historia.md): a district of ~300 × 300 m, the place at 1:1 and its insect-humans
 * at half size (s = 0,5), cut-away roofs, doors of ≥ 1,2 m, a landmark (the altar of Prometheus) and a period
 * transport that is used (the cart of the Dromos), basic needs inside, and each datum with its source or «supuesto».
 *
 * Metres, real, on the plan: x to the east, z to the south (the Dromos comes from the city, to the south-east in
 * truth: here it comes straight from the south, «orientación simplificada, supuesto»). docs/design/microcosmos.md.
 */
import type { Papel } from "../domain/vida";
import type { PasoHistoria } from "../domain/historia";

export type Realidad = "real" | "supuesto" | "ficcion";

export interface Fuente {
  readonly source: string;
  readonly reality: Realidad;
}

/** The size of the insect-humans against the place (Cold Sanctuary's microcosm rule). */
export const INSECT_SCALE = 0.5;
/** The district's half side, m (300 × 300 m). */
export const HALF = 150;
/** The date of the visit. */
export const FECHA = { label: "Atenas, la Academia · verano de 360 a. C.", year: -360, startHour: 8 } as const;

const S = {
  dl: "Diógenes Laercio, Vidas III–IV (la escuela en el gimnasio de la Academia, el jardín, el museo y la exedra)",
  paus: "Pausanias, Descripción de Grecia I.29–30 (el Dromos con las tumbas, el altar de Eros a la entrada, los de Prometeo, las Musas, Hermes, Atenea y Heracles)",
  cimon: "Plutarco, Cimón 13.8 (Cimón llevó el agua a la Academia, con pistas de carrera y paseos de sombra)",
  hip: "Suda, «Hipparchou teichion» (el muro de Hiparco, carísimo); IEP, «Plato: The Academy»",
  dromos: "Marchiandi, «The Academy road» (los 40 m de ancho del Dromos en época clásica)",
  caruso: "Caruso, A., «A New Athenian Gymnasium from the 4th Century BC?» (el peristilo cuadrado del s. IV a. C. como palestra)",
  vitr: "Vitruvio, De architectura V.11 (las salas de la palestra: efebeo, coriceo, conisterio, eleotesio, baños)",
  olinto: "Cahill, N., Household and City Organization at Olynthus (2002): casas de ~17 × 17 m alrededor de un patio, con andrón",
  aristof: "Aristófanes, Las nubes 1005–1008 (la Academia: olivos sagrados, el plátano y el olmo, el álamo blanco)",
  stadion: "El estadio ático: 600 pies, ~185 m (Miller, Ancient Greek Athletics, 2004)",
} as const;

/** A wall on the plan: along x or z, at a line, from–to, its height, with doorways (gaps). */
export interface Muro {
  readonly axis: "x" | "z";
  readonly at: number;
  readonly from: number;
  readonly to: number;
  readonly h: number;
  readonly t: number;
  readonly gaps?: readonly { readonly from: number; readonly to: number }[];
}

/** A room (or an open place) with a name: where people go and what the story points at. */
export interface Sala {
  readonly id: string;
  readonly label: string;
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** A thing in a room: a box (or a few) of its size, solid if it stops her. */
export interface Cosa {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly h: number;
  readonly rot?: number;
  readonly solid?: boolean;
  readonly y?: number;
}

export interface Edificio {
  readonly id: string;
  readonly label: string;
  /** Its outline (the roof is drawn over it, less its open courts; hidden while she is inside: the cut-away view). */
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  /** The floor's height over the ground (a step up). */
  readonly floor: number;
  readonly wallH: number;
  readonly walls: readonly Muro[];
  readonly rooms: readonly Sala[];
  /** Open courts (no roof over them). */
  readonly courts?: readonly Sala[];
  readonly columns?: readonly { readonly x: number; readonly z: number; readonly d: number; readonly h: number }[];
  readonly things: readonly Cosa[];
  readonly color: number;
  readonly fuente: Fuente;
  /** Its walls painted inside and out (a dado, a field, a band and a frieze). */
  readonly painted?: boolean;
  /** A thatched roof (the huts), not tiles. */
  readonly thatch?: boolean;
  /** Steps up to its floor along one side (from–to along it), when the floor is higher than a step. */
  readonly stairs?: readonly { readonly side: "x0" | "x1" | "z0" | "z1"; readonly from: number; readonly to: number }[];
}

const W = (axis: "x" | "z", at: number, from: number, to: number, h: number, gaps?: Muro["gaps"], t = 0.5): Muro => ({ axis, at, from, to, h, t, gaps });
const g = (from: number, to: number) => ({ from, to });
const room = (id: string, label: string, x0: number, x1: number, z0: number, z1: number): Sala => ({ id, label, x0, x1, z0, z1 });
const thing = (id: string, label: string, kind: string, x: number, z: number, w: number, d: number, h: number, o: Partial<Cosa> = {}): Cosa => ({ id, label, kind, x, z, w, d, h, solid: true, ...o });

/** A row of evenly spaced columns from a to b. */
function colonnade(x0: number, z0: number, x1: number, z1: number, n: number, d: number, h: number) {
  const out: { x: number; z: number; d: number; h: number }[] = [];
  for (let i = 0; i <= n; i++) out.push({ x: x0 + ((x1 - x0) * i) / n, z: z0 + ((z1 - z0) * i) / n, d, h });
  return out;
}

// --- The palaestra: the square peristyle of the 4th c. a. C. (Caruso), its rooms after Vitruvius ----------------------
const PAL_H = 5;
const PALESTRA: Edificio = {
  id: "palestra",
  label: "Palestra (peristilo cuadrado)",
  x0: -40,
  x1: 0,
  z0: -60,
  z1: -20,
  floor: 0.2,
  wallH: PAL_H,
  color: 0xe6dcc8,
  fuente: { source: `${S.caruso}; ${S.vitr}. Los 40 × 40 m y la altura de 5 m: supuesto`, reality: "real" },
  painted: true,
  walls: [
    // The outer walls; the way in from the south.
    W("x", -60, -40, 0, PAL_H),
    W("x", -20, -40, 0, PAL_H, [g(-21.5, -18.5)]),
    W("z", -40, -60, -20, PAL_H),
    W("z", 0, -60, -20, PAL_H),
    // The rooms' walls to the portico, each with its door.
    W("x", -54, -40, 0, PAL_H, [g(-31.4, -29.8), g(-25, -15), g(-11.2, -9.6)]),
    W("x", -26, -40, 0, PAL_H, [g(-30.2, -28.6), g(-21.5, -18.5), g(-12.2, -10.6)]),
    W("z", -34, -54, -26, PAL_H, [g(-48.2, -46.6), g(-34.2, -32.6)]),
    W("z", -6, -54, -26, PAL_H, [g(-48.2, -46.6), g(-34.2, -32.6)]),
    // Between the rooms.
    W("z", -26, -60, -54, PAL_H),
    W("z", -14, -60, -54, PAL_H),
    W("x", -40, -6, 0, PAL_H),
    W("x", -40, -40, -34, PAL_H),
    W("z", -24, -26, -20, PAL_H),
    W("z", -16, -26, -20, PAL_H),
  ],
  rooms: [
    room("palestra-vestuario", "Vestuario (apodyterion)", -40, -26, -60, -54),
    room("palestra-efebeo", "Efebeo: la sala de las lecciones", -26, -14, -60, -54),
    room("palestra-aceite", "Sala del aceite (elaiothesion)", -14, 0, -60, -54),
    room("palestra-sacos", "Sala del saco (korykeion)", -40, -34, -54, -40),
    room("palestra-almacen", "Almacén de pesas, discos y jabalinas", -40, -34, -40, -26),
    room("palestra-polvo", "Sala del polvo (konisterion)", -6, 0, -54, -40),
    room("palestra-banos", "Baños (loutron)", -6, 0, -40, -26),
    room("palestra-bancos-o", "Exedra con bancos (oeste)", -40, -24, -26, -20),
    room("palestra-vestibulo", "Vestíbulo", -24, -16, -26, -20),
    room("palestra-bancos-e", "Exedra con bancos (este)", -16, 0, -26, -20),
    room("palestra-portico", "Pórtico", -34, -6, -54, -26),
  ],
  courts: [room("palestra-patio", "Patio de arena (la lucha)", -31, -9, -51, -29)],
  columns: [
    // Nine bays on the north and south sides: the way in from the vestibule passes between two columns.
    ...colonnade(-31, -51, -9, -51, 9, 0.55, 4.6),
    ...colonnade(-31, -29, -9, -29, 9, 0.55, 4.6),
    ...colonnade(-31, -48.25, -31, -31.75, 6, 0.55, 4.6),
    ...colonnade(-9, -48.25, -9, -31.75, 6, 0.55, 4.6),
  ],
  things: [
    thing("banco-vestuario-1", "Banco del vestuario", "banco", -33, -58.8, 10, 0.5, 0.45),
    thing("perchas-vestuario", "Perchas para la ropa", "estante", -33, -59.7, 10, 0.2, 1.8),
    thing("banco-efebeo", "Bancos del efebeo", "banco", -20, -59, 9, 0.6, 0.45),
    thing("anforas-aceite", "Ánforas de aceite de oliva", "anforas", -7, -58.6, 4, 1.2, 0.9),
    thing("mesa-aceite", "Mesa para untarse", "mesa", -7, -56, 2, 0.9, 0.8),
    thing("saco-1", "Saco de cuero colgado (korykos)", "saco", -37, -50, 0.7, 0.7, 1.2, { y: 0.6 }),
    thing("saco-2", "Saco de cuero colgado (korykos)", "saco", -37, -44, 0.7, 0.7, 1.2, { y: 0.6 }),
    thing("pesas", "Pesas de salto (halteres), discos y jabalinas", "estante", -39.2, -33, 1, 6, 1.6),
    thing("arca-polvo", "Arca del polvo fino", "arca", -3, -52, 2.4, 1.2, 0.8),
    thing("pilas-1", "Pila para lavarse (louterion)", "pila", -3, -37, 1, 1, 0.9),
    thing("pilas-2", "Pila para lavarse (louterion)", "pila", -3, -33, 1, 1, 0.9),
    thing("pilas-3", "Pila para lavarse (louterion)", "pila", -3, -29, 1, 1, 0.9),
    thing("bancos-o", "Bancos de piedra", "banco", -32, -21, 14, 0.6, 0.45),
    thing("bancos-e", "Bancos de piedra", "banco", -8, -21, 14, 0.6, 0.45),
    thing("skamma", "Foso de arena cavada (skamma)", "foso", -20, -40, 6, 4, 0.05, { solid: false }),
    // Hermes and Heracles, the palaestra's gods, in the court's corners (Pausanias I.30: their altars in the Academy).
    thing("estatua-hermes", "Estatua de Hermes, dios de la palestra", "estatua", -30, -30, 0.7, 0.7, 2.2, { rot: Math.PI * 0.75 }),
    thing("estatua-heracles", "Estatua de Heracles", "estatua", -10, -30, 0.7, 0.7, 2.2, { rot: -Math.PI * 0.75 }),
    thing("aceite-mesa-vasos", "Aríbalos y estrígilos colgados", "estante", -1, -55, 0.4, 2.4, 1.8),
  ],
};

// --- The Museum (the shrine of the Muses that Plato set up), the exedra and the students' huts ------------------------
/** The nine Muses (Hesiod, Theogony 75–79), along the walls of the Museum. */
const MUSAS = ["Calíope", "Clío", "Euterpe", "Talía", "Melpómene", "Terpsícore", "Érato", "Polimnia", "Urania"];
const MUSEO: Edificio = {
  id: "museo",
  label: "Museo (santuario de las Musas)",
  x0: 24,
  x1: 36,
  z0: -84,
  z1: -71,
  floor: 0.6,
  wallH: 5,
  color: 0xf0ebe0,
  painted: true,
  stairs: [{ side: "z1", from: 24, to: 36 }],
  fuente: { source: `${S.dl} (IV 1: las Gracias que Espeusipo dedicó en el museo que Platón fundó). La planta de templo próstilo (pórtico de dos columnas sobre su crepidoma), el tamaño, los rollos y las estatuas: supuesto`, reality: "real" },
  walls: [
    W("x", -84, 24, 36, 5),
    W("x", -75, 24, 36, 5, [g(29, 31)]),
    W("z", 24, -84, -72, 5),
    W("z", 36, -84, -72, 5),
  ],
  rooms: [room("museo", "Museo: los libros y las Musas", 24, 36, -84, -75), room("museo-portico", "Pórtico del Museo", 24, 36, -75, -71)],
  columns: [
    { x: 28, z: -71.8, d: 0.7, h: 4.6 },
    { x: 32, z: -71.8, d: 0.7, h: 4.6 },
  ],
  things: [
    // The Muses, three on the back wall and three on each side, on their bases.
    ...MUSAS.map((m, i) => {
      const at = i < 3 ? { x: 27 + i * 3, z: -83.2, rot: 0 } : i < 6 ? { x: 24.8, z: -82 + (i - 3) * 2.2, rot: Math.PI / 2 } : { x: 35.2, z: -82 + (i - 6) * 2.2, rot: -Math.PI / 2 };
      return thing(`musa-${i}`, `Estatua de ${m}, musa`, "estatua", at.x, at.z, 0.7, 0.7, 2.2, { rot: at.rot });
    }),
    thing("rollos-1", "Estantería de rollos de papiro", "rollos", 28.5, -78.6, 3, 0.5, 2.1, { rot: 0 }),
    thing("rollos-2", "Estantería de rollos de papiro", "rollos", 31.5, -78.6, 3, 0.5, 2.1, { rot: 0 }),
    thing("mesa-museo", "Mesa para leer, con rollos abiertos y tablillas de cera", "mesa", 27.5, -76.6, 2, 0.9, 0.8),
    thing("mesa-museo-2", "Mesa para leer, con rollos abiertos y tablillas de cera", "mesa", 32.5, -76.6, 2, 0.9, 0.8),
    thing("silla-1", "Silla (klismos)", "silla", 27, -77.4, 0.5, 0.5, 0.9, { solid: false }),
    thing("silla-2", "Silla (klismos)", "silla", 33, -77.4, 0.5, 0.5, 0.9, { solid: false }),
    thing("lampadario-1", "Lampadario", "lampadario", 25.6, -76, 0.3, 0.3, 1.4),
    thing("lampadario-2", "Lampadario", "lampadario", 34.4, -76, 0.3, 0.3, 1.4),
  ],
};

/** A hut (kalybion) for one student (Diogenes Laertius IV 19: Polemon's disciples, later, built huts by the museum). */
function choza(i: number, x: number): Edificio {
  return {
    id: `choza-${i}`,
    label: "Choza de un discípulo",
    x0: x - 1.6,
    x1: x + 1.6,
    z0: -97,
    z1: -93,
    floor: 0.1,
    wallH: 2.6,
    color: 0xb59a74,
    fuente: { source: `${S.dl} IV 19, unos años después; en 360 a. C.: supuesto`, reality: "supuesto" },
    thatch: true,
    walls: [W("x", -97, x - 1.6, x + 1.6, 2.6, undefined, 0.3), W("x", -93, x - 1.6, x + 1.6, 2.6, [g(x - 0.6, x + 0.6)], 0.3), W("z", x - 1.6, -97, -93, 2.6, undefined, 0.3), W("z", x + 1.6, -97, -93, 2.6, undefined, 0.3)],
    rooms: [room(i === 0 ? "chozas" : `choza-${i}`, "Choza de un discípulo", x - 1.6, x + 1.6, -97, -93)],
    things: [thing(`jergon-${i}`, "Jergón de paja", "cama", x - 0.6, -96, 0.9, 1.9, 0.25), thing(`lampara-${i}`, "Lámpara de aceite", "lampara", x + 1.1, -96.4, 0.3, 0.3, 0.6)],
  };
}

// --- Plato's house, outside the west wall (a courtyard house like Olynthus's; Diogenes Laertius III 20, 41–43) ---------
const CASA_H = 4;
const CASA: Edificio = {
  id: "casa",
  label: "Casa de Platón",
  x0: -147,
  x1: -129,
  z0: -20,
  z1: -2,
  floor: 0.15,
  wallH: CASA_H,
  color: 0xd9c7a6,
  fuente: { source: `${S.olinto}; ${S.dl} III 20 y 41–43 (el jardín junto a la Academia; el testamento: la casa, los esclavos, Artemis libre). La planta: supuesto`, reality: "supuesto" },
  painted: true,
  walls: [
    W("x", -20, -147, -129, CASA_H),
    W("x", -2, -147, -129, CASA_H),
    W("z", -147, -20, -2, CASA_H),
    W("z", -129, -20, -2, CASA_H, [g(-5.8, -4.2)]),
    // The north rooms open onto the court (the andron's door off-centre, for its couches).
    W("x", -14, -147, -129, CASA_H, [g(-142.4, -141), g(-138.2, -136.8), g(-134.6, -133.2)]),
    W("z", -140, -20, -14, CASA_H),
    W("z", -135, -20, -14, CASA_H),
    W("z", -143, -14, -2, CASA_H, [g(-11.7, -10.3), g(-5.7, -4.3)]),
    W("z", -133, -14, -2, CASA_H, [g(-11.7, -10.3), g(-5.7, -4.3)]),
    W("x", -8, -147, -143, CASA_H),
    W("x", -8, -133, -129, CASA_H),
  ],
  rooms: [
    room("casa-andron", "Andrón: la sala de los banquetes", -147, -140, -20, -14),
    room("casa-cocina", "Cocina", -140, -135, -20, -14),
    room("casa-almacen", "Despensa", -135, -129, -20, -14),
    room("casa-dormitorio", "Dormitorio", -147, -143, -14, -8),
    room("casa-telar", "Sala del telar", -147, -143, -8, -2),
    room("casa-dormitorio-2", "Dormitorio de la casa", -133, -129, -14, -8),
    room("casa-entrada", "Entrada (prothyron)", -133, -129, -8, -2),
  ],
  courts: [room("casa-patio", "Patio", -143, -133, -14, -2)],
  things: [
    // The andron: couches round the walls (the size of a Greek dining room), small tables before them.
    thing("kline-1", "Lecho del banquete (kline)", "kline", -146.4, -18.5, 0.9, 1.9, 0.7),
    thing("kline-2", "Lecho del banquete (kline)", "kline", -146.4, -16, 0.9, 1.9, 0.7),
    thing("kline-3", "Lecho del banquete (kline)", "kline", -145, -19.4, 1.9, 0.9, 0.7),
    thing("kline-4", "Lecho del banquete (kline)", "kline", -142.7, -19.4, 1.9, 0.9, 0.7),
    thing("kline-5", "Lecho del banquete (kline)", "kline", -140.8, -17.5, 0.9, 1.9, 0.7),
    thing("mesa-andron", "Mesitas", "mesa", -144.2, -17.2, 1.2, 0.6, 0.5),
    thing("cratera", "Crátera (el vino con agua)", "vasija", -144.6, -14.8, 0.6, 0.6, 0.7),
    // The kitchen: the hearth, the hand mill, the table, the water jar.
    thing("hogar", "Hogar", "hogar", -137.5, -19.2, 1.6, 1, 0.5),
    thing("molino", "Molino de mano (piedra de moler)", "molino", -139.2, -16, 0.8, 0.5, 0.5),
    thing("mesa-cocina", "Mesa de la cocina", "mesa", -135.9, -16.5, 1, 2, 0.8),
    thing("hidria", "Hidria (el agua)", "vasija", -139.4, -14.8, 0.4, 0.4, 0.6),
    thing("pithoi", "Tinajas (pithoi): cebada, aceite, vino, higos", "anforas", -132, -18.6, 5, 1.4, 1.3),
    thing("cama-platon", "Cama", "cama", -145.8, -11, 1, 2, 0.5),
    thing("arca-ropa", "Arca de la ropa", "arca", -145, -13.4, 1, 0.5, 0.6),
    thing("orinal", "Orinal de barro (lasanon)", "vasija", -146.6, -8.6, 0.4, 0.4, 0.35),
    thing("telar", "Telar vertical", "telar", -145, -2.5, 2, 0.4, 2),
    thing("cama-casa", "Cama", "cama", -130.6, -11, 1, 2, 0.5),
    thing("altar-patio", "Altar del patio (Zeus Herkeios)", "altar", -138, -5.5, 0.8, 0.8, 0.9),
    thing("cisterna", "Boca de la cisterna", "pozo", -136, -11, 0.9, 0.9, 0.7),
    thing("herma-casa", "Herma a la puerta de la casa", "herma", -129.8, -6.5, 0.35, 0.35, 1.4),
    thing("silla-andron", "Silla (klismos)", "silla", -143.5, -15.4, 0.5, 0.5, 0.9, { solid: false }),
    thing("lampara-andron", "Lampadario del andrón", "lampadario", -146.5, -14.5, 0.3, 0.3, 1.4),
  ],
};

export const EDIFICIOS: readonly Edificio[] = [PALESTRA, MUSEO, CASA, choza(0, 60), choza(1, 66), choza(2, 72)];

/** The peribolos of Hipparchus round the gymnasium, its gate on the Dromos and its gap to Plato's garden. */
export const PERIBOLO = {
  x0: -120,
  x1: 120,
  z0: -130,
  z1: 60,
  h: 2.5,
  t: 0.7,
  gate: { from: -6, to: 6 },
  west: { from: -14, to: -6 },
  fuente: { source: `${S.hip}. Su trazado y su altura: supuesto`, reality: "supuesto" as Realidad },
};

export const PERIBOLO_MUROS: readonly Muro[] = [
  W("x", PERIBOLO.z1, PERIBOLO.x0, PERIBOLO.x1, PERIBOLO.h, [PERIBOLO.gate], PERIBOLO.t),
  W("x", PERIBOLO.z0, PERIBOLO.x0, PERIBOLO.x1, PERIBOLO.h, undefined, PERIBOLO.t),
  W("z", PERIBOLO.x0, PERIBOLO.z0, PERIBOLO.z1, PERIBOLO.h, [PERIBOLO.west], PERIBOLO.t),
  W("z", PERIBOLO.x1, PERIBOLO.z0, PERIBOLO.z1, PERIBOLO.h, undefined, PERIBOLO.t),
];

/** The open places: the Dromos, the track, the grove, the walks, the garden. */
export const LUGARES_ABIERTOS: readonly (Sala & { readonly ground: number; readonly fuente: Fuente })[] = [
  { ...room("dromos", "El Dromos (camino de la ciudad)", -20, 20, 60, HALF), ground: 0xc9b48e, fuente: { source: `${S.dromos}; ${S.paus}`, reality: "real" } },
  { ...room("pista", "Pista de carrera (un estadio)", 82, 96, -125, 60), ground: 0xd9c49a, fuente: { source: `${S.cimon}; ${S.stadion}. Su sitio: supuesto`, reality: "real" } },
  { ...room("olivar", "Olivar sagrado de Atenea (moriai)", -112, -52, -122, 45), ground: 0x8f9a5a, fuente: { source: `${S.aristof}; ${S.paus} (el olivo que fue el segundo en brotar)`, reality: "real" } },
  { ...room("paseo-platanos", "Paseo de los plátanos", 18, 42, -40, 45), ground: 0xb7a77e, fuente: { source: `${S.cimon}; ${S.aristof}`, reality: "real" } },
  { ...room("huerto", "Huerto y jardín de Platón", -148, -122, 0, 30), ground: 0x7d8c4a, fuente: { source: `${S.dl} III 20 (el jardín); los cultivos: supuesto`, reality: "supuesto" } },
  { ...room("exedra", "Exedra bajo los plátanos", 42, 58, -64, -48), ground: 0xbfae86, fuente: { source: `${S.dl} IV 19 (la exedra)`, reality: "real" } },
];

/** The altars (Pausanias I.30): Prometheus's is the landmark, where the torch race sets off for the city. */
export const ALTARES: readonly (Cosa & { readonly fuente: Fuente; readonly fire?: boolean })[] = [
  { ...thing("altar-prometeo", "Altar de Prometeo (de aquí sale la carrera de antorchas)", "altar", 0, 40, 3, 1.6, 1.2), fire: true, fuente: { source: S.paus, reality: "real" } },
  { ...thing("altar-eros", "Altar de Eros, a la entrada", "altar", -9, 67, 1.6, 1, 1.1), fuente: { source: S.paus, reality: "real" } },
  { ...thing("altar-hermes", "Altar de Hermes", "altar", 14, 48, 1.4, 1, 1), fuente: { source: S.paus, reality: "real" } },
  { ...thing("altar-atenea", "Altar de Atenea, junto a los olivos", "altar", -48, 30, 1.6, 1.2, 1.1), fuente: { source: S.paus, reality: "real" } },
  { ...thing("altar-heracles", "Altar de Heracles", "altar", 70, -10, 1.4, 1, 1), fuente: { source: S.paus, reality: "real" } },
  { ...thing("altar-musas", "Altar de las Musas", "altar", 24.5, -68.5, 1.4, 1, 1), fuente: { source: S.paus, reality: "real" } },
];

/** Water: Cimon's channel from the Kephissos (it waters the grove), the fountain basin, the house's cistern below ground. */
export const AGUAS: readonly (Sala & { readonly depth: number; readonly fuente: Fuente })[] = [
  { ...room("acequia", "Acequia de Cimón (agua del Cefiso)", -46.2, -44.6, -128, 40), depth: 0.6, fuente: { source: `${S.cimon}; su trazado: supuesto`, reality: "real" } },
  { ...room("fuente", "Fuente (pilón para beber y lavarse)", -22, -18, -13, -11), depth: 0.7, fuente: { source: "Las fuentes de los gimnasios (Vitruvio V.11); su sitio: supuesto", reality: "supuesto" } },
];

/** Footbridges over the channel, where the ways cross it. */
export const PUENTES: readonly Sala[] = [room("puente-1", "Pasarela sobre la acequia", -47, -43.8, 0, 4.5), room("puente-2", "Pasarela sobre la acequia", -47, -43.8, 20, 26)];

/** Other things in the open: the tombs along the Dromos, the exedra's bench, the track's posts, the garden. */
export const COSAS_FUERA: readonly Cosa[] = [
  // The state tombs of the Demosion Sema along the road (Pausanias I.29): stelai and mounds on both sides.
  ...Array.from({ length: 9 }, (_, i) => [
    thing(`tumba-o-${i}`, "Tumba de los caídos (Demosion Sema)", i % 3 === 1 ? "tumulo" : "estela", -25, 74 + i * 9, i % 3 === 1 ? 5 : 2, i % 3 === 1 ? 5 : 0.6, i % 3 === 1 ? 2 : 2.2),
    thing(`tumba-e-${i}`, "Tumba de los caídos (Demosion Sema)", i % 3 === 2 ? "tumulo" : "estela", 25, 78 + i * 9, i % 3 === 2 ? 5 : 2, i % 3 === 2 ? 5 : 0.6, i % 3 === 2 ? 2 : 2.2),
  ]).flat(),
  // The exedra: a half-round stone bench (in nine straight pieces), open to the south (people sit on it).
  ...Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI + Math.PI * (i / 8);
    return thing(`exedra-${i}`, "Banco de la exedra", "banco", 50 + Math.cos(a) * 6, -55 + Math.sin(a) * 6, 2.3, 0.6, 0.45, { rot: -a + Math.PI / 2, solid: false });
  }),
  thing("arena-geometria", "Arena para dibujar figuras", "foso", 50, -57, 3, 2, 0.04, { solid: false }),
  thing("gnomon", "Gnomon (la varilla del reloj de sombra)", "gnomon", 37, -67, 0.12, 0.12, 1.5),
  thing("meta-sur", "Poste de salida de la pista", "poste", 89, 55, 0.3, 0.3, 1.4),
  thing("meta-norte", "Poste de vuelta de la pista", "poste", 89, -120, 0.3, 0.3, 1.4),
  thing("antorchas", "Haz de antorchas", "estante", 3, 42.5, 1, 0.4, 1.2),
  thing("estatua-atenea", "Estatua de Atenea, junto a sus olivos", "estatua", -51, 30, 0.8, 0.8, 2.6, { rot: Math.PI / 2 }),
  thing("herma-puerta-1", "Herma de la puerta", "herma", -8, 58, 0.4, 0.4, 1.6),
  thing("herma-palestra-1", "Herma a la entrada de la palestra (Hermes en un pilar)", "herma", -23, -18.6, 0.4, 0.4, 1.6),
  thing("herma-palestra-2", "Herma a la entrada de la palestra (Hermes en un pilar)", "herma", -17, -18.6, 0.4, 0.4, 1.6),
  thing("herma-puerta-2", "Herma de la puerta", "herma", 8, 58, 0.4, 0.4, 1.6),
  thing("compuerta", "Compuerta de la acequia", "compuerta", -45.4, -60, 1.6, 0.3, 0.6, { solid: false }),
  thing("bancal-1", "Bancal de lentejas y habas", "bancal", -140, 10, 6, 3, 0.25, { solid: false }),
  thing("bancal-2", "Bancal de coles y cebollas", "bancal", -130, 10, 6, 3, 0.25, { solid: false }),
  thing("bancal-3", "Bancal de hierbas (eneldo, menta, tomillo)", "bancal", -140, 20, 6, 3, 0.25, { solid: false }),
  thing("parra", "Parra en su emparrado", "parra", -128, 22, 4, 4, 2.4, { solid: false }),
];

/** Trees: the kinds and where they grow. Each with its source; their number and places are generated (deterministic). */
export const ARBOLES = {
  olivo: { label: "Olivo (Olea europaea)", h: 6, crown: 3, fuente: { source: S.aristof, reality: "real" as Realidad } },
  platano: { label: "Plátano de Oriente (Platanus orientalis)", h: 20, crown: 7, fuente: { source: `${S.aristof}; Platón, Fedro 229a–230b (el plátano a la orilla del Iliso)`, reality: "real" as Realidad } },
  olmo: { label: "Olmo (Ulmus minor)", h: 15, crown: 5, fuente: { source: S.aristof, reality: "real" as Realidad } },
  alamo: { label: "Álamo blanco (Populus alba)", h: 18, crown: 4, fuente: { source: S.aristof, reality: "real" as Realidad } },
  higuera: { label: "Higuera (Ficus carica)", h: 5, crown: 3, fuente: { source: "El huerto ático; supuesto", reality: "supuesto" as Realidad } },
} as const;
export type Arbol = keyof typeof ARBOLES;

const rnd = (i: number, k: number) => {
  let h = 2166136261;
  for (const c of `${i}:${k}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
};

/** Every tree of the district: the sacred grove's olives on a jittered grid, the planes along the walk and the track, elms and poplars by the channel, a fig in the garden. */
export function trees(): { kind: Arbol; x: number; z: number; s: number }[] {
  const out: { kind: Arbol; x: number; z: number; s: number }[] = [];
  let i = 0;
  for (let x = -108; x <= -56; x += 8)
    for (let z = -118; z <= 42; z += 8) {
      if (Math.abs(x + 48) < 4 && Math.abs(z - 30) < 4) continue;
      out.push({ kind: "olivo", x: x + (rnd(i, 1) - 0.5) * 3, z: z + (rnd(i, 2) - 0.5) * 3, s: 0.8 + rnd(i, 3) * 0.4 });
      i++;
    }
  for (let z = -36; z <= 44; z += 10) {
    out.push({ kind: "platano", x: 16, z, s: 0.85 + rnd(i++, 3) * 0.3 });
    out.push({ kind: "platano", x: 44, z, s: 0.85 + rnd(i++, 3) * 0.3 });
  }
  for (let z = -115; z <= 50; z += 15) out.push({ kind: "platano", x: 76, z, s: 0.8 + rnd(i++, 3) * 0.3 });
  for (const [x, z] of [[40, -48], [60, -46], [38, -62], [62, -62]] as const) out.push({ kind: "platano", x, z, s: 1 });
  for (let z = -120; z <= 30; z += 18) {
    out.push({ kind: "olmo", x: -49.5, z, s: 0.9 + rnd(i++, 3) * 0.2 });
    out.push({ kind: "alamo", x: -41, z: z + 9, s: 0.9 + rnd(i++, 3) * 0.2 });
  }
  out.push({ kind: "higuera", x: -126, z: 4, s: 1 }, { kind: "higuera", x: -146, z: 27, s: 0.9 });
  return out;
}

/** The background: the hill of Kolonos and the city with the Acropolis, out of the walkable district (closer than in truth). */
export const FONDO = [
  { id: "colono", label: "Colono Hipio (la colina de Sófocles)", kind: "colina", x: -230, z: -230, r: 70, h: 18 },
  { id: "acropolis", label: "La Acrópolis con el Partenón (a ~2,5 km en realidad)", kind: "acropolis", x: 420, z: 620, r: 90, h: 70 },
  { id: "murallas", label: "Las murallas y la puerta del Dipilón", kind: "murallas", x: 120, z: 420, r: 160, h: 9 },
] as const;

/**
 * The way back to the mesocosm (Cold Sanctuary's GalaxyPortal, Berón 2026-10-27: «como un agujero negro en medio de una
 * galaxia»): by the road's end where she arrives, out of the way. Ficción.
 */
export const PORTAL = { x: -12, z: 144, r: 2.4 } as const;

/** The period transport: the cart of the Dromos (a two-wheeled cart, a donkey), from the road's end to the gate. */
export const CARRO = {
  id: "carro",
  label: "Carro del Dromos (hamaxa con un asno)",
  from: { x: 9, z: 142 },
  to: { x: 9, z: 70 },
  speed: 1.1,
  fuente: { source: "Los carros de dos ruedas tirados por asnos y mulas del Ática (Burford, «Heavy Transport in Classical Antiquity», 1960); su uso aquí: supuesto", reality: "supuesto" as Realidad },
};

/** Where people go, as a point and the waypoints to it from its region's hub (so they keep to doors and gates). */
export interface Lugar {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  /** How far round the point people spread, m. */
  readonly r: number;
  readonly region: "dentro" | "fuera" | "casa";
  /** From the region's hub to the place. */
  readonly path: readonly (readonly [number, number])[];
}

const into = (path: readonly (readonly [number, number])[]) => path;
const PAL_IN = [[-14, -14], [-20, -18], [-20, -24], [-20, -27.5]] as const;
const CASA_IN = [[-138, -8]] as const;

export const LUGARES: readonly Lugar[] = [
  { id: "ciudad", x: 0, z: 149, r: 6, region: "fuera", path: into([[0, 100], [0, 149]]) },
  { id: "dromos", x: 9, z: 105, r: 30, region: "fuera", path: into([[9, 105]]) },
  { id: "carro", x: 9, z: 140, r: 2, region: "fuera", path: into([[6, 120], [6, 140]]) },
  { id: "puerta", x: 0, z: 54, r: 4, region: "dentro", path: into([[0, 54]]) },
  { id: "altar-prometeo", x: 0, z: 43, r: 2.5, region: "dentro", path: into([[0, 43]]) },
  { id: "fuente", x: -20, z: -9.5, r: 1.5, region: "dentro", path: into([[-20, -9.5]]) },
  { id: "palestra-patio", x: -20, z: -40, r: 6, region: "dentro", path: into([...PAL_IN, [-20, -40]]) },
  { id: "palestra-banos", x: -4.8, z: -33.4, r: 0.5, region: "dentro", path: into([...PAL_IN, [-7.5, -27.5], [-7.5, -33.4], [-4.8, -33.4]]) },
  { id: "palestra-aceite", x: -10.4, z: -57, r: 1, region: "dentro", path: into([...PAL_IN, [-7.5, -27.5], [-7.5, -52.5], [-10.4, -52.5], [-10.4, -57]]) },
  { id: "exedra", x: 50, z: -57, r: 3.5, region: "dentro", path: into([[30, 0], [50, -45], [50, -57]]) },
  { id: "museo", x: 30, z: -77.6, r: 0.8, region: "dentro", path: into([[30, 0], [30, -60], [30, -69.5], [30, -73], [30, -77.6]]) },
  { id: "chozas", x: 60, z: -95, r: 1, region: "dentro", path: into([[30, 0], [55, -60], [60, -88], [60, -95]]) },
  { id: "paseo-platanos", x: 30, z: 0, r: 10, region: "dentro", path: into([[30, 0]]) },
  { id: "pista", x: 89, z: -35, r: 6, region: "dentro", path: into([[60, 20], [89, -35]]) },
  { id: "olivar", x: -80, z: -40, r: 18, region: "dentro", path: into([[-30, 20], [-80, -40]]) },
  { id: "acequia", x: -43.5, z: -60, r: 2, region: "dentro", path: into([[-30, 20], [-43.5, 0], [-43.5, -60]]) },
  { id: "casa-patio", x: -138, z: -8, r: 1.5, region: "casa", path: into(CASA_IN) },
  { id: "casa-andron", x: -142.8, z: -16.2, r: 0.8, region: "casa", path: into([...CASA_IN, [-141.7, -12.5], [-141.7, -15.5], [-142.8, -16.2]]) },
  { id: "casa-cocina", x: -137.5, z: -16.5, r: 0.6, region: "casa", path: into([...CASA_IN, [-137.5, -12], [-137.5, -16.5]]) },
  { id: "casa-dormitorio", x: -144.4, z: -11, r: 0.4, region: "casa", path: into([...CASA_IN, [-140, -11], [-144.4, -11]]) },
  { id: "huerto", x: -135, z: 15, r: 6, region: "casa", path: into([...CASA_IN, [-136, -5], [-131, -5], [-127, -5], [-125, 5], [-135, 15]]) },
];

/** The regions' hubs and the ways between them (through the gate and the west gap). */
export const HUBS = { dentro: [0, 50], fuera: [0, 66], casa: [-138, -8] } as const;
export const ENTRE: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  "dentro>fuera": [[0, 50], [0, 66]],
  "dentro>casa": [[0, 50], [-100, -10], [-117, -10], [-124, -10], [-127, -5], [-131, -5], [-136, -5], [-138, -8]],
};

/** The people of that day. Ages from their births (Diogenes Laertius); «supuesto» where unknown. */
export interface Persona {
  readonly id: string;
  readonly name: string;
  readonly papel: Papel;
  readonly age: number;
  readonly feminine?: boolean;
  /** Robe (himation/chiton) and hair colours. */
  readonly robe: number;
  readonly hair: number;
  readonly beard?: boolean;
  readonly fuente: Fuente;
}

export const PERSONAS: readonly Persona[] = [
  { id: "platon", name: "Platón", papel: "maestro", age: 67, robe: 0xe9e2d0, hair: 0xd7d3cc, beard: true, fuente: { source: `${S.dl} III 2 (nació en 428/427 a. C.)`, reality: "real" } },
  { id: "espeusipo", name: "Espeusipo", papel: "discipulo", age: 48, robe: 0x9c6b4e, hair: 0x6b5a48, beard: true, fuente: { source: `${S.dl} IV 1 (sobrino de Platón, su sucesor); la edad: aproximada`, reality: "real" } },
  { id: "jenocrates", name: "Jenócrates", papel: "discipulo", age: 36, robe: 0x5d6f8a, hair: 0x3d2f24, beard: true, fuente: { source: `${S.dl} IV 6–14 (nació hacia 396 a. C.)`, reality: "real" } },
  { id: "aristoteles", name: "Aristóteles", papel: "discipulo", age: 24, robe: 0x7a4a6a, hair: 0x2e2219, beard: true, fuente: { source: "Diógenes Laercio V 9 (nació en 384 a. C. y entró en la Academia a los 17)", reality: "real" } },
  { id: "heraclides", name: "Heráclides Póntico", papel: "discipulo", age: 30, robe: 0xb08a3e, hair: 0x4a3626, beard: true, fuente: { source: "Diógenes Laercio V 86 (discípulo de Platón); la edad: aproximada", reality: "real" } },
  { id: "filipo", name: "Filipo de Opunte", papel: "discipulo", age: 40, robe: 0x4e7a5a, hair: 0x3a2e25, beard: true, fuente: { source: "Diógenes Laercio III 37 (copió las Leyes; astrónomo); la edad: supuesto", reality: "real" } },
  { id: "axiotea", name: "Axiotea de Fliunte", papel: "discipulo", age: 28, feminine: true, robe: 0xc9c2b0, hair: 0x2f241b, fuente: { source: `${S.dl} III 46 (iba vestida de hombre); la edad: supuesto`, reality: "real" } },
  { id: "lastenia", name: "Lastenia de Mantinea", papel: "discipulo", age: 26, feminine: true, robe: 0x8a5a7a, hair: 0x5a3a24, fuente: { source: `${S.dl} III 46; la edad: supuesto`, reality: "real" } },
  { id: "artemis", name: "Ártemis", papel: "casa", age: 30, feminine: true, robe: 0x9a8a6a, hair: 0x3a2a1e, fuente: { source: `${S.dl} III 42 (en su testamento Platón la deja libre); la edad: supuesto`, reality: "real" } },
  { id: "paidotriba", name: "El paidotriba (entrenador)", papel: "entrenador", age: 45, robe: 0xa04030, hair: 0x2a2018, beard: true, fuente: { source: "Miller, Ancient Greek Athletics (2004): el paidotriba enseñaba la lucha; él: supuesto", reality: "supuesto" } },
  { id: "jardinero", name: "El jardinero del olivar", papel: "jardinero", age: 52, robe: 0x7a6a4a, hair: 0x5a5048, beard: true, fuente: { source: "Supuesto: alguien cuidaba el olivar y las acequias", reality: "supuesto" } },
  { id: "carretero", name: "El carretero del Dromos", papel: "carretero", age: 38, robe: 0x6a5a40, hair: 0x2a2018, beard: true, fuente: { source: CARRO.fuente.source, reality: "supuesto" } },
];

/** The families whose lines live at the insects' pace (domain/vida.ts): the Athenians who come to the gymnasium. */
export const FAMILIAS: readonly { readonly family: string; readonly age: number; readonly robe: number }[] = [
  { family: "Glauco", age: 9, robe: 0xd8cdb4 },
  { family: "Teodoro", age: 15, robe: 0xc2b28e },
  { family: "Calias", age: 18, robe: 0xb89e7a },
  { family: "Démeas", age: 22, robe: 0x9e8a6a },
  { family: "Eutidemo", age: 27, robe: 0xd0c4a8 },
  { family: "Nicóstrato", age: 33, robe: 0x8e7e60 },
  { family: "Arquipo", age: 41, robe: 0xb0a080 },
  { family: "Cleobulo", age: 50, robe: 0x7e6e50 },
  { family: "Hegesias", age: 63, robe: 0xc8c0a8 },
  { family: "Dorión", age: 71, robe: 0xa89878 },
  { family: "Lisicles", age: 12, robe: 0xd4c8ae },
  { family: "Menecles", age: 3, robe: 0xc0b090 },
];

/** The story of the day: eight steps, six with a challenge (data/retos-academia.ts). */
export const HISTORIA: readonly PasoHistoria[] = [
  { id: "llegar", icon: "🛤️", at: "puerta", text: "Llega por el Dromos, entre las tumbas de los caídos, hasta la puerta de la Academia (puedes subir al carro)" },
  { id: "lucha", icon: "🤼", at: "palestra-patio", reto: "aca-lucha", with: "paidotriba", text: "En la palestra, el paidotriba enseña a luchar: prepárate como un atleta" },
  { id: "cuadrado", icon: "📐", at: "exedra", reto: "aca-cuadrado", with: "platon", text: "En la exedra, Platón pregunta cómo se duplica un cuadrado" },
  { id: "riego", icon: "🫒", at: "acequia", reto: "aca-riego", with: "jardinero", text: "Ayuda al jardinero a regar el olivar con la acequia de Cimón" },
  { id: "comida", icon: "🫓", at: "casa-cocina", reto: "aca-comida", with: "artemis", text: "En casa de Platón, prepara la comida sencilla con Ártemis" },
  { id: "andron", icon: "🍇", at: "casa-andron", with: "platon", text: "Come con Platón y los discípulos en el andrón" },
  { id: "gnomon", icon: "☀️", at: "museo", reto: "aca-gnomon", with: "filipo", text: "En el Museo, Filipo de Opunte mide el día con el gnomon" },
  { id: "antorcha", icon: "🔥", at: "altar-prometeo", reto: "aca-antorcha", with: "aristoteles", text: "Al atardecer, ensaya la carrera de antorchas desde el altar de Prometeo" },
];
