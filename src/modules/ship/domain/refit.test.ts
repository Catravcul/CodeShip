import { describe, expect, it } from "vitest";
import { explorerDesign } from "../data/explorer";
import { HIPAT, HPGP22, MR104H, MR107T, R4D } from "../data/thrusters";
import { TANK_PARTS, partById, partOptions } from "../data/parts";
import { PROPELLANT_DENSITY, tankVolumeM3 } from "../data/propellants";
import { feeds, fits, installedId, withPart, type ThrusterPart } from "./refit";

const part = (id: string) => partById(id)!;

describe("refit", () => {
  it("swaps the main engine in place, keeping its mount", () => {
    const d = explorerDesign();
    const out = withPart(d, "motor", part(MR104H.id));
    expect(out.mainEngines[0]!.model).toBe(MR104H);
    expect(out.mainEngines[0]!.position).toEqual(d.mainEngines[0]!.position);
    expect(d.mainEngines[0]!.model).toBe(HIPAT);
  });

  it("lays the RCS out again with the new model, same count", () => {
    const out = withPart(explorerDesign(), "rcs", part(MR107T.id));
    expect(out.rcs).toHaveLength(24);
    expect(out.rcs.every((t) => t.model === MR107T)).toBe(true);
  });

  it("a tank only fits where a tank of the same feed system is", () => {
    const d = explorerDesign();
    const big = TANK_PARTS.find((t) => t.id === "par-mmh-ost25")!;
    expect(fits(d, "tanque-0", big)).toBe(true);
    expect(fits(d, "tanque-1", big)).toBe(false);
    expect(withPart(d, "tanque-0", big).tanks[0]!.spec.capacityKg).toBe(620);
    expect(() => withPart(d, "tanque-1", big)).toThrow();
    // Hydrazine and LMP-103S blowdown tanks share the diaphragm family: one swaps for the other.
    const green = TANK_PARTS.find((t) => t.id === "tanque-lmp-80498x4")!;
    expect(fits(d, "tanque-1", green)).toBe(true);
    expect(fits(d, "tanque-0", green)).toBe(false);
  });

  it("green RCS thrusters need a green tank: on hydrazine alone they have nothing to drink", () => {
    const d = withPart(explorerDesign(), "rcs", part(HPGP22.id));
    expect(feeds(d, "Hydrazine")).toBe(false);
    expect(feeds(withPart(d, "tanque-1", part("tanque-lmp-80498x4")), "LMP-103S")).toBe(true);
  });

  it("a main engine is not an RCS thruster", () => {
    expect(fits(explorerDesign(), "rcs", part(R4D.id) as ThrusterPart)).toBe(false);
  });

  it("knows what is installed and offers the rest", () => {
    const d = explorerDesign();
    expect(installedId(d, "motor")).toBe(HIPAT.id);
    expect(installedId(d, "tanque-0", TANK_PARTS)).toBe("par-mmh-80433");
    expect(installedId(d, "tanque-1", TANK_PARTS)).toBe("tanque-n2h4-80274");
    expect(partOptions(d, "motor").map((p) => p.id)).toContain(R4D.id);
    expect(partOptions(d, "motor").map((p) => p.id)).not.toContain(HIPAT.id);
    expect(partOptions(d, "rcs")).toHaveLength(6);
    expect(partOptions(d, "tanque-1").map((p) => p.id)).toEqual(["tanque-n2h4-80397", "tanque-n2h4-80428", "tanque-n2h4-80325", "tanque-n2h4-80407", "tanque-lmp-80498x2", "tanque-lmp-80498x4"]);
  });

  it("a hydrazine main engine leaves the MMH/NTO tank feeding nothing", () => {
    const d = withPart(explorerDesign(), "motor", part(MR104H.id));
    expect(feeds(d, "MMH/NTO")).toBe(false);
    expect(feeds(d, "Hydrazine")).toBe(true);
  });
});

describe("propellant density", () => {
  it("hydrazine at 1021 kg/m³ and the MMH/NTO mix between its two liquids", () => {
    expect(tankVolumeM3("Hydrazine", 1021)).toBeCloseTo(1);
    const mix = PROPELLANT_DENSITY["MMH/NTO"].value;
    expect(mix).toBeGreaterThan(875);
    expect(mix).toBeLessThan(1442.46);
  });
});
