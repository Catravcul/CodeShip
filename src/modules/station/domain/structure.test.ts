import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { IDSS_CONTACT_LIMITS, NODRIZA, UNDOCK_PUSH_MS } from "@modules/mothership/data/mothership";
import { Mothership } from "@modules/mothership/domain/mothership";
import { Docking, type DockingEvent } from "@modules/mothership/application/docking";
import { POLANA_STATION } from "../data/station";
import { POLANA_LAYOUT, STRUCTURE_SOURCES } from "../data/structure";
import { StationStructure } from "./structure";

const station = () => new StationStructure(POLANA_STATION, POLANA_LAYOUT);

describe("Station structure", () => {
  it("EST-42 is built from the ISS's real modules, each with a basis, and has a probe port and a mothership port", () => {
    const s = station();
    for (const m of [...POLANA_LAYOUT.modules, ...POLANA_LAYOUT.parts]) expect(m.basis.length).toBeGreaterThan(0);
    const node = POLANA_LAYOUT.modules.find((m) => m.id === "nodo-1")!;
    expect(node.radiusM * 2).toBeCloseTo(4.57, 2);
    expect(node.to.sub(node.from).length()).toBeCloseTo(5.47, 2);
    const len = (id: string) => { const m = POLANA_LAYOUT.modules.find((x) => x.id === id)!; return m.to.sub(m.from).length(); };
    expect(len("destiny")).toBeCloseTo(8.5, 2);
    expect(len("nodo-2")).toBeCloseTo(6.7, 2);
    expect(len("nodo-3")).toBeCloseTo(6.706, 3);
    expect(len("columbus")).toBeCloseTo(6.871, 3);
    expect(len("kibo")).toBeCloseTo(11.19, 2);
    expect(len("quest")).toBeCloseTo(5.5, 2);
    expect(POLANA_LAYOUT.parts.filter((p) => p.kind === "solar").length).toBe(8);
    expect(POLANA_LAYOUT.parts.some((p) => p.kind === "hangar")).toBe(false);
    expect(s.portFor("sonda")).toBeDefined();
    expect(s.portFor("nodriza")).toBeDefined();
    expect(Object.values(STRUCTURE_SOURCES).every((src) => /https:\/\//.test(src))).toBe(true);
    // The whole thing fits the site's size used by the region and the map.
    expect(s.boundingRadiusM).toBeLessThanOrEqual(POLANA_STATION.radiusM);
  });

  it("each port is outside the structure, looking away from it", () => {
    const s = station();
    for (const p of s.ports) {
      const out = p.port.position.add(p.port.normal.scale(3));
      expect(s.clearance(out)).toBeGreaterThan(0.5);
      // A probe docked there sits outside the hull, upright against the port.
      const docked = p.dockedPose(new Vec3(0, 1.3, 0.6));
      expect(docked.orientation.rotate(Vec3.Y).dot(p.port.normal)).toBeCloseTo(-1, 6);
    }
  });

  it("keeps a probe out of the modules and the solar wings, but not near a port", () => {
    const s = station();
    // Above the integrated truss, away from the ports.
    const nearNode = s.toWorld(new Vec3(20, 9.5, -7));
    expect(s.keepOut(nearNode, new Vec3(0, -1, 0)).y).toBeGreaterThan(0.9);
    const nearWing = s.toWorld(new Vec3(34.5, 30, -7 + 6 + 2));
    expect(s.keepOut(nearWing, new Vec3(0, 0, -1)).z).toBeGreaterThan(0.9);
    const abovePort = s.portFor("sonda")!.port.position.add(new Vec3(0, 3, 0));
    expect(s.keepOut(abovePort, new Vec3(0, -0.07, 0)).length()).toBe(0);
    expect(s.keepOut(s.toWorld(new Vec3(0, 300, 0)), new Vec3(0, -1, 0)).length()).toBe(0);
  });

  it("the docking assist flies the probe to the station's port (not the mothership's) within IDSS limits", () => {
    const s = station();
    const design = explorerDesign();
    const port = s.portFor("sonda")!;
    const mothership = Mothership.withProbeDockedAt(NODRIZA, new Vec3(250, 120, 1600), Quat.IDENTITY, design.dockingPort!);
    // Out along the port's axis (the zenith IDA, as on Harmony), a little off to one side.
    const start = port.dockedPose(design.dockingPort!).position.add(port.port.normal.scale(60)).add(new Vec3(10, 0, 8));
    const flight = new FlightComputer(Ship.create(design), new RigidBodyState(start, Vec3.ZERO, Quat.fromAxisAngle(Vec3.Y, 0.4), Vec3.ZERO), { gravitySources: [] });
    const docking = new Docking(flight, [mothership, ...s.ports], IDSS_CONTACT_LIMITS, UNDOCK_PUSH_MS.value);
    docking.assistTo(port);
    const events: DockingEvent[] = [];
    for (let t = 0; t < 20 * 60 && !flight.docked; t += 0.5) {
      flight.update(0.5, NO_INPUT);
      events.push(...docking.drainEvents());
    }
    expect(events.filter((e) => e.type === "rebound")).toEqual([]);
    expect(docking.dockedTo).toBe(port);
    docking.undock();
    expect(flight.state.velocity.dot(port.port.normal)).toBeCloseTo(UNDOCK_PUSH_MS.value);
  });
});
