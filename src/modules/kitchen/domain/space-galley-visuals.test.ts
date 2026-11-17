import { describe, expect, it } from "vitest";
import { ISS_FOOD } from "../data/iss-food";
import { spaceGalleyVisuals } from "./space-galley-visuals";

describe("ANI-01 an ISS-type meal is acted out with its package at the galley", () => {
  it("every step of every ISS dish has a visual on the package, with no pan, hob, oven or fridge", () => {
    for (const r of ISS_FOOD) {
      const v = spaceGalleyVisuals(r.steps.value, Object.keys(r.ingredients));
      expect(v.length, r.id).toBe(r.steps.value.length);
      for (const x of v) {
        expect(x.place).toBe("objetivo");
        expect(["sarten", "olla", "plato", "tabla", "bol", "tarro"]).not.toContain(x.vessel);
      }
    }
  });

  it("each kind of step reads as what the crew does: take out, inject water, knead, wait, heat, cut, eat", () => {
    const v = spaceGalleyVisuals(ISS_FOOD.find((r) => r.id === "iss-avena")!.steps.value, ["envase-rehidratable"]);
    expect(v.map((x) => x.action)).toEqual(["tomar", "verter", "verter", "amasar", "reposar", "cortar", "emplatar"]);
    expect(v[2]!.tint).toBe("agua");
    expect(v[0]!.tint).toBe("avena");
    const beans = spaceGalleyVisuals(ISS_FOOD.find((r) => r.id === "iss-frijoles")!.steps.value);
    expect(beans[1]!).toMatchObject({ action: "calentar", heat: true });
    expect(beans.every((x) => x.action !== "gesto")).toBe(true);
  });
});
