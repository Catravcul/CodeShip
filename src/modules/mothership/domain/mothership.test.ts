import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { NODRIZA, IDSS_CONTACT_LIMITS } from "../data/mothership";
import { Mothership } from "./mothership";
import { alignment, judgeContact } from "./docking";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";

const PROBE_PORT = new Vec3(0, 1.3, 0.6);
const make = (q = Quat.IDENTITY) => Mothership.withProbeDockedAt(NODRIZA, new Vec3(100, 50, 1000), q, PROBE_PORT);

describe("Mothership mass and propulsion", () => {
  const m = make();
  it("weighs hundreds of tonnes, as a 56 m ring with a farm deck must", () => {
    expect(m.dryMassKg).toBeGreaterThan(500e3);
    expect(m.dryMassKg).toBeLessThan(1000e3);
    for (const i of m.massBudget) expect(i.basis.length).toBeGreaterThan(0);
  });

  it("the twin ring balances the habitat ring: no net angular momentum", () => {
    expect(m.twinRingMassKg).toBe(m.habRingMassKg);
    expect(m.ringAngularMomentum).toBe(0);
  });

  it("18 X3 thrusters fit in the reactor's 2 MWe and give ~0.1 mm/s²", () => {
    expect(m.thrusterPowerKw).toBeLessThanOrEqual(NODRIZA.power.electricKw.value);
    expect(m.thrustN).toBeCloseTo(97.2, 1);
    expect(m.accelerationMs2).toBeGreaterThan(5e-5);
    expect(m.accelerationMs2).toBeLessThan(2e-4);
  });

  it("has km/s of delta-v, and a 1 km/s hop takes months of thrust", () => {
    expect(m.deltaV()).toBeGreaterThan(3000);
    expect(m.burnDays(1000)).toBeGreaterThan(60);
    expect(m.burnDays(1000)).toBeLessThan(150);
    const before = m.propellantKg;
    const copy = new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
    expect(copy.burn(1000)).toBe(true);
    expect(copy.propellantKg).toBeLessThan(before);
    expect(copy.burn(1e6)).toBe(false);
  });

  it("radiators reject the reactor's waste heat (Brayton at 33.7 %)", () => {
    expect(m.wasteHeatKw).toBeCloseTo(3935, -1);
    // ~1.4 kW per m² of radiator, plausible for ~400 K radiators.
    expect(m.wasteHeatKw / NODRIZA.power.radiatorAreaM2.value).toBeGreaterThan(1);
  });
});

describe("Mothership geometry", () => {
  it("a probe docked at its port sits where asked, aligned with it and within contact limits", () => {
    const q = Quat.fromAxisAngle(Vec3.Y, 0.7);
    const m = make(q);
    const pose = m.dockedPose(PROBE_PORT);
    expect(pose.position.sub(new Vec3(100, 50, 1000)).length()).toBeLessThan(1e-9);
    const a = alignment(pose, PROBE_PORT, m.port);
    expect(Math.abs(a.axialM)).toBeLessThan(1e-9);
    expect(a.misalignDeg).toBeLessThan(1e-3);
    expect(a.rollDeg).toBeLessThan(1e-3);
  });

  it("parks its distance above the target's surface", () => {
    const p = Mothership.parkingPoint(NODRIZA, { position: Vec3.ZERO, meanRadiusM: 245 }, new Vec3(0, 0, 5000));
    expect(p.z).toBeCloseTo(245 + NODRIZA.parkingDistanceM.value);
  });

  it("keeps the probe out of the structure but not out of the docking port", () => {
    const m = make();
    // Flying at the spine aft of the node, 5 m below it, moving up.
    const nearSpine = m.toWorld(new Vec3(0, -5, 20));
    const dv = m.keepOut(nearSpine, new Vec3(0, 1, 0));
    expect(dv.y).toBeLessThan(-0.9);
    // Into the habitat ring's rim.
    const nearRing = m.toWorld(new Vec3(0, -62, NODRIZA.layout.habRingZ));
    expect(m.keepOut(nearRing, new Vec3(0, 1, 0)).y).toBeLessThan(-0.9);
    // Under the port the docking contact takes over.
    const underPort = m.port.position.add(m.port.normal.scale(3));
    expect(m.keepOut(underPort, m.port.normal.scale(-0.07)).length()).toBe(0);
    // Far away: free.
    expect(m.keepOut(m.toWorld(new Vec3(0, -200, 0)), new Vec3(0, 1, 0)).length()).toBe(0);
  });
});

describe("Docking contact (IDSS limits)", () => {
  const m = make();
  const at = (closing: number, lateral = 0, tiltDeg = 0) => {
    const docked = m.dockedPose(PROBE_PORT);
    const q = docked.orientation.multiply(Quat.fromAxisAngle(Vec3.X, (tiltDeg * Math.PI) / 180));
    return new RigidBodyState(docked.position.add(new Vec3(lateral, 0, 0)), m.port.normal.scale(-closing), q, Vec3.ZERO);
  };

  it("uses the IDSS window: 0.05–0.10 m/s, 0.10 m, 4°", () => {
    expect(IDSS_CONTACT_LIMITS.closingMinMs).toBe(0.05);
    expect(IDSS_CONTACT_LIMITS.closingMaxMs).toBe(0.1);
    expect(IDSS_CONTACT_LIMITS.lateralMisalignM).toBe(0.1);
    expect(IDSS_CONTACT_LIMITS.angularMisalignDeg).toBe(4);
  });

  it("latches a gentle, centred contact", () => {
    expect(judgeContact(alignment(at(0.07), PROBE_PORT, m.port), IDSS_CONTACT_LIMITS).capture).toBe(true);
  });

  it("rejects contacts that are too fast, too slow, off-centre or tilted, saying why", () => {
    const why = (s: RigidBodyState) => judgeContact(alignment(s, PROBE_PORT, m.port), IDSS_CONTACT_LIMITS).failures.join(" ");
    expect(why(at(0.3))).toMatch(/rápido/);
    expect(why(at(0.02))).toMatch(/lento/);
    expect(why(at(0.07, 0.3))).toMatch(/desalineado/);
    expect(why(at(0.07, 0, 8))).toMatch(/inclinado/);
  });
});
