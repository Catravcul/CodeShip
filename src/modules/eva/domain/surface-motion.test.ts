import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { G } from "@core/units";
import { BENNU } from "@modules/celestial/data/bennu";
import { asteroidSurfaceFn } from "../../../content/asteroid-shape";
import { EVA_TUNING, EvaBody, NO_EVA_INPUT, effectiveGravity, escapeSpeed, heightAbove, type EvaWorld } from "./surface-motion";

const mu = G * BENNU.massKg.value;
const spin = (2 * Math.PI) / (BENNU.rotationPeriodH.value * 3600);
const R = BENNU.meanRadiusM.value;
const sphere: EvaWorld = { mu, spinRadS: spin, surface: () => R, meanRadiusM: R };
const still: EvaWorld = { ...sphere, spinRadS: 0 };
const d = BENNU.dimensionsM.value;
const shape = asteroidSurfaceFn({ seed: 101955, size: { x: d.x, y: d.y, z: d.z }, detail: 6, ridge: 0.09, roughness: 0.06, craters: 60 });
const bennu: EvaWorld = { mu, spinRadS: spin, surface: (p) => shape(p), meanRadiusM: R };
const tether = (anchor: Vec3, lengthM = 25.9) => ({ anchor, lengthM });
const jet = { accelMs2: 0.06, deltaVMs: 3.05 };
const pole = new Vec3(0, R, 0);
const input = (o: Partial<typeof NO_EVA_INPUT>) => ({ ...NO_EVA_INPUT, ...o });

describe("Bennu's microgravity (from its real mass)", () => {
  it("escape speed at the mean radius is ~20 cm/s (Wikipedia: 20 cm/s)", () => {
    expect(escapeSpeed(mu, R)).toBeCloseTo(0.2, 2);
  });
  it("point-mass gravity at the 282.5 m equatorial radius matches Wikipedia's 61.5 µm/s²", () => {
    const g = effectiveGravity(still, new Vec3(d.x / 2, 0, 0)).length();
    expect(g * 1e6).toBeCloseTo(61.5, 0);
  });
  it("the spin's centrifugal pull cancels most of it at the equator, but not at the poles", () => {
    const eq = effectiveGravity(sphere, new Vec3(R, 0, 0)).length();
    const np = effectiveGravity(sphere, pole).length();
    expect(np * 1e6).toBeCloseTo(81.5, 0);
    expect(eq).toBeLessThan(np * 0.6);
  });
});

describe("EvaBody on the ground", () => {
  it("starts on the real surface, holding on", () => {
    const b = new EvaBody(bennu, new Vec3(3, 300, 2), tether(new Vec3(3, 300, 2)), jet);
    expect(b.mode).toBe("agarrada");
    expect(Math.abs(heightAbove(bennu, b.position))).toBeLessThan(1e-6);
  });

  it("crawls along the real shape at the crawl speed, never tunnelling", () => {
    const start = new Vec3(0, 300, 0);
    const b = new EvaBody(bennu, start, tether(new Vec3(0, 268, 0)), jet);
    const from = b.position;
    for (let i = 0; i < 600; i++) {
      b.update(1 / 60, input({ move: Vec3.X }));
      expect(heightAbove(bennu, b.position)).toBeGreaterThan(-1e-6);
      expect(heightAbove(bennu, b.position)).toBeLessThan(1e-6);
    }
    const moved = b.position.sub(from).length();
    expect(moved).toBeGreaterThan(EVA_TUNING.crawlSpeedMs * 10 * 0.8);
    expect(moved).toBeLessThan(EVA_TUNING.crawlSpeedMs * 10 * 1.3);
    expect(b.escaping).toBe(false);
  });

  it("near the poles, letting go while crawling never throws her off", () => {
    const b = new EvaBody(sphere, pole, tether(pole), jet);
    b.update(1 / 60, input({ move: Vec3.X, pushOff: true }));
    expect(Math.hypot(EVA_TUNING.crawlSpeedMs, EVA_TUNING.pushOffMs)).toBeLessThan(escapeSpeed(mu, R));
    expect(b.escaping).toBe(false);
  });

  it("at the equator the spin already carries her at ~0.11 m/s: a prograde push of 0.15 m/s escapes", () => {
    const eq = new Vec3(0, 0, d.x / 2);
    const b = new EvaBody({ ...sphere, surface: () => d.x / 2 }, eq, tether(eq), jet);
    expect(b.inertialVelocity.length()).toBeCloseTo(spin * (d.x / 2), 6);
    b.applyImpulse(new Vec3(0.15, 0.01, 0)); // +X is the direction of spin at +Z
    expect(b.escaping).toBe(true);
  });

  it("the tether stops her crawling further than its length", () => {
    const b = new EvaBody(sphere, pole, tether(pole, 2), jet);
    for (let i = 0; i < 60 * 40; i++) b.update(1 / 60, input({ move: Vec3.X }));
    expect(b.distanceToAnchor).toBeLessThanOrEqual(2 + 1e-6);
    expect(b.tetherTaut).toBe(true);
  });
});

