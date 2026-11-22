import { cs } from "../sources";
import { C, COL, m, pz, rep, type ModelDef, type Part } from "./kit";
import { glassRoom } from "./servicios";
import { CIENCIAS_DETAIL } from "./ciencias-detalle";

/**
 * Models of the Ciencias building (Química síntesis/análisis, Biología cultivo/molecular, Informática). Cold Sanctuary
 * packs each floor with blocks of true footprint (Research.cs PackFloor, Informatica.cs FurnishCluster); here every
 * block keeps its footprint and a true height, as one box or a few (a bench with its equipment on top).
 */
const { steel, darkSteel, white, glass, screen } = COL;
const R = (what: string) => cs("Research", what);
const IN = (what: string) => cs("Informatica", what);
const LAB = 0xe4e7ea;

/** A block of a packed floor: id, label, width (x), depth (z), height, colour, group, source, parts (a plain box when left out). */
export type Block = readonly [id: string, label: string, w: number, d: number, h: number, color: number, group: string, source: string, parts?: readonly Part[]];

/** A lab bench 0,9 m high with something on top (h total). */
const benchWith = (w: number, d: number, h: number, top: number): Part[] => [C(0, 0.45, 0, w, 0.9, d, LAB), C(0, 0.92, 0, w + 0.02, 0.04, d + 0.02, darkSteel), C(0, 0.9 + (h - 0.9) / 2, d * 0.1, w * 0.6, h - 0.9, d * 0.6, top)];
/** A fume hood or safety cabinet: base, glass sash and the cabinet's top. */
const hood = (w: number, d: number, h: number, body: number): Part[] => [C(0, 0.45, 0, w, 0.9, d, body), C(0, 1.4, d * 0.15, w, 1.0, d * 0.7, body), C(0, 1.4, -d * 0.36, w * 0.9, 0.9, 0.04, glass), C(0, (1.9 + h) / 2, 0, w, h - 1.9, d, body)];
/** A walk-in room (glass walls 2,5 m, door towards −z). */
const room = (w: number, d: number, inner: Part[] = []): Part[] => [C(0, 0.005, 0, w, 0.01, d), ...inner, ...glassRoom(w, d, 0)];
/** A desk with a screen (puesto de cuaderno / de análisis / de datos). */
const desk = (w: number, d: number): Part[] => [C(0, 0.74, 0, w, 0.04, d, 0xb3855a), C(-w / 2 + 0.05, 0.37, 0, 0.05, 0.72, d * 0.9, darkSteel), C(w / 2 - 0.05, 0.37, 0, 0.05, 0.72, d * 0.9, darkSteel), C(0, 1.0, d * 0.25, 0.6, 0.4, 0.04, screen), C(0, 0.45, -d * 0.55, 0.45, 0.9, 0.45, 0x333338)];

/** Química: síntesis (Research.cs FurnishSynthesis). */
export const SINTESIS: readonly Block[] = [
  ["q-campana", "Campana de gases", 3.0, 0.9, 2.4, 0xd9dde0, "quimica", R("Campana_gases"), hood(3.0, 0.9, 2.4, 0xd9dde0)],
  ["q-rotavapor", "Rotavapor", 1.5, 0.8, 1.5, LAB, "quimica", R("Rotavapor"), benchWith(1.5, 0.8, 1.5, 0x9cc9e0)],
  ["q-guantes", "Caja de guantes (atmósfera inerte)", 2.5, 1.15, 2.0, steel, "quimica", R("Caja_guantes")],
  ["q-inflamables", "Armario de inflamables", 2.2, 0.5, 1.8, 0xd9b020, "quimica", R("Armario_inflamables")],
  ["q-acidos", "Armario de ácidos", 1.1, 0.5, 1.8, 0x3a6fb0, "quimica", R("Armario_acidos")],
  ["q-bases", "Armario de bases", 1.1, 0.5, 1.8, 0x5aa05a, "quimica", R("Armario_bases")],
  ["q-ducha", "Ducha de seguridad y lavaojos", 1.0, 1.3, 2.3, 0x40a040, "seguridad", R("Ducha_seguridad"), [C(0, 0.01, 0, 1.0, 0.02, 1.3, 0x40a040), C(-0.4, 1.15, 0.5, 0.06, 2.3, 0.06, 0x40a040), C(-0.1, 2.25, 0.5, 0.6, 0.06, 0.06, 0x40a040), C(0.1, 2.15, 0.5, 0.3, 0.1, 0.3, 0x40a040)]],
  ["q-residuos", "Residuos químicos", 1.2, 0.6, 1.0, 0xd97a20, "quimica", R("Residuos")],
  ["q-cuaderno", "Puesto de cuaderno de laboratorio", 1.6, 1.0, 1.2, 0xb3855a, "puestos", R("Puesto_cuaderno"), desk(1.6, 1.0)],
];

