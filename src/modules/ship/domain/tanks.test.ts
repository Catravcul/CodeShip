import { describe, expect, it } from "vitest";
import type { RealTank } from "./components";
import { heliumBottleL, pressurantFor, tankSpecOf } from "./tanks";

const tank = (id: string, volumeL: number, massKg: number): RealTank => ({ id, maker: "M", volumeL, meopBar: 310, massKg, material: "Ti", expulsion: "gas", flight: "-", source: "https://example.org" });

describe("helium for a bipropellant pair", () => {
  it("the gas that leaves the bottle fills the tanks at the regulated pressure (isothermal)", () => {
    // 398.2 L of tanks at 20 bar (3.2527 kg/m³) from a 310 bar bottle (44.427 kg/m³): NIST densities.
    const v = heliumBottleL(398.2, 3.2527, 44.427);
    expect(v).toBeCloseTo((398.2 * 3.2527) / (44.427 - 3.2527), 6);
    expect(v).toBeCloseTo(31.46, 2);
    expect(() => heliumBottleL(100, 5, 5)).toThrow();
  });

  it("picks the lightest bottle that holds enough and fills it", () => {
    const line = pressurantFor(398.2, [tank("big", 67.27, 10.5), tank("small", 34.99, 7.98), tank("tiny", 14.5, 7.2)], { tankKgM3: 3.2527, bottleKgM3: 44.427, hardwareKg: 5 });
    expect(line.bottle.id).toBe("small");
    expect(line.heliumKg).toBeCloseTo(0.03499 * 44.427, 2);
    expect(() => pressurantFor(5000, [tank("small", 34.99, 7.98)], { tankKgM3: 3.2527, bottleKgM3: 44.427, hardwareKg: 5 })).toThrow();
  });
});

describe("tank slot from real tanks", () => {
  it("capacity is volume × density × fill, in whole kg; dry mass adds the helium line", () => {
    const shell = { ...tank("80433-1", 199.1, 9.07), expulsion: "PMD" as const };
    const he = pressurantFor(398.2, [tank("80586-1", 34.99, 7.98)], { tankKgM3: 3.2527, bottleKgM3: 44.427, hardwareKg: 5 });
    const spec = tankSpecOf("MMH/NTO", 1159, { tank: shell, count: 2, fillFraction: 0.95, fillBasis: "", pressurant: he });
    expect(spec.capacityKg).toBe(Math.floor(0.3982 * 1159 * 0.95));
    expect(spec.dryMassKg).toBeCloseTo(2 * 9.07 + 7.98 + he.heliumKg + 5, 2);
  });
});
