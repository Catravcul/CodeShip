import { S1_SOURCES as S } from "./sources";

/**
 * The furnishing of each floor that is already ported, in the floor's own frame: metres from its centre, x across,
 * z deep, −z is the front (away from the trunk); `rot` turns the model about y (radians, 0 = facing −z). Each list
 * copies its Cold Sanctuary builder position by position, so a change there is a change of numbers here.
 */
export interface Placed {
  readonly model: string;
  readonly x: number;
  readonly z: number;
  readonly rot?: number;
  readonly name?: string;
}

export interface FloorPlan {
  readonly id: string;
  /** The floor's true plan (the area inside the tower's square floor). */
  readonly size: { readonly x: number; readonly z: number };
  readonly items: readonly Placed[];
  readonly source: string;
}

/** Gym, floor 0 (FurnishGym): 30 plate machines in 5 rows of 6, the central aisle (x 2…4,2) and the free weights. */
function gymFloor0(): FloorPlan {
  const types = ["gym-press-pecho", "gym-press-hombros", "gym-jalon", "gym-remo", "gym-prensa", "gym-extension", "gym-curl-femoral", "gym-hip-thrust", "gym-gemelos", "gym-curl-biceps"];
  const rowZ = [11.3, 7.9, 4.05, -0.1, -3.8];
  const rowTypes = [[0, 1], [2, 3], [4, 8], [5, 6], [7, 9]] as const;
  const rowX = [
    [-16.5, -13.5, -10.5, -7.5, -4.5, -1.5],
    [-16.4, -13.2, -10.0, -6.9, -3.9, -0.9],
    [-16.1, -12.3, -8.5, -5.0, -1.8, 1.4],
    [-16.35, -13.05, -9.75, -6.5, -3.3, -0.1],
    [-16.25, -12.75, -9.25, -6.0, -3.0, 0],
  ];
  const items: Placed[] = [];
  for (let row = 0; row < 5; row++)
    for (let j = 0; j < 6; j++) {
      const t = rowTypes[row]![Math.floor(j / 3)]!;
      items.push({ model: types[t]!, x: rowX[row]![j]!, z: rowZ[row]!, name: `${j % 3 + 1}` });
    }
  items.push({ model: "gym-estante-mancuernas", x: 6, z: 11.6 }, { model: "gym-estante-mancuernas", x: 12.5, z: 11.6 });
  for (const x of [4.5, 7.6, 10.7, 13.8]) items.push({ model: "gym-banco-fid", x, z: 7.5 });
  for (const x of [5.3, 9.5, 13.7]) items.push({ model: "gym-jaula", x, z: 2.5 });
  items.push({ model: "gym-press-banca", x: 5.3, z: -2.5, rot: Math.PI }, { model: "gym-press-banca", x: 9.5, z: -2.5, rot: Math.PI });
  items.push({ model: "gym-press-inclinado", x: 13.7, z: -2.5 });
  items.push({ model: "gym-smith", x: 6, z: -8 }, { model: "gym-plataforma", x: 12.5, z: -8 });
  items.push({ model: "gym-arbol-discos", x: 17.1, z: 2.5 }, { model: "gym-arbol-discos", x: 17.1, z: -2.5 }, { model: "gym-soporte-barras", x: 17.1, z: -8 });
  items.push({ model: "gym-fuente", x: -15.4, z: -10.5 }, { model: "gym-toallas", x: 0, z: -10.5 });
  items.push({ model: "alfombras-zona", x: -8, z: -9.8 });
  return { id: "gimnasio-0", size: { x: 36, z: 26 }, items, source: S.csGym };
}

export const FLOOR_PLANS: ReadonlyMap<string, FloorPlan> = new Map([gymFloor0()].map((f) => [f.id, f]));
