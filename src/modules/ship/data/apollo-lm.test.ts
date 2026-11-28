import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Ship } from "../domain/ship";
import { LM, LM_ADAPTATIONS, LM_PROPELLANT_KG, lunarModuleDesign } from "./apollo-lm";

const lm = () => Ship.create(lunarModuleDesign());
const force = (s: Ship, translation: Vec3, rotation = Vec3.ZERO) => s.preview({ mainThrottle: 0, translation, rotation });

describe("VUE-10 the player's lander is the Apollo Lunar Module", () => {
  it("weighs the real 4280 kg dry plus our IDSS adapter, and carries the descent, ascent and RCS propellant", () => {
    const s = lm();
    expect(s.dryMassKg).toBeCloseTo(LM.dryKg.value + 340, 6);
    expect(LM_PROPELLANT_KG).toBe(8200 + 2353 + 287);
    // About the 15 200 kg it launched with (plus the adapter).
    expect(s.massKg).toBeGreaterThan(15000);
    expect(s.massKg).toBeLessThan(15600);
    for (const f of Object.values(LM)) expect(f.source).toMatch(/^https:\/\//);
  });

  it("its descent engine pushes up through the belly at 45 kN and cannot burn below 10 %", () => {
    const s = lm();
    expect(s.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.y).toBeCloseTo(45040, 0);
    // Any throttle lights it at its floor: 4,5 kN, 0,3 m/s², 50 000 times Bennu's pull. It lands on its RCS.
    const low = s.preview({ mainThrottle: 0.01, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.y;
    expect(low).toBeCloseTo(4504, 0);
    expect(low / s.massKg).toBeGreaterThan(0.25);
  });

  it("has 16 shared RCS jets of 440 N in four quads: 4 jets up, 2 across, and pure couples to turn", () => {
    const s = lm();
    expect(s.rcsCount).toBe(16);
    expect(s.design.rcs.every((t) => t.role === "shared")).toBe(true);
    const up = force(s, Vec3.Y);
    expect(up.forceBody.y).toBeCloseTo(4 * 440, 6);
    expect(up.torqueBody.length()).toBeLessThan(1e-6);
    const side = force(s, Vec3.X);
    expect(side.forceBody.x).toBeCloseTo(2 * 440, 6);
    expect(side.torqueBody.length()).toBeLessThan(1e-6);
    for (const axis of [Vec3.X, Vec3.Y, Vec3.Z]) {
      const turn = force(s, Vec3.ZERO, axis);
      expect(turn.forceBody.length(), `${axis.x}${axis.y}${axis.z}`).toBeLessThan(1e-6);
      expect(turn.torqueBody.dot(axis)).toBeGreaterThan(1000);
    }
    // ≈0,06 m/s² across with its propellant, the number the landing guidance plans with.
    expect(side.forceBody.x / s.massKg).toBeGreaterThan(0.05);
    expect(side.forceBody.x / s.massKg).toBeLessThan(0.07);
  });

  it("docks through an IDSS adapter on its roof, and every adaptation is labelled", () => {
    const d = lunarModuleDesign();
    expect(d.dockingPort!.y).toBeGreaterThan(d.hull.size.y / 2);
    expect(d.look).toBe("apollo-lm");
    expect(d.anchors).toBe(true);
    for (const a of LM_ADAPTATIONS) expect(["real", "licencia"]).toContain(a.reality);
    expect(LM_ADAPTATIONS.some((a) => a.reality === "licencia" && /IDSS/.test(a.what))).toBe(true);
  });
});
