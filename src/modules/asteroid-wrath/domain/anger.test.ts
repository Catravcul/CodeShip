import { describe, expect, it } from "vitest";
import { Anger, ANGER_BY_PHASE, CALM_LEVEL } from "./anger";

describe("anger", () => {
  it("rises more the deeper the failed phase, capped at 1", () => {
    const a = new Anger(30);
    a.provoke(1);
    expect(a.level).toBe(ANGER_BY_PHASE[1]);
    a.provoke(3);
    expect(a.level).toBe(1);
  });

  it("halves every half-life and reaches calm in half-life × log2(level / calm)", () => {
    const a = new Anger(30);
    a.provoke(3);
    a.tick(30);
    expect(a.level).toBeCloseTo(0.5, 6);
    expect(a.timeToCalmS).toBeCloseTo(30 * Math.log2(0.5 / CALM_LEVEL), 6);
    let calmed = false;
    for (let t = 0; t < 200 && !calmed; t++) calmed = a.tick(1);
    expect(calmed).toBe(true);
    expect(a.calm).toBe(true);
    expect(a.timeToCalmS).toBe(0);
  });

  it("refuses a non-positive half-life", () => {
    expect(() => new Anger(0)).toThrow();
  });
});