/** Química: análisis (Research.cs FurnishAnalysis). */
export const ANALISIS: readonly Block[] = [
  ["q-sala-rmn", "Sala de RMN (imán superconductor)", 4, 3, 2.5, glass, "quimica-analisis", R("Sala_RMN"), room(4, 3, [C(0, 1.1, 0.3, 1.6, 2.2, 1.6, 0xdfe3e8)])],
  ["q-rmn-sobremesa", "RMN de sobremesa", 1.2, 0.75, 1.3, LAB, "quimica-analisis", R("RMN_sobremesa"), benchWith(1.2, 0.75, 1.3, 0xc9ced4)],
  ["q-gcms", "GC-MS", 1.5, 0.75, 1.5, LAB, "quimica-analisis", R("GC_MS"), benchWith(1.5, 0.75, 1.5, 0xd0d4da)],
  ["q-hplc", "HPLC", 1.2, 0.75, 1.6, LAB, "quimica-analisis", R("HPLC"), benchWith(1.2, 0.75, 1.6, 0xe8e8e0)],
  ["q-espectro", "Espectrómetros IR y UV-Vis", 2, 0.75, 1.3, LAB, "quimica-analisis", R("IR_UV_Vis"), benchWith(2, 0.75, 1.3, 0xd0d4da)],
  ["q-drx", "Difractómetro de rayos X", 1.5, 1.3, 1.9, 0xc0c4ca, "quimica-analisis", R("DRX")],
  ["q-hornos", "Hornos y mufla", 2, 0.75, 1.5, LAB, "quimica-analisis", R("Hornos"), benchWith(2, 0.75, 1.5, 0x8a8f96)],
  ["q-balanzas", "Cuarto de balanzas", 2.5, 2, 2.5, glass, "quimica-analisis", R("Cuarto_balanzas"), room(2.5, 2, [C(0, 0.45, 0.6, 2.2, 0.9, 0.6, 0x8a8f96)])],
  ["q-puesto-analisis", "Puesto de análisis", 1.6, 1.0, 1.2, 0xb3855a, "puestos", R("Puesto_analisis"), desk(1.6, 1.0)],
];

