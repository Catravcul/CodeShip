import { describe, expect, it } from "vitest";
import { etaText, legSecondsLeft, planJourney, type CrewJoins, type Transfer } from "./journey";

const docked: CrewJoins = { lander: "nodriza", mothershipAtStation: false };

/** A small world: the ring, the elevator, the spine's hatch, the lander and the station. */
const world: Transfer[] = [
  { from: "anillo:aqui", to: "anillo:ascensor", kind: "andar", seconds: 4, label: "Andar hasta el ascensor" },
  { from: "anillo:ascensor", to: "eje:ascensor", kind: "ascensor", seconds: 30, label: "Subir por el radio" },
  { from: "eje:ascensor", to: "eje:atraque", kind: "saltos", seconds: 12, label: "Saltos por la espina" },
  { from: "eje:atraque", to: "modulo:acople", kind: "escotilla", seconds: 2, label: "Bajar al módulo", open: (j) => j.lander === "nodriza", shut: "El módulo no está acoplado a la nodriza" },
  { from: "eje:atraque", to: "estacion:nodo2", kind: "escotilla", seconds: 2, label: "Pasar a la estación", open: (j) => j.mothershipAtStation, shut: "La nodriza no está atracada en la estación" },
  { from: "modulo:acople", to: "modulo:asiento", kind: "andar", seconds: 3, label: "Al asiento" },
  { from: "modulo:asiento", to: "modulo:asiento", kind: "vuelo", seconds: 40, label: "Volar a la estación", open: (j) => j.lander !== "estacion", then: (j) => ({ ...j, lander: "estacion" }) },
  { from: "modulo:asiento", to: "modulo:acople", kind: "andar", seconds: 3, label: "A la consola de acople" },
  { from: "modulo:acople", to: "estacion:nodo2", kind: "escotilla", seconds: 2, label: "Entrar en la estación", open: (j) => j.lander === "estacion", shut: "El módulo no está en la estación" },
  { from: "estacion:nodo2", to: "estacion:planos", kind: "saltos", seconds: 9, label: "Saltos hasta Planos" },
];

describe("HAB-21 Journey planning (travel mode of the task list's «Ir»)", () => {
  it("goes the whole real way: walk, elevator, hops, hatch, seat, the flight, hatch and hops", () => {
    const p = planJourney(world, { place: "anillo:aqui", joins: docked }, "estacion:planos");
    expect(p.kind).toBe("ruta");
    if (p.kind !== "ruta") return;
    expect(p.legs.map((l) => l.kind)).toEqual(["andar", "ascensor", "saltos", "escotilla", "andar", "vuelo", "andar", "escotilla", "saltos"]);
    expect(p.seconds).toBe(4 + 30 + 12 + 2 + 3 + 40 + 3 + 2 + 9);
    // The flight leaves the lander at the station: the hatch after it opens.
    expect(p.legs[5]!.joins.lander).toBe("estacion");
  });

  it("takes the quickest way when there are two (the travel ship already berthed: straight across)", () => {
    const p = planJourney(world, { place: "anillo:aqui", joins: { lander: "nodriza", mothershipAtStation: true } }, "estacion:planos");
    expect(p.kind === "ruta" && p.legs.map((l) => l.label)).toEqual(["Andar hasta el ascensor", "Subir por el radio", "Saltos por la espina", "Pasar a la estación", "Saltos hasta Planos"]);
  });

  it("already there: an empty route", () => {
    const p = planJourney(world, { place: "estacion:planos", joins: docked }, "estacion:planos");
    expect(p).toEqual({ kind: "ruta", legs: [], seconds: 0 });
  });

  it("a shut hatch with no other way says why", () => {
    const p = planJourney(world, { place: "anillo:aqui", joins: { lander: null, mothershipAtStation: false } }, "estacion:planos");
    expect(p.kind).toBe("bloqueado");
    if (p.kind === "bloqueado") {
      expect(p.why).toMatch(/no está acoplado a la nodriza|no está atracada/);
      expect(p.at).toBe("eje:atraque");
    }
  });

  it("a leg that cannot be done now (no fuel) blocks the route with its reason", () => {
    const noFuel = world.map((t) => (t.kind === "vuelo" ? { ...t, blocked: "No queda combustible en el motor principal" } : t));
    const p = planJourney(noFuel, { place: "anillo:aqui", joins: docked }, "estacion:planos");
    expect(p).toMatchObject({ kind: "bloqueado", why: "No queda combustible en el motor principal", at: "modulo:asiento" });
  });

  it("an unknown place has no route", () => {
    expect(planJourney(world, { place: "anillo:aqui", joins: docked }, "luna:base").kind).toBe("bloqueado");
  });

  it("time left: the legs still to do plus what is left of the current one", () => {
    const p = planJourney(world, { place: "anillo:aqui", joins: docked }, "estacion:planos");
    if (p.kind !== "ruta") throw new Error("sin ruta");
    expect(legSecondsLeft(p.legs, 1, 10)).toBe(20 + 12 + 2 + 3 + 40 + 3 + 2 + 9);
    // A leg that runs late counts as nearly done, never negative.
    expect(legSecondsLeft(p.legs, 8, 60)).toBe(0);
  });

  it("ETA text in Spanish: seconds, then minutes", () => {
    expect(etaText(8.2)).toBe("9 s");
    expect(etaText(95)).toBe("1 min 35 s");
    expect(etaText(120)).toBe("2 min");
  });
});
