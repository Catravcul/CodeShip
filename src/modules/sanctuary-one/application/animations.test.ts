import { describe, expect, it } from "vitest";
import { MODELS, model } from "../data/catalog";
import { GESTURES, MOTIONS, PROCEDURE_STEPS } from "../data/animaciones";
import { GYM } from "../data/retos";
import { animationTable, stepAnimation } from "./animations";
import { retosFor } from "./challenges";

describe("catálogo de animaciones (Berón 2026-11-19: el jalón al pecho mostraba correr)", () => {
  it("el jalón al pecho hace jalón en los pasos del ejercicio, no correr", () => {
    const r = retosFor(model("gym-jalon"))[0]!;
    const ids = r.chore.exercises.map((_, i) => stepAnimation(r, "gym-jalon", i).id);
    expect(ids).toEqual(["ajustar", "ajustar", "jalon", "jalon", "jalon", "ajustar"]);
  });

  it("cada paso de cada reto de ejercicio tiene una animación del catálogo (ninguno queda en el «entrenar» genérico)", () => {
    const known = new Set([...Object.keys(MOTIONS), ...Object.keys(GESTURES)]);
    for (const m of MODELS)
      for (const r of retosFor(m))
        if (r.chore.kind === "ejercicio" || r.procedure?.startsWith("gym-"))
          r.chore.exercises.forEach((_, i) => expect(known.has(stepAnimation(r, m.id, i).id), `${m.id} · ${r.chore.title} · paso ${i + 1}`).toBe(true));
  });

  it("cada procedimiento con plan tiene una animación por paso", () => {
    for (const q of Object.values(GYM)) if (PROCEDURE_STEPS[q.id]) expect(PROCEDURE_STEPS[q.id]!.length, q.id).toBe(q.steps.length);
  });

  it("la tabla lista cada movimiento con los retos y pasos que lo lanzan", () => {
    const t = animationTable();
    for (const id of Object.keys(MOTIONS)) expect(t.find((r) => r.id === id)?.launchedBy.length, id).toBeGreaterThan(0);
    const jalon = t.find((r) => r.id === "jalon")!;
    expect(jalon.launchedBy[0]).toMatchObject({ steps: [3, 4, 5], models: ["gym-jalon"] });
  });
});
