import { describe, expect, it } from "vitest";
import { acabada, avanzar, linea, START, type PasoHistoria } from "./historia";

const steps: PasoHistoria[] = [
  { id: "a", at: "puerta", text: "llega" },
  { id: "b", at: "patio", reto: "r1", text: "lucha" },
];

describe("a microcosm's story (historia.ts)", () => {
  it("a step with no challenge is done by arriving at its place", () => {
    expect(avanzar(steps, START, { kind: "llega", at: "otro" })).toEqual(START);
    expect(avanzar(steps, START, { kind: "llega", at: "puerta" }).step).toBe(1);
  });
  it("a step with a challenge needs her there and the challenge solved; a failure leaves it open", () => {
    let s = { step: 1, there: false };
    expect(avanzar(steps, s, { kind: "reto", id: "r1", ok: true })).toEqual(s);
    s = avanzar(steps, s, { kind: "llega", at: "patio" });
    expect(s.there).toBe(true);
    expect(avanzar(steps, s, { kind: "reto", id: "r1", ok: false })).toEqual(s);
    expect(avanzar(steps, s, { kind: "sale", at: "patio" }).there).toBe(false);
    s = avanzar(steps, s, { kind: "reto", id: "r1", ok: true });
    expect(acabada(steps, s)).toBe(true);
    expect(linea(steps, s)).toMatch(/completa/);
    expect(linea(steps, START)).toBe("Paso 1 de 2: llega");
  });
});
