import { cs } from "../sources";
import { C, COL, bar, m, pz, rep, type Category, type ModelDef, type Part } from "./kit";
import { bench } from "./entrenamiento";

/**
 * Models of the Servicios building (restaurant, hospital ×3, cría, carne cultivada, asambleas, guardia). The big
 * equipment keeps Cold Sanctuary's footprint and height; its helpers (KitchenProps, InfirmaryProps, GlassWall) are
 * copied as a few boxes each.
 */
const K = (what: string) => cs("KitchenPlan", what);
const H = (what: string) => cs("Hospital", what);
const { steel, darkSteel, white, wood, glass, water } = COL;

/** A plain box of equipment (one coloured block at its true footprint and height). */
const eq = (id: string, category: Category, group: string, label: string, w: number, h: number, d: number, color: number, source: string, reality: "real" | "ficcion" = "real"): ModelDef =>
  m(id, category, group, label, w, h, d, color, "caja", reality, source);

/** A counter run (KitchenProps.CounterRun): cupboards to 0,9 m with a steel top, 0,7 m deep. */
const counter = (len: number, depth = 0.7): Part[] => [C(0, 0.43, 0, len, 0.86, depth, 0xd8dade), C(0, 0.88, 0, len, 0.04, depth + 0.02, steel)];

/**
 * A glass room (GlassWall.Room/Box): four walls 2,5 m high with a 1,2 m door in the middle of one side
 * (0 −z, 1 +x, 2 +z, 3 −x), standing round its centre.
 */
export function glassRoom(w: number, d: number, door: 0 | 1 | 2 | 3, color: number = glass): Part[] {
  const h = 2.5, t = 0.06, g = 1.2;
  const wall = (side: number): Part[] => {
    const along = side % 2 === 0 ? w : d;
    const at = side === 0 ? -d / 2 : side === 1 ? w / 2 : side === 2 ? d / 2 : -w / 2;
    const mk = (a0: number, a1: number): Part => (side % 2 === 0 ? C((a0 + a1) / 2, h / 2, at, a1 - a0, h, t, color) : C(at, h / 2, (a0 + a1) / 2, t, h, a1 - a0, color));
    return side === door ? [mk(-along / 2, -g / 2), mk(g / 2, along / 2)] : [mk(-along / 2, along / 2)];
  };
  return [0, 1, 2, 3].flatMap(wall);
}

/** A hospital bed (InfirmaryProps.HospitalBed): 1 × 2,1 m, mattress at 0,6 m, head at −z. */
const bedParts = (blanket: number): Part[] => [C(0, 0.3, 0, 0.95, 0.12, 2.05, steel), C(0, 0.5, 0.05, 0.9, 0.18, 1.95, white), C(0, 0.6, 0.35, 0.92, 0.04, 1.3, blanket), C(0, 0.75, -0.98, 0.95, 0.6, 0.06, steel), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.42, 0.13, sz * 0.9, 0.06, 0.26, 0.06, darkSteel)))];

/** A kitchen station (KitchenPlan.cs CompleteStation): counter, griddle, sink and ovens in front; induction, fridge and cauldrons at the sides. */
const station: Part[] = [
  ...counter(1.25).map(([x, y, z, a, b, c, col]) => [x - 2, y, z + 2.1, a, b, c, col] as Part),
  C(-0.9, 0.45, 2.1, 0.9, 0.9, 0.7, darkSteel), C(-0.9, 0.92, 2.1, 0.8, 0.04, 0.6, 0x222222),
  C(0.1, 0.45, 2.1, 1, 0.9, 0.7, steel), C(0.1, 0.88, 2.1, 0.6, 0.06, 0.45, 0x8fb8cc),
  C(1.25, 0.9, 2.1, 1, 1.8, 0.9, darkSteel), C(2.45, 0.75, 2, 1.2, 1.5, 1, 0x8c4a2f),
  ...[0.9, -0.25, -1.4].map((z) => C(-3.1, 0.45, z, 0.7, 0.9, 1.0, darkSteel)), C(-3.1, 1.05, -2.5, 0.8, 2.1, 0.9, 0xe8eaec),
  ...[0.9, -0.25, -1.4, -2.5, -3.6].map((z) => C(3.1, 0.5, z, 0.7, 1.0, 1.0, steel)),
  C(-0.6, 0.45, -3.3, 2, 0.9, 0.6, 0xc9d2d6),
];

