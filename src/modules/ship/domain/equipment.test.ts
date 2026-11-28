import { describe, expect, it } from "vitest";
import { explorerDesign } from "../data/explorer";
import { BATTERY_AGZN, BATTERY_LI5, CABIN_AL2195, CABIN_AREA_M2, CABIN_CFRP, CABIN_STEEL, CABINS, POWER_MMRTG, POWER_NONE, POWER_RIGID, REGION_SUN_AU, SHIELD_WHIPPLE, SHIELD_WHIPPLE_STEEL } from "../data/equipment";
import { EQUIPMENT_PARTS, partById, partOptions } from "../data/parts";
import { equipmentMassKg, wallArealDensityKgM2, type Equipment } from "./equipment";
import { criticalDiameterCm, debrisDamageFactor, monolithicCriticalDiameterCm, whippleCriticalDiameterCm } from "./mmod";
import { powerBudget, solarOutputW } from "./power";
import { installedId, isEmptyPart, withPart } from "./refit";
import { Ship } from "./ship";

const part = (id: string) => partById(id)!;
const eq = (over: Partial<Equipment>): Equipment => ({ id: "x", name: "x", kind: "avionica", massKg: 1, powerW: 0, materials: "", flight: "", basis: "", sources: [], ...over });

describe("probe equipment", () => {
  it("the dry mass is the equipment plus thrusters plus tanks", () => {
    const d = explorerDesign();
    const thrusters = [...d.mainEngines, ...d.rcs].reduce((m, t) => m + t.model.dryMassKg, 0);
    const tanks = d.tanks.reduce((m, t) => m + t.spec.dryMassKg, 0);
    expect(Ship.create(d).dryMassKg).toBeCloseTo(equipmentMassKg(d.equipment) + thrusters + tanks);
  });

  it("every equipment part says how its numbers were reached and where they come from", () => {
    for (const p of EQUIPMENT_PARTS) {
      expect(p.equipment.basis.length, p.id).toBeGreaterThan(5);
      expect(p.equipment.sources.every((s) => s.startsWith("https://")), p.id).toBe(true);
      expect(p.equipment.sources.length, p.id).toBeGreaterThan(0);
    }
  });

  it("a cabin weighs its shell (area × wall) plus the fittings", () => {
    expect(CABIN_AL2195.massKg).toBe(Math.round(CABIN_AREA_M2 * wallArealDensityKgM2(CABIN_AL2195.wall!) + 120));
    // Al-Li is 30 % stronger and 5 % lighter than the Columbus 2219 wall: lighter for the same strength.
    const masses = Object.fromEntries(CABINS.map((c) => [c.id, c.massKg]));
    expect(masses["cabina-al-li-2195"]).toBeLessThan(masses["cabina-al-2219"]!);
    expect(CABIN_STEEL.massKg).toBeGreaterThan(CABIN_AL2195.massKg);
    expect(CABIN_CFRP.massKg).toBeLessThan(CABIN_AL2195.massKg);
  });

  it("swapping equipment keeps one per slot and changes mass and Δv", () => {
    const d = explorerDesign();
    const steel = withPart(d, "cabina", part(CABIN_STEEL.id));
    expect(steel.equipment.filter((e) => e.kind === "cabina")).toEqual([CABIN_STEEL]);
    expect(installedId(steel, "cabina")).toBe(CABIN_STEEL.id);
    expect(Ship.create(steel).mainDeltaV()).toBeLessThan(Ship.create(d).mainDeltaV());
    expect(() => withPart(d, "cabina", part(BATTERY_LI5.id))).toThrow();
    expect(partOptions(d, "bateria").map((p) => p.id)).toEqual(["li-ion-156", BATTERY_AGZN.id]);
    expect(isEmptyPart(part(POWER_NONE.id))).toBe(true);
  });
});

describe("power budget", () => {
  it("solar output falls with the square of the distance", () => {
    expect(solarOutputW(1000, 2)).toBe(250);
  });

  it("adds what is produced and drawn; a deficit drains the battery in hours", () => {
    const list = [eq({ powerW: 100, solar: true }), eq({ powerW: -300 }), eq({ storageWh: 1000, rechargeable: true })];
    const b = powerBudget(list, 1);
    expect(b.producedW).toBe(100);
    expect(b.drawnW).toBe(300);
    expect(b.enduranceH).toBeCloseTo(5);
    expect(powerBudget([eq({ powerW: 400, solar: true }), eq({ powerW: -300 })], 1).enduranceH).toBe(Infinity);
  });

  it("the starting probe has power to spare at Bennu; two MMRTGs do not cover it and the battery lasts hours", () => {
    const start = powerBudget(explorerDesign().equipment, REGION_SUN_AU.value);
    expect(start.producedW).toBeCloseTo(POWER_RIGID.powerW / REGION_SUN_AU.value ** 2);
    expect(start.netW).toBeGreaterThan(0);
    const rtg = powerBudget(withPart(explorerDesign(), "energia", part(POWER_MMRTG.id)).equipment, REGION_SUN_AU.value);
    expect(rtg.netW).toBeCloseTo(250 - 660);
    expect(rtg.enduranceH).toBeCloseTo(BATTERY_LI5.storageWh! / 410);
  });

  it("a silver-zinc battery is primary: it does not recharge", () => {
    const b = powerBudget(withPart(explorerDesign(), "bateria", part(BATTERY_AGZN.id)).equipment, 1);
    expect(b.rechargeable).toBe(false);
    expect(b.storageWh).toBe(2 * 296 * 30);
  });
});

describe("micrometeoroid shield", () => {
  it("a bare wall stops a sphere a quarter of its thickness (7 km/s rule of thumb)", () => {
    expect(monolithicCriticalDiameterCm(2.7)).toBeCloseTo(0.25);
  });

  it("the handbook's Whipple example (1.2 mm bumper, 10 cm, 3.2 mm wall) stops about half a centimetre", () => {
    const dc = whippleCriticalDiameterCm(0.32, SHIELD_WHIPPLE.bumper!);
    expect(dc).toBeGreaterThan(0.5);
    expect(dc).toBeLessThan(0.65);
  });

  it("a Whipple shield stops far bigger particles than the bare wall; a steel bumper a little less than aluminium", () => {
    const d = explorerDesign();
    const bare = criticalDiameterCm(d.equipment);
    const al = criticalDiameterCm(withPart(d, "escudo", part(SHIELD_WHIPPLE.id)).equipment);
    const steel = criticalDiameterCm(withPart(d, "escudo", part(SHIELD_WHIPPLE_STEEL.id)).equipment);
    expect(al / bare).toBeGreaterThan(5);
    expect(steel).toBeLessThan(al);
    expect(debrisDamageFactor(d.equipment)).toBeCloseTo(1);
    expect(debrisDamageFactor(withPart(d, "escudo", part(SHIELD_WHIPPLE.id)).equipment)).toBeCloseTo(bare / al);
  });

  it("a heavier wall takes less debris damage; a thin composite one more", () => {
    const d = explorerDesign();
    expect(debrisDamageFactor(withPart(d, "cabina", part(CABIN_STEEL.id)).equipment)).toBeLessThan(1);
    expect(debrisDamageFactor(withPart(d, "cabina", part(CABIN_CFRP.id)).equipment)).toBeGreaterThan(1);
  });
});
