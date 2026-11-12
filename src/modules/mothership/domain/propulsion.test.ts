import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { G0 } from "@core/units";
import { NODRIZA, THRUSTER_MOUNTS } from "../data/mothership";
import { AEPS, ELECTRIC_THRUSTERS, NEXT_C, VX200, X3 } from "../data/thrusters";
import { Mothership } from "./mothership";
import { drivePlan, fitProblem, maxPerMount } from "./propulsion";

const fresh = () => new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);
const DORSAL = THRUSTER_MOUNTS[0]!;

describe("thruster catalog", () => {
  it("every thruster carries a source, a positive operating point and a propellant", () => {
    for (const t of ELECTRIC_THRUSTERS) {
      expect(t.sources.length, t.id).toBeGreaterThan(0);
      for (const s of t.sources) expect(s).toMatch(/https:\/\//);
      expect(t.thrustN * t.ispS * t.powerKw * t.thrusterMassKg * t.diameterM).toBeGreaterThan(0);
      expect(t.propellants.length).toBeGreaterThan(0);
    }
  });

  it("jet power never exceeds the electric power (efficiency F·g₀·Isp / 2P below 1)", () => {
    for (const t of ELECTRIC_THRUSTERS) {
      const eff = (t.thrustN * G0 * t.ispS) / 2 / (t.powerKw * 1000);
      expect(eff, t.id).toBeGreaterThan(0.4);
      expect(eff, t.id).toBeLessThan(0.8);
    }
  });

  it("only VASIMR is experimental, and it runs on argon, not xenon", () => {
    expect(ELECTRIC_THRUSTERS.filter((t) => t.experimental)).toEqual([VX200]);
    expect(VX200.propellants).not.toContain("xenon");
    expect(X3.propellants).toContain("kripton");
  });
});

describe("mounts", () => {
  it("fit more small heads than big ones", () => {
    expect(maxPerMount(DORSAL, X3)).toBe(21);
    expect(maxPerMount(DORSAL, AEPS)).toBeGreaterThan(maxPerMount(DORSAL, X3));
    expect(maxPerMount(DORSAL, NEXT_C)).toBeGreaterThan(maxPerMount(DORSAL, X3));
  });

  it("refuse thrusters that cannot use the propellant on board, too many units or odd counts", () => {
    expect(fitProblem(DORSAL, VX200, 1, "xenon")).toEqual({ kind: "propelente", needs: ["argon"] });
    expect(fitProblem(DORSAL, VX200, 1, "argon")).toBeUndefined();
    expect(fitProblem(DORSAL, X3, 22, "xenon")).toEqual({ kind: "no-cabe", max: 21 });
    expect(fitProblem(DORSAL, X3, -1, "xenon")).toEqual({ kind: "cantidad" });
    expect(fitProblem(DORSAL, X3, 0, "xenon")).toBeUndefined();
  });
});

describe("drive derived from the fitted parts", () => {
  it("the starting fit is 2 × 9 X3: 97.2 N at 1782 kW, Isp 2250 s", () => {
    const m = fresh();
    expect(m.thrusterCount).toBe(18);
    expect(m.thrustN).toBeCloseTo(97.2, 6);
    expect(m.thrusterPowerKw).toBeCloseTo(1782, 6);
    expect(m.drive.ispS).toBeCloseTo(2250, 6);
    expect(m.massBudget.find((i) => i.id === "propulsores")!.kg).toBe(18 * 380);
  });

  it("the reactor limits how many fire: 2 × 21 X3 still give 18 firing units", () => {
    const m = fresh();
    m.refit("dorsal", X3, 21);
    m.refit("ventral", X3, 21);
    expect(m.availableThrusterKw).toBe(1800);
    expect(m.drive.fittedUnits).toBe(42);
    expect(m.thrusterCount).toBe(18);
    expect(m.thrusterPowerKw).toBeLessThanOrEqual(m.availableThrusterKw);
    expect(m.thrustN).toBeCloseTo(18 * 5.4, 6);
    // Balanced: the reactor feeds both pods alike.
    expect(m.drive.mounts.map((x) => x.firing)).toEqual([9, 9]);
    // The idle units are dead mass: more mass, same thrust, less acceleration and Δv.
    expect(m.accelerationMs2).toBeLessThan(fresh().accelerationMs2);
    expect(m.deltaV()).toBeLessThan(fresh().deltaV());
  });

  it("never draws more than the reactor gives, whatever the mix", () => {
    for (const t of ELECTRIC_THRUSTERS.filter((x) => x.propellants.includes("xenon"))) {
      const p = drivePlan(
        THRUSTER_MOUNTS.map((mt) => ({ mountId: mt.id, thruster: t, count: maxPerMount(mt, t) })),
        1800,
        "xenon",
      );
      expect(p.powerKw, t.id).toBeLessThanOrEqual(1800);
    }
  });

  it("AEPS trade thrust for Isp: less thrust per kW, more Δv per kilo of xenon", () => {
    const m = fresh();
    const n = maxPerMount(DORSAL, AEPS);
    m.refit("dorsal", AEPS, n);
    m.refit("ventral", AEPS, n);
    expect(m.thrusterCount).toBe(2 * n);
    expect(m.thrustN).toBeCloseTo(2 * n * 0.589, 6);
    expect(m.drive.ispS).toBeCloseTo(2800, 6);
    expect(m.thrustN).toBeLessThan(fresh().thrustN);
    expect(m.deltaV()).toBeGreaterThan(fresh().deltaV());
  });

  it("mixing types gives the flow-weighted Isp; burn time and xenon follow from thrust and flow", () => {
    const m = fresh();
    m.refit("ventral", NEXT_C, 10);
    const f = 9 * 5.4 + 10 * 0.235;
    const mdot = (9 * 5.4) / (2250 * G0) + (10 * 0.235) / (4155 * G0);
    expect(m.thrustN).toBeCloseTo(f, 6);
    expect(m.drive.ispS).toBeCloseTo(f / (G0 * mdot), 6);
    const kg = m.propellantFor(500);
    expect(m.burnDays(500)).toBeCloseTo(kg / mdot / 86400, 6);
  });

  it("with no thruster that can fire there is no Δv, and a burn is refused", () => {
    const m = fresh();
    m.refit("dorsal", X3, 0);
    m.refit("ventral", X3, 0);
    expect(m.thrustN).toBe(0);
    expect(m.deltaV()).toBe(0);
    expect(m.burnDays(10)).toBe(Infinity);
    expect(m.burn(10)).toBe(false);
  });

  it("refit refuses what the domain forbids and returns what was there", () => {
    const m = fresh();
    expect(() => m.refit("dorsal", VX200, 1)).toThrow();
    expect(() => m.refit("popa", X3, 1)).toThrow();
    expect(() => m.refit("dorsal", X3, 22)).toThrow();
    expect(m.refit("dorsal", AEPS, 4)).toEqual({ mountId: "dorsal", thruster: X3, count: 9 });
    expect(m.fitOf("dorsal")).toEqual({ mountId: "dorsal", thruster: AEPS, count: 4 });
    expect(m.fitOf("ventral")!.count).toBe(9);
  });
});
