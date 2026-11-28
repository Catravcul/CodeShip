import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { LANDING_LIMITS, landingFrame, landingReadout, safeSpeedMs, toLanding } from "./landing-frame";

const UP = new Vec3(0, 1, 0);
// Belly down: body +Y up, right +X, forward (−Z body) = −Z world.
const level = landingFrame(UP, Vec3.X, new Vec3(0, 0, -1), Vec3.Y);
const base = { frame: level, offset: new Vec3(0, 50, 0), velocity: Vec3.ZERO, clearanceM: 50, tiltDeg: 0, brakeMs2: 0.07, siteRadiusM: 5 };

describe("landing frame (VUE-06)", () => {
  it("VUE-06 lays the craft's right and forward flat on the ground, with Z the local vertical", () => {
    expect(toLanding(level, new Vec3(2, 3, -4))).toEqual(new Vec3(2, 4, 3));
    // Tilted 40° round its right axis: forward still lies flat and points the same way.
    const c = Math.cos(0.7);
    const s = Math.sin(0.7);
    const tilted = landingFrame(UP, Vec3.X, new Vec3(0, s, -c), new Vec3(0, c, s));
    expect(tilted.forward.z).toBeCloseTo(-1, 6);
    expect(tilted.right.x).toBeCloseTo(1, 6);
  });

  it("VUE-06 rolled on its side (right axis vertical) still gives a flat, right-handed frame", () => {
    const f = landingFrame(UP, Vec3.Y, new Vec3(0, 0, -1), new Vec3(-1, 0, 0));
    expect(f.right.dot(UP)).toBeCloseTo(0, 9);
    expect(f.forward.dot(UP)).toBeCloseTo(0, 9);
    expect(f.right.cross(f.forward).dot(UP)).toBeCloseTo(1, 9);
  });

  it("VUE-06 predicts the touchdown point from the drift and the descent rate", () => {
    const r = landingReadout({ ...base, offset: new Vec3(4, 20, 0), clearanceM: 20, velocity: new Vec3(0.1, -0.5, 0.2) });
    // 20 m at 0.5 m/s: 40 s; x 4 + 0.1·40 = 8; y (forward is −Z) 0 − 0.2·40 = −8.
    expect(r.touchdown!.inS).toBeCloseTo(40, 6);
    expect(r.touchdown!.x).toBeCloseTo(8, 6);
    expect(r.touchdown!.y).toBeCloseTo(-8, 6);
    expect(r.touchdown!.inSite).toBe(false);
    // Climbing: no prediction.
    expect(landingReadout({ ...base, velocity: new Vec3(0, 0.2, 0) }).touchdown).toBeUndefined();
  });
});

describe("landing readout colours (VUE-07)", () => {
  it("VUE-07 the safe descent rate shrinks to the 0,10 m/s touchdown limit at contact", () => {
    expect(safeSpeedMs(0.5, 0.07)).toBeCloseTo(LANDING_LIMITS.touchdownMs, 9);
    expect(safeSpeedMs(101, 0.07)).toBeCloseTo(0.1 + Math.sqrt(2 * 0.07 * 0.5 * 100), 9);
  });

  it("VUE-07 a slow upright touchdown is green; at the limit amber; over it red", () => {
    const at = (v: number, tilt = 0) => landingReadout({ ...base, clearanceM: 0.5, offset: new Vec3(0, 0.5, 0), velocity: new Vec3(0, -v, 0), tiltDeg: tilt });
    expect(at(0.05).verdict).toBe("ok");
    expect(at(0.09).verdict).toBe("warn");
    expect(at(0.15).verdict).toBe("bad");
    expect(at(0.05, 25).levels.tilt).toBe("warn");
    expect(at(0.05, 35).verdict).toBe("bad");
    expect(at(0.05, 15).levels.tilt).toBe("ok");
  });

  it("VUE-07 high up, a fast descent the RCS can still brake is fine; lateral drift counts too", () => {
    const high = (v: Vec3) => landingReadout({ ...base, clearanceM: 200, offset: new Vec3(0, 200, 0), velocity: v });
    expect(high(new Vec3(0, -1, 0)).levels.vz).toBe("ok");
    expect(high(new Vec3(0, -4, 0)).levels.vz).toBe("bad");
    expect(high(new Vec3(5, 0, 0)).levels.vh).toBe("bad");
    expect(high(Vec3.ZERO).verdict).toBe("ok");
  });

  it("VUE-07 the site is green inside its radius, amber when the touchdown lands in it, red far off", () => {
    expect(landingReadout({ ...base, offset: new Vec3(3, 50, 0) }).levels.site).toBe("ok");
    expect(landingReadout({ ...base, offset: new Vec3(30, 10, 0), clearanceM: 10, velocity: new Vec3(-0.3, -0.1, 0) }).levels.site).toBe("warn");
    expect(landingReadout({ ...base, offset: new Vec3(200, 10, 0), clearanceM: 10 }).levels.site).toBe("bad");
  });
});
