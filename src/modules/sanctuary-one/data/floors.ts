import { RESIDENCIA_FLOORS } from "./floors/residencia";
import { CAMPOS_FLOORS } from "./floors/campos";
import { gymFloor0 } from "./floors/gimnasio";
import { ENTRENAMIENTO_FLOORS } from "./floors/entrenamiento";
import { MUSICA_AULAS_FLOORS } from "./floors/musica-aulas";
import { SERVICIOS_FLOORS } from "./floors/servicios";
import { CIENCIAS_FLOORS } from "./floors/ciencias";
import { PRODUCCION_FLOORS } from "./floors/produccion";
import { REDUCIDOS_FLOORS } from "./floors/reducidos";
import { FLOOR_SIZE, evened, filledHoles, spreadTo, type FloorPlan, type Placed } from "./floors/kit";
import { model } from "./catalog";
import { CIMA_RESIDENCIA } from "./floors/residencia-cima";

export type { FloorPlan, Placed } from "./floors/kit";

/** A placed thing's footprint half-widths, turned with it. */
export function half(it: Placed): { hx: number; hz: number } {
  const d = model(it.model);
  const c = Math.abs(Math.cos(it.rot ?? 0)), s = Math.abs(Math.sin(it.rot ?? 0));
  return { hx: (c * d.size.x + s * d.size.z) / 2, hz: (s * d.size.x + c * d.size.z) / 2 };
}

/**
 * Every furnished floor by id (`furnish` in site.ts), one file per building in `floors/` (the fused ones of the reduced
 * buildings in `floors/reducidos.ts`), each spread over the kitchen's square (kit.ts FLOOR_SIZE, Berón 2026-11-22) and
 * evened out to its edges (kit.ts `evened`: the distribution rule).
 */
export const FLOOR_PLANS: ReadonlyMap<string, FloorPlan> = new Map<string, FloorPlan>([
  ...[gymFloor0(), ...ENTRENAMIENTO_FLOORS, ...MUSICA_AULAS_FLOORS, ...SERVICIOS_FLOORS, ...CIENCIAS_FLOORS, ...PRODUCCION_FLOORS, ...RESIDENCIA_FLOORS, ...CAMPOS_FLOORS, ...REDUCIDOS_FLOORS].map((f) => [f.id, filledHoles(evened(spreadTo(f, FLOOR_SIZE), half), half)] as const),
  // The crown's giant floor, as drawn (its own square, not the kitchen's).
  [CIMA_RESIDENCIA.id, CIMA_RESIDENCIA],
]);
