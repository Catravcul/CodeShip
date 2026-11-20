import { describe, expect, it } from "vitest";
import { BIOME, type AnimalSpec } from "../data/bioma";
import { CROWDS, DENSITY } from "../data/bioma-crowd";
import { inside } from "../data/bioma-island";
import { advance, count, createBiome, mass, GAME_DAYS_PER_YEAR } from "./bioma";
import { crowdCounts, nestPhase } from "./bioma-crowd";

const spec = (id: string) => BIOME.find((s) => s.id === id) as AnimalSpec;
const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;
/** Day-of-year of a date (no leap years). */
const doy = (m: number, d: number) => [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m - 1]! + d - 1;

describe("s3 biome: the crowds the chain stands for", () => {
  it("every group size has its source, every crowd its reason, and every patch is on the island", () => {
    for (const f of Object.values(DENSITY)) expect(f.source.length).toBeGreaterThan(20);
    for (const c of CROWDS) {
      expect(c.why.length).toBeGreaterThan(10);
      expect(c.here).toHaveLength(12);
      expect(BIOME.some((s) => s.id === c.species), c.species).toBe(true);
      for (const p of c.patches) expect(inside(p.x, p.z), `${c.species} (${p.x}, ${p.z})`).toBe(true);
    }
  });

  it("the griffons sit their egg in winter (laying from late December) and have a chick on the ledge in spring", () => {
    const g = spec("buitre");
    expect(nestPhase(g, doy(2, 1))).toBe("huevos");
    expect(nestPhase(g, doy(5, 1))).toBe("pollos");
    expect(nestPhase(g, doy(10, 1))).toBe("sin-nidos");
  });

  it("the crowd is the chain's numbers by the scale factor; the hoofed have no nests", () => {
    const st = createBiome(1);
    const c = crowdCounts(st, crowd("ibice"));
    const adults = st.animals.filter((a) => a.species === "ibice").length;
    expect(c.adults).toBe(Math.round(adults * 2));
    expect(c.adults).toBeGreaterThanOrEqual(DENSITY.ibexHerd.value.min * 2);
    expect(c.nests).toBe(0);
  });

  it("the marmots sleep in their burrows from September to April: the burrows stand, none is seen", () => {
    const st = createBiome(1);
    const w = crowdCounts(st, crowd("marmota"));
    expect(w.asleep).toBe(true);
    expect(w.adults).toBe(0);
    expect(w.nests).toBeGreaterThan(0);
    // To mid June: awake, with their young.
    advance(st, (GAME_DAYS_PER_YEAR * 205) / 365);
    const j = crowdCounts(st, crowd("marmota"));
    expect(j.asleep).toBe(false);
    expect(j.adults).toBeGreaterThan(0);
  });

  it("an empty chain draws no crowd", () => {
    const st = createBiome(1);
    for (const a of st.animals) if (a.species === "buitre") a.dead = "vejez";
    const c = crowdCounts(st, crowd("buitre"));
    expect(c.adults + c.young + c.eggs + c.nests).toBe(0);
  });
});

describe("s3 biome: big numbers read well on a phone", () => {
  it("counts: grouped, then millions, thousands of millions and billones", () => {
    expect(count(12)).toBe("12");
    expect(count(3400)).toBe("3 400");
    expect(count(2_404_069_200_000)).toBe("2,4 billones");
    expect(count(2_400_000_000)).toBe("2,4 mil millones");
    expect(count(1_250_000)).toBe("1,3 millones");
  });

  it("masses: kg up to a tonne, then tonnes with two figures ", () => {
    expect(mass(798_752_200)).toBe("800 000 t");
    expect(mass(3460)).toBe("3,5 t");
    expect(mass(5.5)).toBe("6 kg");
    expect(mass(0.08)).toBe("80 g");
  });
});
