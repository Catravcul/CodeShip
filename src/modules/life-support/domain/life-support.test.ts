import { describe, expect, it } from "vitest";
import { ECLSS_MACHINES, failureMode } from "../data/eclss-machines";
import { CO2_LIMITS, LifeSupport, nominalWaterRecovery, partialPressurePa, type LifeSupportConfig } from "./life-support";

const STATION: LifeSupportConfig = { crew: 1, freeAirM3: 388, waterKg: 800, foodKg: 2.39 * 180, o2TankKg: 100, n2TankKg: 100, spares: { "lecho-zeolita": 1, "lecho-mf": 1 } };
const fresh = (c: Partial<LifeSupportConfig> = {}) => new LifeSupport(ECLSS_MACHINES, { ...STATION, ...c }, { wear: false });
const mmHg = (pa: number) => pa / 133.322;

describe("SV-02 the cabin air", () => {
  it("starts at sea level: 101,3 kPa with 21 % O₂ (21,3 kPa)", () => {
    const r = fresh().readout();
    expect(r.pressureKPa).toBeCloseTo(101.3, 0);
    expect(r.ppO2KPa).toBeCloseTo(21.3, 0);
  });

  it("partial pressure from mass: 1,08 kg of CO₂ in 388 m³ at 22 °C is about 1,2 mmHg", () => {
    expect(mmHg(partialPressurePa(1.08, 0.04401, 388))).toBeCloseTo(1.16, 1);
  });

  it("with the CDRA working, one person's CO₂ stays far under NASA's 3 mmHg", () => {
    const ls = fresh();
    ls.advance(24 * 5);
    expect(ls.readout().ppCO2MmHg).toBeLessThan(CO2_LIMITS.nasaStd.value);
    expect(ls.readout().co2State).toBe("ok");
  });

  it("with its zeolite beds clogged the CO₂ climbs past the 5,3 mmHg alarm within a week, and comes back once repaired", () => {
    const ls = fresh();
    ls.fail("cdra-lechos");
    ls.advance(24 * 7);
    const high = ls.readout();
    expect(high.ppCO2MmHg).toBeGreaterThan(CO2_LIMITS.alarm.value);
    expect(high.co2State).toBe("alarma");
    expect(ls.repair("cdra-lechos")).toBe(true);
    expect(ls.spares("lecho-zeolita")).toBe(0);
    ls.advance(24);
    expect(ls.readout().ppCO2MmHg).toBeLessThan(CO2_LIMITS.nasaStd.value);
  });

  it("a repair needs its spare: without one the failure stays", () => {
    const ls = fresh({ spares: {} });
    ls.fail("cdra-valvula");
    expect(ls.repair("cdra-valvula")).toBe(false);
    expect(ls.active().map((f) => f.id)).toEqual(["cdra-valvula"]);
  });

  it("the OGA keeps the O₂ at its set point, from water: 1,125 kg of water per kg of O₂", () => {
    const ls = fresh();
    const w0 = ls.readout().waterKg;
    ls.advance(24 * 10);
    expect(ls.readout().ppO2KPa).toBeCloseTo(21.3, 0);
    expect(ls.readout().waterKg).toBeLessThan(w0);
  });

  it("without the OGA, the O₂ tanks feed the cabin until they run out", () => {
    const ls = fresh({ o2TankKg: 5 });
    ls.fail("oga-bomba");
    ls.advance(24 * 3);
    expect(ls.readout().o2TankKg).toBeLessThan(5);
    expect(ls.readout().ppO2KPa).toBeGreaterThan(20);
  });
});

