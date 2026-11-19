import { C, m, pz, rep, type ModelDef, type Part, type Shape } from "./kit";

/**
 * The plants of the Árbol de los Campos (Cold Sanctuary's GardenPlot.cs: each guild its rows, mounds or forest
 * layers). One model per way of growing (tall canopy tree, small tree, banana, climber, bamboo clump, tall and low crop,
 * border flower, windbreak hedge); each instance keeps its species as its name, so a species can be picked out later.
 */
const GP = (what: string) => `Cold Sanctuary, Assets/Scripts/Farming/GardenPlot.cs ${what}`;
const GP_FRUIT = "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Orchards.cs BuildPotted y Assets/Scripts/Farming/FruitCare.cs";
const POT = 0x8c5a3c, SOIL = 0x5a4030, BARK = 0x6b4f35, FRUIT = 0xe0a020;
const plant = (id: string, label: string, w: number, h: number, color: number, shape: Shape, what: string, walkThrough = false): ModelDef => ({
  ...m(id, "naturaleza", "cultivos", label, w, h, w, color, shape, "real", GP(what)),
  ...(walkThrough ? { walkThrough } : {}),
});

/** The six methods of the world in the Huerto (SampleSceneBuilder.WorldMix.cs FurnishWorldGarden): 4 × 4 m plots, each a real technique. */
const WM = (what: string) => `Cold Sanctuary, Assets/Editor/SampleSceneBuilder.WorldMix.cs FurnishWorldGarden ${what}`;
const W_SOIL = 0x523b29, W_DRY = 0xb89a6b, W_WATER = 0x5994ad, W_GREEN = 0x5c994d, W_STONE = 0x8f8a80, W_BASALT = 0x333338, W_WOOD = 0x8c6640;
const chinampa: Part[] = [
  C(0, 0.05, 0, 4, 0.1, 4, W_WATER), C(0, 0.2, 0, 2.4, 0.3, 3.4, W_SOIL),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 1.1, 0.9, sz * 1.6, 0.14, 1.2, 0.14, 0x735c38))),
  ...rep(5, (i) => [C(0, 0.42, (i - 2) * 0.6, 1.8, 0.14, 0.2, W_GREEN)]),
];
const zai: Part[] = [
  C(0, 0.03, 0, 4, 0.06, 4, W_DRY),
  ...rep(16, (k) => { const x = -1.2 + (k % 4) * 0.8, z = -1.2 + Math.floor(k / 4) * 0.8; return [C(x, 0.07, z, 0.4, 0.02, 0.4, W_SOIL), C(x, 0.2, z, 0.08, 0.26, 0.08, W_GREEN)]; }),
];
const anden: Part[] = rep(3, (k) => {
  const h = 0.3 * (k + 1), z = -1.3 + k * 1.3;
  return [C(0, h / 2, z, 4, h, 1.3, W_STONE), C(0, h + 0.04, z + 0.05, 3.8, 0.08, 1.1, W_SOIL), C(0, h + 0.16, z + 0.05, 3.4, 0.16, 0.25, W_GREEN)];
});
const hugel: Part[] = [
  ...rep(5, (i) => [C((i - 2) * 0.55, 0.15, 0, 0.3, 0.3, 3.8, W_WOOD)]),
  ...rep(3, (k) => [C(0, 0.4 + k * 0.25, 0, 3 - k * 0.9, 0.25, 3.3, W_SOIL)]),
  ...rep(3, (i) => [C(0, 1.1, (i - 1) * 1, 0.7, 0.2, 0.5, W_GREEN)]),
];
/** A batdam side: 7 basalt stones at 1,85 m from the centre, turned k × 90° (side 0 keeps its 1,6 m gate). */
const batdamSide = (k: number): Part[] => rep(7, (j) => {
  const i = j - 3;
  if (k === 0 && Math.abs(i) <= 1) return [];
  const high = 0.45 + (i & 1) * 0.12, a = i * 0.55, b = 1.85;
  const [x, z, sx, sz] = k === 0 ? [a, b, 0.52, 0.3] : k === 1 ? [b, -a, 0.3, 0.52] : k === 2 ? [-a, -b, 0.52, 0.3] : [-b, a, 0.3, 0.52];
  return [C(x, high / 2, z, sx, high, sz, W_BASALT)];
});
const batdam: Part[] = [C(0, 0.04, 0, 3.6, 0.08, 3.6, W_SOIL), ...[0, 1, 2, 3].flatMap(batdamSide), ...rep(3, (i) => [C((i - 1) * 0.9, 0.2, 0, 0.3, 0.24, 2.8, W_GREEN)])];
const subak: Part[] = [
  ...[-1, 1].flatMap((sx) => [C(sx * 1.05, 0.08, -0.2, 1.8, 0.16, 3.4, 0x759e9e), ...rep(5, (i) => [C(sx * 1.05, 0.26, -0.2 + (i - 2) * 0.6, 1.4, 0.2, 0.08, W_GREEN)])]),
  C(0, 0.09, 0, 0.14, 0.18, 3.8, W_STONE), C(0, 0.1, 1.75, 4, 0.2, 0.4, W_WATER), C(0, 0.28, 1.75, 0.12, 0.2, 0.42, W_STONE),
];
export const WORLD_GARDEN: readonly (readonly [id: string, x: number, z: number, label: string])[] = [
  ["metodo-chinampa", -6.5, 3.5, "Chinampa (Xochimilco, México): huerto entre canales"],
  ["metodo-zai", 1, 3.5, "Zaï (Burkina Faso): hoyos con compost que recuperan el suelo"],
  ["metodo-anden", 8.5, 3.5, "Andén (Andes): terrazas de piedra en la ladera"],
  ["metodo-hugelkultur", -6.5, 10, "Hügelkultur (Europa central): montículo sobre troncos"],
  ["metodo-batdam", 1, 10, "Batdam (Jeju, Corea): muretes de basalto contra el viento"],
  ["metodo-subak", 8.5, 10, "Subak (Bali): el agua se reparte entre vecinos"],
];
const WORLD_PARTS: Readonly<Record<string, Part[]>> = { "metodo-chinampa": chinampa, "metodo-zai": zai, "metodo-anden": anden, "metodo-hugelkultur": hugel, "metodo-batdam": batdam, "metodo-subak": subak };

