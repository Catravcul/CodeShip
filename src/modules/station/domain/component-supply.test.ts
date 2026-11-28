import { describe, expect, it } from "vitest";
import { LM_EQUIPMENT } from "@modules/ship/data/apollo-lm";
import { CARRIERS, SUPPLY_CATEGORIES, SUPPLY_ITEMS } from "../data/component-supply";
import { BLUEPRINTS, IMPORT_ONLY_PART_IDS, REAL_PRINT_BLUEPRINTS } from "../data/blueprints";
import { offeredBlueprints } from "../data/outfit";
import { ladder, laddersAreOrdered, planShipment, tierBlocker, type SupplyLauncher } from "./component-supply";

describe("component tiers (EST-50)", () => {
  it("every ladder climbs with its metric and every item carries sources", () => {
    expect(laddersAreOrdered(SUPPLY_ITEMS)).toEqual([]);
    for (const i of SUPPLY_ITEMS) {
      expect(i.sources.length, i.partId).toBeGreaterThan(0);
      expect(i.capacity.source, i.partId).toMatch(/^https:/);
      expect(i.massKg.source, i.partId).toMatch(/^https:/);
    }
    expect(new Set(SUPPLY_ITEMS.map((i) => i.partId)).size).toBe(SUPPLY_ITEMS.length);
  });

  it("each category starts at tier 1; what the LM, Juventas and the Starship carry is at the bottom of its ladder", () => {
    for (const c of SUPPLY_CATEGORIES) {
      const l = ladder(SUPPLY_ITEMS, c.id);
      expect(l.length, c.id).toBeGreaterThan(0);
      expect(l[0]!.tier, c.id).toBe(1);
      for (const i of l.filter((x) => x.deSerie)) expect(i.tier, i.partId).toBe(1);
    }
    const deSerie = SUPPLY_ITEMS.filter((i) => i.deSerie).map((i) => i.partId);
    for (const id of ["lm-dps", "lm-rcs", "lm-etapa-ascenso", "plata-zinc-lm", "sin-fuente", "sin-escudo", "adaptador-idss-lm", "juventas-gas-frio", "raptor-2"]) expect(deSerie).toContain(id);
    for (const e of LM_EQUIPMENT) if (e.kind !== "estructura") expect(deSerie, e.id).toContain(e.id);
  });

  it("a tier opens with a part of the tier below", () => {
    const hipat = SUPPLY_ITEMS.find((i) => i.partId === "aerojet-r-4d-15-hipat")!;
    expect(tierBlocker(hipat, SUPPLY_ITEMS, () => false)).toMatch(/Primero el nivel 2/);
    expect(tierBlocker(hipat, SUPPLY_ITEMS, (id) => id === "aerojet-aj10-190")).toBeUndefined();
  });

  it("shipment: a vehicle that carries it, the cheapest flying launcher that lifts it, the target one only if needed", () => {
    const launchers: SupplyLauncher[] = [
      { id: "a", name: "A", usdPerKg: { value: 3000 }, leoPayloadKg: { value: 20000 } },
      { id: "b", name: "B", usdPerKg: { value: 1500 }, leoPayloadKg: { value: 60000 } },
      { id: "t", name: "T", usdPerKg: { value: 100 }, leoPayloadKg: { value: 100000 }, target: true },
    ];
    expect(planShipment(100, "presurizada", 16, CARRIERS, launchers, 116000)).toMatchObject({ carrier: { id: "cygnus" }, launcher: { id: "b" } });
    expect(planShipment(100, "exterior", 16, CARRIERS, launchers, 116000)).toMatchObject({ carrier: { id: "dragon" } });
    expect(planShipment(5000, "exterior", 16, CARRIERS, launchers, 116000)).toMatchObject({ carrier: "libre", launcher: { id: "t" } });
    expect(planShipment(80000, "exterior", 16, CARRIERS, launchers, 116000).blocker).toMatch(/ningún lanzador/);
    expect(planShipment(200000, "exterior", 1, CARRIERS, launchers, 116000).blocker).toMatch(/brazo/);
  });

  it("with the real-only switch the station prints no engines, tanks, cabins or wings: they are imported", () => {
    const real = offeredBlueprints(BLUEPRINTS, false);
    const parts = real.filter((b) => b.product.kind === "part").map((b) => (b.product as { partId: string }).partId);
    for (const i of SUPPLY_ITEMS) expect(parts, i.partId).not.toContain(i.partId);
    expect(parts.filter((p) => IMPORT_ONLY_PART_IDS.has(p))).toEqual([]);
    expect(real.some((b) => REAL_PRINT_BLUEPRINTS.includes(b))).toBe(true);
    // The code stays: with ?ficcion they are offered again.
    expect(offeredBlueprints(BLUEPRINTS, true).some((b) => b.product.kind === "part" && b.product.partId === "aerojet-r-4d-15-hipat")).toBe(true);
  });
});
