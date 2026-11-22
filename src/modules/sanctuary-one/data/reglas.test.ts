import { describe, expect, it } from "vitest";
import { buildS1Layout } from "./layout";
import { FLOOR_PLANS, half } from "./floors";
import { largestHole } from "./floors/kit";
import { FLOOR_SIZE } from "./floors/kit";
import { TOWERS } from "./site";
import { model } from "./catalog";
import { carpetDestinations, carpetRoute, Grid, obstaclesOf, stationAt, touches, STATION_PAD, type Box, type CarpetStation } from "./alfombras";
import { MODELS } from "./catalog";
import { NEEDED, ORCHARD_BRANCH, TRUNK_HALF, WATER_VEHICLES } from "./paso";
import { FLOORS_PER_LEVEL, FRAME } from "./layout";
import { TREE } from "@modules/aerial-sanctuary/data/facts";

/**
 * Berón's rules for the tree-buildings and their floors (docs/design/reglas.md §6, santuario1.md), each a test that
 * fails when a new floor or a new building breaks it.
 */
const L = buildS1Layout(1.5);

/**
 * How much of a floor plan has something within 3 m (2 m cells), its finish (> 60 % of the floor) left out. The 3 m are
 * 3 m however far its things were spread (Berón 2026-11-22: «la regla de que no hayan pisos muy vacíos debe seguir
 * existiendo pero quizás la debemos ajustar»: spread floors passed it and still looked empty), on half the floor.
 */
function coverage(p: { size: { x: number; z: number }; items: readonly { model: string; x: number; z: number }[]; spread?: number }): number {
  const reach = 3;
  const A = p.size.x * p.size.z;
  const pts = p.items.map((it) => ({ it, d: model(it.model) })).filter(({ d }) => d.size.x * d.size.z <= A * 0.6).map(({ it, d }) => ({ x: it.x, z: it.z, r: Math.max(d.size.x, d.size.z) / 2 }));
  let cov = 0;
  let n = 0;
  for (let x = -p.size.x / 2 + 1; x < p.size.x / 2; x += 2)
    for (let z = -p.size.z / 2 + 1; z < p.size.z / 2; z += 2) {
      n++;
      if (pts.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + reach)) cov++;
    }
  return cov / n;
}

