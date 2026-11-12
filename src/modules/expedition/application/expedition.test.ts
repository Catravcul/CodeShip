import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { duelProfileFor } from "@modules/mind-duel/domain/difficulty";
import { resourceRichness } from "@modules/celestial/domain/resources";
import { Expedition } from "./expedition";

const r = BENNU.meanRadiusM.value;
const make = () => {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const flight = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(new Vec3(0, r + 1.5, 0)).withVelocity(new Vec3(0, -0.05, 0)), {
    gravitySources: [bennu],
    target: bennu,
  });
  return new Expedition(flight, bennu, EXERCISES, 500);
};
const land = (e: Expedition) => {
  for (let i = 0; i < 1200 && e.phase !== "landed"; i++) e.update(1 / 60, NO_INPUT);
};
const correct = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const wrong = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: [...ex.solution].reverse() } : { kind: "choice", index: (ex.correct + 1) % ex.options.length });

describe("Expedition", () => {
  it("a duel can only start once the ship is anchored", () => {
    const e = make();
    expect(e.canStartDuel).toBe(false);
    expect(() => e.startDuel()).toThrow();
    land(e);
    expect(e.phase).toBe("landed");
    e.startDuel();
    expect(e.phase).toBe("duel");
  });

  it("persuading the asteroid fills the cargo with its real materials", () => {
    const e = make();
    land(e);
    e.startDuel();
    while (e.phase === "duel") e.answer(correct(e.duel!.current!));
    expect(e.phase).toBe("persuaded");
    expect(e.cargo.reduce((s, c) => s + c.kg, 0)).toBeCloseTo(500, 6);
  });

  it("losing its patience shakes the ship off and the hull suffers until it flees", () => {
    const e = make();
    land(e);
    e.startDuel();
    while (e.phase === "duel") e.answer(wrong(e.duel!.current!));
    expect(e.phase).toBe("aggressive");
    expect(e.flight.landed).toBe(false);
    e.update(5, NO_INPUT);
    expect(e.flight.ship.hullIntegrity).toBeLessThan(1);
  });

  it("after fleeing beyond the safe distance the asteroid calms down", () => {
    const e = make();
    land(e);
    e.startDuel();
    while (e.phase === "duel") e.answer(wrong(e.duel!.current!));
    // Flee straight up with the RCS until well past the safe distance, then wait.
    for (let i = 0; i < 4000 && e.flight.telemetry().distanceToSurface < e.safeDistanceM! + 50; i++) e.update(0.5, { ...NO_INPUT, translation: new Vec3(0, 1, 0) });
    expect(e.flight.telemetry().distanceToSurface).toBeGreaterThan(e.safeDistanceM!);
    e.update(61, NO_INPUT);
    expect(e.phase).toBe("flight");
  });

  it("pilot input is ignored while inside the asteroid's mind", () => {
    const e = make();
    land(e);
    e.startDuel();
    e.update(2, { ...NO_INPUT, mainThrottle: 1 });
    expect(e.flight.landed).toBe(true);
  });

  it("can switch to another asteroid, land on it and duel a mind as hard as its mass and resources", () => {
    const bennu = new Asteroid(BENNU, Vec3.ZERO);
    const data = POLANA_MEMBERS[0]!;
    const member = new Asteroid(data, new Vec3(-4200, 900, -9000));
    const above = member.position.add(new Vec3(0, data.meanRadiusM.value + 1.5, 0));
    const flight = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(above).withVelocity(member.surfaceVelocity(above).add(new Vec3(0, -0.05, 0))), {
      gravitySources: [bennu, member],
      target: bennu,
    });
    const e = new Expedition(flight, bennu, EXERCISES, 500);
    expect(e.retarget(member)).toBe(true);
    expect(e.asteroid).toBe(member);
    expect(flight.target).toBe(member);
    land(e);
    expect(e.phase).toBe("landed");
    expect(e.retarget(bennu)).toBe(false);
    e.startDuel();
    const expected = duelProfileFor({ massKg: member.massKg, richness: resourceRichness(data.composition) });
    expect(e.duel!.profile).toEqual(expected);
    while (e.phase === "duel") e.answer(correct(e.duel!.current!));
    expect(e.phase).toBe("persuaded");
    expect(e.isPersuaded(data.id)).toBe(true);
  });
});