export const CAMPOS_MODELS: readonly ModelDef[] = [
  m("campo-suelo", "naturaleza", "suelos", "Suelo del cultivo", 24, 0.06, 20, 0xb3a394, "caja", "real", GP("Suelo_Huerto")),
  plant("planta-dosel", "Árbol del dosel (bosque comestible)", 4.5, 7, 0x3f7a34, "arbol", "BosqueComestible canopy"),
  plant("planta-arbolito", "Árbol bajo (cítricos, cacao, café…)", 2.4, 3.5, 0x4f8f3a, "arbol", "BosqueComestible small"),
  plant("planta-banano", "Banano", 2.6, 4, 0x6fae3a, "arbol", "BosqueComestible Banana"),
  plant("planta-trepadora", "Pimienta trepando por el tronco", 0.3, 3, 0x2f6a2a, "cilindro", "BosqueComestible Pimienta"),
  plant("planta-hongos", "Tronco con shiitake", 1, 0.3, 0x8a6a4a, "caja", "BosqueComestible Shiitake", true),
  plant("planta-hierba", "Planta herbácea (piña, jengibre, cúrcuma)", 0.7, 0.8, 0x5a9a40, "arbol", "BosqueComestible herbáceas", true),
  plant("planta-arbusto", "Arbusto (caña, naranjilla, mortiño)", 1, 1.8, 0x4a8a3a, "arbol", "BosqueComestible borde"),
  plant("planta-rastrera", "Sandía (rastrera)", 0.9, 0.3, 0x3a7a30, "caja", "Border Sandia", true),
  plant("planta-bambu", "Mata de guadua (bambú)", 1.2, 9, 0x8fb04a, "cilindro", "Bambusal Bambu"),
  plant("planta-canamo", "Cáñamo", 0.4, 2.4, 0x5a8a3a, "cilindro", "Bambusal Canamo"),
  plant("cultivo-alto", "Hortaliza alta (tomate, pepino, berenjena, pimiento)", 0.7, 1.3, 0x4a9a3a, "arbol", "Hortalizas"),
  plant("cultivo-bajo", "Hortaliza baja o aromática", 0.5, 0.45, 0x6aaa4a, "arbol", "Hortalizas", true),
  plant("cultivo-flor", "Lino en flor (para polinizadores)", 0.4, 0.6, 0x7a9ad9, "arbol", "Border Lino", true),
  plant("seto-cortavientos", "Seto cortavientos (arbusto de hielo)", 1.3, 1.7, 0xb3d1bd, "arbol", "Windbreak"),
  m("campo-bancal", "naturaleza", "suelos", "Bancal de un campo de punta (7,2 × 15 m)", 7.2, 0.06, 15, 0xb3a394, "caja", "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Tree.cs TreeTip"),
  // Potted fruit trees of the tips (Orchards.cs BuildPotted, FruitCare.All: one model per form, each instance its species).
  pz("maceta-arbol", "naturaleza", "frutales", "Frutal en maceta (árbol enano)", 0x4f8f3a, [C(0, 0.35, 0, 0.8, 0.7, 0.8, POT), C(0, 0.72, 0, 0.7, 0.04, 0.7, SOIL), C(0, 1.3, 0, 0.14, 1.2, 0.14, BARK), C(0, 2.5, 0, 2.0, 1.6, 2.0, 0x4f8f3a), C(0.5, 2.2, 0.6, 0.18, 0.18, 0.18, FRUIT)], "real", GP_FRUIT),
  pz("maceta-palmera", "naturaleza", "frutales", "Palmera en maceta (enana)", 0x5a9a40, [C(0, 0.35, 0, 0.8, 0.7, 0.8, POT), C(0, 1.6, 0, 0.18, 2.2, 0.18, BARK), C(0, 2.8, 0, 2.4, 0.3, 0.5, 0x5a9a40), C(0, 2.8, 0, 0.5, 0.3, 2.4, 0x5a9a40)], "real", GP_FRUIT),
  pz("maceta-arbusto", "naturaleza", "frutales", "Arbusto frutal en maceta", 0x4a8a3a, [C(0, 0.3, 0, 0.7, 0.6, 0.7, POT), C(0, 1.2, 0, 1.2, 1.2, 1.2, 0x4a8a3a), C(0.3, 1.0, 0.45, 0.15, 0.15, 0.15, FRUIT)], "real", GP_FRUIT),
  { ...pz("maceta-herbacea", "naturaleza", "frutales", "Herbácea frutal en maceta (piña, frutilla)", 0x6aaa4a, [C(0, 0.2, 0, 0.6, 0.4, 0.6, POT), C(0, 0.55, 0, 0.6, 0.3, 0.6, 0x6aaa4a)], "real", GP_FRUIT), walkThrough: true },
  { ...pz("maceta-rastrera", "naturaleza", "frutales", "Rastrera en maceta (sandía)", 0x3a7a30, [C(0, 0.2, 0, 0.7, 0.4, 0.7, POT), C(0, 0.42, 0.6, 1.0, 0.1, 1.0, 0x3a7a30), C(0.2, 0.47, 0.8, 0.3, 0.2, 0.25, 0x2f6a2a)], "real", GP_FRUIT), walkThrough: true },
  ...WORLD_GARDEN.map(([id, , , label]) => pz(id, "naturaleza", "huerto-mundo", label, W_GREEN, WORLD_PARTS[id]!, "real", WM(id))),
  m("incinerador-maleza", "maquina", "huerto", "Incinerador de plantas no nativas (con filtro)", 1.2, 2.4, 1.2, 0x4a4f57, "caja", "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Tree.cs Incinerador_maleza (docs/deshierbe-cuidadoso.md)"),
];
