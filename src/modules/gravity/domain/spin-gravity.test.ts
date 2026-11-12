import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { G0 } from "@core/units";
import { SpinRing, centripetalAcceleration, checkComfort, radiusForGravity, rpmForGravity, rpmToRadS, type ComfortLimit, type RingSpec } from "./spin-gravity";

const SPEC: RingSpec = { name: "test", floorRadiusM: 56, widthM: 18, deckHeightM: 7, rpm: 4, spinUpRadS2: 0.002, counterRotating: true, sources: [] };

describe("spin gravity formulas", () => {
  it("a = ω²r", () => {
    expect(centripetalAcceleration(2, 3)).toBe(12);
    expect(rpmToRadS(60)).toBeCloseTo(2 * Math.PI);
  });

  it("1 g at 2 rpm needs a ring of ~224 m radius, at 4 rpm ~56 m", () => {
    expect(radiusForGravity(G0, 2)).toBeCloseTo(223.6, 0);
    expect(radiusForGravity(G0, 4)).toBeCloseTo(55.9, 0);
    expect(rpmForGravity(G0, 56)).toBeCloseTo(4, 1);
  });
});

describe("SpinRing", () => {
  const ring = new SpinRing(SPEC);

  it("gives ~1 g at the floor and nothing on the axis", () => {
    expect(ring.gravityG(56)).toBeCloseTo(1.0, 2);
    expect(ring.gravityAtRadius(0)).toBe(0);
  });

  it("gravity falls linearly with height above the floor (the gradient)", () => {
    expect(ring.gravityAtHeight(0)).toBeCloseTo(ring.gravityAtRadius(56));
    expect(ring.gravityAtHeight(28) / ring.gravityAtHeight(0)).toBeCloseTo(0.5);
    // Head-to-foot for a 1.6 m person: 1.6 / 56 ≈ 2.9 %, whatever the spin rate.
    expect(ring.gradient(1.6)).toBeCloseTo(0.0286, 3);
    expect(ring.gravityAtHeight(80)).toBe(0);
  });

  it("rim speed is ωR", () => {
    expect(ring.rimSpeedMs).toBeCloseTo(rpmToRadS(4) * 56);
  });

  it("walking spinward makes you heavier, antispinward lighter", () => {
    expect(ring.walkingWeightFactor(1.2)).toBeGreaterThan(1.09);
    expect(ring.walkingWeightFactor(-1.2)).toBeLessThan(0.91);
  });

  it("Coriolis: spinward motion pushes down, climbing pushes spinward, axial motion feels nothing", () => {
    const w = ring.omegaRadS;
    expect(ring.coriolis(new Vec3(0, 0, 1)).y).toBeCloseTo(-2 * w);
    expect(ring.coriolis(new Vec3(0, 1, 0)).z).toBeCloseTo(2 * w);
    expect(ring.coriolis(new Vec3(1, 0, 0)).length()).toBeCloseTo(0);
  });

  it("apparent acceleration at the floor is ω²R pointing down (away from the axis)", () => {
    const a = ring.apparentAcceleration(new Vec3(0, -56, 0), Vec3.ZERO);
    expect(a.y).toBeCloseTo(-ring.gravityAtRadius(56));
    expect(Math.abs(a.x) + Math.abs(a.z)).toBeCloseTo(0);
  });

  it("a dropped fork lands antispinward by ≈ (2h)^1.5 / (3√R), independent of rpm", () => {
    const d = ring.dropDrift(0.9);
    expect(d).toBeLessThan(0);
    expect(d).toBeCloseTo(-Math.pow(1.8, 1.5) / (3 * Math.sqrt(56)), 2);
    const slow = new SpinRing({ ...SPEC, rpm: 2 });
    expect(slow.dropDrift(0.9)).toBeCloseTo(d, 6);
  });

  it("the fall takes about as long as under the same uniform gravity", () => {
    const r = ring.release(new Vec3(0, 0.9, 0), Vec3.ZERO)!;
    expect(r.timeS).toBeCloseTo(Math.sqrt((2 * 0.9) / ring.gravityAtRadius(56)), 1);
    expect(r.points.at(-1)!.y).toBeCloseTo(0, 6);
  });

  it("a ball thrown spinward falls short and one thrown antispinward flies long", () => {
    const v = 4;
    const flat = ring.flatLanding(new Vec3(0, 1.2, 0), new Vec3(0, 2, v));
    const spin = ring.release(new Vec3(0, 1.2, 0), new Vec3(0, 2, v))!;
    const anti = ring.release(new Vec3(0, 1.2, 0), new Vec3(0, 2, -v))!;
    expect(spin.landing.z).toBeLessThan(flat.z);
    expect(-anti.landing.z).toBeGreaterThan(flat.z);
  });

  it("a ball thrown along the axis keeps its axial speed but drifts antispinward", () => {
    const r = ring.release(new Vec3(0, 1.2, 0), new Vec3(3, 2, 0))!;
    expect(r.landing.x).toBeCloseTo(3 * r.timeS, 6);
    expect(r.landing.z).toBeLessThan(0);
  });

  it("with the ring stopped nothing falls", () => {
    const stopped = new SpinRing(SPEC, false);
    expect(stopped.release(new Vec3(0, 1, 0), Vec3.ZERO)).toBeUndefined();
    expect(stopped.gravityAtHeight(0)).toBe(0);
  });

  it("spins up and down at the motor's angular acceleration", () => {
    const r = new SpinRing(SPEC, false);
    expect(r.spinFraction).toBe(0);
    r.spinUp();
    r.tick(60);
    expect(r.omegaRadS).toBeCloseTo(0.12);
    r.tick(1e4);
    expect(r.spinFraction).toBe(1);
    expect(r.rpm).toBeCloseTo(4);
    r.spinDown();
    r.tick(1e4);
    expect(r.omegaRadS).toBe(0);
  });
});

describe("comfort limits", () => {
  const limits: ComfortLimit[] = [
    { id: "a", author: "A", year: 1962, maxRpm: 4, minG: 0.035, maxG: 1, minRimSpeedMs: 6, source: "x" },
    { id: "b", author: "B", year: 1985, maxRpm: 3, maxGradientG: 0.03, source: "y" },
  ];

  it("lists which limits a ring meets and why it fails the others", () => {
    const [a, b] = checkComfort(SPEC, limits, 1.6);
    expect(a!.ok).toBe(true);
    expect(b!.ok).toBe(false);
    expect(b!.failures.join(" ")).toMatch(/rpm/);
  });
});
