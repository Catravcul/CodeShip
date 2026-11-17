import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { POLANA_STATION } from "@modules/station/data/station";
import { POLANA_LAYOUT } from "@modules/station/data/structure";
import { StationStructure } from "@modules/station/domain/structure";
import { IDSS_CONTACT_LIMITS, NODRIZA, NODRIZA_NOSE_PORT } from "../data/mothership";
import { Mothership } from "../domain/mothership";
import { BERTH_STANDOFF_M, Berthing, berthedPose, berthSeconds, berthStandoff, PROXIMITY } from "./berthing";

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

  it("NAV-11 flies the real last approach: Waypoint 1 at 150 m, a hold at 20 m and 51 min to capture, as Crew Dragon Demo-1", () => {
    expect(BERTH_STANDOFF_M).toBe(150);
    expect(berthSeconds()).toBeCloseTo(51 * 60, 6);
    const { berthing } = setup();
    expect(berthing.remainingS).toBeCloseTo(51 * 60, 6);
    let t = 0;
    let held = 0;
    while (berthing.status === "approach" && t < 2 * 3600) {
      berthing.advance(1);
      t += 1;
      if (berthing.holding) held += 1;
    }
    expect(berthing.status).toBe("docked");
    // The RCS speeding up and braking for the hold add a few seconds to the 51 min.
    expect(Math.abs(t - 51 * 60)).toBeLessThan(20);
    // It held at Waypoint 2 for the go/no-go (about a quarter of an hour).
    expect(held).toBeGreaterThan(10 * 60);
    expect(berthing.speedMs).toBeCloseTo(PROXIMITY.closingMs, 9);
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
    const R = m.spec.ring!.floorRadiusM;
    const pts: Vec3[] = [];
    for (const z of [l.habRingZ!, l.twinRingZ!]) for (let k = 0; k < 16; k++) pts.push(new Vec3(R * Math.cos((k * Math.PI) / 8), R * Math.sin((k * Math.PI) / 8), z));
    const w = l.radiator!;
    pts.push(new Vec3(w.innerX + w.spanM, 0, w.fromZ), new Vec3(-(w.innerX + w.spanM), 0, w.fromZ));
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
