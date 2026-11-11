import { describe, expect, it } from "vitest";
import { EXERCISES } from "./exercises";
import { MindDuel } from "../domain/duel";
import { duelProfileFor } from "../domain/difficulty";
import { resourceRichness } from "@modules/celestial/domain/resources";
import { BENNU } from "@modules/celestial/data/bennu";

describe("exercise bank", () => {
  it("has unique ids and valid answers", () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      if (e.kind === "order") {
        const blockIds = new Set(e.blocks.map((b) => b.id));
        expect(e.solution.every((id) => blockIds.has(id))).toBe(true);
      } else {
        expect(e.correct).toBeGreaterThanOrEqual(0);
        expect(e.correct).toBeLessThan(e.options.length);
      }
    }
  });

  it("is enough for a full duel with Bennu", () => {
    const profile = duelProfileFor({ massKg: BENNU.massKg.value, richness: resourceRichness(BENNU.composition) });
    const duel = MindDuel.start(profile, EXERCISES, 1);
    expect(duel.current).toBeDefined();
    expect(profile.maxConcept).toBeGreaterThanOrEqual(2);
  });
});
