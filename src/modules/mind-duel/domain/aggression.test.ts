import { describe, expect, it } from "vitest";
import { Aggression } from "./aggression";

describe("Aggression", () => {
  const radius = 245;

  it("safe distance grows with asteroid size, never under 500 m", () => {
    expect(new Aggression(10).safeDistanceM).toBe(500);
    expect(new Aggression(radius).safeDistanceM).toBe(735);
    expect(new Aggression(20_000).safeDistanceM).toBe(60_000);
  });

  it("damages the hull while the ship is inside the safe distance, more when closer", () => {
    const a = new Aggression(radius);
    const near = a.update(1, 0);
    const mid = a.update(1, 400);
    const far = a.update(1, 800);
    expect(near.hullDamage).toBeGreaterThan(mid.hullDamage);
    expect(mid.hullDamage).toBeGreaterThan(0);
    expect(far.hullDamage).toBe(0);
  });

  it("calms down after staying outside the safe distance long enough", () => {
    const a = new Aggression(radius);
    for (let t = 0; t < 59; t++) expect(a.update(1, 1000).calmed).toBe(false);
    expect(a.update(1, 1000).calmed).toBe(true);
  });

  it("going back in resets the calm-down timer", () => {
    const a = new Aggression(radius);
    for (let t = 0; t < 50; t++) a.update(1, 1000);
    a.update(1, 100);
    for (let t = 0; t < 50; t++) expect(a.update(1, 1000).calmed).toBe(false);
  });
});
