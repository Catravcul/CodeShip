import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { chargeProfile, chaseProfile, driveAccelMs2, driveTripS, GRAVITY_DRIVE, homeProfile, stepCharge, stepDrive, transitProfile, type DriveState } from "./gravity-drive";

const BENNU_KG = 7.329e10;
const MEMBER_KG = 9e12; // a 2,4 km member at Bennu's density

describe("gravity drive (game fiction)", () => {
  it("a Bennu-sized body pushes itself at the reference acceleration; heavier ones are slower", () => {
    expect(driveAccelMs2(BENNU_KG)).toBeCloseTo(GRAVITY_DRIVE.referenceAccelMs2, 6);
    const big = driveAccelMs2(MEMBER_KG);
    expect(big).toBeLessThan(driveAccelMs2(BENNU_KG));
    expect(big / driveAccelMs2(BENNU_KG)).toBeCloseTo(Math.pow(BENNU_KG / MEMBER_KG, 1 / 6), 6);
  });

  it("chases harder the angrier it is, but slower than the lander can fly", () => {
    const calm = chaseProfile(BENNU_KG, 0);
    const furious = chaseProfile(BENNU_KG, 1);
    expect(furious.accelMs2).toBeGreaterThan(calm.accelMs2);
    expect(furious.topSpeedMs).toBeGreaterThan(calm.topSpeedMs);
    expect(furious.topSpeedMs).toBeLessThanOrEqual(GRAVITY_DRIVE.chaseTopSpeedMs);
  });

  it("a willing asteroid flies to the station much faster than it chases", () => {
    const t = transitProfile(BENNU_KG);
    expect(t.accelMs2).toBeCloseTo(chaseProfile(BENNU_KG, 1).accelMs2 * GRAVITY_DRIVE.transitBoost, 9);
    expect(t.topSpeedMs).toBeGreaterThan(chaseProfile(BENNU_KG, 1).topSpeedMs * 10);
    expect(homeProfile(BENNU_KG).topSpeedMs).toBeLessThan(t.topSpeedMs);
  });

  it("flies to a fixed goal and stops there without overshooting", () => {
    let s: DriveState = { position: Vec3.ZERO, velocity: Vec3.ZERO };
    const goal = { position: new Vec3(5000, 0, 0) };
    const p = transitProfile(BENNU_KG);
    let maxX = 0;
    let t = 0;
    while (t < 2000 && (s.position.sub(goal.position).length() > 1 || s.velocity.length() > 0.05)) {
      s = stepDrive(s, goal, p, 0.1);
      maxX = Math.max(maxX, s.position.x);
      t += 0.1;
    }
    expect(s.position.x).toBeCloseTo(5000, 0);
    expect(maxX).toBeLessThan(5001);
    expect(s.velocity.length()).toBeLessThan(0.1);
    // The analytic trip time is a good ETA for the guidance.
    expect(t).toBeGreaterThan(driveTripS(5000, p) * 0.9);
    expect(t).toBeLessThan(driveTripS(5000, p) * 1.3);
  });

  it("never accelerates more than its profile allows", () => {
    const p = chaseProfile(BENNU_KG, 1);
    const s = stepDrive({ position: Vec3.ZERO, velocity: Vec3.ZERO }, { position: new Vec3(0, 0, 1e5) }, p, 1);
    expect(s.velocity.length()).toBeCloseTo(p.accelMs2, 9);
  });

  it("keeps a standoff from a moving goal it cannot catch (a fleeing lander)", () => {
    const p = chaseProfile(BENNU_KG, 1);
    let s: DriveState = { position: Vec3.ZERO, velocity: Vec3.ZERO };
    let target = new Vec3(500, 0, 0);
    const fleeing = new Vec3(10, 0, 0); // faster than the chase top speed
    for (let i = 0; i < 600; i++) {
      target = target.add(fleeing.scale(0.5));
      s = stepDrive(s, { position: target, velocity: fleeing }, p, 0.5, 200);
    }
    expect(s.velocity.length()).toBeLessThanOrEqual(p.topSpeedMs + 1e-6);
    expect(target.sub(s.position).length()).toBeGreaterThan(1000);
  });

  it("closes on a slow target and holds at the standoff", () => {
    const p = chaseProfile(BENNU_KG, 1);
    let s: DriveState = { position: Vec3.ZERO, velocity: Vec3.ZERO };
    const target = new Vec3(800, 0, 0);
    for (let i = 0; i < 4000; i++) s = stepDrive(s, { position: target }, p, 0.5, 200);
    expect(Math.abs(target.sub(s.position).length() - 200)).toBeLessThan(2);
  });
});

describe("gravity drive: a charge (ram)", () => {
  it("sprints harder and faster than it chases; heavier bodies sprint slower", () => {
    const c = chargeProfile(BENNU_KG, 1);
    expect(c.accelMs2).toBeCloseTo(chaseProfile(BENNU_KG, 1).accelMs2 * GRAVITY_DRIVE.chargeBoost, 9);
    expect(c.topSpeedMs).toBeCloseTo(8, 6);
    expect(chargeProfile(MEMBER_KG, 1).topSpeedMs).toBeLessThan(c.topSpeedMs / 2);
    expect(chargeProfile(BENNU_KG, 0).topSpeedMs).toBeLessThan(c.topSpeedMs);
  });

  it("flies straight along the locked direction, never above its top speed, and does not brake", () => {
    const p = chargeProfile(BENNU_KG, 1);
    let s: DriveState = { position: Vec3.ZERO, velocity: new Vec3(0, 1, 0) };
    for (let i = 0; i < 400; i++) s = stepCharge(s, Vec3.X, p, 0.1);
    expect(s.velocity.length()).toBeCloseTo(p.topSpeedMs, 6);
    expect(Math.abs(s.velocity.y)).toBeLessThan(1e-9);
    // Accelerating from rest: v = a·t until the top speed.
    let r: DriveState = { position: Vec3.ZERO, velocity: Vec3.ZERO };
    for (let i = 0; i < 10; i++) r = stepCharge(r, Vec3.X, p, 0.1);
    expect(r.velocity.x).toBeCloseTo(p.accelMs2 * 1, 9);
  });
});
