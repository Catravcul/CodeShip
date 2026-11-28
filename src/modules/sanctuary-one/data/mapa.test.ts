import type { Body } from "@modules/aerial-sanctuary/domain/walk";
import { FreeWalk } from "@modules/aerial-sanctuary/application/free-walk";
import { WalkIndex } from "./walk-index";
import { describe, expect, it } from "vitest";
import { AQUARIUM_AREA, buildS1Layout, embryoBox } from "./layout";
import { BASE, LOBES, NESTS, SEA, TOWERS, WATER_Y, capOf, lobeRadius } from "./site";
import { GLOBE, GLOBE_CELL, globeShare, globeDepth, globeTopAt, layerBoxes } from "./globo";
import { TRUNK_HALF } from "./paso";
import { LIFE, pulpoAt, pulpoBody } from "../domain/pulpo";
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

  it("cada árbol nace de su base cuadrada en el mar: 10 m de cubierta alrededor del tronco, abierta donde baja el tronco, con su estación de alfombras", () => {
    const OH = TRUNK_HALF + TREE.wall.value;
    for (const t of L.towers) {
      expect(t.base.x1 - t.base.x0, t.id).toBeCloseTo(2 * (OH + BASE.walk));
      const deck = L.world.floors.filter((f) => f.area === `base:${t.id}`);
      expect(deck.length, t.id).toBe(4);
      for (const f of deck) expect(f.x1 <= t.x - OH + 0.01 || f.x0 >= t.x + OH - 0.01 || f.z1 <= t.z - OH + 0.01 || f.z0 >= t.z + OH - 0.01, f.id).toBe(true);
      const foot = L.carpets.find((s) => s.tower === t.id && s.kind === "pie")!;
      expect(foot, t.id).toBeDefined();
      const onDeck = deck.some((f) => foot.x >= f.x0 && foot.x <= f.x1 && foot.z >= f.z0 && foot.z <= f.z1);
      const j = foot.landing;
      const onJetty = !!j && ([t.base.x0, t.base.x1].some((e) => Math.abs(j.x0 - e) < 0.01 || Math.abs(j.x1 - e) < 0.01) || [t.base.z0, t.base.z1].some((e) => Math.abs(j.z0 - e) < 0.01 || Math.abs(j.z1 - e) < 0.01));
      expect(onDeck || onJetty, t.id).toBe(true);
    }
  });

  it("el globo nace del mar entre los casquetes: su base es 6/10 de ese mar y sigue su forma, pixelada (Berón 2026-11-22)", () => {
    const area = (n: number) => n * GLOBE_CELL * GLOBE_CELL;
    // The sea between the caps: open water, never on a cap.
    expect(GLOBE.seaArea).toBeGreaterThan(Math.PI * 120 * 120);
    for (const c of GLOBE.sea) {
      const [i, j] = c.split(",").map(Number) as [number, number];
      const x = (i + 0.5) * GLOBE_CELL;
      const z = (j + 0.5) * GLOBE_CELL;
      for (const [n, l] of LOBES.entries()) if (l.r > 0) expect(Math.hypot(x - l.x, z - l.z), `${c} / ${l.name}`).toBeGreaterThan(lobeRadius(l, n, x, z));
    }
    // At the water: 6/10 of that sea, inside it; one body with the sea (its foot under the surface).
    const foot = GLOBE.layers.find((l) => l.y0 <= WATER_Y && l.y1 > WATER_Y)!;
    expect(area(foot.cells.size) / GLOBE.seaArea).toBeCloseTo(0.6, 1);
    for (const c of foot.cells) expect(GLOBE.sea.has(c), c).toBe(true);
    expect(GLOBE.layers[0]!.y0).toBeLessThan(WATER_Y);
  });

  it("el globo: una boquilla suave que se abre en una esfera (Berón 2026-11-22: «forma de globo»), más alto que cualquier árbol", () => {
    const L0 = GLOBE.layers;
    for (let n = 1; n < L0.length; n++) expect(L0[n]!.y0).toBe(L0[n - 1]!.y1);
    const sizes = L0.map((l) => l.cells.size);
    const waist = Math.min(...sizes.slice(0, 10));
    expect(waist).toBeLessThan(sizes[0]! * 0.6);
    // From the nozzle up it keeps opening to the belly, never a jump of more than a quarter from one layer to the next.
    const w = sizes.indexOf(waist);
    const belly = sizes.indexOf(Math.max(...sizes));
    for (let n = w + 1; n <= belly; n++) {
      expect(sizes[n]!, String(L0[n]!.y0)).toBeGreaterThanOrEqual(sizes[n - 1]!);
      expect(sizes[n]! / sizes[n - 1]!, String(L0[n]!.y0)).toBeLessThan(1.4);
    }
    // Round: its belly's cells within the sphere's circle (a cell's diagonal of play), and as many as the circle holds.
    const bl = L0[belly]!;
    const R = Math.sqrt((bl.cells.size * GLOBE_CELL * GLOBE_CELL) / Math.PI);
    for (const k of bl.cells) {
      const [i, j] = k.split(",").map(Number) as [number, number];
      expect(Math.hypot((i + 0.5) * GLOBE_CELL - GLOBE.x, (j + 0.5) * GLOBE_CELL - GLOBE.z)).toBeLessThan(R + GLOBE_CELL * 1.5);
    }
    expect(R).toBeGreaterThan(120);
    expect(GLOBE.topY).toBeGreaterThan(Math.max(...L.towers.map((t) => t.rootHeight)));
    expect(globeShare(GLOBE.topY + 1)).toBe(0);
  });

  it("el agua del globo son sus celdas, capa a capa (se nada en ella desde el mar hasta arriba)", () => {
    const water = L.world.waters.filter((w) => w.area === AQUARIUM_AREA);
    for (const l of GLOBE.layers) {
      const boxes = water.filter((w) => w.yBottom === l.y0);
      const sum = boxes.reduce((s, q) => s + (q.x1 - q.x0) * (q.z1 - q.z0), 0);
      expect(sum, String(l.y0)).toBeCloseTo(l.cells.size * GLOBE_CELL * GLOBE_CELL);
      expect(layerBoxes(l).length, String(l.y0)).toBe(boxes.length);
    }
    // Straight up its middle there is water all the way to the top.
    for (let y = 0; y < GLOBE.topY - GLOBE_CELL; y += 4) expect(water.some((w) => w.yBottom <= y && w.yTop > y && GLOBE.x > w.x0 && GLOBE.x < w.x1 && GLOBE.z > w.z0 && GLOBE.z < w.z1), String(y)).toBe(true);
    expect(globeTopAt(GLOBE.x, GLOBE.z)).toBeCloseTo(GLOBE.topY, -1);
  });

  it("el globo no toca ningún árbol", () => {
    const water = L.world.waters.filter((w) => w.area === AQUARIUM_AREA);
    for (const t of L.towers) {
      const parts = [...t.floors.map((f) => ({ ...f.rect, y0: f.y - 1, y1: f.y + 8 })), ...t.tips.map((f) => ({ ...f.rect, y0: f.y - 1, y1: f.y + 8 })), { ...t.base, y0: -3, y1: t.rootHeight }];
      for (const p of parts) for (const w of water) expect(p.x1 > w.x0 && p.x0 < w.x1 && p.z1 > w.z0 && p.z0 < w.z1 && p.y1 > w.yBottom && p.y0 < w.yTop, `${t.id} / ${w.id}`).toBe(false);
    }
  });

  it("el embrión: un tercio del globo, en su vientre, sólido; las alfombras vuelan por encima del globo", () => {
    const e = embryoBox();
    expect((e.y0 + e.y1) / 2).toBeCloseTo(GLOBE.bellyY);
    expect(L.world.solids.some((q) => q.x0 === e.x0 && q.y0 === e.y0 && q.z1 === e.z1)).toBe(true);
    const widest = Math.max(...GLOBE.layers.map((l) => l.cells.size)) * GLOBE_CELL * GLOBE_CELL;
    expect(GLOBE.embryo).toBeCloseTo((2 * Math.sqrt(widest / Math.PI)) / 3);
    for (const s of L.carpets) expect(s.lane.hi, s.id).toBeGreaterThan(GLOBE.topY);
  });

  it("el pulpo adulto, con los brazos abiertos, ocupa el 66 % del diámetro del globo y cabe en él (Berón 2026-11-28)", () => {
    const span = pulpoBody(pulpoAt(LIFE.grown)).span * GLOBE.embryo;
    expect(span / GLOBE.across).toBeCloseTo(0.66, 3);
    // Its arms open at the belly, inside the water there: the layer at its height is wider than its span.
    const layer = GLOBE.layers.find((l) => l.y0 <= GLOBE.bellyY && l.y1 > GLOBE.bellyY)!;
    const wide = 2 * Math.sqrt((layer.cells.size * GLOBE_CELL * GLOBE_CELL) / Math.PI);
    expect(span).toBeLessThan(wide);
  });

  it("las ballenas, delfines y focas viven en el mar y en el globo, dentro del agua y sin atravesar el embrión", () => {
    const e = embryoBox();
    const up = NESTS.filter((n) => n.y !== undefined);
    expect(up.some((n) => n.species === "Whale")).toBe(true);
    for (const n of up) expect(n.y! > e.y1 || n.y! < e.y0, n.species).toBe(true);
    const water = L.world.waters.filter((w) => w.area === AQUARIUM_AREA);
    const wet = (x: number, y: number, z: number) => water.some((w) => w.yBottom <= y && w.yTop > y && x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1);
    const inside = L.instances.filter((i) => i.area === AQUARIUM_AREA || (i.y > 5 && NESTS.some((n) => n.y !== undefined && Math.abs(n.y - i.y) < 6)));
    expect(inside.some((i) => i.model === "ballena")).toBe(true);
    expect(inside.some((i) => i.model === "delfin")).toBe(true);
    for (const i of inside) {
      expect(wet(i.x, i.y, i.z), i.name).toBe(true);
      expect(i.y > e.y1 || i.y < e.y0 || Math.abs(i.x - GLOBE.x) > e.x1 - GLOBE.x, i.name).toBe(true);
    }
    expect(inside.some((i) => i.wander?.climb && i.wander.climb.y1 > 40)).toBe(true);
  });
  it("la luz del globo entra por su piel: bajo el mar, por la superficie; dentro del globo, por su lado más cercano (Berón 2026-11-22)", () => {
    // In the sea, the deeper the darker, whatever is above (the column of the nozzle does not darken the sea).
    expect(globeDepth(GLOBE.x, -3, GLOBE.z)).toBeCloseTo(2.75, 5);
    expect(globeDepth(GLOBE.x, -12, GLOBE.z)).toBeGreaterThan(globeDepth(GLOBE.x, -3, GLOBE.z));
    // In the belly, never deeper than its half-width: the sky lights it from the side.
    const half = Math.sqrt((GLOBE.layers.reduce((n, l) => Math.max(n, l.cells.size), 0) * GLOBE_CELL * GLOBE_CELL) / Math.PI);
    const d = globeDepth(GLOBE.x, GLOBE.bellyY, GLOBE.z);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThanOrEqual(half + GLOBE_CELL);
    // Near its top, shallow.
    expect(globeDepth(GLOBE.x, GLOBE.topY - 4, GLOBE.z)).toBeLessThanOrEqual(8);
  });
  it("se nada desde el mar hasta dentro del globo, mirando arriba (Berón 2026-11-22: «en el globo de agua no puedo nadar»)", () => {
    const L = buildS1Layout(1);
    const ix = new WalkIndex(L.world);
    let y = -3;
    const w = new FreeWalk((x, z) => ix.near(x, z, y), { walk: 1.6, swim: 1.2 }, 0);
    let b: Body = { x: GLOBE.x + 4, y: -3, z: GLOBE.z + 4, motion: "agua", area: AQUARIUM_AREA };
    for (let t = 0; t < 60; t += 0.1) {
      const c = w.carry(0.1, b);
      b = c.body;
      y = b.y;
      if (!c.busy) b = w.move(0.1, b, { forward: 1, right: 0, yaw: 0, pitch: 1.4, run: true });
    }
    expect(b.motion).toBe("agua");
    expect(b.y).toBeGreaterThan(100);
  });
});
