import { describe, expect, it } from "vitest";
import { carrying, drop, hit, newWar, score, take, tick } from "./guerra-almohadas";

const T = ["rojo", "azul", "amarillo", "verde"];

describe("la guerra de almohadas (Berón 2026-11-24)", () => {
  it("cada equipo empieza con su tesoro en su castillo", () => {
    expect(score(newWar(T))).toEqual({ rojo: 1, azul: 1, amarillo: 1, verde: 1 });
  });
  it("se toma un tesoro ajeno, cuenta para quien lo lleva y al dejarlo en su castillo es suyo", () => {
    let w = take(newWar(T), "ana", "rojo", "azul");
    expect(carrying(w, "ana")?.id).toBe("azul");
    expect(score(w)).toMatchObject({ rojo: 2, azul: 0 });
    expect(take(w, "ana", "rojo", "verde")).toBe(w);
    w = drop(w, "ana", "rojo");
    expect(score(w)).toMatchObject({ rojo: 2, azul: 0 });
    expect(take(w, "bea", "rojo", "rojo")).toBe(w);
  });
  it("un almohadazo le hace soltarlo: en el ring no es de nadie y lo puede recoger otro", () => {
    let w = hit(take(newWar(T), "ana", "rojo", "azul"), "ana");
    expect(score(w)).toMatchObject({ rojo: 1, azul: 0 });
    w = take(w, "eli", "azul", "azul");
    expect(score(w).azul).toBe(1);
  });
  it("gana al momento quien tiene todos; si no, quien tenga más al acabar el tiempo, o empate", () => {
    let w = newWar(T, 60);
    for (const id of ["azul", "amarillo", "verde"]) w = drop(take(w, "ana", "rojo", id), "ana", "rojo");
    expect(w.winner).toBe("rojo");
    let v = drop(take(newWar(T, 60), "ana", "rojo", "azul"), "ana", "rojo");
    v = tick(v, 61);
    expect(v.winner).toBe("rojo");
    expect(tick(newWar(T, 10), 11).winner).toBe("empate");
  });
});
