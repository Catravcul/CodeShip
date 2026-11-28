import { describe, expect, it } from "vitest";
import { CargoHold } from "./hold";

describe("the travel ship's cargo hold", () => {
  it("loads packages up to its capacity, in proportion, and empties at the station", () => {
    const h = new CargoHold(1000);
    expect(h.load([{ material: "Carbon", kg: 300 }, { material: "Water", kg: 300 }])).toBe(600);
    expect(h.loadKg).toBe(600);
    const got = h.load([{ material: "Carbon", kg: 400 }, { material: "Water", kg: 400 }]);
    expect(got).toBeCloseTo(400, 9);
    expect(h.roomKg).toBeCloseTo(0, 9);
    expect(h.load([{ material: "Carbon", kg: 10 }])).toBe(0);
    const out = h.unload();
    expect(out.reduce((s, c) => s + c.kg, 0)).toBeCloseTo(1000, 9);
    expect(h.loadKg).toBe(0);
  });
});
