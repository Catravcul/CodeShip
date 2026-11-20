import { describe, expect, it } from "vitest";
import { LEVELS } from "../data/levels";
import { levelChoices, SOON } from "./level";

describe("the six levels of the start screen", () => {
  it("are the sanctuaries 1 to 6 in order, each with a name, a description and a source", () => {
    expect(LEVELS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(LEVELS.map((l) => l.id)).toEqual(["terrestre", "marino", "aereo", "subterraneo", "nucleo", "espacio"]);
    for (const l of LEVELS) {
      expect(l.name).toMatch(/^Santuario /);
      expect(l.desc.length).toBeGreaterThan(30);
      expect(l.source).toMatch(/docs\//);
      expect(l.reality).toBe("ficcion");
    }
  });

  it("sit on the «depth = danger» axis: the core lowest, then the rock, the sea, the land, the air and space on top", () => {
    const y = (id: string) => LEVELS.find((l) => l.id === id)!.at.y;
    expect(y("nucleo")).toBeLessThan(y("subterraneo"));
    expect(y("subterraneo")).toBeLessThan(y("marino"));
    expect(y("marino")).toBeLessThan(y("terrestre"));
    expect(y("terrestre")).toBe(0);
    expect(y("aereo")).toBeGreaterThan(y("terrestre"));
    expect(y("espacio")).toBeGreaterThan(y("aereo"));
  });

  it("1, 3 and 6 can be played; 1 and 3 say what is still being built; the rest come later", () => {
    const c = levelChoices(LEVELS);
    expect(c.filter((x) => x.selectable).map((x) => x.number)).toEqual([1, 3, 6]);
    expect(c.filter((x) => !x.locked).map((x) => x.number)).toEqual([1, 3, 6]);
    expect(LEVELS.find((l) => l.number === 3)!.desc).toMatch(/En construcción: los retos de los puestos de entrenamiento/);
    expect(LEVELS.find((l) => l.number === 1)!.desc).toMatch(/En construcción/);
    for (const n of [2, 4, 5]) expect(c.find((x) => x.number === n)!.locked).toBe(SOON);
    expect(c.every((x) => x.action === "Jugar")).toBe(true);
  });

  it("the level of the newest kept game says «Continuar», only that one", () => {
    for (const level of [3, 6]) {
      const c = levelChoices(LEVELS, { level });
      expect(c.find((x) => x.number === level)!.action).toBe("Continuar");
      expect(c.filter((x) => x.action === "Continuar")).toHaveLength(1);
    }
    expect(levelChoices(LEVELS, { level: 2 }).every((x) => x.action === "Jugar")).toBe(true);
  });
});
