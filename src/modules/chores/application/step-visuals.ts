import type { Recipe } from "@modules/kitchen/data/recipes";
import type { Process } from "@modules/kitchen/data/processes";
import { kitchenVisuals } from "@modules/kitchen/domain/kitchen-visuals";
import type { Chore, ChoreKind } from "../domain/chore";
import { classifyStep, exerciseTexts, firstSource, type StepAction, type StepVisual, type StepVisualSource } from "../domain/step-visual";

/**
 * How each kind of chore acts its solved steps out (docs/design/vida-a-bordo.md, «Pasos visibles»).
 * The verb of a step's text picks the action; `remap` turns a generic verb into the area's own
 * («servir» a cat's meal, not «emplatar»); a step with no verb (a number, a line of code) shows the
 * area's `fallback`; `only` forces one action for every step (yoga postures, animal programs).
 */
interface Area {
  readonly fallback: StepAction;
  readonly tint?: string;
  readonly only?: StepAction;
  readonly remap?: Partial<Record<StepAction, StepAction>>;
}

const FEED: Area = { fallback: "servir", tint: "comida", remap: { tomar: "servir", emplatar: "servir", verter: "servir", reparar: "verter", programar: "servir" } };
const LAB: Area = { fallback: "programar", tint: "medio", remap: { mimar: "programar", jugar: "programar", curar: "programar", calentar: "hornear" } };
const STATION: Area = { fallback: "programar" };
const FIX: Area = { fallback: "reparar", tint: "chispas", remap: { cortar: "reparar", tomar: "reparar", verter: "reparar", programar: "reparar", mimar: "reparar", curar: "reparar", jugar: "reparar" } };

export const STEP_AREAS: Readonly<Record<ChoreKind, Area>> = {
  regar: { fallback: "regar", tint: "agua", remap: { verter: "regar" } },
  agitar: { fallback: "agitar", tint: "polen", remap: { tomar: "agitar" } },
  cosechar: { fallback: "cosechar", tint: "hojas", remap: { emplatar: "cosechar", tomar: "cosechar" } },
  "curar-planta": { fallback: "revisar", tint: "hojas", remap: { verter: "regar", curar: "revisar" } },
  "alimentar-gato": FEED,
  "alimentar-perro": FEED,
  "alimentar-gallinas": { ...FEED, tint: "grano" },
  "calmar-gato": { fallback: "mimar", tint: "calma", remap: { reposar: "mimar", programar: "mimar" } },
  "jugar-perro": { fallback: "jugar", tint: "pelota", remap: { mimar: "jugar", verter: "servir", curar: "jugar" } },
  "programar-animal": { fallback: "programar", only: "programar" },
  "abrir-gallinero": { fallback: "programar", only: "programar" },
  "recoger-huevos": { fallback: "cosechar", tint: "huevo", remap: { tomar: "cosechar", emplatar: "cosechar" } },
  cocinar: { fallback: "gesto" },
  procesar: { fallback: "moler" },
  yoga: { fallback: "postura", only: "postura" },
  ejercicio: { fallback: "entrenar", only: "entrenar" },
  "reparar-nave": FIX,
  "reparar-maquina": FIX,
  "cambiar-pieza": FIX,
  "atender-paciente": { fallback: "curar", tint: "botiquin", remap: { tomar: "curar", cortar: "curar", verter: "curar", programar: "revisar", emplatar: "curar", amasar: "curar" } },
  "cultivo-sembrar": LAB,
  "cultivo-renovar": LAB,
  "cultivo-diferenciar": LAB,
  "cultivo-cosechar": LAB,
  "cultivo-esterilizar": LAB,
  "ajustar-biorreactor": STATION,
  "nano-convertir": STATION,
  "nano-programar": STATION,
  "nano-reparar": { fallback: "reparar" },
  "salir-eva": { fallback: "revisar" },
  fabricar: { fallback: "reparar" },
  refinar: STATION,
  repostar: { fallback: "reparar" },
  "programar-viaje": STATION,
  importar: STATION,
};

/** At most this many visuals for one solved exercise (an ordered list of steps acts out its first ones). */
const MAX_PER_STEP = 4;

/** Any chore: the verbs of its solved exercise's texts, through its area's table. */
export const areaVisuals: StepVisualSource<Chore> = {
  visuals(chore, index) {
    const ex = chore.exercises[index];
    if (!ex) return undefined;
    const area = STEP_AREAS[chore.kind];
    const out = exerciseTexts(ex)
      .slice(0, MAX_PER_STEP)
      .map((text): StepVisual => {
        const verb = classifyStep(text);
        const action = area.only ?? (verb ? (area.remap?.[verb] ?? verb) : area.fallback);
        return { action, place: "objetivo", ...(area.tint ? { tint: area.tint } : {}) };
      });
    return out.length ? out : [{ action: area.fallback, place: "objetivo" }];
  },
};

/** Recipes and processes: each step with its galley spot, vessel, food and heat (kitchen-visuals.ts). */
export function kitchenSource(ctx: { readonly recipes: readonly Recipe[]; readonly processes?: readonly Process[] }): StepVisualSource<Chore> {
  const cache = new Map<string, readonly StepVisual[]>();
  const all = (c: Chore): readonly StepVisual[] | undefined => {
    const hit = cache.get(c.id);
    if (hit) return hit;
    let v: StepVisual[] | undefined;
    if (c.kind === "cocinar") {
      const r = ctx.recipes.find((x) => x.id === c.targetId);
      if (r) v = kitchenVisuals(r.steps.value, { ingredients: Object.keys(r.ingredients) });
    } else if (c.kind === "procesar") {
      const p = ctx.processes?.find((x) => x.id === c.targetId);
      if (p) v = kitchenVisuals(p.steps.value, { ingredients: Object.keys(p.inputs), machine: p.machine });
    }
    if (v) cache.set(c.id, v);
    return v;
  };
  return {
    visuals(c, i) {
      const v = all(c)?.[i];
      return v ? [v] : undefined;
    },
  };
}

/** Every chore on board: the kitchen's detailed visuals first, then the area tables. */
export const choreVisuals = (ctx: { readonly recipes: readonly Recipe[]; readonly processes?: readonly Process[] }): StepVisualSource<Chore> => firstSource(kitchenSource(ctx), areaVisuals);
