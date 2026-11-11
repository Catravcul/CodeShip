import { describe, expect, it } from "vitest";
import { duelProfileFor } from "./difficulty";

describe("duelProfileFor", () => {
  it("a small poor asteroid is gentle: few ideas, lots of patience, no distractors", () => {
    const p = duelProfileFor({ massKg: 3.5e10, richness: 0 });
    expect(p.persuasionGoal).toBe(3);
    expect(p.patience).toBe(5);
    expect(p.distractors).toBe(false);
    expect(p.maxConcept).toBe(1);
  });

  it("a protoplanet rich in metal is the hardest duel", () => {
    const p = duelProfileFor({ massKg: 2.6e20, richness: 1 });
    expect(p.difficulty).toBe(1);
    expect(p.persuasionGoal).toBe(8);
    expect(p.patience).toBe(2);
    expect(p.distractors).toBe(true);
    expect(p.maxConcept).toBe(10);
  });

  it("more mass or more richness never makes it easier", () => {
    const a = duelProfileFor({ massKg: 1e12, richness: 0.3 });
    const heavier = duelProfileFor({ massKg: 1e15, richness: 0.3 });
    const richer = duelProfileFor({ massKg: 1e12, richness: 0.8 });
    expect(heavier.difficulty).toBeGreaterThan(a.difficulty);
    expect(richer.difficulty).toBeGreaterThan(a.difficulty);
    expect(heavier.patience).toBeLessThanOrEqual(a.patience);
  });
});
