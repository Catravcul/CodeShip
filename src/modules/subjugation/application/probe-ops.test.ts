import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Ship } from "@modules/ship/domain/ship";
import { PROBE_BATTERY_WH, PROBE_LOAD_W, PROBES_ON_BOARD, probeDesign } from "@modules/ship/data/probe";
import { ProbeOps } from "./probe-ops";

const r = BENNU.meanRadiusM.value;
const bennu = new Asteroid(BENNU, Vec3.ZERO);
const spec = { probes: PROBES_ON_BOARD, batteryWh: PROBE_BATTERY_WH, loadW: PROBE_LOAD_W };
const DOWN = new Vec3(0, -1, 0);

/** A bay hovering `heightM` over Bennu's north pole (it turns with Bennu, so the ground is still under it). */
const setup = (heightM = 1.5, s = spec) => {
  let bayPos = new Vec3(0, r + heightM, 0);
  const bay = () => RigidBodyState.at(bayPos);
  const ops = new ProbeOps(
    (serial, timeS) => new FlightComputer(Ship.create(probeDesign(serial)), bay(), { gravitySources: [bennu], target: bennu, startTimeS: timeS }),
    bay,
    s,
  );
  return { ops, moveBay: (p: Vec3) => (bayPos = p) };
};
const fly = (ops: ProbeOps, seconds: number, threat?: Parameters<ProbeOps["update"]>[2]) => {
  for (let t = 0; t < seconds; t += 1 / 30) ops.update(1 / 30, NO_INPUT, threat);
};

describe("ProbeOps", () => {
  it("the probe is a real small craft: about 17 kg, tens of m/s of Δv, gentle thrust", () => {
    const ship = Ship.create(probeDesign());
    expect(ship.massKg).toBeGreaterThan(15);
    expect(ship.massKg).toBeLessThan(18);
    expect(ship.mainDeltaV()).toBeGreaterThan(60);
    expect(ship.mainDeltaV()).toBeLessThan(120);
    const a = ship.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / ship.massKg;
    expect(a).toBeGreaterThan(0.03);
    expect(a).toBeLessThan(0.1);
  });

  it("starts stowed in the bay and rides it while the travel ship moves", () => {
    const { ops, moveBay } = setup(500);
    expect(ops.status).toBe("estibada");
    expect(ops.onBoard).toBe(2);
    moveBay(new Vec3(100, r + 500, 0));
    fly(ops, 0.5);
    expect(ops.flight.state.position.x).toBeCloseTo(100, 6);
  });

  it("launches on the springs, parks on the asteroid and says where", () => {
    const { ops } = setup();
    expect(ops.launch(DOWN)).toBe(true);
    expect(ops.launch(DOWN)).toBe(false);
    expect(ops.status).toBe("en-vuelo");
    fly(ops, 20);
    expect(ops.status).toBe("posada");
    expect(ops.parkedOn).toBe(BENNU.id);
    expect(ops.drainEvents().map((e) => e.type)).toEqual(["lanzada", "posada"]);
  });

  it("an angry asteroid shakes the parked probe off and its debris wears it down until it is lost", () => {
    const { ops } = setup();
    ops.launch(DOWN);
    fly(ops, 20);
    ops.drainEvents();
    const threat = { angry: true, safeDistanceM: 500, danger: 1 };
    fly(ops, 1, threat);
    expect(ops.status).toBe("en-vuelo");
    expect(ops.flight.ship.hullIntegrity).toBeLessThan(1);
    fly(ops, 30, threat);
    const events = ops.drainEvents();
    expect(events).toContainEqual({ type: "sacudida" });
    expect(events).toContainEqual({ type: "perdida", why: "destruida" });
    // The second probe on the rack takes its place, in the bay.
    expect(ops.onBoard).toBe(1);
    expect(ops.status).toBe("estibada");
    expect(ops.serial).toBe(2);
    expect(ops.flight.ship.hullIntegrity).toBe(1);
  });

  it("trust tempers the debris", () => {
    const hurt = (danger: number) => {
      const { ops } = setup(100);
      ops.launch(DOWN);
      fly(ops, 2, { angry: true, safeDistanceM: 500, danger });
      return 1 - ops.flight.ship.hullIntegrity;
    };
    expect(hurt(0.4)).toBeLessThan(hurt(1));
  });

  it("the arm only grabs it slow and close to the bay; it comes back charged", () => {
    const { ops } = setup(400);
    ops.launch(new Vec3(0, 1, 0));
    fly(ops, 10);
    expect(ops.canRecover).toBe(true);
    fly(ops, 100);
    // Drifted 8 m: still inside the capture box.
    expect(ops.bayRange().distanceM).toBeGreaterThan(5);
    expect(ops.batteryWh).toBeLessThan(PROBE_BATTERY_WH);
    expect(ops.recover()).toBe(true);
    expect(ops.status).toBe("estibada");
    expect(ops.batteryWh).toBe(PROBE_BATTERY_WH);
  });

  it("not when it is far or fast", () => {
    const { ops } = setup(400);
    ops.launch(new Vec3(0, 1, 0));
    fly(ops, 200);
    expect(ops.bayRange().distanceM).toBeGreaterThan(10);
    expect(ops.recover()).toBe(false);
  });

  it("abandoning probes empties the rack; the station restocks it", () => {
    const { ops } = setup(400);
    ops.launch(new Vec3(0, 1, 0));
    expect(ops.abandon()).toBe(true);
    expect(ops.onBoard).toBe(1);
    expect(ops.abandon()).toBe(false);
    ops.launch(new Vec3(0, 1, 0));
    ops.abandon();
    expect(ops.status).toBe("sin-sonda");
    expect(ops.canLaunch).toBe(false);
    ops.restock();
    expect(ops.status).toBe("estibada");
    expect(ops.onBoard).toBe(2);
  });

  it("runs on its battery: about 15 h of work like MASCOT, then it is lost", () => {
    expect(PROBE_BATTERY_WH / PROBE_LOAD_W).toBeGreaterThan(14);
    expect(PROBE_BATTERY_WH / PROBE_LOAD_W).toBeLessThan(17);
    // A nearly flat battery (1 min of work) to keep the test short.
    const { ops } = setup(400, { ...spec, batteryWh: PROBE_LOAD_W / 60 });
    ops.launch(new Vec3(0, 1, 0));
    fly(ops, 61);
    expect(ops.drainEvents()).toContainEqual({ type: "perdida", why: "sin-bateria" });
  });
});
