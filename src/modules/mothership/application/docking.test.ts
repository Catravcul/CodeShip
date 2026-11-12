import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { IDSS_CONTACT_LIMITS, NODRIZA, UNDOCK_PUSH_MS } from "../data/mothership";
import { Mothership } from "../domain/mothership";
import { Docking, type DockingEvent } from "./docking";

const setup = (offsetFromPort: Vec3, q = Quat.IDENTITY, v = Vec3.ZERO) => {
  const design = explorerDesign();
  const mothership = Mothership.withProbeDockedAt(NODRIZA, new Vec3(0, 0, 5000), Quat.IDENTITY, design.dockingPort!);
  const docked = mothership.dockedPose(design.dockingPort!);
  const flight = new FlightComputer(Ship.create(design), new RigidBodyState(docked.position.add(offsetFromPort), v, q, Vec3.ZERO), { gravitySources: [] });
  const docking = new Docking(flight, mothership, IDSS_CONTACT_LIMITS, UNDOCK_PUSH_MS.value);
  return { flight, docking, mothership };
};

const run = (flight: FlightComputer, docking: Docking, seconds: number) => {
  const events: DockingEvent[] = [];
  for (let t = 0; t < seconds && !flight.docked; t += 0.5) {
    flight.update(0.5, NO_INPUT);
    events.push(...docking.drainEvents());
  }
  return events;
};

describe("Docking", () => {
  it("the assist flies a probe 80 m below and off-axis, turned 25°, into the port within IDSS limits", () => {
    const { flight, docking } = setup(new Vec3(12, -80, 6), Quat.fromAxisAngle(new Vec3(1, 1, 0).normalize(), 0.44));
    docking.assist = true;
    const events = run(flight, docking, 20 * 60);
    expect(events.filter((e) => e.type === "rebound")).toEqual([]);
    expect(flight.docked).toBe(true);
    expect(docking.assist).toBe(false);
    expect(flight.telemetry().docked).toBe(true);
  });

  it("drifting into the port at 0.3 m/s does not latch: it rebounds and says why", () => {
    const { flight, docking, mothership } = setup(new Vec3(0, -2, 0), Quat.IDENTITY, NODRIZA.layout.port.normal.scale(-0.3));
    flight.rotationAssist = false;
    const events = run(flight, docking, 20);
    expect(flight.docked).toBe(false);
    const r = events.find((e) => e.type === "rebound");
    expect(r && r.type === "rebound" && r.failures.join(" ")).toMatch(/rápido/);
    // Moving away from the port again.
    expect(flight.state.velocity.dot(mothership.port.normal)).toBeGreaterThan(0);
  });

  it("while docked the probe rides the port, ignores thrust and undocks with a spring push", () => {
    const { flight, docking, mothership } = setup(Vec3.ZERO);
    docking.dockNow();
    const p0 = flight.state.position;
    flight.update(2, { ...NO_INPUT, mainThrottle: 1 });
    expect(flight.state.position.sub(p0).length()).toBeLessThan(1e-9);
    docking.undock();
    expect(flight.docked).toBe(false);
    expect(flight.state.velocity.dot(mothership.port.normal)).toBeCloseTo(UNDOCK_PUSH_MS.value);
    flight.update(5, NO_INPUT);
    expect(flight.docked).toBe(false);
    expect(docking.alignment().axialM).toBeGreaterThan(0.3);
  });
});
