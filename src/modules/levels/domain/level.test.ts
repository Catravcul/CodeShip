import { describe, expect, it } from "vitest";
import { LEVELS } from "../data/levels";
import { levelChoices, parseSave, SOON } from "./level";

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

  it("only 6 can be played; 3 is being built, with what it will be; the rest come later", () => {
    const c = levelChoices(LEVELS);
    expect(c.filter((x) => x.selectable).map((x) => x.number)).toEqual([3, 6]);
    expect(c.filter((x) => !x.locked).map((x) => x.number)).toEqual([6]);
    expect(c.find((x) => x.number === 3)!.locked).toBe("En construcción: iniciación y entrenamiento de Doménica");
    for (const n of [1, 2, 4, 5]) expect(c.find((x) => x.number === n)!.locked).toBe(SOON);
    expect(c.every((x) => x.action === "Jugar")).toBe(true);
  });

  it("a kept game of a playable level turns its button into «Continuar»", () => {
    const save = parseSave(JSON.stringify({ level: 6, savedAt: "2026-11-18T09:00:00Z" }), LEVELS);
    expect(save).toEqual({ level: 6, savedAt: "2026-11-18T09:00:00Z" });
    const c = levelChoices(LEVELS, save);
    expect(c.find((x) => x.number === 6)!.action).toBe("Continuar");
    expect(c.filter((x) => x.action === "Continuar")).toHaveLength(1);
  });

  it("no game, a broken one or one of a level that cannot be played is no kept game", () => {
    expect(parseSave(null, LEVELS)).toBeUndefined();
    expect(parseSave("", LEVELS)).toBeUndefined();
    expect(parseSave("{roto", LEVELS)).toBeUndefined();
    expect(parseSave(JSON.stringify({ level: 6 }), LEVELS)).toBeUndefined();
    expect(parseSave(JSON.stringify({ level: 3, savedAt: "x" }), LEVELS)).toBeUndefined();
    expect(parseSave(JSON.stringify({ level: 9, savedAt: "x" }), LEVELS)).toBeUndefined();
  });
});
