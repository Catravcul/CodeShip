import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { CARRIER_SLEW_DEG_S, CarrierTrip, ManualCarrierRun, carrierTurnSeconds, type CarrierPort } from "./carrier-trip";
import { planContinuousBurn } from "../domain/transfer";
import { angleBetween, facing } from "../domain/attitude";

/** Just enough of a mothership to be flown: where it is and which way it points. */
const craft = (orientation: Quat) => {
  const c = { position: Vec3.ZERO, orientation, burn: () => true, moveTo(p: Vec3, q?: Quat) {
    c.position = p;
    if (q) c.orientation = q;
  } };
  return c as unknown as CarrierPort & { position: Vec3; orientation: Quat };
};
const nose = (q: Quat) => q.rotate(new Vec3(0, 0, -1));
const deg = (r: number) => (r * 180) / Math.PI;

describe("NAV-27 The mothership flies its hops: it turns, burns, flips and brakes; it never slides", () => {
  const to = new Vec3(4000, 0, 0);
  const plan = planContinuousBurn(4000, 0.05, 2);
  const final = facing(new Vec3(0, 0, -1));

  it("turns onto the route first, at the slew rate, without moving", () => {
    const c = craft(facing(new Vec3(0, 0, 1)));
    const trip = new CarrierTrip(c, Vec3.ZERO, [to], plan, final);
    expect(trip.phase).toBe("aim");
    trip.advance(30);
    expect(c.position.length()).toBeLessThan(1e-9);
    // 30 s at the slew rate: that many degrees turned, no more.
    expect(deg(angleBetween(facing(new Vec3(0, 0, 1)), c.orientation))).toBeCloseTo(30 * CARRIER_SLEW_DEG_S, 3);
    trip.advance(80);
    expect(trip.phase).toBe("burn");
    expect(nose(c.orientation).dot(new Vec3(1, 0, 0))).toBeGreaterThan(0.999);
  });

  it("brakes engines first after a flip, then turns to the attitude asked (the standoff's) and is done", () => {
    const c = craft(facing(new Vec3(1, 0, 0)));
    const trip = new CarrierTrip(c, Vec3.ZERO, [to], plan, final);
    const phases = new Set<string>();
    while (trip.elapsedS < plan.totalS - 5) {
      trip.advance(5);
      phases.add(trip.phase);
    }
    expect([...phases]).toEqual(expect.arrayContaining(["burn", "flip", "brake"]));
    // Braking: the nose points back the way it came (the main engines face the way it goes).
    expect(nose(c.orientation).dot(new Vec3(1, 0, 0))).toBeLessThan(-0.999);
    let guard = 0;
    while (!trip.done && guard++ < 1000) trip.advance(5);
    expect(trip.done).toBe(true);
    expect(c.position.sub(to).length()).toBeLessThan(1e-6);
    expect(angleBetween(c.orientation, final)).toBeLessThan(1e-3);
  });

  it("counts its turning time in the trip's game time", () => {
    const s = carrierTurnSeconds(facing(new Vec3(0, 0, 1)), Vec3.ZERO, [to], final);
    // 90° onto the route and 90° from braking to the standoff's attitude.
    expect(s).toBeCloseTo(180 / CARRIER_SLEW_DEG_S, 3);
  });

  it("by hand it turns to the run's attitude at the slew rate, never in one jump", () => {
    const c = craft(facing(new Vec3(0, 0, 1)));
    const run = new ManualCarrierRun(c, Vec3.ZERO, [to], facing(new Vec3(1, 0, 0)));
    run.advance(10);
    expect(deg(angleBetween(facing(new Vec3(0, 0, 1)), c.orientation))).toBeCloseTo(10 * CARRIER_SLEW_DEG_S, 3);
  });
});
