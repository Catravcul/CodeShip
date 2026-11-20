import { cs } from "../sources";
import { ANALISIS, CULTIVO, INFORMATICA, MOLECULAR, SINTESIS, type Block } from "../models/ciencias";
import { carpetKeepOut, packFloor, type FloorPlan, type Placed } from "./kit";

/**
 * The Ciencias floors (Research.cs FurnishSynthesis/Analysis/Culture/Molecular, Informatica.cs FurnishCluster): each a
 * list of blocks with their counts, packed by Cold Sanctuary's PackFloor round the carpet keep-outs. Plan 32 × 20 m.
 * Since 2026-11-20 the chemistry and molecular floors carry more stations than Cold Sanctuary's minimum (a teaching or
 * research lab of ~600 m² has 6–8 fume hoods or instrument benches), so none is left half empty (the floors' audit).
 */
const SIZE = { x: 32, z: 20 } as const;
const toilets: Placed = { model: "aseos-1", x: -SIZE.x / 2 + 2.1, z: SIZE.z / 2 - 0.9, rot: Math.PI };

/** The blocks of a list, each repeated as many times as Cold Sanctuary lays it. */
function expand(list: readonly Block[], counts: Readonly<Record<string, number>>): [string, number, number][] {
  return list.flatMap(([id, , w, d]) => Array.from({ length: counts[id] ?? 1 }, () => [id, w, d] as [string, number, number]));
}

function lab(id: string, floor: string, list: readonly Block[], counts: Readonly<Record<string, number>>, what: string, carpetX = 0): FloorPlan {
  const items: Placed[] = [{ model: floor, x: 0, z: 0 }, ...packFloor(SIZE, expand(list, counts), carpetKeepOut(SIZE, carpetX)), toilets];
  return { id, size: SIZE, items, source: cs(id === "informatica" ? "Informatica" : "Research", what) };
}

export const CIENCIAS_FLOORS: readonly FloorPlan[] = [
  lab("quimica-sintesis", "lab-suelo", SINTESIS, { "q-campana": 6, "q-rotavapor": 4, "q-ducha": 2, "q-cuaderno": 4 }, "FurnishSynthesis (PackFloor)"),
  lab("quimica-analisis", "lab-suelo", ANALISIS, { "q-hplc": 6, "q-puesto-analisis": 4 }, "FurnishAnalysis (PackFloor)", -SIZE.x * 0.3),
  lab("biologia-cultivo", "lab-suelo", CULTIVO, { "b-cabina": 4, "b-incubador": 4, "b-microscopio": 2, "b-fluorescencia": 2, "b-centrifuga": 4, "b-biorreactor-mesa": 2, "b-congelador": 2 }, "FurnishCulture (PackFloor)"),
  lab("biologia-molecular", "lab-suelo", MOLECULAR, { "b-prepcr": 4, "b-extraccion": 4, "b-termociclador": 4, "b-nevera": 2, "b-puesto-datos": 6 }, "FurnishMolecular (PackFloor)", -SIZE.x * 0.3),
  lab("informatica", "cpd-suelo", INFORMATICA, { "i-intercambiador": 2, "i-sai": 2, "i-baterias": 3, "i-monitor": 4, "i-banco": 2 }, "FurnishCluster (PackFloor)"),
];
