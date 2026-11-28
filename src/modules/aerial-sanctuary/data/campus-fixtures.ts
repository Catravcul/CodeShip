import { roomKit, type FurnishSink, type RoomFrame } from "./fixtures";
import { CAMPUS_SRC as C } from "./campus";

/**
 * The campus rooms' furniture and equipment (data/campus.ts), at true size, each where its real counterpart would be:
 * against the walls, the ways to the machines (data/campus.ts `via`) left clear. Sources in data/campus.ts.
 */
type Furnish = (sink: FurnishSink, fr: RoomFrame) => void;

const residencia: Furnish = (sink, fr) => {
  const { at, partition, lights } = roomKit(sink, fr);
  // Four bedrooms along the north wall (one per crew member, as the Crew Quarters), the common room to the south.
  partition("x", 2, -13.55, 13.55, 0, 2.6, [{ at: -11.6, w: 1.1, y1: 2.1 }, { at: -3.6, w: 1.1, y1: 2.1 }, { at: 3.4, w: 1.1, y1: 2.1 }, { at: 10.4, w: 1.1, y1: 2.1 }], 0xe9e4da, "Tabique de los dormitorios");
  for (const x of [-7, 0, 7]) partition("z", x, 2.1, 7.55, 0, 2.6, [], 0xe9e4da, "Tabique de los dormitorios");
  for (const [i, c] of [-10.5, -3.5, 3.5, 10.5].entries()) {
    at({ k: "cama", x: c + 0.3, z: 0, snap: "n", rot: 2, plate: i === 0, ...(i === 0 ? { name: "Tu cama (dormitorio 1)" } : {}) });
    at({ k: "mesa", x: c - 2.1, z: 0, snap: "n", rot: 2, w: 1.2, d: 0.6, name: "Escritorio del dormitorio", source: C.crewQuarters });
    at({ k: "armario", x: c + 2.4, z: 0, snap: "n", rot: 2, name: "Armario del dormitorio", source: C.crewQuarters });
  }
  at({ k: "sofa", x: 0, z: -2, snap: "w", rot: 1, plate: true });
  at({ k: "tele-pared", x: 0, z: -2, snap: "e", rot: 3, y: 1.4, name: "Tele de la sala común" });
  at({ k: "mesa-reunion", x: -6, z: -1.6, w: 2.4, d: 1.0, name: "Mesa de la sala común", source: C.crewQuarters });
  for (const x of [-6.8, -5.2]) at({ k: "silla", x, z: -0.6, rot: 2 });
  at({ k: "caja", x: -6.2, z: 0, snap: "s", w: 0.6, d: 0.6, h: 0.85, color: 0xf2f2f2, name: "Lavadora", source: C.crewQuarters, plate: true });
  at({ k: "caja", x: -5.4, z: 0, snap: "s", w: 0.6, d: 0.6, h: 0.85, color: 0xe8e8e8, name: "Secadora", source: C.crewQuarters });
  at({ k: "planta", x: 12.8, z: -6.8 });
  lights(4, 3, fr.height - 0.1);
};

const restaurante: Furnish = (sink, fr) => {
  const { at, partition, lights } = roomKit(sink, fr);
  // The crew's kitchen along the north wall and the dining room; past the partition, the food lab and its tasting table.
  at({ k: "cocina", x: -11, z: 0, snap: "n", rot: 2, plate: true });
  at({ k: "cocina", x: -9.1, z: 0, snap: "n", rot: 2, name: "Horno y campana" });
  at({ k: "mostrador", x: -6.4, z: 0, snap: "n", rot: 2, w: 2.4, h: 0.92, name: "Encimera y fregadero" });
  at({ k: "nevera", x: -4.6, z: 0, snap: "n", rot: 2, plate: true });
  at({ k: "caja", x: -3.6, z: 0, snap: "n", rot: 2, w: 0.6, d: 0.6, h: 0.85, color: 0xd0d4d8, name: "Lavavajillas" });
  for (const [x, z] of [[-5, 2.6], [-10, 2.6], [-10, -2.4]] as const) {
    at({ k: "mesa-reunion", x, z, w: 2.4, d: 1.0, name: "Mesa del comedor", source: C.starport });
    for (const dx of [-0.7, 0.7]) at({ k: "silla", x: x + dx, z: z + 1, rot: 2 });
  }
  partition("z", 2, -8.55, 8.55, 0, 3, [{ at: -6, w: 1.6, y1: 2.2 }], 0xe9edf0, "Tabique del laboratorio de alimentos");
  at({ k: "mesa-reunion", x: 8, z: 2.6, w: 3, d: 1.0, name: "Mesa de catas (escala hedónica de 1 a 9)", source: C.foodLab, plate: true });
  for (const dx of [-1, 0, 1]) at({ k: "silla", x: 8 + dx, z: 3.6, rot: 2 });
  at({ k: "cocina", x: 10.5, z: 0, snap: "n", rot: 2, name: "Cocina de pruebas del laboratorio", source: C.foodLab });
  at({ k: "nevera", x: 12.5, z: 0, snap: "n", rot: 2, name: "Congelador de muestras", source: C.foodLab });
  at({ k: "estanteria", x: 0, z: -4, snap: "e", rot: 3, name: "Bolsas de comida espacial termoestabilizada y rehidratable", source: C.foodLab, plate: true });
  lights(4, 3, fr.height - 0.1);
};

