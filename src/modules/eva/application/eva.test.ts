import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { SAFER } from "../data/suit";
import { SUIT_UP } from "../data/suit-up";
import { NO_EVA_INPUT } from "../domain/surface-motion";
import { EVA_TIME_SCALE, Eva, HATCH_REACH_M, shipKeepOut } from "./eva";

const r = BENNU.meanRadiusM.value;
const make = () => {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const flight = new FlightComputer(Ship.create(explorerDesign()), RigidBodyState.at(new Vec3(0, r + 1.5, 0)).withVelocity(new Vec3(0, -0.05, 0)), {
    gravitySources: [bennu],
    target: bennu,
  });
  return { flight, eva: new Eva(flight, bennu, () => r) };
};
const land = (f: FlightComputer) => {
  for (let i = 0; i < 1200 && !f.landed; i++) f.update(1 / 60, NO_INPUT);
};
const correct = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
const input = (o: Partial<typeof NO_EVA_INPUT>) => ({ ...NO_EVA_INPUT, ...o });

describe("Eva", () => {
  it("can only leave the ship once it is landed", () => {
    const { flight, eva } = make();
    expect(eva.canLeave).toBe(false);
    expect(() => eva.suitUp()).toThrow();
    land(flight);
    expect(eva.canLeave).toBe(true);
  });

  it("suit-up is a chain of code challenges; solving it puts her outside by the hatch", () => {
    const { flight, eva } = make();
    land(flight);
    const run = eva.suitUp();
    expect(eva.phase).toBe("preparando");
    expect(run.steps).toBe(SUIT_UP.exercises.length);
    while (run.current) eva.answer(correct(run.current));
    expect(eva.phase).toBe("fuera");
    expect(eva.drainEvents()).toContainEqual({ type: "salida" });
    expect(eva.distanceToHatch).toBeLessThan(HATCH_REACH_M);
    expect(eva.body!.heightM).toBeLessThan(1e-6);
  });

  it("closing suit-up goes back inside", () => {
    const { flight, eva } = make();
    land(flight);
    eva.suitUp();
    eva.cancelSuitUp();
    expect(eva.phase).toBe("dentro");
  });

  it("the jetpack pushes with SAFER's 4 × 3.56 N on her, suit and pack", () => {
    const { eva } = make();
    expect(eva.massKg).toBeCloseTo(58 + 144.7 + 37.7, 6);
    expect(eva.jetAccelMs2).toBeCloseTo((4 * SAFER.thrustPerThrusterN.value) / eva.massKg, 9);
  });

  it("collects a regolith sample when holding on next to it", () => {
    const { flight, eva } = make();
    land(flight);
    eva.stepOutside();
    const spot = eva.spots[0]!;
    expect(eva.collect()).toBeUndefined();
    for (let i = 0; i < 60 * 200 && !eva.nearSample; i++) {
      const to = spot.position.sub(eva.body!.position);
      eva.update(1 / 60, input({ move: to.normalize() }));
    }
    expect(eva.nearSample).toBe(spot);
    expect(eva.collect()).toBe(spot.sample);
    expect(spot.collected).toBe(true);
    expect(eva.collectedG).toBeGreaterThan(0);
    expect(eva.drainEvents().some((e) => e.type === "muestra")).toBe(true);
  });

  it("never crawls through the landed ship", () => {
    const { flight, eva } = make();
    land(flight);
    eva.stepOutside();
    const ship = eva.asteroid.toLocal(flight.state.position, flight.simTimeS);
    const towardShip = ship.sub(eva.body!.position).normalize();
    for (let i = 0; i < 60 * 60; i++) eva.update(1 / 60, input({ move: towardShip }));
    for (let i = 0; i < 60 * 60; i++) {
      eva.update(1 / 60, input({ move: ship.sub(eva.body!.position).normalize() }));
      const dd = eva.body!.position.sub(ship);
      const x = Math.abs(dd.dot(eva.shipAxes.right));
      const f = dd.dot(eva.shipAxes.forward);
      expect(x >= 1.8 - 1e-3 || f >= 3.7 - 1e-3 || f <= -2.8 + 1e-3).toBe(true);
    }
  });

  it("'Volver a la nave' from far away heads back by itself and boards at the hatch", () => {
    const { flight, eva } = make();
    land(flight);
    eva.stepOutside();
    for (let i = 0; i < 60 * 60; i++) eva.update(1 / 60, input({ move: eva.shipAxes.right.scale(-1) }));
    expect(eva.distanceToHatch).toBeGreaterThan(5);
    eva.requestReturn();
    expect(eva.phase).toBe("volviendo");
    for (let i = 0; i < 60 * 300 && eva.outside; i++) eva.update(1 / 60);
    expect(eva.phase).toBe("dentro");
    expect(eva.drainEvents()).toContainEqual({ type: "dentro" });
  });

  it("flags her adrift when she pushes off too hard, and the tether holds her", () => {
    const { flight, eva } = make();
    land(flight);
    eva.stepOutside();
    eva.body!.applyImpulse(eva.shipAxes.up.scale(0.4));
    eva.update(1 / 60);
    expect(eva.drainEvents()).toContainEqual({ type: "a-la-deriva" });
    for (let i = 0; i < 60 * 120; i++) eva.update(1 / 60);
    expect(eva.body!.distanceToAnchor).toBeLessThanOrEqual(25.9 + 1e-9);
  });

  it("time outside runs faster: a real minute uses EVA_TIME_SCALE minutes of oxygen", () => {
    const used = (scale: number) => {
      const { flight, eva } = make();
      land(flight);
      eva.timeScale = scale;
      eva.stepOutside();
      const before = eva.suit.timeLeftS;
      for (let i = 0; i < 60 * 60; i++) eva.update(1 / 60);
      expect(eva.elapsedS).toBeCloseTo(60 * scale, 3);
      return before - eva.suit.timeLeftS;
    };
    expect(used(EVA_TIME_SCALE) / used(1)).toBeCloseTo(EVA_TIME_SCALE, 3);
  });

  it("when the suit runs low she heads back on her own", () => {
    const { flight, eva } = make();
    land(flight);
    eva.stepOutside();
    eva.suit.tick(7.7 * 3600, 1);
    eva.update(1 / 60);
    expect(eva.phase === "volviendo" || eva.phase === "dentro").toBe(true);
  });
});

