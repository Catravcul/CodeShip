import { describe, expect, it } from "vitest";
import { buildS1Layout } from "../data/layout";
import { LIFE_CYCLES } from "../data/ciclos-de-vida";
import { lifespan, nextBirth } from "../domain/life-cycle";
import { Wildlife } from "./wildlife";

const L = buildS1Layout();
const animals = L.instances.filter((i) => i.wander && !i.wander.climb && i.life);

function run(w: Wildlife, seconds: number, day: number, from = 0): void {
  for (let t = from; t < from + seconds; t += 0.1) w.step(0.1, t, day);
}

describe("the wild animals living", () => {
  it("keeps every young one by its mother: one that follows her is by her side or closing in", () => {
    const w = new Wildlife(L.instances, animals, 320);
    run(w, 120, 0);
    const young = animals.filter((i) => i.life!.mother !== undefined && w.get(i)!.label.includes("cría"));
    expect(young.length).toBeGreaterThan(3);
    const gap = (y: (typeof young)[number]) => {
      const m = w.get(L.instances[y.life!.mother!]!)!;
      const a = w.get(y)!;
      return Math.hypot(a.x - m.x, a.z - m.z);
    };
    const before = new Map(young.map((y) => [y, gap(y)]));
    // On land (in the lagoon the orcas hunt, and a young one torn between its mother and fleeing may lag).
    const following = young.filter((y) => y.area !== "mar" && /sigue|no se separa|pegado|estela|va con/.test(w.get(y)!.label));
    expect(following.length).toBeGreaterThan(1);
    run(w, 2, 0, 120);
    for (const y of following) {
      const m = w.get(L.instances[y.life!.mother!]!)!;
      if (/huye/.test(m.label)) continue; // a mother in flight outruns her young
      expect(gap(y) < 8 || gap(y) < before.get(y)!, w.get(y)!.label).toBe(true);
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

describe("the food chain of sanctuary 1", () => {
  it("a hungry orca hunts the seals of the lagoon; the one it eats is gone until the next birth season", () => {
    const w = new Wildlife(L.instances, animals, 320);
    for (const i of animals) if (i.life!.species === "Orca") w.setNeeds(i, { hunger: 1, fatigue: 0 });
    let saw = false;
    const orcaKill = (x: Wildlife) => x.kills.find((k) => k.hunter.life!.species === "Orca");
    for (let t = 0; t < 600 && !orcaKill(w); t += 0.1) {
      w.step(0.1, t, 0.01);
      saw ||= animals.some((i) => i.life!.species === "Orca" && /caza|busca presas|devora|falla el ataque/.test(w.get(i)!.label));
    }
    expect(saw).toBe(true);
    const k = orcaKill(w)!;
    expect(k).toBeDefined();
    expect(k.hunter.life!.species).toBe("Orca");
    expect(w.get(k.prey)!.scale).toBe(0);
    // With no mating its place stays empty a season more; with a female of its kind pregnant, the young is born.
    w.step(0.1, 700, 400);
    expect(w.get(k.prey)!.scale).toBe(0);
    const w2 = new Wildlife(L.instances, animals, 320);
    for (const i of animals) if (i.life!.species === "Orca") w2.setNeeds(i, { hunger: 1, fatigue: 0 });
    for (let t = 0; t < 600 && !orcaKill(w2); t += 0.1) w2.step(0.1, t, 0.01);
    const prey = orcaKill(w2)!.prey;
    const due = nextBirth(1, LIFE_CYCLES[prey.life!.species]!, 320, prey.life!.offset);
    w2.addPregnancy(prey.life!.species, due);
    w2.step(0.1, 700, due + 1);
    expect(w2.get(prey)!.scale).toBeGreaterThan(0);
  });

  it("the hares flee Doménica when she comes close", () => {
    const w = new Wildlife(L.instances, animals, 320);
    const hare = animals.find((i) => i.life!.species === "ArcticHare" && i.life!.mother === undefined)!;
    w.step(0.3, 0, 0, { x: hare.x + 3, z: hare.z });
    expect(w.get(hare)!.label).toMatch(/huye de Doménica/);
  });

  it("hungry wolves set out after prey", () => {
    const w = new Wildlife(L.instances, animals, 320);
    const wolves = animals.filter((i) => i.life!.species === "Wolf");
    for (const i of wolves) w.setNeeds(i, { hunger: 1, fatigue: 0 });
    w.step(0.3, 0, 0);
    expect(wolves.some((i) => /busca presas|caza/.test(w.get(i)!.label))).toBe(true);
  });

  it("in their season they court and mate, and the female carries a young", () => {
    // Game day 0 is 1 November (year day 304): the Weddell seals' mating month.
    // At the scene's pace (60 frames a second), with the clock running as in the game.
    const w = new Wildlife(L.instances, animals, 304);
    for (let t = 0; t < 400 && !w.matings.length; t += 1 / 60) w.step(1 / 60, t, 1 + t / 3600);
    expect(w.matings.length).toBeGreaterThan(0);
    const m = w.matings[0]!;
    expect(m.female.life!.species).toBe(m.male.life!.species);
    expect(w.sexOf(m.female)).toBe("hembra");
    expect(w.sexOf(m.male)).toBe("macho");
  });
});
