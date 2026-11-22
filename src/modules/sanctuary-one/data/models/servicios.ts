import { cs, csx } from "../sources";
import { C, COL, bar, m, pz, rep, type Category, type ModelDef, type Part } from "./kit";
import { bench } from "./entrenamiento";
import { STATION, STATION_UTENSILS, TABLE_SETTING, kitchenBlock } from "./cocina-equipo";

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

/** An office chair for round-the-clock use (EN 1335): five-star base on casters, gas lift, seat and back, armrests; facing +z. */
export const officeChair = (x: number, z: number): Part[] => [
  C(x, 0.04, z, 0.62, 0.05, 0.06, darkSteel), C(x, 0.04, z, 0.06, 0.05, 0.62, darkSteel), ...[-1, 1].flatMap((s) => [C(x + s * 0.3, 0.025, z, 0.05, 0.05, 0.05, 0x26262a), C(x, 0.025, z + s * 0.3, 0.05, 0.05, 0.05, 0x26262a)]),
  C(x, 0.26, z, 0.05, 0.4, 0.05, 0x8c9096), C(x, 0.48, z, 0.5, 0.08, 0.48, 0x26262a), C(x, 0.8, z - 0.26, 0.46, 0.56, 0.06, 0x26262a), C(x, 0.6, z - 0.22, 0.05, 0.2, 0.05, darkSteel),
  ...[-1, 1].flatMap((s) => [C(x + s * 0.26, 0.6, z, 0.04, 0.16, 0.04, darkSteel), C(x + s * 0.26, 0.68, z, 0.06, 0.03, 0.26, 0x26262a)]),
];
/** A table on four legs, its top at h. */
export const legsTable = (w: number, d: number, h: number, color: number): Part[] => [C(0, h - 0.02, 0, w, 0.04, d, color), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * (w / 2 - 0.05), (h - 0.04) / 2, sz * (d / 2 - 0.05), 0.05, h - 0.04, 0.05, darkSteel)))];
/** An operator's desk (w × 0,9 m at 74 cm, panel legs) with `screens` monitors on their stands, keyboard, mouse, headset and the chair; the operator faces +z. */
const opsDesk = (w: number, screens: number): Part[] => [
  C(0, 0.72, 0, w, 0.04, 0.9, 0x5a5e66), ...[-1, 1].map((sx) => C(sx * (w / 2 - 0.03), 0.35, 0, 0.04, 0.7, 0.8, 0x404550)), C(0, 0.4, 0.4, w - 0.1, 0.4, 0.02, 0x404550),
  ...rep(screens, (i) => {
    const x = (i - (screens - 1) / 2) * 0.56;
    return [C(x, 0.75, 0.25, 0.22, 0.02, 0.18, 0x26262a), C(x, 0.85, 0.3, 0.05, 0.2, 0.05, 0x26262a), C(x, 1.12, 0.28, 0.54, 0.33, 0.03, 0x16181c), C(x, 1.12, 0.262, 0.5, 0.29, 0.005, [0x1d4f6b, 0x2b6e4f, 0x3a5a7a][i % 3])];
  }),
  C(-0.05, 0.75, -0.15, 0.45, 0.02, 0.15, 0x26262a), C(0.3, 0.75, -0.15, 0.06, 0.02, 0.1, 0x26262a), C(-0.55, 0.77, 0.05, 0.18, 0.06, 0.16, 0x26262a),
  ...officeChair(0, -0.75),
];

/** A hospital bed (InfirmaryProps.HospitalBed): 1 × 2,1 m, mattress at 0,6 m, head at −z. */
const bedParts = (blanket: number): Part[] => [C(0, 0.3, 0, 0.95, 0.12, 2.05, steel), C(0, 0.5, 0.05, 0.9, 0.18, 1.95, white), C(0, 0.6, 0.35, 0.92, 0.04, 1.3, blanket), C(0, 0.75, -0.98, 0.95, 0.6, 0.06, steel), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.42, 0.13, sz * 0.9, 0.06, 0.26, 0.06, darkSteel)))];


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
/** A round thing of boxes (a vessel, a dewar): an octagon of three boxes, radius r, from y0 to y1. */
const round = (x: number, y0: number, y1: number, z: number, r: number, color: number): Part[] => [C(x, (y0 + y1) / 2, z, 2 * r, y1 - y0, 1.2 * r, color), C(x, (y0 + y1) / 2, z, 1.2 * r, y1 - y0, 2 * r, color), C(x, (y0 + y1) / 2, z, 1.7 * r, y1 - y0, 1.7 * r, color)];
/**
 * A stirred-tank bioreactor (Berón 2026-11-22: «los objetos de cultivo de carne… ¿son realistas?»; GFI, «Trends in
 * cultivated meat scale-up and bioprocessing», 2024: stirred tanks ported from pharma, perfusion for differentiation):
 * a stainless vessel of radius r on legs, its dished head with the agitator's motor on top, the sight glass, the probes
 * (pH, oxygen, temperature) in their ports, the jacket's water pipes, and its control cabinet beside it.
 */