/** The blocks along the kitchen's walls (KitchenPlan.cs StoresBlocks/PrepBlocks/DoughBlocks/DairyBlocks): name, width, depth, height, colour. */
export const KITCHEN_BLOCKS: readonly (readonly [id: string, label: string, w: number, d: number, h: number, color: number])[] = [
  ["recepcion", "Recepción de mercancías", 2.8, 0.8, 0.9, 0xb8bec6],
  ["almacen-seco", "Almacén seco", 3.6, 0.5, 2, 0x9e7a52],
  ["camaras-frias", "Cámaras frías (refrigeración y congelación)", 7.6, 2.4, 2.4, 0xdfe7ee],
  ["prep-verdura", "Preparación de verdura", 3.4, 0.7, 0.9, 0xc9d2d6],
  ["prep-carne", "Preparación de carne y pescado", 3.4, 0.7, 0.9, 0xc9d2d6],
  ["lavado", "Lavado", 2.8, 0.7, 0.9, 0xb8c4cc],
  ["molienda", "Molienda", 4.4, 1, 1.4, 0x9a8f80],
  ["aceite-panela", "Aceite y panela", 2.8, 0.9, 1.2, 0x8c6b3d],
  ["panaderia", "Panadería (amasadora, mesa y batidora)", 3.6, 0.7, 1.2, 0xc9b28c],
  ["horno-pisos", "Horno de pisos y fermentadora", 3, 1.3, 1.9, 0x5a4a40],
  ["pasta", "Pasta fresca (mesa y laminadora)", 3.2, 0.7, 1.1, 0xd9c99e],
  ["extrusora", "Extrusora y secadero", 1.6, 0.6, 1.6, 0xb8bec6],
  ["queseria", "Quesería (cuba y mesa de moldeo)", 3.2, 0.8, 1.1, 0xe0e4e8],
  ["cava", "Cava de maduración y salmuera", 2.8, 0.8, 2, 0x8c7a66],
  ["fermentos", "Fermentos (yogurtera e incubadora de tempeh)", 2.2, 0.8, 1.2, 0xd9dde0],
];

/** A table for four of the gourmet dining (Restaurant.cs BuildGourmetDining Table). */
const diningTable: Part[] = [
  C(0, 0.38, 0, 0.1, 0.76, 0.1, 0x6b4733), C(0, 0.765, 0, 1.3, 0.03, 1.3, 0xf7f7f2), C(0, 0.6, 0, 1.32, 0.3, 1.32, 0xf7f7f2), C(0, 0.85, 0, 0.05, 0.14, 0.05, 0xfff2d9),
  ...[0, 1, 2, 3].flatMap((s) => {
    const a = (s * Math.PI) / 2, sx = Math.sin(a), sz = Math.cos(a);
    return [C(sx * 0.95, 0.41, sz * 0.95, 0.45, 0.08, 0.45, 0x521f2e), C(sx * 1.15, 0.76, sz * 1.15, s % 2 ? 0.06 : 0.45, 0.65, s % 2 ? 0.45 : 0.06, 0x521f2e), C(sx * 0.95, 0.185, sz * 0.95, 0.3, 0.37, 0.3, 0x6b4733)];
  }),
];

/** A care pen of the cría floor (Cria.cs CriaPen): low walls 1,2 m with its gate (closed, 0,9 m) at +z or +x. */
const pen = (w: number, d: number, floor: number, doorEast: boolean): Part[] => {
  const h = 1.2, t = 0.12, door = 1.4, wall = 0xd9d0c0;
  const ps: Part[] = [C(0, 0.02, 0, w, 0.04, d, floor), C(0, h / 2, -d / 2, w, h, t, wall)];
  if (doorEast) {
    const seg = (d - door) / 2;
    ps.push(C(0, h / 2, d / 2, w, h, t, wall), C(-w / 2, h / 2, 0, t, h, d, wall), C(w / 2, h / 2, -d / 2 + seg / 2, t, h, seg, wall), C(w / 2, h / 2, d / 2 - seg / 2, t, h, seg, wall));
  } else {
    const seg = (w - door) / 2;
    ps.push(C(-w / 2, h / 2, 0, t, h, d, wall), C(w / 2, h / 2, 0, t, h, d, wall), C(-w / 2 + seg / 2, h / 2, d / 2, seg, h, t, wall), C(w / 2 - seg / 2, h / 2, d / 2, seg, h, t, wall));
  }
  return ps;
};

/** A stirred-tank bioreactor (CulturedMeatLab.Bioreactor): glass vessel of radius r and height h with its steel jacket and motor. */
const bioreactor = (r: number, h: number): Part[] => [C(0, h * 0.45, 0, 2 * r, h * 0.9, 2 * r, 0xc9a08c), C(0, 0.15, 0, 2 * r + 0.1, 0.3, 2 * r + 0.1, steel), C(0, h * 0.95, 0, 0.3, h * 0.1, 0.3, darkSteel)];

