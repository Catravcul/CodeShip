import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { NODRIZA } from "../data/mothership";
import { AUX_KILOPOWER, AUX_PHENACITE, RADIATION_SHIELDS, SHIELD_AREA_M2, SHIELD_NONE, SHIELD_WATER_20, radiationShield } from "../data/equipment";
import { X3 } from "../data/thrusters";
import { Mothership } from "./mothership";
import { auxPowerKw, relativeDose } from "./equipment";

const fresh = () => new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);

describe("radiation dose behind a shield", () => {
  it("follows Naito & Kodaira's table: 20 g/cm² of polyethylene lets 45 % through, aluminium 55 %", () => {
    expect(relativeDose("polietileno", 20)).toBeCloseTo(0.45);
    expect(relativeDose("aluminio", 20)).toBeCloseTo(0.55);
    expect(relativeDose("polietileno", 7.5)).toBeCloseTo((0.75 + 0.61) / 2);
    expect(relativeDose("agua", 0)).toBe(1);
  });

  it("water sits between aluminium and polyethylene (by its hydrogen); slag is taken as aluminium", () => {
    const w = relativeDose("agua", 20);
    expect(w).toBeGreaterThan(0.45);
    expect(w).toBeLessThan(0.55);
    expect(relativeDose("escoria", 10)).toBe(relativeDose("aluminio", 10));
  });
});

describe("mothership equipment", () => {
  it("starts with the 60 t water shield, so its dry mass is what it was", () => {
    const m = fresh();
    expect(m.equipment("blindaje")).toBe(SHIELD_WATER_20);
    expect(SHIELD_WATER_20.massKg).toBe(60000);
    expect(m.massBudget.find((i) => i.id === "blindaje")!.kg).toBe(60000);
  });

  it("a shield's mass counts twice: the twin ring must weigh as much as the habitat ring", () => {
    const m = fresh();
    const light = m.withEquipment(radiationShield("agua", 10));
    expect(m.dryMassKg - light.dryMassKg).toBeCloseTo(2 * 30000);
    expect(light.deltaV()).toBeGreaterThan(m.deltaV());
    expect(light.ringAngularMomentum).toBeCloseTo(0);
  });

  it("the shield sets the crew's yearly dose and the years to the 600 mSv career limit", () => {
    const m = fresh();
    expect(m.crewDoseMSvPerYear).toBeCloseTo(523 * relativeDose("agua", 20));
    const bare = m.withEquipment(SHIELD_NONE);
    expect(bare.crewDoseMSvPerYear).toBe(523);
    expect(bare.yearsToCareerLimit).toBeCloseTo(600 / 523);
    const pe = m.withEquipment(radiationShield("polietileno", 20));
    expect(pe.crewDoseMSvPerYear).toBeLessThan(m.crewDoseMSvPerYear);
    expect(pe.dryMassKg).toBeCloseTo(m.dryMassKg);
  });

  it("solar wings give 1/r² of their 1 AU power; fission does not care", () => {
    expect(auxPowerKw(AUX_PHENACITE, 2)).toBeCloseTo(148 / 4);
    expect(auxPowerKw(AUX_KILOPOWER, 2)).toBe(40);
  });

  it("auxiliary power lets one more X3 fire: 19 fitted, 18 lit with the reactor alone", () => {
    const m = fresh();
    m.refit("dorsal", X3, 10);
    expect(m.drive.firingUnits).toBe(18);
    const more = m.withEquipment(AUX_PHENACITE);
    expect(more.drive.firingUnits).toBe(19);
    expect(more.availableThrusterKw).toBeCloseTo(m.availableThrusterKw + 148 / NODRIZA.sunDistanceAu.value ** 2);
    expect(m.withEquipment(AUX_KILOPOWER).drive.firingUnits).toBe(18);
  });

  it("every shield option covers the same area", () => {
    for (const s of RADIATION_SHIELDS) expect(s.massKg).toBeCloseTo(s.shield!.arealDensityGcm2 * 10 * SHIELD_AREA_M2);
  });
});
