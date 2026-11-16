import { describe, expect, it } from "vitest";
import { BISHOP, BISHOP_PAYLOADS } from "../data/iss";
import { CargoAirlock, DEPLOY_STEPS } from "./cargo-airlock";

const bishop = () => new CargoAirlock(BISHOP_PAYLOADS, BISHOP.volumeM3);

describe("EST-41 the Bishop cargo airlock", () => {
  it("is the real Bishop: 1059 kg and 3,99 m³; Juventas is a 12 kg 6U cubesat", () => {
    expect(BISHOP.massKg).toBe(1059);
    expect(BISHOP.volumeM3).toBeCloseTo(3.99, 2);
    const j = BISHOP_PAYLOADS.find((p) => p.id === "juventas")!;
    expect(j.massKg).toBe(12);
    expect(j.volumeM3).toBeCloseTo(0.0085, 4);
    for (const p of BISHOP_PAYLOADS) expect(p.source).toMatch(/^https:\/\//);
  });

  it("stows, deploys and retrieves Juventas", () => {
    const b = bishop();
    expect(b.place("juventas")).toBe("almacen");
    expect(b.deploy()).toEqual({ why: expect.stringMatching(/vacía/) });
    expect(b.stow("juventas")).toBeUndefined();
    expect(b.stow("juventas")).toMatch(/Ya está/);
    expect(b.place("juventas")).toBe("bishop");
    const out = b.deploy();
    expect("released" in out && out.released.map((i) => i.id)).toEqual(["juventas"]);
    expect(b.place("juventas")).toBe("fuera");
    expect(b.trips).toBe(1);
    expect(b.stow("juventas")).toMatch(/fuera/);
    expect(b.retrieve("juventas")).toBeUndefined();
    expect(b.place("juventas")).toBe("almacen");
  });

  it("a trip out releases everything loaded, and nothing goes in that does not fit", () => {
    const b = bishop();
    b.stow("juventas");
    b.stow("cubesat-3u");
    expect(b.loadedM3).toBeLessThan(BISHOP.volumeM3);
    const out = b.deploy();
    expect("released" in out && out.released.length).toBe(2);
    const tiny = new CargoAirlock([{ id: "a", name: "A", massKg: 1, volumeM3: 0.6 }, { id: "b", name: "B", massKg: 1, volumeM3: 0.6 }], 1);
    expect(tiny.stow("a")).toBeUndefined();
    expect(tiny.stow("b")).toMatch(/No cabe/);
  });

  it("follows the real sequence: hatch shut, air back, bolts off, the arm out and back", () => {
    expect(DEPLOY_STEPS[0]).toMatch(/escotilla/);
    expect(DEPLOY_STEPS.some((s) => /Canadarm2 lleva/.test(s))).toBe(true);
    expect(DEPLOY_STEPS.at(-2)).toMatch(/vuelve a atracar/);
  });
});
