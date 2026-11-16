import { describe, expect, it } from "vitest";
import { FrameTimer } from "./frame-timer";

describe("FrameTimer", () => {
  it("averages and keeps the worst sample of what it timed", () => {
    let now = 0;
    const t = new FrameTimer(() => now);
    for (const ms of [0.1, 0.3, 0.2]) t.time(() => (now += ms));
    expect(t.samples).toBe(3);
    expect(t.meanMs).toBeCloseTo(0.2, 6);
    expect(t.maxMs).toBeCloseTo(0.3, 6);
    expect(t.medianMs).toBeCloseTo(0.2, 6);
  });

  it("returns what the timed function returns and starts over on reset", () => {
    let now = 0;
    const t = new FrameTimer(() => now);
    expect(t.time(() => ((now += 1), 7))).toBe(7);
    t.reset();
    expect(t.samples).toBe(0);
    expect(t.meanMs).toBe(0);
    expect(t.maxMs).toBe(0);
  });
});