describe("shipKeepOut", () => {
  it("pushes a point inside the hull footprint out by the nearest side", () => {
    const k = shipKeepOut(Vec3.ZERO, Vec3.X, new Vec3(0, 0, -1));
    expect(k(new Vec3(1.5, 0, 0)).x).toBeCloseTo(1.8, 9);
    expect(k(new Vec3(5, 0, 0)).x).toBe(5);
  });

  it("lies face down on the asteroid: still, no crawling, until she gets up", () => {
    const { flight, eva } = make();
    land(flight);
    expect(eva.lieDown()).toBe(false);
    eva.stepOutside();
    expect(eva.canLieDown).toBe(true);
    expect(eva.lieDown()).toBe(true);
    expect(eva.lying).toBe(true);
    expect(eva.canLieDown).toBe(false);
    const at = eva.body!.position;
    eva.update(2, input({ move: new Vec3(1, 0, 0) }));
    expect(eva.body!.position.sub(at).length()).toBeLessThan(1e-6);
    eva.standUp();
    expect(eva.lying).toBe(false);
    expect(eva.drainEvents().map((e) => e.type)).toEqual(["salida", "tumbada", "en-pie"]);
  });

  it("an angry asteroid throws her off; the tether and the winch bring her back aboard", () => {
    const { flight, eva } = make();
    land(flight);
    eva.stepOutside();
    eva.lieDown();
    eva.throwOff(0.3);
    expect(eva.lying).toBe(false);
    expect(eva.body!.mode).toBe("flotando");
    expect(eva.phase).toBe("volviendo");
    for (let i = 0; i < 600 && eva.outside; i++) eva.update(1, NO_EVA_INPUT);
    expect(eva.phase).toBe("dentro");
  });

  it("walks on another asteroid with its own gravity and shape, without Bennu's samples", () => {
    const { flight, eva } = make();
    const big = new Asteroid({ ...BENNU, id: "big", massKg: { ...BENNU.massKg, value: BENNU.massKg.value * 8 } }, Vec3.ZERO, () => r);
    eva.retarget(big);
    expect(eva.asteroid).toBe(big);
    land(flight);
    eva.stepOutside();
    expect(eva.spots).toHaveLength(0);
    const bennuEscape = Math.sqrt((2 * new Asteroid(BENNU, Vec3.ZERO).mu) / r);
    expect(eva.body!.escapeSpeedMs).toBeGreaterThan(2 * bennuEscape);
    // Not while outside.
    eva.retarget(new Asteroid(BENNU, Vec3.ZERO));
    expect(eva.asteroid).toBe(big);
  });
});
