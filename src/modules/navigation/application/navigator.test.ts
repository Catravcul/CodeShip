import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { NUEVA_POLANA, POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { Region } from "@modules/celestial/domain/region";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Expedition } from "@modules/expedition/application/expedition";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { asteroidTarget } from "../domain/nav-target";
import { Navigator } from "./navigator";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const wrong = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: [...ex.solution].reverse() } : { kind: "choice", index: (ex.correct + 1) % ex.options.length });

const make = (start = new Vec3(250, 120, 1600)) => {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const member = new Asteroid(POLANA_MEMBERS[1]!, new Vec3(7500, -1800, -6000));
  // A rock right on the line from the start to the member.
  const mid = start.add(member.position.sub(start).scale(0.5));
  const region = new Region(NUEVA_POLANA, [bennu, member], [{ position: mid, radiusM: 120, spectralType: "C", albedo: 0.05, seed: 1 }]);
  const flight = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(start), { gravitySources: region.asteroids, target: bennu });
  const expedition = new Expedition(flight, bennu, EXERCISES, 500);
  const targets = region.asteroids.map(asteroidTarget);
  const nav = new Navigator(
    flight,
    {
      targets,
      obstaclesFor: (t) => region.obstaclesExcept(t.kind === "asteroid" ? t.body : undefined),
      retarget: (t) => t.kind !== "asteroid" || expedition.retarget(t.body),
      isPersuaded: (t) => expedition.isPersuaded(t.id),
    },
    targets[0]!,
  );
  return { bennu, member, region, flight, expedition, nav };
};

describe("Navigator", () => {
  it("selecting an asteroid on the map makes it the flight and expedition target", () => {
    const { nav, flight, expedition, member } = make();
    expect(nav.select(member.data.id).ok).toBe(true);
    expect(flight.target).toBe(member);
    expect(expedition.asteroid).toBe(member);
    expect(nav.target.kind === "asteroid" && nav.target.body).toBe(member);
  }, 30_000);

  it("the trip goes round the rock in the way and plans with the ship's real engine", () => {
    const { nav, member } = make();
    nav.select(member.data.id);
    const trip = nav.trip();
    expect(trip.waypoints.length).toBeGreaterThan(0);
    expect(trip.plan.accelMS2).toBeCloseTo(nav["flight"].ship.mainEngines[0]!.model.thrustN / nav["flight"].ship.massKg, 6);
    expect(trip.plan.cruiseMS).toBe(25);
  }, 30_000);

  it("the map card has the duel difficulty from the asteroid's mass and resources", () => {
    const { nav, bennu, member } = make();
    const [t0, t1] = nav.targets.filter((t) => t.kind === "asteroid");
    const b = nav.destination(t0!);
    const m = nav.destination(t1!);
    expect(b.target.body).toBe(bennu);
    expect(m.target.body).toBe(member);
    // 58587 is ~11× more massive than Bennu with the same assumed composition: harder.
    expect(m.duel.difficulty).toBeGreaterThan(b.duel.difficulty);
    expect(b.escapeMS).toBeCloseTo(0.2, 1);
  }, 30_000);

  it("solving the trip challenges engages the autopilot, which hands over near the new target", () => {
    const { nav, flight, member } = make();
    nav.select(member.data.id);
    const run = nav.startProgramming();
    while (run.current) nav.answer(right(run.current));
    expect(nav.status).toBe("autopilot");
    expect(flight.guidance).not.toBeNull();
    for (let t = 0; t < 3000 && nav.status === "autopilot"; t += 1) {
      flight.update(1, NO_INPUT);
      nav.update();
    }
    expect(nav.status).toBe("arrived");
    const h = flight.telemetry().distanceToSurface;
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(400);
  }, 30_000);

  it("failing the challenges leaves the ship under manual control", () => {
    const { nav, flight, member } = make();
    nav.select(member.data.id);
    const run = nav.startProgramming();
    while (run.current) nav.answer(wrong(run.current));
    expect(nav.status).toBe("failed");
    expect(flight.guidance).toBeNull();
  }, 30_000);

  it("can't change destination while landed", () => {
    const { nav, flight, bennu, member } = make(new Vec3(0, BENNU.meanRadiusM.value + 1.5, 0));
    flight.applyImpulse(new Vec3(0, -0.05, 0));
    for (let i = 0; i < 1200 && !flight.landed; i++) flight.update(1 / 60, NO_INPUT);
    expect(flight.landed).toBe(true);
    expect(nav.select(member.data.id).ok).toBe(false);
    expect(flight.target).toBe(bennu);
    expect(nav.canProgram().ok).toBe(false);
  }, 30_000);
});
