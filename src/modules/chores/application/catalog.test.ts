import { describe, expect, it } from "vitest";
import type { Exercise } from "@modules/mind-duel/domain/exercise";
import { Plant } from "@modules/garden/domain/plant";
import { CHILE_ESPANOLA, LETTUCE_OUTREDGEOUS } from "@modules/garden/data/species";
import { Cat } from "@modules/pets/domain/cat";
import { explorerDesign } from "@modules/ship/data/explorer";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { YOGA_SEQUENCES, SUN_SALUTATION } from "@modules/wellness/data/yoga";
import { catChores, cookingChore, plantChores, repairChore, shipCode, toCall, yogaChore } from "./catalog";

function valid(e: Exercise) {
  if (e.kind === "order") {
    expect(new Set(e.blocks.map((b) => b.id)).size).toBe(e.blocks.length);
    expect(e.solution.every((id) => e.blocks.some((b) => b.id === id))).toBe(true);
  } else {
    expect(e.correct).toBeGreaterThanOrEqual(0);
    expect(e.correct).toBeLessThan(e.options.length);
    expect(new Set(e.options).size).toBe(e.options.length);
  }
}

describe("chore catalog", () => {
  it("turns recipe steps into calls", () => {
    expect(toCall("lava las hojas")).toBe("lavaLasHojas();");
    expect(toCall("añade la lenteja y agua")).toBe("anadeLaLentejaY();");
  });

  it("every generated chore has valid, uniquely identified challenges", () => {
    const hurt = new Plant("l1", LETTUCE_OUTREDGEOUS);
    hurt.damage(0.5);
    for (let i = 0; i < 6; i++) hurt.tick(0.25, { lit: true });
    const ripe = new Plant("c1", CHILE_ESPANOLA);
    ripe.shake();
    for (let d = 0; d < 101; d++) {
      ripe.tick(1, { lit: true });
      ripe.waterIt();
    }
    const cat = new Cat("luna", "Luna", 4);
    cat.tick(0.8, { resourcesOk: false });
    const chores = [
      ...plantChores(hurt),
      ...plantChores(ripe),
      ...catChores(cat),
      ...RECIPES.map(cookingChore),
      ...YOGA_SEQUENCES.map(yogaChore),
      ...[0, 1, 2, 3, 4].map((s) => repairChore(explorerDesign(), 0.5, s)),
    ];
    expect(chores.map((c) => c.kind)).toEqual(expect.arrayContaining(["curar-planta", "regar", "cosechar", "alimentar-gato", "calmar-gato", "cocinar", "yoga", "reparar-nave"]));
    const ids = chores.flatMap((c) => c.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of chores) c.exercises.forEach(valid);
  });

  it("the cat's meal uses the real energy formula (RER × factor ÷ 2 meals)", () => {
    const cat = new Cat("luna", "Luna", 4);
    cat.tick(0.6, { resourcesOk: true });
    const ex = catChores(cat).find((c) => c.kind === "alimentar-gato")!.exercises[0]!;
    if (ex.kind !== "choice") throw new Error("expected a choice");
    expect(ex.options[ex.correct]).toBe(`${Math.round((70 * 4 ** 0.75 * 1.2) / 2)} kcal`); // 119 kcal
  });

  it("yoga: one challenge per posture, in the sequence's order", () => {
    const chore = yogaChore(SUN_SALUTATION);
    expect(chore.exercises).toHaveLength(12);
    const first = chore.exercises[0]!;
    if (first.kind !== "choice") throw new Error("expected a choice");
    expect(first.options[first.correct]).toBe("Pranamasana · exhala");
  });

  it("repair: exactly one line of the ship's code is corrupted, and it is the answer", () => {
    const original = shipCode(explorerDesign()).map((b) => b.pseudo);
    for (let seed = 0; seed < 5; seed++) {
      const ex = repairChore(explorerDesign(), 0.5, seed).exercises[0]!;
      if (ex.kind !== "choice") throw new Error("expected a choice");
      const changed = ex.code.filter((b, i) => b.pseudo !== original[i]);
      expect(changed).toHaveLength(1);
      expect(ex.options[ex.correct]).toBe(changed[0]!.pseudo);
    }
    expect(original[0]).toContain("490 N");
  });
});
