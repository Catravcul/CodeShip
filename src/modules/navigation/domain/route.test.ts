import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { firstBlocking, pathLength, planRoute } from "./route";

const clear = (a: Vec3, b: Vec3, o: { centre: Vec3; radiusM: number }) => !firstBlocking(a, b, [o]);

describe("planRoute", () => {
  it("goes straight when nothing is in the way", () => {
    const to = new Vec3(0, 0, -5000);
    expect(planRoute(Vec3.ZERO, to, [{ centre: new Vec3(800, 0, -2000), radiusM: 100 }])).toEqual([to]);
  });

  it("steers round a rock on the line, and every leg is clear of it", () => {
    const rock = { centre: new Vec3(20, 0, -2500), radiusM: 300 };
    const to = new Vec3(0, 0, -5000);
    const route = planRoute(Vec3.ZERO, to, [rock]);
    expect(route.length).toBeGreaterThan(1);
    expect(route[route.length - 1]).toBe(to);
    let p = Vec3.ZERO;
    for (const w of route) {
      expect(clear(p, w, rock)).toBe(true);
      p = w;
    }
    expect(pathLength(Vec3.ZERO, route)).toBeGreaterThan(5000);
  });

  it("goes round even when the rock is dead centre", () => {
    const rock = { centre: new Vec3(0, 0, -2500), radiusM: 300 };
    const route = planRoute(Vec3.ZERO, new Vec3(0, 0, -5000), [rock]);
    expect(route.length).toBeGreaterThan(1);
    expect(route[0]!.sub(rock.centre).length()).toBeGreaterThan(300);
  });
});
