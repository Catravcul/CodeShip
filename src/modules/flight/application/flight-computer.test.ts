import { describe, expect, it } from "vitest";
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
    expect(-fc.state.velocity.z).toBeCloseTo(490 / m0, 2);
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
