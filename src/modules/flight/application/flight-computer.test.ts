import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { RigidBodyState } from "../domain/rigid-body";
import { FlightComputer, NO_INPUT } from "./flight-computer";

const make = (opts: { gravity?: boolean; assist?: boolean } = {}) => {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const fc = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(new Vec3(0, 0, 2000)), {
    gravitySources: opts.gravity === false ? [] : [bennu],
    target: bennu,
  });
  fc.rotationAssist = opts.assist ?? true;
  return fc;
};

describe("FlightComputer", () => {
  it("runs the simulation at a fixed 120 Hz whatever the frame rate", () => {
    const a = make();
    const b = make();
    for (let i = 0; i < 60; i++) a.update(1 / 60, { ...NO_INPUT, mainThrottle: 1 });
    for (let i = 0; i < 30; i++) b.update(1 / 30, { ...NO_INPUT, mainThrottle: 1 });
    expect(a.state.position.z).toBeCloseTo(b.state.position.z, 9);
    expect(a.simTimeS).toBeCloseTo(1, 9);
  });

  it("the main engine accelerates the ship forward at F/m", () => {
    const fc = make({ gravity: false });
    const m0 = fc.ship.massKg;
    fc.update(1, { ...NO_INPUT, mainThrottle: 1 });
    expect(-fc.state.velocity.z).toBeCloseTo(fc.ship.mainEngines[0]!.model.thrustN / m0, 2);
  });

  it("Bennu's gravity slowly pulls a resting ship in", () => {
    const fc = make();
    for (let i = 0; i < 600; i++) fc.update(1, NO_INPUT);
    expect(fc.telemetry().closingSpeed).toBeGreaterThan(0);
    expect(fc.state.position.z).toBeLessThan(2000);
  });

  it("rotation assist stops a spin when the pilot lets go", () => {
    const fc = make();
    fc.update(2, { ...NO_INPUT, rotation: new Vec3(0, 1, 0) });
    expect(fc.state.angularVelocityBody.y).toBeGreaterThan(0.01);
    for (let i = 0; i < 30 * 60; i++) fc.update(1 / 60, NO_INPUT);
    expect(fc.state.angularVelocityBody.length()).toBeLessThan(1e-3);
  });

  it("without assist the spin keeps going (no friction in space)", () => {
    const fc = make({ assist: false });
    fc.update(2, { ...NO_INPUT, rotation: new Vec3(0, 1, 0) });
    const w = fc.state.angularVelocityBody.y;
    fc.update(10, NO_INPUT);
    expect(fc.state.angularVelocityBody.y).toBeCloseTo(w, 6);
  });

  it("telemetry reports distance to the surface and closing speed", () => {
    const fc = make({ gravity: false });
    fc.update(1, { ...NO_INPUT, mainThrottle: 1 });
    const t = fc.telemetry();
    expect(t.distanceToSurface).toBeCloseTo(fc.state.position.length() - BENNU.meanRadiusM.value, 6);
    expect(t.closingSpeed).toBeGreaterThan(0);
    expect(t.deltaV).toBeGreaterThan(0);
  });
});

describe("FlightComputer landing", () => {
  const bennu = () => new Asteroid(BENNU, Vec3.ZERO);
  const r = BENNU.meanRadiusM.value;
  const above = (h: number, vy: number) => {
    const target = bennu();
    // Start above the north pole (on the spin axis, so the ground does not move under us).
    const fc = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(new Vec3(0, r + h, 0)).withVelocity(new Vec3(0, vy, 0)), {
      gravitySources: [target],
      target,
    });
    return fc;
  };

  it("touching down gently anchors the ship", () => {
    const fc = above(1.5, -0.05);
    for (let i = 0; i < 20 * 60 && !fc.landed; i++) fc.update(1 / 60, NO_INPUT);
    expect(fc.landed).toBe(true);
    expect(fc.drainEvents()).toContain("landed");
    expect(fc.telemetry().landed).toBe(true);
  });

  it("an anchored ship turns with the asteroid and stays on the ground", () => {
    const target = bennu();
    const eq = new Vec3(r + 1.4, 0, 0);
    // Belly (body −Y) facing the ground at the equator.
    const bellyDown = Quat.fromAxisAngle(Vec3.Z, -Math.PI / 2);
    const fc = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(eq).withOrientation(bellyDown).withVelocity(target.surfaceVelocity(eq).add(new Vec3(-0.02, 0, 0))), {
      gravitySources: [target],
      target,
    });
    fc.update(0.1, NO_INPUT);
    expect(fc.landed).toBe(true);
    fc.update(600, NO_INPUT);
    expect(fc.telemetry().distanceToSurface).toBeCloseTo(target.surfaceDistance(fc.state.position, fc.simTimeS), 9);
    // Carried round by the spin: about (r + gear) · sin(ω t) towards -Z.
    const angle = target.spinRadS * fc.simTimeS;
    expect(fc.state.position.z).toBeCloseTo(-fc.state.position.length() * Math.sin(angle), 0);
  });

  it("touching down on the hull (not the legs) slides off instead of anchoring", () => {
    const target = bennu();
    const eq = new Vec3(r + 2.5, 0, 0);
    // Nose pointing at the ground: the nose reaches 2.95 m, so it touches first and nothing sinks in.
    const noseDown = Quat.fromAxisAngle(Vec3.Y, -Math.PI / 2);
    const fc = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(eq).withOrientation(noseDown).withVelocity(target.surfaceVelocity(eq).add(new Vec3(-0.05, 0, 0))), {
      gravitySources: [target],
      target,
    });
    for (let i = 0; i < 60 * 30; i++) fc.update(1 / 60, NO_INPUT);
    expect(fc.landed).toBe(false);
    expect(fc.drainEvents()).toContain("tilted");
    expect(fc.telemetry().clearance).toBeGreaterThan(-0.05);
  });

  it("the landing assist turns the belly to the ground", () => {
    const target = bennu();
    const fc = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(new Vec3(0, r + 50, 0)).withOrientation(Quat.fromAxisAngle(Vec3.X, 1.2)), {
      gravitySources: [target],
      target,
    });
    fc.landingAssist = true;
    expect(fc.telemetry().tiltDeg).toBeGreaterThan(60);
    for (let i = 0; i < 60 * 40; i++) fc.update(1 / 60, NO_INPUT);
    expect(fc.telemetry().tiltDeg).toBeLessThan(5);
  });

  it("thrusting lifts off", () => {
    const fc = above(1.5, -0.05);
    while (!fc.landed) fc.update(1 / 60, NO_INPUT);
    fc.drainEvents();
    fc.update(1, { ...NO_INPUT, translation: new Vec3(0, 1, 0) });
    expect(fc.landed).toBe(false);
    expect(fc.drainEvents()).toContain("lifted-off");
  });

  it("coming in too fast bounces or crashes and damages the hull", () => {
    const fc = above(3, -2);
    for (let i = 0; i < 120; i++) fc.update(1 / 60, NO_INPUT);
    expect(fc.drainEvents()).toContain("crashed");
    expect(fc.ship.hullIntegrity).toBeLessThan(1);
    expect(fc.landed).toBe(false);
  });
});
