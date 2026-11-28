import { TOWERS } from "./site";
import { describe, expect, it } from "vitest";
import { areaCategory, capAt, CAPS } from "./area-kinds";

describe("categorías y ámbito de las áreas del santuario 1", () => {
  it("cada piso por su función", () => {
    expect(areaCategory({ id: "entrenamiento:piso-1", furnish: "gimnasio" })).toBe("Gimnasio");
    expect(areaCategory({ id: "servicios:piso-1", furnish: "restaurante" })).toBe("Cocina");
    expect(areaCategory({ id: "servicios:piso-4", furnish: "hospital-veterinario" })).toBe("Animales");
    expect(areaCategory({ id: "servicios:anillo" })).toBe("Anillos");
    expect(areaCategory({ id: "hielo:Norte" })).toBe("Casquetes");
  });
  it("el casquete de un punto", () => {
    expect(capAt(5, 95)).toBe("Norte");
    expect(capAt(-168, -168)).toBe("Isla");
    expect(CAPS).toContain("Centro");
  });
  it("cada piso amueblado de hoy tiene su categoría: ninguno sale como «Pisos libres» (Berón 2026-11-22)", () => {
    const floors = TOWERS.flatMap((t) => t.floors.map((f, k) => ({ id: `${t.id}:piso-${k + 1}`, furnish: f.furnish })));
    const wrong = floors.filter((f) => f.furnish && ["Pisos libres", "Mar y laguna"].includes(areaCategory(f)));
    expect(wrong.map((f) => f.furnish)).toEqual([]);
  });
});
