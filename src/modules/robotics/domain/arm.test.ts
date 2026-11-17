import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Canadarm2 } from "./arm";
import { VisitingVehicle } from "./visiting-vehicle";
import { ManualCapture } from "./manual-capture";
import { CAPTURE, GRAPPLE_FIXTURES, MBS, RAIL, SSRMS } from "../data/robotics";

const spec = { lengthM: SSRMS.lengthM.value, maxPayloadKg: SSRMS.maxPayloadKg.value, rail: RAIL, mbsMPerMin: MBS.speedMPerMin.value };
const arm = () => new Canadarm2(spec, GRAPPLE_FIXTURES, "mbs-1");

describe("Canadarm2 (real rules)", () => {
  it("is 17,6 m with 7 joints, two LEEs and moves up to 116 t", () => {
    expect(SSRMS.lengthM.value).toBe(17.6);
    expect(SSRMS.joints.value).toBe(7);
    expect(SSRMS.lees.value).toBe(2);
    expect(SSRMS.maxPayloadKg.value).toBe(116000);
  });

  it("walks end over end only to a PDGF within reach, with nothing in its hand", () => {
    const a = arm();
    expect(a.walkTo("bishop")).toMatch(/PDGF/);
    expect(a.walkTo("mbs-3")).toBeUndefined();
    expect(a.base).toBe("mbs-3");
    const far = new Canadarm2(spec, [...GRAPPLE_FIXTURES, { id: "lejos", kind: "pdgf", at: new Vec3(40, 0, 0) }], "mbs-1");
    expect(far.walkTo("lejos")).toMatch(/No llega/);
    a.grab({ id: "dextre", massKg: 1662 }, a.where("mbs-1"));
    expect(a.walkTo("mbs-1")).toMatch(/suelta/);
  });

  it("rides the MBS along the rails at 1,5 m/min, only when based on it", () => {
    const a = arm();
    expect(a.rideTo(15)).toBeCloseTo(10);
    expect(a.where("mbs-3").x).toBeCloseTo(GRAPPLE_FIXTURES.find((f) => f.id === "mbs-3")!.at.x + 15);
    expect(a.rideTo(1000)).toBeGreaterThan(0);
    expect(a.mbsX).toBe(RAIL.maxX);
    const lab = new Canadarm2(spec, GRAPPLE_FIXTURES, "lab");
    expect(lab.rideTo(3)).toMatch(/MBS/);
  });

  it("grabs within reach and up to its payload", () => {
    const a = arm();
    expect(a.grab({ id: "pesado", massKg: 200000 }, a.basePoint)).toMatch(/116 t/);
    expect(a.grab({ id: "lejos", massKg: 10 }, a.basePoint.add(new Vec3(30, 0, 0)))).toMatch(/No llega/);
    expect(a.grab({ id: "cygnus", massKg: 7000 }, a.basePoint.add(new Vec3(0, -12, 0)))).toBeUndefined();
    expect(a.release()?.id).toBe("cygnus");
  });
});

describe("Capturing and berthing a cargo vehicle", () => {
  it("follows the real order: capture point, free drift, capture, first stage, second stage", () => {
    const v = new VisitingVehicle("cygnus", "Cygnus", 7000);
    expect(v.freeDrift()).toMatch(/no ha llegado/);
    expect(v.arrive()).toBeUndefined();
    expect(v.capture()).toMatch(/propulsores/);
    expect(v.freeDrift()).toBeUndefined();
    expect(v.firstStage("unity-nadir", true)).toMatch(/no la ha capturado/);
    expect(v.capture()).toBeUndefined();
    expect(v.secondStage()).toMatch(/pestillos/);
    expect(v.firstStage("unity-nadir", false)).toMatch(/ocupado/);
    expect(v.firstStage("unity-nadir", true)).toBeUndefined();
    expect(v.secondStage()).toBeUndefined();
    expect(v.phase).toBe("atracado");
    expect(v.cbm).toBe("unity-nadir");
  });

  it("holds at the 10 m capture point and closes with 4 latches and 16 bolts", () => {
    expect(CAPTURE.pointM.value).toBe(10);
    expect(CAPTURE.latches.value).toBe(4);
    expect(CAPTURE.bolts.value).toBe(16);
  });
});

describe("Manual capture with the hand controller", () => {
  const spec2 = { tipSpeedMs: SSRMS.tipSpeedMs.value, envelopeM: CAPTURE.envelopeM.value, closeSpeedMs: CAPTURE.closeSpeedMs.value, reachM: SSRMS.lengthM.value };
  it("flies the tip to the shaft and catches it only inside the envelope and slow", () => {
    const m = new ManualCapture(spec2, Vec3.ZERO, new Vec3(0, -5, 0), new Vec3(0, -8, 0), Vec3.ZERO);
    expect(m.close().ok).toBe(false);
    for (let i = 0; i < 2000 && m.distanceM > 0.05; i++) m.step(new Vec3(0, -Math.min(1, m.distanceM), 0), 0.1);
    m.step(new Vec3(0, -1, 0), 0.01);
    const fast = m.close();
    expect(fast.ok).toBe(false);
    if (!fast.ok) expect(fast.why).toMatch(/m\/s/);
    m.step(Vec3.ZERO, 0.1);
    expect(m.close().ok).toBe(true);
    expect(m.caught).toBe(true);
  });

  it("never goes past the arm's reach, and the vehicle drifts until caught", () => {
    const m = new ManualCapture(spec2, Vec3.ZERO, new Vec3(0, -5, 0), new Vec3(0, -30, 0), new Vec3(0.01, 0, 0));
    for (let i = 0; i < 1000; i++) m.step(new Vec3(0, -1, 0), 0.1);
    expect(m.tip.length()).toBeLessThanOrEqual(SSRMS.lengthM.value + 1e-9);
    expect(m.target.x).toBeGreaterThan(0.5);
  });
});
