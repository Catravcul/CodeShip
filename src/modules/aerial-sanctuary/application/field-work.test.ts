import { describe, expect, it } from "vitest";
import { FIELD } from "../data/bioma-retos";
import { advance, createBiome, GAME_DAYS_PER_YEAR } from "../domain/bioma";
import { crowdCounts } from "../domain/bioma-crowd";
import { CROWDS } from "../data/bioma-crowd";
import { fieldAct, fieldJobs } from "./field-work";

describe("s3 biome: field work at the research hut", () => {
  it("both jobs are real procedures with a source, one challenge per step, each step acted at the table", () => {
    const jobs = fieldJobs(createBiome(1));
    expect(jobs.map((j) => j.reto.procedure)).toEqual([FIELD.nidos.id, FIELD.anillar.id]);
    for (const j of jobs) {
      expect(j.reto.reality).toBe("real");
      expect(j.reto.source.length).toBeGreaterThan(30);
      expect(j.reto.chore.exercises.length).toBeGreaterThanOrEqual(6);
      j.reto.chore.exercises.forEach((_, i) => expect(fieldAct(j.reto.procedure!, i).length).toBe(1));
    }
  });

  it("the nest count asks for the colony's real total while the gentoos sit; closed with no nests", () => {
    const st = createBiome(1);
    advance(st, (GAME_DAYS_PER_YEAR * 20) / 365);
    const n = crowdCounts(st, CROWDS[0]!).nests;
    const [count] = fieldJobs(st);
    if (n > 0) {
      expect(count!.open).toBe(true);
      const last = count!.reto.chore.exercises.at(-1)!;
      expect(JSON.stringify(last)).toContain(String(n));
    }
    // Winter (July): no nests, the count waits for its season.
    advance(st, (GAME_DAYS_PER_YEAR * 210) / 365);
    const w = fieldJobs(st)[0]!;
    expect(w.open).toBe(false);
    expect(w.why).toMatch(/incubación/);
  });
});
