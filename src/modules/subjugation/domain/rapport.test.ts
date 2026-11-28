import { describe, expect, it } from "vitest";
import { duelProfileFor } from "@modules/mind-duel/domain/difficulty";
import { Rapport, RapportBook, STAGES, stageDuelProfile } from "./rapport";

const base = duelProfileFor({ massKg: 7.3e10, richness: 0.4 });

describe("Rapport", () => {
  it("a new asteroid does not know her: no trust, the probe stage on offer, full danger", () => {
    const r = new Rapport("101955");
    expect(r.trust).toBe(0);
    expect(r.next).toBe("sonda");
    expect(r.danger).toBe(1);
    expect(r.subjugated).toBe(false);
  });

  it("stage N+1 is only offered after stage N succeeded", () => {
    const r = new Rapport("a");
    expect(r.canAttempt("nave")).toBe(false);
    expect(r.canAttempt("traje")).toBe(false);
    expect(() => r.succeed("nave")).toThrow();
    r.succeed("sonda");
    expect(r.canAttempt("sonda")).toBe(false);
    expect(r.canAttempt("nave")).toBe(true);
    expect(r.canAttempt("traje")).toBe(false);
    r.succeed("nave");
    expect(r.next).toBe("traje");
  });

  it("each success raises trust and lowers the danger; all three subjugate it", () => {
    const r = new Rapport("a");
    const scan = r.succeed("sonda");
    expect(scan.scan).toBe(true);
    expect(scan.cargoShare).toBe(0);
    const t1 = r.trust;
    const cargo = r.succeed("nave");
    expect(cargo.cargoShare).toBeGreaterThan(0);
    expect(cargo.cargoShare).toBeLessThan(1);
    expect(r.trust).toBeGreaterThan(t1);
    const last = r.succeed("traje");
    expect(last.subjugated).toBe(true);
    expect(r.subjugated).toBe(true);
    expect(r.trust).toBeCloseTo(1, 9);
    expect(r.danger).toBeLessThan(0.5);
    expect(r.next).toBeUndefined();
  });

  it("a failed duel costs trust but never below zero, and keeps the stage on offer", () => {
    const r = new Rapport("a");
    r.fail();
    expect(r.trust).toBe(0);
    r.succeed("sonda");
    const t = r.trust;
    r.fail();
    expect(r.trust).toBeLessThan(t);
    expect(r.next).toBe("nave");
    expect(r.failures).toBe(2);
  });
});

describe("stageDuelProfile", () => {
  it("deeper stages reach harder concepts and ask for more ideas", () => {
    const [p1, p2, p3] = STAGES.map((s) => stageDuelProfile(base, s, 0.5));
    expect(p2!.maxConcept).toBeGreaterThan(p1!.maxConcept);
    expect(p3!.maxConcept).toBeGreaterThan(p2!.maxConcept);
    expect(p3!.persuasionGoal).toBeGreaterThan(p1!.persuasionGoal);
    expect(p3!.distractors).toBe(true);
    expect(p3!.difficulty).toBeGreaterThan(p1!.difficulty);
  });

  it("the first contact has the least patience; trust buys margin for mistakes", () => {
    const first = stageDuelProfile(base, "sonda", 0);
    expect(first.patience).toBe(Math.max(2, base.patience - 1));
    const trusted = stageDuelProfile(base, "traje", 0.55);
    expect(trusted.patience).toBeGreaterThan(first.patience);
  });

  it("never asks for fewer than two ideas nor gives less than two lives", () => {
    const easy = { ...base, persuasionGoal: 2, patience: 1 };
    const p = stageDuelProfile(easy, "sonda", 0);
    expect(p.persuasionGoal).toBe(2);
    expect(p.patience).toBe(2);
  });

  it("the profile follows the rapport's own trust", () => {
    const r = new Rapport("a");
    r.succeed("sonda");
    expect(r.profile(base, "nave")).toEqual(stageDuelProfile(base, "nave", r.trust));
  });
});

describe("RapportBook", () => {
  it("keeps one rapport per asteroid and answers who is subjugated", () => {
    const book = new RapportBook();
    expect(book.peek("x")).toBeUndefined();
    expect(book.of("x")).toBe(book.of("x"));
    expect(book.isSubjugated("x")).toBe(false);
    for (const s of STAGES) book.of("x").succeed(s);
    expect(book.isSubjugated("x")).toBe(true);
    expect(book.isSubjugated("y")).toBe(false);
  });
});
