import { describe, expect, it } from "vitest";
import { CHIHUAHUA_MAX_KG, Dog } from "./dog";
import { decide, DOG_INSTINCTS } from "./behavior";
import { DOG_RESPECT_HENS } from "../data/family-lessons";

describe("Dog", () => {
  it("a chihuahua needs about 223 kcal a day (RER × 1.6), a puppy three times its RER", () => {
    const coco = new Dog("coco", "Coco", 2.5);
    expect(coco.dailyKcal).toBeCloseTo(70 * 2.5 ** 0.75 * 1.6, 5);
    expect(Math.round(coco.dailyKcal)).toBe(223);
    const pepa = new Dog("pepa", "Pepa", 0.9, "cachorro");
    expect(pepa.young).toBe(true);
    expect(pepa.dailyKcal / (70 * 0.9 ** 0.75)).toBeCloseTo(3);
    expect(CHIHUAHUA_MAX_KG.value).toBeCloseTo(2.72, 2);
  });

  it("chases hens by instinct until programmed, and forgets the rule when terrified", () => {
    const coco = new Dog("coco", "Coco", 2.5);
    const always = () => 0;
    expect(decide(coco, "gallina", always, DOG_INSTINCTS)).toBe("perseguir");
    coco.learn(DOG_RESPECT_HENS.rule);
    expect(decide(coco, "gallina", always, DOG_INSTINCTS)).toBe("ignorar");
    coco.startle(1);
    expect(decide(coco, "gallina", always, DOG_INSTINCTS)).toBe("perseguir");
  });
});
