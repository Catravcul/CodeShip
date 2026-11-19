import { describe, expect, it } from "vitest";
import { buildS1Layout } from "../data/layout";
import { LIFE_CYCLES } from "../data/ciclos-de-vida";
import { lifespan } from "../domain/life-cycle";
import { Wildlife } from "./wildlife";

const L = buildS1Layout();
const animals = L.instances.filter((i) => i.wander && !i.wander.climb && i.life);

function run(w: Wildlife, seconds: number, day: number, from = 0): void {
  for (let t = from; t < from + seconds; t += 0.1) w.step(0.1, t, day);
}

describe("the wild animals living", () => {
  it("keeps every young one by its mother", () => {
    const w = new Wildlife(L.instances, animals, 320);
    run(w, 120, 0);
    const young = animals.filter((i) => i.life!.mother !== undefined && w.get(i)!.label.includes("cría"));
    expect(young.length).toBeGreaterThan(3);
    for (const y of young) {
      const m = w.get(L.instances[y.life!.mother!]!)!;
      const a = w.get(y)!;
      if (/sigue|no se separa|pegado|estela|va con/.test(a.label)) expect(Math.hypot(a.x - m.x, a.z - m.z), a.label).toBeLessThan(8);
    }
  });

  it("names what each is doing, from its species' ethogram", () => {
    const w = new Wildlife(L.instances, animals, 320);
    run(w, 5, 0);
    const bear = animals.find((i) => i.life!.species === "Bear" && i.life!.mother === undefined)!;
    expect(w.get(bear)!.label).toMatch(/^Oso polar, adulto de \d+ años: /);
  });

  it("grows them day by day and, once old, leaves the place empty until a newborn comes in its season", () => {
    const pup = animals.find((i) => i.life!.species === "Seal" && i.life!.mother !== undefined)!;
    const w = new Wildlife(L.instances, animals, 320);
    w.step(0.1, 0, 0);
    const s0 = w.get(pup)!.scale;
    w.step(0.1, 0.1, 30);
    expect(w.get(pup)!.scale).toBeGreaterThan(s0);
    const c = LIFE_CYCLES.Seal!;
    w.step(0.1, 0.2, pup.life!.born + lifespan(c) + 1);
    expect(w.get(pup)!.scale).toBe(0);
  });
});
