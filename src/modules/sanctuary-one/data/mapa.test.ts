import { describe, expect, it } from "vitest";
import { AQUARIUM_AREA, buildS1Layout } from "./layout";
import { AQUARIUM, BASE, LOBES, NESTS, SEA, TOWERS, aquariumHalf, capOf } from "./site";
import { TRUNK_HALF } from "./paso";
import { TREE } from "@modules/aerial-sanctuary/data/facts";

/** The map in rings (Berón 2026-11-21): the whales' sea in the middle, the caps round it, the trees on bases at the edge. */
describe("el mapa en anillos", () => {
  const L = buildS1Layout(1);
  const live = LOBES.filter((l) => l.r > 0);

  it("en el centro hay un mar circular grande y abierto, sin hielo ni tierra", () => {
    expect(SEA.r).toBeGreaterThanOrEqual(100);
    for (const l of live) expect(Math.hypot(l.x - SEA.x, l.z - SEA.z) - l.r * 1.1, l.name).toBeGreaterThan(SEA.r);
    const ground = L.world.floors.filter((f) => f.y === 0 && /^(hielo|tierra):/.test(f.area));
    for (const f of ground) expect(Math.hypot((f.x0 + f.x1) / 2 - SEA.x, (f.z0 + f.z1) / 2 - SEA.z), f.id).toBeGreaterThan(SEA.r);
  });

  it("los casquetes no se tocan entre sí (la tierra del Sur y la isla van juntas)", () => {
    const group = (c: string) => (c === "Sur" || c === "Isla" ? "Tierra" : c);
    for (const a of live)
      for (const b of live) {
        if (group(capOf(a)) === group(capOf(b))) continue;
        expect(Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r, `${a.name} / ${b.name}`).toBeGreaterThan(10);
      }
  });

  it("los árboles están en el borde, más allá de todos los casquetes, y lejos unos de otros", () => {
    const outer = Math.max(...live.map((l) => Math.hypot(l.x - SEA.x, l.z - SEA.z) + l.r));
    for (const t of TOWERS) expect(Math.hypot(t.x - SEA.x, t.z - SEA.z), t.id).toBeGreaterThan(outer);
    for (const a of TOWERS) for (const b of TOWERS) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.id} / ${b.id}`).toBeGreaterThan(300);
    // No tree's floors, rings or tips over a cap: they stand clear of the animals' space.
    for (const t of L.towers)
      for (const f of [...t.floors.map((q) => q.rect), ...t.tips.map((q) => q.rect)])
        for (const l of live) {
          const nx = Math.max(f.x0, Math.min(l.x, f.x1));
          const nz = Math.max(f.z0, Math.min(l.z, f.z1));
          expect(Math.hypot(nx - l.x, nz - l.z), `${t.id} / ${l.name}`).toBeGreaterThan(l.r * 1.1);
        }
  });

  it("cada árbol nace de su base en el mar: 10 m de cubierta alrededor del tronco, abierta donde baja el tronco, con su estación de alfombras", () => {
    const OH = TRUNK_HALF + TREE.wall.value;
    for (const t of L.towers) {
      expect(t.base.x1 - t.base.x0, t.id).toBeCloseTo(2 * (OH + BASE.walk));
      const deck = L.world.floors.filter((f) => f.area === `base:${t.id}`);
      expect(deck.length, t.id).toBe(4);
      // The trunk's hole is open.
      for (const f of deck) expect(f.x1 <= t.x - OH + 0.01 || f.x0 >= t.x + OH - 0.01 || f.z1 <= t.z - OH + 0.01 || f.z0 >= t.z + OH - 0.01, f.id).toBe(true);
      const foot = L.carpets.find((s) => s.tower === t.id && s.kind === "pie")!;
      expect(foot, t.id).toBeDefined();
      const onDeck = deck.some((f) => foot.x >= f.x0 && foot.x <= f.x1 && foot.z >= f.z0 && foot.z <= f.z1);
      const onJetty = !!foot.landing && [t.base.x0, t.base.x1].some((e) => Math.abs(foot.landing!.x0 - e) < 0.01 || Math.abs(foot.landing!.x1 - e) < 0.01) || [t.base.z0, t.base.z1].some((e) => Math.abs((foot.landing?.z0 ?? NaN) - e) < 0.01 || Math.abs((foot.landing?.z1 ?? NaN) - e) < 0.01);
      expect(onDeck || onJetty, t.id).toBe(true);
    }
  });

  it("la pirámide de las ballenas: un reloj de arena de agua de 80 m y encima una pirámide invertida más ancha que el mar", () => {
    const layers = L.world.waters.filter((w) => w.area === AQUARIUM_AREA).sort((a, b) => a.yBottom - b.yBottom);
    expect(layers.length).toBeGreaterThan(20);
    // One column of water, layer on layer, from under the sea to its top.
    for (let i = 1; i < layers.length; i++) expect(layers[i]!.yBottom).toBeCloseTo(layers[i - 1]!.yTop);
    expect(layers[0]!.yBottom).toBeLessThan(0);
    expect(layers[layers.length - 1]!.yTop).toBe(AQUARIUM.topY);
    // The hourglass: narrower at its waist than at either end.
    expect(aquariumHalf(AQUARIUM.waistY)).toBeLessThan(aquariumHalf(0));
    expect(aquariumHalf(AQUARIUM.waistY)).toBeLessThan(aquariumHalf(AQUARIUM.neckY));
    expect(AQUARIUM.neckY).toBe(80);
    // The pyramid widens all the way up, its top wider than the sea.
    for (let y = AQUARIUM.neckY; y < AQUARIUM.topY; y += 5) expect(aquariumHalf(y + 5)).toBeGreaterThan(aquariumHalf(y));
    expect(AQUARIUM.topHalf).toBeGreaterThan(SEA.r);
    // Under the carpets' sky way (over the highest crown).
    expect(AQUARIUM.topY).toBeLessThan(Math.max(...L.towers.map((t) => t.rootHeight)));
  });

  it("las ballenas, delfines y focas viven en el mar y en la pirámide, dentro del agua", () => {
    const up = NESTS.filter((n) => n.y !== undefined);
    expect(up.some((n) => n.species === "Whale")).toBe(true);
    for (const n of up) expect(n.radius, n.species).toBeLessThan(aquariumHalf(n.y!));
    const inside = L.instances.filter((i) => i.area === AQUARIUM_AREA);
    expect(inside.some((i) => i.model === "ballena")).toBe(true);
    expect(inside.some((i) => i.model === "delfin")).toBe(true);
    for (const i of inside) {
      expect(i.y, i.name).toBeLessThan(AQUARIUM.topY);
      expect(Math.max(Math.abs(i.x - AQUARIUM.x), Math.abs(i.z - AQUARIUM.z)), i.name).toBeLessThan(aquariumHalf(Math.max(0, i.y)));
    }
    // Some go up and down the hourglass.
    expect(inside.some((i) => i.wander?.climb && i.wander.climb.y1 > AQUARIUM.neckY)).toBe(true);
  });
});
