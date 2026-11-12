import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Hangar } from "@modules/station/domain/hangar";
import { NODRIZA } from "../data/mothership";
import { AUX_NONE, AUX_PHENACITE, MOTHERSHIP_EQUIPMENT, SHIELD_NONE, SHIELD_WATER_20, radiationShield } from "../data/equipment";
import { Mothership } from "../domain/mothership";
import { applyEquipmentRefit, equipmentOptions, equipmentRefitChore } from "./equipment-refit";

const fresh = () => new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);

describe("mothership equipment in the bay", () => {
  it("offers the rest of the slot's catalogue; only what is in the hangar can be fitted, «nothing» is always free", () => {
    const m = fresh();
    const pe = radiationShield("polietileno", 20);
    const opts = equipmentOptions(m, "blindaje", MOTHERSHIP_EQUIPMENT, new Hangar({ [pe.id]: 1 }));
    expect(opts.some((o) => o.equipment === SHIELD_WATER_20)).toBe(false);
    expect(opts.find((o) => o.equipment.id === pe.id)!.locked).toBeUndefined();
    expect(opts.find((o) => o.equipment === SHIELD_NONE)!.locked).toBeUndefined();
    expect(opts.find((o) => o.equipment.id === "blindaje-agua-10")!.locked).toMatch(/hangar/);
    expect(opts.every((o) => o.equipment.slot === "blindaje")).toBe(true);
  });

  it("the new part leaves the hangar and the old one comes in", () => {
    const m = fresh();
    const h = new Hangar({ [AUX_PHENACITE.id]: 1 });
    applyEquipmentRefit(m, AUX_PHENACITE, h);
    expect(m.equipment("energia-auxiliar")).toBe(AUX_PHENACITE);
    expect(h.count(AUX_PHENACITE.id)).toBe(0);
    applyEquipmentRefit(m, AUX_NONE, h);
    expect(h.count(AUX_PHENACITE.id)).toBe(1);
    expect(h.count(AUX_NONE.id)).toBe(0);
    expect(() => applyEquipmentRefit(m, radiationShield("agua", 10), h)).toThrow();
    expect(m.equipment("blindaje")).toBe(SHIELD_WATER_20);
  });

  it("the chore asks the real mass, predicts the effect and the Δv, then orders the fitting", () => {
    const m = fresh();
    for (const e of [AUX_PHENACITE, radiationShield("polietileno", 10)]) {
      const c = equipmentRefitChore(m, e);
      expect(c.kind).toBe("cambiar-pieza");
      expect(c.exercises.map((x) => x.kind)).toEqual(["choice", "choice", "choice", "order"]);
      for (const x of c.exercises)
        if (x.kind === "choice") {
          expect(new Set(x.options).size).toBe(x.options.length);
          expect(x.correct).toBeLessThan(x.options.length);
        }
      const dv = c.exercises[2]!;
      if (dv.kind === "choice") expect(dv.options[dv.correct]).toBe(`${Math.round(m.withEquipment(e).deltaV()).toLocaleString("es-ES")} m/s`);
    }
    const dose = equipmentRefitChore(m, radiationShield("polietileno", 10)).exercises[1]!;
    if (dose.kind === "choice") expect(dose.options[dose.correct]).toBe(`${Math.round(523 * 0.61)} mSv`);
  });
});
