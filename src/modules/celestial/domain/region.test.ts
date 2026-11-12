import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "./asteroid";
import { BOUNDARY_PUSH_MS2, Region, type RegionData, type Rock } from "./region";
import { skyFrom, type Sky } from "./sky";
import { BENNU } from "../data/bennu";
import { NUEVA_POLANA, POLANA_MEMBERS, POLANA_PLACEMENTS_M } from "../data/nueva-polana";

const DEG = 180 / Math.PI;
const data: RegionData = { ...NUEVA_POLANA, boundaryRadiusM: 10_000, warningBandM: 2_000 };
const bennu = new Asteroid(BENNU, Vec3.ZERO);
const other = new Asteroid(BENNU, new Vec3(5000, 0, 0));
const rock: Rock = { position: new Vec3(0, 3000, 0), radiusM: 20, spectralType: "C", albedo: 0.05, seed: 1 };
const region = new Region(data, [bennu, other], [rock]);

describe("where the region is", () => {
  it("follows 142 Polana's orbit: between its perihelion (2,10 AU) and aphelion (2,74 AU)", () => {
    const r = region.heliocentricAU().length();
    expect(r).toBeGreaterThan(2.09);
    expect(r).toBeLessThan(2.75);
  });

  it("puts the Sun where the region says, in the game frame", () => {
    const sun = region.sky().sun.direction;
    expect(sun.sub(data.sunDirectionGame.normalize()).length()).toBeLessThan(1e-9);
  });

  it("rotates the sky rigidly: angles between bodies stay true", () => {
    const turned = region.sky();
    const raw = skyFrom(region.heliocentricAU(), region.julianDate);
    const angle = (s: Sky, a: string, b: string) => {
      const pa = s.planets.find((p) => p.id === a)!.direction;
      const pb = s.planets.find((p) => p.id === b)!.direction;
      return Math.acos(Math.min(1, pa.dot(pb)));
    };
    expect(angle(turned, "jupiter", "saturno")).toBeCloseTo(angle(raw, "jupiter", "saturno"), 9);
    expect(angle(turned, "tierra", "marte")).toBeCloseTo(angle(raw, "tierra", "marte"), 9);
    for (const p of turned.planets) expect(p.direction.length()).toBeCloseTo(1, 9);
  });

  it("keeps ecliptic north on the game's upper side, so the planets lie along a band through the Sun", () => {
    expect(region.toGame(Vec3.Z).y).toBeGreaterThan(0);
  });

  it("the Sun looks about 0,2° wide from here", () => {
    const deg = region.sky().sun.angularDiameterRad * DEG;
    expect(deg).toBeGreaterThan(0.18);
    expect(deg).toBeLessThan(0.26);
  });
});

describe("flyable boundary", () => {
  it("classifies inside, warning band and outside", () => {
    expect(region.boundary(new Vec3(0, 0, 7000)).zone).toBe("inside");
    expect(region.boundary(new Vec3(0, 0, 9000)).zone).toBe("warning");
    expect(region.boundary(new Vec3(0, 0, 10500)).zone).toBe("outside");
    expect(region.boundary(new Vec3(0, 0, 9000)).toEdgeM).toBeCloseTo(1000, 9);
  });

  it("does nothing well inside", () => {
    expect(region.boundaryPush(new Vec3(0, 0, 7000), new Vec3(0, 0, 5), 1).length()).toBe(0);
  });

  it("pushes gently toward the centre in the band, harder near the edge", () => {
    const soft = region.boundaryPush(new Vec3(0, 0, 8500), Vec3.ZERO, 1);
    const hard = region.boundaryPush(new Vec3(0, 0, 9900), Vec3.ZERO, 1);
    expect(soft.z).toBeLessThan(0);
    expect(hard.z).toBeLessThan(soft.z);
    expect(-hard.z).toBeLessThanOrEqual(BOUNDARY_PUSH_MS2);
  });

  it("past the edge cancels the outward velocity but keeps the sideways one", () => {
    const dv = region.boundaryPush(new Vec3(0, 0, 10_200), new Vec3(3, 0, 4), 0.01);
    const v = new Vec3(3, 0, 4).add(dv);
    expect(v.z).toBeLessThanOrEqual(0);
    expect(v.x).toBeCloseTo(3, 9);
  });

  it("a ship burning its main engine straight out never gets far past the edge", () => {
    let p = new Vec3(0, 0, 5000);
    let v = new Vec3(0, 0, 20);
    let maxD = 0;
    const dt = 1 / 30;
    for (let t = 0; t < 3000; t += dt) {
      v = v.add(new Vec3(0, 0, 0.7 * dt)); // R-4D on a 670 kg ship
      v = v.add(region.boundaryPush(p, v, dt));
      p = p.add(v.scale(dt));
      maxD = Math.max(maxD, p.length());
    }
    expect(maxD).toBeLessThan(data.boundaryRadiusM + 50);
  });
});

describe("other bodies in the field", () => {
  it("stops the ship flying into a rock, but lets it leave", () => {
    const near = new Vec3(0, 3000 - 25, 0);
    const dvIn = region.avoidObstacles(near, new Vec3(0, 2, 0));
    expect(dvIn.y).toBeCloseTo(-2, 9);
    expect(region.avoidObstacles(near, new Vec3(0, -2, 0)).length()).toBe(0);
  });

  it("ignores the target: landing on it is real contact", () => {
    expect(region.avoidObstacles(new Vec3(0, 0, 250), new Vec3(0, 0, -1)).length()).toBe(0);
  });

  it("treats the other catalogued asteroids as obstacles", () => {
    expect(region.avoidObstacles(new Vec3(5300, 0, 0), new Vec3(-1, 0, 0)).x).toBeCloseTo(1, 9);
  });

  it("finds the nearest asteroid by distance to its surface", () => {
    const n = region.nearestAsteroid(new Vec3(4000, 0, 0));
    expect(n.asteroid).toBe(other);
    expect(n.distanceM).toBeCloseTo(1000 - BENNU.meanRadiusM.value, 6);
  });
});

describe("New Polana region data", () => {
  it("places every member inside the boundary with room around it", () => {
    for (const m of POLANA_MEMBERS) {
      const p = POLANA_PLACEMENTS_M[m.id]!;
      expect(p.length() + m.meanRadiusM.value * 1.5).toBeLessThan(NUEVA_POLANA.boundaryRadiusM - NUEVA_POLANA.warningBandM);
      expect(p.length()).toBeGreaterThan(4000);
    }
  });

  it("members are the size NEOWISE measured: 1,2–2,5 km", () => {
    for (const m of POLANA_MEMBERS) {
      expect(m.meanRadiusM.value * 2).toBeGreaterThan(1100);
      expect(m.meanRadiusM.value * 2).toBeLessThan(2500);
      expect(m.meanRadiusM.source).toMatch(/^https:\/\/ssd-api\.jpl\.nasa\.gov/);
    }
  });

  it("every member's mass agrees with its size and assumed density", () => {
    for (const m of POLANA_MEMBERS) {
      const v = (4 / 3) * Math.PI * m.meanRadiusM.value ** 3;
      expect(m.massKg.value / v).toBeCloseTo(m.densityKgM3.value, 6);
    }
  });
});
