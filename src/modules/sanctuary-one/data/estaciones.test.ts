import { describe, expect, it } from "vitest";
import { STATIONS } from "./estaciones";

/**
 * Where she faces at a thing she works at (Berón 2026-11-23: «hubo un paso que decía golpear al saco y el personaje
 * seguía golpeando al aire»: her station at the bag faced away from it).
 */
describe("estaciones: de cara a lo que golpea o toca", () => {
  it("en el saco, la makiwara y los instrumentos mira hacia el objeto (menos de 60° de desvío)", () => {
    const targets: Readonly<Record<string, { x: number; z: number }>> = {
      "dojo-sacos": { x: 0, z: 0 },
      "dojo-makiwara": { x: 0, z: 0 },
      "dojo-pera": { x: 0, z: -0.3 },
      "mus-bateria": { x: 0, z: 0.2 },
      "mus-teclado": { x: 0, z: 0 },
      "mus-ampli-guitarra": { x: 0, z: 0.2 },
      "mus-ampli-bajo": { x: 0, z: 0.2 },
      "mus-microfonos": { x: 0, z: 0 },
      "mus-pa-ensayo": { x: 0, z: 0 },
    };
    for (const [id, t] of Object.entries(targets)) {
      const s = STATIONS[id]!;
      const f = s.face ?? 0;
      const look = { x: -Math.sin(f), z: -Math.cos(f) };
      const to = { x: t.x - s.x, z: t.z - s.z };
      const cos = (look.x * to.x + look.z * to.z) / Math.hypot(to.x, to.z);
      expect(cos, id).toBeGreaterThan(0.5);
    }
  });
});
