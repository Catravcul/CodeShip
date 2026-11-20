import { describe, expect, it } from "vitest";
import { checkDeckOrder, deckGravityG, gravityRegime, missingRequirements, waterHandling, type SanctuaryArea } from "./area";

const base: SanctuaryArea = {
  id: "jardin",
  name: "Jardín del anillo",
  kind: "terrestre",
  host: "nodriza",
  gravityG: 1,
  light: "fotoperiodo",
  waterM3: 0,
  pressureKpa: 101.3,
  tempC: [18, 26],
  residents: [],
  support: [],
  requires: { areas: [], station: [] },
  hub: true,
};
const pond: SanctuaryArea = { ...base, id: "acuario", kind: "marino", hub: false, waterM3: 2, requires: { areas: [], station: [] } };
const sphere: SanctuaryArea = { ...pond, id: "esfera", host: "estacion", gravityG: 0, waterM3: 33.5, requires: { areas: ["acuario"], station: ["modulo-agricola"] } };

describe("requirements (Cold Sanctuary: never lose the origin, one tier after another)", () => {
  it("the hub needs nothing", () => {
    expect(missingRequirements(base, new Set())).toEqual([]);
  });

  it("every other area needs the hub first, even if it does not list it", () => {
    expect(missingRequirements(pond, new Set())).toEqual([{ kind: "area", id: "jardin-anillo" }]);
    expect(missingRequirements(pond, new Set(["jardin-anillo"]))).toEqual([]);
  });

  it("lists the missing areas and station pieces", () => {
    const missing = missingRequirements(sphere, new Set(["jardin-anillo"]));
    expect(missing).toEqual([
      { kind: "area", id: "acuario" },
      { kind: "station", id: "modulo-agricola" },
    ]);
    expect(missingRequirements(sphere, new Set(["jardin-anillo", "acuario", "modulo-agricola"]))).toEqual([]);
  });
});

describe("gravity regime", () => {
  it("0 g is weightlessness; any spin gravity is a ring", () => {
    expect(gravityRegime(0)).toBe("ingravidez");
    expect(gravityRegime(0.1)).toBe("anillo");
  });
});

describe("decks in a ring (Cold Sanctuary: the heavy goes below)", () => {
  it("each deck toward the axis has less gravity: a = ω²(R − h)", () => {
    expect(deckGravityG({ floorRadiusM: 56, deckHeightM: 7, rimG: 1 }, 0)).toBeCloseTo(1, 5);
    expect(deckGravityG({ floorRadiusM: 56, deckHeightM: 7, rimG: 1 }, 1)).toBeCloseTo(0.875, 5);
    expect(deckGravityG({ floorRadiusM: 56, deckHeightM: 7, rimG: 1 }, 8)).toBe(0);
  });

  it("water and soil go on the rim; a heavier deck above a lighter one is an error", () => {
    expect(checkDeckOrder([{ id: "acuario", loadKgM2: 1000 }, { id: "jardin", loadKgM2: 400 }, { id: "insectos", loadKgM2: 50 }])).toEqual([]);
    expect(checkDeckOrder([{ id: "jardin", loadKgM2: 400 }, { id: "acuario", loadKgM2: 1000 }])).toEqual([
      { deck: 1, id: "acuario", below: "jardin" },
    ]);
  });
});

describe("water handling (no buoyancy in 0 g)", () => {
  it("in a ring bubbles rise and can aerate; the biofilter still needs flow", () => {
    expect(waterHandling(pond)).toMatchObject({ aeration: "burbujas", forcedCirculation: true, bubbleTrap: false, containment: "superficie-libre" });
  });

  it("in 0 g there is no convection: membrane aeration, a bubble trap and a sealed volume", () => {
    expect(waterHandling(sphere)).toMatchObject({ aeration: "membrana", forcedCirculation: true, bubbleTrap: true, containment: "cerrado" });
  });

  it("a dry area needs none of it", () => {
    expect(waterHandling(base)).toBeNull();
  });
});
