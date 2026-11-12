import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { planTransfer } from "../domain/transfer";
import { TripAutopilot, type AutopilotPhase } from "./autopilot";

const fly = (target: Asteroid, from: Vec3, waypoints: Vec3[] = [], maxS = 3000) => {
  const ship = Ship.create(explorerDesign());
  const fc = new FlightComputer(ship, RigidBodyState.at(from), { gravitySources: [target], target });
  const accel = 490 / ship.massKg;
  const plan = planTransfer({ distanceM: target.position.sub(from).length() - target.meanRadiusM - 300, accelMS2: accel, deltaVAvailableMS: ship.mainDeltaV() });
  const ap = new TripAutopilot(ship, target, waypoints, plan.cruiseMS);
  fc.engage(ap);
  const phases = new Set<AutopilotPhase>();
  let t = 0;
  while (fc.guidance && t < maxS) {
    fc.update(0.5, NO_INPUT);
    t += 0.5;
    phases.add(ap.status.phase);
  }
  return { fc, ap, plan, t, phases, ship };
};

describe("TripAutopilot", () => {
  it("flies to Bennu with the real engine and hands over about 300 m above the surface, stopped and facing it", () => {
    const bennu = new Asteroid(BENNU, Vec3.ZERO);
    const { fc, ap, plan, t, phases } = fly(bennu, new Vec3(1500, 800, 6000));
    expect(ap.arrived).toBe(true);
    const tel = fc.telemetry();
    expect(tel.distanceToSurface).toBeGreaterThan(220);
    expect(tel.distanceToSurface).toBeLessThan(380);
    expect(fc.state.velocity.length()).toBeLessThan(0.3);
    const nose = fc.state.toWorld(new Vec3(0, 0, -1));
    expect(nose.dot(bennu.position.sub(fc.state.position).normalize())).toBeGreaterThan(0.99);
    for (const p of ["burn", "coast", "flip", "brake"] as const) expect(phases.has(p)).toBe(true);
    // Takes about the planned time (plus the turns and the final trim).
    expect(t).toBeLessThan(plan.totalS * 1.6 + 120);
  }, 30_000);

  it("lands the trip at a real New Polana member, through a detour waypoint", () => {
    const data = POLANA_MEMBERS[0]!;
    const member = new Asteroid(data, new Vec3(-4200, 900, -9000));
    const from = new Vec3(250, 120, 1600);
    const mid = new Vec3(-1500, 2500, -3500);
    const { fc, ap } = fly(member, from, [mid]);
    expect(ap.arrived).toBe(true);
    const h = fc.telemetry().distanceToSurface;
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(400);
  }, 30_000);

  it("gives the controls back as soon as the pilot touches them", () => {
    const bennu = new Asteroid(BENNU, Vec3.ZERO);
    const ship = Ship.create(explorerDesign());
    const fc = new FlightComputer(ship, RigidBodyState.at(new Vec3(0, 0, 5000)), { gravitySources: [bennu], target: bennu });
    fc.engage(new TripAutopilot(ship, bennu, [], 20));
    fc.update(5, NO_INPUT);
    expect(fc.guidance).not.toBeNull();
    fc.update(0.1, { ...NO_INPUT, rotation: new Vec3(0, 1, 0) });
    expect(fc.guidance).toBeNull();
  }, 30_000);
});
