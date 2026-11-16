import { describe, expect, it } from "vitest";
import { COLD_SANCTUARY_ASANAS, COLD_SANCTUARY_SEQUENCES } from "../data/cold-sanctuary-asanas";
import { asanaTarget, reachesOf, type AsanaData } from "./asana";
import { contactHeights, settleBody } from "./body-solver";
import { CUBE_FIGURE, lowestPoint, tipOf } from "./skeleton";

const asana = (id: string): AsanaData => COLD_SANCTUARY_ASANAS.find((a) => a.id === id)!;
const solve = (id: string) => settleBody(CUBE_FIGURE, asanaTarget(CUBE_FIGURE, asana(id)), reachesOf(asana(id)), 1);
/** 3 cm: the tolerance for "on the mat" (Cold Sanctuary aims hands at 3 cm over the floor). */
const ON_MAT = 0.035;

describe("Asanas on the cube skeleton (IK and grounding, Cold Sanctuary's AsanaPoseSpell.Apply)", () => {
  it("every posture of every sequence rests on the floor: nothing under it, something on it", () => {
    for (const a of COLD_SANCTUARY_ASANAS) {
      const { world } = solve(a.id);
      expect(lowestPoint(CUBE_FIGURE, world), a.id).toBeCloseTo(0, 6);
    }
  });

  it("standing (Samasthitih): pelvis at 0,95 m, both soles on the floor", () => {
    const { world } = solve("samasthitih-de-pie");
    expect(world.Hips.p.y).toBeCloseTo(0.95, 3);
    const c = contactHeights(CUBE_FIGURE, world);
    expect(c.FootLeft).toBeLessThan(ON_MAT);
    expect(c.FootRight).toBeLessThan(ON_MAT);
  });

  it("every floor reach puts its hand on the mat (ten fingers on the floor, palms under the shoulders…)", () => {
    for (const a of COLD_SANCTUARY_ASANAS) {
      const floor = reachesOf(a).filter((r) => r.onFloor);
      if (!floor.length) continue;
      const c = contactHeights(CUBE_FIGURE, solve(a.id).world);
      for (const r of floor) expect(c[r.end], `${a.id} ${r.end}`).toBeLessThan(ON_MAT);
    }
  });

  it("Uttanasana: folded from the hips, hands by the feet, soles down", () => {
    const { world } = solve("uttanasana-flexion-adelante");
    const c = contactHeights(CUBE_FIGURE, world);
    expect(c.HandLeft).toBeLessThan(ON_MAT);
    expect(c.FootLeft).toBeLessThan(ON_MAT);
    expect(world.Head.p.y).toBeLessThan(world.Hips.p.y); // head below the pelvis
  });

  it("Pranamasana: the palms meet in front of the sternum", () => {
    const { world } = solve("pranamasana-oracion");
    const l = tipOf(CUBE_FIGURE, world, "HandLeft");
    const r = tipOf(CUBE_FIGURE, world, "HandRight");
    expect(l.sub(r).length()).toBeLessThan(0.1);
    expect(l.z).toBeGreaterThan(world.Chest.p.z + 0.1);
    expect(l.y).toBeGreaterThan(world.Chest.p.y - 0.1);
  });

  it("Adho Mukha Svanasana: an inverted V, hands and feet down, the pelvis the highest joint", () => {
    const { world } = solve("adho-mukha-svanasana-perro-boca-abajo");
    const c = contactHeights(CUBE_FIGURE, world);
    for (const end of ["HandLeft", "HandRight", "FootLeft", "FootRight"] as const) expect(c[end], end).toBeLessThan(0.08);
    expect(world.Hips.p.y).toBeGreaterThan(world.Head.p.y);
    expect(world.Hips.p.y).toBeGreaterThan(0.6);
  });

  it("Bhujangasana (cobra) lies face down: pelvis low, chest lifted", () => {
    const { world } = solve("bhujangasana-cobra");
    expect(world.Hips.p.y).toBeLessThan(0.3);
    expect(world.Head.p.y).toBeGreaterThan(world.Hips.p.y);
  });

  it("the Sun Salutation is the 12 postures of the asana sheet, one breath each", () => {
    const sun = COLD_SANCTUARY_SEQUENCES.find((s) => s.id === "saludo-al-sol")!;
    expect(sun.steps).toHaveLength(12);
    expect(sun.steps[0]!.asana).toBe("pranamasana-oracion");
    expect(sun.steps[7]!.asana).toBe("adho-mukha-svanasana-perro-boca-abajo");
    expect(sun.steps.every((s) => s.phases === 3)).toBe(true);
  });
});
