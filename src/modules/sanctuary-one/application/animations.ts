import type { StepAct } from "@modules/chores/domain/step-visual";
import { SIM_RETOS } from "../data/simulacion";
import { choreVisuals } from "@modules/chores/application/step-visuals";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { PROCESSES } from "@modules/kitchen/data/processes";
import { MODELS } from "../data/catalog";
import { CATEGORY_LABEL, GESTURES, MACHINE_MOTION, MOTIONS, PROCEDURE_STEPS, type AnimationCategory, type GestureId, type MotionId } from "../data/animaciones";
import { retosFor, type Reto } from "./challenges";

/** The ships' step player's acts (cooking, care, lab, workshop…): what a step plays when it is not an exercise. */
const STEP_VISUALS = choreVisuals({ recipes: RECIPES, processes: PROCESSES });

const GESTURE_ACT: Readonly<Record<GestureId, StepAct>> = {
  ajustar: { action: "reparar", place: "objetivo" },
  limpiar: { action: "lavar", place: "objetivo" },
  tomar: { action: "tomar", place: "objetivo" },
  mirar: { action: "revisar", place: "objetivo" },
  cortar: { action: "cortar", place: "objetivo" },
  emplatar: { action: "emplatar", place: "objetivo" },
  servir: { action: "servir", place: "objetivo" },
};

/** The animation of step `i` of a reto done at model `modelId`: its id (motion, gesture or the step player's action) and its acts. */
export function stepAnimation(r: Reto, modelId: string | undefined, i: number): { id: string; acts: readonly StepAct[] } {
  const plan = r.procedure ? PROCEDURE_STEPS[r.procedure] : r.chore.kind === "ejercicio" ? r.chore.exercises.map(() => "maquina" as const) : undefined;
  let a = plan?.[i];
  if (a === "maquina") a = modelId ? MACHINE_MOTION[modelId] : undefined;
  if (a && a in MOTIONS) return { id: a, acts: [{ action: "entrenar", place: "objetivo", vessel: `mov:${a}` }] };
  if (a && a in GESTURES) return { id: a, acts: [GESTURE_ACT[a as GestureId]] };
  const acts = STEP_VISUALS.acts(r.chore, i) ?? [];
  return { id: acts[0]?.action ?? "ninguna", acts };
}

export interface AnimationRow {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  /** Each reto that plays it, the steps (1-based) and where (model ids). */
  readonly launchedBy: readonly { readonly reto: string; readonly steps: readonly number[]; readonly models: readonly string[] }[];
}

/** The full table: every animation, its category and the retos (and steps) that launch it, over the whole catalogue. */
export function animationTable(): AnimationRow[] {
  const rows = new Map<string, { label: string; category: string; by: Map<string, { steps: Set<number>; models: Set<string> }> }>();
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) {
      const known = (MOTIONS as Record<string, { label: string; category: AnimationCategory }>)[id] ?? (GESTURES as Record<string, { label: string; category: AnimationCategory }>)[id];
      r = { label: known?.label ?? id, category: CATEGORY_LABEL[known?.category ?? (id === "postura" ? "yoga" : "oficio")], by: new Map() };
      rows.set(id, r);
    }
    return r;
  };
  for (const id of Object.keys(MOTIONS)) row(id);
  for (const m of MODELS)
    for (const r of retosFor(m, 0))
      r.chore.exercises.forEach((_, i) => {
        const { id } = stepAnimation(r, m.id, i);
        const by = row(id).by;
        const k = r.chore.title;
        const e = by.get(k) ?? { steps: new Set<number>(), models: new Set<string>() };
        e.steps.add(i + 1);
        e.models.add(m.id);
        by.set(k, e);
      });
  // The simulation machine's area challenges: her steps, and the parts the others take all along (data/simulacion.ts).
  const add = (id: string, reto: string, step: number, modelId: string) => {
    const by = row(id).by;
    const e = by.get(reto) ?? { steps: new Set<number>(), models: new Set<string>() };
    e.steps.add(step);
    e.models.add(modelId);
    by.set(reto, e);
  };
  for (const list of Object.values(SIM_RETOS))
    for (const sr of list) {
      (PROCEDURE_STEPS[sr.procedure.id] ?? []).forEach((id, i) => add(id === "maquina" ? "ajustar" : id, sr.procedure.title, i + 1, sr.player));
      for (const role of sr.roles) sr.procedure.steps.forEach((_, i) => add(role.motion, `${sr.procedure.title} (${role.label})`, i + 1, role.model ?? sr.player));
    }
  return [...rows].map(([id, r]) => ({ id, label: r.label, category: r.category, launchedBy: [...r.by].map(([reto, e]) => ({ reto, steps: [...e.steps].sort((a, b) => a - b), models: [...e.models] })) }));
}

export type { MotionId };
