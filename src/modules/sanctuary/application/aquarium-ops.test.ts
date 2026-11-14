import { describe, expect, it } from "vitest";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { STEP_AREAS, choreVisuals } from "@modules/chores/application/step-visuals";
import { CHORE_CATEGORY } from "@modules/chores/domain/chore";
import { RingAquarium } from "../domain/aquarium";
import { AquariumOps } from "./aquarium-ops";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const solve = (ops: AquariumOps, id: string) => {
  const chore = ops.chores().find((c) => c.id === id);
  if (!chore) throw new Error(`no hay ${id}: ${ops.chores().map((c) => c.id).join(", ")}`);
  const s = ops.start(chore);
  for (const ex of chore.exercises) expect(s.answer(right(ex))).toBe(true);
  expect(s.run.status).toBe("done");
};
const calm = () => {
  let stress = 0.5;
  return { port: { startle: (a: number) => (stress = Math.min(1, Math.max(0, stress + a))) }, get: () => stress };
};

describe("ring aquarium use cases (VID-11)", () => {
  it("at first: feed the school and clean the glass; no friendship and no help yet", () => {
    const ids = new AquariumOps().chores().map((c) => c.id);
    expect(ids).toEqual(["acuario-comer", "acuario-cristal"]);
  });

  it("every challenge has its right answer among the options, and options are distinct", () => {
    const ops = new AquariumOps(new RingAquarium({ nitrateMgL: 45 }));
    solve(ops, "acuario-comer");
    solve(ops, "acuario-amistad");
    for (const c of ops.chores())
      for (const ex of c.exercises) if (ex.kind === "choice") expect(new Set(ex.options).size, ex.id).toBe(ex.options.length);
  });

  it("feeding is a care chore: hunger is settled and the school now knows her (friendship offered)", () => {
    const ops = new AquariumOps();
    solve(ops, "acuario-comer");
    expect(ops.tank.hunger).toBe(0);
    expect(ops.chores().map((c) => c.id)).toContain("acuario-amistad");
  });

  it("a wrong order does not feed them (the chore engine counts the mistake)", () => {
    const ops = new AquariumOps();
    const chore = ops.chores()[0]!;
    const s = ops.start(chore);
    s.answer({ kind: "choice", index: (chore.exercises[0] as { correct: number }).correct + 1 });
    expect(s.run.mistakes).toBe(1);
    expect(ops.tank.hunger).toBeGreaterThan(0);
  });

  it("make friends (VID-12): the program makes them friends, calms Doménica and opens the help programs", () => {
    const c = calm();
    const ops = new AquariumOps(undefined, c.port);
    solve(ops, "acuario-comer");
    solve(ops, "acuario-amistad");
    expect(ops.tank.friends).toBe(true);
    expect(ops.drainEvents()).toContainEqual({ type: "amigos" });
    expect(c.get()).toBeLessThan(0.5);
    const ids = ops.chores().map((x) => x.id);
    expect(ids).toContain("acuario-ayuda-caracoles-limpian");
    expect(ids).toContain("acuario-ayuda-medakas-avisan");
    expect(ids).not.toContain("acuario-amistad");
    const before = c.get();
    ops.tick(1);
    expect(c.get()).toBeLessThan(before);
  });

  it("ask the snails for help (VID-13): the glass clears and its cleaning chore goes away", () => {
    const ops = new AquariumOps();
    solve(ops, "acuario-comer");
    solve(ops, "acuario-amistad");
    const algae = ops.tank.algae;
    solve(ops, "acuario-ayuda-caracoles-limpian");
    expect(ops.tank.algae).toBeLessThan(algae);
    expect(ops.chores().map((c) => c.id)).not.toContain("acuario-cristal");
    expect(ops.drainEvents()).toContainEqual({ type: "ayuda", helper: "caracoles-limpian" });
  });

  it("ask the medaka to warn (VID-13): at 38 mg/L they gather at the glass and the water change shows up", () => {
    const ops = new AquariumOps();
    solve(ops, "acuario-comer");
    solve(ops, "acuario-amistad");
    expect(ops.chores().map((c) => c.id)).not.toContain("acuario-agua");
    solve(ops, "acuario-ayuda-medakas-avisan");
    expect(ops.drainEvents()).toContainEqual({ type: "aviso", reason: "nitrato" });
    solve(ops, "acuario-agua");
    expect(ops.tank.nitrateMgL).toBeCloseTo(38 * 0.8, 6);
  });

  it("its chores are animal care and act their steps out (StepVisual): flakes served, glass washed, programs written", () => {
    expect(CHORE_CATEGORY["cuidar-acuario"]).toBe("animales");
    expect(STEP_AREAS["amistad-acuario"].only).toBe("programar");
    const ops = new AquariumOps();
    const v = choreVisuals({ recipes: [] });
    const feed = ops.chores().find((c) => c.id === "acuario-comer")!;
    expect(v.acts(feed, 1)?.map((a) => a.action)).toEqual(["revisar", "servir", "revisar", "lavar"]);
    const glass = ops.chores().find((c) => c.id === "acuario-cristal")!;
    expect(v.acts(glass, 1)?.map((a) => a.action)).toContain("lavar");
  });
});
