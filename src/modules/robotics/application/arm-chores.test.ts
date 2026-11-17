import { describe, expect, it } from "vitest";
import { isCorrect } from "@modules/mind-duel/domain/exercise";
import { armChore, armMoves } from "./arm-chores";
import { ARM_PROCEDURES, type ArmProcedureId } from "../data/procedures";

const ids = Object.keys(ARM_PROCEDURES) as ArmProcedureId[];

describe("Arm procedures as code challenges", () => {
  it.each(ids)("%s: every step in order, the trap never in the solution, and a right option", (id) => {
    const c = armChore(id, { landerKg: 15100, rideM: 9 });
    expect(c.kind).toBe("brazo-robotico");
    const orders = c.exercises.filter((e) => e.kind === "order");
    const solved = orders.flatMap((e) => (e.kind === "order" ? e.solution : []));
    expect(solved).toEqual(ARM_PROCEDURES[id].steps.map((s) => s.id));
    for (const e of c.exercises) {
      if (e.kind === "order") {
        expect(e.solution).not.toContain("x");
        expect(e.blocks.length).toBeLessThanOrEqual(6);
        expect(isCorrect(e, { kind: "order", order: e.solution })).toBe(true);
      } else expect(e.options[e.correct]).toBeTruthy();
    }
  });

  it("the capture's question is NG-19's 2,5 h from grapple to bolts", () => {
    const q = armChore("captura").exercises[1]!;
    expect(q.kind === "choice" && q.options[q.correct]).toBe("12:22");
  });

  it("each placed block plays its arm move", () => {
    const c = armChore("captura");
    expect(armMoves(c, 0)).toEqual(["punto-captura", "deriva-libre", "acercar", "capturar"]);
    expect(armMoves(c, 1)).toEqual(["comprobar"]);
    expect(armMoves(c, 2)).toEqual(["llevar-cbm", "primera-etapa", "segunda-etapa", "soltar"]);
  });

  it("the MBS ride is distance over 1,5 m/min", () => {
    const q = armChore("dextre-camara", { rideM: 9 }).exercises[1]!;
    expect(q.kind === "choice" && q.options[q.correct]).toBe("6 min");
  });
});
