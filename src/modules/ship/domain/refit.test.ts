import { describe, expect, it } from "vitest";
import { explorerDesign } from "../data/explorer";
import { MR104H, MR107T, R4D } from "../data/thrusters";
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
    expect(d.mainEngines[0]!.model).toBe(R4D);
  });

  it("lays the RCS out again with the new model, same count", () => {
    const out = withPart(explorerDesign(), "rcs", part(MR107T.id));
    expect(out.rcs).toHaveLength(24);
    expect(out.rcs.every((t) => t.model === MR107T)).toBe(true);
  });

  it("a tank only fits where a tank of the same propellant is", () => {
    const d = explorerDesign();
    const big = TANK_PARTS.find((t) => t.id === "tanque-mmh-300")!;
    expect(fits(d, "tanque-0", big)).toBe(true);
    expect(fits(d, "tanque-1", big)).toBe(false);
    expect(withPart(d, "tanque-0", big).tanks[0]!.spec.capacityKg).toBe(300);
    expect(() => withPart(d, "tanque-1", big)).toThrow();
  });

  it("a main engine is not an RCS thruster", () => {
    expect(fits(explorerDesign(), "rcs", part(R4D.id) as ThrusterPart)).toBe(false);
  });

  it("knows what is installed and offers the rest", () => {
    const d = explorerDesign();
    expect(installedId(d, "motor")).toBe(R4D.id);
    expect(installedId(d, "tanque-1", TANK_PARTS)).toBe("tanque-n2h4-40");
    expect(partOptions(d, "motor").map((p) => p.id)).toEqual([MR104H.id]);
    expect(partOptions(d, "rcs")).toHaveLength(2);
    expect(partOptions(d, "tanque-1").map((p) => p.id)).toEqual(["tanque-n2h4-80", "tanque-n2h4-120"]);
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
