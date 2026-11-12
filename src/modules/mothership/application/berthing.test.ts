import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { POLANA_STATION } from "@modules/station/data/station";
import { POLANA_LAYOUT } from "@modules/station/data/structure";
import { StationStructure } from "@modules/station/domain/structure";
import { IDSS_CONTACT_LIMITS, NODRIZA, NODRIZA_NOSE_PORT } from "../data/mothership";
import { Mothership } from "../domain/mothership";
import { BERTH_STANDOFF_M, Berthing, berthedPose, berthStandoff } from "./berthing";

const setup = (offset = Vec3.ZERO) => {
  const station = new StationStructure(POLANA_STATION, POLANA_LAYOUT);
  const port = station.portFor("nodriza")!;
  const m = new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
  const s = berthStandoff(port, NODRIZA_NOSE_PORT);
  m.moveTo(s.position.add(offset), s.orientation);
  return { station, port, m, berthing: new Berthing(m, port, NODRIZA_NOSE_PORT, IDSS_CONTACT_LIMITS) };
};

describe("Berthing the mothership at a station", () => {
  it("the standoff point is on the port axis, nose to the port", () => {
    const { port, m, berthing } = setup();
    const a = berthing.alignment();
    expect(a.axialM).toBeCloseTo(BERTH_STANDOFF_M, 6);
    expect(a.lateralM).toBeLessThan(1e-6);
    expect(a.misalignDeg).toBeLessThan(1e-4);
    expect(a.rollDeg).toBeLessThan(1e-3);
    // Its nose looks at the station; the probe port stays underneath.
    expect(m.orientation.rotate(new Vec3(0, 0, -1)).dot(port.port.normal)).toBeCloseTo(-1, 6);
    expect(m.orientation.rotate(Vec3.Y).y).toBeCloseTo(1, 6);
  });

  it("closes at contact speed and latches within the IDSS limits", () => {
    const { port, m, berthing } = setup();
    for (let i = 0; i < 4000 && berthing.status === "approach"; i++) berthing.advance(1);
    expect(berthing.status).toBe("docked");
    expect(berthing.speedMs).toBeGreaterThanOrEqual(IDSS_CONTACT_LIMITS.closingMinMs);
    expect(berthing.speedMs).toBeLessThanOrEqual(IDSS_CONTACT_LIMITS.closingMaxMs);
    expect(m.dockedTo).toBe(port.id);
    expect(m.position.sub(berthedPose(port, NODRIZA_NOSE_PORT).position).length()).toBeLessThan(1e-6);
  });

  it("the docked mothership's rings and radiators stay clear of the station", () => {
    const { station, m, berthing } = setup();
    berthing.advance(1e5);
    // Sample the rim of both rings and the radiator tips.
    const l = m.spec.layout;
    const R = m.spec.ring.floorRadiusM;
    const pts: Vec3[] = [];
    for (const z of [l.habRingZ, l.twinRingZ]) for (let k = 0; k < 16; k++) pts.push(new Vec3(R * Math.cos((k * Math.PI) / 8), R * Math.sin((k * Math.PI) / 8), z));
    pts.push(new Vec3(l.radiator.innerX + l.radiator.spanM, 0, l.radiator.fromZ), new Vec3(-(l.radiator.innerX + l.radiator.spanM), 0, l.radiator.fromZ));
    for (const p of pts) expect(station.clearance(m.toWorld(p))).toBeGreaterThan(10);
  });

  it("starting off the axis it does not latch, and says why", () => {
    const { berthing, m } = setup(new Vec3(0.5, 0, 0));
    berthing.advance(1e5);
    expect(berthing.status).toBe("failed");
    expect(berthing.failures.join(" ")).toMatch(/desalineado/);
    expect(m.dockedTo).toBeUndefined();
  });
});
