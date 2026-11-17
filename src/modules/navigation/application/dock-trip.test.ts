import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "@modules/ship/domain/ship";
import { lunarModuleDesign } from "@modules/ship/data/apollo-lm";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { NUEVA_POLANA, POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { Region } from "@modules/celestial/domain/region";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Mothership } from "@modules/mothership/domain/mothership";
import { IDSS_CONTACT_LIMITS, NODRIZA, NODRIZA_NOSE_PORT, UNDOCK_PUSH_MS } from "@modules/mothership/data/mothership";
import { Docking } from "@modules/mothership/application/docking";
import { POLANA_STATION } from "@modules/station/data/station";
import { POLANA_LAYOUT } from "@modules/station/data/structure";
import { StationStructure } from "@modules/station/domain/structure";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { asteroidTarget, type DockTarget, type NavTarget } from "../domain/nav-target";
import { Navigator } from "./navigator";
import { mothershipCarrier } from "./mothership-carrier";
import { DOCK_TRIP } from "./dock-trip";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });

const make = (opts: { undocked?: Vec3 } = {}) => {
  const start = new Vec3(250, 120, 1600);
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const member = new Asteroid(POLANA_MEMBERS[2]!, new Vec3(-9000, -2500, 3000));
  const region = new Region(NUEVA_POLANA, [bennu, member], []);
  const ship = Ship.create(lunarModuleDesign());
  const attitude = Quat.fromAxisAngle(Vec3.Y, 0.2);
  const flight = new FlightComputer(ship, RigidBodyState.at(opts.undocked ?? start).withOrientation(attitude), { gravitySources: region.asteroids, target: bennu });
  const mothership = Mothership.withProbeDockedAt(NODRIZA, start, attitude, ship.design.dockingPort!);
  const structure = new StationStructure(POLANA_STATION, POLANA_LAYOUT);
  const docking = new Docking(flight, [mothership, ...structure.ports], IDSS_CONTACT_LIMITS, UNDOCK_PUSH_MS.value);
  if (!opts.undocked) docking.dockNow(mothership);
  const station: DockTarget = {
    kind: "dock",
    id: POLANA_STATION.id,
    name: POLANA_STATION.name,
    what: "Estación",
    position: structure.position,
    radiusM: structure.boundingRadiusM,
    probePort: structure.portFor("sonda")!,
    carrierPort: structure.portFor("nodriza")!,
  };
  const home: DockTarget = { kind: "dock", id: "nodriza", name: "Nodriza", what: "Nave nodriza", get position() { return mothership.position; }, radiusM: 96, probePort: mothership };
  const targets: NavTarget[] = [...region.asteroids.map(asteroidTarget), station, home];
  const nav = new Navigator(
    flight,
    {
      targets,
      obstaclesFor: (t) => [
        ...region.obstaclesExcept(t.kind === "asteroid" ? t.body : undefined),
        ...(t === station ? [] : [{ centre: structure.position, radiusM: structure.boundingRadiusM }]),
      ],
      retarget: () => true,
      carrier: mothershipCarrier(mothership, docking, { nosePort: NODRIZA_NOSE_PORT, limits: IDSS_CONTACT_LIMITS, ports: structure.ports }),
      docking,
    },
    targets[0]!,
  );
  return { nav, flight, mothership, docking, structure, station, home, member };
};

const program = (nav: Navigator) => {
  const run = nav.startProgramming();
  while (run.current) nav.answer(right(run.current));
};