/** Biología: cultivo (Research.cs FurnishCulture). */
export const CULTIVO: readonly Block[] = [
  ["b-cabina", "Cabina de seguridad biológica II", 2, 0.85, 2.2, 0xe6e9ec, "biologia", R("Cabina_bioseguridad"), hood(2, 0.85, 2.2, 0xe6e9ec)],
  ["b-incubador", "Incubador de CO₂", 0.8, 0.85, 1.9, white, "biologia", R("Incubador_CO2")],
  ["b-microscopio", "Microscopio invertido", 1.5, 0.8, 1.4, LAB, "biologia", R("Microscopio_invertido"), benchWith(1.5, 0.8, 1.4, 0x333338)],
  ["b-fluorescencia", "Microscopio de fluorescencia", 1.5, 0.9, 1.5, LAB, "biologia", R("Microscopio_fluorescencia"), benchWith(1.5, 0.9, 1.5, 0x333338)],
  ["b-centrifuga", "Centrífuga", 0.9, 0.8, 1.0, 0xd8dce0, "biologia", R("Centrifuga")],
  ["b-biorreactor-piloto", "Biorreactor piloto", 1.8, 1.2, 2.2, steel, "biologia", R("Biorreactor_piloto"), [C(0, 0.1, 0, 1.8, 0.2, 1.2, darkSteel), C(-0.3, 1.1, 0, 0.9, 1.8, 0.9, steel), C(0.65, 0.8, 0, 0.4, 1.4, 0.6, LAB)]],
  ["b-biorreactor-mesa", "Biorreactores de sobremesa", 1.8, 0.75, 1.5, LAB, "biologia", R("Biorreactores_sobremesa"), benchWith(1.8, 0.75, 1.5, 0xbfe3f0)],
  ["b-congelador", "Congelador de −80 °C", 1, 1, 2, white, "biologia", R("Congelador_80")],
  ["b-camara-fria", "Cámara fría (4 °C)", 2.5, 2.5, 2.5, 0xcce6ff, "biologia", R("Camara_fria"), room(2.5, 2.5, [C(0, 0.9, 0.95, 2.3, 1.8, 0.4, steel)])],
  ["b-autoclave", "Autoclave y fregadero", 2.5, 0.9, 1.4, steel, "biologia", R("Autoclave_fregadero"), [C(0, 0.45, 0, 2.5, 0.9, 0.9, steel), C(-0.6, 1.15, 0.1, 0.9, 0.5, 0.7, darkSteel)]],
  ["b-lavamanos", "Lavamanos de laboratorio", 1, 1.3, 1.0, white, "biologia", R("Lavamanos")],
];

/** Biología: molecular (Research.cs FurnishMolecular). */
export const MOLECULAR: readonly Block[] = [
  ["b-prepcr", "Puesto pre-PCR (cabina de flujo)", 1.8, 0.75, 1.9, LAB, "biologia-molecular", R("Pre_PCR"), hood(1.8, 0.75, 1.9, LAB)],
  ["b-extraccion", "Extracción de ácidos nucleicos", 1.8, 0.75, 1.4, LAB, "biologia-molecular", R("Extraccion"), benchWith(1.8, 0.75, 1.4, 0xd0d4da)],
  ["b-termociclador", "Termocicladores", 1.8, 0.75, 1.2, LAB, "biologia-molecular", R("Termocicladores"), benchWith(1.8, 0.75, 1.2, 0x8a8f96)],
  ["b-secuenciador", "Secuenciadores", 1.8, 0.75, 1.6, LAB, "biologia-molecular", R("Secuenciadores"), benchWith(1.8, 0.75, 1.6, 0x2e3440)],
  ["b-dewar", "Dewar de nitrógeno líquido", 0.6, 0.6, 1.1, steel, "biologia-molecular", R("Dewar")],
  ["b-nevera", "Nevera de reactivos", 0.7, 0.75, 1.8, white, "biologia-molecular", R("Nevera")],
  ["b-puesto-datos", "Puesto de datos (bioinformática)", 1.6, 1.0, 1.2, 0xb3855a, "puestos", R("Puesto_datos"), desk(1.6, 1.0)],
];

/** A cold-aisle GPU row (Informatica.cs GpuRow): 4 racks 0,6 × 2,2 × 1,2 and the cooling unit (CDU). */
const gpuRow: Part[] = [...rep(4, (i) => [C(-1.5 + i * 0.62, 1.1, 0, 0.6, 2.2, 1.2, 0x1c1e22), C(-1.5 + i * 0.62, 1.1, -0.61, 0.5, 2.0, 0.02, 0x2f6fd0)]), C(1.45, 1.1, 0, 1.0, 2.2, 1.2, 0x5a6470)];

