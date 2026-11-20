import { describe, expect, it } from "vitest";
import { Plant } from "@modules/garden/domain/plant";
import { CHILE_ESPANOLA, LETTUCE_OUTREDGEOUS } from "@modules/garden/data/species";
import { Cat } from "@modules/pets/domain/cat";
import { Hen } from "@modules/poultry/domain/hen";
import { explorerDesign } from "@modules/ship/data/explorer";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { PROCESSES } from "@modules/kitchen/data/processes";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { WORKOUTS } from "@modules/wellness/data/exercise";
import { MACHINES } from "@modules/life-support/data/machines";
import { Machine } from "@modules/life-support/domain/machine";
import { Bioreactor } from "@modules/cultured-meat/domain/bioreactor";
import { Health } from "@modules/medical/domain/health";
import { PROTOCOLS } from "@modules/medical/data/protocols";
import { classifyStep, firstSource } from "../domain/step-visual";
import type { Chore } from "../domain/chore";
import { bioreactorChores, catChores, coopDoorChore, cookingChore, henChores, machineRepairChore, patientChore, plantChores, processChore, repairChore, workoutChore, yogaChore } from "./catalog";
import { choreVisuals, STEP_AREAS } from "./step-visuals";

const source = choreVisuals({ recipes: RECIPES, processes: PROCESSES });
const actions = (c: Chore) => c.exercises.flatMap((_, i) => source.acts(c, i)!.map((v) => v.action));

function domesticChores(): Chore[] {
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
  const hens = [new Hen("clara", "Clara")];
  hens[0]!.tick(0.8, 16);
  const b = new Bioreactor();
  const patient = { id: "x", name: "X", kind: "humano" as const, health: new Health("x") };
  return [
    ...plantChores(hurt),
    ...plantChores(ripe),
    ...catChores(cat),
    ...henChores(hens, 3, 5, 14),
    coopDoorChore(),
    ...RECIPES.map((r) => cookingChore(r)),
    ...PROCESSES.map((p) => processChore(p)),
    ...YOGA_SEQUENCES.map(yogaChore),
    ...WORKOUTS.map((w) => workoutChore(w, 30)),
    repairChore(explorerDesign(), 0.5, 1),
    ...MACHINES.map((m, i) => machineRepairChore(new Machine(m), i)),
    ...bioreactorChores(b, 3),
    ...(Object.keys(PROTOCOLS) as (keyof typeof PROTOCOLS)[]).map((k) => patientChore(patient, patient.health.add(k, 0.5, "prueba"))),
  ];
}

describe("VID-10 every chore on board shows its solved steps", () => {
  it("VID-10 every exercise of every domestic chore resolves to at least one visual, never the bare fallback gesture", () => {
    const chores = domesticChores();
    expect(new Set(chores.map((c) => c.kind))).toEqual(
      new Set(["curar-planta", "regar", "cosechar", "alimentar-gato", "calmar-gato", "recoger-huevos", "abrir-gallinero", "cocinar", "procesar", "yoga", "ejercicio", "reparar-nave", "reparar-maquina", "cultivo-sembrar", "atender-paciente", ...chores.map((c) => c.kind)]),
    );
    for (const c of chores)
      c.exercises.forEach((_, i) => {
        const v = source.acts(c, i);
        expect(v?.length, `${c.id} reto ${i + 1}`).toBeGreaterThan(0);
        for (const x of v!) expect(x.action, `${c.id} reto ${i + 1}`).not.toBe("gesto");
      });
  });

  it("VID-10 each area acts in its own way: water, serve, pet, program, fix, treat, pose", () => {
    const chores = domesticChores();
    const of = (kind: string) => actions(chores.find((c) => c.kind === kind)!);
    expect(of("regar")).toContain("regar");
    expect(of("cosechar")).toEqual(expect.arrayContaining(["cortar", "cosechar"]));
    expect(of("alimentar-gato")).toContain("servir");
    expect(of("calmar-gato")).toContain("mimar");
    expect(of("recoger-huevos")).toContain("cosechar");
    expect(new Set(of("abrir-gallinero"))).toEqual(new Set(["programar"]));
    expect(of("reparar-nave")).toContain("reparar");
    expect(of("reparar-maquina")).toContain("reparar");
    expect(of("atender-paciente")).toContain("curar");
    expect(new Set(of("yoga"))).toEqual(new Set(["postura"]));
    expect(of("cultivo-sembrar")).toEqual(expect.arrayContaining(["tomar", "verter", "programar"]));
  });

  it("VID-10 cooking keeps the kitchen's detail: one visual per recipe step, with its galley spot", () => {
    const eggs = cookingChore(RECIPES.find((r) => r.id === "huevos-revueltos")!);
    expect(eggs.exercises.map((_, i) => source.acts(eggs, i)![0]!.place)).toEqual(["nevera", "encimera", "fogon", "fogon", "fogon", "fogon", "encimera"]);
  });

  it("VID-10 every kind of chore has an area, and the sources chain: the first that knows the challenge answers", () => {
    for (const a of Object.values(STEP_AREAS)) expect(a.fallback).toBeTruthy();
    const none = { acts: () => undefined };
    const one = { acts: () => [{ action: "regar" as const, place: "objetivo" }] };
    expect(firstSource<number>(none, one).acts(0, 0)).toEqual([{ action: "regar", place: "objetivo" }]);
    expect(firstSource<number>(none).acts(0, 0)).toBeUndefined();
    expect(classifyStep("4. llenar la regadera")).toBe("verter");
    expect(classifyStep("0,4")).toBeUndefined();
  });
});
