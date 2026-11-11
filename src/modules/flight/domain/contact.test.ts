import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { evaluateContact, LANDING_SPEED_MS, CRASH_SPEED_MS } from "./contact";

const ground = { height: 0.5, normal: Vec3.Y, groundVelocity: Vec3.ZERO };

describe("evaluateContact", () => {
  it("no contact while above the landing gear height", () => {
    expect(evaluateContact({ ...ground, height: 5 }, new Vec3(0, -1, 0)).kind).toBe("none");
  });

  it("no contact when already moving away from the ground", () => {
    expect(evaluateContact(ground, new Vec3(0, 0.5, 0)).kind).toBe("none");
  });

  it("lands when touching down slower than the landing speed", () => {
    expect(evaluateContact(ground, new Vec3(0, -0.05, 0.02)).kind).toBe("landed");
    expect(LANDING_SPEED_MS).toBe(0.1);
  });

  it("speed is measured against the moving ground", () => {
    const spinning = { ...ground, groundVelocity: new Vec3(0.3, 0, 0) };
    expect(evaluateContact(spinning, new Vec3(0.3, -0.05, 0)).kind).toBe("landed");
    expect(evaluateContact(spinning, new Vec3(0, -0.05, 0)).kind).toBe("bounce");
  });

  it("bounces off between landing and crash speed, losing part of the normal speed", () => {
    const c = evaluateContact(ground, new Vec3(0.1, -0.6, 0));
    expect(c.kind).toBe("bounce");
    if (c.kind !== "bounce") return;
    expect(c.velocity.y).toBeCloseTo(0.3, 9);
    expect(c.velocity.x).toBeCloseTo(0.1 * 0.8, 9);
  });

  it("crashes above the crash speed and damages the hull in proportion", () => {
    const c = evaluateContact(ground, new Vec3(0, -3, 0));
    expect(c.kind).toBe("crash");
    if (c.kind !== "crash") return;
    expect(c.hullDamage).toBeGreaterThan(0);
    expect(c.hullDamage).toBeLessThanOrEqual(1);
    expect(CRASH_SPEED_MS).toBe(1);
  });
});
