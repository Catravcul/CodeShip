import { describe, expect, it } from "vitest";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { Mothership } from "../domain/mothership";
import { STARSHIP, STARSHIP_DRIVE } from "./starship";

const G0 = 9.80665;

describe("NAV-08 Starship as the mothership: Raptor vacuum engines, methane and oxygen", () => {
  const ship = new Mothership(STARSHIP, Vec3.ZERO, Quat.IDENTITY);

  it("has the published size and propellant: 9 m, ~50 m, 1500 t of oxygen and methane at O/F 3,6", () => {
    expect(STARSHIP.layout.spine.radiusM * 2).toBe(9);
    expect(STARSHIP.layout.lengthM).toBeGreaterThan(50);
    expect(STARSHIP.ring).toBeUndefined();
    expect(STARSHIP.propellantCapacityKg).toBe(1_500_000);
    expect(STARSHIP_DRIVE.oxygenKg.value + STARSHIP_DRIVE.methaneKg.value).toBe(STARSHIP.propellantCapacityKg);
    // The tanks' split (1170 / 330 t) is within 2 % of the engine's O/F 3,6.
    expect(Math.abs(STARSHIP_DRIVE.oxygenKg.value / STARSHIP_DRIVE.methaneKg.value / STARSHIP_DRIVE.mixtureRatio.value - 1)).toBeLessThan(0.02);
    expect(ship.propellantName).toBe("metano y oxígeno");
  });

  it("cruises on the three vacuum Raptors: 7,59 MN at Isp 380 s, no electric power", () => {
    const d = ship.drive;
    expect(d.firingUnits).toBe(3);
    expect(d.fittedUnits).toBe(6);
    expect(d.thrustN).toBeCloseTo(3 * 2_530_000, 0);
    expect(d.ispS).toBeCloseTo(380, 6);
    expect(d.powerKw).toBe(0);
  });

  it("Δv is Tsiolkovsky's with the full tanks over the dry mass, and the tanks split in the mixture ratio", () => {
    expect(ship.deltaV()).toBeCloseTo(380 * G0 * Math.log(ship.massKg / ship.dryMassKg), 3);
    // About 10 km/s with full tanks and no cargo (SpaceX gives ~6,9 km/s with 100 t of payload).
    expect(ship.deltaV()).toBeGreaterThan(9000);
    expect(ship.deltaV()).toBeLessThan(11000);
    const t = ship.tanks!;
    expect(t.oxygenKg + t.methaneKg).toBeCloseTo(ship.propellantKg, 3);
    expect(t.oxygenKg).toBeCloseTo(1_170_000, 0);
  });

  it("lists its engines in the mass budget and no ring, reactor or radiator", () => {
    const lines = ship.massBudget.map((l) => l.label).join(" · ");
    expect(lines).toMatch(/Motores/);
    expect(lines).not.toMatch(/[Aa]nillo|[Rr]eactor|[Rr]adiador/);
  });
});
