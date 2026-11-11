import { describe, expect, it } from "vitest";
import { seededRandom } from "../../../content/random";
import { LETTUCE_OUTREDGEOUS } from "@modules/garden/data/species";
import { PLANT_TALK } from "@modules/garden/data/minds";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { Cat } from "@modules/pets/domain/cat";
import { BEFRIEND, RESPECT_PLANTS } from "@modules/pets/data/rules";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import { CAT_LESSONS } from "@modules/pets/data/rules";
import { Habitat, type Conversation, type HabitatEvent } from "./habitat";

const right = (e: Exercise): Answer => (e.kind === "order" ? { kind: "order", order: e.solution } : { kind: "choice", index: e.correct });
const wrong = (e: Exercise): Answer =>
  e.kind === "order" ? { kind: "order", order: [...e.solution].reverse() } : { kind: "choice", index: (e.correct + 1) % e.options.length };

function converse(c: Conversation, answer: (e: Exercise) => Answer) {
  while (c.duel.status === "thinking") c.answer(answer(c.duel.current!));
}

/** Run days of life with a dutiful carer: two meals, play and cuddles a day, plants watered. */
function live(h: Habitat, days: number): HabitatEvent[] {
  const events: HabitatEvent[] = [];
  for (let t = 0; t < days; t += 0.05) {
    h.tick(0.05);
    events.push(...h.drainEvents());
    if (Math.round(t / 0.05) % 10 === 0) {
      for (const c of h.cats) {
        c.feed(c.dailyKcal / 2);
        c.playWith();
        c.pet();
      }
      for (const p of h.plants) p.waterIt();
    }
  }
  return events;
}

const count = (ev: HabitatEvent[], type: HabitatEvent["type"]) => ev.filter((e) => e.type === type).length;

describe("Habitat", () => {
  it("an untrained cat bites a new plant; after talking to its mind it only sniffs", () => {
    const wild = new Habitat(seededRandom(7), 3);
    wild.adopt(new Cat("luna", "Luna", 4));
    wild.plant("l1", LETTUCE_OUTREDGEOUS);
    expect(count(live(wild, 3), "plant-bitten")).toBeGreaterThan(0);

    const tamed = new Habitat(seededRandom(7), 3);
    tamed.adopt(new Cat("luna", "Luna", 4));
    const talk = tamed.talkToCat("luna", RESPECT_PLANTS);
    converse(talk, right);
    expect(tamed.drainEvents()).toContainEqual({ type: "rule-learned", catId: "luna", ruleId: "respetar-plantas" });
    tamed.plant("l1", LETTUCE_OUTREDGEOUS);
    const ev = live(tamed, 3);
    expect(count(ev, "plant-bitten")).toBe(0);
    expect(count(ev, "plant-sniffed")).toBeGreaterThan(0);
  });

  it("failing the talk annoys the cat and teaches nothing", () => {
    const h = new Habitat(seededRandom(1), 3);
    const cat = new Cat("luna", "Luna", 4);
    h.adopt(cat);
    converse(h.talkToCat("luna", RESPECT_PLANTS), wrong);
    expect(cat.rules).toHaveLength(0);
    expect(cat.stress).toBeGreaterThan(0.2);
    expect(h.drainEvents()).toContainEqual({ type: "cat-annoyed", catId: "luna" });
  });

  it("a new cat is introduced step by step; programming both to greet makes friends sooner", () => {
    const daysToFriends = (program: boolean) => {
      const h = new Habitat(seededRandom(3), 3);
      h.adopt(new Cat("luna", "Luna", 4));
      h.adopt(new Cat("sol", "Sol", 3.5));
      if (program) for (const id of ["luna", "sol"]) converse(h.talkToCat(id, BEFRIEND), right);
      let days = 0;
      while (!h.introductions[0]!.friends && days < 60) {
        live(h, 0.5);
        days += 0.5;
      }
      return days;
    };
    const untrained = daysToFriends(false);
    const trained = daysToFriends(true);
    expect(trained).toBeLessThan(untrained);
    expect(trained).toBeGreaterThanOrEqual(3); // still needs the stages, no shortcut
  });

  it("needs one set of resources per cat plus one", () => {
    const h = new Habitat(seededRandom(1), 2);
    h.adopt(new Cat("a", "A", 4));
    expect(h.resourcesOk).toBe(true);
    h.adopt(new Cat("b", "B", 4));
    expect(h.resourcesOk).toBe(false);
  });

  it("talking kindly to a plant lifts its mood; failing discourages it", () => {
    const h = new Habitat(seededRandom(1));
    const p = h.plant("l1", LETTUCE_OUTREDGEOUS);
    converse(h.talkToPlant("l1", PLANT_TALK), right);
    expect(p.mood).toBe(1);
    converse(h.talkToPlant("l1", PLANT_TALK), wrong);
    expect(p.mood).toBeCloseTo(0.7);
  });
});

describe("on-board mind banks", () => {
  const banks = [PLANT_TALK, ...CAT_LESSONS.map((l) => l.exercises)];
  it("have valid answers and ids unique across every bank, asteroids included", () => {
    const all = [...EXERCISES, ...banks.flat()];
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    for (const e of banks.flat()) {
      if (e.kind === "order") expect(e.solution.every((id) => e.blocks.some((b) => b.id === id))).toBe(true);
      else expect(e.correct).toBeLessThan(e.options.length);
    }
  });
});
