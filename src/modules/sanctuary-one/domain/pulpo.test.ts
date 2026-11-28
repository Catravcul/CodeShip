import { describe, expect, it } from "vitest";
import { ADULT_LENGTH, advance, EGG, LIFE, LIFE_SHARE, PULPO_SIZE, pulpoAt, pulpoBody, stageAt, STAGES } from "./pulpo";

describe("el huevo de pulpo se desarrolla hasta nacer (Berón 2026-11-24)", () => {
  it("pasa por sus estadios en orden, de la segmentación a la eclosión", () => {
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i]!.at).toBeGreaterThan(STAGES[i - 1]!.at);
    expect(stageAt(0).naef).toBe("I–VI");
    expect(stageAt(0.85).naef).toBe("XIX");
    expect(stageAt(1).label).toMatch(/Eclosión/);
  });
  it("la transición es fluida: un instante después nada cambia de golpe", () => {
    const keys = ["cap", "body", "mantle", "eyes", "eyeDark", "arms", "chromato", "yolk", "yolkW", "pole", "flip", "beat", "chorion", "grow", "splay", "armThick", "leave"] as const;
    for (let k = 0; k < 1 + LIFE_SHARE; k += 0.001) {
      const a = pulpoAt(k);
      const b = pulpoAt(k + 0.001);
      for (const key of keys) expect(Math.abs(b[key] - a[key]), `${key} at ${k.toFixed(3)}`).toBeLessThan(0.1);
    }
  });
  it("crece hasta la paralarva, gastando su vitelo, y cabe en el huevo hasta nacer", () => {
    expect(pulpoAt(0).body).toBe(0);
    expect(pulpoAt(1).body).toBeCloseTo(1, 2);
    expect(pulpoAt(0.5).yolk).toBeGreaterThan(pulpoAt(0.9).yolk);
    for (let k = 0; k <= 1; k += 0.05) expect(pulpoAt(k).body).toBeLessThanOrEqual(EGG.length);
    // Two inversions, half a turn each.
    expect(pulpoAt(0.5).pole).toBeCloseTo(Math.PI, 5);
    expect(pulpoAt(0.5).flip).toBe(0);
    expect(pulpoAt(1).flip).toBeCloseTo(Math.PI, 5);
  });
  it("el reloj sigue el ajuste y vuelve a empezar con un huevo nuevo", () => {
    let k = 0;
    for (let s = 0; s < 60; s++) k = advance(k, 1, 1);
    expect(k).toBeCloseTo(1, 5);
    // Then as long again growing up to the adult, and a new egg.
    for (let s = 0; s < 59; s++) k = advance(k, 1, 1);
    expect(k).toBeGreaterThan(1.9);
    for (let s = 0; s < 3; s++) k = advance(k, 1, 1);
    expect(k).toBeLessThan(0.1);
  });
  it("crece hasta el adulto, cuyos brazos abiertos miden el 66 % del globo (Berón 2026-11-28)", () => {
    const at = (k: number) => pulpoBody(pulpoAt(k)).span;
    // In hatchling lengths: the hatchling is a third of the globe, so the adult's span is 0,66 × 3 of them.
    expect(at(LIFE.grown)).toBeCloseTo(PULPO_SIZE.adultSpan / PULPO_SIZE.hatchling, 3);
    expect(pulpoAt(LIFE.grown).body).toBeCloseTo(ADULT_LENGTH, 5);
    // It grows by stages and never shrinks while it grows.
    for (let k = 1; k < LIFE.grown; k += 0.01) expect(at(k + 0.01)).toBeGreaterThanOrEqual(at(k) - 1e-9);
    expect(stageAt(1.2).label).toMatch(/Paralarva/);
    expect(stageAt(1.5).label).toMatch(/Asentamiento/);
    expect(stageAt(1.85).label).toMatch(/Adulto/);
    // The adult's proportions: arms ~4 times the mantle.
    const a = pulpoAt(1.85);
    expect(a.arms / a.mantle).toBeGreaterThan(3.5);
    expect(a.arms / a.mantle).toBeLessThan(4.5);
    // Then it leaves and a new egg is laid.
    expect(pulpoAt(1 + LIFE_SHARE).leave).toBe(1);
  });
});
