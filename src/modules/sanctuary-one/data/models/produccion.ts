import { cs } from "../sources";
import { C, COL, bar, m, pz, rep, type ModelDef, type Part } from "./kit";

/**
 * Models of the Producción building: construction (Construction.cs), textile studio (Restaurant.cs FurnishTextile),
 * vertical farm (VerticalFarm.cs) and the submarine garage (SubmarineBay). True footprints; the machines are a few boxes.
 */
const { steel, darkSteel, wood, acc, plant, soil, white } = COL;
const CO = (what: string) => cs("Construction", what);
const TX = (what: string) => cs("Restaurant", `FurnishTextile ${what}`);
const VF = (what: string) => cs("VerticalFarm", what);
const YEL = 0xe0a81c;
const P = (id: string, group: string, label: string, color: number, parts: readonly Part[], source: string) => pz(id, "maquina", group, label, color, parts, "real", source);
const box = (id: string, group: string, label: string, w: number, h: number, d: number, color: number, source: string, category: "mueble" | "utensilio" | "maquina" = "mueble") => m(id, category, group, label, w, h, d, color, "caja", "real", source);
/** A rack of shelves (n levels) w × d up to h. */
export const shelves = (w: number, d: number, h: number, n: number, color: number, load?: number): Part[] => [
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * (w / 2 - 0.03), h / 2, sz * (d / 2 - 0.03), 0.05, h, 0.05, color))),
  ...rep(n, (i) => {
    const y = 0.15 + (i * (h - 0.2)) / Math.max(1, n - 1);
    return load === undefined ? [C(0, y, 0, w, 0.03, d, color)] : [C(0, y, 0, w, 0.03, d, color), C(0, y + 0.12, 0, w * 0.92, 0.2, d * 0.8, load)];
  }),
];

/** One LED rack of the vertical farm (VerticalFarm.cs: 4 tiers 3 × 1,2 m, top at 1,9 m, the rack 3,2 × 1,4). */
export const LED_RACK = { w: 3.2, d: 1.4 } as const;
const ledRack: Part[] = [...shelves(3.2, 1.4, 1.9, 4, 0xd8dade, plant), ...rep(4, (i) => [C(0, 0.15 + (i * 1.7) / 3 + 0.4, 0, 3, 0.03, 0.15, 0xf0e8ff)])];

