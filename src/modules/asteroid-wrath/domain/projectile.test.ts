import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { closestApproachM, guidanceAccelMs2, interceptVelocity, kineticEnergyJ, rockDiameterM, sphereMassKg, stepProjectile, type Projectile } from "./projectile";

const rock = (position: Vec3, velocity: Vec3): Projectile => ({ id: 1, kind: "roca", sourceId: "a", targetId: "t", position, velocity, massKg: 10, radiusM: 0.2, ageS: 0 });
const noGravity = () => Vec3.ZERO;

describe("projectile kinematics", () => {
  it("rock size grows with the asteroid: Bennu's are about half a metre, a 2,4 km body's about a metre", () => {
    expect(rockDiameterM(490)).toBeCloseTo(0.49, 2);
    expect(rockDiameterM(2440)).toBeCloseTo(1.09, 2);
    expect(sphereMassKg(1, 1000)).toBeCloseTo(523.6, 1);
    expect(kineticEnergyJ(2, 3)).toBe(9);
  });

  it("leads a moving target so both arrive at the same point", () => {
    const v = interceptVelocity(Vec3.ZERO, new Vec3(100, 0, 0), new Vec3(0, 5, 0), 10);
    expect(v.length()).toBeCloseTo(10, 6);
    // Time to meet: |(100, 5t)| = 10t.
    const t = 100 / Math.sqrt(100 - 25);
    expect(v.scale(t).sub(new Vec3(100, 5 * t, 0)).length()).toBeLessThan(1e-6);
  });

  it("guidance falls with the square of the distance and with anger", () => {
    expect(guidanceAccelMs2(0.1, 500, 500, 1)).toBeCloseTo(0.1);
    expect(guidanceAccelMs2(0.1, 500, 1000, 1)).toBeCloseTo(0.025);
    expect(guidanceAccelMs2(0.1, 500, 1000, 0.5)).toBeCloseTo(0.0125);
  });

  it("steers toward its target with no more than the guidance acceleration and never beyond top speed", () => {
    let p = rock(new Vec3(0, 0, 0), new Vec3(5, 0, 0));
    const ctx = { asteroidPosition: new Vec3(0, -100, 0), asteroidRadiusM: 100, gravityAt: noGravity, guidanceMs2: 0.2, anger: 1, maxSpeedMs: 6, target: { position: new Vec3(0, 200, 0), velocity: Vec3.ZERO } };
    const next = stepProjectile(p, ctx, 1);
    // Distance from the asteroid centre is 100 m = its radius: full 0,2 m/s².
    expect(next.velocity.sub(p.velocity).length()).toBeLessThanOrEqual(0.2 + 1e-9);
    let closest = Infinity;
    for (let i = 0; i < 600; i++) {
      p = stepProjectile(p, ctx, 0.5);
      expect(p.velocity.length()).toBeLessThanOrEqual(6 + 1e-9);
      closest = Math.min(closest, p.position.sub(ctx.target.position).length());
    }
    // Thrown sideways, it still curls round onto the target.
    expect(closest).toBeLessThan(5);
  });

  it("without a target it flies ballistic under the asteroid's gravity", () => {
    const p = stepProjectile(rock(Vec3.ZERO, new Vec3(1, 0, 0)), { asteroidPosition: Vec3.ZERO, asteroidRadiusM: 1, gravityAt: () => new Vec3(0, -1, 0), guidanceMs2: 1, anger: 1, maxSpeedMs: 100 }, 1);
    expect(p.velocity.x).toBeCloseTo(1);
    expect(p.velocity.y).toBeCloseTo(-1);
  });

  it("finds the closest approach inside a step", () => {
    expect(closestApproachM(new Vec3(-5, 1, 0), new Vec3(10, 0, 0), Vec3.ZERO, Vec3.ZERO, 1)).toBeCloseTo(1);
    expect(closestApproachM(new Vec3(-5, 1, 0), new Vec3(1, 0, 0), Vec3.ZERO, Vec3.ZERO, 1)).toBeCloseTo(Math.hypot(4, 1));
  });
});
