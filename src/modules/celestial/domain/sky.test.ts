import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { angularDiameterRad, phaseAngleDeg, skyFrom, sunAsSeenFrom } from "./sky";
import { julianDateFromUtc, keplerElementsAt, positionFromElements } from "./orbit";
import { PLANETS } from "../data/planets";

const DEG = 180 / Math.PI;
const ARCSEC = DEG * 3600;

describe("angular size", () => {
  it("the Sun is about 32 arcminutes wide from 1 AU", () => {
    expect(sunAsSeenFrom(new Vec3(1, 0, 0)).angularDiameterRad * DEG * 60).toBeCloseTo(31.98, 1);
  });

  it("shrinks with distance: about 0.22° from the inner main belt", () => {
    expect(sunAsSeenFrom(new Vec3(2.42, 0, 0)).angularDiameterRad * DEG).toBeCloseTo(0.22, 2);
  });

  it("uses the exact formula, not the small-angle one, up close", () => {
    expect(angularDiameterRad(1, 1)).toBeCloseTo(Math.PI, 9);
  });
});

describe("brightness", () => {
  it("the Sun is magnitude −26.74 from 1 AU and fades with the inverse square", () => {
    expect(sunAsSeenFrom(new Vec3(0, 1, 0)).magnitude).toBeCloseTo(-26.74, 6);
    expect(sunAsSeenFrom(new Vec3(0, 2.42, 0)).magnitude).toBeCloseTo(-26.74 + 5 * Math.log10(2.42), 6);
  });

  it("phase angle is 0 at opposition and 90° at quadrature", () => {
    expect(phaseAngleDeg(new Vec3(5, 0, 0), new Vec3(1, 0, 0))).toBeCloseTo(0, 9);
    expect(phaseAngleDeg(new Vec3(1, 0, 0), new Vec3(1, 1, 0))).toBeCloseTo(90, 9);
  });
});

describe("the sky from Earth (sanity check against the real 2026 sky)", () => {
  // Jupiter was at opposition on 10 January 2026, at magnitude about −2.7 and ~46" across.
  const jd = julianDateFromUtc(Date.UTC(2026, 0, 10));
  const earth = positionFromElements(keplerElementsAt(PLANETS.find((p) => p.id === "tierra")!.orbit.value, jd));
  const sky = skyFrom(earth, jd);
  const jupiter = sky.planets.find((p) => p.id === "jupiter")!;

  it("leaves out the planet the observer stands on", () => {
    expect(sky.planets.some((p) => p.id === "tierra")).toBe(false);
    expect(sky.planets).toHaveLength(7);
  });

  it("puts Jupiter opposite the Sun", () => {
    const elongation = Math.acos(jupiter.direction.dot(sky.sun.direction)) * DEG;
    expect(elongation).toBeGreaterThan(170);
  });

  it("gives Jupiter its real brightness and size", () => {
    expect(jupiter.magnitude).toBeGreaterThan(-2.9);
    expect(jupiter.magnitude).toBeLessThan(-2.5);
    expect(jupiter.angularDiameterRad * ARCSEC).toBeGreaterThan(44);
    expect(jupiter.angularDiameterRad * ARCSEC).toBeLessThan(48);
  });

  it("returns unit directions", () => {
    for (const p of [sky.sun, ...sky.planets]) expect(p.direction.length()).toBeCloseTo(1, 9);
  });
});

describe("the sky from the inner main belt", () => {
  const sky = skyFrom(new Vec3(2.42, 0, 0), julianDateFromUtc(Date.UTC(2026, 10, 12)));

  it("shows all eight planets", () => {
    expect(sky.planets).toHaveLength(8);
  });

  it("keeps the Earth within 25° of the Sun (max elongation asin(1/2.42))", () => {
    const earth = sky.planets.find((p) => p.id === "tierra")!;
    expect(Math.acos(earth.direction.dot(sky.sun.direction)) * DEG).toBeLessThan(25);
  });

  it("every planet is smaller than 2 arcminutes: points, not discs, to the eye", () => {
    for (const p of sky.planets) expect(p.angularDiameterRad * DEG * 60).toBeLessThan(2);
  });
});
