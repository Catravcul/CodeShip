import { describe, expect, it } from "vitest";
import { buildLayout } from "../data/layout";
import { s3AreaCategory } from "./area-category";

describe("las categorías de Áreas del santuario 3", () => {
  const L = buildLayout(1);
  it("cada área tiene una, y hay más de una por isla con edificios", () => {
    const cats = new Set(L.areas.map(s3AreaCategory));
    expect([...cats].sort()).toEqual(["Exterior", "Instalaciones", "Pisos", "Troncos"]);
  });
  it("las salas reales de la isla de entrenamiento son Instalaciones; la isla y el helipuerto, Exterior", () => {
    const t = L.areas.filter((a) => a.island === "entrenamiento");
    expect(t.filter((a) => s3AreaCategory(a) === "Instalaciones").length).toBeGreaterThan(5);
    expect(s3AreaCategory(t.find((a) => a.id === "entrenamiento:helipuerto")!)).toBe("Exterior");
  });
});
