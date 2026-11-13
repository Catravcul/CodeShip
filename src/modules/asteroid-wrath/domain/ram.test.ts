import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { chargeTimeS, chooseAttack, dodgeDirection, dodgeNeeded, overshoot, RAM, ramCapable, ramImpact, reducedMassKg } from "./ram";

const BENNU_KG = 7.329e10;
const LANDER_KG = 6000;

describe("ram: the choice (game rule)", () => {
  const base = { kind: "aterrizador" as const, landed: false, onThisBody: false, chargeTopSpeedMs: 8, recedeMs: 0, gapM: 100, craftMassKg: LANDER_KG };

  it("a fast asteroid rams a craft it can close on; a slow one keeps throwing", () => {
    expect(chooseAttack(base).attack).toBe("embestir");
    expect(ramCapable(RAM.minChargeSpeedMs - 0.1)).toBe(false);
    expect(chooseAttack({ ...base, chargeTopSpeedMs: 4 }).attack).toBe("lanzar");
  });

  it("does not charge a craft that flees faster than it can close", () => {
    expect(chooseAttack({ ...base, recedeMs: 8 - RAM.minClosingMs + 0.5 }).attack).toBe("lanzar");
    expect(chooseAttack({ ...base, recedeMs: -3 }).attack).toBe("embestir");
  });

  it("charges only from close: farther out it closes in first", () => {
    expect(chooseAttack({ ...base, gapM: RAM.startGapM + 1 }).attack).toBe("lanzar");
    // Too close for a run-up: it shadows the craft until it opens some distance.
    expect(chooseAttack({ ...base, gapM: RAM.minRunUpM - 1 }).attack).toBe("lanzar");
  });

  it("shakes off a craft landed on it instead of ramming; does not charge one landed elsewhere, nor the suit", () => {
    expect(chooseAttack({ ...base, landed: true, onThisBody: true }).attack).toBe("sacudir");
    expect(chooseAttack({ ...base, landed: true, onThisBody: false }).attack).toBe("lanzar");
    expect(chooseAttack({ ...base, kind: "traje" }).attack).toBe("lanzar");
    expect(chooseAttack({ ...base, craftMassKg: undefined }).attack).toBe("lanzar");
  });
});

describe("ram: impact physics", () => {
  it("reduced mass is m₁m₂/(m₁+m₂): about the craft's own mass against an asteroid", () => {
    expect(reducedMassKg(2, 2)).toBeCloseTo(1, 12);
    expect(reducedMassKg(BENNU_KG, LANDER_KG)).toBeCloseTo(LANDER_KG, 3);
  });

  it("energy ½·μ·v², the share the bounce does not return is lost to the hull, momentum (1+e)·μ·v", () => {
    const n = Vec3.X;
    const h = ramImpact(BENNU_KG, LANDER_KG, new Vec3(8, 0, 0), n, 0.38);
    const mu = reducedMassKg(BENNU_KG, LANDER_KG);
    expect(h.closingMs).toBeCloseTo(8, 12);
    expect(h.energyJ).toBeCloseTo(0.5 * mu * 64, 3);
    expect(h.absorbedJ).toBeCloseTo(0.5 * mu * 64 * (1 - 0.38 ** 2), 3);
    // The craft flies off ahead of the asteroid at (1+e)·v; the asteroid barely notices.
    expect(h.craftDeltaV.x).toBeCloseTo((1 + 0.38) * 8 * (mu / LANDER_KG), 6);
    expect(h.asteroidDeltaVMs).toBeLessThan(1e-6);
    // Momentum is conserved.
    expect(h.craftDeltaV.x * LANDER_KG).toBeCloseTo(h.asteroidDeltaVMs * BENNU_KG, 3);
  });

  it("only the closing component along the line of centres hits: a graze does far less", () => {
    const head = ramImpact(BENNU_KG, LANDER_KG, new Vec3(8, 0, 0), Vec3.X, RAM.restitution);
    const graze = ramImpact(BENNU_KG, LANDER_KG, new Vec3(8, 0, 0), new Vec3(0.2, 1, 0).normalize(), RAM.restitution);
    expect(graze.absorbedJ).toBeLessThan(head.absorbedJ * 0.1);
    expect(graze.energyJ).toBeCloseTo(head.energyJ, 3);
    // Separating bodies do not collide.
    expect(ramImpact(BENNU_KG, LANDER_KG, new Vec3(-1, 0, 0), Vec3.X, RAM.restitution).absorbedJ).toBe(0);
  });
});

describe("ram: timing, dodge and overshoot", () => {
  it("time to cover a gap from rest: ½·a·t² while accelerating, then cruise at top speed", () => {
    expect(chargeTimeS(50, 1, 100)).toBeCloseTo(10, 9);
    // 0,6 m/s² to 8 m/s: 13,3 s and 53,3 m, then 96,7 m at 8 m/s.
    expect(chargeTimeS(150, 0.6, 8)).toBeCloseTo(8 / 0.6 + (150 - 64 / 1.2) / 8, 6);
    // Already at top speed: plain cruise; part way up: the rest of the ramp first.
    expect(chargeTimeS(80, 0.6, 8, 8)).toBeCloseTo(10, 9);
    expect(chargeTimeS(80, 0.6, 8, 4)).toBeLessThan(chargeTimeS(80, 0.6, 8));
  });

  it("to dodge, the craft must leave the asteroid's path: radius plus its own, sideways", () => {
    const d = dodgeNeeded(245, 3, 20);
    expect(d.lateralM).toBe(248);
    expect(d.accelMs2).toBeCloseTo((2 * 248) / 400, 9);
    const side = dodgeDirection(Vec3.X, new Vec3(10, 2, 0));
    expect(side.dot(Vec3.X)).toBeCloseTo(0, 9);
    expect(side.y).toBeCloseTo(1, 9);
    // Dead on the line: any perpendicular will do.
    expect(Math.abs(dodgeDirection(Vec3.X, new Vec3(10, 0, 0)).dot(Vec3.X))).toBeLessThan(1e-9);
  });

  it("a miss costs it: it stops v²/2a past the craft and needs 2v/a to come back with its chase push", () => {
    const o = overshoot(8, 0.06);
    expect(o.stopM).toBeCloseTo(64 / 0.12, 6);
    expect(o.turnaroundS).toBeCloseTo(16 / 0.06, 6);
  });
});