export const SERVICIOS_MODELS: readonly ModelDef[] = [
  // ── Restaurante (KitchenPlan.cs KitchenFloorPlan, ProKitchen; Restaurant.cs BuildGourmetDining) ──
  eq("cocina-suelo", "mueble", "suelos", "Suelo de baldosa de pizarra de la cocina", 39.6, 0.04, 37.6, 0x333538, K("Suelo_Cocina (GourmetKitchen: pizarra)")),
  pz("cocina-barra-servicio", "mueble", "cocina", "Barra de servicio (pase, con riel de comandas)", steel, [...counter(5), C(0, 1.45, 0.45, 4.6, 0.03, 0.03, steel)], "real", K("Barra de servicio")),
  pz("cocina-mesa-emplatado", "mueble", "cocina", "Mesa de emplatado", steel, counter(4.2, 1.2), "real", K("Mesa de emplatado")),
  pz("cocina-encimera-ingredientes", "mueble", "cocina", "Encimera de ingredientes", steel, [...counter(5.5), ...rep(6, (i) => [C(-2.1 + i * 0.85, 1.0, 0, 0.35, 0.2, 0.3, [0xf2e6cc, 0x6b9e4a, 0xd9c08c, 0xd9583a, 0xf2f2f2, 0x8c5a3a][i]!)])], "real", K("Encimera ingredientes: huevos, verduras, avena, fruta, yogur, legumbres")),
  pz("cocina-estanteria", "mueble", "cocina", "Estantería de despensa", 0x9e7a52, [C(0, 1, 0, 3, 2, 0.06), ...rep(5, (i) => [C(0, 0.1 + i * 0.45, 0.25, 3, 0.04, 0.5)]), ...rep(10, (i) => [C(-1.3 + (i % 5) * 0.65, 0.3 + Math.floor(i / 5) * 0.9, 0.25, 0.4, 0.3, 0.35, 0xc9a66b)])], "real", K("KitchenProps.Shelving (Despensa, Estanteria)")),
  pz("cocina-puesto", "maquina", "cocina", "Puesto de cocina completo (plancha, fregadero, hornos, inducción, nevera, marmitas, abatidor y barra de sushi)", steel, station, "real", K("CompleteStation (8 puestos)")),
  ...KITCHEN_BLOCKS.map(([id, label, w, d, h, color]) => eq(`cocina-${id}`, "maquina", "cocina-franjas", label, w, h, d, color, K("Strip: bloques contra las paredes"))),
  pz("comedor-mesa", "mueble", "comedor", "Mesa del comedor gourmet (4 cubiertos)", 0xf7f7f2, diningTable, "real", cs("Restaurant", "BuildGourmetDining Table")),
  pz("comedor-caja", "mueble", "comedor", "Caja registradora", steel, [...counter(1.6), C(-0.3, 1.02, 0, 0.4, 0.24, 0.35, 0x33383f)], "real", cs("Restaurant", "Caja_registradora")),
  pz("comedor-sushi-cafe", "mueble", "comedor", "Barra de sushi y cafetera espresso", 0x8c6b4d, [C(-1, 0.55, 0, 2.4, 1.1, 0.7), C(1.9, 0.5, 0, 1.2, 1.0, 0.6, steel), C(1.9, 1.2, 0, 0.6, 0.4, 0.45, 0x8c1f1f)], "real", cs("Restaurant", "Eq barra de sushi y cafetera espresso")),
  pz("comedor-vinos", "mueble", "comedor", "Pared de vinos", 0x6b4733, [C(0, 1.2, 0, 6, 2.4, 0.4), ...rep(84, (i) => [C(-2.75 + (i % 14) * 0.42, 0.3 + Math.floor(i / 14) * 0.38, -0.2, 0.09, 0.09, 0.04, (i % 14 + Math.floor(i / 14)) % 3 === 0 ? 0x59141f : 0x2e4726)])], "real", cs("Restaurant", "Pared_de_vinos")),
  pz("planta-maceta", "naturaleza", "plantas-interior", "Planta en macetero", 0x4d8c4d, [C(0, 0.25, 0, 0.5, 0.5, 0.5, 0x4d4d52), C(0, 0.9, 0, 0.8, 0.9, 0.8)], "real", cs("Restaurant", "Planta (esquinas del anillo)")),

  // ── Hospital (Hospital.cs BuildHospital, InfirmaryProps) ──
  eq("hospital-suelo", "mueble", "suelos", "Suelo del hospital", 39.6, 0.04, 39.6, 0xdbf0eb, H("Suelo_Hospital")),
  pz("hospital-cama", "maquina", "hospital-camas", "Cama de hospital", steel, bedParts(0x9ecceb), "real", H("InfirmaryProps.HospitalBed")),
  pz("hospital-silla-examen", "maquina", "hospital", "Silla de exámenes con carrito", 0x598ca6, [C(0, 0.4, 0, 0.6, 0.1, 0.6), C(0, 0.8, -0.27, 0.6, 0.75, 0.08), C(0, 0.175, 0, 0.08, 0.35, 0.08, steel), C(0.75, 0.45, 0.3, 0.4, 0.9, 0.4, steel)], "real", H("Silla_examen")),
  pz("hospital-camilla", "maquina", "hospital", "Camilla de exploración", 0x8cb8cc, [C(0, 0.75, 0, 0.7, 0.1, 1.9), C(0, 0.35, 0, 0.6, 0.7, 1.6, steel)], "real", H("InfirmaryProps.ExamTable")),
  eq("hospital-botiquin", "mueble", "hospital", "Botiquín (armario de medicamentos)", 1.2, 2, 0.45, white, H("InfirmaryProps.MedicineCabinet")),
  pz("hospital-lavamanos", "mueble", "hospital", "Lavamanos", white, [C(0, 0.45, 0, 0.9, 0.9, 0.6), C(0, 0.93, 0, 0.6, 0.06, 0.45, 0x8fb8cc)], "real", H("Lavamanos")),
  pz("hospital-lavabotas", "mueble", "hospital", "Lavabotas y biocontrol", 0x4d7399, [C(0, 0.05, 0, 0.9, 0.1, 0.6), C(-0.55, 0.45, 0.15, 0.3, 0.9, 0.3, steel), C(0.5, 0.6, 0.25, 0.05, 1.2, 0.05, steel)], "real", H("Lavabotas")),
  pz("hospital-laboratorio", "maquina", "hospital", "Mesa de laboratorio (microscopio, centrífuga)", white, [...bench(2.4, 0.8, 0xe6e9ec), C(-0.6, 1.1, 0, 0.25, 0.4, 0.3, 0x333338), C(0.6, 1.05, 0, 0.45, 0.3, 0.45, white)], "real", H("InfirmaryProps.LabBench")),
  eq("hospital-analizador", "maquina", "hospital", "Analizador clínico", 1.1, 1.3, 0.75, 0xe6e9ec, H("InfirmaryProps.BloodAnalyzer")),
  pz("hospital-banco-sangre", "maquina", "hospital", "Banco de sangre (neveras 2–6 °C, agitador 22 °C, congelador −25 °C) y sillón de donante", white, [C(-1.7, 0.95, 0, 2.4, 1.9, 0.8, 0xe6e9ec), C(1.9, 0.5, 0, 0.8, 1, 1.6, 0x4d7399)], "real", H("Banco_de_sangre_linea")),
  pz("hospital-espera", "mueble", "hospital", "Sala de espera (10 sillas)", 0x739eb8, rep(10, (i) => [C(-1.8 + (i % 5) * 0.9, 0.41, -Math.floor(i / 5) * 1.2, 0.5, 0.08, 0.5), C(-1.8 + (i % 5) * 0.9, 0.71, -Math.floor(i / 5) * 1.2 + 0.24, 0.5, 0.55, 0.06)]), "real", H("Sala_de_espera")),
  eq("zona-rayos-x", "mueble", "hospital-zonas", "Sala de rayos X (zona)", 5, 0.01, 4.4, 0xe6dbcc, H("Zone Sala_rayos_X")),
  eq("zona-ecografia", "mueble", "hospital-zonas", "Sala de ecografía (zona)", 5, 0.01, 3.4, 0xcce6e0, H("Zone Sala_ecografia")),
  pz("hospital-paritorio", "maquina", "hospital", "Sala de parto LDR (5,6 × 5,7 m) con su cama", 0xf2e0e6, [C(0, 0.005, 0, 5.6, 0.01, 5.7), ...bedParts(0xe6c7d9)], "real", H("Sala_paritorio (norma LDR 32 m²)")),
  pz("hospital-quirofano", "maquina", "hospital-quirofanos", "Quirófano de cristal (mesa, lámpara, anestesia e instrumental)", 0xc7e6db, [C(0, 0.005, 0, 7.8, 0.01, 8), C(-0.35, 0.45, 0.33, 0.6, 0.9, 2, 0x4d7399), C(-1.75, 1.2, 0.33, 0.4, 2.4, 0.4, steel), C(-0.35, 2.3, 0.33, 0.9, 0.12, 0.9, white), C(1.3, 0.75, -1.2, 0.7, 1.5, 0.6, 0x666a70), C(1.65, 0.45, 1.93, 0.8, 0.9, 0.5, steel), ...glassRoom(7.8, 8, 0)], "real", H("Quirofano: sala de cristal de presión positiva")),
  pz("hospital-uci", "maquina", "hospital-uci", "Box de UCI con ventilador", steel, [C(0, 0.005, 0, 3.4, 0.01, 4.2, 0xcce6e0), ...bedParts(0xbfe0cc), C(-0.85, 0.6, 0.3, 0.45, 1.2, 0.45, 0xe6e9ec)], "real", H("Box_UCI con Ventilator")),
  pz("hospital-sala-uci", "mueble", "hospital-uci", "Sala de cristal de la UCI", glass, glassRoom(11.8, 9.8, 0), "real", H("GlassWall.Room UCI")),
  pz("hospital-aislamiento", "maquina", "hospital", "Habitación de aislamiento de cristal (presión negativa)", glass, [...glassRoom(5.1, 4, 0), ...bedParts(0xbfcce0)], "real", H("Aislamiento: 4 habitaciones con presión negativa")),
  pz("hospital-esclusa", "mueble", "hospital", "Esclusa del aislamiento", glass, [C(0, 0.02, 0, 21.1, 0.02, 2.4, 0xf2ebbf), ...glassRoom(21.3, 2.6, 0)], "real", H("Esclusa_aislamiento")),
  pz("hospital-epi", "mueble", "hospital", "Armario de EPI", white, [C(0, 0.9, 0, 0.9, 1.8, 0.45), C(0, 1.3, -0.235, 0.7, 0.3, 0.02, 0xf2d14d)], "real", H("EPI_esclusa")),
  pz("vet-perrera", "maquina", "veterinario", "Perrera (box)", steel, [C(0, 0.04, 0, 1.3, 0.08, 1.6, 0x8c9499), C(-0.65, 0.9, 0, 0.04, 1.8, 1.6), C(0.65, 0.9, 0, 0.04, 1.8, 1.6), C(0, 0.9, 0.8, 1.3, 1.8, 0.04), C(0, 0.9, -0.8, 1.3, 1.8, 0.02, 0xa6adb3)], "real", H("InfirmaryProps.Kennel")),
  pz("vet-jaulas", "maquina", "veterinario", "Jaulas (4 plazas)", steel, [C(0, 0.6, 0, 2, 1.2, 0.8, 0xa6adb3), C(0, 0.6, 0, 0.04, 1.2, 0.8), C(0, 0.6, 0, 2, 0.04, 0.8)], "real", H("InfirmaryProps.Cages")),
  eq("vet-pediluvio", "mueble", "veterinario", "Pediluvio", 1.2, 0.06, 1.6, 0x8cbfd9, H("Pediluvio")),
  eq("vet-bascula", "maquina", "veterinario", "Báscula de suelo", 1.2, 0.1, 1, steel, H("InfirmaryProps.FloorScale")),
  pz("vet-quirofano", "maquina", "veterinario", "Quirófano veterinario de cristal", 0xc7e6db, [C(0, 0.005, 0, 7.4, 0.01, 5.4), C(-0.1, 0.45, 0, 0.8, 0.9, 1.8, 0x4d7399), C(-1.5, 1.2, 0, 0.4, 2.4, 0.4, steel), C(1.5, 0.75, -1, 0.7, 1.5, 0.6, 0x666a70), ...glassRoom(7.4, 5.4, 0)], "real", H("Quirofano_vet")),
  pz("vet-sala-fria", "mueble", "veterinario", "Sala fría de pingüinos (0–10 °C), de cristal", 0xcce6ff, [C(0, 0.005, 0, 9.6, 0.01, 4.4), ...glassRoom(9.6, 4.4, 0)], "real", H("Sala_fria_pinguinos")),
  pz("vet-aislamiento", "mueble", "veterinario", "Aislamiento veterinario (cuarentena de cristal)", glass, glassRoom(4, 3, 0), "real", H("Aislamiento_veterinario")),
  pz("vet-dietas", "maquina", "veterinario", "Cocina de dietas y congelador de pescado", steel, [C(0, 0.45, 0, 2.4, 0.9, 0.7), C(2.2, 0.95, 0, 1, 1.9, 0.8, 0xd9e6f2)], "real", H("Cocina_de_dietas")),
  pz("vet-cuadra", "maquina", "veterinario-grandes", "Box de grandes animales (4 × 3 m, guillotinas)", 0x8c9499, [C(0, 0.04, 0, 3, 0.08, 4, 0xc9b28c), C(-1.5, 1.2, 0, 0.08, 2.4, 4), C(1.5, 1.2, 0, 0.08, 2.4, 4), C(0, 1.2, 2, 3, 2.4, 0.08), C(-0.9, 1.2, -2, 1.2, 2.4, 0.08)], "real", H("InfirmaryProps.LargeAnimalStall")),
  pz("vet-contencion", "maquina", "veterinario-grandes", "Jaula de contención", steel, [C(-0.9, 1.1, 0, 0.08, 2.2, 2.4), C(0.9, 1.1, 0, 0.08, 2.2, 2.4), C(0, 2.2, 0, 1.9, 0.08, 2.4)], "real", H("Jaula_contencion")),
  pz("vet-corral-foca", "mueble", "veterinario-grandes", "Corral de foca con piscina salada", 0xbfbfb8, [C(0, 0.05, -1.4, 4, 0.1, 2.2), C(0, 0.4, 1.3, 4, 0.8, 3, 0x4d8ccc)], "real", H("Corral_foca (≥ 0,76 m de agua)")),

  // ── Cría (Cria.cs FurnishCria) ──
  pz("cria-recinto-oseznos", "mueble", "cria", "Recinto de oseznos con guarida cálida", 0xd9c27a, [...pen(7, 6, 0xd9c27a, false), C(-1.8, 0.6, -2.1, 2.4, 1.2, 0.1, 0xf2f5f7), C(-2.95, 0.6, -1.6, 0.1, 1.2, 1.1, 0xf2f5f7), C(-0.65, 0.6, -1.6, 0.1, 1.2, 1.1, 0xf2f5f7), C(-1.8, 1.25, -1.6, 2.4, 0.1, 1.1, 0xf2f5f7)], "real", cs("Cria", "Recinto_oseznos")),
  pz("cria-recinto-focas", "mueble", "cria", "Recinto de crías de foca con piscina", 0xf2f5f7, [...pen(7, 6, 0xf2f5f7, false), C(0, 0.05, -0.6, 5, 0.1, 3.2, 0x9e7a52), C(0, 0.11, -0.6, 4.6, 0.02, 2.8, water)], "real", cs("Cria", "Recinto_focas")),
  pz("cria-recinto-pinguinos", "mueble", "cria", "Guardería de pingüinos", 0xf2f5f7, [...pen(7, 6, 0xf2f5f7, false), ...rep(4, (k) => [C(-2.2 + k * 1.4, 0.15 + (k % 2) * 0.1, -1.8, 1, 0.3 + (k % 2) * 0.2, 1, 0xe6edf2)])], "real", cs("Cria", "Recinto_pinguinos")),
  pz("cria-recinto-cachorros", "mueble", "cria", "Recinto de cachorros de malamute", 0xd9c27a, [...pen(6, 6, 0xd9c27a, true), C(-1.4, 0.12, -1.4, 1.6, 0.24, 1.2, 0x8c594d)], "real", cs("Cria", "Recinto_cachorros")),
  pz("cria-cocina-leche", "maquina", "cria", "Cocina de leche (nevera, biberones, báscula y fregadero)", steel, [...counter(3.2), ...rep(6, (i) => [C(-1.2 + i * 0.45, 1.02, 0, 0.09, 0.22, 0.09, 0xf2f2e6)]), C(-2.3, 1, 0, 0.8, 2, 0.7, 0xe8eaec), C(2.4, 0.45, 0, 1, 0.9, 0.7, steel)], "real", cs("Cria", "Cocina_de_leche")),
  pz("cria-pizarra", "mueble", "cria", "Pizarra de tomas", 0x334d40, [C(0, 1.3, 0, 2.4, 1.1, 0.05), C(-1.1, 0.6, 0, 0.06, 1.2, 0.06, wood), C(1.1, 0.6, 0, 0.06, 1.2, 0.06, wood)], "real", cs("Cria", "Pizarra_tomas")),
  m("osezno", "animal", "crias", "Osezno polar", 0.35, 0.45, 0.8, 0xf2efe6, "cuadrupedo", "real", cs("Cria", "CriaCubs Bear (osezno: ~0,6 kg al nacer, aquí de unos meses)")),
  m("cria-foca", "animal", "crias", "Cría de foca", 0.4, 0.35, 1.1, 0xe8e8e0, "pinnipedo", "real", cs("Cria", "CriaCubs Seal")),
  m("polluelo-pinguino", "animal", "crias", "Polluelo de pingüino", 0.25, 0.4, 0.25, 0x8c8c94, "pinguino", "real", cs("Cria", "CriaCubs Penguin")),
  m("cachorro-malamute", "animal", "crias", "Cachorro de malamute", 0.2, 0.3, 0.5, 0x8c8278, "cuadrupedo", "real", cs("Cria", "CriaCubs Malamute")),

  // ── Carne cultivada (Scripts/World/CulturedMeatLab.cs Build) ──
  pz("lab-campana", "maquina", "carne-cultivada", "Campana de flujo laminar", white, [C(0, 0.45, 0, 1.6, 0.9, 0.8), C(0, 1.35, 0, 1.6, 0.9, 0.8), C(0, 1.3, 0.41, 1.4, 0.6, 0.02, glass), C(0, 1.95, 0, 1.6, 0.3, 0.8, steel)], "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Campana_flujo_laminar"),
  pz("lab-microscopio", "maquina", "carne-cultivada", "Microscopio en su mesa", white, [C(0, 0.45, 0, 0.7, 0.9, 0.6), C(0, 1.05, 0, 0.18, 0.3, 0.22, 0x26262a)], "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Microscopio"),
  pz("lab-criogenico", "maquina", "carne-cultivada", "Tanque criogénico (nitrógeno líquido)", steel, [C(0, 0.55, 0, 0.7, 1.1, 0.7), C(0, 1.15, 0, 0.35, 0.1, 0.35, 0x26262a)], "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Tanque_criogenico"),
  eq("lab-incubadora", "maquina", "carne-cultivada", "Incubadora de CO₂", 0.75, 1.2, 0.75, white, "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Incubadora_CO2"),
  pz("lab-medio", "maquina", "carne-cultivada", "Preparación de medio (depósito, agitador y filtro de 0,2 µm)", steel, [C(0, 0.6, 0, 0.9, 1.2, 0.9), C(0, 1.3, 0, 0.12, 0.2, 0.12, 0x26262a), C(0.7, 0.9, 0, 0.25, 0.5, 0.25, white)], "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Preparacion_medio"),
  eq("lab-autoclave", "maquina", "carne-cultivada", "Autoclave", 0.8, 1, 0.7, steel, "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Autoclave"),
  pz("lab-biorreactor-semilla", "maquina", "carne-cultivada", "Biorreactor semilla (50 L)", steel, bioreactor(0.45, 1.2), "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Biorreactor_semilla"),
  pz("lab-biorreactor", "maquina", "carne-cultivada", "Biorreactor de producción (1 500 L, 37 °C, pH 7,3)", steel, bioreactor(1.15, 3), "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Biorreactor_produccion (LitresFor: radio 0,8·(L/500)^⅓)"),
  pz("lab-perfusion", "maquina", "carne-cultivada", "Biorreactor de perfusión con andamio (fibras)", steel, [C(0, 0.45, 0, 1.8, 0.9, 1), C(0, 1.1, 0, 1.7, 0.4, 0.9, glass), C(0, 1.65, 0, 1.7, 0.4, 0.9, glass), C(0, 1.05, 0, 1.4, 0.06, 0.75, 0xd98c80)], "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Biorreactor_andamio"),
  pz("lab-centrifuga", "maquina", "carne-cultivada", "Centrífuga", white, [C(0, 0.45, 0, 0.8, 0.9, 0.8), C(0, 0.92, 0, 0.6, 0.04, 0.6, 0x26262a)], "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Centrifuga"),
  pz("lab-formadora", "maquina", "carne-cultivada", "Formadora (prensa de carne)", steel, [C(0, 0.45, 0, 1, 0.9, 0.7), C(0, 1.1, 0, 0.5, 0.4, 0.5, 0x26262a)], "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Formadora"),
  eq("lab-raciones", "maquina", "carne-cultivada", "Almacén de raciones para el alimentador (cámara)", 1.4, 1.4, 0.7, darkSteel, "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.cs Almacen_raciones (docs/alimentador.md)"),

  // ── Sala de asambleas (Asamblea.cs FurnishAssembly) ──
  eq("asamblea-suelo", "mueble", "suelos", "Suelo de madera de la sala de asambleas", 39.8, 0.02, 37.8, 0x806650, cs("Asamblea", "Suelo_de_madera")),
  pz("asamblea-centro", "mueble", "asamblea", "Piedra de la palabra (Lögberg) y cono de luz (Reichstag)", 0x8c8a85, [C(0, 0.06, 0, 2.4, 0.12, 2.4), C(0, 0.04, -1.9, 1.2, 0.08, 1.4), ...[-1, 1].flatMap((x) => [-1, 1].map((z) => C(x * 3, 2.2, z * 3, 0.1, 4.4, 0.1, steel))), C(0, 4.45, 0, 6.1, 0.08, 6.1, 0xbfe0f0), ...rep(4, (k) => [C(0, 4.2 - k * 0.3, 0, 3 - k * 0.7, 0.5, 3 - k * 0.7, 0xbfe0f0)])], "real", cs("Asamblea", "Lögberg y cono de espejos")),
  pz("asamblea-fila-8", "mueble", "asamblea", "Fila de 8 asientos", 0x8c6b4d, [C(0, 0.225, 0, 8 * 0.7, 0.45, 0.5), C(0, 0.65, 0.27, 8 * 0.7, 0.5, 0.06)], "real", cs("Asamblea", "AssemblyRow (anillo interior a 6 m)")),
  pz("asamblea-fila-10", "mueble", "asamblea", "Fila de 10 asientos", 0x8c6b4d, [C(0, 0.225, 0, 10 * 0.7, 0.45, 0.5), C(0, 0.65, 0.27, 10 * 0.7, 0.5, 0.06)], "real", cs("Asamblea", "AssemblyRow (anillo exterior a 9,75 m)")),
  pz("asamblea-toguna", "mueble", "asamblea", "Toguna de mediación (dogon)", 0x8c6b4d, [...[-1, 0, 1].flatMap((x) => [-1, 1].map((z) => C(x * 2.4, 0.7, z * 2, 0.28, 1.4, 0.28))), ...rep(9, (k) => [C(0, 1.46, -2 + k * 0.5, 5.4, 0.1, 0.14, 0xb39966)]), C(0, 0.22, -1.1, 3.6, 0.44, 0.5), C(0, 0.22, 1.1, 3.6, 0.44, 0.5)], "real", cs("Asamblea", "Toguna (techo bajo de 1,4 m: se discute sentado)")),
  pz("asamblea-mesa-comision", "mueble", "asamblea", "Mesa de la comisión", 0x8c6b4d, bench(3.4, 1.4, 0x8c6b4d), "real", cs("Asamblea", "Mesa de la comisión")),
  pz("asamblea-archivo", "mueble", "asamblea", "Archivo de actas (quipus, cinturón de conchas, libro)", 0x8c6b4d, [...bench(3.6, 0.8, 0x8c6b4d), ...rep(7, (k) => [C(-1.4 + k * 0.2, 1.25, 0.3, 0.03, 0.7, 0.03, 0xf2e6cc)]), C(1.2, 0.98, 0, 0.7, 0.1, 0.5, 0x6b1f26)], "real", cs("Asamblea", "Archivo de actas")),
  pz("asamblea-marcador", "mueble", "asamblea", "Marcador de votos", 0x222226, [C(0, 1.9, 0, 4, 2.2, 0.16), C(-1.8, 0.4, 0, 0.14, 0.8, 0.14, steel), C(1.8, 0.4, 0, 0.14, 0.8, 0.14, steel)], "real", cs("Asamblea", "Marcador de votos")),
  pz("asamblea-interpretes", "mueble", "asamblea", "Cabina de intérpretes (ONU) en su sala acústica", 0x8c6b4d, [...bench(2.6, 0.8, 0x8c6b4d), ...glassRoom(7.6, 6.4, 3)], "real", cs("Asamblea", "Cabina de intérpretes y SoundRoom")),
  pz("asamblea-kleroterion", "mueble", "asamblea", "Kleroterion y clepsidra (Atenas)", 0x8c8a85, [...bench(3.4, 1, 0x8c8a85), C(-0.8, 1.5, 0, 1.2, 1.2, 0.14, 0xf2e6cc), C(0.9, 1.25, 0, 0.5, 0.5, 0.5, 0x995c38)], "real", cs("Asamblea", "Kleroterion")),
  pz("asamblea-arbol", "naturaleza", "plantas-interior", "Retoño en maceta (Gernika, panchayat…)", 0x4d7a42, [C(0, 0.3, 0, 1.6, 0.6, 1.6, 0x734d38), C(0, 1.3, 0, 0.22, 1.6, 0.22, 0x8c6b4d), C(0, 2.5, 0, 1.8, 1.4, 1.8)], "real", cs("Asamblea", "árboles de asamblea en maceta")),

  // ── Sala de guardia (GuardRoom.cs FurnishGuardRoom) ──
  eq("guardia-suelo", "mueble", "suelos", "Suelo de la sala de guardia", 39.8, 0.02, 37.8, 0x575c66, cs("GuardRoom", "Suelo_de_sala")),
  pz("guardia-pantalla", "maquina", "guardia", "Pantalla del muro de guardia", 0x1f3340, [C(0, 0.9, 0, 0.14, 1.8, 0.14, darkSteel), C(0, 2.5, 0, 3.6, 2, 0.1)], "real", cs("GuardRoom", "Muro_de_pantallas (una por fuente)")),
  pz("guardia-consola", "maquina", "guardia", "Consola de guardia", 0x404550, [...bench(1.8, 0.9, 0x404550), C(0, 1.15, 0.3, 0.9, 0.5, 0.05, 0x1f3340), C(0, 0.45, -0.7, 0.5, 0.05, 0.5, 0x26262a)], "real", cs("GuardRoom", "GrConsoles")),
  pz("guardia-radar", "maquina", "guardia", "Mesa de radar (tráfico marítimo)", 0x404550, [C(0, 0.45, 0, 2.6, 0.9, 2.6), C(0, 0.92, 0, 2.2, 0.04, 2.2, 0x1f3340)], "real", cs("GuardRoom", "Mesa de radar")),
  pz("guardia-carta-hielo", "maquina", "guardia", "Carta de hielo (Patrulla Internacional del Hielo)", 0x404550, [...bench(3, 1.6, 0x404550), C(0, 0.92, 0, 2.7, 0.02, 1.3, 0xdbe6eb)], "real", cs("GuardRoom", "Carta de hielo")),
  pz("guardia-sismografo", "maquina", "guardia", "Sismógrafo", 0x404550, [...bench(2.6, 1, 0x404550), C(0, 1.15, 0, 1.6, 0.4, 0.4, 0xebe6d6)], "real", cs("GuardRoom", "Sismógrafo")),
  pz("guardia-mareografo", "maquina", "guardia", "Mareógrafo y maqueta de boya DART", 0x404550, [C(0, 1.1, 0, 0.5, 2.2, 0.5), C(1.3, 0.35, 0, 1.2, 0.7, 1.2, 0xe6b326), C(1.3, 1.05, 0, 0.1, 0.7, 0.1, darkSteel)], "real", cs("GuardRoom", "Mareógrafo y boya")),
  pz("guardia-radio", "maquina", "guardia", "Radio VHF", 0x404550, [C(0, 0.9, 0, 1.6, 1.8, 0.6), ...rep(3, (i) => [C(0, 0.5 + i * 0.45, -0.32, 1.2, 0.25, 0.04, 0x1f3340)])], "real", cs("GuardRoom", "Radio VHF")),
  pz("guardia-tablero", "mueble", "guardia", "Tablero de guardia", 0xdbc79e, [C(0, 1.3, 0, 2, 1.4, 0.1), C(0, 0.3, 0, 0.14, 0.6, 0.14, darkSteel)], "real", cs("GuardRoom", "Tablero de guardia")),
  pz("guardia-respaldo", "maquina", "guardia", "Puesto de respaldo", 0x404550, [...bench(3.2, 1.2, 0x404550), C(0, 1.25, 0.3, 1.4, 0.8, 0.06, 0x1f3340)], "real", cs("GuardRoom", "Puesto de respaldo")),
];

void bar;
