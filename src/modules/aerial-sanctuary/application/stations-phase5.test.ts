import { describe, expect, it } from "vitest";
import { buildLayout } from "../data/layout";
import { POSTS, READY_POSTS } from "./initiation";
import { minSec, phase5Stations, rampSeconds, wallSide } from "./stations-phase5";

const L = buildLayout(1);
const all = phase5Stations();
const byPost = (n: number) => all.find((s) => s.post === n)!;
const things = (n: number) => new Set(byPost(n).beats.flat().flatMap((b) => b.things.map((t) => t.thing)));

describe("Puestos 5, 6, 8, 9, 11 y 12: retos de la fase 5", () => {
  it("las cuentas de las preguntas salen de los números reales", () => {
    expect(rampSeconds(4, 0.1)).toBe(30);
    expect(rampSeconds(1, 0.1)).toBe(0);
    expect(minSec(31 * 20)).toBe("10 min 20 s");
    expect(wallSide("sur")).toBe("al sur");
    expect(wallSide("norte")).toBe("al norte");
    expect(wallSide("oeste")).toBe("al oeste");
  });

  it("uno por puesto, en la máquina del puesto, con sus fuentes", () => {
    expect(all.map((s) => s.post)).toEqual([5, 6, 8, 9, 11, 12]);
    for (const s of all) {
      expect(READY_POSTS).toContain(s.post);
      expect(POSTS.find((p) => p.n === s.post)!.machine).toBe(s.machine);
      expect(L.machines.find((m) => m.id === s.machine)?.post, s.machine).toBe(s.post);
      expect(s.sources.length, s.chore.id).toBeGreaterThan(0);
    }
  });

  it("cada paso tiene su tiempo: uno por bloque del orden y uno por pregunta", () => {
    for (const s of all) {
      expect(s.beats.length, s.chore.id).toBe(s.chore.exercises.length);
      s.chore.exercises.forEach((ex, i) => expect(s.beats[i]!.length, `${s.chore.id} ${ex.id}`).toBe(ex.kind === "order" ? ex.solution.length : 1));
    }
  });

  it("las respuestas buenas llevan los números reales", () => {
    const text = (n: number) => JSON.stringify(byPost(n).chore);
    expect(text(5)).toMatch(/30 s/);
    expect(text(6)).toMatch(/10 min 20 s/);
    expect(text(11)).toMatch(/210 m/);
    expect(text(12)).toMatch(/al sur/);
  });

  it("geología y frío se ven con sus objetos", () => {
    for (const t of ["moto-nieve", "meteorito", "gps", "etiqueta", "contador", "camara-foto", "libro", "pinzas", "bolsa", "cinta", "bandera"]) expect(things(11), t).toContain(t);
    for (const t of ["tienda-scott", "muro-nieve", "zanja-techo", "hornillo", "olla", "radio-hf", "antena"]) expect(things(12), t).toContain(t);
  });
});
