import { describe, expect, it } from "vitest";
import { relativeDose } from "@modules/mothership/domain/equipment";
import { SHIELD_WHIPPLE } from "@modules/ship/data/equipment";
import { BLAST, fragmentEnergyOnTargetJ, gurneySphereSpeedMs, nuclearEnergyOnTargetJ, volatileCharge } from "./blast";
import { escapeImpossible, gripAccelMs2, gripRadiusM } from "./grip";
import { HULL_ENERGY_J, impactFraction, wallDebrisFactor, whippleDebrisFactor, type Protection } from "./protection";
import { pulseDoseMSv, shieldedDoseMSv } from "./radiation";

describe("explosives in vacuum: a fragment cloud", () => {
  it("Gurney: a bare charge throws at √(2E)/√0,6, and a heavier casing slows the fragments", () => {
    expect(gurneySphereSpeedMs(BLAST.tntGurneyMs, 0, 1)).toBeCloseTo(2440 / Math.sqrt(0.6), 3);
    expect(gurneySphereSpeedMs(2440, 10, 1)).toBeLessThan(gurneySphereSpeedMs(2440, 1, 1));
  });

  it("a Bennu-like charge (8 % volatiles) throws fragments at a couple of hundred m/s", () => {
    const c = volatileCharge(40, 0.082);
    expect(c.speedMs).toBeGreaterThan(150);
    expect(c.speedMs).toBeLessThan(300);
  });

  it("the cloud thins with the inverse square of the distance", () => {
    const c = volatileCharge(40, 0.082);
    const near = fragmentEnergyOnTargetJ(c, 20, 2);
    expect(fragmentEnergyOnTargetJ(c, 40, 2)).toBeCloseTo(near / 4, 6);
    expect(nuclearEnergyOnTargetJ(200, 2)).toBeCloseTo(nuclearEnergyOnTargetJ(100, 2) / 4, 3);
  });
});

describe("protection", () => {
  const bare: Protection = { hullEnergyJ: HULL_ENERGY_J.aterrizador, debrisFactor: 1 };
  it("a Whipple shield cuts fragment damage (real critical diameters) but not a blunt block", () => {
    const k = whippleDebrisFactor((4 / 1.3) * 0.95 * (2.84 / 2.7) / 10, SHIELD_WHIPPLE.bumper!);
    expect(k).toBeLessThan(0.2);
    const shielded: Protection = { ...bare, debrisFactor: k };
    expect(impactFraction(20_000, shielded, false)).toBeCloseTo(0.1 * k, 6);
    expect(impactFraction(20_000, shielded, true)).toBeCloseTo(0.1, 6);
  });

  it("a 20 g/cm² water wall stops much more than the lander's cabin wall", () => {
    expect(wallDebrisFactor(20)).toBeLessThan(0.05);
  });
});

describe("radiation and grip", () => {
  it("pulse dose spreads with the inverse square and the existing shield model cuts it", () => {
    expect(pulseDoseMSv(1000, 2000, 1)).toBeCloseTo(pulseDoseMSv(1000, 1000, 1) / 4);
    const behindWater = shieldedDoseMSv(100, { material: "agua", arealDensityGcm2: 20 });
    expect(behindWater).toBeCloseTo(100 * relativeDose("agua", 20));
    expect(behindWater).toBeLessThan(60);
  });

  it("near Ceres the grip beats a lander's 0,33 m/s² engine; beyond the grip radius it is nothing", () => {
    const g = 0.284;
    const R = 469730;
    expect(escapeImpossible(0.33, g, R, R * 1.2, 1)).toBe(true);
    expect(gripAccelMs2(g, R, gripRadiusM(R) + 1, 1)).toBe(0);
    expect(escapeImpossible(0.33, g, R, R * 1.2, 0.2)).toBe(false);
  });
});
