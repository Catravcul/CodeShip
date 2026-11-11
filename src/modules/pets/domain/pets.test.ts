import { describe, expect, it } from "vitest";
import { decide, type CatRule } from "./behavior";
import { Cat, CAT_TUNING, RER } from "./cat";
import { Introduction, STAGES } from "./introduction";

const RESPECT: CatRule = { id: "r", when: "planta-nueva", then: "olfatear", pseudo: "", js: "" };
const tickDays = (c: Cat, days: number, resourcesOk = true) => {
  for (let t = 0; t < days; t += 0.1) c.tick(0.1, { resourcesOk });
};

describe("Cat", () => {
  it("energy needs follow RER = 70·kg^0.75 times the life-stage factor", () => {
    const c = new Cat("c", "Luna", 4);
    expect(RER.value(4)).toBeCloseTo(198, 0);
    expect(c.dailyKcal).toBeCloseTo(1.2 * RER.value(4), 6);
    expect(new Cat("k", "Mini", 1.5, "kitten").dailyKcal).toBeGreaterThan(RER.value(1.5) * 2);
  });

  it("a cared-for cat stays calm; a neglected one gets stressed", () => {
    const cared = new Cat("a", "A", 4);
    const neglected = new Cat("b", "B", 4);
    for (let meal = 0; meal < 6; meal++) {
      // Two meals and two play/cuddle sessions a day.
      tickDays(cared, 0.5);
      cared.feed(cared.dailyKcal / 2);
      cared.playWith();
      cared.pet();
      tickDays(neglected, 0.5);
    }
    expect(cared.stress).toBeLessThan(0.5);
    expect(neglected.stress).toBeGreaterThan(CAT_TUNING.ruleBreakStress);
  });

  it("missing resources (fewer than cats + 1) stress even a fed cat", () => {
    const c = new Cat("a", "A", 4);
    c.tick(0.01, { resourcesOk: false });
    for (let i = 0; i < 20; i++) {
      c.feed(c.dailyKcal);
      c.playWith();
      c.pet();
      c.tick(0.1, { resourcesOk: false });
    }
    expect(c.stress).toBeGreaterThan(0.3);
  });
});

describe("decide", () => {
  it("an untrained cat sometimes bites a new plant", () => {
    const c = new Cat("a", "A", 4);
    const acts = Array.from({ length: 50 }, (_, i) => decide(c, "planta-nueva", () => (i % 10) / 10));
    expect(acts).toContain("morder-planta");
    expect(acts).toContain("olfatear");
  });

  it("a programmed cat follows its rule, unless it is too stressed", () => {
    const c = new Cat("a", "A", 4);
    c.learn(RESPECT);
    expect(decide(c, "planta-nueva", () => 0)).toBe("olfatear");
    c.startle(1);
    expect(decide(c, "planta-nueva", () => 0)).toBe("morder-planta");
  });

  it("learning a new rule for the same stimulus replaces the old one", () => {
    const c = new Cat("a", "A", 4);
    c.learn(RESPECT);
    c.learn({ ...RESPECT, id: "r2", then: "ignorar" });
    expect(c.rules).toHaveLength(1);
    expect(decide(c, "planta-nueva", () => 0)).toBe("ignorar");
  });
});

describe("Introduction", () => {
  it("advances stage by stage only while both cats are calm", () => {
    const intro = new Introduction("new", "old");
    expect(intro.stage).toBe("separados");
    intro.tick(5, 0.9, 0.1);
    expect(intro.stage).toBe("separados");
    let days = 0;
    while (!intro.friends) {
      intro.tick(0.5, 0.1, 0.1);
      days += 0.5;
    }
    expect(days).toBeCloseTo(1.5 * (STAGES.length - 1));
  });

  it("friendly greetings double the pace; cats can only meet from visual contact on", () => {
    const intro = new Introduction("new", "old");
    expect(intro.canMeet).toBe(false);
    for (let i = 0; i < 3; i++) intro.tick(0.25, 0, 0, true);
    expect(intro.stage).toBe("olores");
    while (intro.stage !== "contacto-visual") intro.tick(0.25, 0, 0);
    expect(intro.canMeet).toBe(true);
  });
});
