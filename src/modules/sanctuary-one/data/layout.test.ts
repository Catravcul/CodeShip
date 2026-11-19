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
    expect(here.filter((i) => model(i.model).group !== "puertas" && model(i.model).group !== "mascaras").length).toBe(FLOOR_PLANS.get("gimnasio-0")!.items.length);
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

describe("santuario 1: cambios a gran escala (overrides.ts)", () => {
  const empty = { categoria: {}, grupo: {}, modelo: {}, edificio: {}, piso: {}, personas: {} };
  const base = buildS1Layout(1, empty);
  const count = (L: ReturnType<typeof buildS1Layout>, f: (m: string) => boolean) => L.instances.filter((i) => f(i.model)).length;
  it("ocultar una categoría quita todas sus copias y sus sólidos", () => {
    const L = buildS1Layout(1, { ...empty, categoria: { maquina: { oculto: true } } });
    expect(count(L, (m) => model(m).category === "maquina")).toBe(0);
    expect(L.world.solids.length).toBeLessThan(base.world.solids.length);
  });
  it("cambiar un modelo por otro lo cambia en todos los pisos", () => {
    const L = buildS1Layout(1, { ...empty, modelo: { "gym-smith": { cambiarPor: "gym-jaula" } } });
    expect(count(L, (m) => m === "gym-smith")).toBe(0);
    expect(count(L, (m) => m === "gym-jaula")).toBe(count(base, (m) => m === "gym-jaula") + count(base, (m) => m === "gym-smith"));
  });
  it("el grupo, el modelo y el piso se combinan: gana lo más concreto", () => {
    const L = buildS1Layout(1, { ...empty, grupo: { "gimnasio-placas": { color: 1 } }, piso: { "entrenamiento:piso-1": { modelos: { "gym-jalon": { color: 2 } } } } });
    expect(L.instances.find((i) => i.model === "gym-remo")!.tint).toBe(1);
    expect(L.instances.find((i) => i.model === "gym-jalon")!.tint).toBe(2);
  });
  it("la separación de un edificio aleja el mobiliario del centro de cada piso", () => {
    const L = buildS1Layout(1, { ...empty, edificio: { entrenamiento: { separacion: 1.2 } } });
    const a = base.areas.find((x) => x.id === "entrenamiento:piso-1")!;
    const far = (W: typeof L) => Math.max(...W.instances.filter((i) => i.area === a.id).map((i) => Math.hypot(i.x - a.x, i.z - a.z)));
    expect(far(L)).toBeCloseTo(far(base) * 1.2, 3);
  });
});

describe("santuario 1: pisos amueblados", () => {
  it("a cada anillo se llega nadando por el tronco hasta su balcón", () => {
    const L1 = buildS1Layout(1);
    const rings = L1.areas.filter((a) => a.id.endsWith(":anillo"));
    expect(rings.length).toBeGreaterThanOrEqual(4);
    for (const a of rings) {
      const t = L1.towers.find((x) => a.id.startsWith(`${x.id}:`))!;
      // From the trunk's water at the ring's height, swim towards the balcony.
      let b = placeAt(L1.world, t.x + (a.entry!.x - t.x) * 0.3, a.y + 0.5, t.z + (a.entry!.z - t.z) * 0.3)!;
      expect(b.motion, a.label).toBe("agua");
      const d = Math.hypot(a.entry!.x - b.x, a.entry!.z - b.z);
      for (let i = 0; i < 80 && b.motion === "agua"; i++) b = step(L1.world, b, { dx: ((a.entry!.x - b.x) / d) * 0.2, dy: 0, dz: ((a.entry!.z - b.z) / d) * 0.2 });
      expect(b.area, a.label).toBe(a.id);
    }
  });
  const L = buildS1Layout(1);
  it("cada «furnish» de site.ts tiene su plan y cada plan cabe en su piso", () => {
    for (const t of TOWERS)
      for (const f of t.floors) if (f.furnish) expect(FLOOR_PLANS.has(f.furnish), f.furnish).toBe(true);
    for (const p of FLOOR_PLANS.values())
      for (const it of p.items) {
        const half = Math.max(p.size.x, p.size.z) / 2;
        const d = model(it.model);
        const r = Math.hypot(d.size.x, d.size.z) / 2;
        expect(Math.abs(it.x) - Math.min(r, 3), `${p.id} ${it.model}`).toBeLessThanOrEqual(half);
        expect(Math.abs(it.z) - Math.min(r, 3), `${p.id} ${it.model}`).toBeLessThanOrEqual(half);
      }
  });
  it("en cada piso amueblado se entra por la puerta y se anda 3 m dentro", () => {
    for (const a of L.areas) {
      if (!a.entry || a.detail !== "completo" || a.id.endsWith(":anillo")) continue;
      let b = placeAt(L.world, a.entry.x, a.y + 0.01, a.entry.z)!;
      const dx = -Math.sin(a.entry.yaw) * 0.2;
      const dz = -Math.cos(a.entry.yaw) * 0.2;
      for (let i = 0; i < 40; i++) b = step(L.world, b, { dx, dz });
      expect(Math.hypot(b.x - a.entry.x, b.z - a.entry.z), a.label).toBeGreaterThan(3);
    }
  });
});

describe("the life in sanctuary 1", () => {
  const L = buildS1Layout();
  it("gives the work submarine a dive out of its bay, down its trunk and under the ice to the lagoon", () => {
    const s = L.submarine!;
    expect(s).toBeDefined();
    expect(L.instances[s.index]!.model).toBe("sub-obra");
    const ys = s.route.map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(-8);
    expect(ys[0]).toBeGreaterThan(20);
    // From the trunk on, every point is in a water: the trunk, or the sea (in the bay it rolls on its cradle to the door).
    for (const p of s.route.slice(3)) expect(L.world.waters.some((w) => p.x >= w.x0 && p.x <= w.x1 && p.z >= w.z0 && p.z <= w.z1 && p.y >= w.yBottom - 0.01 && p.y <= w.yTop + 3), JSON.stringify(p)).toBe(true);
  });

  it("gives every young wild animal a mother of its species that is an adult", () => {
    const young = L.instances.filter((i) => i.life?.mother !== undefined);
    expect(young.length).toBeGreaterThan(5);
    for (const y of young) {
      const m = L.instances[y.life!.mother!]!;
      expect(m.life?.species).toBe(y.life!.species);
      expect(m.life!.born).toBeLessThan(y.life!.born);
    }
  });
});
