import { describe, expect, it } from "vitest";
import { BIOME, type AnimalSpec } from "../data/bioma";
import { CROWDS, DENSITY } from "../data/bioma-crowd";
import { advance, count, createBiome, mass, GAME_DAYS_PER_YEAR } from "./bioma";
import { crowdCounts, moultShare, nestPhase } from "./bioma-crowd";

const spec = (id: string) => BIOME.find((s) => s.id === id) as AnimalSpec;
const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;
/** Day-of-year of a date (no leap years). */
const doy = (m: number, d: number) => [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m - 1]! + d - 1;

describe("s3 biome: the crowds the chain stands for", () => {
  it("every density has its source and every crowd its reason", () => {
    for (const f of Object.values(DENSITY)) expect(f.source.length).toBeGreaterThan(20);
    for (const c of CROWDS) {
      expect(c.why.length).toBeGreaterThan(10);
      expect(c.ashore).toHaveLength(12);
      expect(BIOME.some((s) => s.id === c.species)).toBe(true);
    }
  });

  it("gentoo nests follow the real calendar: built, eggs in November, chicks to February, empty in winter", () => {
    const p = spec("papua");
    expect(nestPhase(p, doy(11, 1))).toBe("nidos");
    expect(nestPhase(p, doy(11, 25))).toBe("huevos");
    expect(nestPhase(p, doy(1, 20))).toBe("pollos");
    expect(nestPhase(p, doy(7, 1))).toBe("sin-nidos");
  });

  it("the albatross chick sits on its mud nest through the winter; the petrel's egg is in its crevice in December", () => {
    expect(nestPhase(spec("albatros"), doy(1, 5))).toBe("huevos");
    expect(nestPhase(spec("albatros"), doy(7, 1))).toBe("pollos");
    expect(nestPhase(spec("damero"), doy(12, 20))).toBe("huevos");
    expect(nestPhase(spec("damero"), doy(7, 1))).toBe("sin-nidos");
  });

  it("gentoos moult once their chicks have gone (25 days); elephant seals in summer, none in winter", () => {
    const year = Array.from({ length: 365 }, (_, d) => moultShare("papua", d));
    expect(year.filter((v) => v > 0).length).toBe(25);
    expect(moultShare("papua", doy(12, 1))).toBe(0);
    expect(moultShare("elefante", doy(2, 1))).toBeGreaterThan(0.5);
    expect(moultShare("elefante", doy(7, 1))).toBe(0);
  });

  it("the crowd is the chain's numbers by the scale factor: hundreds of gentoos, eggs only on sitting females", () => {
    const st = createBiome(1);
    const c = crowdCounts(st, crowd("papua"));
    const adults = st.animals.filter((a) => a.species === "papua").length;
    expect(c.adults).toBe(Math.round(adults * 50));
    expect(c.adults).toBeGreaterThan(500);
    // A month and a half on (early January): the chain's chicks are drawn ×50 in their nests.
    advance(st, (GAME_DAYS_PER_YEAR * 45) / 365);
    const j = crowdCounts(st, crowd("papua"));
    const chicks = st.animals.filter((a) => a.species === "papua" && !a.dead && a.age < 85).length;
    expect(j.young).toBe(Math.round(chicks * 50));
    if (j.phase === "pollos") expect(j.nests).toBeGreaterThanOrEqual(Math.ceil(j.young / 2));
    // Seals have no nests.
    expect(crowdCounts(st, crowd("lobo")).nests).toBe(0);
  });

  it("an empty chain draws no crowd", () => {
    const st = createBiome(1);
    for (const a of st.animals) if (a.species === "papua") a.dead = "vejez";
    const c = crowdCounts(st, crowd("papua"));
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

  it("masses: kg up to a tonne, then tonnes with two figures («≈ 800 000 t» of krill)", () => {
    expect(mass(798_752_200)).toBe("800 000 t");
    expect(mass(3460)).toBe("3,5 t");
    expect(mass(5.5)).toBe("6 kg");
    expect(mass(0.08)).toBe("80 g");
  });
});
