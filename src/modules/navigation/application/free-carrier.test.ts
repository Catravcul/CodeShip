import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { CarrierPort } from "./carrier-trip";
import { FREE_CARRIER, FreeCarrierRun } from "./free-carrier";
import { attitudeDeg, facing } from "../domain/attitude";

const craft = (orientation: Quat, fuel = Infinity) => {
  const c = {
    position: Vec3.ZERO,
    orientation,
    fuel,
    burn(dv: number) {
      if (dv > c.fuel) return false;
      c.fuel -= dv;
      return true;
    },
    moveTo(p: Vec3, q?: Quat) {
      c.position = p;
      if (q) c.orientation = q;
    },
  };
  return c as unknown as CarrierPort & { position: Vec3; orientation: Quat; fuel: number };
};

describe("NAV-33 Starship's «Manual» is free flight by RCS taps, as Crew Dragon's: no destination", () => {
  it("a translation tap gives 0,1 m/s along that body axis; it drifts at that speed", () => {
    const c = craft(facing(new Vec3(1, 0, 0)));
    const run = new FreeCarrierRun(c);
    expect(run.translate("z", -1)).toBe(true);
    expect(run.speedMs).toBeCloseTo(FREE_CARRIER.stepMs, 9);
    expect(run.velocityBody.z).toBeCloseTo(-FREE_CARRIER.stepMs, 9);
    run.advance(100);
    // Forward is the nose (+x here): 10 m in 100 s.
    expect(c.position.x).toBeCloseTo(10, 6);
  });

  it("a rotation tap sets a rate (0,2 °/s), held until another tap; the attitude turns at it", () => {
    const c = craft(facing(new Vec3(0, 0, -1)));
    const run = new FreeCarrierRun(c);
    run.rotate("y", 1);
    expect(run.ratesDegS.y).toBeCloseTo(FREE_CARRIER.rateStepDegS, 9);
    run.advance(50);
    expect(run.attitude.yaw).toBeCloseTo(50 * FREE_CARRIER.rateStepDegS, 3);
    expect(attitudeDeg(c.orientation).pitch).toBeCloseTo(0, 6);
  });

  it("only RCS: the speed by hand tops out at 1 m/s and the rates at 1 °/s", () => {
    const run = new FreeCarrierRun(craft(Quat.IDENTITY));
    for (let i = 0; i < 10; i++) expect(run.translate("x", 1)).toBe(true);
    expect(run.translate("x", 1)).toBe(false);
    expect(run.refused).toMatch(/Automático/);
    for (let i = 0; i < 5; i++) run.rotate("x", 1);
    expect(run.rotate("x", 1)).toBe(false);
    expect(run.ratesDegS.x).toBeCloseTo(FREE_CARRIER.maxRateDegS, 9);
  });

  it("«Parar» nulls speed and rates, spending that Δv; without propellant nothing fires", () => {
    const c = craft(Quat.IDENTITY, 0.25);
    const run = new FreeCarrierRun(c);
    run.translate("y", 1);
    run.translate("y", 1);
    expect(run.stop()).toBe(false);
    expect(run.refused).toMatch(/propelente/);
    c.fuel = 1;
    expect(run.stop()).toBe(true);
    expect(run.stopped).toBe(true);
    expect(run.spentMs).toBeCloseTo(0.4, 6);
  });
});
