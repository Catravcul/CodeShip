import { describe, expect, it } from "vitest";
import { BELTS, BIOME_ZONES, MOUNTAIN, beltAt } from "../data/bioma-island";
import { altitudeOf, beltOf, gorgeAt, heightAt, heightOfAltitude, slopeAt, tempAtAltitude, walkableAt } from "./mountain";

const M = MOUNTAIN.value;

describe("the mountain of the air island", () => {
  it("rises from the sea to a summit of ~5 000 m real, with the real belts from the steppe to the snows", () => {
    expect(heightAt(M, M.peak.x, M.peak.z)).toBeGreaterThan(480);
    expect(heightAt(M, 0, -M.half.z * 1.1)).toBeLessThan(-0.6);
    expect(altitudeOf(M, heightAt(M, M.peak.x, M.peak.z))).toBeGreaterThan(5000);
    expect(heightOfAltitude(M, altitudeOf(M, 100))).toBeCloseTo(100);
    const belts = new Set(BIOME_ZONES.map((z) => beltAt(z.point.x, z.point.z).belt.id));
    for (const b of BELTS) expect(belts, b.id).toContain(b.id);
    expect(beltOf(BELTS, 2500).id).toBe("submontano");
    expect(beltOf(BELTS, 5300).id).toBe("nival");
  });

  it("has a ring of cliffs too steep to walk, and a gorge cut deep to its river", () => {
    // Straight down from the summit to the south: somewhere a cliff steeper than 60°.
    let steepest = 0;
    for (let z = M.peak.z - 160; z > M.peak.z - 240; z -= 2) steepest = Math.max(steepest, slopeAt(M, M.peak.x, z));
    expect(steepest).toBeGreaterThan(Math.tan((60 * Math.PI) / 180));
    // The gorge at its lookout: the river ~150 m below the rim.
    const g = gorgeAt(M, -380, 160);
    expect(g.q).toBeLessThan(1);
    expect(heightAt(M, -380, 160)).toBeCloseTo(g.floor, 0);
    expect(heightAt(M, -355, 92) - heightAt(M, -380, 160)).toBeGreaterThan(140);
  });

  it("every trail can be walked from end to end, and the station's flat is level", () => {
    for (const t of M.trails!)
      for (let i = 1; i < t.length; i++)
        for (let u = 0; u <= 1; u += 0.02) {
          const x = t[i - 1]!.x + (t[i]!.x - t[i - 1]!.x) * u;
          const z = t[i - 1]!.z + (t[i]!.z - t[i - 1]!.z) * u;
          expect(walkableAt(M, x, z), `(${x.toFixed(0)}, ${z.toFixed(0)})`).toBe(true);
        }
    expect(heightAt(M, -165, -476)).toBe(6);
    expect(heightAt(M, -130, -465)).toBe(6);
  });

  it("is the same every time (deterministic noise)", () => {
    expect(heightAt(M, 123.4, -56.7)).toBe(heightAt(M, 123.4, -56.7));
  });

  it("cools 6,5 °C per km up (ICAO standard atmosphere)", () => {
    expect(tempAtAltitude(20, 1500, 2500)).toBeCloseTo(13.5);
  });
});
