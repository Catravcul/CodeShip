import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { CEVIS_FIT, EXERCISE_MOTIONS, motionOf } from "../data/exercise-motions";
import { contactHeights } from "./body-solver";
import { MotionPlayer, motionPose } from "./exercise-motion";
import { CUBE_FIGURE, tipOf } from "./skeleton";
import { fromUnityPoint } from "./unity-axes";

const at = (device: "cinta" | "bicicleta" | "fuerza", phase: number) => motionPose(CUBE_FIGURE, motionOf(device), phase);

describe("Exercise motions on the skeleton (docs/design/equipos.md): each machine its own movement", () => {
  it("there is one motion per ISS machine, each with its source", () => {
    expect(EXERCISE_MOTIONS.map((m) => m.device).sort()).toEqual(["bicicleta", "cinta", "fuerza"]);
    for (const m of EXERCISE_MOTIONS) expect(m.source).toMatch(/https:\/\//);
  });

  it("running on the T2: the feet take turns ahead and a foot is always on the belt", () => {
    const a = at("cinta", 0).world;
    const b = at("cinta", 0.5).world;
    expect(a.FootLeft.p.z).toBeGreaterThan(a.FootRight.p.z);
    expect(b.FootRight.p.z).toBeGreaterThan(b.FootLeft.p.z);
    for (const ph of [0, 0.2, 0.4, 0.6, 0.8]) {
      const c = contactHeights(CUBE_FIGURE, at("cinta", ph).world);
      expect(Math.min(c.FootLeft, c.FootRight)).toBeLessThan(0.02);
    }
  });

  it("pedalling the CEVIS: each foot goes round the crank, half a turn from the other, the hands on the bars", () => {
    const axle = fromUnityPoint([0, CEVIS_FIT.axleY, CEVIS_FIT.axleZ]);
    for (const ph of [0, 0.125, 0.25, 0.5, 0.75]) {
      const w = at("bicicleta", ph).world;
      const l = w.FootLeft.p;
      const r = w.FootRight.p;
      expect(Math.hypot(l.y - axle.y, l.z - axle.z)).toBeCloseTo(CEVIS_FIT.crankM, 1);
      expect(Math.hypot(r.y - axle.y, r.z - axle.z)).toBeCloseTo(CEVIS_FIT.crankM, 1);
      // Opposite sides of the axle.
      expect(Math.hypot((l.y + r.y) / 2 - axle.y, (l.z + r.z) / 2 - axle.z)).toBeLessThan(0.03);
      expect(w.HandLeft.p.sub(fromUnityPoint([-CEVIS_FIT.barX, CEVIS_FIT.barY, CEVIS_FIT.barZ])).length()).toBeLessThan(0.05);
    }
    // At the top of the crank the foot is higher than a quarter turn later.
    expect(tipOf(CUBE_FIGURE, at("bicicleta", 0).world, "FootLeft").y).toBeGreaterThan(tipOf(CUBE_FIGURE, at("bicicleta", 0.25).world, "FootLeft").y);
  });

  it("a squat on the ARED: the hips drop at the bottom and the hands stay at the bar on her shoulders", () => {
    const top = at("fuerza", 0).world;
    const bottom = at("fuerza", 0.5).world;
    expect(top.Hips.p.y - bottom.Hips.p.y).toBeGreaterThan(0.25);
    for (const w of [top, bottom]) {
      expect(w.HandLeft.p.y).toBeGreaterThan(w.Chest.p.y);
      const c = contactHeights(CUBE_FIGURE, w);
      expect(Math.max(c.FootLeft, c.FootRight)).toBeLessThan(0.03);
    }
  });

  it("the three motions differ (no machine shares the running animation)", () => {
    const key = (d: "cinta" | "bicicleta" | "fuerza") => at(d, 0.3).world;
    const diff = (a: ReturnType<typeof key>, b: ReturnType<typeof key>) => a.FootLeft.p.sub(b.FootLeft.p).length() + a.HandLeft.p.sub(b.HandLeft.p).length();
    expect(diff(key("cinta"), key("bicicleta"))).toBeGreaterThan(0.2);
    expect(diff(key("cinta"), key("fuerza"))).toBeGreaterThan(0.2);
    expect(diff(key("bicicleta"), key("fuerza"))).toBeGreaterThan(0.2);
  });

  it("the player cycles smoothly at 60 fps and its phase drives the machine", () => {
    for (const m of EXERCISE_MOTIONS) {
      const p = new MotionPlayer(CUBE_FIGURE, m);
      let last = p.update(0).world;
      let maxStep = 0;
      for (let i = 0; i < 120; i++) {
        const w = p.update(1 / 60).world;
        for (const j of ["Head", "FootLeft", "HandRight"] as const) maxStep = Math.max(maxStep, w[j].p.sub(last[j].p).length());
        last = w;
      }
      expect(maxStep, m.id).toBeLessThan(0.12);
      expect(p.phase).toBeGreaterThanOrEqual(0);
      expect(p.phase).toBeLessThan(1);
    }
    void Vec3;
  });
});
