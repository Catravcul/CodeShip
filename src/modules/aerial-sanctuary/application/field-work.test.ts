import { describe, expect, it } from "vitest";
import { FIELD } from "../data/bioma-retos";
import { advance, createBiome, GAME_DAYS_PER_YEAR } from "../domain/bioma";
import { crowdCounts } from "../domain/bioma-crowd";
import { CROWDS } from "../data/bioma-crowd";
import { fieldAct, fieldJobs } from "./field-work";

const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;

describe("s3 biome: Himalayan field work at the research hut", () => {
  it("the three jobs are real procedures with a source, one challenge per step, each step acted at the table", () => {
    const jobs = fieldJobs(createBiome(1));
    expect(jobs.map((j) => j.reto.procedure)).toEqual([FIELD.camaras.id, FIELD.doble.id, FIELD.buitres.id]);
    for (const j of jobs) {
      expect(j.reto.reality).toBe("real");
      expect(j.reto.source.length).toBeGreaterThan(30);
      expect(j.reto.chore.exercises.length).toBeGreaterThanOrEqual(6);
      j.reto.chore.exercises.forEach((_, i) => expect(fieldAct(j.reto.procedure!, i).length).toBe(1));
    }
  });

  it("the double-observer count asks for the ibex the island shows; the cameras wait for winter", () => {
    const st = createBiome(1);
    const [cams, count] = fieldJobs(st);
    const c = crowdCounts(st, crowd("ibice"));
    expect(count!.open).toBe(true);
    expect(count!.total).toBe(c.adults + c.young);
    expect(JSON.stringify(count!.reto.chore.exercises.at(-1))).toContain(String(c.adults + c.young));
    // 20 November: no camera season yet.
    expect(cams!.open).toBe(false);
    expect(cams!.why).toMatch(/enero a marzo/);
    // Mid January: the cameras are checked and ask for the chain's leopards.
    advance(st, (GAME_DAYS_PER_YEAR * 56) / 365);
    const jan = fieldJobs(st)[0]!;
    expect(jan.open).toBe(true);
    expect(jan.total).toBe(st.animals.filter((a) => a.species === "leopardo" && !a.dead).length);
  });

  it("the griffon nests are followed while they are sat; closed in autumn", () => {
    const st = createBiome(2);
    advance(st, (GAME_DAYS_PER_YEAR * 75) / 365);
    const n = crowdCounts(st, crowd("buitre")).nests;
    const job = fieldJobs(st)[2]!;
    if (n > 0) expect(job.open).toBe(true);
    advance(st, (GAME_DAYS_PER_YEAR * 240) / 365);
    const oct = fieldJobs(st)[2]!;
    expect(oct.open).toBe(false);
    expect(oct.why).toMatch(/diciembre/);
  });
});
