import { describe, expect, it } from "vitest";
import { lookOf } from "./looks";
import { STAFF } from "./site";

describe("each person's look", () => {
  it("dresses the people Cold Sanctuary drew from their photos as in their sheet", () => {
    const l = lookOf("Lizmibet");
    expect(l.hairStyle).toBe("rizado");
    expect(l.height).toBe(1.55);
    expect(l.glasses).toBeDefined();
    expect(lookOf("Sadhguru").turban).toBeDefined();
    expect(lookOf("Gohageneis").cap).toBeDefined();
    expect(lookOf("JefeConstruccion").shorts).toBe(true);
  });

  it("gives the rest a fixed look of their own, so no two of the staff look the same", () => {
    expect(lookOf("Nesvitor")).toEqual(lookOf("Nesvitor"));
    const keys = STAFF.map((n) => { const l = lookOf(n); return `${l.hairStyle}|${l.hair}|${l.skin}|${l.top}|${l.pants}|${l.height}`; });
    expect(new Set(keys).size).toBe(STAFF.length);
    for (const n of STAFF) {
      const l = lookOf(n);
      expect(l.height, n).toBeGreaterThan(1.4);
      expect(l.height, n).toBeLessThan(1.95);
    }
  });
});
