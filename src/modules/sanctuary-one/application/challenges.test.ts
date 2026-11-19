import { describe, expect, it } from "vitest";
import { MODELS } from "../data/catalog";
import { retosFor } from "./challenges";

describe("retos del santuario 1 (Berón 2026-11-19: retos en máquinas, plantas y animales)", () => {
  it("cada máquina, animal y planta ofrece al menos un reto", () => {
    // Obra-acabado is hidden by a rule (in construction); its finished machines open with the building.
    const need = MODELS.filter((m) => (m.category === "maquina" && m.group !== "obra-acabado") || m.category === "animal" || ["cultivos", "frutales", "plantas-interior", "flora-tundra"].includes(m.group));
    const none = need.filter((m) => retosFor(m).length === 0 && m.id !== "seto-cortavientos" && m.id !== "tundra-charca");
    expect(none.map((m) => m.id)).toEqual([]);
  });

  it("cada reto tiene pasos con su fuente y una recompensa de las cuatro", () => {
    for (const m of MODELS)
      for (const r of retosFor(m)) {
        expect(r.chore.exercises.length).toBeGreaterThanOrEqual(3);
        expect(r.source.length).toBeGreaterThan(5);
        expect(["comida", "compania", "fuerza", "salud"]).toContain(r.reward);
      }
  });

  it("la quesería hace queso y los fermentos kéfir", () => {
    const q = MODELS.find((m) => m.id === "cocina-queseria")!;
    expect(retosFor(q)[0]!.chore.title).toBe("Queso fresco");
    const f = MODELS.find((m) => m.id === "cocina-fermentos")!;
    expect(retosFor(f).map((r) => r.chore.title)).toContain("Kéfir de leche");
  });

  it("las mentes de los animales son la magia del santuario (ficción)", () => {
    const oso = MODELS.find((m) => m.id === "oso-polar")!;
    expect(retosFor(oso).map((r) => r.reality)).toEqual(["real", "ficción"]);
  });
});
