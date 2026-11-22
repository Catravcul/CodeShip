import { describe, expect, it } from "vitest";
import { AQUARIUM_AREA, buildS1Layout, embryoBox } from "./layout";
import { AQUARIUM, BASE, LOBES, NESTS, SEA, TOWERS, aquariumRadius, capOf } from "./site";
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
    // Beyond every cap on its side of the sea (within 45° of its direction).
    for (const t of TOWERS) {
      const a = Math.atan2(t.z - SEA.z, t.x - SEA.x);
      const side = live.filter((l) => Math.abs(Math.atan2(Math.sin(Math.atan2(l.z - SEA.z, l.x - SEA.x) - a), Math.cos(Math.atan2(l.z - SEA.z, l.x - SEA.x) - a))) < Math.PI / 4);
      for (const l of side) expect(Math.hypot(t.x - SEA.x, t.z - SEA.z), `${t.id} / ${l.name}`).toBeGreaterThan(Math.hypot(l.x - SEA.x, l.z - SEA.z) + l.r);
    }
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

  it("cada árbol nace de su base redonda en el mar: cubierta alrededor del tronco (3 m en sus esquinas), abierta donde baja el tronco, con su estación de alfombras", () => {
    const OH = TRUNK_HALF + TREE.wall.value;
    expect(BASE.r - OH * Math.SQRT2).toBeGreaterThanOrEqual(2.5);
    for (const t of L.towers) {
      expect(t.base.x1 - t.base.x0, t.id).toBeCloseTo(2 * BASE.r);
      const deck = L.world.floors.filter((f) => f.area === `base:${t.id}`);
      expect(deck.length, t.id).toBeGreaterThan(20);
      for (const f of deck) {
        // Inside the circle, out of the trunk.
        for (const [x, z] of [[f.x0, f.z0], [f.x1, f.z0], [f.x0, f.z1], [f.x1, f.z1]]) expect(Math.hypot(x! - t.x, z! - t.z), f.id).toBeLessThanOrEqual(BASE.r + 0.01);
        expect(f.x1 <= t.x - OH + 0.01 || f.x0 >= t.x + OH - 0.01 || f.z1 <= t.z - OH + 0.01 || f.z0 >= t.z + OH - 0.01, f.id).toBe(true);
      }
      // The deck goes all round: in front of each face, 1 m out, there is deck.
      for (const [dx, dz] of [[0.7, OH + 1], [0.7, -OH - 1], [OH + 1, 0.7], [-OH - 1, 0.7]]) expect(deck.some((f) => t.x + dx! > f.x0 && t.x + dx! < f.x1 && t.z + dz! > f.z0 && t.z + dz! < f.z1), `${t.id} ${dx} ${dz}`).toBe(true);
      const foot = L.carpets.find((s) => s.tower === t.id && s.kind === "pie")!;
      expect(foot, t.id).toBeDefined();
      const onDeck = deck.some((f) => foot.x >= f.x0 && foot.x <= f.x1 && foot.z >= f.z0 && foot.z <= f.z1);
      // Or at the end of its jetty, which starts at the deck's edge.
      const j = foot.landing;
      const onJetty = !!j && [[j.x0, (j.z0 + j.z1) / 2], [j.x1, (j.z0 + j.z1) / 2], [(j.x0 + j.x1) / 2, j.z0], [(j.x0 + j.x1) / 2, j.z1]].some(([x, z]) => Math.abs(Math.hypot(x! - t.x, z! - t.z) - BASE.r) < 1);
      expect(onDeck || onJetty, t.id).toBe(true);
    }
  });

  it("el globo de las ballenas: un reloj de arena de agua de 80 m y encima un globo más grande que cualquier edificio, con un embrión de un tercio en su centro", () => {
    const water = L.world.waters.filter((w) => w.area === AQUARIUM_AREA);
    const ys = [...new Set(water.map((w) => w.yBottom))].sort((a, b) => a - b);
    expect(ys.length).toBeGreaterThan(40);
    // One column of water, layer on layer, from under the sea to its top.
    const top = (y: number) => Math.max(...water.filter((w) => w.yBottom === y).map((w) => w.yTop));
    for (let i = 1; i < ys.length; i++) expect(ys[i]!).toBeCloseTo(top(ys[i - 1]!));
    expect(ys[0]!).toBeLessThan(0);
    expect(top(ys[ys.length - 1]!)).toBeCloseTo(AQUARIUM.topY);
    // The hourglass: narrower at its waist than at either end; 80 m tall.
    expect(aquariumRadius(AQUARIUM.waistY)).toBeLessThan(aquariumRadius(0));
    expect(aquariumRadius(AQUARIUM.waistY)).toBeLessThan(aquariumRadius(AQUARIUM.neckY));
    expect(AQUARIUM.neckY).toBe(80);
    // The globe: round, taller than every tree; the hourglass meets it.
    expect(aquariumRadius(AQUARIUM.centreY)).toBeCloseTo(AQUARIUM.globeR);
    expect(aquariumRadius(AQUARIUM.neckY + 0.01)).toBeCloseTo(AQUARIUM.neckR, 0);
    expect(2 * AQUARIUM.globeR).toBeGreaterThan(Math.max(...L.towers.map((t) => t.rootHeight)));
    // Every strip of water inside the round shape (its corners at most on it).
    for (const w of water) {
      const r = aquariumRadius(Math.max(0, (w.yBottom + w.yTop) / 2));
      const zIn = Math.min(Math.abs(w.z0 - AQUARIUM.z), Math.abs(w.z1 - AQUARIUM.z));
      const zMid = Math.abs((w.z0 + w.z1) / 2 - AQUARIUM.z);
      expect(Math.hypot(w.x1 - AQUARIUM.x, w.z0 < AQUARIUM.z && w.z1 > AQUARIUM.z ? 0 : Math.min(zIn, zMid)), w.id).toBeLessThanOrEqual(r + 0.01);
    }
    // The embryo: a third of the globe, in its middle, solid.
    expect(AQUARIUM.embryo).toBeCloseTo((2 * AQUARIUM.globeR) / 3);
    const e = embryoBox();
    expect((e.y0 + e.y1) / 2).toBeCloseTo(AQUARIUM.centreY);
    expect(L.world.solids.some((q) => q.x0 === e.x0 && q.y0 === e.y0 && q.z1 === e.z1)).toBe(true);
  });

  it("las alfombras vuelan por encima del globo", () => {
    for (const s of L.carpets) expect(s.lane.hi, s.id).toBeGreaterThan(AQUARIUM.topY);
  });

  it("las ballenas, delfines y focas viven en el mar y en el globo, dentro del agua y sin atravesar el embrión", () => {
    const up = NESTS.filter((n) => n.y !== undefined);
    expect(up.some((n) => n.species === "Whale")).toBe(true);
    for (const n of up) expect(n.radius, n.species).toBeLessThan(aquariumRadius(n.y!));
    const e = embryoBox();
    for (const n of up) expect(n.y! > e.y1 || n.y! < e.y0, n.species).toBe(true);
    const inside = L.instances.filter((i) => i.area === AQUARIUM_AREA);
    expect(inside.some((i) => i.model === "ballena")).toBe(true);
    expect(inside.filter((i) => i.model === "delfin" && i.y > 100).every((i) => i.y < embryoBox().y0)).toBe(true);
    expect(inside.some((i) => i.model === "delfin")).toBe(true);
    for (const i of inside) {
      expect(i.y, i.name).toBeLessThan(AQUARIUM.topY);
      expect(Math.hypot(i.x - AQUARIUM.x, i.z - AQUARIUM.z), i.name).toBeLessThan(aquariumRadius(Math.max(0, i.y)));
    }
    // Some go up and down the hourglass.
    expect(inside.some((i) => i.wander?.climb && i.wander.climb.y1 > AQUARIUM.neckY)).toBe(true);
  });
});
