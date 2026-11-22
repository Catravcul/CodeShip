import { WORLD_GARDEN } from "../models/campos";
import type { FloorPlan, Placed } from "./kit";

/**
 * The floors of the Árbol de los Campos (SampleSceneBuilder.Tree.cs TrunkFloor + GardenPlot.Generate): a 22 × 18 m
 * plot at (1, 4) of the 32 m floor, its rows or forest layers placed as GardenPlot places them (its jitter by a fixed
 * seed), and the windbreak on the north edge; the Huerto (floor 5), its 18 × 6 m vegetable plot and the incinerator.
 */
const SIZE = { x: 32, z: 32 } as const;
const SRC = "Cold Sanctuary, Assets/Scripts/Farming/GardenPlot.cs";

/** A seeded random in [a, b) (System.Random's place: any fixed sequence keeps the floor the same each time). */
function rng(seed: number): (a: number, b: number) => number {
  let s = seed >>> 0;
  return (a, b) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return a + ((s >>> 8) / 0x1000000) * (b - a);
  };
}

type Put = (model: string, species: string, x: number, z: number) => void;

function plot(cx: number, cz: number, w: number, d: number, fill: (put: Put, hx: number, hz: number, R: (a: number, b: number) => number) => void, seed: number, hedge = true, turn = false): Placed[] {
  const R = rng(seed);
  const out: Placed[] = [{ model: "campo-suelo", x: cx, z: cz, ...(turn ? { rot: Math.PI / 2 } : {}) }];
  const put: Put = (model, name, x, z) => out.push(turn ? { model, x: cx + z, z: cz - x, name } : { model, x: cx + x, z: cz + z, name });
  fill(put, w / 2, d / 2, R);
  if (hedge) for (let x = -w / 2; x <= w / 2; x += 1.1) put("seto-cortavientos", "Seto cortavientos", x, d / 2 + 0.9);
  return out;
}

/** Bosque comestible (GardenPlot default): canopy every 7,5 m with its climber, small tree, banana, shiitake log and herbs. */
function forest(offset: number): Parameters<typeof plot>[4] {
  const canopy = ["Mango", "Coco", "Guanábana", "Dátil", "Almendro", "Olivo", "Aguacate", "Clavo"];
  const small = ["Limón", "Naranja", "Cacao", "Lima", "Canela", "Laurel", "Café", "Babaco"];
  return (put, hx, hz, R) => {
    let c = offset, s = offset;
    for (let x = -hx + 4; x <= hx - 3; x += 7.5)
      for (let z = -hz + 4; z <= hz - 3; z += 7.5) {
        put("planta-dosel", canopy[c++ % 8]!, x, z);
        put("planta-trepadora", "Pimienta", x + 1, z + 0.6);
        put("planta-arbolito", small[s++ % 8]!, x + 3.7, z + 3.2);
        put("planta-banano", "Banano", x - 2.5, z + 2.8);
        put("planta-hongos", "Shiitake", x + 1.6, z - 1.4);
        for (let k = 0; k < 5; k++) put("planta-hierba", ["Piña", "Jengibre", "Cúrcuma"][k % 3]!, x + R(-3, 3), z + R(-3, 3));
      }
    for (let x = -hx + 0.8; x <= hx - 0.8; x += 2.2) put("planta-rastrera", "Sandía", x, -hz + 0.3);
    for (let x = -hx + 1; x <= hx - 1; x += 2.2) put("planta-arbusto", ["Caña", "Naranjilla", "Mortiño"][((Math.trunc(x) % 3) + 3) % 3]!, x, hz - 0.8);
  };
}

const bamboo: Parameters<typeof plot>[4] = (put, hx, hz, R) => {
  for (let x = -hx + 2; x <= hx - 2; x += 2.8) for (let z = -hz + 2; z <= hz - 3; z += 2.8) put("planta-bambu", "Guadua", x + R(-0.4, 0.4), z + R(-0.4, 0.4));
  for (let x = -hx + 0.8; x <= hx - 0.8; x += 1.1) put("planta-canamo", "Cáñamo", x, hz - 1);
};

/** Huerto de hortalizas asociadas (GardenPlot Hortalizas): rows 1,8 m apart, each alternating companions; flax border. */
const vegetables: Parameters<typeof plot>[4] = (put, hx, hz, R) => {
  const rows = [["Tomate", "Albahaca", "Pepino"], ["Zanahoria", "Cebolla", "Perejil"], ["Col", "Cilantro", "Frutilla"], ["Espinaca", "Ajo", "Romero"], ["Pimiento", "Chile", "Comino"], ["Berenjena", "Albahaca", "Papa"], ["Cebollín", "Zanahoria"]];
  const tall = new Set(["Tomate", "Pepino", "Berenjena", "Pimiento", "Col"]);
  const spacing = (k: string) => (k === "Tomate" || k === "Berenjena" || k === "Col" ? 1.4 : 1);
  let r = 0;
  for (let z = -hz + 1.2; z <= hz - 1.2; z += 1.8, r++) {
    const row = rows[r % rows.length]!;
    let i = 0;
    for (let x = -hx + 1.2; x <= hx - 1.2; x += 0.7 * spacing(row[0]!), i++) {
      const k = row[i % row.length]!;
      put(tall.has(k) ? "cultivo-alto" : "cultivo-bajo", k, x, z + R(-0.1, 0.1));
    }
  }
  for (let x = -hx + 0.8; x <= hx - 0.8; x += 1.2) put("cultivo-flor", "Lino", x, -hz + 0.3);
};

const field = (id: string, title: string, fill: Parameters<typeof plot>[4], seed: number, hedge: boolean): FloorPlan => ({
  id,
  size: SIZE,
  items: plot(1, 3, 26, 24, fill, seed, hedge),
  source: `${SRC} ${title}`,
});

function huerto(): FloorPlan {
  const items = plot(3, -6.5, 18, 6, vegetables, 55, true);
  items.push({ model: "incinerador-maleza", x: -7, z: -6.5, name: "Incinerador: plantas no nativas con su tierra" });
  // The six methods of the world, in the free half of the floor (FurnishWorldGarden).
  for (const [model, x, z] of WORLD_GARDEN) items.push({ model, x, z });
  return { id: "campos-huerto", size: SIZE, items, source: `${SRC} Hortalizas; SampleSceneBuilder.Tree.cs TrunkFloor (piso 5)` };
}

export const CAMPOS_FLOORS: readonly FloorPlan[] = [
  field("campos-bosque-1", "BosqueComestible (piso 1)", forest(0), 11, false),
  field("campos-bambusal", "Bambusal (piso 2)", bamboo, 22, true),
  huerto(),
  field("campos-bosque-2", "BosqueComestible (piso 6, speciesOffset 5)", forest(5), 66, false),
];