describe("EvaBody floating", () => {
  it("a gentle push-off floats her up and microgravity slowly brings her back", () => {
    const b = new EvaBody(sphere, pole, tether(pole), jet);
    b.update(1 / 60, input({ pushOff: true }));
    expect(b.mode).toBe("flotando");
    for (let i = 0; i < 60 * 60; i++) b.update(1 / 60, NO_EVA_INPUT);
    expect(b.heightM).toBeGreaterThan(1.5); // still rising a minute later
    // v²/2g ≈ 0.04² / (2·8.15e-5) ≈ 9.8 m apex; she lands ~16 min after the push.
    let t = 60;
    let apex = 0;
    while (b.mode === "flotando" && t < 3600) {
      b.update(1, NO_EVA_INPUT);
      apex = Math.max(apex, b.heightM);
      t += 1;
    }
    expect(b.mode).toBe("agarrada");
    expect(apex).toBeGreaterThan(8);
    expect(apex).toBeLessThan(11);
    expect(t).toBeGreaterThan(800);
  });

  it("pushing faster than escape speed flags her as escaping; the tether catches her", () => {
    const b = new EvaBody(still, pole, tether(pole, 25.9), jet);
    b.applyImpulse(new Vec3(0, 0.5, 0));
    b.update(1 / 60, NO_EVA_INPUT);
    expect(b.escaping).toBe(true);
    let maxDist = 0;
    let caught = false;
    for (let i = 0; i < 60 * 120; i++) {
      b.update(1 / 60, NO_EVA_INPUT);
      maxDist = Math.max(maxDist, b.distanceToAnchor);
      caught ||= b.tetherTaut;
    }
    expect(caught).toBe(true);
    expect(maxDist).toBeLessThanOrEqual(25.9 + 1e-9);
    expect(b.escaping).toBe(false);
  });

  it("the winch reels her back in to the ground", () => {
    const b = new EvaBody(still, pole, tether(pole, 25.9), jet);
    b.applyImpulse(new Vec3(0.05, 0.3, 0));
    for (let i = 0; i < 60 * 100; i++) b.update(1 / 60, NO_EVA_INPUT);
    expect(b.distanceToAnchor).toBeGreaterThan(20);
    for (let i = 0; i < 60 * 400 && b.mode === "flotando"; i++) b.update(1 / 60, input({ reel: true }));
    expect(b.mode).toBe("agarrada");
    expect(b.distanceToAnchor).toBeLessThan(2);
  });

  it("the jetpack brings her down and spends its 3.05 m/s of Δv", () => {
    const b = new EvaBody(still, pole, tether(pole), jet);
    b.update(1 / 60, input({ pushOff: true }));
    for (let i = 0; i < 60 * 30; i++) b.update(1 / 60, NO_EVA_INPUT);
    for (let i = 0; i < 60 * 60 && b.mode === "flotando"; i++) b.update(1 / 60, input({ jet: new Vec3(0, -0.2, 0) }));
    expect(b.mode).toBe("agarrada");
    expect(b.jetDeltaVLeft).toBeLessThan(3.05);
    expect(b.jetDeltaVLeft).toBeGreaterThan(2.5);
  });

  it("an empty jetpack does nothing", () => {
    const b = new EvaBody(still, pole, tether(pole), { accelMs2: 0.06, deltaVMs: 0.01 });
    b.applyImpulse(new Vec3(0, 0.01, 0));
    for (let i = 0; i < 600; i++) b.update(1 / 60, input({ jet: new Vec3(1, 0, 0) }));
    expect(b.jetDeltaVLeft).toBe(0);
    expect(Math.abs(b.velocity.x)).toBeLessThanOrEqual(0.0101);
  });

  it("a fast fall bounces off the loose regolith instead of sinking", () => {
    const b = new EvaBody(still, pole.add(new Vec3(0, 0.5, 0)), tether(pole), jet);
    b.applyImpulse(new Vec3(0, -0.5, 0));
    for (let i = 0; i < 120; i++) b.update(1 / 60, NO_EVA_INPUT);
    expect(heightAbove(still, b.position)).toBeGreaterThanOrEqual(-1e-9);
    expect(b.velocity.y).toBeGreaterThan(0);
    expect(b.velocity.y).toBeLessThan(0.11);
  });
});
