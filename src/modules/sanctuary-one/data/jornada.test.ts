import { describe, expect, it } from "vitest";
import { buildS1Layout } from "./layout";
import { staffPlaces, wayBetween } from "./jornada";
import { STAFF } from "./site";
import { WORKDAY } from "../domain/motion";

describe("la jornada del personal", () => {
  const L = buildS1Layout(1);
  const places = staffPlaces(L);
  const areas = new Set(L.areas.map((a) => a.id));

  it("cada persona tiene su cama, su trabajo, su entrenamiento, su comida y su rato libre", () => {
    expect(places.size).toBe(STAFF.length);
    for (const [, p] of places) for (const [, act] of WORKDAY) expect(areas.has(p[act].area)).toBe(true);
  });

  it("duermen en su habitación (Irosene y Fausto en la misma)", () => {
    expect(places.get("Irosene")!.dormir.area).toBe(places.get("Fausto")!.dormir.area);
    expect(places.get("Irosene")!.dormir.pose).toBe("supine");
  });

  it("el camino de casa al trabajo va en alfombra voladora entre pisos, sin teletransportes", () => {
    for (const [, p] of places) {
      const w = wayBetween(L, p.dormir, p.tareas);
      expect(w[0]).toMatchObject({ x: p.dormir.x, z: p.dormir.z });
      expect(w[w.length - 1]).toMatchObject({ x: p.tareas.x, z: p.tareas.z });
      // Every stretch on foot is short (ground is cut in 6 m steps); only the carpets' flights and the sea are long.
      for (let i = 1; i < w.length; i++) {
        const a = w[i - 1]!;
        const b = w[i]!;
        const d = Math.hypot(b.x - a.x, b.z - a.z);
        if (!b.swim && !b.fly) expect(d).toBeLessThan(60);
      }
      if (p.dormir.area !== p.tareas.area) expect(w.some((q) => q.fly)).toBe(true);
    }
  });
});
