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
import { Expedition } from "@modules/expedition/application/expedition";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import { Mothership } from "@modules/mothership/domain/mothership";
import { IDSS_CONTACT_LIMITS, NODRIZA, UNDOCK_PUSH_MS } from "@modules/mothership/data/mothership";
import { Docking } from "@modules/mothership/application/docking";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { asteroidTarget } from "../domain/nav-target";
import { Navigator } from "./navigator";
import { mothershipCarrier } from "./mothership-carrier";
import { TRAVEL_TIME } from "../domain/travel-time";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });

const make = () => {
  const start = new Vec3(250, 120, 1600);
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const member = new Asteroid(POLANA_MEMBERS[2]!, new Vec3(-9000, -2500, 3000));
  const region = new Region(NUEVA_POLANA, [bennu, member], []);
  const ship = Ship.create(lunarModuleDesign());
  const attitude = Quat.fromAxisAngle(Vec3.Y, 0.2);
  const flight = new FlightComputer(ship, RigidBodyState.at(start).withOrientation(attitude), { gravitySources: region.asteroids, target: bennu });
  const mothership = Mothership.withProbeDockedAt(NODRIZA, start, attitude, ship.design.dockingPort!);
  const docking = new Docking(flight, mothership, IDSS_CONTACT_LIMITS, UNDOCK_PUSH_MS.value);
  docking.dockNow();
  const expedition = new Expedition(flight, bennu, EXERCISES, 500);
  const targets = region.asteroids.map(asteroidTarget);
  const nav = new Navigator(
    flight,
    { targets, obstaclesFor: (t) => region.obstaclesExcept(t.kind === "asteroid" ? t.body : undefined), retarget: (t) => t.kind !== "asteroid" || expedition.retarget(t.body), carrier: mothershipCarrier(mothership, docking) },
    targets[0]!,
  );
  return { nav, flight, mothership, docking, member, bennu };
};

