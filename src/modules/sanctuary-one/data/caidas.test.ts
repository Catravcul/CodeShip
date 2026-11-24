import { describe, expect, it } from "vitest";
import { buildS1Layout } from "./layout";
import { WalkIndex } from "./walk-index";
import { FreeWalk } from "@modules/aerial-sanctuary/application/free-walk";
import { blocked, type Body, type Floor } from "@modules/aerial-sanctuary/domain/walk";

/**
 * Off every floor (Berón 2026-11-22: «no consigo caer del gym… ¿podrías probar en vivo que sea posible lanzarse de
 * todos los pisos?»): from the middle of each tower floor, walking straight out on each side away from the trunk,
 * she reaches the edge and falls.
 */
const L = buildS1Layout(1);
const ix = new WalkIndex(L.world);

function run(f: Floor, yaw: number, x: number, z: number, y0 = f.y): { fell: boolean; at: Body } {
  let y = y0;
  const walk = new FreeWalk((x, z) => ix.near(x, z, y), { walk: 1.6, swim: 1.2 }, yaw);
  let b: Body = { x, y: y0, z, motion: "gravedad", area: f.area };
  for (let t = 0; t < 4; t += 0.1) {
    const c = walk.carry(0.1, b);
    b = c.body;
    y = b.y;
    if (b.y < y0 - 3) return { fell: true, at: b };
    if (!c.busy) b = walk.move(0.1, b, { forward: 1, right: 0, yaw, pitch: 0, run: true });
  }
  return { fell: false, at: b };
}

describe("se puede tirar desde todos los pisos", () => {
  const floors = L.areas.filter((a) => a.furnish && a.building).map((a) => {
    const f = L.world.floors.filter((q) => q.area === a.id).sort((p, q) => (q.x1 - q.x0) * (q.z1 - q.z0) - (p.x1 - p.x0) * (p.z1 - p.z0))[0];
    return { a, f };
  });
  it("cada piso de los árboles tiene su suelo", () => {
    expect(floors.length).toBeGreaterThanOrEqual(18);
    for (const { a, f } of floors) expect(f, a.id).toBeDefined();
  });
  it("de cada piso se cae por los tres lados que no dan al tronco", () => {
    const stuck: string[] = [];
    for (const { a, f } of floors) {
      if (!f) continue;
      const t = L.towers.find((q) => q.id === a.id.split(":")[0])!;
      const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2;
      // The four ways (yaw: forward is (−sin, −cos)); the one towards the trunk left out.
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const fx = Math.round(-Math.sin(yaw)), fz = Math.round(-Math.cos(yaw));
        if (fx * (t.x - cx) + fz * (t.z - cz) > 0.5 * Math.hypot(t.x - cx, t.z - cz)) continue;
        // The outermost floor on that side (the ring round a hospital floor, if it has one), and nine points along
        // its edge, 1,5 m in, where she can stand: from three of them at least she walks off and falls.
        const all = L.world.floors.filter((q) => q.area === a.id || q.area.startsWith(`${a.id}:`)).filter((q) => (q.x1 - q.x0) * (q.z1 - q.z0) > 30 && !/rellano|umbral/.test(q.id));
        const ext = (q: Floor) => (fx > 0 ? q.x1 : fx < 0 ? -q.x0 : fz > 0 ? q.z1 : -q.z0);
        const far = Math.max(...all.map(ext));
        const pts: [number, number, number][] = [];
        for (const o of all.filter((q) => ext(q) > far - 0.5))
          for (let k = 1; k <= 9; k++) {
            const u = k / 10;
            const x = fx ? (fx > 0 ? o.x1 - 1.5 : o.x0 + 1.5) : o.x0 + (o.x1 - o.x0) * u;
            const z = fz ? (fz > 0 ? o.z1 - 1.5 : o.z0 + 1.5) : o.z0 + (o.z1 - o.z0) * u;
            if (!blocked(ix.near(x, z, o.y), x, o.y, z)) pts.push([x, z, o.y]);
          }
        const fell = pts.filter(([x, z, y]) => run(f, yaw, x, z, y).fell).length;
        if (fell < 3) stuck.push(`${a.id} yaw ${((yaw * 180) / Math.PI).toFixed(0)}: ${fell}/${pts.length}`);
      }
    }
    expect(stuck).toEqual([]);
  });
  it("de cada anillo de las puntas se cae hacia fuera", () => {
    const tips = L.world.floors.filter((q) => /:punta/.test(q.id));
    expect(tips.length).toBeGreaterThanOrEqual(50);
    const stuck: string[] = [];
    for (const f of tips) {
      // Across the piece of ring, away from the ring's middle (its pieces share the id up to the last «-»).
      const ring = tips.filter((q) => q.id.slice(0, q.id.lastIndexOf("-")) === f.id.slice(0, f.id.lastIndexOf("-")));
      const mx = (Math.min(...ring.map((q) => q.x0)) + Math.max(...ring.map((q) => q.x1))) / 2;
      const mz = (Math.min(...ring.map((q) => q.z0)) + Math.max(...ring.map((q) => q.z1))) / 2;
      const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2;
      const acrossX = f.x1 - f.x0 < f.z1 - f.z0;
      const yaw = acrossX ? (cx > mx ? -Math.PI / 2 : Math.PI / 2) : cz > mz ? Math.PI : 0;
      // Five places along the piece (between its fruit pots): from one at least she falls (or it is where the branch
      // comes in, and she walks onto it).
      const ok = [0.1, 0.3, 0.5, 0.7, 0.9].some((u) => {
        const x = acrossX ? cx : f.x0 + (f.x1 - f.x0) * u;
        const z = acrossX ? f.z0 + (f.z1 - f.z0) * u : cz;
        if (blocked(ix.near(x, z, f.y), x, f.y, z)) return false;
        const r = run(f, yaw, x, z);
        return r.fell || r.at.area.includes(":rama");
      });
      if (!ok) stuck.push(f.id);
    }
    expect(stuck).toEqual([]);
  });
});
