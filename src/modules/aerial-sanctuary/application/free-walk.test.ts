import { describe, expect, it } from "vitest";
import { FreeWalk, CLIMB_S } from "./free-walk";
import type { Body, WalkWorld } from "../domain/walk";
import { SPRINT_MS } from "@modules/sanctuary-one/domain/effort";

/** A floor at 0, a high floor at 12 with no railing, a box to climb and a pool. */
const W: WalkWorld = {
  floors: [
    { id: "suelo", x0: -19, x1: 50, z0: -50, z1: 50, y: 0, area: "suelo" },
    { id: "piso", x0: 10, x1: 30, z0: -10, z1: 10, y: 12, area: "piso" },
  ],
  waters: [{ id: "piscina", x0: -40, x1: -20, z0: -10, z1: 10, yBottom: -3, yTop: 0, area: "piscina" }],
  solids: [{ x0: -2, x1: 2, z0: -6, z1: -4, y0: 0, y1: 1.5 }],
};
const at = (x: number, y: number, z: number, area = "suelo"): Body => ({ x, y, z, motion: "gravedad", area });
const run = (w: FreeWalk, b: Body, s: number, i = { forward: 1, right: 0, yaw: 0, pitch: 0, run: false }) => {
  for (let t = 0; t < s; t += 0.05) {
    const c = w.carry(0.05, b);
    b = c.body;
    if (!c.busy) b = w.move(0.05, b, i);
  }
  return b;
};

describe("andar, correr, saltar, trepar y caer: lo mismo en cada nivel con gravedad", () => {
  it("anda a su paso y con Correr esprinta (domain/effort.ts)", () => {
    const w = new FreeWalk(() => W, { walk: 1.6, swim: 2.2 });
    expect(run(w, at(0, 0, 20), 1).z).toBeCloseTo(20 - 1.6, 1);
    expect(run(w, at(0, 0, 20), 1, { forward: 1, right: 0, yaw: 0, pitch: 0, run: true }).z).toBeCloseTo(20 - SPRINT_MS, 0);
  });

  it("salta solo con los pies en el suelo, y el salto acaba", () => {
    const w = new FreeWalk(() => W, { walk: 1.6, swim: 2.2 });
    const b = at(0, 0, 20);
    expect(w.startJump(b, false, false)).toBe(true);
    expect(w.startJump(b, false, false)).toBe(false);
    run(w, b, 0.4, { forward: 0, right: 0, yaw: 0, pitch: 0, run: false });
    expect(w.jump?.height).toBeGreaterThan(0.2);
    run(w, b, 1.2, { forward: 0, right: 0, yaw: 0, pitch: 0, run: false });
    expect(w.jump).toBeUndefined();
    expect(w.startJump({ ...b, motion: "agua" }, false, false)).toBe(false);
  });

  it("trepa a la caja de delante y puede andar por encima", () => {
    const w = new FreeWalk(() => W, { walk: 1.6, swim: 2.2 });
    const b = at(0, 0, -3.4);
    expect(w.startClimb(b, 0)).toBe(true);
    const c = run(w, b, CLIMB_S + 0.1, { forward: 0, right: 0, yaw: 0, pitch: 0, run: false });
    expect(c.y).toBeCloseTo(1.5, 5);
    expect(w.climbed.length).toBe(1);
  });

  it("del borde de un piso cae al suelo, y no si la caída pasa de su límite", () => {
    const w = new FreeWalk(() => W, { walk: 1.6, swim: 2.2 });
    const edge = at(29.9, 12, 0, "piso");
    const east = { forward: 0, right: 1, yaw: 0, pitch: 0, run: false };
    const b = run(w, edge, 3, east);
    expect(b.y).toBe(0);
    const safe = new FreeWalk(() => W, { walk: 1.6, swim: 2.2, maxDrop: 10 });
    expect(run(safe, edge, 3, east)).toMatchObject({ y: 12, area: "piso" });
  });

  it("nada en el agua, y con Correr nada más deprisa", () => {
    const w = new FreeWalk(() => W, { walk: 1.6, swim: 1 });
    const b: Body = { x: -30, y: -1.45, z: 5, motion: "agua", area: "piscina" };
    const slow = run(w, b, 1);
    const fast = run(w, b, 1, { forward: 1, right: 0, yaw: 0, pitch: 0, run: true });
    expect(slow.motion).toBe("agua");
    expect(b.z - fast.z).toBeGreaterThan(b.z - slow.z);
  });
});
