import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { J2000_JD, julianDateFromUtc, keplerElementsAt, positionFromElements, solveKepler, type OsculatingElements } from "./orbit";
import { PLANETS } from "../data/planets";

const earth = PLANETS.find((p) => p.id === "tierra")!;
const mars = PLANETS.find((p) => p.id === "marte")!;
const jupiter = PLANETS.find((p) => p.id === "jupiter")!;

describe("Kepler equation", () => {
  it("returns M itself for a circular orbit", () => {
    expect(solveKepler(1.2, 0)).toBeCloseTo(1.2, 12);
  });

  it("satisfies M = E - e sin E for an eccentric orbit", () => {
    const e = 0.6;
    for (const M of [-3, -1, 0.1, 2, 3.1]) {
      const E = solveKepler(M, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(M, 10);
    }
  });
});

describe("Julian date", () => {
  it("J2000.0 is 2000-01-01 12:00", () => {
    expect(julianDateFromUtc(Date.UTC(2000, 0, 1, 12))).toBe(J2000_JD);
  });
  it("counts days", () => {
    expect(julianDateFromUtc(Date.UTC(2026, 10, 12))).toBe(2461356.5);
  });
});

describe("JPL approximate planet positions (Standish, table 1)", () => {
  it("Earth sits about 0.983 AU from the Sun at J2000 (early January, near perihelion)", () => {
    const p = positionFromElements(keplerElementsAt(earth.orbit.value, J2000_JD));
    expect(p.length()).toBeCloseTo(0.9833, 3);
    // Seen from the Sun on 1 January the Earth is at ecliptic longitude ≈ 100°.
    const lon = (Math.atan2(p.y, p.x) * 180) / Math.PI;
    expect(lon).toBeGreaterThan(99);
    expect(lon).toBeLessThan(102);
    expect(Math.abs(p.z)).toBeLessThan(1e-4);
  });

  it("Earth goes round once a year", () => {
    const a = positionFromElements(keplerElementsAt(earth.orbit.value, J2000_JD));
    const b = positionFromElements(keplerElementsAt(earth.orbit.value, J2000_JD + 365.256));
    expect(a.sub(b).length()).toBeLessThan(0.001);
  });

  it("keeps Mars and Jupiter between perihelion and aphelion", () => {
    for (const [pl, q, Q] of [[mars, 1.38, 1.67], [jupiter, 4.94, 5.46]] as const) {
      for (let d = 0; d < 6000; d += 500) {
        const r = positionFromElements(keplerElementsAt(pl.orbit.value, J2000_JD + d)).length();
        expect(r).toBeGreaterThan(q);
        expect(r).toBeLessThan(Q);
      }
    }
  });
});

describe("osculating elements (JPL SBDB style)", () => {
  it("advances the mean anomaly with the mean motion", () => {
    const el: OsculatingElements = { aAU: 1, e: 0, iDeg: 0, nodeDeg: 0, periDeg: 0, meanAnomalyDeg: 0, epochJd: J2000_JD, meanMotionDegPerDay: 1 };
    const p = positionFromElements(keplerElementsAt(el, J2000_JD + 90));
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(1, 9);
  });

  it("tilts the orbit by its inclination", () => {
    const el: OsculatingElements = { aAU: 2, e: 0, iDeg: 90, nodeDeg: 0, periDeg: 90, meanAnomalyDeg: 0, epochJd: J2000_JD, meanMotionDegPerDay: 1 };
    const p = positionFromElements(keplerElementsAt(el, J2000_JD));
    expect(p.sub(new Vec3(0, 0, 2)).length()).toBeLessThan(1e-9);
  });
});