/** Informática (Informatica.cs FurnishCluster): the local AI cluster and its plant. */
export const INFORMATICA: readonly Block[] = [
  ["i-gpu-a", "Fila de GPU A (4 racks y CDU)", 4.0, 1.4, 2.2, 0x1c1e22, "informatica-cluster", IN("GPU_row_A"), gpuRow],
  ["i-gpu-b", "Fila de GPU B (4 racks y CDU)", 4.0, 1.4, 2.2, 0x1c1e22, "informatica-cluster", IN("GPU_row_B"), gpuRow],
  ["i-red", "Rack de red", 0.8, 1.4, 2.2, 0x22262c, "informatica-cluster", IN("Rack_red")],
  ["i-almacen", "Almacenamiento", 1.6, 1.4, 2.2, 0x2a2e36, "informatica-cluster", IN("Storage")],
  ["i-intercambiador", "Intercambiador de calor", 2.4, 1.4, 1.8, 0x7a8c99, "informatica-planta", IN("Intercambiador")],
  ["i-bombas", "Bombas del circuito de agua", 2, 1, 1.2, 0x3a6fb0, "informatica-planta", IN("Bombas")],
  ["i-deposito", "Depósito de expansión", 1.4, 1.4, 1.8, 0x7a8c99, "informatica-planta", IN("Deposito"), [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.45, 0.12, sz * 0.45, 0.08, 0.24, 0.08, 0x4a4f57))), C(0, 0.95, 0, 1.3, 1.4, 0.8, 0x7a8c99), C(0, 0.95, 0, 0.8, 1.4, 1.3, 0x7a8c99), C(0, 0.95, 0, 1.1, 1.4, 1.1, 0x7a8c99), C(0, 1.72, 0, 0.6, 0.15, 0.6, 0x6a7a88), C(0.4, 1.3, -0.56, 0.16, 0.16, 0.04, 0xe8e8e0), C(0, 0.4, -0.6, 0.12, 0.12, 0.3, 0x3a6fb0), C(0, 1.85, 0, 0.1, 0.12, 0.1, 0xc03030)]],
  ["i-cuadro", "Cuadro eléctrico", 2.4, 0.8, 2.0, 0x8a8f96, "informatica-planta", IN("Cuadro")],
  ["i-sai", "SAI", 1.2, 0.9, 2.0, 0x2a2e36, "informatica-planta", IN("SAI")],
  ["i-baterias", "Armario de baterías", 0.8, 0.8, 2.0, 0x2a2e36, "informatica-planta", IN("Baterias")],
  ["i-extincion", "Extinción por gas inerte", 1.6, 0.6, 1.8, 0xb03030, "seguridad", IN("Extincion")],
  ["i-monitor", "Puesto de monitorización", 1.6, 2.3, 1.3, 0xb3855a, "puestos", IN("Monitorizacion"), [...desk(1.6, 1.0).map(([x, y, z, a, b, c, col]) => [x, y, z - 0.5, a, b, c, col] as Part), C(0, 1.6, 0.9, 1.6, 0.9, 0.05, screen)]],
  ["i-banco", "Banco de mantenimiento", 2, 0.9, 1.0, 0x8a8f96, "informatica-planta", IN("Banco_mantenimiento")],
  ["i-repuestos", "Repuestos", 1.2, 0.6, 2.0, 0x8a8f96, "informatica-planta", IN("Repuestos")],
];

const toModel = ([id, label, w, d, h, color, group, source, own]: Block): ModelDef => {
  const parts = own ?? CIENCIAS_DETAIL[id];
  return parts ? pz(id, "maquina", group, label, color, parts, "real", source) : m(id, "maquina", group, label, w, h, d, color, "caja", "real", source);
};

export const CIENCIAS_MODELS: readonly ModelDef[] = [
  m("lab-suelo", "mueble", "suelos", "Suelo de laboratorio (vinilo)", 31.6, 0.02, 19.6, 0xd6dadc, "caja", "real", R("Suelo_laboratorio")),
  m("cpd-suelo", "mueble", "suelos", "Suelo técnico del centro de datos", 31.6, 0.02, 19.6, 0x9aa0a8, "caja", "real", IN("Suelo_tecnico")),
  ...[...SINTESIS, ...ANALISIS, ...CULTIVO, ...MOLECULAR, ...INFORMATICA].map(toModel),
];