describe("Trip with the mothership", () => {
  it("with the probe docked, a far target is a mothership hop: real Hall thrust, hours long, a couple of m/s of Δv", () => {
    const { nav, member, mothership } = make();
    nav.select(member.data.id);
    const trip = nav.trip();
    expect(trip.carrier).toBeDefined();
    const c = trip.carrier!;
    expect(c.plan.accelMS2).toBeCloseTo((18 * 5.4) / mothership.massKg, 12);
    expect(c.plan.totalS).toBeGreaterThan(3600);
    expect(c.plan.deltaVMS).toBeLessThan(10);
    // It parks the spec's distance above the target, on the side it comes from.
    expect(c.parking.sub(member.position).length()).toBeCloseTo(member.meanRadiusM + NODRIZA.parkingDistanceM.value, 6);
  });

  it("solving the challenges flies the mothership there, undocks the probe and hands over about 300 m from the surface", () => {
    const { nav, flight, mothership, docking, member } = make();
    nav.select(member.data.id);
    const xenon = mothership.propellantKg;
    const run = nav.startProgramming();
    expect(run.chore.title).toContain("nodriza");
    while (run.current) nav.answer(right(run.current));
    expect(nav.status).toBe("carrier");
    expect(mothership.propellantKg).toBeLessThan(xenon);
    // Time-lapse: the hours-long hop plays in the real seconds of its budget, never more than the cap.
    const budget = nav.trip().travel!;
    let realS = 0;
    for (let i = 0; i < 4000 && nav.status === "carrier"; i++) {
      nav.update(0.1);
      flight.update(0.1 * nav.lapse, NO_INPUT);
      realS += 0.1;
      expect(docking.docked || nav.status !== "carrier").toBe(true);
    }
    expect(realS).toBeLessThanOrEqual(TRAVEL_TIME.capS);
    expect(nav.status).toBe("autopilot");
    expect(docking.docked).toBe(false);
    expect(mothership.position.sub(member.position).length()).toBeCloseTo(member.meanRadiusM + NODRIZA.parkingDistanceM.value, 0);
    for (let t = 0; t < 2000 && nav.status === "autopilot"; t += 0.5) {
      flight.update(0.5, NO_INPUT);
      nav.update(0.5);
    }
    expect(nav.status).toBe("arrived");
    const h = flight.telemetry().distanceToSurface;
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(400);
    expect(budget.realS).toBeLessThanOrEqual(TRAVEL_TIME.capS);
  }, 30_000);

  it("the trip card gives the game duration (hours of Hall burn) and the real seconds it plays in", () => {
    const { nav, member } = make();
    nav.select(member.data.id);
    const t = nav.trip();
    const tt = t.travel!;
    // The burn, the turns onto the route and the lander's leg.
    expect(tt.gameS).toBeCloseTo(t.carrier!.plan.totalS + (t.carrier!.turnS ?? 0) + t.plan.totalS, 6);
    expect(tt.legsRealS).toHaveLength(2);
    expect(tt.realS).toBeGreaterThan(10);
    expect(tt.realS).toBeLessThanOrEqual(TRAVEL_TIME.capS);
    // While the mothership flies, the lapse is about its base pace and the HUD gets a real-time ETA.
    const run = nav.startProgramming();
    while (run.current) nav.answer(right(run.current));
    nav.update(1);
    const p = nav.progress()!;
    expect(p.lapse).toBeCloseTo(TRAVEL_TIME.lapse.carrier, 0);
    expect(p.etaRealS).toBeLessThan(tt.realS);
    expect(p.etaRealS).toBeGreaterThan(tt.realS - 2);
  });

  it("another compressed trip under way blocks programming", () => {
    const { nav, member } = make();
    nav.select(member.data.id);
    (nav as unknown as { ports: { busy: (c: boolean) => string } }).ports.busy = (c) => (c ? "La sonda está fuera" : "");
    expect(nav.canProgram()).toEqual({ ok: false, reason: "La sonda está fuera" });
  });

  it("near the target already (the start by Bennu) the probe undocks and flies the hop itself", () => {
    const { nav, docking } = make();
    expect(nav.trip().carrier).toBeUndefined();
    const run = nav.startProgramming();
    while (run.current) nav.answer(right(run.current));
    expect(nav.status).toBe("autopilot");
    expect(docking.docked).toBe(false);
  });

  it("a reload in mid-trip (docs/design/partidas.md): the saved hop resumes at the same point, still flying, and ends where it would have", () => {
    const a = make();
    a.nav.select(a.member.data.id);
    const run = a.nav.startProgramming();
    while (run.current) a.nav.answer(right(run.current));
    for (let i = 0; i < 300; i++) a.nav.update(0.1);
    expect(a.nav.status).toBe("carrier");
    const before = a.nav.progress()!;
    const saved = JSON.parse(JSON.stringify(a.nav.tripSnapshot()));
    expect(saved).toBeDefined();

    // A new game, read back as GameSave does: the mothership where it was (the lander docked to her), then the trip.
    const b = make();
    b.mothership.moveTo(a.mothership.position, a.mothership.orientation);
    const fuel = a.mothership.propellantKg;
    b.mothership.propellantKg = fuel;
    expect(b.nav.resumeTrip(saved)).toBe(true);
    expect(b.nav.status).toBe("carrier");
    expect(b.nav.target.id).toBe(a.member.data.id);
    expect(b.nav.carrying).toBe(true);
    // Not a new burn: the propellant was spent when it set off.
    expect(b.mothership.propellantKg).toBe(fuel);
    expect(b.mothership.position.sub(a.mothership.position).length()).toBeLessThan(1);
    const after = b.nav.progress()!;
    expect(after.fraction).toBeCloseTo(before.fraction, 3);
    expect(after.phase).toBe(before.phase);
    expect(after.etaRealS).toBeCloseTo(before.etaRealS, 0);
    expect(b.nav.route.length).toBe(a.nav.route.length);

    // Both go on the same way and park at the same point.
    for (let i = 0; i < 6000 && (a.nav.status === "carrier" || b.nav.status === "carrier"); i++) {
      a.nav.update(0.1);
      b.nav.update(0.1);
    }
    expect(b.nav.status).toBe("autopilot");
    expect(b.mothership.position.sub(a.mothership.position).length()).toBeLessThan(1);
  }, 30_000);

  it("while the mothership flies with the lander aboard it cannot undock; parked, the trip undocks it itself", () => {
    const { nav, flight, docking, member } = make();
    docking.undockHold = () => nav.undockHold();
    expect(nav.undockHold()).toBeUndefined();
    nav.select(member.data.id);
    const run = nav.startProgramming();
    while (run.current) nav.answer(right(run.current));
    nav.update(1);
    expect(nav.undockHold()).toMatch(/en viaje/);
    expect(docking.undock()).toBe(false);
    expect(docking.docked).toBe(true);
    for (let i = 0; i < 6000 && nav.status === "carrier"; i++) {
      nav.update(0.1);
      flight.update(0.1 * nav.lapse, NO_INPUT);
    }
    expect(nav.status).toBe("autopilot");
    expect(docking.docked).toBe(false);
    expect(nav.undockHold()).toBeUndefined();
  }, 30_000);

  it("no trip flying, or a broken one saved: nothing to resume", () => {
    const { nav } = make();
    expect(nav.tripSnapshot()).toBeUndefined();
    expect(nav.resumeTrip({ kind: "nodriza", targetId: "nada" })).toBe(false);
    expect(nav.resumeTrip(undefined)).toBe(false);
    expect(nav.status).toBe("idle");
  });
});
