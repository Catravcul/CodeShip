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
import { stageDuelProfile } from "@modules/subjugation/domain/rapport";
import { Expedition } from "./expedition";

const r = BENNU.meanRadiusM.value;
const make = (probeDone = true) => {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const flight = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(new Vec3(0, r + 1.5, 0)).withVelocity(new Vec3(0, -0.05, 0)), {
    gravitySources: [bennu],
    target: bennu,
  });
  const e = new Expedition(flight, bennu, EXERCISES, 500);
  // The probe's stage is already done here unless a test says otherwise.
  if (probeDone) e.rapport.of(BENNU.id).succeed("sonda");
  return e;
};
const land = (e: Expedition) => {
  for (let i = 0; i < 1200 && e.phase !== "landed"; i++) e.update(1 / 60, NO_INPUT);
};
const inDuel = (e: Expedition) => e.phase === "duel";
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

  it("persuading it from the lander loads part of its real materials; it is not subjugated yet", () => {
    const e = make();
    land(e);
    e.startDuel();
    while (inDuel(e)) e.answer(correct(e.duel!.current!));
    expect(e.phase).toBe("persuaded");
    expect(e.lastResult).toMatchObject({ stage: "nave", persuaded: true });
    expect(e.cargo.reduce((s, c) => s + c.kg, 0)).toBeCloseTo(200, 6);
    expect(e.isPersuaded(BENNU.id)).toBe(false);
    expect(e.bond.next).toBe("traje");
    const unloaded = e.unloadCargo();
    expect(unloaded.reduce((s, c) => s + c.kg, 0)).toBeCloseTo(200, 6);
    expect(e.cargo).toHaveLength(0);
    e.acknowledge();
    expect(e.phase).toBe("landed");
  });

  it("the lander's duel waits for the probe's stage on that asteroid", () => {
    const e = make(false);
    land(e);
    expect(e.canStartDuel).toBe(false);
    expect(() => e.startDuel()).toThrow();
  });

  it("stage 1 runs through the probe parked on the asteroid and gives the scan and trust", () => {
    const e = make(false);
    let parked: string | undefined;
    e.contacts = { probeParkedOn: () => parked };
    expect(e.canStartStage("sonda")).toBe(false);
    parked = BENNU.id;
    expect(e.canStartStage("sonda")).toBe(true);
    expect(e.canStartStage("nave")).toBe(false);
    e.startDuel("sonda");
    expect(e.stage).toBe("sonda");
    while (inDuel(e)) e.answer(correct(e.duel!.current!));
    expect(e.lastResult!.reward!.scan).toBe(true);
    expect(e.cargo).toHaveLength(0);
    expect(e.bond.trust).toBeGreaterThan(0);
    // The lander, far away, keeps flying: no shake, no cargo.
    e.acknowledge();
    expect(e.phase).toBe("flight");
  });

  it("an enraged asteroid at the probe stage does not shake the lander", () => {
    const e = make(false);
    e.contacts = { probeParkedOn: () => BENNU.id };
    land(e);
    e.startDuel("sonda");
    while (inDuel(e)) e.answer(wrong(e.duel!.current!));
    expect(e.phase).toBe("aggressive");
    expect(e.lastResult).toMatchObject({ stage: "sonda", persuaded: false });
    expect(e.flight.landed).toBe(true);
    expect(e.bond.failures).toBe(1);
  });

  it("stage 3: lying in the suit completes the subjugation and fills the hold", () => {
    const e = make();
    let lying = false;
    e.contacts = { suitLying: () => lying, suitOutside: () => lying };
    land(e);
    e.startDuel();
    while (inDuel(e)) e.answer(correct(e.duel!.current!));
    e.acknowledge();
    expect(e.canStartStage("traje")).toBe(false);
    lying = true;
    expect(e.canStartDuel).toBe(false);
    expect(e.canStartStage("traje")).toBe(true);
    e.startDuel("traje");
    while (inDuel(e)) e.answer(correct(e.duel!.current!));
    expect(e.isPersuaded(BENNU.id)).toBe(true);
    expect(e.cargo.reduce((s, c) => s + c.kg, 0)).toBeCloseTo(500, 6);
    expect(e.bond.trust).toBeCloseTo(1, 9);
  });

  it("failing the suit stage spares the lander until Doménica is aboard, then shakes it off", () => {
    const e = make();
    let outside = false;
    e.contacts = { suitLying: () => outside, suitOutside: () => outside };
    land(e);
    e.startDuel();
    while (inDuel(e)) e.answer(correct(e.duel!.current!));
    e.acknowledge();
    outside = true;
    e.startDuel("traje");
    while (inDuel(e)) e.answer(wrong(e.duel!.current!));
    expect(e.phase).toBe("aggressive");
    e.update(2, NO_INPUT);
    expect(e.flight.landed).toBe(true);
    expect(e.flight.ship.hullIntegrity).toBe(1);
    outside = false;
    e.update(2, NO_INPUT);
    expect(e.flight.landed).toBe(false);
    expect(e.flight.ship.hullIntegrity).toBeLessThan(1);
  });

  it("trust tempers its anger: the same flight takes less damage from a trusting asteroid", () => {
    const hurt = (trusting: boolean) => {
      const e = make();
      land(e);
      e.startDuel();
      if (trusting) e.rapport.of(BENNU.id).succeed("nave");
      while (inDuel(e)) e.answer(wrong(e.duel!.current!));
      e.update(5, NO_INPUT);
      return 1 - e.flight.ship.hullIntegrity;
    };
    expect(hurt(true)).toBeLessThan(hurt(false));
  });

  it("losing its patience shakes the ship off and the hull suffers until it flees", () => {
    const e = make();
    land(e);
    e.startDuel();
    while (inDuel(e)) e.answer(wrong(e.duel!.current!));
    expect(e.phase).toBe("aggressive");
    expect(e.flight.landed).toBe(false);
    e.update(5, NO_INPUT);
    expect(e.flight.ship.hullIntegrity).toBeLessThan(1);
  });

  it("after fleeing beyond the safe distance the asteroid calms down", () => {
    const e = make();
    land(e);
    e.startDuel();
    while (inDuel(e)) e.answer(wrong(e.duel!.current!));
    // Flee straight up with the RCS until well past the safe distance, then wait.
    for (let i = 0; i < 4000 && e.flight.telemetry().distanceToSurface < e.safeDistanceM! + 50; i++) e.update(0.5, { ...NO_INPUT, translation: new Vec3(0, 1, 0) });
    expect(e.flight.telemetry().distanceToSurface).toBeGreaterThan(e.safeDistanceM!);
    e.update(61, NO_INPUT);
    expect(e.phase).toBe("flight");
  });

  it("with the asteroid's wrath wired in, a failed duel is reported with its phase and no duel starts until it calms", () => {
    const e = make();
    const calls: [string, number][] = [];
    let calm = true;
    e.wrath = {
      duelFailed: (id, phase) => {
        calls.push([id, phase]);
        calm = false;
      },
      canRetry: () => calm,
    };
    land(e);
    e.startDuel();
    while (e.phase === "duel") e.answer(wrong(e.duel!.current!));
    expect(calls).toEqual([[BENNU.id, 2]]);
    expect(e.phase).toBe("aggressive");
    e.update(5, NO_INPUT);
    // The wrath module owns the damage now: no close-range debris from the old rule.
    expect(e.flight.ship.hullIntegrity).toBe(1);
    land(e);
    expect(e.canStartDuel).toBe(false);
    calm = true;
    e.update(0.1, NO_INPUT);
    expect(e.phase).toBe(e.flight.landed ? "landed" : "flight");
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
    e.rapport.of(data.id).succeed("sonda");
    expect(e.retarget(member)).toBe(true);
    expect(e.asteroid).toBe(member);
    expect(flight.target).toBe(member);
    land(e);
    expect(e.phase).toBe("landed");
    expect(e.retarget(bennu)).toBe(false);
    e.startDuel();
    const base = duelProfileFor({ massKg: member.massKg, richness: resourceRichness(data.composition) });
    expect(e.duel!.profile).toEqual(stageDuelProfile(base, "nave", e.bond.trust));
    while (inDuel(e)) e.answer(correct(e.duel!.current!));
    expect(e.phase).toBe("persuaded");
    expect(e.bond.stagesDone).toBe(2);
  });

  it("tells the wrath module which phase failed, and waits for it to calm before the next duel", () => {
    const e = make(false);
    const failed: [string, number][] = [];
    let calm = true;
    e.wrath = { duelFailed: (id, phase) => (failed.push([id, phase]), (calm = false)), canRetry: () => calm };
    e.contacts = { probeParkedOn: () => BENNU.id };
    e.startDuel("sonda");
    expect(e.duelPhase).toBe(1);
    while (inDuel(e)) e.answer(wrong(e.duel!.current!));
    expect(failed).toEqual([[BENNU.id, 1]]);
    expect(e.canStartStage("sonda")).toBe(false);
    calm = true;
    e.update(0.1, NO_INPUT);
    expect(e.phase).not.toBe("aggressive");
    expect(e.canStartStage("sonda")).toBe(true);
  });

  describe("subjugation levels (after the three stages)", () => {
    const subjugatedAndLanded = () => {
      const e = make();
      e.rapport.of(BENNU.id).succeed("nave");
      e.rapport.of(BENNU.id).succeed("traje");
      land(e);
      return e;
    };

    it("no level duel before it obeys", () => {
      const e = make();
      land(e);
      expect(e.canStartLevel()).toBe(false);
      expect(() => e.startLevelDuel()).toThrow();
    });

    it("from the anchored lander, each won duel raises it one level, up to 4, with a harder duel each time", () => {
      const e = subjugatedAndLanded();
      let lastGoal = 0;
      for (const l of [1, 2, 3, 4]) {
        expect(e.canStartLevel()).toBe(true);
        expect(e.startLevelDuel()).toBe(l);
        expect(e.duel!.profile.persuasionGoal).toBeGreaterThan(lastGoal);
        lastGoal = e.duel!.profile.persuasionGoal;
        while (inDuel(e)) e.answer(correct(e.duel!.current!));
        expect(e.lastResult).toMatchObject({ level: l, persuaded: true, stage: "nave" });
        expect(e.bond.level).toBe(l);
        // A level adds no cargo to the lander: what it gives comes later, by itself.
        expect(e.cargo).toHaveLength(0);
        e.acknowledge();
      }
      expect(e.canStartLevel()).toBe(false);
    });

    it("through the parked probe too", () => {
      const e = subjugatedAndLanded();
      expect(e.canStartLevel("sonda")).toBe(false);
      e.contacts = { probeParkedOn: () => BENNU.id };
      expect(e.canStartLevel("sonda")).toBe(true);
      e.startLevelDuel("sonda");
      expect(e.duelPhase).toBe(1);
    });

    it("a failed level duel costs trust (not the level), enrages it against the lander and shakes it off", () => {
      const e = subjugatedAndLanded();
      const calls: [string, number, readonly string[] | undefined][] = [];
      e.wrath = { duelFailed: (id, phase, who) => calls.push([id, phase, who]), canRetry: () => calls.length === 0 };
      const trust = e.bond.trust;
      e.startLevelDuel();
      while (inDuel(e)) e.answer(wrong(e.duel!.current!));
      expect(e.phase).toBe("aggressive");
      expect(e.lastResult).toMatchObject({ level: 1, persuaded: false });
      expect(e.bond.level).toBe(0);
      expect(e.bond.trust).toBeLessThan(trust);
      expect(calls).toEqual([[BENNU.id, 2, ["aterrizador"]]]);
      expect(e.flight.landed).toBe(false);
    });
  });
});
