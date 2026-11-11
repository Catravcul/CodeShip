import { describe, expect, it } from "vitest";
import { seededRandom } from "../../../content/random";
import { LETTUCE_OUTREDGEOUS } from "@modules/garden/data/species";
import { CHILE_ESPANOLA } from "@modules/garden/data/species";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { SUN_SALUTATION, YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { Cat } from "@modules/pets/domain/cat";
import { BEFRIEND, RESPECT_PLANTS } from "@modules/pets/data/rules";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import { CAT_LESSONS } from "@modules/pets/data/rules";
import { Habitat, type ChoreSession, type Conversation, type HabitatEvent } from "./habitat";

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

});


function finish(session: ChoreSession, answer: (e: Exercise) => Answer = right) {
  while (session.run.status === "doing") session.answer(answer(session.run.current!));
}

describe("Habitat chores (everything is a code challenge)", () => {
  const setup = () => {
    const ship = Ship.create(explorerDesign());
    const h = new Habitat(seededRandom(5), 3, ship, "Berón");
    h.adopt(new Cat("luna", "Luna", 4));
    h.plant("l1", LETTUCE_OUTREDGEOUS);
    return { h, ship };
  };
  const find = (h: Habitat, kind: string) => h.chores(RECIPES, YOGA_SEQUENCES).find((c) => c.kind === kind);

  it("a furious asteroid's jolt creates care scenarios for plants, cats and the ship", () => {
    const { h, ship } = setup();
    ship.damage(0.4);
    h.jolt(1, "Bennu sacudió la nave");
    const kinds = h.chores(RECIPES, YOGA_SEQUENCES).map((c) => c.kind);
    expect(kinds).toEqual(expect.arrayContaining(["curar-planta", "calmar-gato", "reparar-nave"]));
    expect(find(h, "curar-planta")!.scenario).toContain("Bennu sacudió la nave");
  });

  it("solving a chore's challenges applies its effect", () => {
    const { h, ship } = setup();
    ship.damage(0.4);
    h.jolt(1, "Bennu sacudió la nave");
    const plant = h.plants[0]!;
    const before = plant.health;
    finish(h.start(find(h, "curar-planta")!));
    expect(plant.health).toBeCloseTo(Math.min(1, before + 0.4));
    finish(h.start(find(h, "reparar-nave")!));
    expect(ship.hullIntegrity).toBeCloseTo(0.9);
    const cat = h.cats[0]!;
    finish(h.start(find(h, "calmar-gato")!));
    expect(cat.stress).toBeLessThan(0.5);
  });

  it("failing a chore leaves things as they were", () => {
    const { h } = setup();
    h.jolt(1, "Bennu sacudió la nave");
    const plant = h.plants[0]!;
    const before = plant.health;
    finish(h.start(find(h, "curar-planta")!), wrong);
    expect(plant.health).toBe(before);
    expect(h.drainEvents().some((e) => e.type === "chore-failed")).toBe(true);
  });

  it("a cat that bites a plant leaves a scenario on that plant's care chore", () => {
    const h = new Habitat(seededRandom(7), 3);
    h.adopt(new Cat("luna", "Luna", 4));
    h.plant("l1", LETTUCE_OUTREDGEOUS);
    const ev = live(h, 3);
    expect(count(ev, "plant-bitten")).toBeGreaterThan(0);
    const p = h.plants[0]!;
    p.damage(p.health - 0.5); // make sure it needs care, without killing it
    expect(h.chores([], []).find((c) => c.kind === "curar-planta")!.scenario).toContain("Luna mordisqueó");
  });

  it("grow, shake, harvest and cook: a chile ends up as a meal for the crew", () => {
    const h = new Habitat(seededRandom(2), 2);
    h.plant("c1", CHILE_ESPANOLA);
    const milpa = RECIPES.find((r) => r.id === "milpa")!;
    expect(h.canCook(milpa)).toBe(false);
    let shook = false;
    for (let day = 0; day < 101 && !h.plants[0]!.readyToHarvest; day += 0.5) {
      live(h, 0.5);
      const shake = h.chores([], []).find((c) => c.kind === "agitar");
      if (shake) {
        finish(h.start(shake));
        shook = true;
      }
    }
    expect(shook).toBe(true);
    finish(h.start(h.chores([], []).find((c) => c.kind === "cosechar")!));
    expect(h.larder("chile-espanola")).toBe(2);
    const satiety = h.crew.satiety;
    finish(h.start(h.chores(RECIPES, []).find((c) => c.targetId === "milpa")!, { recipes: RECIPES }));
    expect(h.larder("chile-espanola")).toBe(1);
    expect(h.meals).toBe(2);
    expect(h.crew.satiety).toBeGreaterThan(satiety);
  });

  it("each solved yoga challenge is one posture; the sequence improves the crew", () => {
    const h = new Habitat(seededRandom(1));
    h.crew.startle(0.5);
    const stress = h.crew.stress;
    const session = h.start(h.chores([], [SUN_SALUTATION])[0]!);
    session.answer(right(session.run.current!));
    expect(h.drainEvents()).toContainEqual({ type: "posture", sequenceId: "saludo-al-sol", index: 0 });
    finish(session);
    const postures = h.drainEvents().filter((e) => e.type === "posture");
    expect(postures).toHaveLength(11);
    expect(h.crew.stress).toBeCloseTo(stress - 0.3);
  });
});