const clinica: Furnish = (sink, fr) => {
  const { at, partition, lights } = roomKit(sink, fr);
  at({ k: "camilla-exam", x: -8.5, z: 3.5, rot: 1, plate: true, name: "Camilla de la consulta del médico de vuelo", source: C.flightMed });
  at({ k: "mesa", x: -8, z: 0, snap: "s", name: "Mesa del médico de vuelo", source: C.flightMed });
  at({ k: "silla", x: -8, z: -6.1 });
  at({ k: "armario", x: -10, z: 0, snap: "w", rot: 1, name: "Armario de medicamentos" });
  at({ k: "sillon-dental", x: -3.5, z: -4.5, plate: true });
  at({ k: "lavabo", x: -3.5, z: 0, snap: "s" });
  partition("z", 6, -7.55, 7.55, 0, 2.6, [{ at: 0, w: 1.2, y1: 2.1 }], 0xe9edf0, "Tabique de la cuarentena");
  for (const z of [-4.5, 4.5]) at({ k: "cama", x: 0, z, snap: "e", rot: 3, name: "Habitación de la cuarentena de estabilización", source: C.hsp, plate: z < 0 });
  lights(3, 2, fr.height - 0.1);
};

const aulas: Furnish = (sink, fr) => {
  const { at, lights } = roomKit(sink, fr);
  for (const z of [1.6, 3.4, 5.2]) for (const x of [-3, 0, 3]) {
    at({ k: "pupitre", x, z, rot: 1, plate: x === 0 && z === 1.6 });
    at({ k: "silla", x: x - 0.7, z, rot: 1 });
  }
  at({ k: "pizarra", x: 0, z: 0, snap: "e", rot: 3, y: 1.0, w: 3, name: "Pizarra con el esquema del soporte vital", source: C.starCity, plate: true });
  at({ k: "tele-pared", x: 0, z: -4, snap: "e", rot: 3, y: 1.4, name: "Pantalla de la clase" });
  at({ k: "mesa", x: 6.5, z: -4.5, name: "Mesa del profesor" });
  at({ k: "estanteria", x: -6, z: 0, snap: "s", name: "Manuales de los sistemas" });
  lights(3, 2, fr.height - 0.1);
};

const biblioteca: Furnish = (sink, fr) => {
  const { at, lights } = roomKit(sink, fr);
  for (const x of [-7, -5.5, -4, -2.5, -1, 0.5, 2, 3.5]) for (const s of ["n", "s"] as const) at({ k: "estanteria", x, z: 0, snap: s, rot: s === "n" ? 2 : 0, plate: x === -7 && s === "n", name: "Manuales, procedimientos y libros", source: C.library });
  at({ k: "mesa", x: 0, z: 1.0, name: "Mesa de estudio con el ODF", source: C.library, plate: true });
  for (const [x, z] of [[-4, 2.6], [-4, -2.6], [3, -2.6]] as const) {
    at({ k: "mesa", x, z, name: "Mesa de estudio" });
    at({ k: "silla", x, z: z + (z > 0 ? 0.8 : -0.8), rot: z > 0 ? 2 : 0 });
  }
  for (const z of [-3, 0, 3]) at({ k: "mesa", x: 0, z, snap: "w", rot: 1, w: 1.2, name: "Puesto de consulta de los procedimientos" });
  lights(3, 2, fr.height - 0.1);
};

const laboratorio: Furnish = (sink, fr) => {
  const { at, lights } = roomKit(sink, fr);
  at({ k: "guantera", x: 4, z: 0, snap: "n", rot: 2, plate: true });
  at({ k: "guantera", x: 7.5, z: 0, snap: "n", rot: 2, name: "Segunda guantera" });
  at({ k: "mesa", x: -2, z: 0, snap: "n", rot: 2, name: "Balanza de precisión y microscopio", source: C.glovebox, plate: true });
  at({ k: "nevera", x: 2, z: 0, snap: "s", name: "Congelador de −80 °C", source: C.glovebox, plate: true });
  at({ k: "estanteria", x: 5, z: 0, snap: "s", name: "Bolsas de teflón y envases de muestras" });
  at({ k: "lavabo", x: -5, z: 0, snap: "s" });
  at({ k: "botellas", x: 0, z: 4, snap: "e", rot: 3, name: "Botellas de nitrógeno seco" });
  lights(3, 2, fr.height - 0.1);
};

