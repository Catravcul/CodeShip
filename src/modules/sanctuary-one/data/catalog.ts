import { PAISAJE_MODELS } from "./models/paisaje";
import { EDIFICIO_MODELS } from "./models/edificios";
import { RESIDENCIA_MODELS } from "./models/residencia";
import { CAMPOS_MODELS } from "./models/campos";
import { BASE_MODELS } from "./models/base";
import { ENTRENAMIENTO_MODELS } from "./models/entrenamiento";
import { MUSICA_AULAS_MODELS } from "./models/musica-aulas";
import { SERVICIOS_MODELS } from "./models/servicios";
import { CIENCIAS_MODELS } from "./models/ciencias";
import { PRODUCCION_MODELS } from "./models/produccion";
import { HOSPITAL_EXTRA_MODELS } from "./models/hospital-equipo";
import { MECANICA_MODELS } from "./models/mecanica";
import { CONSTRUCCION_EXTRA_MODELS } from "./models/construccion-extra";
import type { ModelDef } from "./models/kit";
import { detailed } from "./models/detalle";

export * from "./models/kit";

/**
 * THE MODEL CATALOGUE of sanctuary 1 (docs/design/santuario1.md §Catálogo), one list per building in `models/`. Every
 * model the scene draws is one entry, and every placed thing an instance naming it: changing an entry changes every
 * copy, and `overrides.ts` changes a whole category, group, floor or building at once.
 */
export const MODELS: readonly ModelDef[] = detailed([...BASE_MODELS, ...ENTRENAMIENTO_MODELS, ...MUSICA_AULAS_MODELS, ...SERVICIOS_MODELS, ...HOSPITAL_EXTRA_MODELS, ...CIENCIAS_MODELS, ...PRODUCCION_MODELS, ...MECANICA_MODELS, ...CONSTRUCCION_EXTRA_MODELS, ...RESIDENCIA_MODELS, ...CAMPOS_MODELS, ...PAISAJE_MODELS, ...EDIFICIO_MODELS]);

const BY_ID = new Map(MODELS.map((d) => [d.id, d]));

export function model(id: string): ModelDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Modelo desconocido: ${id}`);
  return d;
}
