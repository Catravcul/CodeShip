import { describe, expect, it } from "vitest";
import { MODELS, model } from "../data/catalog";
import { GESTURES, MOTIONS, PROCEDURE_STEPS } from "../data/animaciones";
import { GYM } from "../data/retos";
import { OBJETO } from "../data/retos-objetos";
import { animationTable, stepAnimation } from "./animations";
import { retosFor } from "./challenges";

describe("catálogo de animaciones (Berón 2026-11-19: el jalón al pecho mostraba correr)", () => {
  it("el jalón al pecho hace jalón en los pasos del ejercicio, no correr", () => {
    const r = retosFor(model("gym-jalon"))[0]!;
    const ids = r.chore.exercises.map((_, i) => stepAnimation(r, "gym-jalon", i).id);
    expect(ids).toEqual(["ajustar", "ajustar", "jalon", "jalon", "ajustar"]);
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

  it("cada objeto con reto propio tiene su animación en cada paso (Berón 2026-11-23)", () => {
    const known = new Set([...Object.keys(MOTIONS), ...Object.keys(GESTURES)]);
    for (const [id, q] of Object.entries(OBJETO)) {
      expect(PROCEDURE_STEPS[q.id]?.length, q.id).toBe(q.steps.length);
      const r = retosFor(model(id))[0]!;
      expect(r.procedure).toBe(q.id);
      r.chore.exercises.forEach((_, i) => expect(known.has(stepAnimation(r, id, i).id), `${id} paso ${i + 1}`).toBe(true));
    }
  });

  it("cada instrumento, saco y máquina tiene su propio reto: ninguno comparte el primero con otro objeto distinto de su sala", () => {
    const groups: readonly (readonly string[])[] = [
      ["mus-bateria", "mus-ampli-guitarra", "mus-ampli-bajo", "mus-teclado", "mus-microfonos", "mus-pa-ensayo"],
      ["dojo-sacos", "dojo-pera", "dojo-makiwara", "dojo-tatami-judo", "dojo-ring", "dojo-jaula-mma", "dojo-tatami-grappling"],
      ["gym-press-pecho", "gym-press-hombros", "gym-jalon", "gym-remo", "gym-prensa", "gym-extension", "gym-curl-femoral", "gym-hip-thrust", "gym-gemelos", "gym-curl-biceps"],
      ["gym-cinta", "gym-eliptica", "gym-bici", "gym-bici-reclinada", "gym-escaladora", "gym-remo-ergometro", "gym-assault-bike", "gym-skierg"],
      ["gym-jaula", "gym-smith", "gym-arbol-discos", "gym-soporte-barras", "gym-esterilla", "gym-estanteria-material"],
      ["cocina-prep-verdura", "cocina-prep-carne", "cocina-barra-servicio", "cocina-mesa-emplatado", "cocina-encimera-ingredientes", "cocina-estanteria"],
    ];
    for (const g of groups) {
      const firsts = g.map((id) => retosFor(model(id))[0]!.chore.title);
      expect(new Set(firsts).size, g.join(", ")).toBe(g.length);
    }
  });

  it("la tabla lista cada movimiento con los retos y pasos que lo lanzan", () => {
    const t = animationTable();
    for (const id of Object.keys(MOTIONS)) expect(t.find((r) => r.id === id)?.launchedBy.length, id).toBeGreaterThan(0);
    const jalon = t.find((r) => r.id === "jalon")!;
    expect(jalon.launchedBy[0]).toMatchObject({ steps: [3, 4], models: ["gym-jalon"] });
  });
});
