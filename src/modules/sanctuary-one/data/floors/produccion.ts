import { cs } from "../sources";
import { LED_RACK } from "../models/produccion";
import { carpetKeepOut, packFloor, type FloorPlan, type Placed } from "./kit";

/**
 * The Producción floors (plan 26 × 20 m): construction (Construction.cs FurnishConstruction), mechanics (only its
 * toilets in Cold Sanctuary), the textile studio (Restaurant.cs FurnishTextile), two vertical-farm floors
 * (VerticalFarm.cs, packed by PackFloor) and the submarine garage (SubmarineBay).
 */
const SIZE = { x: 26, z: 20 } as const;
const PI = Math.PI;
const deg = (d: number) => (d * PI) / 180;
const P = (model: string, x: number, z: number, rot?: number, name?: string): Placed => ({ model, x, z, ...(rot ? { rot } : {}), ...(name ? { name } : {}) });
const floor = P("prod-suelo", 0, 0);

function construction(): FloorPlan {
  const items = [floor, P("cons-miniexcavadora", -11.93, -7.6, deg(20)), P("cons-minicargadora", -8.06, -7.8), P("cons-hormigonera", -4.75, -8), P("cons-grua", 10.6, -8.5)];
  items.push(P("cons-ladrillos", -10.6, 2.85), P("cons-cemento", -10.6, 4.15), P("cons-madera", -12.15, 4.6), P("cons-vigas", -12.15, 1.2), P("cons-tuberias", -10.6, 0.8));
  items.push(P("cons-cable", 11.6, 2.6), P("cons-repuestos", 11.8, 0.2, deg(-90)), P("cons-tejas", 11.6, -1.8));
  items.push(P("cons-panel", -1.5, 1.48, PI), P("cons-andamio", 3.05, 0.94), P("cons-carretilla", 5.4, -0.2, PI / 2), P("cons-carretilla", 5.4, 0.9, PI / 2));
  for (let i = 0; i < 5; i++) items.push(P("cons-cono", -12.4 + i * 0.9, 9.2));
  items.push(P("aseos-1", 10.9, 9.1, PI));
  return { id: "construccion", size: SIZE, items, source: cs("Construction", "FurnishConstruction") };
}

const mechanics = (): FloorPlan => ({ id: "mecanica", size: SIZE, items: [floor, P("aseos-1", -10.9, 9.1, PI)], source: cs("Construction", "Mecánica: solo sus aseos") });

function textile(): FloorPlan {
  const items = [floor, P("tex-telar-pie", -11.4, -8.6), P("tex-telar-cintura", 12, -8.8), P("tex-rueca", -11.8, 2.4), P("tex-ovillos", -2, -9.65)];
  for (let i = 0; i < 4; i++) items.push(P("tex-tina", 12.3, 0.4 + i * 0.8));
  items.push(P("tex-mesa-corte", 0, 2.4), P("tex-coser", -6, 8.8));
  for (let k = 0; k < 3; k++) items.push(P("tex-maniqui", 2.8 + k * 1.1, 9));
  items.push(P("tex-tendedero", -1, 9.7), P("aseos-1", 3.5, -9.1));
  return { id: "textil", size: SIZE, items, source: cs("Restaurant", "FurnishTextile") };
}

/** A vertical-farm floor: 12 LED racks, and on the first (aisles of 1,6 m so that everything fits) the nursery, dosing, washing, cold room, bench, compost and rest. */
function verticalFarm(n: number): FloorPlan {
  const blocks: [string, number, number][] = Array.from({ length: 12 }, () => ["vf-rack", LED_RACK.w, LED_RACK.d]);
  if (n === 1) blocks.push(["vf-vivero", 2.4, 1.2], ["vf-dosificador", 2.4, 1.2], ["vf-lavado", 2.4, 1.0], ["vf-camara", 3.2, 3.2], ["vf-banco", 3.0, 1.9], ["vf-compostador", 1.2, 1.0], ["vf-descanso", 1.8, 0.8]);
  const items = [floor, ...packFloor(SIZE, blocks, carpetKeepOut(SIZE), n === 1 ? 1.6 : 2.1), P("aseos-1", -SIZE.x / 2 + 2.1, SIZE.z / 2 - 0.9, PI)];
  return { id: `huerto-vertical-${n}`, size: SIZE, items, source: cs("VerticalFarm", `FurnishVerticalFarm (piso ${n}, PackFloor)`) };
}

function submarineBay(): FloorPlan {
  const items = [floor, P("sub-bahia", 0, 1), P("sub-obra", 0, 1), P("sub-taller", 8.5, 7.5, PI)];
  return { id: "garaje-submarino", size: SIZE, items, source: cs("Submarine", "SubmarineBay") };
}

export const PRODUCCION_FLOORS: readonly FloorPlan[] = [construction(), mechanics(), textile(), verticalFarm(1), verticalFarm(2), submarineBay()];
