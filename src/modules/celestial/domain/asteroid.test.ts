import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "./asteroid";
import { BENNU } from "../data/bennu";

describe("Asteroid", () => {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);

  it("Bennu's GM is about 4.89 m^3/s^2", () => {
    expect(bennu.mu).toBeCloseTo(4.89, 2);
  });

  it("gravity points to the centre and falls with distance squared", () => {
    const g1 = bennu.gravityAt(new Vec3(1000, 0, 0));
    const g2 = bennu.gravityAt(new Vec3(2000, 0, 0));
    expect(g1.x).toBeLessThan(0);
    expect(g1.length() / g2.length()).toBeCloseTo(4, 6);
  });

  it("does not blow up at the centre", () => {
    expect(Number.isFinite(bennu.gravityAt(Vec3.ZERO).length())).toBe(true);
  });

  it("spins once every 4.296 hours", () => {
    expect(bennu.spinRadS * 4.296057 * 3600).toBeCloseTo(2 * Math.PI, 9);
  });

  it("estimates resources from composition", () => {
    expect(bennu.materialKg("Carbon")).toBeCloseTo(7.329e10 * 0.046, -6);
    expect(bennu.materialKg("Unobtainium")).toBe(0);
  });

  it("Bennu's mass, mean radius and density agree within 10%", () => {
    const volume = (4 / 3) * Math.PI * BENNU.meanRadiusM.value ** 3;
    expect(BENNU.massKg.value / volume / BENNU.densityKgM3.value).toBeGreaterThan(0.9);
    expect(BENNU.massKg.value / volume / BENNU.densityKgM3.value).toBeLessThan(1.1);
  });
});
