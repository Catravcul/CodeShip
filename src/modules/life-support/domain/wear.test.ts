import { describe, expect, it } from "vitest";
import { ALL_FAILURES, ECLSS_MACHINES } from "../data/eclss-machines";
import { LifeSupport, nominalDriverPerDay, SERVICE_AT, type LifeSupportConfig } from "./life-support";

const STATION: LifeSupportConfig = { crew: 1, freeAirM3: 388, waterKg: 1200, foodKg: 2.39 * 180, o2TankKg: 100, n2TankKg: 100, spares: { "lecho-zeolita": 1, "lecho-mf": 1, "oru-valvula-asv": 1 } };
const worn = (c: Partial<LifeSupportConfig> = {}) => new LifeSupport(ECLSS_MACHINES, { ...STATION, ...c }, { wear: true });

describe("SV-15 failures have causes, not dice", () => {
  it("every failure mode says what causes it, what drives it, its life and how sure that number is", () => {
    for (const f of ALL_FAILURES) {
      expect(f.wear.cause.length, f.id).toBeGreaterThan(20);
      expect(f.wear.causeSource, f.id).toMatch(/^https:\/\//);
      expect(f.wear.life, f.id).toBeGreaterThan(0);
      expect(["real", "estimacion", "licencia"]).toContain(f.wear.lifeLabel);
      expect(f.wear.startShare, f.id).toBeLessThan(SERVICE_AT.value);
      expect(f.wear.service.resetTo, f.id).toBeLessThan(SERVICE_AT.value);
    }
  });

  it("the real lives stay: the PCPA's 2300 h and the multifiltration bed's 9000 lb (4082 kg)", () => {
    const by = (id: string) => ALL_FAILURES.find((f) => f.id === id)!.wear;
    expect(by("upa-pcpa")).toMatchObject({ driver: "horas-proceso", life: 2300, lifeLabel: "real" });
    expect(by("wpa-lecho-mf")).toMatchObject({ driver: "kg-agua", life: 4082, lifeLabel: "real" });
  });

  it("the CDRA's beds fail when their half-cycles reach their life: 16 a day, deterministic", () => {
    const ls = worn();
    const w = ALL_FAILURES.find((f) => f.id === "cdra-lechos")!.wear;
    const days = ((1 - w.startShare) * w.life) / 16;
    ls.advance(24 * Math.floor(days - 1));
    expect(ls.active().map((f) => f.id)).not.toContain("cdra-lechos");
    const events = ls.advance(48);
    expect(ls.active().map((f) => f.id)).toContain("cdra-lechos");
    expect(events.some((e) => e.kind === "averia" && e.failure.id === "cdra-lechos")).toBe(true);
    // The same run gives the same failures.
    const again = worn();
    again.advance(24 * Math.floor(days + 1));
    expect(again.active().map((f) => f.id)).toEqual(ls.active().map((f) => f.id));
  });

  it("nothing fails in the first days", () => {
    const ls = worn();
    ls.advance(24 * 3);
    expect(ls.active()).toEqual([]);
  });

  it("from 80 % of its life a preventive maintenance is due, with an event, and done in time it never fails", () => {
    const ls = worn();
    ls.setWear("cdra-lechos", 0.795);
    const ev = ls.advance(24 * 2);
    expect(ev.some((e) => e.kind === "desgaste" && e.failure.id === "cdra-lechos")).toBe(true);
    expect(ls.due().map((f) => f.id)).toContain("cdra-lechos");
    const st = ls.wearStatus("cdra-lechos");
    expect(st.due).toBe(true);
    expect(st.daysLeft).toBeGreaterThan(10);
    expect(st.daysLeft).toBeLessThan(80);
    // Cleaning the beds takes no spare and leaves them at 30 %.
    expect(ls.service("cdra-lechos")).toBe(true);
    expect(ls.spares("lecho-zeolita")).toBe(1);
    expect(ls.wearShare("cdra-lechos")).toBeCloseTo(0.3, 5);
    expect(ls.due().map((f) => f.id)).not.toContain("cdra-lechos");
  });

  it("a preventive change that needs a spare uses it; without one it cannot be done", () => {
    const ls = worn({ spares: {} });
    ls.setWear("wpa-lecho-mf", 0.9);
    expect(ls.wearStatus("wpa-lecho-mf").due).toBe(true);
    expect(ls.service("wpa-lecho-mf")).toBe(false);
    ls.addSpare("lecho-mf");
    expect(ls.service("wpa-lecho-mf")).toBe(true);
    expect(ls.spares("lecho-mf")).toBe(0);
    expect(ls.wearShare("wpa-lecho-mf")).toBe(0);
  });

  it("dusty zeolite beds wear the selector valve faster (skipped maintenance has a cost)", () => {
    const clean = worn();
    const dusty = worn();
    clean.setWear("cdra-lechos", 0);
    dusty.setWear("cdra-lechos", 0.79);
    clean.advance(24);
    dusty.advance(24);
    expect(dusty.wearShare("cdra-valvula")).toBeGreaterThan(clean.wearShare("cdra-valvula"));
  });

  it("modes driven by what is treated wear with the crew: four people use the water bed four times faster", () => {
    const one = worn();
    const four = worn({ crew: 4 });
    const a = one.wearShare("wpa-lecho-mf");
    one.advance(24 * 3);
    four.advance(24 * 3);
    expect(four.wearShare("wpa-lecho-mf") - a).toBeGreaterThan(3 * (one.wearShare("wpa-lecho-mf") - a));
  });

  it("a repaired part starts new; a stopped machine does not wear", () => {
    const ls = worn({ spares: { "oru-valvula-asv": 1 } });
    ls.fail("cdra-valvula");
    const lechos = ls.wearShare("cdra-lechos");
    ls.advance(24);
    expect(ls.wearShare("cdra-lechos")).toBe(lechos);
    expect(ls.repair("cdra-valvula")).toBe(true);
    expect(ls.wearShare("cdra-valvula")).toBe(0);
  });

  it("the readout gives each machine its most worn mode, with its cause", () => {
    const ls = worn();
    ls.advance(1);
    const cdra = ls.readout().machines.find((m) => m.id === "cdra")!;
    expect(cdra.wear?.failure.id).toBe("cdra-lechos");
    expect(cdra.wear?.failure.wear.cause).toMatch(/zeolita/);
  });

  it("nominal drivers per day: 24 h, 16 half-cycles, the crew's urine and water", () => {
    const w = (id: string) => ALL_FAILURES.find((f) => f.id === id)!.wear;
    expect(nominalDriverPerDay(w("oga-bomba"), 1)).toBe(24);
    expect(nominalDriverPerDay(w("cdra-lechos"), 1)).toBe(16);
    expect(nominalDriverPerDay(w("upa-destilacion"), 2)).toBeCloseTo(2.8, 5);
  });
});

describe("SV-16 the pantry", () => {
  it("a meal at the galley comes out of the pantry, and it is not eaten twice", () => {
    const a = worn();
    const b = worn();
    const start = a.readout().foodKg;
    expect(a.drawMeal(1.195)).toBe(true);
    expect(a.readout().foodKg).toBeCloseTo(start - 1.195, 6);
    a.advance(24);
    b.advance(24);
    expect(a.readout().foodKg).toBeCloseTo(b.readout().foodKg, 6);
  });

  it("no meal from an empty pantry; a cargo unloads food, water, gas and spares", () => {
    const ls = worn({ foodKg: 1 });
    expect(ls.drawMeal(1.195)).toBe(false);
    ls.restock({ foodKg: 100, waterKg: 50, o2Kg: 10, spares: { "lecho-mf": 2 } });
    const r = ls.readout();
    expect(r.foodKg).toBeCloseTo(101, 6);
    expect(r.o2TankKg).toBeCloseTo(110, 6);
    expect(ls.spares("lecho-mf")).toBe(3);
    expect(ls.takeFood(500)).toBeCloseTo(101, 6);
    expect(ls.readout().foodKg).toBe(0);
  });
});
