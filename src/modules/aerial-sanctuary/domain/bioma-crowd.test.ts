import { describe, expect, it } from "vitest";
import { BIOME } from "../data/bioma";
import { CROWDS, DENSITY } from "../data/bioma-crowd";
import { inside } from "../data/bioma-island";
import { advance, createBiome, stageOfIndividual, GAME_DAYS_PER_YEAR } from "./bioma";
import { crowdCounts } from "./bioma-crowd";

const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;

describe("s3 biome: the colonies the chain stands for", () => {
  it("every colony size has its source, every crowd its reason, and every patch is on the island", () => {
    for (const f of Object.values(DENSITY)) expect(f.source.length).toBeGreaterThan(20);
    for (const c of CROWDS) {
      expect(c.why.length).toBeGreaterThan(10);
      expect(c.here).toHaveLength(12);
      const s = BIOME.find((x) => x.id === c.species);
      expect(s && s.kind === "animal" && s.social, c.species).toBeTruthy();
      for (const p of c.patches) expect(inside(p.x, p.z), `${c.species} (${p.x}, ${p.z})`).toBe(true);
    }
  });

  it("only colonies: one nest per queen of the chain, its workers by the scale factor", () => {
    const st = createBiome(1);
    const c = crowdCounts(st, crowd("abeja"));
    const queens = st.animals.filter((a) => a.species === "abeja" && a.female && ["adulto", "anciano"].includes(stageOfIndividual(a))).length;
    expect(c.nests).toBe(queens);
    expect(c.adults).toBeGreaterThan(0);
    expect(c.adults).toBeLessThanOrEqual(queens * crowd("abeja").perAdult);
  });

  it("the bumblebees overwinter: in November no nest and no worker; in July their nests buzz", () => {
    const st = createBiome(2);
    const nov = crowdCounts(st, crowd("abejorro"));
    expect(nov.asleep).toBe(true);
    expect(nov.adults + nov.nests).toBe(0);
    advance(st, GAME_DAYS_PER_YEAR * (7.5 / 12));
    const jul = crowdCounts(st, crowd("abejorro"));
    expect(jul.asleep).toBe(false);
    expect(jul.nests).toBeGreaterThan(0);
    expect(jul.adults).toBeGreaterThan(0);
  });
});
