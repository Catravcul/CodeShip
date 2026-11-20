import { RESIDENCIA_FLOORS } from "./floors/residencia";
import { CAMPOS_FLOORS } from "./floors/campos";
import { gymFloor0 } from "./floors/gimnasio";
import { ENTRENAMIENTO_FLOORS } from "./floors/entrenamiento";
import { MUSICA_AULAS_FLOORS } from "./floors/musica-aulas";
import { SERVICIOS_FLOORS } from "./floors/servicios";
import { CIENCIAS_FLOORS } from "./floors/ciencias";
import { PRODUCCION_FLOORS } from "./floors/produccion";
import type { FloorPlan } from "./floors/kit";

export type { FloorPlan, Placed } from "./floors/kit";

/** Every furnished floor by id (`furnish` in site.ts), one file per building in `floors/`. */
export const FLOOR_PLANS: ReadonlyMap<string, FloorPlan> = new Map([gymFloor0(), ...ENTRENAMIENTO_FLOORS, ...MUSICA_AULAS_FLOORS, ...SERVICIOS_FLOORS, ...CIENCIAS_FLOORS, ...PRODUCCION_FLOORS, ...RESIDENCIA_FLOORS, ...CAMPOS_FLOORS].map((f) => [f.id, f]));
