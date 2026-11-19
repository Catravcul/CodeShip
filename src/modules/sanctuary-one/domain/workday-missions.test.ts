import { describe, expect, it } from "vitest";
import { missionState, rosterOf } from "./workday-missions";

const MS = [
  { id: "comer", category: "Comer" },
  { id: "fuerza", category: "Ejercicio", training: true },
  { id: "yoga", category: "Yoga", training: true },
  { id: "cocinar", category: "Cocinar" },
  { id: "curar", category: "Curar personas" },
  { id: "campo", category: "Campo" },
  { id: "limpiar", category: "Limpieza" },
];

describe("misiones de jornada (Berón 2026-11-18)", () => {
  it("cada bloque de la jornada tiene su misión; comer a las 7 y a las 11", () => {
    const r = rosterOf(0, MS);
    expect(r.get(7)).toBe("comer");
    expect(r.get(11)).toBe("comer");
    expect(["fuerza", "yoga"]).toContain(r.get(8));
    const tasks = [r.get(9), r.get(12), r.get(15)];
    expect(new Set(tasks).size).toBe(3);
  });

  it("en jornada solo la del bloque; las demás con su candado y su hora", () => {
    const r = rosterOf(2, MS);
    const now = r.get(9)!;
    expect(missionState(now, 2, 9.5, MS)).toEqual({ open: true, now: true });
    const later = r.get(12)!;
    const s = missionState(later, 2, 9.5, MS);
    expect(s.open).toBe(false);
    if (!s.open) expect(s.why).toBe("Te toca a las 12:00");
  });

  it("en horas libres todas abiertas; de noche ninguna", () => {
    for (const m of MS) expect(missionState(m.id, 1, 17, MS).open).toBe(true);
    expect(missionState("cocinar", 1, 23, MS).open).toBe(false);
  });

  it("los repartos cambian de un día a otro", () => {
    const days = new Set([0, 1, 2, 3, 4, 5].map((d) => [...rosterOf(d, MS).values()].join(",")));
    expect(days.size).toBeGreaterThan(1);
  });
});
