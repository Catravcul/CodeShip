import { describe, expect, it } from "vitest";
import { MAX_SPEED_MS, MIN_SPEED_MS, rideAt, slideLength, slideMouth, startRide, stepRide } from "./tobogan";

const ramp = [{ x: 0, y: 5, z: 0 }, { x: 0, y: 0.5, z: 8 }, { x: 0, y: 0.3, z: 12 }];

describe("bajar por un tobogán (Berón 2026-11-24)", () => {
  it("empieza en la boca, quieta, y llega al final", () => {
    let r = startRide(ramp);
    expect(rideAt(r)).toMatchObject({ x: 0, y: 5, z: 0, done: false });
    for (let t = 0; t < 30 && !rideAt(r).done; t += 0.05) r = stepRide(r, 0.05);
    expect(rideAt(r)).toMatchObject({ x: 0, z: 12, done: true });
    expect(r.s).toBeCloseTo(slideLength(ramp));
  });
  it("acelera en la bajada y frena en la salida casi llana, sin pararse ni pasar del tope", () => {
    let r = startRide(ramp);
    let top = 0;
    while (rideAt(r).z < 8) (r = stepRide(r, 0.02)), (top = Math.max(top, r.v));
    expect(top).toBeGreaterThan(3);
    expect(top).toBeLessThanOrEqual(MAX_SPEED_MS);
    while (!rideAt(r).done) r = stepRide(r, 0.02);
    expect(r.v).toBeLessThan(top);
    expect(r.v).toBeGreaterThanOrEqual(MIN_SPEED_MS);
  });
  it("mira hacia donde baja y se encuentra la boca al lado", () => {
    expect(rideAt(startRide(ramp)).yaw).toBeCloseTo(0);
    const slides = [{ path: ramp }];
    expect(slideMouth(slides, 0.5, 5, 0.5)).toBe(slides[0]);
    expect(slideMouth(slides, 0, 0, 0)).toBeUndefined();
  });
});
