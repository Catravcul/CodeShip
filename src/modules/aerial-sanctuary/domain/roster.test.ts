import { describe, expect, it } from "vitest";
import { boardHour, clockText, dayPart, trainerFor, whereAt } from "./roster";
import { MAGNATE, TRAINERS } from "../data/trainers";
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

  it("en horas de tareas cada puesto listo tiene una sola persona de turno; fuera de ellas, la Magnate", () => {
    for (const h of [9.5, 12.5, 15.5])
      for (const post of READY_POSTS) {
        const on = TRAINERS.filter((t) => {
          const w = whereAt(t.shift, h);
          return w.kind === "puesto" && w.post === post;
        });
        expect(on.length, `${post} a las ${h}`).toBe(1);
      }
    expect(trainerFor(TRAINERS, 1, 9.5, MAGNATE.id)).toBe("karen");
    expect(trainerFor(TRAINERS, 1, 13, MAGNATE.id)).toBe("julian");
    expect(trainerFor(TRAINERS, 1, 11.5, MAGNATE.id)).toBe("magnate");
    expect(trainerFor(TRAINERS, 5, 9.5, MAGNATE.id)).toBe("magnate");
  });

  it("la partida empieza a las 9:00; un día de a bordo son 24 horas", () => {
    expect(boardHour(0)).toBe(9);
    expect(clockText(boardHour(0.5 / 24))).toBe("9:30");
    expect(boardHour(1)).toBe(9);
  });
});