describe("SV-03 water, food and power", () => {
  it("nominal recovery: 98 % with the BPA and 93–94 % without it, as the ISS before June 2023", () => {
    expect(nominalWaterRecovery({ bpa: true })).toBeCloseTo(0.98, 2);
    const without = nominalWaterRecovery({ bpa: false });
    expect(without).toBeGreaterThan(0.93);
    expect(without).toBeLessThan(0.945);
  });

  it("with the UPA down, urine waits in its tank and the drinking water falls faster", () => {
    const a = fresh();
    const b = fresh();
    b.fail("upa-destilacion");
    a.advance(24 * 10);
    b.advance(24 * 10);
    expect(b.readout().waterKg).toBeLessThan(a.readout().waterKg - 10);
    expect(b.readout().urineTankKg).toBeGreaterThan(13);
  });

  it("the water-processor's multifiltration bed is maintenance: half its capacity until replaced", () => {
    const ls = fresh();
    ls.fail("wpa-lecho-mf");
    expect(ls.capacity("wpa")).toBe(failureMode("wpa-lecho-mf")!.capacity);
    expect(ls.active()[0]!.maintenance).toBe(true);
    ls.repair("wpa-lecho-mf");
    expect(ls.capacity("wpa")).toBe(1);
  });

  it("food: 2,39 kg per person and day; days of food left", () => {
    const ls = fresh({ crew: 2, foodKg: 2.39 * 2 * 30 });
    expect(ls.readout().foodDays).toBeCloseTo(30);
    ls.advance(24 * 3);
    expect(ls.readout().foodDays).toBeCloseTo(27);
  });

  it("power: the OGA draws 3573 W processing; the total is what the host's arrays must give", () => {
    const ls = fresh();
    ls.advance(1);
    const r = ls.readout();
    expect(r.powerW).toBeGreaterThan(1000);
    expect(r.powerW).toBeLessThan(8000);
    ls.fail("itcs-bomba");
    ls.advance(1);
    // Without the coolant loops the cooled machines shut down.
    expect(ls.readout().powerW).toBeLessThan(r.powerW);
    expect(ls.working("cdra")).toBe(false);
  });

  it("without cooling the cabin warms up; the heat load counts crew and machines", () => {
    const ls = fresh();
    expect(ls.readout().heatW).toBeGreaterThan(148);
    ls.fail("itcs-bomba");
    ls.advance(6);
    expect(ls.readout().cabinC).toBeGreaterThan(23);
  });
});

describe("SV-04 failures", () => {
  it("an event says when the CO₂ alarm starts", () => {
    const ls = fresh();
    ls.fail("cdra-valvula");
    const events = ls.advance(24 * 5);
    expect(events.some((e) => e.kind === "alarma-co2")).toBe(true);
  });
});

describe("SV-12 only the crew aboard breathes, eats and drinks", () => {
  it("an empty vehicle has no metabolic load: no O₂ breathed, no CO₂, food or water used", () => {
    const ls = new LifeSupport(ECLSS_MACHINES, STATION);
    ls.setCrewAboard(0);
    expect(ls.crewAboard).toBe(0);
    const before = ls.readout();
    ls.advance(24 * 30);
    const r = ls.readout();
    expect(r.foodKg).toBe(before.foodKg);
    // Only the OGA's water for the O₂ the hull leaks (well under a kilo a month); she would drink ~0,4 kg a day net.
    expect(before.waterKg - r.waterKg).toBeLessThan(1);
    expect(r.ppCO2MmHg).toBeLessThan(before.ppCO2MmHg);
    expect(r.heatW).toBeCloseTo(r.powerW, 6);
    for (const v of Object.values(r)) if (typeof v === "number") expect(Number.isFinite(v) || v === Infinity).toBe(true);
  });

  it("an empty vehicle still runs its machines and wears what runs by the hour, but not what runs on her urine", () => {
    const ls = new LifeSupport(ECLSS_MACHINES, STATION, { wear: true });
    ls.setCrewAboard(0);
    const oga = ls.wearShare("oga-bomba");
    const upa = ls.wearShare("upa-destilacion");
    ls.advance(24 * 10);
    expect(ls.readout().powerW).toBeGreaterThan(0);
    expect(ls.wearShare("oga-bomba")).toBeGreaterThan(oga);
    expect(ls.wearShare("upa-destilacion")).toBe(upa);
  });

  it("with her back aboard, the load comes back", () => {
    const ls = new LifeSupport(ECLSS_MACHINES, STATION);
    ls.setCrewAboard(0);
    ls.advance(24);
    ls.setCrewAboard(1);
    const food = ls.readout().foodKg;
    ls.advance(24);
    expect(ls.readout().foodKg).toBeLessThan(food);
  });
});