export const PRODUCCION_MODELS: readonly ModelDef[] = [
  box("prod-suelo", "suelos", "Suelo de hormigón pulido del taller", 25.6, 0.02, 19.6, 0x8a8a86, CO("Suelo_taller")),
  // Construcción.
  P("cons-miniexcavadora", "construccion-maquinas", "Miniexcavadora (1,5 t)", YEL, [C(0, 0.2, 0, 1.0, 0.4, 2.0, 0x222222), C(0, 0.8, 0.1, 1.0, 0.8, 1.2, YEL), C(-0.2, 1.6, 0.2, 0.8, 0.9, 0.9, 0x9fc0d0), bar(0.2, 1.1, -0.5, 0.2, 1.9, -1.4, 0.15, YEL), bar(0.2, 1.9, -1.4, 0.2, 0.5, -2.2, 0.12, YEL), C(0.2, 0.35, -2.3, 0.5, 0.35, 0.3, darkSteel)], CO("Miniexcavadora")),
  P("cons-minicargadora", "construccion-maquinas", "Minicargadora", YEL, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.6, 0.3, sz * 0.5, 0.25, 0.6, 0.6, 0x222222))), C(0, 0.85, 0.1, 1.3, 1.0, 1.8, YEL), C(0, 1.6, 0.2, 0.9, 0.6, 1.0, 0x9fc0d0), C(0, 0.35, -1.25, 1.5, 0.5, 0.6, darkSteel)], CO("Minicargadora")),
  P("cons-hormigonera", "construccion-maquinas", "Hormigonera", 0xd04020, [C(0, 0.3, 0, 0.8, 0.6, 1.2, darkSteel), C(0, 1.0, 0, 0.8, 0.8, 0.9, 0xd04020)], CO("Hormigonera")),
  P("cons-grua", "construccion-maquinas", "Grúa pluma de taller (5,6 m)", YEL, [C(0, 0.1, 0, 1.6, 0.2, 1.6, darkSteel), C(0, 2.0, 0, 0.3, 3.8, 0.3, YEL), bar(0, 3.8, 0, -2.8, 3.8, 0, 0.25, YEL), bar(0, 3.8, 0, 1.0, 3.8, 0, 0.3, YEL), C(1.0, 3.4, 0, 0.6, 0.6, 0.6, 0x666a70), C(-2.6, 2.6, 0, 0.05, 2.2, 0.05, 0x222222)], CO("Grua_pluma")),
  box("cons-ladrillos", "construccion-material", "Palés de ladrillos", 2.2, 1.0, 1.0, 0xb5543a, CO("Ladrillos")),
  box("cons-cemento", "construccion-material", "Sacos de cemento", 2.2, 0.8, 1.0, 0xbfbab0, CO("Cemento")),
  box("cons-madera", "construccion-material", "Tablones de madera", 1.2, 0.6, 3.6, wood, CO("Madera")),
  box("cons-vigas", "construccion-material", "Vigas de acero", 1.0, 0.5, 4.0, 0x6a6f78, CO("Vigas_acero")),
  box("cons-tuberias", "construccion-material", "Tuberías", 1.2, 0.5, 3.2, 0x8a9099, CO("Tuberias")),
  P("cons-cable", "construccion-material", "Bobinas de cable", 0x4a3a2a, rep(3, (i) => [C(-0.8 + i * 0.8, 0.45, 0, 0.3, 0.9, 0.9, 0x4a3a2a), C(-0.8 + i * 0.8, 0.45, 0, 0.32, 0.6, 0.6, 0x222222)]), CO("Bobinas_cable")),
  P("cons-repuestos", "construccion-material", "Estantería de repuestos", steel, shelves(2.4, 0.6, 2.0, 4, steel, 0x6a6f78), CO("Repuestos")),
  box("cons-tejas", "construccion-material", "Palés de tejas", 1.6, 0.9, 1.2, 0xa04a30, CO("Tejas")),
  P("cons-panel", "construccion-herramientas", "Panel de herramientas y banco", wood, [C(0, 0.45, 0.2, 2.4, 0.9, 0.7, wood), C(0, 1.5, 0.5, 2.4, 1.2, 0.05, 0xd8c8a0), ...rep(6, (i) => [C(-1 + i * 0.4, 1.5, 0.45, 0.05, 0.4, 0.05, darkSteel)])], CO("Panel_herramientas")),
  P("cons-andamio", "construccion-herramientas", "Andamio de taller", 0x3a6fb0, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.95, 1.0, sz * 0.4, 0.05, 2.0, 0.05, 0x3a6fb0))), C(0, 2.0, 0, 2.0, 0.05, 0.85, wood), C(0, 1.0, 0, 2.0, 0.05, 0.85, wood)], CO("Andamio")),
  P("cons-carretilla", "construccion-herramientas", "Carretilla", 0x3a7a3a, [C(0, 0.55, 0.1, 0.6, 0.3, 0.8, 0x3a7a3a), C(0, 0.2, -0.45, 0.08, 0.4, 0.4, 0x222222), bar(-0.25, 0.5, 0.2, -0.25, 0.6, 0.8, 0.04, darkSteel), bar(0.25, 0.5, 0.2, 0.25, 0.6, 0.8, 0.04, darkSteel)], CO("Carretilla")),
  box("cons-cono", "construccion-herramientas", "Cono de obra", 0.35, 0.7, 0.35, 0xe06020, CO("Conos"), "utensilio"),
  // Estudio textil.
  P("tex-telar-pie", "textil", "Telar de pie (de cuatro lizos)", wood, [...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.7, 0.8, sz * 0.7, 0.08, 1.6, 0.08, wood))), C(0, 1.6, 0, 1.5, 0.08, 1.5, wood), C(0, 0.9, 0, 1.3, 0.6, 0.02, 0xd9c9a8), C(0, 0.45, -1.0, 0.8, 0.45, 0.4, wood)], TX("Telar_de_pie")),
  P("tex-telar-cintura", "textil", "Telar de cintura", 0xc06040, [C(0, 0.01, 0, 1.6, 0.02, 0.9, 0x6a5a40), C(0, 0.25, 0.9, 0.6, 0.5, 0.05, wood), C(0, 0.05, 0.3, 0.5, 0.04, 1.2, 0xc06040)], TX("Telar_de_cintura")),
  P("tex-rueca", "textil", "Rueca", wood, [C(0, 0.25, 0, 0.4, 0.06, 0.8, wood), C(0, 0.7, 0.2, 0.05, 0.6, 0.6, wood), C(0, 0.6, -0.25, 0.04, 0.7, 0.04, wood), C(0, 0.25, -0.6, 0.35, 0.5, 0.35, 0x5a4a3a)], TX("Rueca")),
  P("tex-ovillos", "textil", "Estantería de ovillos", wood, shelves(1.8, 0.4, 1.8, 4, wood, 0xc04a6a), TX("Ovillos")),
  P("tex-tina", "textil", "Tina de tinte", 0x4a6aa0, [C(0, 0.3, 0, 0.6, 0.6, 0.6, 0x8a8f96), C(0, 0.58, 0, 0.5, 0.02, 0.5, 0x4a6aa0)], TX("Tinas")),
  P("tex-mesa-corte", "textil", "Mesa de corte", wood, [C(0, 0.88, 0, 3.0, 0.05, 1.4, 0xe0d8c0), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 1.4, 0.43, sz * 0.6, 0.08, 0.86, 0.08, wood)))], TX("Mesa_corte")),
  P("tex-coser", "textil", "Máquina de coser", white, [C(0, 0.72, 0, 1.2, 0.04, 0.6, wood), C(-0.55, 0.36, 0, 0.05, 0.72, 0.55, darkSteel), C(0.55, 0.36, 0, 0.05, 0.72, 0.55, darkSteel), C(0.1, 0.9, 0, 0.45, 0.3, 0.2, white), C(0, 0.45, -0.6, 0.4, 0.9, 0.4, 0x333338)], TX("Maquina_coser")),
  P("tex-maniqui", "textil", "Maniquí", 0xe6dccb, [C(0, 0.05, 0, 0.35, 0.05, 0.35, darkSteel), C(0, 0.6, 0, 0.04, 1.1, 0.04, darkSteel), C(0, 1.4, 0, 0.38, 0.6, 0.24, 0xe6dccb)], TX("Maniquies")),
  P("tex-tendedero", "textil", "Tendedero de lanas teñidas", wood, [C(-1.2, 0.9, 0, 0.05, 1.8, 0.05, wood), C(1.2, 0.9, 0, 0.05, 1.8, 0.05, wood), C(0, 1.75, 0, 2.4, 0.03, 0.03, wood), ...rep(5, (i) => [C(-0.9 + i * 0.45, 1.5, 0, 0.15, 0.5, 0.02, [0xc04a6a, 0x4a6aa0, 0xe0a81c, 0x3a7a3a, 0x8a4ab0][i])])], TX("Tendedero")),
  // Huerto vertical.
  P("vf-rack", "huerto-vertical", "Estante de cultivo LED (4 pisos)", 0xd8dade, ledRack, VF("Rack (Tiers 4, TierW 3, TierD 1,2)")),
  P("vf-vivero", "huerto-vertical", "Vivero de germinación", 0xd8dade, shelves(2.4, 1.2, 1.6, 3, 0xd8dade, 0x7fb860), VF("Vivero")),
  box("vf-dosificador", "huerto-vertical", "Dosificador de nutrientes y depósitos", 2.4, 1.4, 1.2, 0x4a8ab0, VF("Dosificador"), "maquina"),
  box("vf-lavado", "huerto-vertical", "Lavado de bandejas", 2.4, 1.0, 1.0, steel, VF("Lavado"), "maquina"),
  P("vf-camara", "huerto-vertical", "Cámara de verdura (fría)", 0xdfe8ee, [C(0, 1.25, 0, 3.2, 2.5, 3.2, 0xdfe8ee), C(0, 1.0, -1.61, 1.0, 2.0, 0.03, 0x9aa0a8)], VF("Camara_verdura")),
  P("vf-banco", "huerto-vertical", "Banco de herramientas", wood, [C(0, 0.45, 0, 3.0, 0.9, 1.0, wood), C(0, 1.4, 0.9, 3.0, 1.0, 0.05, 0xd8c8a0)], VF("Banco_herramientas")),
  P("vf-compostador", "huerto-vertical", "Compostador", soil, [C(0, 0.45, 0, 1.2, 0.9, 1.0, 0x3a5a3a), C(0, 0.85, 0, 1.1, 0.04, 0.9, soil)], VF("Compostador")),
  P("vf-descanso", "huerto-vertical", "Banco de descanso", wood, [C(0, 0.45, 0, 1.8, 0.05, 0.5, wood), C(0, 0.22, 0, 1.6, 0.44, 0.06, wood), C(0, 0.75, 0.25, 1.8, 0.5, 0.05, wood)], VF("Descanso")),
  // Garaje del submarino.
  P("sub-bahia", "submarino", "Bahía de amarre (marcas y topes)", acc, [C(0, 0.005, 0, 4, 0.01, 0.1, acc), C(0, 0.005, -3.5, 4, 0.01, 0.1, acc), C(0, 0.005, 3.5, 4, 0.01, 0.1, acc), C(-2, 0.005, 0, 0.1, 0.01, 7, acc), C(2, 0.005, 0, 0.1, 0.01, 7, acc), C(-1.2, 0.3, 0, 0.3, 0.6, 3, darkSteel), C(1.2, 0.3, 0, 0.3, 0.6, 3, darkSteel)], cs("Submarine", "SubmarineBay")),
  P("sub-obra", "submarino", "Submarino de obra (tres plazas, cúpula acrílica)", 0xe0a81c, [C(0, 1.2, 0, 1.9, 1.3, 4.6, 0xe0a81c), C(0, 2.1, -0.6, 1.5, 1.0, 1.6, 0xbfe3f0), C(0, 1.2, 2.5, 0.8, 0.8, 0.6, darkSteel), C(-1.1, 1.0, 0.5, 0.3, 0.3, 1.2, darkSteel), C(1.1, 1.0, 0.5, 0.3, 0.3, 1.2, darkSteel), C(-0.9, 0.5, -2.0, 0.5, 0.25, 0.8, steel), C(0, 0.5, 0, 1.6, 0.2, 3.6, darkSteel)], cs("Submarine", "Submarino de obra (Triton 3300/3 como referencia)")),
  P("sub-taller", "submarino", "Banco de mantenimiento del submarino y baterías", steel, [C(0, 0.45, 0, 3, 0.9, 0.8, steel), C(1, 1.2, 0.2, 0.8, 0.6, 0.5, 0x2a2e36), ...shelves(1.4, 0.5, 2, 4, steel, 0x6a6f78).map(([x, y, z, a, b, c, col]) => [x - 2.4, y, z + 0.1, a, b, c, col] as Part)], cs("Submarine", "SubmarineBay taller")),
];