describe("Trips that end docked", () => {
  it("the lander's own trip still flies to the station's axis and the docking assist latches it to its port", () => {
    const { nav, flight, docking, structure, station } = make({ undocked: new Vec3(-200, -300, 1300) });
    const trip = nav.landerTrip(station);
    expect(trip.carrier).toBeUndefined();
    expect(trip.dock?.port).toBe(station.probePort);
    // The way in is out on the port axis, outside the structure.
    expect(structure.clearance(trip.dock!.entry)).toBeGreaterThan(20);
    expect(trip.facts.dock?.handoverM).toBe(DOCK_TRIP.handoverM);
    expect(nav.flyLander(station.id).ok).toBe(true);
    expect(nav.status).toBe("autopilot");
    expect(nav.route.length).toBeGreaterThanOrEqual(2);
    for (let t = 0; t < 3600 && nav.status !== "docked" && nav.status !== "manual"; t += 0.5) {
      flight.update(0.5, NO_INPUT);
      nav.update();
    }
    expect(nav.status).toBe("docked");
    expect(docking.dockedTo).toBe(station.probePort);
  }, 60_000);

  it("EST-27 to the station the mothership flies, even with the lander away: she berths in the dry dock and leaves the lander where it is", () => {
    const { nav, flight, docking, mothership, station } = make({ undocked: new Vec3(-200, -300, 1300) });
    expect(nav.carrierFlies(station)).toBe(true);
    expect(nav.select(station.id).ok).toBe(true);
    const trip = nav.trip();
    expect(trip.carrier?.berthAt).toBe(station.carrierPort);
    // Real numbers: the continuous-burn plan of her thrusters, compressed into the real-time budget.
    expect(trip.carrier!.plan.totalS).toBeGreaterThan(0);
    expect(trip.travel!.realS).toBeGreaterThan(0);
    expect(nav.canCarry(station).ok).toBe(true);
    const lander = flight.state.position;
    expect(nav.carry(station.id).ok).toBe(true);
    expect(nav.carrying).toBe(false);
    // The planned way: from where she was to her berth.
    expect(nav.route[0]!.sub(trip.carrier!.from).length()).toBeLessThan(1);
    for (let i = 0; i < 2000 && nav.status === "carrier"; i++) nav.update(0.5);
    expect(nav.status).toBe("docked");
    expect(mothership.dockedTo).toBe(station.carrierPort!.id);
    expect(nav.route.at(-1)!.sub(mothership.position).length()).toBeLessThan(1);
    expect(docking.dockedTo).toBeUndefined();
    expect(flight.state.position.sub(lander).length()).toBeLessThan(1);
    // Already in the dock: nothing to fly, and it says why.
    expect(nav.canCarry(station).reason).toMatch(/dique/);
  }, 60_000);

  it("EST-27 the lander landed does not keep the mothership from flying to the station", () => {
    const { nav, flight, station } = make({ undocked: new Vec3(-200, -300, 1300) });
    Object.defineProperty(flight, "landed", { get: () => true });
    expect(nav.select(station.id).ok).toBe(true);
    expect(nav.canProgram().ok).toBe(true);
  }, 30_000);

  it("HAB-21 the task list's travel: the lander alone undocks from the mothership and docks at the station, with no challenges", () => {
    const { nav, flight, docking, mothership, station } = make();
    expect(nav.landerTrip(station).carrier).toBeUndefined();
    expect(nav.landerTrip(station).travel!.realS).toBeGreaterThan(0);
    expect(nav.flyLander(station.id).ok).toBe(true);
    expect(nav.status).toBe("autopilot");
    expect(docking.dockedTo).toBeUndefined();
    for (let t = 0; t < 3600 && nav.status !== "docked" && nav.status !== "manual"; t += 0.5) {
      flight.update(0.5, NO_INPUT);
      nav.update();
    }
    expect(nav.status).toBe("docked");
    expect(docking.dockedTo).toBe(station.probePort);
    // The mothership stayed where it was.
    expect(mothership.dockedTo).toBeUndefined();
    // Already there: refused, with the reason.
    expect(nav.flyLander(station.id)).toEqual({ ok: false, reason: `Ya estás acoplada a ${station.name}` });
  }, 60_000);

  it("with the probe aboard, the mothership flies to the station and docks itself at its port within IDSS limits", () => {
    const { nav, mothership, docking, flight, station } = make();
    nav.select(station.id);
    const trip = nav.trip();
    expect(trip.carrier?.berthAt).toBe(station.carrierPort);
    expect(trip.carrier?.facts.dock).toBeDefined();
    program(nav);
    expect(nav.status).toBe("carrier");
    let sawDockPhase = false;
    for (let i = 0; i < 2000 && nav.status === "carrier"; i++) {
      nav.update(0.5);
      if (nav.progress()?.phase === "dock") sawDockPhase = true;
    }
    expect(sawDockPhase).toBe(true);
    expect(nav.status).toBe("docked");
    expect(mothership.dockedTo).toBe(station.carrierPort!.id);
    flight.update(0.1, NO_INPUT);
    // The probe rode along and is now beside the station.
    expect(docking.dockedTo).toBe(mothership);
    expect(flight.state.position.sub(station.position).length()).toBeLessThan(POLANA_STATION.dockingRangeM);
    // Already there: no new mothership trip to the same port; the probe would fly the short hop.
    expect(nav.trip(station).carrier).toBeUndefined();
  }, 60_000);

  it("HAB-21 the task list's travel: the travel ship carries the lander to its berth at the station, with no challenges", () => {
    const { nav, mothership, docking, station } = make();
    expect(nav.canCarry(station).ok).toBe(true);
    expect(nav.carry(station.id).ok).toBe(true);
    expect(nav.status).toBe("carrier");
    for (let i = 0; i < 2000 && nav.status === "carrier"; i++) nav.update(0.5);
    expect(nav.status).toBe("docked");
    expect(mothership.dockedTo).toBe(station.carrierPort!.id);
    expect(docking.dockedTo).toBe(mothership);
    expect(nav.carrying).toBe(true);
    // To an asteroid, without the lander aboard, it does not go (she parks for the lander to land).
    docking.undock();
    const bennu = nav.targets[0]!;
    expect(nav.canCarry(bennu)).toMatchObject({ ok: false });
  }, 60_000);

  it("from the station, a trip to an asteroid backs the mothership out along the port axis first", () => {
    const { nav, mothership, station, member } = make();
    nav.select(station.id);
    program(nav);
    for (let i = 0; i < 2000 && nav.status === "carrier"; i++) nav.update(0.5);
    const docked = mothership.position;
    const q = mothership.orientation;
    nav.select(member.data.id);
    const trip = nav.trip();
    const out = trip.carrier!.path[0]!;
    expect(out.sub(docked).normalize().dot(station.carrierPort!.port.normal)).toBeCloseTo(1, 6);
    program(nav);
    expect(nav.status).toBe("carrier");
    expect(mothership.dockedTo).toBeUndefined();
    // It keeps its attitude while it leaves (no swinging the rings into the station).
    expect(mothership.orientation).toEqual(q);
  }, 60_000);

  it("«Volver a la nodriza» is refused while docked to it, and flies the probe back and docks it otherwise", () => {
    const { nav, flight, mothership, docking, home } = make();
    nav.select(home.id);
    expect(nav.canProgram().ok).toBe(false);
    expect(nav.canProgram().reason).toMatch(/acoplada/);
    docking.undock();
    // Drift 250 m away under the mothership.
    flight.applyImpulse(mothership.port.normal.scale(5));
    for (let t = 0; t < 50; t += 0.5) flight.update(0.5, NO_INPUT);
    expect(nav.canProgram().ok).toBe(true);
    program(nav);
    for (let t = 0; t < 3600 && nav.status !== "docked" && nav.status !== "manual"; t += 0.5) {
      flight.update(0.5, NO_INPUT);
      nav.update();
    }
    expect(nav.status).toBe("docked");
    expect(docking.dockedTo).toBe(mothership);
  }, 60_000);

  it("the dock trip challenges ask for the IDSS contact speed", () => {
    const { nav, station } = make({ undocked: new Vec3(-200, -300, 1300) });
    nav.select(station.id);
    const run = nav.startProgramming();
    const ex = run.chore.exercises;
    const order = ex.find((e) => e.kind === "order")!;
    // The mothership's trip: she goes into the dry dock and its arms hold her.
    expect(order.kind === "order" && order.blocks.some((b) => /dique seco/.test(b.pseudo))).toBe(true);
    const spec = ex[ex.length - 1]!;
    expect(spec.kind === "choice" && spec.options[spec.correct]).toMatch(/0,10 m\/s/);
  }, 30_000);
});

