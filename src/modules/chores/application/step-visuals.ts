import type { Recipe } from "@modules/kitchen/data/recipes";
import type { Process } from "@modules/kitchen/data/processes";
import { kitchenVisuals } from "@modules/kitchen/domain/kitchen-visuals";
import { spaceGalleyVisuals } from "@modules/kitchen/domain/space-galley-visuals";
import { procedureById } from "@modules/wellness/data/procedures";
import { SLEEP_ACTS } from "@modules/wellness/data/sleep";
import type { Chore, ChoreKind } from "../domain/chore";
import { classifyStep, exerciseTexts, firstSource, type StepAction, type StepAct, type StepActSource } from "../domain/step-visual";

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
  // Cutting damaged leaves is pruning: the scissors at the plant, the leaf into the basket.
  "curar-planta": { fallback: "revisar", tint: "hojas", remap: { verter: "regar", curar: "revisar", cortar: "cosechar" } },
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
  "programar-aterrizaje": STATION,
  importar: STATION,
  // The ring aquarium: flakes are served, the glass washed, water poured; befriending and help are mind programs.
  "cuidar-acuario": { fallback: "revisar", tint: "agua", remap: { verter: "servir", emplatar: "servir", cortar: "lavar", tomar: "revisar" } },
  "amistad-acuario": { fallback: "programar", only: "programar" },
  "ayuda-acuario": { fallback: "programar", only: "programar" },
  "soporte-vital": FIX,
  // A colony of the species catalogue: both are mind programs.
  "amistad-especie": { fallback: "programar", only: "programar" },
  "ayuda-especie": { fallback: "programar", only: "programar" },
  // Going to sleep: its own acts in the crew quarter (sleepSource).
  dormir: { fallback: "saco" },
  // The crew's procedures: their own acts (procedureSource).
  asearse: { fallback: "lavar", tint: "agua" },
  refugio: { fallback: "revisar" },
  medico: { fallback: "curar" },
  // The arm's moves play outside (station-outside.ts); at the RWS her hands are on the hand controllers.
  "brazo-robotico": { fallback: "programar", only: "programar" },
  "paseo-espacial": { fallback: "revisar" },
};

/** Going to sleep in a crew quarter: fan, alarm, into the bag, zip, light, asleep (modules/wellness/data/sleep.ts). */
export const sleepSource: StepActSource<Chore> = {
  acts(c, i) {
    return c.kind === "dormir" ? SLEEP_ACTS[i] : undefined;
  },
};

/** The crew's procedures (washing, the storm shelter, the medical kit): each step's own acts (wellness/data/procedures.ts). */
export const procedureSource: StepActSource<Chore> = {
  acts(c, i) {
    return c.kind === "asearse" || c.kind === "refugio" || c.kind === "medico" ? procedureById(c.targetId ?? "")?.acts[i] : undefined;
  },
};

/** Any chore: the verbs of its solved exercise's texts, through its area's table. */
export const areaVisuals: StepActSource<Chore> = {
  acts(chore, index) {
    const ex = chore.exercises[index];
    if (!ex) return undefined;
    const area = STEP_AREAS[chore.kind];
    // One visual per block: «paso a paso» plays each as it is placed; a whole order sent at once queues
    // them and the player (StepShow) keeps the last few, sped up.
    const out = exerciseTexts(ex).map((text): StepAct => {
        const verb = classifyStep(text);
        const action = area.only ?? (verb ? (area.remap?.[verb] ?? verb) : area.fallback);
        return { action, place: "objetivo", ...(area.tint ? { tint: area.tint } : {}) };
      });
    return out.length ? out : [{ action: area.fallback, place: "objetivo" }];
  },
};

/**
 * The dishes and processes a galley knows. `spaceFood`: real-ship meals (ISS-type packages, data/iss-food.ts),
 * acted out with the package at the galley (space-galley-visuals.ts) instead of pans and a hob.
 */
export interface KitchenCtx {
  readonly recipes: readonly Recipe[];
  readonly processes?: readonly Process[];
  readonly spaceFood?: readonly Recipe[];
}

/** Recipes and processes: each step with its galley spot, vessel, food and heat (kitchen-visuals.ts). */
export function kitchenSource(ctx: KitchenCtx): StepActSource<Chore> {
  const cache = new Map<string, readonly StepAct[]>();
  const all = (c: Chore): readonly StepAct[] | undefined => {
    const hit = cache.get(c.id);
    if (hit) return hit;
    let v: StepAct[] | undefined;
    const space = c.kind === "cocinar" ? ctx.spaceFood?.find((x) => x.id === c.targetId) : undefined;
    if (space) v = spaceGalleyVisuals(space.steps.value, Object.keys(space.ingredients));
    else if (c.kind === "cocinar") {
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
    acts(c, i) {
      const v = all(c)?.[i];
      return v ? [v] : undefined;
    },
  };
}

/** Every chore on board: the kitchen's detailed visuals first, then the area tables. */
export const choreVisuals = (ctx: KitchenCtx): StepActSource<Chore> => firstSource(sleepSource, procedureSource, kitchenSource(ctx), areaVisuals);
