import { describe, expect, it } from "vitest";
import { boardHour, clockText, dayPart, leaveFor, nextChange, nextShift, trainerFor, whereAt } from "./roster";
import { TRAINERS } from "../data/trainers";
import { READY_POSTS } from "../application/initiation";

describe("la jornada de Cold Sanctuary (WorkRoster) y quién da cada reto", () => {
  it("entrenamiento 8–9 y 14–15, tareas 9–11, 12–14 y 15–16, comida 11–12, libre el resto", () => {
    expect([7.9, 8, 9, 10.99, 11, 12, 13.5, 14, 15, 16, 23].map(dayPart)).toEqual(["libre", "entrenamiento", "tareas", "tareas", "comida", "tareas", "tareas", "entrenamiento", "tareas", "libre", "libre"]);
  });

  it("de turno en su puesto; en el gimnasio al entrenar; en el cruce a comer y libre", () => {
    const lind = TRAINERS.find((t) => t.id === "linduarda")!;
    expect(whereAt(lind.shift, 9.5)).toEqual({ kind: "puesto", post: 2 });
    expect(whereAt(lind.shift, 12.5)).toEqual({ kind: "puesto", post: 4 });
    expect(whereAt(lind.shift, 15.5)).toEqual({ kind: "puesto", post: 2 });
    expect(whereAt(lind.shift, 8.5)).toEqual({ kind: "gimnasio" });
    expect(whereAt(lind.shift, 11.5)).toEqual({ kind: "cruce" });
  });

  it("en horas de tareas cada puesto listo tiene una sola persona de turno; fuera de ellas, nadie (el puesto espera)", () => {
    for (const h of [9.5, 12.5, 15.5])
      for (const post of READY_POSTS) {
        const on = TRAINERS.filter((t) => {
          const w = whereAt(t.shift, h);
          return w.kind === "puesto" && w.post === post;
        });
        expect(on.length, `${post} a las ${h}`).toBe(1);
      }
    expect(trainerFor(TRAINERS, 1, 9.5)).toBe("karen");
    expect(trainerFor(TRAINERS, 1, 13)).toBe("julian");
    expect(trainerFor(TRAINERS, 1, 11.5)).toBeUndefined();
    expect(trainerFor(TRAINERS, 6, 9.5)).toBe("ivelyna");
    expect(trainerFor(TRAINERS, 6, 12.5)).toBe("malena");
    expect(trainerFor(TRAINERS, 10, 9.5)).toBeUndefined();
  });

  it("sin turno, la tarjeta dice cuándo empieza el siguiente y con quién", () => {
    expect(nextChange(11.5)).toBe(12);
    expect(nextChange(16.5)).toBe(32);
    expect(nextShift(TRAINERS, 1, 11.5)).toEqual({ at: 12, id: "julian" });
    // After 16, tomorrow's first block of tasks (9:00), past the morning's training.
    expect(nextShift(TRAINERS, 6, 17)).toEqual({ at: 33, id: "ivelyna" });
    expect(nextShift(TRAINERS, 10, 9.5)).toBeUndefined();
  });

  it("quien entrena sale antes para llegar a su hora, sin andar más deprisa", () => {
    const lind = TRAINERS.find((t) => t.id === "linduarda")!.shift;
    const walk = () => 0.2;
    // At 10:50 the walk to the crossroads (0,2 h) fits no more in the 10 min left: she sets off.
    expect(leaveFor(lind, 10.5, { kind: "puesto", post: 2 }, walk)).toEqual({ kind: "puesto", post: 2 });
    expect(leaveFor(lind, 10.85, { kind: "puesto", post: 2 }, walk)).toEqual({ kind: "cruce" });
    // Once at her next place she stays there.
    expect(leaveFor(lind, 10.95, { kind: "cruce" }, () => 0)).toEqual({ kind: "cruce" });
    // Half an hour before the end of the block there is time yet; six minutes before, not.
    expect(leaveFor({ manana: 2 }, 15.5, undefined, walk)).toEqual({ kind: "puesto", post: 2 });
    expect(leaveFor({ manana: 2 }, 15.9, undefined, walk)).toEqual({ kind: "cruce" });
    // A post shift comes first: with 1,2 h to the crossroads and 1,2 h back, lunch (11–12) does not fit before the
    // 12:00 shift, so she stays at her post; if the 12:00 post is another one 2,3 h away, she sets off for it at 9:42.
    const far = (to: { kind: string }, from?: { kind: string }) => (from ? 1.2 : to.kind === "cruce" ? 1.2 : 2.3);
    expect(leaveFor({ manana: 8, mediodia: 8 }, 10.9, { kind: "puesto", post: 8 }, far)).toEqual({ kind: "puesto", post: 8 });
    expect(leaveFor({ manana: 8, mediodia: 9 }, 9.6, { kind: "puesto", post: 8 }, far)).toEqual({ kind: "puesto", post: 8 });
    expect(leaveFor({ manana: 8, mediodia: 9 }, 9.75, { kind: "puesto", post: 8 }, far)).toEqual({ kind: "puesto", post: 9 });
    // From her post she leaves at most a quarter of an hour early, however long the walk: the post comes first.
    expect(leaveFor({ manana: 1 }, 9, { kind: "puesto", post: 1 }, () => 2.5)).toEqual({ kind: "puesto", post: 1 });
    expect(leaveFor({ manana: 1 }, 10.8, { kind: "puesto", post: 1 }, () => 2.5)).toEqual({ kind: "cruce" });
    // On the glacier the camp is near: she goes to eat, setting off just in time.
    const near = () => 0.1;
    expect(leaveFor({ manana: 11, mediodia: 11 }, 10.95, { kind: "puesto", post: 11 }, near)).toEqual({ kind: "cruce" });
  });

  it("la partida empieza a las 9:00; un día de a bordo son 24 horas", () => {
    expect(boardHour(0)).toBe(9);
    expect(clockText(boardHour(0.5 / 24))).toBe("9:30");
    expect(boardHour(1)).toBe(9);
  });
});