describe("reglas de los pisos y de los árboles (Berón 2026-11-20)", () => {
  it("ningún piso amueblado queda medio vacío: algo a menos de 3 m (sin contar la separación) de cada punto de la mitad del piso o más", () => {
    // Today's buildings' floors (the roomy ones kept in TOWERS_AMPLIOS are not built).
    for (const id of new Set(TOWERS.flatMap((t) => t.floors.map((f) => f.furnish ?? "")).filter(Boolean))) expect(coverage(FLOOR_PLANS.get(id)!), id).toBeGreaterThanOrEqual(0.5);
  });
  it("regla de distribución: ningún hueco grande, las cosas repartidas por todo el piso (Berón 2026-11-22)", () => {
    // No point of a floor (its 2,5 m edge, the door's aisle and the carpet's landing kept clear on purpose) more than
    // 6 m from every thing: a fused floor fills its whole square instead of crowding a side.
    for (const id of new Set(TOWERS.flatMap((t) => t.floors.map((f) => f.furnish ?? "")).filter(Boolean))) {
      const h = largestHole(FLOOR_PLANS.get(id)!, half);
      expect(h.r, `${id}: hueco de ${h.r.toFixed(1)} m en (${h.x}, ${h.z})`).toBeLessThanOrEqual(6);
    }
  });

  it("todos los pisos de hoy tienen el tamaño del de la cocina (Berón 2026-11-22)", () => {
    for (const t of L.towers) for (const f of t.floors) {
      expect(f.rect.x1 - f.rect.x0, `${t.id} ${f.name}`).toBeCloseTo(FLOOR_SIZE.x * 1.5);
      expect(f.rect.z1 - f.rect.z0, `${t.id} ${f.name}`).toBeCloseTo(FLOOR_SIZE.z * 1.5);
    }
  });

  it("el submarino más grande pasa por el tronco y por cada puerta del tronco con sitio para personas y animales (regla dinámica)", () => {
    // Every vehicle that goes by water is in the rule (the catalogue's, not a hand list).
    expect(MODELS.filter((m) => m.travels === "agua").map((m) => m.id).sort()).toEqual(WATER_VEHICLES.map((m) => m.id).sort());
    expect(WATER_VEHICLES.length).toBeGreaterThan(0);
    expect(2 * TRUNK_HALF).toBeGreaterThanOrEqual(NEEDED.w);
    expect(TREE.door.value.w).toBeGreaterThanOrEqual(NEEDED.w);
    expect(TREE.door.value.h).toBeGreaterThanOrEqual(NEEDED.h);
    // Cold Sanctuary's trunk ×1,5 at least (Berón 2026-11-20).
    expect(TRUNK_HALF).toBeGreaterThanOrEqual(TREE.waterHalf.value * 1.5);
  });

  it("las ramas solo llevan a las puntas de frutales y vuelven al tamaño de Cold Sanctuary (Berón 2026-11-21)", () => {
    const branches = L.world.waters.filter((w) => /:rama/.test(w.area));
    expect(branches.length).toBeGreaterThan(12);
    for (const w of branches) expect(w.area, w.id).toMatch(/:rama-\d+-\d+$/);
    expect(ORCHARD_BRANCH.halfWidth).toBe(TREE.tubeHalf.value);
    // No floor's own branch: every floor's way in is a door of the trunk.
    expect(L.areas.filter((a) => a.id.endsWith(":rama")).map((a) => a.id)).toEqual([]);
  });

  it("todos los pisos nacen del tronco: dos por nivel, en lados opuestos, pegados a su cara", () => {
    for (const t of L.towers) {
      const byY = new Map<number, (typeof t.floors)[number][]>();
      for (const f of t.floors) byY.set(f.y, [...(byY.get(f.y) ?? []), f]);
      for (const [y, fs] of byY) {
        expect(fs.length, `${t.id} ${y}`).toBeLessThanOrEqual(FLOORS_PER_LEVEL);
        if (fs.length === 2) {
          const c = fs.map((f) => ({ x: (f.rect.x0 + f.rect.x1) / 2 - t.x, z: (f.rect.z0 + f.rect.z1) / 2 - t.z }));
          // Opposite sides: their centres on either side of the trunk.
          expect(c[0]!.x * c[1]!.x + c[0]!.z * c[1]!.z, `${t.id} ${y}`).toBeLessThan(0);
        }
        // Each touches the trunk's acrylic (its edge 1 m out of the water).
        const OH = TRUNK_HALF + TREE.wall.value;
        for (const f of fs) {
          const d = Math.min(Math.abs(f.rect.x0 - (t.x + OH)), Math.abs(f.rect.x1 - (t.x - OH)), Math.abs(f.rect.z0 - (t.z + OH)), Math.abs(f.rect.z1 - (t.z - OH)));
          expect(d, `${t.id} ${f.name}`).toBeLessThan(0.01);
        }
      }
    }
  });

  it("cada piso se apoya en el tronco con dos tornapuntas diagonales, sin patas (Berón 2026-11-21)", () => {
    const OH = TRUNK_HALF + TREE.wall.value;
    for (const t of L.towers) {
      expect(t.braces.length, t.id).toBe(2 * t.floors.length);
      for (const b of t.braces) {
        // The foot on the trunk's acrylic face, the head out and up under a floor.
        const fx = Math.abs(b.foot.x - t.x), fz = Math.abs(b.foot.z - t.z);
        expect(Math.abs(Math.max(fx, fz) - OH), t.id).toBeLessThan(0.01);
        expect(Math.min(fx, fz), t.id).toBeLessThanOrEqual(OH);
        expect(b.head.y - b.foot.y, t.id).toBeGreaterThan(3);
        const under = t.floors.some((f) => Math.abs(f.y - 0.6 - b.head.y) < 0.01 && b.head.x >= f.rect.x0 && b.head.x <= f.rect.x1 && b.head.z >= f.rect.z0 && b.head.z <= f.rect.z1);
        expect(under, t.id).toBe(true);
      }
    }
  });

  it("cada árbol tiene su armazón de madera: cuatro postes en el tronco, una viga por nivel, los cantos de cada rama y la rejilla (Berón 2026-11-22)", () => {
    const G = FRAME.grid;
    for (const t of L.towers) {
      // The four corner posts, root to roof.
      const posts = t.frame.filter((q) => q.y1 - q.y0 > t.rootHeight * 0.9);
      expect(posts.length, t.id).toBeGreaterThanOrEqual(4);
      const levels = new Set(t.floors.map((f) => f.y)).size;
      const inTrunk = (q: (typeof t.frame)[number]) => Math.abs((q.x0 + q.x1) / 2 - t.x) <= TRUNK_HALF * 1.5 && Math.abs((q.z0 + q.z1) / 2 - t.z) <= TRUNK_HALF * 1.5;
      const beams = t.frame.filter((q) => inTrunk(q) && q.y1 - q.y0 < 1);
      // A beam every G m up the trunk (each face's, cut at its doorways) besides the levels'.
      const heights = new Set(beams.map((q) => Math.round((q.y0 + q.y1) / 2)));
      expect(heights.size, t.id).toBeGreaterThanOrEqual(levels);
      expect(heights.size, t.id).toBeGreaterThan(t.rootHeight / G - 3);
    }
  });

  it("la rejilla de madera nunca cruza una puerta del tronco", () => {
    const door = TREE.door.value;
    for (const f of L.world.floors.filter((q) => q.id.endsWith("-umbral"))) {
      const t = L.towers.find((q) => f.id.startsWith(`${q.id}:`))!;
      if (!t) continue;
      for (const q of t.frame) {
        const inX = q.x1 > f.x0 + 0.05 && q.x0 < f.x1 - 0.05;
        const inZ = q.z1 > f.z0 + 0.05 && q.z0 < f.z1 - 0.05;
        const inY = q.y1 > f.y + 0.2 && q.y0 < f.y + door.h - 0.2;
        expect(inX && inZ && inY, `${f.id}`).toBe(false);
      }
    }
  });


  it("bajo el tronco no hay suelo: su agua baja al mar", () => {
    for (const t of L.towers) expect(L.world.floors.filter((f) => f.y === 0 && t.x > f.x0 && t.x < f.x1 && t.z > f.z0 && t.z < f.z1).map((f) => f.id), t.id).toEqual([]);
  });

  it("ninguna rama atraviesa un piso", () => {
    for (const w of L.world.waters.filter((q) => /:rama/.test(q.area))) {
      const tower = w.area.split(":")[0]!;
      const own = w.area.replace(/:rama.*$/, "");
      const hit = L.world.floors.filter((f) => f.area.startsWith(`${tower}:`) && f.area !== own && !f.area.startsWith(`${own}:`) && !/umbral|rellano/.test(f.id) && f.y > w.yBottom + 0.01 && f.y - 0.6 < w.yTop && f.x0 < w.x1 && f.x1 > w.x0 && f.z0 < w.z1 && f.z1 > w.z0);
      expect(hit.map((f) => f.id), w.id).toEqual([]);
    }
  });

  it("cada rama sale del tronco con un aro, y su quiebre tiene el suyo", () => {
    const rings = L.instances.filter((i) => i.model.startsWith("aro-rama"));
    const branches = new Set(L.world.waters.filter((w) => /:rama/.test(w.area)).map((w) => w.area));
    for (const b of branches) expect(rings.filter((r) => r.area === b).length, b).toBe(2);
  });

  it("cada piso y anillo tiene su estación de alfombras, y cada copa y cada pie la suya", () => {
    const floors = L.areas.filter((a) => a.link);
    for (const a of floors) {
      const st = L.carpets.find((s) => s.area === a.id);
      expect(st, a.id).toBeDefined();
      expect(stationAt(L.carpets, st!.x, st!.y, st!.z)?.id, a.id).toBe(st!.id);
      if (!a.id.endsWith(":anillo")) expect(L.instances.some((i) => i.model === "estacion-alfombras" && i.area === a.id), a.id).toBe(true);
    }
    for (const t of L.towers) {
      expect(L.carpets.some((s) => s.tower === t.id && s.kind === "copa"), t.id).toBe(true);
      expect(L.carpets.some((s) => s.tower === t.id && s.kind === "pie"), t.id).toBe(true);
    }
  });

  it("cada estación de alfombras está en su piso, sin pisar ningún mueble", () => {
    for (const st of L.carpets.filter((c) => c.kind === "piso")) {
      const along = Math.abs(st.out.x) > 0.5 ? "x" : "z";
      const hx = along === "x" ? STATION_PAD.z / 2 : STATION_PAD.x / 2;
      const hz = along === "x" ? STATION_PAD.x / 2 : STATION_PAD.z / 2;
      const r = { x0: st.x - hx, x1: st.x + hx, z0: st.z - hz, z1: st.z + hz };
      // On its own floor (every corner on a floor of its area).
      for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]] as const)
        expect(L.world.floors.some((f) => f.area === st.area && Math.abs(f.y - st.y) < 0.01 && x >= f.x0 - 0.01 && x <= f.x1 + 0.01 && z >= f.z0 - 0.01 && z <= f.z1 + 0.01), `${st.id} esquina ${x.toFixed(1)},${z.toFixed(1)}`).toBe(true);
      const hit = L.world.solids.filter((q) => q.y0 < st.y + 1 && q.y1 > st.y + 0.2 && q.x0 < r.x1 && q.x1 > r.x0 && q.z0 < r.z1 && q.z1 > r.z0);
      expect(hit.length, st.id).toBe(0);
    }
  });

  it("las alfombras de un piso llegan a todo su edificio; las de la copa, también a las otras copas, y las del pie a los otros pies", () => {
    const t = L.towers[0]!;
    const floor = L.carpets.find((s) => s.tower === t.id && s.kind === "piso")!;
    const crown = L.carpets.find((s) => s.tower === t.id && s.kind === "copa")!;
    const mine = L.carpets.filter((s) => s.tower === t.id);
    expect(carpetDestinations(L.carpets, floor).length).toBe(mine.length - 1);
    const others = L.carpets.filter((s) => s.tower !== t.id && s.kind === "copa");
    expect(carpetDestinations(L.carpets, crown).length).toBe(mine.length - 1 + others.length);
  });

  it("ningún vuelo de alfombra atraviesa nada: pisos, ramas, aros, troncos ni muebles (2 m de margen)", () => {
    const world = { ...L.world, towers: L.towers };
    const grid = new Grid(obstaclesOf(world));
    // Leaving and reaching its pad a carpet flies over its own floor and landing: those (and what stands on them) aside.
    const near = (s: CarpetStation, p: { x: number; y: number; z: number }) =>
      s.kind === "piso" ? Math.hypot(p.x - s.x, p.z - s.z) <= Math.hypot(s.lane.x - s.x, s.lane.z - s.z) + 0.5 && Math.abs(p.y - s.y) <= 2.5 : Math.hypot(p.x - s.x, p.z - s.z) < 0.5;
    const own = (s: CarpetStation, b: Box) => b.area === s.area || (s.kind === "copa" && b.area === `${s.tower}:tronco`) || (b.area === undefined && b.y0 >= s.y - 0.5 && b.y1 <= s.y + 3.5);
    const bad: string[] = [];
    let n = 0;
    for (const a of L.carpets)
      for (const b of carpetDestinations(L.carpets, a)) {
        const way = carpetRoute(world, a, b);
        n++;
        for (let i = 1; i < way.length && bad.length < 20; i++) {
          const p = way[i - 1]!;
          const q = way[i]!;
          const steps = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) / 1.5));
          for (let k = 0; k <= steps; k++) {
            const u = { x: p.x + ((q.x - p.x) * k) / steps, y: p.y + ((q.y - p.y) * k) / steps, z: p.z + ((q.z - p.z) * k) / steps };
            const hit = touches(grid, u.x, u.y, u.z, (x) => (near(a, u) && own(a, x)) || (near(b, u) && own(b, x)));
            if (hit) {
              bad.push(`${a.id} → ${b.id} en ${u.x.toFixed(1)},${u.y.toFixed(1)},${u.z.toFixed(1)}: ${hit.area ?? "cosa"} [${hit.x0.toFixed(1)},${hit.x1.toFixed(1)}]×[${hit.y0.toFixed(1)},${hit.y1.toFixed(1)}]×[${hit.z0.toFixed(1)},${hit.z1.toFixed(1)}]`);
              break;
            }
          }
        }
      }
    expect(n).toBeGreaterThan(200);
    expect(bad).toEqual([]);
  });

  it("los pisos de edificios distintos nunca se cruzan", () => {
    const all = L.towers.flatMap((t) => t.floors.map((f) => ({ t: t.id, f })));
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!, b = all[j]!;
        if (a.t === b.t || Math.abs(a.f.y - b.f.y) > 25) continue;
        const p = a.f.rect, q = b.f.rect;
        expect(Math.min(p.x1, q.x1) > Math.max(p.x0, q.x0) && Math.min(p.z1, q.z1) > Math.max(p.z0, q.z0), `${a.t} ${a.f.name} / ${b.t} ${b.f.name}`).toBe(false);
      }
  });
});
