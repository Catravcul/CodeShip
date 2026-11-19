import { describe, expect, it } from "vitest";
import { JUMP_V0_MS, GRAVITY_MS2 } from "./climb";
import { CROUCH_S, LAND_S, SPRINT_MS, jumpAt } from "./effort";

describe("correr y saltar a máximo esfuerzo (Berón 2026-11-19)", () => {
  it("el sprint es de una adulta activa a tope, no un trote", () => {
    expect(SPRINT_MS).toBeGreaterThanOrEqual(6);
    expect(SPRINT_MS).toBeLessThanOrEqual(7.5);
  });

  it("un salto: se agacha, despega, recoge las piernas arriba y amortigua al caer", () => {
    const flight = (2 * JUMP_V0_MS) / GRAVITY_MS2;
    expect(jumpAt(0.05, false)).toMatchObject({ stage: "agacharse", height: 0, done: false });
    expect(jumpAt(CROUCH_S + 0.05, false).stage).toBe("impulso");
    expect(jumpAt(CROUCH_S + flight / 2, false)).toMatchObject({ stage: "recoger" });
    expect(jumpAt(CROUCH_S + flight / 2, false).height).toBeCloseTo(0.5, 2);
    expect(jumpAt(CROUCH_S + flight + 0.05, false)).toMatchObject({ stage: "amortiguar", height: 0, done: false });
    expect(jumpAt(CROUCH_S + flight + LAND_S + 0.01, false).done).toBe(true);
  });

  it("corriendo apenas se agacha: despega en la zancada", () => {
    expect(jumpAt(0.05, true).stage).toBe("impulso");
  });
});
