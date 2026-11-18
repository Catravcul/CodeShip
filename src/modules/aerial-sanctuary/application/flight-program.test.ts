import { describe, expect, it } from "vitest";
import { ChoreRun } from "@modules/chores/domain/chore";
import { buildLayout } from "../data/layout";
import { CRAFT } from "../data/facts";
import { planTrip } from "../domain/travel";
import { flightChore, flightSteps } from "./flight-program";

const crafts = { helicoptero: CRAFT.helicoptero.value, alfombra: CRAFT.alfombra.value };
const L = buildLayout(1);
const pads = L.islands.map((i) => i.pad);
const name = (id: string) => L.islands.find((i) => i.id === id)!.name;

describe("vuelo «Por reto» (§3.6): el programa del vuelo", () => {
  it("helicóptero: pasos reales en orden, con la altura de crucero y la velocidad del S-92", () => {
    const legs = planTrip("entrenamiento", "plataforma", pads, crafts)!;
    const steps = flightSteps(legs[0]!, crafts.helicoptero, "X");
    expect(steps[0]).toMatch(/arrancar/);
    expect(steps[1]).toMatch(/82 m/);
    expect(steps[3]).toMatch(/280 km\/h/);
    expect(steps.at(-1)).toMatch(/posarse/);
  });

  it("la pregunta del tiempo es subir + distancia ÷ velocidad + bajar, y se resuelve con su respuesta", () => {
    const legs = planTrip("entrenamiento", "lanzadera", pads, crafts)!;
    const chore = flightChore(legs, crafts, name);
    expect(chore.kind).toBe("programar-viaje");
    const q = chore.exercises[1]!;
    if (q.kind !== "choice") throw new Error("choice");
    const want = (2 * 20 + legs[0]!.distanceM / (280 / 3.6)) / 60;
    expect(q.options[q.correct]).toBe(`${(Math.round(want * 10) / 10).toLocaleString("es-ES")} min`);
    expect(new Set(q.options).size).toBe(q.options.length);
    const run = new ChoreRun(chore);
    for (const ex of chore.exercises) run.submit(ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
    expect(run.status).toBe("done");
  });

  it("con escala: una pregunta por tramo; la alfombra pregunta su altura sobre el andén más alto", () => {
    const legs = planTrip("entrenamiento", "parque", pads, crafts)!;
    expect(legs.length).toBe(2);
    const chore = flightChore(legs, crafts, name);
    expect(chore.exercises.length).toBe(3);
    const q = chore.exercises[2]!;
    expect(q.kind === "choice" && q.options[q.correct]).toBe("40,1 m");
  });
});
