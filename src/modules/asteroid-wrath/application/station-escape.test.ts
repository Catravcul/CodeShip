import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { G0 } from "@core/units";
import { POLANA_DRIVE } from "@modules/station/data/drive";
import { totalThrustN } from "@modules/station/domain/drive";
import { StationEscape } from "./station-escape";

const flee = (distanceM: number) => ({ asteroidId: "x", asteroidName: "x", direction: new Vec3(1, 0, 0), distanceM, timeToCalmS: 100, trapped: false });

describe("station escape (survival mode)", () => {
  it("two Zvezda-class engines push ~110 t at about 0,055 m/s²", () => {
    const s = new StationEscape(POLANA_DRIVE, Vec3.ZERO);
    expect(totalThrustN(POLANA_DRIVE)).toBe(6180);
    expect(s.accelMs2).toBeCloseTo(6180 / 112_000, 6);
    expect(s.deltaVMs).toBeCloseTo(293.7 * G0 * Math.log(112 / 110), 3);
  });

  it("flees along the guidance, burns propellant at F/(Isp·g0), then brakes to rest", () => {
    const s = new StationEscape(POLANA_DRIVE, Vec3.ZERO);
    for (let i = 0; i < 100; i++) s.update(1, flee(5000));
    expect(s.state).toBe("huyendo");
    expect(s.position.x).toBeGreaterThan(200);
    const burned = POLANA_DRIVE.propellantKg.value - s.propellantKg;
    expect(burned).toBeCloseTo((6180 / (293.7 * G0)) * 100, 0);
    for (let i = 0; i < 200; i++) s.update(1, null);
    expect(s.state).toBe("en-reposo");
    expect(s.velocity.length()).toBe(0);
  });

  it("with dry tanks it can no longer move", () => {
    const s = new StationEscape({ ...POLANA_DRIVE, propellantKg: { ...POLANA_DRIVE.propellantKg, value: 0 } }, Vec3.ZERO);
    s.update(1, flee(1000));
    expect(s.state).toBe("sin-propelente");
    expect(s.position.length()).toBe(0);
  });
});
