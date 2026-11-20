import { describe, expect, it } from "vitest";
import { buildS1Layout } from "./layout";
import { FLOOR_PLANS } from "./floors";
import { model } from "./catalog";
import { carpetDestinations, stationAt, STATION_PAD } from "./alfombras";

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

  it("las alfombras de un piso llegan a todo su edificio; las de la copa, también a las otras copas y pies", () => {
    const t = L.towers[0]!;
    const floor = L.carpets.find((s) => s.tower === t.id && s.kind === "piso")!;
    const crown = L.carpets.find((s) => s.tower === t.id && s.kind === "copa")!;
    const mine = L.carpets.filter((s) => s.tower === t.id);
    expect(carpetDestinations(L.carpets, floor).length).toBe(mine.length - 1);
    const others = L.carpets.filter((s) => s.tower !== t.id && s.kind !== "piso");
    expect(carpetDestinations(L.carpets, crown).length).toBe(mine.length - 1 + others.length);
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
