import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { POLANA_STATION } from "@modules/station/data/station";
import { POLANA_LAYOUT } from "@modules/station/data/structure";
import { StationStructure } from "@modules/station/domain/structure";
import { IDSS_CONTACT_LIMITS } from "../data/mothership";
import { STARSHIP, STARSHIP_NOSE_PORT } from "../data/starship";
import { Mothership } from "../domain/mothership";
import { BERTH_STANDOFF_M, MANUAL_BERTH, ManualBerthing, Unberthing, berthedPose, berthStandoff, PROXIMITY } from "./berthing";

const setup = (offset = Vec3.ZERO) => {
  const station = new StationStructure(POLANA_STATION, POLANA_LAYOUT);
  const port = station.portFor("nodriza")!;
  const m = new Mothership(STARSHIP, Vec3.ZERO, Quat.IDENTITY);
  const s = berthStandoff(port, STARSHIP_NOSE_PORT);
  m.moveTo(s.position.add(offset), s.orientation);
  return { port, m, run: new ManualBerthing(m, port, STARSHIP_NOSE_PORT, IDSS_CONTACT_LIMITS) };
};

/** Fly it: close at `fast` until `slowAtM`, then at `contact`. */
function fly(run: ManualBerthing, fast: number, contact: number, slowAtM = 10): void {
  run.nudge("closing", Math.round(fast / MANUAL_BERTH.closingStepMs));
  for (let t = 0; t < 4 * 3600 && run.status === "approach"; t++) {
    if (run.alignment().axialM < slowAtM && run.rates.closing !== contact) run.nudge("closing", Math.round((contact - run.rates.closing) / MANUAL_BERTH.closingStepMs));
    run.advance(1);
  }
}

describe("NAV-18 Starship docks at the station by hand (Crew Dragon's manual mode)", () => {
  it("from Waypoint 1 on the axis, closing fast and slowing to 0,10 m/s at the end, the IDSS hooks catch", () => {
    const { port, m, run } = setup();
    expect(run.alignment().axialM).toBeCloseTo(BERTH_STANDOFF_M, 3);
    fly(run, 0.3, 0.1);
    expect(run.status).toBe("docked");
    expect(m.dockedTo).toBe(port.id);
    expect(m.position.sub(berthedPose(port, STARSHIP_NOSE_PORT).position).length()).toBeLessThan(1e-6);
  });

  it("touching at 0,30 m/s is too fast: no capture, it says why and backs off", () => {
    const { m, run } = setup();
    fly(run, 0.3, 0.3);
    expect(run.status).toBe("failed");
    expect(run.failures.join(" ")).toMatch(/demasiado rápido/);
    expect(m.dockedTo).toBeUndefined();
    expect(run.alignment().axialM).toBeGreaterThan(1);
  });

  it("off the axis it must be lined up with the drift taps first (0,1 m of the IDSS)", () => {
    const { m, run } = setup();
    // Push it 2 m to the right on the camera, then hold.
    run.nudge("right", 10);
    run.advance(20);
    run.hold();
    expect(run.offset().right).toBeCloseTo(2, 3);
    // Straight in: misses.
    const straight = setup();
    straight.run.nudge("right", 10);
    straight.run.advance(20);
    straight.run.hold();
    fly(straight.run, 0.3, 0.1);
    expect(straight.run.status).toBe("failed");
    expect(straight.run.failures.join(" ")).toMatch(/desalineado/);
    // Lined up first (drift back 2 m at 0,05 m/s for 40 s), then in: catches.
    run.nudge("right", -5);
    run.advance(40);
    run.hold();
    expect(Math.abs(run.offset().right)).toBeLessThan(0.05);
    fly(run, 0.3, 0.1);
    expect(run.status).toBe("docked");
    expect(m.dockedTo).toBeDefined();
  });

  it("rates are tapped in steps and capped (0,05 m/s closing up to 0,5; 0,01 m/s drift up to 0,1)", () => {
    const { run } = setup();
    run.nudge("closing", 30);
    expect(run.rates.closing).toBeCloseTo(MANUAL_BERTH.closingMaxMs, 9);
    run.nudge("up", -30);
    expect(run.rates.up).toBeCloseTo(-MANUAL_BERTH.lateralMaxMs, 9);
    run.hold();
    expect(run.rates).toEqual({ closing: 0, right: 0, up: 0 });
    expect(run.spentMs).toBeGreaterThan(0.6);
  });
});

describe("NAV-19 Starship undocks: hooks open and it backs out to Waypoint 1", () => {
  it("from the port it backs 150 m out along the axis at the contact speed and holds there", () => {
    const { port, m } = setup();
    const d = berthedPose(port, STARSHIP_NOSE_PORT);
    m.moveTo(d.position, d.orientation);
    m.dockedTo = port.id;
    const u = new Unberthing(m, port, STARSHIP_NOSE_PORT);
    expect(m.dockedTo).toBeUndefined();
    expect(u.remainingM).toBeCloseTo(BERTH_STANDOFF_M, 6);
    expect(u.remainingS).toBeCloseTo(BERTH_STANDOFF_M / PROXIMITY.closingMs, 3);
    for (let i = 0; i < 4000 && !u.done; i++) u.advance(1);
    expect(u.done).toBe(true);
    expect(m.position.sub(berthStandoff(port, STARSHIP_NOSE_PORT).position).length()).toBeLessThan(1e-6);
  });
});
