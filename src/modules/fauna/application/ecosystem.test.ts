import { describe, expect, it } from "vitest";
import type { Traits } from "../domain/predation";
import { CHASE_S, Ecosystem, type Agent } from "./ecosystem";

const base = { armour: 0.1, agility: 0.6, packFactor: 0, senseM: 40, rangeM: 200, hungerPerDay: 1 };
const T: Record<string, Traits> = {
  Wolf: { ...base, massKg: 45, strength: 0.5, armament: 0.25, packFactor: 0.8, diet: "carnivoro", medium: "tierra", runMs: 16, huntSuccess: 1 },
  Hare: { ...base, massKg: 4.5, strength: 0.1, armament: 0, diet: "herbivoro", medium: "tierra", runMs: 12, huntSuccess: 0 },
  Orca: { ...base, massKg: 4000, strength: 1, armament: 0.5, packFactor: 0.8, diet: "carnivoro", medium: "agua", runMs: 15, huntSuccess: 1 },
  Human: { ...base, massKg: 60, strength: 0.4, armament: 0.15, diet: "omnivoro", medium: "ambos", runMs: 6, huntSuccess: 0 },
};
const N = { Wolf: "un lobo", Hare: "una liebre", Orca: "una orca", Human: "una persona" };
const agent = (id: number, species: string, x: number, z: number, o: Partial<Agent> = {}): Agent => ({ id, species, x, z, home: { x, z, r: 10 }, scale: 1, young: false, inWater: false, ...o });

/** Moves each agent toward its intent, as a sanctuary's scene would. */
function simulate(eco: Ecosystem, agents: Agent[], seconds: number, onKill?: (prey: number) => void): Agent[] {
  let list = agents;
  for (let t = 0; t < seconds; t += 0.25) {
    const { intents, kills } = eco.step(0.25, 0, t, list);
    for (const k of kills) onKill?.(k.prey);
    const dead = new Set(kills.map((k) => k.prey));
    list = list.map((a) => {
      if (dead.has(a.id)) return { ...a, scale: 0 };
      const i = intents.get(a.id);
      if (!i?.to || i.speed <= 0) return a;
      const dx = i.to.x - a.x, dz = i.to.z - a.z, d = Math.hypot(dx, dz);
      const k = Math.min(1, (i.speed * 0.25) / (d || 1));
      return { ...a, x: a.x + dx * k, z: a.z + dz * k };
    });
  }
  return list;
}

describe("a living food chain", () => {
  it("a hungry wolf chases a hare it sees, catches it and eats it; the hare fled", () => {
    const eco = new Ecosystem(T, N);
    eco.setNeeds(1, { hunger: 0.9, fatigue: 0 });
    const first = eco.step(0.25, 0, 0, [agent(1, "Wolf", 0, 0), agent(2, "Hare", 20, 0)]).intents;
    expect(first.get(1)!.verb).toBe("caza una liebre");
    expect(first.get(2)!.verb).toBe("huye de un lobo");
    const killed: number[] = [];
    simulate(eco, [agent(1, "Wolf", 0, 0), agent(2, "Hare", 20, 0)], 30, (p) => killed.push(p));
    expect(killed).toEqual([2]);
    expect(eco.needsOf(1)!.hunger).toBeLessThan(0.1);
  });

  it("a fed wolf leaves the hare alone; a hare out of its senses grazes", () => {
    const eco = new Ecosystem(T, N);
    eco.setNeeds(1, { hunger: 0, fatigue: 0 });
    eco.setNeeds(2, { hunger: 0.9, fatigue: 0 });
    const i = eco.step(0.25, 0, 0, [agent(1, "Wolf", 0, 0), agent(2, "Hare", 100, 0)]).intents;
    expect(i.get(1)!.doing).toBe("habito");
    expect(i.get(2)!.doing).toBe("comer");
  });

  it("an orca never takes a hare on the ice, and a faster prey wins the chase: the hunter gives up and rests", () => {
    const eco = new Ecosystem(T, N);
    eco.setNeeds(3, { hunger: 1, fatigue: 0 });
    expect(eco.step(0.25, 0, 0, [agent(3, "Orca", 0, 0, { inWater: true }), agent(2, "Hare", 10, 0)]).intents.get(3)!.doing).not.toBe("cazar");
    const slow: Record<string, Traits> = { ...T, Wolf: { ...T.Wolf!, runMs: 8 } };
    const e2 = new Ecosystem(slow, N);
    e2.setNeeds(1, { hunger: 0.9, fatigue: 0 });
    const killed: number[] = [];
    const end = simulate(e2, [agent(1, "Wolf", 0, 0), agent(2, "Hare", 15, 0, { home: { x: 15, z: 0, r: 2000 } })], CHASE_S + 10, (p) => killed.push(p));
    expect(killed).toEqual([]);
    expect(e2.step(0.25, 0, CHASE_S + 11, end).intents.get(1)!.doing).not.toBe("cazar");
  });

  it("the timid flee the player; nobody hunts the player", () => {
    const eco = new Ecosystem(T, N);
    eco.setNeeds(1, { hunger: 1, fatigue: 0 });
    const i = eco.step(0.25, 0, 0, [agent(9, "Human", 0, 0, { observer: true }), agent(2, "Hare", 5, 0), agent(1, "Wolf", 3, 3)]).intents;
    expect(i.get(2)!.doing).toBe("huir");
    expect(i.get(1)!.other).not.toBe(9);
    expect(i.has(9)).toBe(false);
  });

  it("a young one keeps to its mother", () => {
    const eco = new Ecosystem(T, N);
    const i = eco.step(0.25, 0, 0, [agent(4, "Hare", 0, 0), agent(5, "Hare", 20, 0, { young: true, mother: 4, scale: 0.3 })]).intents;
    expect(i.get(5)!.doing).toBe("seguir");
    expect(i.get(5)!.to).toEqual({ x: 0, z: 0 });
  });
});
