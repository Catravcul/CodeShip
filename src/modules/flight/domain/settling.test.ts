import { describe, expect, it } from "vitest";
import { settle } from "./settling";

describe("SON-07 settling without anchors (Juventas)", () => {
  it("bounces a few times at centimetres per second and comes to rest", () => {
    // Bennu's surface gravity is about 8·10⁻⁵ m/s² (GM / r²).
    const s = settle(0.02, 8e-5);
    expect(s.bounces).toBe(3);
    expect(s.touchesMs[0]).toBeCloseTo(0.02, 6);
    expect(s.highestHopM).toBeCloseTo((0.01 * 0.01) / (2 * 8e-5), 6);
    expect(s.seconds).toBeGreaterThan(200);
    expect(s.seconds).toBeLessThan(600);
  });

  it("does not bounce at all when it touches slower than the rest speed", () => {
    expect(settle(0.001, 8e-5).bounces).toBe(0);
  });
});
