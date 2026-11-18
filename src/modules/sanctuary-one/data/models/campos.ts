import { C, m, pz, type ModelDef, type Shape } from "./kit";

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
  m("incinerador-maleza", "maquina", "huerto", "Incinerador de plantas no nativas (con filtro)", 1.2, 2.4, 1.2, 0x4a4f57, "caja", "real", "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Tree.cs Incinerador_maleza (docs/deshierbe-cuidadoso.md)"),
];
