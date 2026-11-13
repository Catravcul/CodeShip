/**
 * The probe lost while it flies one of its compressed trips (docs/qa/casos.md, área CV): debris,
 * an angry asteroid's pulse or the battery end it, and the trip, the lapse and the busy flag must let go.
 */
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
import { PROBE_ELECTRONICS_TOLERANCE_MSV } from "@modules/asteroid-wrath/domain/protection";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { ProbeTrip, type ProbeGoal } from "@modules/navigation/application/probe-trip";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const BAY_BODY = new Vec3(0, 2.2 + 0.4, -70);

function probeWorld() {
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
  /** main's navBusy: the mothership cannot leave while the probe is on a trip. */
  const navBusy = () => (trip.active ? "La sonda está de viaje" : undefined);
  return { probe, trip, member, navBusy };
}

describe("CV · sonda perdida a mitad de su viaje", () => {
  it("CV-14 la sonda se pierde en pleno viaje: el viaje acaba en fallo, la cámara rápida vuelve a ×1 y la nodriza queda libre", () => {
    const { probe, trip, member, navBusy } = probeWorld();
    const run = trip.startProgramming({ kind: "asteroid", body: member });
    while (run.current) trip.answer(right(run.current));
    expect(trip.status).toBe("flying");
    for (let i = 0; i < 12; i++) {
      probe.update(0.25 * trip.lapse, NO_INPUT);
      trip.update(0.25);
    }
    expect(trip.lapse).toBeGreaterThan(1);
    expect(navBusy()).toBeDefined();
    const left = probe.onBoard;
    // An angry asteroid's pulse past its electronics' tolerance: lost on the way.
    probe.irradiate(PROBE_ELECTRONICS_TOLERANCE_MSV * 2, PROBE_ELECTRONICS_TOLERANCE_MSV);
    trip.update(0.25);
    expect(trip.status).toBe("failed");
    expect(trip.active).toBe(false);
    expect(trip.lapse).toBe(1);
    expect(trip.progress()).toBeUndefined();
    expect(navBusy()).toBeUndefined();
    // The next probe waits in the bay, and a new trip can be programmed with it.
    expect(probe.status).toBe("estibada");
    expect(probe.onBoard).toBe(left - 1);
    expect(trip.canProgram({ kind: "asteroid", body: member })).toEqual({ ok: true });
  }, 60_000);
});