describe("NAV-16 The mothership flown by hand (reglas.md §3.6): she commands the speed, it parks at Waypoint 1 and the docking station docks it", () => {
  it("at rest until she burns; at 0,4 m/s it closes in at the board's pace; stopped in the window it holds at Waypoint 1 and docks by program", () => {
    const { nav, mothership, station } = make({ undocked: new Vec3(-200, -300, 1300) });
    expect(nav.flyByHand(station.id).ok).toBe(true);
    const m = nav.manualCarrier!;
    expect(nav.status).toBe("carrier");
    expect(nav.progress()).toMatchObject({ vehicle: "carrier", manual: true, speedMS: 0, lapse: 60 });
    const start = mothership.position;
    nav.update(1);
    expect(mothership.position.sub(start).length()).toBeLessThan(1e-6);
    // Four steps of 0,1 m/s: Hayabusa2's 40 cm/s. Δv is spent from the tanks.
    const dv0 = mothership.deltaV();
    for (let i = 0; i < 4; i++) expect(m.command(0.1)).toBe(true);
    expect(m.speedMs).toBeCloseTo(0.4, 6);
    expect(dv0 - mothership.deltaV()).toBeGreaterThan(0.3);
    // One real second is a game minute: 24 m.
    nav.update(1);
    expect(mothership.position.sub(start).length()).toBeCloseTo(24, 0);
    // Fly on until inside the arrival window, then stop dead.
    for (let i = 0; i < 2000 && m.remainingM > 50; i++) nav.update(0.1);
    expect(m.hold()).toBe(true);
    nav.update(0.1);
    expect(nav.manualCarrier).toBeUndefined();
    // The computer only takes it onto the axis at Waypoint 1 and holds: docking is the docking station's.
    for (let i = 0; i < 4000 && nav.status === "carrier"; i++) nav.update(0.5);
    expect(nav.status).toBe("manual");
    expect(mothership.dockedTo).toBeUndefined();
    expect(nav.holdingAt()?.id).toBe(station.id);
    // Docked by program from there: Demo-1's approach.
    expect(nav.berthAuto().ok).toBe(true);
    expect(nav.status).toBe("carrier");
    for (let i = 0; i < 4000 && nav.status === "carrier"; i++) nav.update(0.5);
    expect(nav.status).toBe("docked");
    expect(mothership.dockedTo).toBe(station.carrierPort!.id);
    expect(nav.holdingAt()).toBeUndefined();
    expect(nav.berthedAt()?.id).toBe(station.id);
  }, 60_000);

  it("NAV-25 undocked from the docking station it backs out to Waypoint 1; NAV-24 then docked by hand with the docking camera's rates", () => {
    const { nav, mothership, station } = make({ undocked: new Vec3(-200, -300, 1300) });
    nav.select(station.id);
    nav.engage();
    for (let i = 0; i < 20000 && nav.status === "carrier"; i++) nav.update(0.5);
    expect(mothership.dockedTo).toBe(station.carrierPort!.id);
    expect(nav.undockCarrier().ok).toBe(true);
    expect(mothership.dockedTo).toBeUndefined();
    expect(nav.progress()).toMatchObject({ vehicle: "carrier", phase: "undock", lapse: 60 });
    for (let i = 0; i < 4000 && nav.status === "carrier"; i++) nav.update(0.5);
    expect(nav.status).toBe("manual");
    expect(nav.holdingAt()?.id).toBe(station.id);
    // By hand: 0,30 m/s, then 0,10 near the port, at the hand approach's ×10.
    expect(nav.berthByHand().ok).toBe(true);
    const run = nav.manualBerth!;
    expect(nav.lapse).toBe(10);
    run.nudge("closing", 6);
    for (let i = 0; i < 4000 && nav.status === "carrier"; i++) {
      if (run.alignment().axialM < 8 && run.rates.closing > 0.1) run.nudge("closing", -4);
      nav.update(0.5);
    }
    expect(nav.status).toBe("docked");
    expect(mothership.dockedTo).toBe(station.carrierPort!.id);
    expect(nav.lastBerthFailure).toEqual([]);
  }, 60_000);

  it("past the end and still moving, it does not park: she has to turn back", () => {
    const { nav, station } = make({ undocked: new Vec3(-200, -300, 1300) });
    expect(nav.flyByHand(station.id).ok).toBe(true);
    const m = nav.manualCarrier!;
    m.command(1);
    for (let i = 0; i < 4000 && m.remainingM > -300; i++) nav.update(0.1);
    expect(nav.manualCarrier).toBe(m);
    m.command(-2);
    expect(m.speedMs).toBe(-1);
  }, 30_000);
});