const bioreactor = (r: number, h: number): Part[] => {
  const leg = h * 0.18, top = h * 0.8;
  return [
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * r * 0.6, leg / 2, sz * r * 0.6, 0.07, leg, 0.07, steel))),
    ...round(0, leg, top, 0, r, 0xc9ced4), ...round(0, top, top + h * 0.05, 0, r * 0.8, 0xc9ced4), ...round(0, leg - 0.05, leg, 0, r * 0.8, 0xc9ced4),
    C(0, top + h * 0.09, 0, r * 0.45, h * 0.08, r * 0.45, darkSteel), C(0, top + h * 0.16, 0, r * 0.3, h * 0.08, r * 0.3, 0x3a6fb0),
    C(r * 0.45, top + h * 0.07, 0.1, r * 0.35, 0.04, r * 0.35, steel),
    C(0, (leg + top) / 2, -r * 1.0, r * 0.18, (top - leg) * 0.6, 0.02, 0x2a3a44),
    ...[-0.5, 0, 0.5].map((dx) => C(dx * r, leg + (top - leg) * 0.35, -r * 0.95, 0.03, 0.03, 0.22, darkSteel)),
    C(r * 1.02, (leg + top) / 2, 0, 0.05, top - leg, 0.05, steel), C(-r * 1.02, (leg + top) / 2, 0, 0.05, top - leg, 0.05, steel),
    C(r + 0.45, 0.8, r * 0.3, 0.6, 1.6, 0.4, 0xd8dadc), C(r + 0.45, 1.25, r * 0.3 - 0.21, 0.4, 0.3, 0.01, 0x1f4052),
  ];
};
/** A lab bench on four legs, top at 0,9 m, w × d. */
const labBench = (w: number, d: number): Part[] => [C(0, 0.88, 0, w, 0.04, d, 0x3a3d42), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * (w / 2 - 0.05), 0.43, sz * (d / 2 - 0.05), 0.05, 0.86, 0.05, white))), C(0, 0.15, 0, w - 0.1, 0.03, d - 0.1, white)];

