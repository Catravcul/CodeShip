import { describe, expect, it } from "vitest";
import { MindDuel } from "./duel";
import type { Exercise } from "./exercise";
import type { DuelProfile } from "./difficulty";

const order = (id: string): Exercise => ({
  kind: "order",
  id,
  concept: 1,
  idea: `idea ${id}`,
  blocks: [
    { id: "b", pseudo: "b", js: "b" },
    { id: "a", pseudo: "a", js: "a" },
  ],
  solution: ["a", "b"],
});
const bank = [order("1"), order("2"), order("3"), order("4")];
const profile: DuelProfile = { difficulty: 0, persuasionGoal: 3, patience: 2, maxBlocks: 4, distractors: false, maxConcept: 1 };
const right = { kind: "order", order: ["a", "b"] } as const;
const wrong = { kind: "order", order: ["b", "a"] } as const;

describe("MindDuel", () => {
  it("starts with an idea surfacing in the asteroid's mind", () => {
    const duel = MindDuel.start(profile, bank, 1);
    expect(duel.status).toBe("thinking");
    expect(duel.current?.idea).toMatch(/idea/);
    expect(duel.persuasion).toBe(0);
    expect(duel.patience).toBe(2);
  });

  it("a correct idea persuades and the next idea appears", () => {
    const duel = MindDuel.start(profile, bank, 1);
    const first = duel.current!.id;
    const events = duel.submit(right);
    expect(events).toContainEqual({ type: "idea-accepted", exerciseId: first });
    expect(duel.persuasion).toBe(1);
    expect(duel.current!.id).not.toBe(first);
  });

  it("a wrong idea costs patience", () => {
    const duel = MindDuel.start(profile, bank, 1);
    expect(duel.submit(wrong)).toContainEqual(expect.objectContaining({ type: "idea-rejected" }));
    expect(duel.patience).toBe(1);
  });

  it("reaching the persuasion goal makes the asteroid obey", () => {
    const duel = MindDuel.start(profile, bank, 1);
    duel.submit(right);
    duel.submit(wrong);
    duel.submit(right);
    const events = duel.submit(right);
    expect(events).toContainEqual({ type: "asteroid-persuaded" });
    expect(duel.status).toBe("persuaded");
    expect(duel.current).toBeUndefined();
  });

  it("running out of patience makes the asteroid aggressive", () => {
    const duel = MindDuel.start(profile, bank, 1);
    duel.submit(wrong);
    expect(duel.submit(wrong)).toContainEqual({ type: "asteroid-enraged" });
    expect(duel.status).toBe("aggressive");
  });

  it("ignores answers once the duel is over", () => {
    const duel = MindDuel.start(profile, bank, 1);
    duel.submit(wrong);
    duel.submit(wrong);
    expect(duel.submit(right)).toEqual([]);
    expect(duel.persuasion).toBe(0);
  });

  it("only picks exercises that fit the profile", () => {
    const big: Exercise = { ...order("big"), blocks: Array.from({ length: 9 }, (_, i) => ({ id: `${i}`, pseudo: "", js: "" })) } as Exercise;
    const advanced: Exercise = { ...order("adv"), concept: 6 } as Exercise;
    const duel = MindDuel.start(profile, [big, advanced, order("ok")], 3);
    expect(duel.current!.id).toBe("ok");
  });

  it("same seed, same sequence of ideas", () => {
    const ids = (seed: number) => {
      const d = MindDuel.start({ ...profile, persuasionGoal: 4 }, bank, seed);
      const out: string[] = [];
      while (d.current) {
        out.push(d.current.id);
        d.submit(right);
      }
      return out;
    };
    expect(ids(7)).toEqual(ids(7));
  });

  it("refuses to start without suitable exercises", () => {
    expect(() => MindDuel.start({ ...profile, maxConcept: 1 }, [{ ...order("x"), concept: 5 } as Exercise], 1)).toThrow();
  });

  it("UI-05 a wrong pick step by step (an incomplete order) is one rejected idea: one patience, like a wrong order", () => {
    const duel = MindDuel.start(profile, bank, 1);
    const first = duel.current!.id;
    expect(duel.submit({ kind: "order", order: ["b"] })).toEqual([{ type: "idea-rejected", exerciseId: first }]);
    expect(duel.patience).toBe(1);
    expect(duel.persuasion).toBe(0);
  });
});
