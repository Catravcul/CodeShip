import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { PROBE_BATTERY_WH, PROBE_LOAD_W, PROBES_ON_BOARD, probeDesign } from "@modules/ship/data/probe";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { NUEVA_POLANA, POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { Region } from "@modules/celestial/domain/region";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Mothership } from "@modules/mothership/domain/mothership";
import { NODRIZA } from "@modules/mothership/data/mothership";
import { ProbeOps } from "@modules/subjugation/application/probe-ops";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { TRAVEL_TIME } from "../domain/travel-time";
import { PROBE_TRIP, ProbeTrip, type ProbeGoal } from "./probe-trip";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const BAY_BODY = new Vec3(0, 2.2 + 0.4, -70);

const make = () => {
  const start = new Vec3(250, 120, 1600);
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const member = new Asteroid(POLANA_MEMBERS[1]!, new Vec3(7500, -1800, -6000));
  const region = new Region(NUEVA_POLANA, [bennu, member], []);
  const lander = Ship.create(explorerDesign());
  const mothership = Mothership.withProbeDockedAt(NODRIZA, start, Quat.IDENTITY, lander.design.dockingPort!);
  const bay = () => RigidBodyState.at(mothership.position.add(mothership.orientation.rotate(BAY_BODY))).withOrientation(mothership.orientation);
  const probe = new ProbeOps(
    (serial, timeS) => new FlightComputer(Ship.create(probeDesign(serial)), bay(), { gravitySources: region.asteroids, target: member, startTimeS: timeS }),
    bay,
    { probes: PROBES_ON_BOARD, batteryWh: PROBE_BATTERY_WH, loadW: PROBE_LOAD_W },
  );
  const trip = new ProbeTrip({
    flight: () => probe.flight,
    stowed: () => probe.status === "estibada",
    launch: () => probe.launch(mothership.orientation.rotate(Vec3.Y)),
    bay: () => ({ position: bay().position, up: mothership.orientation.rotate(Vec3.Y) }),
    obstaclesFor: (g: ProbeGoal) => [...region.obstaclesExcept(g.kind === "asteroid" ? g.body : undefined), { centre: mothership.position, radiusM: 96 }],
  });
  return { probe, trip, member, bennu, mothership };
};

/** Run frames of `dt` real seconds: the probe's physics at the trip's lapse, like main does. */
function fly(probe: ProbeOps, trip: ProbeTrip, maxRealS: number, dt = 0.25): number {
  let real = 0;
  while (real < maxRealS && trip.status === "flying") {
    probe.update(dt * trip.lapse, NO_INPUT);
    trip.update(dt);
    real += dt;
  }
  return real;
}

describe("ProbeTrip (the probe's long trips)", () => {
  it("plans the hop from the bay with the probe's real thrust and mass, keeping Δv to come home", () => {
    const { trip, member, probe } = make();
    const g: ProbeGoal = { kind: "asteroid", body: member };
    const h = trip.hop(g);
    const ship = probe.flight.ship;
    expect(h.thrustN).toBeCloseTo(4 * 0.26, 9);
    expect(h.plan.accelMS2).toBeCloseTo(h.thrustN / ship.massKg, 6);
    expect(h.plan.deltaVMS).toBeLessThanOrEqual(ship.mainDeltaV() * PROBE_TRIP.maxDeltaVShare + 1e-9);
    // Real duration: minutes of flight, played in at most the cap.
    const t = trip.time(g);
    expect(t.gameS).toBeGreaterThan(300);
    expect(t.realS).toBeLessThanOrEqual(TRAVEL_TIME.capS);
  });

  it("a near asteroid is flown by hand: no trip", () => {
    const { trip, bennu } = make();
    expect(trip.canProgram({ kind: "asteroid", body: bennu }).ok).toBe(false);
  });

  it("solving the challenges launches the probe, which flies itself in time-lapse and hands over about 300 m up", () => {
    const { trip, member, probe } = make();
    const g: ProbeGoal = { kind: "asteroid", body: member };
    expect(trip.canProgram(g)).toEqual({ ok: true });
    const run = trip.startProgramming(g);
    expect(run.chore.title).toContain(member.data.name);
    while (run.current) trip.answer(right(run.current));
    expect(trip.status).toBe("flying");
    expect(probe.status).toBe("en-vuelo");
    const p = trip.progress()!;
    expect(p.lapse).toBeGreaterThanOrEqual(TRAVEL_TIME.lapse.probe);
    expect(p.etaRealS).toBeLessThanOrEqual(TRAVEL_TIME.capS + 1e-6);
    // Speeding up, the lapse stays near the plan's (not the autopilot's pessimistic early estimate).
    fly(probe, trip, 3);
    expect(trip.lapse).toBeLessThan(p.lapse * 1.5);
    const real = 3 + fly(probe, trip, 200);
    expect(trip.status).toBe("arrived");
    expect(real).toBeLessThanOrEqual(TRAVEL_TIME.capS + 10);
    const h = probe.flight.telemetry().distanceToSurface;
    expect(h).toBeGreaterThan(150);
    expect(h).toBeLessThan(450);
    // Parking is manual: the controls are back.
    expect(probe.flight.guidance).toBeNull();
    expect(trip.lapse).toBe(1);
  }, 120_000);

  it("the way home ends a few metres from the bay for the arm (manual catch)", () => {
    const { trip, member, probe, mothership } = make();
    trip.engage({ kind: "asteroid", body: member });
    fly(probe, trip, 200);
    expect(trip.status).toBe("arrived");
    const home: ProbeGoal = { kind: "bay" };
    expect(trip.canProgram(home).ok).toBe(true);
    trip.engage(home);
    fly(probe, trip, 200);
    expect(trip.status).toBe("arrived");
    const d = probe.bayRange().distanceM;
    // It came down on the bay from above, not through the hull.
    const above = probe.flight.state.position.sub(mothership.position).dot(mothership.orientation.rotate(Vec3.Y));
    expect(above).toBeGreaterThan(0);
    expect(d).toBeLessThan(PROBE_TRIP.bayHandoverM * 2);
    // Never into the bay: outside the arm's reach (the catch is flown by hand) and nearly still.
    expect(d).toBeGreaterThan(10);
    expect(probe.bayRange().speedMs).toBeLessThan(0.3);
  }, 120_000);

  it("touching the controls hands the probe back to the remote pilot", () => {
    const { trip, member, probe } = make();
    trip.engage({ kind: "asteroid", body: member });
    probe.update(1, NO_INPUT);
    probe.update(0.1, { ...NO_INPUT, mainThrottle: 1 });
    trip.update(0.1);
    expect(trip.status).toBe("manual");
  });
});
