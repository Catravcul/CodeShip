import { describe, expect, it } from "vitest";
import { FIELD } from "../data/bioma-retos";
import { advance, createBiome, stageOfIndividual, GAME_DAYS_PER_YEAR } from "../domain/bioma";
import { crowdCounts } from "../domain/bioma-crowd";
import { CROWDS } from "../data/bioma-crowd";
import { fieldAct, fieldJobs } from "./field-work";

const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;

describe("s3 biome: the entomologists' field work at the research hut", () => {
  it("the three jobs are real procedures with a source, one challenge per step, each step acted at the table", () => {
    const jobs = fieldJobs(createBiome(1));
    expect(jobs.map((j) => j.reto.procedure)).toEqual([FIELD.colmenas.id, FIELD.mariposas.id, FIELD.trampas.id]);
    for (const j of jobs) {
      expect(j.reto.reality).toBe("real");
      expect(j.reto.source.length).toBeGreaterThan(30);
      expect(j.reto.chore.exercises.length).toBeGreaterThanOrEqual(6);
      j.reto.chore.exercises.forEach((_, i) => expect(fieldAct(j.reto.procedure!, i).length).toBe(1));
    }
  });

  it("in November the hives are checked and ask for the island's hives; the Apollo transect waits for summer", () => {
    const st = createBiome(1);
    const [hives, walk] = fieldJobs(st);
    const n = crowdCounts(st, crowd("abeja")).nests;
    expect(hives!.open).toBe(true);
    expect(hives!.total).toBe(n);
    expect(JSON.stringify(hives!.reto.chore.exercises.at(-1))).toContain(String(n));
    expect(walk!.open).toBe(false);
    expect(walk!.why).toMatch(/verano/);
  });

  it("in July the transect counts the Apollos of the chain", () => {
    const st = createBiome(2);
    advance(st, (GAME_DAYS_PER_YEAR * 240) / 365);
    const walk = fieldJobs(st)[1]!;
    const n = st.animals.filter((a) => a.species === "mariposa" && !a.dead && ["adulto", "anciano"].includes(stageOfIndividual(a))).length;
    expect(walk.total).toBe(n);
    if (n > 0) expect(walk.open).toBe(true);
  });
});
