import { describe, expect, it } from "vitest";
import { LM_CARTRIDGES, LM_ECS, LM_LIFE_SUPPORT, LM_LOAD_W, LM_SUBLIMATOR_KG_PER_H } from "../data/lm-ecs";
import { LIOH_CO2_ALARM_MMHG, OpenLoopEcs } from "./open-loop";

describe("LM-03 the Apollo LM's own life support (open loop)", () => {
  it("carries the real stocks: O₂ tanks, water, LiOH cartridges and the Apollo 15–17 batteries", () => {
    expect(LM_ECS.descentO2Kg.value).toBeCloseTo(21.8, 1);
    expect(LM_ECS.descentWaterKg.value + LM_ECS.ascentWaterKg.value).toBeCloseTo(188.7, 0);
    expect(LM_ECS.batteryWh.value).toBe((5 * 415 + 2 * 296) * 30);
    expect(LM_LOAD_W).toBeCloseTo(1067, 0);
    expect(LM_SUBLIMATOR_KG_PER_H).toBeGreaterThan(1.4);
    expect(LM_SUBLIMATOR_KG_PER_H).toBeLessThan(1.8);
    expect(LM_CARTRIDGES).toBeGreaterThanOrEqual(8);
    for (const v of Object.values(LM_ECS)) expect(v.source).toMatch(/^https:\/\//);
  });

  it("lasts about the 75 h of Apollo 17 with two aboard, the batteries and water running out first", () => {
    const ecs = new OpenLoopEcs({ ...LM_LIFE_SUPPORT, crew: 2 });
    const r = ecs.readout();
    expect(r.enduranceH).toBeGreaterThan(70);
    expect(r.enduranceH).toBeLessThan(80);
    expect(["baterías", "agua"]).toContain(r.limit);
  });

  it("only the crew aboard breathe: an empty LM keeps its O₂", () => {
    const ecs = new OpenLoopEcs(LM_LIFE_SUPPORT);
    ecs.setCrewAboard(0);
    ecs.advance(10);
    expect(ecs.readout().o2Kg).toBeCloseTo(LM_LIFE_SUPPORT.o2Kg, 9);
    ecs.setCrewAboard(1);
    ecs.advance(24);
    expect(ecs.readout().o2Kg).toBeCloseTo(LM_LIFE_SUPPORT.o2Kg - 0.89, 6);
  });

  it("a spent LiOH cartridge lets the CO₂ climb past the alarm within hours; changing it is the fix", () => {
    const ecs = new OpenLoopEcs(LM_LIFE_SUPPORT);
    const perCartridgeH = (LM_LIFE_SUPPORT.co2PerCartridgeKg / 1.08) * 24;
    const ev = ecs.advance(perCartridgeH + 0.01);
    expect(ev.some((e) => e.kind === "cartucho-agotado")).toBe(true);
    expect(ecs.cartridgeSpent).toBe(true);
    const later = ecs.advance(2);
    expect(later.some((e) => e.kind === "co2-alto")).toBe(true);
    expect(ecs.readout().ppCO2MmHg).toBeGreaterThan(LIOH_CO2_ALARM_MMHG);
    expect(ecs.changeCartridge()).toBeUndefined();
    expect(ecs.readout().cartridges).toBe(LM_CARTRIDGES - 1);
    ecs.advance(1);
    expect(ecs.readout().ppCO2MmHg).toBeLessThan(0.5);
  });

  it("an EVA empties the cabin: filling it again costs about 2,9 kg of O₂", () => {
    const ecs = new OpenLoopEcs(LM_LIFE_SUPPORT);
    ecs.repressurise();
    expect(LM_LIFE_SUPPORT.o2Kg - ecs.readout().o2Kg).toBeCloseTo(2.88, 1);
  });
});
