import { describe, expect, it } from "vitest";
import { boulderKg, brachistochrone, thrustN, towPlan } from "./tug";
import { driverLengthM, escapes, flightHours, launchEnergyJ, MassDriver } from "./mass-driver";
import { TUG, MASS_DRIVER } from "../data/craft";
import { Wallet } from "./wallet";
import { DeliveryLine } from "./delivery";

describe("the tug", () => {
  it("40 kW at Isp 3 000 s and 60 % efficiency push with about 1,6 N", () => {
    expect(thrustN(TUG)).toBeCloseTo(1.63, 2);
  });

  it("a 4 m boulder of Bennu's rock weighs about 40 t (ARM's option B lifted up to 4 m)", () => {
    expect(boulderKg(4, 1190) / 1000).toBeCloseTo(39.9, 1);
  });

  it("accelerate half the way, brake the other half: t = 2√(d/a)", () => {
    const leg = brachistochrone(10_000, 1000, 1);
    expect(leg.hours * 3600).toBeCloseTo(2 * Math.sqrt(10_000 / 0.001), 6);
    expect(leg.dvMs).toBeCloseTo(2 * Math.sqrt(10), 6);
  });

  it("a round trip takes longer back (heavier) and burns a little xenon", () => {
    const p = towPlan(TUG, 15_000, 2, 1190);
    expect(p.back.hours).toBeGreaterThan(p.out.hours);
    expect(p.totalHours).toBeCloseTo(p.out.hours + p.back.hours + TUG.captureHours, 9);
    expect(p.xenonKg).toBeGreaterThan(0);
    expect(p.xenonKg).toBeLessThan(5);
    expect(() => towPlan(TUG, 1000, 5, 1190)).toThrow();
  });
});

describe("the mass driver", () => {
  it("Mass Driver Two's 112 m/s at 5 000 m/s² needs 1,25 m of coils and gives 66 kJ to a 10,5 kg bucket", () => {
    expect(driverLengthM(MASS_DRIVER)).toBeCloseTo(1.2544, 4);
    expect(launchEnergyJ(MASS_DRIVER) / 1000).toBeCloseTo(65.9, 1);
    expect(flightHours(11_200, 112)).toBeCloseTo(100 / 3600, 9);
    expect(escapes(112, 1.5)).toBe(true);
    expect(escapes(0.1, 1.5)).toBe(false);
  });

  it("bags and throws a package every few hours", () => {
    const d = new MassDriver(MASS_DRIVER, "x", "X");
    expect(d.tick(MASS_DRIVER.packHours * 2.5)).toBe(2);
    expect(d.progress).toBeCloseTo(0.5, 6);
    expect(d.launched).toBe(2);
  });
});

describe("wallet and deliveries", () => {
  it("credits come in and go out, never below zero", () => {
    const w = new Wallet(100);
    w.earn(50, "misión");
    w.spend(120, "pedido");
    expect(w.balance).toBe(30);
    expect(() => w.spend(31, "x")).toThrow();
    expect(w.history.map((m) => m.credits)).toEqual([50, -120]);
  });

  it("deliveries travel in parallel and land when their hours run out", () => {
    const line = new DeliveryLine();
    line.send("santuario", "a", { kit: 1 }, 10);
    line.send("lanzador", "b", { agua: 2 }, 3);
    expect(line.tick(4).map((d) => d.label)).toEqual(["b"]);
    expect(line.tick(6).map((d) => d.label)).toEqual(["a"]);
    expect(line.pending.length).toBe(0);
  });
});
