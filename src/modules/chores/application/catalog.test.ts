import { describe, expect, it } from "vitest";
import type { Exercise } from "@modules/mind-duel/domain/exercise";
import { Plant } from "@modules/garden/domain/plant";
import { CHILE_ESPANOLA, LETTUCE_OUTREDGEOUS } from "@modules/garden/data/species";
import { Cat } from "@modules/pets/domain/cat";
import { explorerDesign } from "@modules/ship/data/explorer";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { YOGA_SEQUENCES, SUN_SALUTATION } from "@modules/wellness/data/yoga";
import { PROCESSES } from "@modules/kitchen/data/processes";
import { MACHINES } from "@modules/life-support/data/machines";
import { Machine } from "@modules/life-support/domain/machine";
import { Bioreactor } from "@modules/cultured-meat/domain/bioreactor";
import { Hen } from "@modules/poultry/domain/hen";
import { Health } from "@modules/medical/domain/health";
import { PROTOCOLS } from "@modules/medical/data/protocols";
import { bioreactorChores, henChores, machineRepairChore, patientChore, processChore, plainStep, catMeal, catChores, cookingChore, plantChores, repairChore, shipCode, swapChore, toCall, yogaChore } from "./catalog";
import { partById } from "@modules/ship/data/parts";
import { Ship } from "@modules/ship/domain/ship";
import { withPart } from "@modules/ship/domain/refit";

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
      ...RECIPES.map((r) => cookingChore(r)),
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

  it("production, animals, machines and the sickbay all make valid challenges", () => {
    const b = new Bioreactor();
    const chores = [...bioreactorChores(b, 3)];
    b.seed();
    b.tick(2);
    chores.push(...bioreactorChores(b, 3));
    b.contaminate();
    chores.push(...bioreactorChores(b, 3));
    const hens = [new Hen("a", "A"), new Hen("b", "B")];
    hens[0]!.tick(0.8, 16);
    chores.push(...henChores(hens, 2, 3, 16));
    chores.push(...MACHINES.map((m, i) => machineRepairChore(new Machine(m), i)));
    chores.push(...PROCESSES.map((p) => processChore(p, ["tira todo"])));
    const patient = { id: "x", name: "X", kind: "humano", health: new Health("x") };
    for (const k of Object.keys(PROTOCOLS) as (keyof typeof PROTOCOLS)[]) chores.push(patientChore(patient, patient.health.add(k, 0.5, "prueba")));
    expect(chores.map((c) => c.kind)).toEqual(expect.arrayContaining(["cultivo-sembrar", "cultivo-renovar", "cultivo-esterilizar", "alimentar-gallinas", "recoger-huevos", "reparar-maquina", "procesar", "atender-paciente"]));
    for (const c of chores) for (const e of c.exercises) valid(e);
    const ids = chores.flatMap((c) => c.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cats eat meat or kibble, never crops, in grams from their energy needs", () => {
    const luna = new Cat("luna", "Luna", 4);
    expect(catMeal(luna, { meatG: 500, kibbleG: 0 })).toEqual({ kcal: 119, food: "meat", grams: 99 });
    expect(catMeal(luna, { meatG: 10, kibbleG: 500 })).toEqual({ kcal: 119, food: "kibble", grams: 31 });
    expect(catMeal(luna, { meatG: 0, kibbleG: 0 })).toBeUndefined();
    luna.tick(0.8, { resourcesOk: true });
    expect(catChores(luna, undefined, { meatG: 0, kibbleG: 0 }).some((c) => c.kind === "alimentar-gato")).toBe(false);
    expect(plainStep("cocina hasta {71|50|100} °C")).toBe("cocina hasta 71 °C");
  });
});

describe("part swap chores", () => {
  const full = (d: ReturnType<typeof explorerDesign>) => Ship.create({ ...d, tanks: d.tanks.map((t) => ({ spec: t.spec, fillKg: t.spec.capacityKg })) });

  it("are generated from the real change: new value, delta-v of the new ship and the fitting order", () => {
    const part = partById("aerojet-mr-104h")!;
    const c = swapChore(explorerDesign(), "motor", part);
    expect(c.kind).toBe("cambiar-pieza");
    expect(c.targetId).toBe("motor:aerojet-mr-104h");
    expect(c.exercises.map((e) => e.kind)).toEqual(["choice", "choice", "order"]);
    c.exercises.forEach(valid);
    const [value, dv] = c.exercises as [Exercise & { kind: "choice" }, Exercise & { kind: "choice" }];
    expect(value.options[value.correct]).toBe("510");
    // The changed line shows as a diff: old line removed, new line added.
    expect(value.code.map((b) => b.pseudo[0])).toEqual(["−", "+"]);
    const expected = Math.round(full(withPart(explorerDesign(), "motor", part)).mainDeltaV());
    expect(dv.options[dv.correct]).toBe(`${expected} m/s`);
  });

  it("a tank swap asks for its capacity", () => {
    const c = swapChore(explorerDesign(), "tanque-0", partById("tanque-mmh-300")!);
    const value = c.exercises[0] as Exercise & { kind: "choice" };
    expect(value.options[value.correct]).toBe("300");
    c.exercises.forEach(valid);
  });

  it("an RCS swap is valid too", () => {
    swapChore(explorerDesign(), "rcs", partById("aerojet-mr-111g")!).exercises.forEach(valid);
  });
});
