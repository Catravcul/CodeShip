import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { FreeWalk } from "../application/free-walk";
import { blocked, type Body, type Floor } from "../domain/walk";
import { dropLimit, hollowPlan, ISLAND_DROP_M } from "./montana";

/**
 * Off every floor of the giant trees (edificios-y-pisos.md E13; Berón 2026-11-26: «los pisos no deben tener paredes y
 * debe ser posible tirarse por el borde», as in sanctuary 1's caidas.test.ts): from points along each open side of each
 * floor, walking straight out, she reaches the edge and falls to the floor below or into the lake.
 */
const L = buildLayout(1);
const plan = hollowPlan(L);

function run(f: Floor, yaw: number, x: number, z: number): { fell: boolean; at: Body } {
  const walk = new FreeWalk(() => L.world, { walk: 1.6, swim: 1.2, maxDrop: dropLimit }, yaw);
  let b: Body = { x, y: f.y, z, motion: "gravedad", area: f.area };
  for (let t = 0; t < 6; t += 0.1) {
    const c = walk.carry(0.1, b);
    b = c.body;
    if (b.y < f.y - 3) return { fell: true, at: b };
    if (!c.busy) b = walk.move(0.1, b, { forward: 1, right: 0, yaw, pitch: 0, run: true });
  }
  return { fell: false, at: b };
}

describe("se puede tirar desde todos los pisos de los árboles colosales (E13)", () => {
  it("ningún piso tiene paredes: ninguna pared en los pisos de los árboles", () => {
    expect(L.blocks.filter((b) => b.look === "pared" || b.look === "tejado")).toEqual([]);
  });

  it("de cada piso se cae por los tres lados que no dan al tronco, al piso de abajo o al lago", () => {
    const stuck: string[] = [];
    let sides = 0;
    for (const t of plan.trees)
      for (const pf of t.floors) {
        const area = `entrenamiento:${t.def.id}:piso-${t.floors.indexOf(pf) + 1}`;
        const all = L.world.floors.filter((q) => q.area === area && Math.abs(q.y - pf.y) < 0.01);
        const s = pf.slab;
        for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const fx = Math.round(-Math.sin(yaw));
          const fz = Math.round(-Math.cos(yaw));
          // The side towards the trunk (where the floor is born) is left out.
          const cx = (s.x0 + s.x1) / 2;
          const cz = (s.z0 + s.z1) / 2;
          if (fx * (t.x - cx) + fz * (t.z - cz) > 0) continue;
          sides++;
          const pts: [number, number][] = [];
          for (let k = 1; k <= 9; k++) {
            const u = k / 10;
            const x = fx ? (fx > 0 ? s.x1 - 1.5 : s.x0 + 1.5) : s.x0 + (s.x1 - s.x0) * u;
            const z = fz ? (fz > 0 ? s.z1 - 1.5 : s.z0 + 1.5) : s.z0 + (s.z1 - s.z0) * u;
            const on = all.some((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
            if (on && !blocked(L.world, x, pf.y, z)) pts.push([x, z]);
          }
          const fell = pts.filter(([x, z]) => run(all[0]!, yaw, x, z).fell).length;
          if (fell < 3) stuck.push(`${area} yaw ${Math.round((yaw * 180) / Math.PI)}: ${fell}/${pts.length}`);
        }
      }
    expect(sides).toBeGreaterThanOrEqual(40);
    expect(stuck).toEqual([]);
  });

  it("fuera de la montaña hueca, del borde de una isla no se tira más de 10 m", () => {
    const out: Body = { x: 0, y: 30, z: 0, motion: "gravedad", area: "x" };
    expect(dropLimit(out, { ...out, y: 0 })).toBe(ISLAND_DROP_M);
    const t = plan.trees[0]!;
    const f = t.floors[0]!;
    expect(dropLimit({ x: f.pad.x, y: f.y, z: f.pad.z, motion: "gravedad", area: "" }, out)).toBe(Infinity);
  });
});
