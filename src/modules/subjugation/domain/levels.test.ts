import { describe, expect, it } from "vitest";
import { duelProfileFor } from "@modules/mind-duel/domain/difficulty";
import { Rapport, stageDuelProfile } from "./rapport";
import { LEVEL_JOB, LEVEL_TUNING, LEVELS, levelDuelProfile } from "./levels";

const base = duelProfileFor({ massKg: 7.3e10, richness: 0.4 });

/** An asteroid that went through the three stages without a single failure. */
function subjugated(): Rapport {
  const r = new Rapport("a");
  r.succeed("sonda");
  r.succeed("nave");
  r.succeed("traje");
  return r;
}

describe("subjugation levels", () => {
  it("no level before the three stages; level 1 on offer once it obeys", () => {
    const r = new Rapport("a");
    expect(r.level).toBe(0);
    expect(r.nextLevel).toBeUndefined();
    expect(r.canAttemptLevel(1)).toBe(false);
    r.succeed("sonda");
    r.succeed("nave");
    expect(r.nextLevel).toBeUndefined();
    r.succeed("traje");
    expect(r.nextLevel).toBe(1);
    expect(r.canAttemptLevel(1)).toBe(true);
    expect(r.canAttemptLevel(2)).toBe(false);
  });

  it("levels open in order up to 4, each one raising trust", () => {
    const r = subjugated();
    for (const l of LEVELS) {
      expect(r.canAttemptLevel(l)).toBe(true);
      r.succeedLevel(l);
      expect(r.level).toBe(l);
    }
    expect(r.nextLevel).toBeUndefined();
    expect(() => r.succeedLevel(4)).toThrow();
  });

  it("each level needs more trust; a failure locks the next one until it serves a while", () => {
    expect(LEVEL_TUNING.trustToOffer[1]).toBeLessThan(LEVEL_TUNING.trustToOffer[4]);
    const r = subjugated();
    r.succeedLevel(1);
    r.succeedLevel(2);
    r.fail();
    r.fail();
    expect(r.trust).toBeLessThan(LEVEL_TUNING.trustToOffer[3]);
    expect(r.canAttemptLevel(3)).toBe(false);
    expect(r.levelBlock()).toMatch(/confianza/);
    // Trust comes back with days of calm service.
    const missing = LEVEL_TUNING.trustToOffer[3] - r.trust;
    r.serve(missing / LEVEL_TUNING.trustPerServiceDay + 0.01);
    expect(r.canAttemptLevel(3)).toBe(true);
  });

  it("a failed level duel never takes away a level already earned", () => {
    const r = subjugated();
    r.succeedLevel(1);
    r.fail();
    expect(r.level).toBe(1);
  });

  it("only a subjugated asteroid wins trust by serving", () => {
    const r = new Rapport("a");
    r.serve(100);
    expect(r.trust).toBe(0);
  });

  it("each level's duel is harder than the suit stage and harder than the level before", () => {
    const traje = stageDuelProfile(base, "traje", 1);
    let prev = traje;
    for (const l of LEVELS) {
      const p = levelDuelProfile(base, l, 1);
      expect(p.persuasionGoal).toBeGreaterThan(prev.persuasionGoal);
      expect(p.maxBlocks).toBeGreaterThan(prev.maxBlocks);
      expect(p.difficulty).toBeGreaterThanOrEqual(prev.difficulty);
      expect(p.distractors).toBe(true);
      expect(p.maxConcept).toBeLessThanOrEqual(10);
      expect(p.patience).toBeGreaterThanOrEqual(LEVEL_TUNING.minPatience);
      if (l > 1) expect(p.patience).toBeLessThanOrEqual(prev.patience);
      prev = p;
    }
  });

  it("names the job of each level", () => {
    expect(LEVEL_JOB[1]).toBe("nano-net");
    expect(LEVEL_JOB[2]).toBe("a-la-nave");
    expect(LEVEL_JOB[3]).toBe("a-la-estacion");
    expect(LEVEL_JOB[4]).toBe("viaje-final");
  });
});
