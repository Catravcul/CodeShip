import { describe, expect, it } from "vitest";
import { MAIN_ENGINE_PARTS, RCS_PARTS, TANK_PARTS } from "./parts";
import { PROPELLANT_DENSITY } from "./propellants";

describe("propulsion catalogue", () => {
  it("every engine and RCS thruster is a real model with a sheet and sources", () => {
    for (const p of [...MAIN_ENGINE_PARTS, ...RCS_PARTS]) {
      expect(p.model.sources.length, p.id).toBeGreaterThan(0);
      for (const s of p.model.sources) expect(s, p.id).toMatch(/^https:\/\//);
      expect(p.model.sheet, p.id).toBeDefined();
    }
    expect(RCS_PARTS.every((p) => p.model.thrustN < 200)).toBe(true);
  });

  it("every tank comes from real tanks: capacity from volume, density and fill; no tank weighs a fifth of its load", () => {
    for (const t of TANK_PARTS) {
      const b = t.spec.build!;
      expect(b.tank.source, t.id).toMatch(/^https:\/\//);
      expect(t.spec.capacityKg).toBe(Math.floor(((b.count * b.tank.volumeL) / 1000) * PROPELLANT_DENSITY[t.spec.propellant].value * b.fillFraction));
      expect(t.spec.dryMassKg / t.spec.capacityKg, t.id).toBeLessThan(0.2);
      // A pair is helium-fed; a monopropellant tank is blowdown.
      expect(!!b.pressurant, t.id).toBe(t.spec.propellant === "MMH/NTO");
    }
  });
});