export const SERVICIOS_MODELS: readonly ModelDef[] = [
  // ── Restaurante (KitchenPlan.cs KitchenFloorPlan, ProKitchen; Restaurant.cs BuildGourmetDining) ──
  eq("cocina-suelo", "mueble", "suelos", "Suelo de baldosa de pizarra de la cocina", 39.6, 0.04, 37.6, 0x333538, K("Suelo_Cocina (GourmetKitchen: pizarra)")),
  pz("cocina-barra-servicio", "mueble", "cocina", "Barra de servicio (pase, con riel de comandas)", steel, [...counter(5), C(0, 1.45, 0.45, 4.6, 0.03, 0.03, steel),
    // The pass: the heat-lamp gantry (Hatco Glo-Ray) on its two posts, its red lamps, the plates waiting and the tickets on the rail.
    ...[-1, 1].map((sx) => C(sx * 2.3, 1.25, 0, 0.05, 0.7, 0.05, steel)), C(0, 1.62, 0, 4.7, 0.06, 0.3, darkSteel),
    ...rep(6, (i) => [C(-1.9 + i * 0.76, 1.57, 0, 0.3, 0.03, 0.12, 0xd94a2a)]),
    ...rep(5, (i) => [C(-1.6 + i * 0.8, 0.915, 0, 0.27, 0.015, 0.27, white), C(-1.6 + i * 0.8, 0.93, 0, 0.12, 0.03, 0.12, [0x6b9e4a, 0xd9583a, 0xe8c66a, 0x8c5a3a, 0xf2e6cc][i]!)]),
    ...rep(6, (i) => [C(-1.8 + i * 0.7, 1.38, 0.45, 0.08, 0.12, 0.005, white)])], "real", K("Barra de servicio")),
  pz("cocina-mesa-emplatado", "mueble", "cocina", "Mesa de emplatado", steel, [...counter(4.2, 1.2),
    // Stacks of plates, the squeeze bottles of sauces, the tweezers and the GN of garnishes.
    ...rep(15, (n) => [C(-1.5 + Math.floor(n / 5) * 0.4, 0.91 + (n % 5) * 0.012, 0.35, 0.28, 0.01, 0.28, white)]),
    ...rep(6, (i) => [C(0.2 + i * 0.1, 0.99, 0.4, 0.05, 0.18, 0.05, [0xd9583a, 0xe8c66a, 0x4f8a3c, 0x5a3a2a, 0xf2f2f2, 0x8c1f1f][i]!)]),
    C(1.4, 0.91, -0.2, 0.18, 0.01, 0.02, steel), ...rep(4, (i) => [C(1.0 + i * 0.2, 0.94, 0.3, 0.17, 0.08, 0.3, steel), C(1.0 + i * 0.2, 0.97, 0.3, 0.15, 0.02, 0.28, [0x4f8a3c, 0xd9583a, 0xf2e6cc, 0x6b9e4a][i]!)])], "real", K("Mesa de emplatado")),
  pz("cocina-encimera-ingredientes", "mueble", "cocina", "Encimera de ingredientes", steel, [...counter(5.5), ...rep(6, (i) => [C(-2.1 + i * 0.85, 1.0, 0, 0.35, 0.2, 0.3, [0xf2e6cc, 0x6b9e4a, 0xd9c08c, 0xd9583a, 0xf2f2f2, 0x8c5a3a][i]!)])], "real", K("Encimera ingredientes: huevos, verduras, avena, fruta, yogur, legumbres")),
  pz("cocina-estanteria", "mueble", "cocina", "Estantería de despensa", 0x9e7a52, [C(0, 1, 0, 3, 2, 0.06), ...rep(5, (i) => [C(0, 0.1 + i * 0.45, 0.25, 3, 0.04, 0.5)]), ...rep(10, (i) => [C(-1.3 + (i % 5) * 0.65, 0.3 + Math.floor(i / 5) * 0.9, 0.25, 0.4, 0.3, 0.35, 0xc9a66b)])], "real", K("KitchenProps.Shelving (Despensa, Estanteria)")),
  pz("cocina-puesto", "maquina", "cocina", "Puesto de cocina completo (plancha, fregadero, hornos, inducción, nevera, marmitas, abatidor y barra de sushi)", steel, [...STATION, ...STATION_UTENSILS], "real", K("CompleteStation (8 puestos)")),
  ...KITCHEN_BLOCKS.map(([id, label, w, d, h, color]) => pz(`cocina-${id}`, "maquina", "cocina-franjas", label, color, kitchenBlock(id, w, d, h), "real", `${K("Strip: bloques contra las paredes")}; equipo real dentro: ver models/cocina-equipo.ts`)),
  pz("comedor-mesa", "mueble", "comedor", "Mesa del comedor gourmet (4 cubiertos)", 0xf7f7f2, [...diningTable, ...TABLE_SETTING], "real", cs("Restaurant", "BuildGourmetDining Table")),
  pz("comedor-caja", "mueble", "comedor", "Caja registradora", steel, [...counter(1.6), C(-0.3, 1.02, 0, 0.4, 0.24, 0.35, 0x33383f)], "real", cs("Restaurant", "Caja_registradora")),
  pz("comedor-sushi-cafe", "mueble", "comedor", "Barra de sushi y cafetera espresso", 0x8c6b4d, [C(-1, 0.55, 0, 2.4, 1.1, 0.7), C(1.9, 0.5, 0, 1.2, 1.0, 0.6, steel), C(1.9, 1.2, 0, 0.6, 0.4, 0.45, 0x8c1f1f)], "real", cs("Restaurant", "Eq barra de sushi y cafetera espresso")),
  pz("comedor-vinos", "mueble", "comedor", "Pared de vinos", 0x6b4733, [C(0, 1.2, 0, 6, 2.4, 0.4), ...rep(84, (i) => [C(-2.75 + (i % 14) * 0.42, 0.3 + Math.floor(i / 14) * 0.38, -0.2, 0.09, 0.09, 0.04, (i % 14 + Math.floor(i / 14)) % 3 === 0 ? 0x59141f : 0x2e4726)])], "real", cs("Restaurant", "Pared_de_vinos")),
  pz("planta-maceta", "naturaleza", "plantas-interior", "Planta en macetero", 0x4d8c4d, [C(0, 0.22, 0, 0.42, 0.44, 0.42, 0x4d4d52), C(0, 0.47, 0, 0.5, 0.06, 0.5, 0x5a5a60), C(0, 0.49, 0, 0.44, 0.02, 0.44, 0x4a3a2a), C(0, 0.75, 0, 0.06, 0.5, 0.06, 0x6a5a40), C(0, 1.05, 0, 0.75, 0.5, 0.75, 0x4d8c4d), ...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz], i) => C(dx! * 0.3, 0.95 + (i % 2) * 0.12, dz! * 0.3, 0.42, 0.35, 0.42, i % 2 ? 0x3f7a3f : 0x5a9a50)), C(0, 1.35, 0, 0.45, 0.25, 0.45, 0x5a9a50)], "real", cs("Restaurant", "Planta (esquinas del anillo)")),

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
  pz("vet-caja-aves", "mueble", "veterinario", "Caja de recuperación de aves (paja y ave con el ala vendada)", 0x9e7a52, [C(0, 0.4, 0, 1.2, 0.8, 1.2, 0x9e7a52), C(0, 0.82, 0, 1.05, 0.04, 1.05, 0xd9c27a), C(0, 0.93, 0, 0.18, 0.16, 0.3, 0xf2f2f2), C(0, 1.02, -0.17, 0.1, 0.1, 0.1, 0xf2f2f2), C(0, 1.02, -0.24, 0.03, 0.03, 0.06, 0x333333), C(0.11, 0.95, 0.02, 0.04, 0.12, 0.26, 0xe8d0c0)], "real", H("Refugio_aves: Caja_recuperacion, Paja, Ave_en_recuperacion con Venda_ala")),
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
  pz("lab-campana", "maquina", "carne-cultivada", "Cabina de seguridad biológica de clase II", white, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.72, 0.35, sz * 0.3, 0.05, 0.7, 0.05, darkSteel))), C(0, 0.72, 0, 1.6, 0.06, 0.8, darkSteel), C(0, 1.0, 0.05, 1.6, 0.5, 0.7, white), C(0, 1.02, -0.2, 1.4, 0.02, 0.4, steel), ...[-1, 1].map((sx) => C(sx * 0.78, 1.4, 0, 0.04, 1.3, 0.8, white)), C(0, 1.95, 0.1, 1.6, 0.5, 0.6, white), C(0, 1.55, -0.32, 1.45, 0.55, 0.02, glass), C(0, 1.85, -0.36, 1.5, 0.1, 0.04, 0x26262a), C(0, 2.25, 0.1, 1.2, 0.1, 0.5, steel)], "real", "Cabina de clase II tipo A2 de 1,6 m sobre su soporte (EN 12469): cristal de guillotina, superficie de trabajo y filtros HEPA arriba; " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Campana"),
  pz("lab-microscopio", "maquina", "carne-cultivada", "Microscopio invertido en su mesa", white, [...labBench(1.2, 0.7), C(0, 0.95, 0, 0.3, 0.1, 0.4, 0x2a2d33), C(0, 1.12, 0.12, 0.08, 0.3, 0.08, 0x2a2d33), C(0, 1.05, -0.02, 0.24, 0.02, 0.22, 0x2a2d33), C(0, 1.25, 0.12, 0.08, 0.06, 0.25, 0x2a2d33), C(0, 1.08, -0.2, 0.1, 0.08, 0.14, 0x2a2d33), C(-0.03, 1.13, -0.27, 0.03, 0.06, 0.03, 0x111111), C(0.03, 1.13, -0.27, 0.03, 0.06, 0.03, 0x111111), C(0.35, 1.06, 0, 0.28, 0.3, 0.02, 0x16181c)], "real", "Microscopio invertido de cultivo celular con cámara y monitor; " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Microscopio"),
  pz("lab-criogenico", "maquina", "carne-cultivada", "Tanque criogénico de nitrógeno líquido (banco de células)", steel, [C(0, 0.05, 0, 0.7, 0.06, 0.7, darkSteel), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.28, 0.025, sz * 0.28, 0.06, 0.05, 0.06, 0x26262a))), ...round(0, 0.08, 1.0, 0, 0.32, 0xc9ced4), ...round(0, 1.0, 1.08, 0, 0.18, 0xc9ced4), C(0, 1.13, 0, 0.22, 0.08, 0.22, 0x3a6fb0), C(0.36, 0.6, 0, 0.08, 0.3, 0.08, darkSteel)], "real", "Tanque de almacenamiento en vapor de nitrógeno (unos 170 L, −190 °C) sobre carro de ruedas; " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Tanque_criogenico"),
  eq("lab-incubadora", "maquina", "carne-cultivada", "Incubadora de CO₂", 0.75, 1.2, 0.75, white, "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Incubadora_CO2"),
  pz("lab-medio", "maquina", "carne-cultivada", "Preparación de medio (depósito con agitador, bomba y filtro de 0,2 µm)", steel, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.25, 0.15, sz * 0.25, 0.05, 0.3, 0.05, steel))), ...round(0, 0.3, 1.2, 0, 0.36, 0xc9ced4), C(0, 1.3, 0, 0.2, 0.2, 0.2, darkSteel), C(0.7, 0.3, 0, 0.25, 0.3, 0.2, 0x3a6fb0), C(0.7, 0.9, 0, 0.1, 0.35, 0.1, white), bar(0.36, 0.4, 0, 0.62, 0.35, 0, 0.03, 0xe8e8e0), bar(0.7, 1.07, 0, 0.36, 1.1, 0, 0.03, 0xe8e8e0)], "real", "Depósito de medio de 200 L con agitador, bomba peristáltica y filtro capsular de 0,2 µm (medio sin suero, GFI 2024); " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Medio"),
  eq("lab-autoclave", "maquina", "carne-cultivada", "Autoclave", 0.8, 1, 0.7, steel, "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Autoclave"),
  pz("lab-biorreactor-semilla", "maquina", "carne-cultivada", "Biorreactor semilla (50 L)", steel, bioreactor(0.3, 1.4), "real", "Tren de semilla: tanque agitado de 50 L (GFI 2024); " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Biorreactor_semilla"),
  pz("lab-biorreactor", "maquina", "carne-cultivada", "Biorreactor de producción (1 500 L, 37 °C, pH 7,3)", steel, bioreactor(1.15, 3), "real", "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Biorreactor_produccion (LitresFor: radio 0,8·(L/500)^⅓)"),
  pz("lab-perfusion", "maquina", "carne-cultivada", "Biorreactor de perfusión con su andamio (fibras)", steel, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.82, 0.04, sz * 0.42, 0.08, 0.08, 0.08, 0x26262a))), C(0, 0.1, 0, 1.8, 0.06, 1, steel), ...[-1, 1].flatMap((sx) => [C(sx * 0.85, 0.5, -0.45, 0.05, 0.8, 0.05, steel), C(sx * 0.85, 0.5, 0.45, 0.05, 0.8, 0.05, steel)]), C(0, 0.9, 0, 1.8, 0.04, 1, steel), C(-0.3, 1.25, 0, 1.0, 0.6, 0.6, glass), ...rep(5, (i) => [C(-0.7 + i * 0.2, 1.22, 0, 0.04, 0.45, 0.45, 0xd98c80)]), C(0.55, 1.2, 0.1, 0.5, 0.55, 0.5, 0xd8dadc), C(0.55, 1.3, -0.16, 0.36, 0.22, 0.01, 0x1f4052), ...[0.4, 0.7].map((x) => C(x, 1.05, -0.16, 0.12, 0.12, 0.04, 0x3a6fb0)), C(0, 0.45, 0, 0.3, 0.5, 0.3, 0xe8e0c8)], "real", "Perfusión para la diferenciación (GFI 2024: el modo preferido para esa etapa): cámara de vidrio con andamios de fibras, bombas y medio en carro; " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Perfusion"),
  pz("lab-centrifuga", "maquina", "carne-cultivada", "Centrífuga de suelo", white, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.32, 0.03, sz * 0.32, 0.06, 0.06, 0.06, 0x26262a))), C(0, 0.45, 0, 0.8, 0.8, 0.8, white), C(0, 0.88, 0.05, 0.72, 0.06, 0.6, 0xd8dadc), C(0, 0.92, 0.05, 0.4, 0.02, 0.4, 0x26262a), C(0, 0.7, -0.41, 0.5, 0.2, 0.02, 0x2a2d33), C(0, 0.7, -0.42, 0.3, 0.1, 0.01, 0x1f4052)], "real", "Centrífuga de suelo refrigerada con rotor oscilante (cosecha de células); " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Centrifuga"),
  pz("lab-formadora", "maquina", "carne-cultivada", "Formadora de hamburguesas (tolva y cinta)", steel, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.42, 0.4, sz * 0.28, 0.05, 0.8, 0.05, steel))), C(0, 0.82, 0, 1, 0.06, 0.65, steel), C(0, 0.88, 0, 0.95, 0.02, 0.4, 0x2a2d33), ...rep(4, (i) => [C(-0.35 + i * 0.22, 0.9, 0, 0.12, 0.02, 0.12, 0xc97a6a)]), C(-0.25, 1.15, 0, 0.45, 0.5, 0.5, steel), C(-0.25, 1.42, 0, 0.55, 0.06, 0.55, steel), C(0.35, 1.05, -0.3, 0.2, 0.3, 0.05, 0x2a2d33)], "real", "Formadora de mesa de acero inoxidable: tolva, molde y cinta de salida; " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Formadora"),
  pz("lab-camara-fria", "maquina", "carne-cultivada", "Cámara fría de producto (4 °C)", white, [C(0, 1, 0, 0.9, 2, 1.4), C(-0.46, 1, 0, 0.02, 1.8, 1.2, 0xb9bec6), C(-0.48, 1.0, 0.45, 0.03, 0.35, 0.04, 0xc7ccd6), C(-0.47, 1.75, -0.4, 0.01, 0.12, 0.25, 0x1a2a3a), C(0, 2.05, 0.3, 0.6, 0.1, 0.5, 0xb8bec6)], "real", `${csx("CulturedMeatLab_Area/Laboratorio_CarneCultivada/Camara_fria")}; puerta, termómetro y evaporador: cámaras frigoríficas de laboratorio`),
  pz("lab-consola-lote", "maquina", "carne-cultivada", "Consola de lote (registro de lote y control de los biorreactores)", white, [...opsDesk(1.4, 2)], "real", "Puesto del sistema de control (SCADA) y registro de lote; " + "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Consola_lote"),
  eq("lab-raciones", "maquina", "carne-cultivada", "Almacén de raciones para el alimentador (cámara)", 1.4, 1.4, 0.7, darkSteel, "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.cs Almacen_raciones (docs/alimentador.md)"),

  // ── Sala de asambleas (Asamblea.cs FurnishAssembly) ──
  eq("asamblea-suelo", "mueble", "suelos", "Suelo de madera de la sala de asambleas", 39.8, 0.02, 37.8, 0x806650, cs("Asamblea", "Suelo_de_madera")),
  pz("asamblea-centro", "mueble", "asamblea", "Piedra de la palabra (Lögberg) y cono de luz (Reichstag)", 0x8c8a85, [C(0, 0.06, 0, 2.4, 0.12, 2.4), C(0, 0.04, -1.9, 1.2, 0.08, 1.4), ...[-1, 1].flatMap((x) => [-1, 1].map((z) => C(x * 3, 2.2, z * 3, 0.1, 4.4, 0.1, steel))), C(0, 4.45, 0, 6.1, 0.08, 6.1, 0xbfe0f0), ...rep(4, (k) => [C(0, 4.2 - k * 0.3, 0, 3 - k * 0.7, 0.5, 3 - k * 0.7, 0xbfe0f0)])], "real", cs("Asamblea", "Lögberg y cono de espejos")),
  pz("asamblea-fila-8", "mueble", "asamblea", "Fila de 8 asientos", 0x8c6b4d, [C(0, 0.225, 0, 8 * 0.7, 0.45, 0.5), C(0, 0.65, 0.27, 8 * 0.7, 0.5, 0.06)], "real", cs("Asamblea", "AssemblyRow (anillo interior a 6 m)")),
  pz("asamblea-fila-10", "mueble", "asamblea", "Fila de 10 asientos", 0x8c6b4d, [C(0, 0.225, 0, 10 * 0.7, 0.45, 0.5), C(0, 0.65, 0.27, 10 * 0.7, 0.5, 0.06)], "real", cs("Asamblea", "AssemblyRow (anillo exterior a 9,75 m)")),
  pz("asamblea-toguna", "mueble", "asamblea", "Toguna de mediación (dogon)", 0x8c6b4d, [...[-1, 0, 1].flatMap((x) => [-1, 1].map((z) => C(x * 2.4, 0.7, z * 2, 0.28, 1.4, 0.28))), ...[-1, 0, 1].map((x) => C(x * 2.4, 1.43, 0, 0.22, 0.06, 4.3, 0x6b5238)), ...rep(9, (k) => [C(0, 1.49, -2 + k * 0.5, 5.4, 0.1, 0.14, 0xb39966)]), C(0, 1.72, 0, 5.8, 0.36, 4.8, 0xc9b27a), C(0, 1.95, 0, 5.2, 0.1, 4.2, 0xa8945e), C(0, 0.22, -1.1, 3.6, 0.44, 0.5), C(0, 0.22, 1.1, 3.6, 0.44, 0.5)], "real", cs("Asamblea", "Toguna (techo bajo de 1,4 m: se discute sentado)")),
  pz("asamblea-mesa-comision", "mueble", "asamblea", "Mesa de la comisión", 0x8c6b4d, bench(3.4, 1.4, 0x8c6b4d), "real", cs("Asamblea", "Mesa de la comisión")),
  pz("asamblea-archivo", "mueble", "asamblea", "Archivo de actas (quipus, cinturón de conchas, libro)", 0x8c6b4d, [...bench(3.6, 0.8, 0x8c6b4d), ...rep(7, (k) => [C(-1.4 + k * 0.2, 1.25, 0.3, 0.03, 0.7, 0.03, 0xf2e6cc)]), C(1.2, 0.98, 0, 0.7, 0.1, 0.5, 0x6b1f26)], "real", cs("Asamblea", "Archivo de actas")),
  pz("asamblea-marcador", "mueble", "asamblea", "Marcador de votos", 0x222226, [C(0, 1.9, 0, 4, 2.2, 0.16), C(-1.8, 0.4, 0, 0.14, 0.8, 0.14, steel), C(1.8, 0.4, 0, 0.14, 0.8, 0.14, steel)], "real", cs("Asamblea", "Marcador de votos")),
  pz("asamblea-interpretes", "mueble", "asamblea", "Cabina de intérpretes (ONU) en su sala acústica", 0x8c6b4d, [...bench(2.6, 0.8, 0x8c6b4d), ...glassRoom(7.6, 6.4, 3)], "real", cs("Asamblea", "Cabina de intérpretes y SoundRoom")),
  pz("asamblea-kleroterion", "mueble", "asamblea", "Kleroterion y clepsidra (Atenas)", 0x8c8a85, [...bench(3.4, 1, 0x8c8a85), C(-0.8, 1.5, 0, 1.2, 1.2, 0.14, 0xf2e6cc), C(0.9, 1.25, 0, 0.5, 0.5, 0.5, 0x995c38)], "real", cs("Asamblea", "Kleroterion")),
  pz("asamblea-arbol", "naturaleza", "plantas-interior", "Retoño en maceta (Gernika, panchayat…)", 0x4d7a42, [C(0, 0.3, 0, 1.6, 0.6, 1.6, 0x734d38), C(0, 1.3, 0, 0.22, 1.6, 0.22, 0x8c6b4d), C(0, 2.5, 0, 1.8, 1.4, 1.8)], "real", cs("Asamblea", "árboles de asamblea en maceta")),

  // ── Sala de guardia (GuardRoom.cs FurnishGuardRoom) ──
  eq("guardia-suelo", "mueble", "suelos", "Suelo de la sala de guardia", 39.8, 0.02, 37.8, 0x575c66, cs("GuardRoom", "Suelo_de_sala")),
  // The watch as a maritime rescue coordination centre's (Berón 2026-11-22: «mesas con un tipo de pantalla y silla
  // voladora… se debe dar realismo a esta sala»): desks on their legs, monitors on their stands, chairs on their bases.
  pz("guardia-muro-video", "maquina", "guardia", "Muro de vídeo: 2 × 3 pantallas de 55″ en su bastidor", 0x16181c, [
    ...[-1, 1].flatMap((sx) => [C(sx * 1.75, 0.03, 0, 0.12, 0.06, 0.9, darkSteel), C(sx * 1.75, 1.5, 0.1, 0.1, 3.0, 0.1, darkSteel)]),
    C(0, 0.95, 0.1, 3.6, 0.08, 0.08, darkSteel), C(0, 2.95, 0.1, 3.6, 0.08, 0.08, darkSteel),
    ...rep(6, (i) => [C(-1.22 + (i % 3) * 1.22, 1.33 + Math.floor(i / 3) * 0.7, 0.02, 1.2, 0.68, 0.06, 0x16181c), C(-1.22 + (i % 3) * 1.22, 1.33 + Math.floor(i / 3) * 0.7, -0.015, 1.12, 0.6, 0.01, [0x1d4f6b, 0x2b6e4f, 0x1d4f6b, 0x3a5a7a, 0x1a2a3a, 0x2b6e4f][i])]),
  ], "real", "Muro de vídeo de un centro de coordinación de salvamento (MRCC): pantallas de 55″ (121 × 68 cm) sin marco en bastidor de suelo; cs GuardRoom Muro_de_pantallas"),
  pz("guardia-consola", "maquina", "guardia", "Puesto de operador: mesa, 3 monitores, teclado y silla de 24 h", 0x404550, opsDesk(1.8, 3), "real", "Puesto de operador de un MRCC: mesa de 180 × 90 cm a 74 cm, 3 monitores de 24″ en brazo y silla de uso continuo (EN 1335); cs GuardRoom GrConsoles"),
  pz("guardia-respaldo", "maquina", "guardia", "Puesto del jefe de guardia: mesa, 2 monitores, teléfono y silla", 0x404550, [...opsDesk(1.6, 2), C(0.55, 0.79, 0.05, 0.22, 0.08, 0.2, 0x26262a)], "real", "Mesa del jefe de guardia de un MRCC (160 × 90 cm, 2 monitores y teléfono); cs GuardRoom Puesto de respaldo"),
  pz("guardia-radar", "maquina", "guardia", "Consola de radar (tráfico marítimo, VTS)", 0x404550, [
    C(0, 0.4, 0, 1.2, 0.8, 0.8), C(0, 0.83, -0.1, 1.2, 0.06, 0.6, 0x26262a), C(0, 1.15, 0.25, 1.1, 0.7, 0.12, 0x2a2d33), C(0, 1.15, 0.18, 0.62, 0.62, 0.01, 0x123a2a), C(0, 1.15, 0.175, 0.08, 0.08, 0.01, 0x40d080),
    C(-0.35, 0.87, -0.2, 0.4, 0.03, 0.18, 0x26262a), C(0.35, 0.88, -0.2, 0.12, 0.05, 0.12, 0x26262a), ...officeChair(0, -0.85),
  ], "real", "Consola de radar ARPA de un VTS (pantalla de 27″, panel de control y bola de seguimiento); cs GuardRoom Mesa de radar"),
  pz("guardia-carta-hielo", "maquina", "guardia", "Mesa de cartas con la carta de hielo (Patrulla Internacional del Hielo)", 0x404550, [
    ...legsTable(2.4, 1.3, 0.92, 0x404550), C(0, 0.945, 0, 2.2, 0.01, 1.1, 0xdbe6eb), C(-0.5, 0.95, 0.1, 0.5, 0.01, 0.35, 0xf2f2f2), C(0.6, 0.955, -0.2, 0.3, 0.02, 0.04, 0x26262a), C(0, 1.6, 0.6, 0.06, 1.3, 0.06, darkSteel), C(0, 2.2, 0.4, 0.4, 0.1, 0.4, 0xe8e8e0),
  ], "real", "Mesa de cartas náuticas de pie (92 cm) con lámpara de brazo; carta de hielo de la IIP (USCG); cs GuardRoom Carta de hielo"),
  pz("guardia-sismografo", "maquina", "guardia", "Sismógrafo de tambor y su registrador", 0x404550, [
    ...legsTable(1.6, 0.8, 0.78, 0x404550), C(0, 1.0, 0, 1.0, 0.36, 0.36, 0x2a2d33), C(0, 1.0, -0.19, 0.9, 0.3, 0.01, 0xebe6d6), ...rep(5, (i) => [C(0, 0.9 + i * 0.05, -0.2, 0.86, 0.005, 0.005, 0x26262a)]), C(0.35, 1.25, -0.1, 0.03, 0.15, 0.03, 0x8c8a85),
  ], "real", "Sismógrafo de tambor (registro en papel ahumado, 60 mm/min) sobre su mesa; cs GuardRoom Sismógrafo"),
  pz("guardia-mareografo", "maquina", "guardia", "Mareógrafo de flotador y maqueta de boya DART", 0x404550, [
    C(0, 0.03, 0, 0.6, 0.06, 0.6, darkSteel), C(0, 0.75, 0, 0.3, 1.4, 0.3, 0x8c9096), C(0, 1.55, 0, 0.45, 0.3, 0.35, 0x404550), C(0, 1.55, -0.18, 0.3, 0.2, 0.01, 0xebe6d6),
    C(1.2, 0.05, 0, 1.0, 0.1, 1.0, darkSteel), C(1.2, 0.4, 0, 0.9, 0.6, 0.9, 0xe6b326), C(1.2, 0.95, 0, 0.5, 0.5, 0.5, 0xe6b326), C(1.2, 1.5, 0, 0.06, 0.6, 0.06, darkSteel), C(1.2, 1.82, 0, 0.14, 0.06, 0.14, 0xd04030),
  ], "real", "Mareógrafo de flotador (pozo y registrador) y maqueta 1:3 de la boya DART II (NOAA); cs GuardRoom Mareógrafo y boya"),
  pz("guardia-radio", "maquina", "guardia", "Armario de radio VHF/HF con su mesa y micrófono", 0x404550, [
    C(0, 0.95, 0.15, 0.8, 1.9, 0.6, 0x2a2d33), ...rep(4, (i) => [C(0, 0.6 + i * 0.35, -0.16, 0.7, 0.22, 0.02, i % 2 ? 0x1a2a3a : 0x404550)]), C(0, 1.85, -0.16, 0.3, 0.06, 0.02, 0x40d080),
    C(0.95, 0.73, -0.1, 1.0, 0.04, 0.7, 0x404550), C(0.55, 0.36, -0.1, 0.05, 0.72, 0.6, darkSteel), C(1.4, 0.36, -0.1, 0.05, 0.72, 0.6, darkSteel), C(0.95, 0.8, -0.05, 0.12, 0.1, 0.12, 0x26262a),
  ], "real", "Radio VHF marina (canal 16 y DSC 70) y HF en armario de 19″; cs GuardRoom Radio VHF"),
  pz("guardia-tablero", "mueble", "guardia", "Tablero de guardia (turnos y avisos) en su caballete", 0xdbc79e, [
    C(0, 1.4, 0, 1.8, 1.1, 0.04, 0xdbc79e), C(0, 1.4, -0.03, 1.84, 1.14, 0.02, 0x8c8a85), ...[-1, 1].flatMap((sx) => [C(sx * 0.8, 0.43, 0, 0.05, 0.86, 0.05, darkSteel), C(sx * 0.8, 0.03, 0, 0.06, 0.06, 0.6, darkSteel)]), C(-0.4, 1.6, -0.05, 0.3, 0.2, 0.01, 0xf2f2f2), C(0.3, 1.3, -0.05, 0.25, 0.3, 0.01, 0xf2e6a0),
  ], "real", "Tablero de corcho de 180 × 110 cm en caballete; cs GuardRoom Tablero de guardia"),
];

void bar;