/** The name of the census board of the breeding room, the one inside the mountain (s3-biome.ts finds it by it). */
export const CENSUS_BOARD = "Censo de la nave";

const crianza: Furnish = (sink, fr) => {
  const { at, lights } = roomKit(sink, fr);
  for (const x of [-6, -4, -2]) at({ k: "insectario", x, z: 0, snap: "n", rot: 2, plate: x === -4 });
  at({ k: "mesa", x: 1.5, z: 0, snap: "n", rot: 2, name: "Mesa de los viales: comida de levadura y harina de maíz", source: C.flyLab });
  at({ k: "colmena", x: 5, z: 0, snap: "s", plate: true });
  at({ k: "estanteria", x: 1, z: 0, snap: "s", name: "Material de la colmena y del insectario" });
  at({ k: "mesa", x: 0, z: 0, snap: "w", rot: 1, name: "Microscopio de disección (lupa)", source: C.flyLab });
  // The hall's census (s3-biome.ts): the giant insects, the Carboniferous and the lake's larvae (outside, the hut's is the real fauna's).
  at({ k: "pizarra", x: -5, z: 0, snap: "s", y: 1.0, name: CENSUS_BOARD, plate: true });
  lights(3, 2, fr.height - 0.1);
};

const huerto: Furnish = (sink, fr) => {
  const { at, lights } = roomKit(sink, fr);
  at({ k: "camara-cultivo", x: -6, z: 0, snap: "n", rot: 2, plate: true });
  at({ k: "camara-cultivo", x: -8, z: 0, snap: "n", rot: 2, name: "Advanced Plant Habitat", source: C.veggie });
  for (const z of [-4, 0, 4]) for (const x of [4, 8]) at({ k: "estante-cultivo", x, z, plate: x === 4 && z === 0 });
  at({ k: "mesa", x: -9, z: 0, snap: "s", name: "Mesa de siembra: cojines, semillas y mechas", source: C.veggie });
  at({ k: "lavabo", x: -6.5, z: 0, snap: "s" });
  lights(4, 3, fr.height - 0.1);
};

const taller: Furnish = (sink, fr) => {
  const { at, lights } = roomKit(sink, fr);
  at({ k: "impresora-3d", x: 7, z: 0, snap: "s", plate: true });
  at({ k: "impresora-3d", x: 9, z: 0, snap: "s", name: "Segunda impresora 3D" });
  at({ k: "torno", x: -8, z: -3, rot: 1, plate: true });
  at({ k: "fresadora", x: -8, z: 3, plate: true });
  at({ k: "banco-trabajo", x: 0, z: 0, snap: "w", rot: 1, plate: true });
  at({ k: "carro-herramientas", x: -4.5, z: 0 });
  at({ k: "estanteria", x: 10, z: 0, snap: "n", rot: 2, name: "Filamento, tornillería y repuestos" });
  at({ k: "extintor", x: -6, z: 0, snap: "n", rot: 2 });
  lights(4, 3, fr.height - 0.1);
};

const asambleas: Furnish = (sink, fr) => {
  const { at, lights } = roomKit(sink, fr);
  at({ k: "mesa-reunion", x: 0, z: 2.6, w: 6, d: 1.6, name: "Mesa de la Oficina de Astronautas", source: C.astroOffice, plate: true });
  for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) at({ k: "silla", x, z: 3.9, rot: 2 });
  for (const s of [-1, 1]) at({ k: "silla", x: s * 3.6, z: 2.6, rot: s < 0 ? 1 : 3 });
  at({ k: "tele-pared", x: 0, z: 0, snap: "n", rot: 2, y: 1.6, w: 2.4, name: "Pantalla de las asignaciones" });
  at({ k: "pizarra", x: 0, z: 0, snap: "e", rot: 3, y: 1.0 });
  lights(3, 2, fr.height - 0.1);
};

const FURNISH: Readonly<Record<string, Furnish>> = { residencia, restaurante, clinica, aulas, biblioteca, laboratorio, crianza, huerto, taller, asambleas };

/** Furnish a campus room (none for the training rooms: data/fixtures.ts furnishes those). */
export function furnishCampus(sink: FurnishSink, fr: RoomFrame): void {
  FURNISH[fr.id]?.(sink, fr);
}
