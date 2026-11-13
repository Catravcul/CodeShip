import { describe, expect, it } from "vitest";
import { classifyStep } from "@modules/chores/domain/step-visual";
import { RECIPES } from "../data/recipes";
import { PROCESSES } from "../data/processes";
import { kitchenVisuals } from "./kitchen-visuals";

const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;
const visualsOf = (id: string) => {
  const r = recipe(id);
  return kitchenVisuals(r.steps.value, { ingredients: Object.keys(r.ingredients) });
};

describe("VID-08 kitchen step visuals", () => {
  it("VID-08 scrambled eggs: fridge, crack into the bowl, hot pan, stir in the pan, cook with heat, season, plate", () => {
    const v = visualsOf("huevos-revueltos");
    expect(v.map((x) => x.action)).toEqual(["tomar", "cascar", "calentar", "remover", "calentar", "sazonar", "emplatar"]);
    expect(v[0]).toMatchObject({ place: "nevera", tint: "huevo" });
    expect(v[1]).toMatchObject({ place: "encimera", vessel: "bol", tint: "huevo" });
    expect(v[2]).toMatchObject({ place: "fogon", vessel: "sarten", heat: true });
    expect(v[3]).toMatchObject({ place: "fogon", vessel: "sarten", heat: true });
    expect(v[6]).toMatchObject({ place: "encimera", vessel: "plato" });
  });

  it("VID-08 every step of every recipe and process resolves to a real action (no fallback gesture)", () => {
    for (const r of RECIPES) {
      const v = kitchenVisuals(r.steps.value, { ingredients: Object.keys(r.ingredients) });
      expect(v).toHaveLength(r.steps.value.length);
      v.forEach((x, i) => expect(x.action, `${r.id} paso ${i + 1}: ${r.steps.value[i]}`).not.toBe("gesto"));
    }
    for (const p of PROCESSES) {
      const v = kitchenVisuals(p.steps.value, { ingredients: Object.keys(p.inputs), machine: p.machine });
      v.forEach((x, i) => expect(x.action, `${p.id} paso ${i + 1}: ${p.steps.value[i]}`).not.toBe("gesto"));
    }
  });

  it("VID-08 processes happen at their machine: grinding at the mill, boiling soy in the processor", () => {
    const mill = PROCESSES.find((p) => p.id === "moler-trigo")!;
    expect(kitchenVisuals(mill.steps.value, { machine: mill.machine }).find((x) => x.action === "moler")?.place).toBe("molino");
    const tofu = PROCESSES.find((p) => p.id === "hacer-tofu")!;
    const tv = kitchenVisuals(tofu.steps.value, { ingredients: Object.keys(tofu.inputs), machine: tofu.machine });
    expect(tv[2]).toMatchObject({ action: "hervir", place: "procesador", heat: true });
  });

  it("VID-08 oven, pot and dry stores: roasting goes in the oven, porridge in the pot, oats from the cupboard", () => {
    expect(visualsOf("cacahuetes-tostados")[3]).toMatchObject({ action: "hornear", place: "horno", heat: true });
    const g = visualsOf("gachas-avena");
    expect(g[0]).toMatchObject({ action: "tomar", place: "despensa", tint: "avena" });
    expect(g[1]).toMatchObject({ action: "hervir", place: "fogon", vessel: "olla" });
    expect(g[2]).toMatchObject({ action: "remover", place: "fogon", vessel: "olla" });
  });

  it("VID-08 an unknown step falls back to a gesture at the counter", () => {
    expect(classifyStep("canta una canción")).toBeUndefined();
    expect(kitchenVisuals(["canta una canción"])[0]).toMatchObject({ action: "gesto", place: "encimera", tint: "generico" });
  });
});
