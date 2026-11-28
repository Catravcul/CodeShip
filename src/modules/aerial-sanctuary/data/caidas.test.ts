import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { FreeWalk } from "../application/free-walk";
import { blocked, type Body } from "../domain/walk";
import { WalkIndex } from "@modules/sanctuary-one/data/walk-index";
import { dropLimit, hollowPlan, ISLAND_DROP_M } from "./montana";

/**
 * Off every floor of the hall's tree-buildings (edificios-y-pisos.md E13; Berón 2026-11-26: «los pisos no deben tener
 * paredes y debe ser posible tirarse por el borde», as in sanctuary 1's caidas.test.ts, whose buildings these are):
 * from the middle of each floor, walking straight out from the trunk, she reaches the edge and falls to the floor below
 * or into the lake.
 */
const L = buildLayout(1);
const plan = hollowPlan(L);
const index = new WalkIndex(L.world);

function run(y0: number, yaw: number, x: number, z: number): boolean {
  let y = y0;
  const walk = new FreeWalk((wx, wz) => index.near(wx, wz, y), { walk: 1.6, swim: 1.2, maxDrop: dropLimit }, yaw);
  let b: Body = { x, y: y0, z, motion: "gravedad", area: "" };
  for (let t = 0; t < 4; t += 0.1) {
    const c = walk.carry(0.1, b);
    b = c.body;
    y = b.y;
    if (b.y < y0 - 3) return true;
    if (!c.busy) b = walk.move(0.1, b, { forward: 1, right: 0, yaw, pitch: 0, run: true });
  }
  return false;
}

describe("se puede tirar desde los pisos de los edificios-árbol de la nave (E13)", () => {
  it("de cada piso se cae por los lados que no dan al tronco, al piso de abajo o al lago", () => {
    const stuck: string[] = [];
    let sides = 0;
    for (const t of plan.s1.towers)
      for (const f of t.floors) {
        const r = f.rect;
        if ((r.x1 - r.x0) * (r.z1 - r.z0) < 200) continue;
        const cx = (r.x0 + r.x1) / 2;
        const cz = (r.z0 + r.z1) / 2;
        for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const fx = Math.round(-Math.sin(yaw));
          const fz = Math.round(-Math.cos(yaw));
          if (fx * (t.x - cx) + fz * (t.z - cz) > 0.5 * Math.hypot(t.x - cx, t.z - cz)) continue;
          const pts: [number, number][] = [];
          for (let k = 1; k <= 9; k++) {
            const u = k / 10;
            const x = fx ? (fx > 0 ? r.x1 - 1.5 : r.x0 + 1.5) : r.x0 + (r.x1 - r.x0) * u;
            const z = fz ? (fz > 0 ? r.z1 - 1.5 : r.z0 + 1.5) : r.z0 + (r.z1 - r.z0) * u;
            // The training floors' slabs go round their rooms in pieces: an edge against another piece or a room's floor
            // is not an edge.
            const bx = x + 3 * fx;
            const bz = z + 3 * fz;
            if (L.world.floors.some((q) => Math.abs(q.y - f.y) < 0.6 && bx > q.x0 && bx < q.x1 && bz > q.z0 && bz < q.z1)) continue;
            if (!blocked(index.near(x, z, f.y), x, f.y, z)) pts.push([x, z]);
          }
          if (pts.length < 3) continue;
          sides++;
          const fell = pts.filter(([x, z]) => run(f.y, yaw, x, z)).length;
          if (fell < 3) stuck.push(`${t.id} ${f.name || "piso"} y ${Math.round(f.y)} yaw ${Math.round((yaw * 180) / Math.PI)}: ${fell}/${pts.length}`);
        }
      }
    expect(sides).toBeGreaterThanOrEqual(40);
    expect(stuck).toEqual([]);
  }, 120_000);

  it("fuera de la montaña, del borde de una isla no se tira más de 10 m; dentro, hasta abajo", () => {
    const out: Body = { x: 0, y: 30, z: 0, motion: "gravedad", area: "x" };
    expect(dropLimit(out, { ...out, y: 0 })).toBe(ISLAND_DROP_M);
    const t = plan.s1.towers[0]!;
    const f = t.floors[0]!;
    expect(dropLimit({ x: f.rect.x0 + 1, y: f.y, z: f.rect.z0 + 1, motion: "gravedad", area: "" }, out)).toBe(Infinity);
  });
});
