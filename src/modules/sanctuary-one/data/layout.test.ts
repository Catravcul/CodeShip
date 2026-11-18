import { describe, expect, it } from "vitest";
import { placeAt, step } from "@modules/aerial-sanctuary/domain/walk";
import { buildS1Layout } from "./layout";
import { MODELS, model } from "./catalog";
import { TOWERS, STAFF } from "./site";
import { FLOOR_PLANS } from "./floors";
import { allocate, plan, split } from "../domain/population";

describe("santuario 1: catálogo", () => {
  it("cada modelo tiene fuente, etiqueta de realidad y tamaño real", () => {
    for (const d of MODELS) {
      expect(d.source.length, d.id).toBeGreaterThan(10);
      expect(["real", "en-desarrollo", "licencia", "ficcion"]).toContain(d.reality);
      expect(d.size.x * d.size.y * d.size.z, d.id).toBeGreaterThan(0);
    }
    expect(new Set(MODELS.map((d) => d.id)).size).toBe(MODELS.length);
  });
});

describe("santuario 1: población (PopulationPlan de Cold Sanctuary)", () => {
  it("reparte K × humanos exacto, con el mínimo viable de cada especie", () => {
    const c = plan(30);
    expect([...c.values()].reduce((a, n) => a + n, 0)).toBe(90);
    for (const [s, n] of c) expect(n, s).toBeGreaterThanOrEqual(s === "ArcticFox" ? 4 : 2);
    expect(c.get("Penguin")!).toBeGreaterThan(c.get("Orca")!);
  });
  it("sin sitio para los mínimos, salen antes los depredadores del ápice", () => {
    const r = allocate(5, ["Penguin", "Orca", "Seal"]);
    expect(r.dropped[0]).toBe("Orca");
  });
  it("parte en familias como Split", () => expect(split(7, 3)).toEqual([3, 2, 2]));
});

describe("santuario 1: escena", () => {
  const L = buildS1Layout(1);
  it("cada instancia nombra un modelo del catálogo", () => {
    for (const i of L.instances) expect(() => model(i.model)).not.toThrow();
  });
  it("cada torre tiene sus pisos en orden y dos por nivel", () => {
    for (const t of TOWERS) {
      const s = L.towers.find((x) => x.id === t.id)!;
      expect(s.floors.length).toBe(t.floors.length);
      expect(s.floors[0]!.y).toBe(64);
      if (s.floors.length > 2) expect(s.floors[2]!.y).toBe(86);
    }
  });
  it("el gimnasio lleva sus 30 máquinas de placas y su peso libre", () => {
    const gym = L.areas.find((a) => a.label === "Gimnasio")!;
    const here = L.instances.filter((i) => i.area === gym.id);
    expect(here.filter((i) => model(i.model).group === "gimnasio-placas")).toHaveLength(30);
    expect(here.length).toBe(FLOOR_PLANS.get("gimnasio-0")!.items.length);
  });
  it("todo el personal está y cada uno es una persona", () => {
    const people = L.instances.filter((i) => model(i.model).category === "persona");
    expect(people.map((p) => p.name)).toEqual([...STAFF]);
  });
  it("empieza de pie en la puerta del gimnasio y puede entrar andando", () => {
    let b = placeAt(L.world, L.start.x, L.start.y + 0.01, L.start.z)!;
    expect(b.motion).toBe("gravedad");
    const fx = -Math.sin(L.start.yaw);
    const fz = -Math.cos(L.start.yaw);
    for (let i = 0; i < 20; i++) b = step(L.world, b, { dx: fx * 0.2, dz: fz * 0.2 });
    expect(Math.hypot(b.x - L.start.x, b.z - L.start.z)).toBeGreaterThan(2);
  });
  it("desde el gimnasio se nada por el tronco hasta el hielo", () => {
    const t = L.towers.find((x) => x.id === "entrenamiento")!;
    let b = placeAt(L.world, t.x, 30, t.z)!;
    expect(b.motion).toBe("agua");
    for (let i = 0; i < 400 && b.y > 0.5; i++) b = step(L.world, b, { dx: 0, dy: -0.2, dz: 0 });
    expect(b.y).toBeLessThan(1);
  });
  it("con «Cómoda 1,5×» los pisos y su equipo se amplían en planta, no en altura", () => {
    const W = buildS1Layout(1.5);
    const a = L.towers[0]!.floors[0]!.rect;
    const c = W.towers[0]!.floors[0]!.rect;
    expect(c.x1 - c.x0).toBeCloseTo((a.x1 - a.x0) * 1.5, 5);
    expect(W.towers[0]!.floors[0]!.y).toBe(64);
  });
});
