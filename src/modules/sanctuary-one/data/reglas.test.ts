import { describe, expect, it } from "vitest";
import { buildS1Layout } from "./layout";
import { FLOOR_PLANS } from "./floors";
import { model } from "./catalog";
import { carpetDestinations, carpetRoute, Grid, obstaclesOf, stationAt, touches, STATION_PAD, type Box, type CarpetStation } from "./alfombras";
import { MODELS } from "./catalog";
import { NEEDED, TRUNK_HALF, WATER_VEHICLES } from "./paso";
import { TREE } from "@modules/aerial-sanctuary/data/facts";

/**
 * Berón's rules for the tree-buildings and their floors (docs/design/reglas.md §6, santuario1.md), each a test that
 * fails when a new floor or a new building breaks it.
 */
const L = buildS1Layout(1.5);
const small = new Set(L.areas.filter((a) => L.areas.some((r) => r.id === `${a.id}:rama`)).map((a) => a.id));

/** How much of a floor plan has something within 3 m (2 m cells), its finish (> 60 % of the floor) left out. */
function coverage(p: { size: { x: number; z: number }; items: readonly { model: string; x: number; z: number }[] }): number {
  const A = p.size.x * p.size.z;
  const pts = p.items.map((it) => ({ it, d: model(it.model) })).filter(({ d }) => d.size.x * d.size.z <= A * 0.6).map(({ it, d }) => ({ x: it.x, z: it.z, r: Math.max(d.size.x, d.size.z) / 2 }));
  let cov = 0;
  let n = 0;
  for (let x = -p.size.x / 2 + 1; x < p.size.x / 2; x += 2)
    for (let z = -p.size.z / 2 + 1; z < p.size.z / 2; z += 2) {
      n++;
      if (pts.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 3)) cov++;
    }
  return cov / n;
}

describe("reglas de los pisos y de los árboles (Berón 2026-11-20)", () => {
  it("ningún piso amueblado queda medio vacío: algo a menos de 3 m de cada punto del 60 % del piso o más", () => {
    for (const p of FLOOR_PLANS.values()) expect(coverage(p), p.id).toBeGreaterThanOrEqual(0.6);
  });

  it("el submarino más grande pasa por cada rama y cada puerta del tronco con sitio para personas y animales (regla dinámica)", () => {
    // Every vehicle that goes by water is in the rule (the catalogue's, not a hand list).
    expect(MODELS.filter((m) => m.travels === "agua").map((m) => m.id).sort()).toEqual(WATER_VEHICLES.map((m) => m.id).sort());
    expect(WATER_VEHICLES.length).toBeGreaterThan(0);
    for (const w of L.world.waters.filter((q) => /:rama/.test(q.area) && !/-c$/.test(q.id))) {
      const across = Math.min(w.x1 - w.x0, w.z1 - w.z0);
      expect(across, w.id).toBeGreaterThanOrEqual(NEEDED.w);
      expect(w.yTop - w.yBottom, w.id).toBeGreaterThanOrEqual(NEEDED.h);
    }
    expect(TREE.door.value.w).toBeGreaterThanOrEqual(NEEDED.w);
    expect(TREE.door.value.h).toBeGreaterThanOrEqual(NEEDED.h);
    // Cold Sanctuary's sizes ×2 (branches) and ×1,5 (trunk) at least (Berón 2026-11-20).
    expect(TRUNK_HALF).toBeGreaterThanOrEqual(TREE.waterHalf.value * 1.5);
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

  it("cada rama sale del tronco con un aro, y cada quiebre tiene el suyo", () => {
    const rings = L.instances.filter((i) => i.model.startsWith("aro-rama"));
    const branches = new Set(L.world.waters.filter((w) => /:rama/.test(w.area)).map((w) => w.area));
    expect(branches.size).toBeGreaterThan(12);
    for (const b of branches) {
      const bends = L.world.waters.filter((w) => w.area === b).length - 1;
      // Each tube after the first turns once (the orchard's column goes up, from the same turn's ring).
      const want = 1 + Math.min(bends, 1);
      expect(rings.filter((r) => r.area === b).length, b).toBe(want);
    }
  });

  it("de media una rama torcida por cada dos rectas, y las torcidas no van una sobre otra", () => {
    for (const t of L.towers) {
      const mine = [...small].filter((id) => id.startsWith(`${t.id}:`));
      if (mine.length < 3) continue;
      const bent = mine.filter((id) => L.world.waters.some((w) => w.id === `${id}:rama-b`));
      expect(bent.length, t.id).toBeLessThanOrEqual(Math.ceil(mine.length / 3));
      // Bent ones stacked on the same side within two levels (44 m): none.
      const at = (id: string) => L.areas.find((a) => a.id === id)!;
      for (const a of bent)
        for (const b of bent) {
          if (a === b) continue;
          const p = at(a), q = at(b);
          const sameSide = Math.sign(Math.round(p.x - t.x)) === Math.sign(Math.round(q.x - t.x)) && Math.sign(Math.round(p.z - t.z)) === Math.sign(Math.round(q.z - t.z));
          if (sameSide) expect(Math.abs(p.y - q.y), `${a} / ${b}`).toBeGreaterThan(44);
        }
    }
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
    expect(n).toBeGreaterThan(500);
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
