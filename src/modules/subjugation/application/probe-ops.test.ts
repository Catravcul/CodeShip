import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Ship } from "@modules/ship/domain/ship";
import { PROBE_BATTERY_WH, PROBE_LOAD_W, PROBES_ON_BOARD, probeDesign, PROBE_STEP_S } from "@modules/ship/data/probe";
import { DEPLOYER, PROBE_TUNING, ProbeOps } from "./probe-ops";

const r = BENNU.meanRadiusM.value;
const bennu = new Asteroid(BENNU, Vec3.ZERO);
const spec = { probes: PROBES_ON_BOARD, batteryWh: PROBE_BATTERY_WH, loadW: PROBE_LOAD_W };
const DOWN = new Vec3(0, -1, 0);

/** A bay hovering `heightM` over Bennu's north pole (it turns with Bennu, so the ground is still under it). */
const setup = (heightM = 1.5, s = spec) => {
  let bayPos = new Vec3(0, r + heightM, 0);
  const bay = () => RigidBodyState.at(bayPos);
  const ops = new ProbeOps(
    (serial, timeS) => new FlightComputer(Ship.create(probeDesign(serial)), bay(), { stepS: PROBE_STEP_S, gravitySources: [bennu], target: bennu, startTimeS: timeS }),
    bay,
    s,
  );
  return { ops, moveBay: (p: Vec3) => (bayPos = p) };
};
const fly = (ops: ProbeOps, seconds: number, threat?: Parameters<ProbeOps["update"]>[2]) => {
  for (let t = 0; t < seconds; t += 1 / 30) ops.update(1 / 30, NO_INPUT, threat);
};

/** The deployer's whole sequence (door, slide out, springs), s. */
const DEPLOY_S = DEPLOYER.doorS + DEPLOYER.pushS + 0.1;
/** Start the release and run the deployer's sequence until the probe is free. */
const release = (ops: ProbeOps, away: Vec3) => {
  const ok = ops.launch(away);
  if (ok) fly(ops, DEPLOY_S);
  return ok;
};

describe("ProbeOps", () => {
  it("SON-06 the probe is Juventas: 12 kg, a few m/s of cold gas, 1 mN thrusters", () => {
    const ship = Ship.create(probeDesign());
    expect(ship.massKg).toBeCloseTo(12, 6);
    expect(ship.mainDeltaV()).toBeGreaterThan(4);
    expect(ship.mainDeltaV()).toBeLessThan(6);
    const a = ship.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / ship.massKg;
    expect(a).toBeCloseTo(0.002 / 12, 8);
    // It turns on its reaction wheels: rotating spends no butane.
    const before = ship.propellantKg("Butano");
    ship.fire({ mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.X }, 10);
    expect(ship.propellantKg("Butano")).toBe(before);
    expect(ship.design.anchors).toBe(false);
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
    // The deployer's door opens and the probe slides out, still held: not flying yet.
    fly(ops, DEPLOYER.doorS + 1);
    expect(ops.status).toBe("estibada");
    expect(ops.deploying).toBe(true);
    expect(ops.doorOpen(ops.slot)).toBe(1);
    fly(ops, DEPLOYER.pushS);
    expect(ops.status).toBe("en-vuelo");
    expect(ops.doorOpen(0)).toBe(1);
    fly(ops, 90);
    expect(ops.status).toBe("posada");
    expect(ops.parkedOn).toBe(BENNU.id);
    expect(ops.drainEvents().map((e) => e.type)).toEqual(["desplegando", "lanzada", "posada"]);
  });

  it("JUV-01 the deployer releases it at 3 cm/s from the carrier's hull, after its door opens and it slides out", () => {
    const { ops } = setup(400);
    const start = ops.flight.state.position;
    expect(PROBE_TUNING.releaseMs).toBe(0.03);
    release(ops, new Vec3(0, 1, 0));
    const s = ops.flight.state;
    // Free at the deployer's edge, moving away at the springs' 3 cm/s.
    expect(s.position.sub(start).length()).toBeCloseTo(DEPLOYER.extensionM + 0.03 * 0.1, 1);
    expect(s.velocity.y).toBeGreaterThan(0.025);
    expect(s.velocity.y).toBeLessThan(0.035);
    expect(ops.drainEvents().map((e) => e.type)).toEqual(["desplegando", "lanzada"]);
  });

  it("JUV-02 a parked probe's mission ends there (it never comes back); the next deployer takes over, and an empty one is refilled only by loading a new one", () => {
    const { ops } = setup();
    release(ops, DOWN);
    fly(ops, 90);
    expect(ops.status).toBe("posada");
    expect(ops.endMission()).toBe(true);
    expect(ops.ended).toEqual([{ serial: 1, asteroidId: BENNU.id }]);
    expect(ops.status).toBe("estibada");
    expect(ops.slot).toBe(1);
    expect(ops.inDeployers).toBe(1);
    release(ops, DOWN);
    fly(ops, 90);
    ops.endMission();
    expect(ops.status).toBe("sin-sonda");
    expect(ops.emptyDeployer).toBe(0);
    expect(ops.load()).toBe(true);
    expect(ops.status).toBe("estibada");
    expect(ops.doorOpen(0)).toBe(0);
    expect(ops.load()).toBe(true);
    expect(ops.load()).toBe(false);
  });

  it("an angry asteroid shakes the parked probe off and its debris wears it down until it is lost", () => {
    const { ops } = setup();
    release(ops, DOWN);
    fly(ops, 90);
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
      release(ops, DOWN);
      fly(ops, 2, { angry: true, safeDistanceM: 500, danger });
      return 1 - ops.flight.ship.hullIntegrity;
    };
    expect(hurt(0.4)).toBeLessThan(hurt(1));
  });

  it("the arm only grabs it slow and close to the bay; it comes back charged", () => {
    const { ops } = setup(400);
    release(ops, new Vec3(0, 1, 0));
    fly(ops, 10);
    expect(ops.canRecover).toBe(true);
    fly(ops, 200);
    // Drifted 6 m: still inside the capture box.
    expect(ops.bayRange().distanceM).toBeGreaterThan(5);
    expect(ops.batteryWh).toBeLessThan(PROBE_BATTERY_WH);
    expect(ops.recover()).toBe(true);
    expect(ops.status).toBe("estibada");
    expect(ops.batteryWh).toBe(PROBE_BATTERY_WH);
  });

  it("not when it is far or fast", () => {
    const { ops } = setup(400);
    release(ops, new Vec3(0, 1, 0));
    fly(ops, 500);
    expect(ops.bayRange().distanceM).toBeGreaterThan(10);
    expect(ops.recover()).toBe(false);
  });

  it("abandoning probes empties the rack; the station restocks it", () => {
    const { ops } = setup(400);
    release(ops, new Vec3(0, 1, 0));
    expect(ops.abandon()).toBe(true);
    expect(ops.onBoard).toBe(1);
    expect(ops.abandon()).toBe(false);
    release(ops, new Vec3(0, 1, 0));
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
    release(ops, new Vec3(0, 1, 0));
    fly(ops, 61);
    expect(ops.drainEvents()).toContainEqual({ type: "perdida", why: "sin-bateria" });
  });

  it("radiation past its electronics' tolerance loses it", () => {
    const { ops } = setup(400);
    release(ops, new Vec3(0, 1, 0));
    ops.irradiate(30_000, 50_000);
    expect(ops.serial).toBe(1);
    ops.irradiate(30_000, 50_000);
    expect(ops.drainEvents()).toContainEqual({ type: "perdida", why: "destruida" });
    expect(ops.serial).toBe(2);
  });
});
