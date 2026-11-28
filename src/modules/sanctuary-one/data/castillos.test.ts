import { describe, expect, it } from "vitest";
import { ARENA_Y, CASTILLOS, CROWN, CROWN_AREA_M2, arenaRects, castleAt, type Deck } from "./castillos";
import { STEP_M } from "@modules/aerial-sanctuary/domain/walk";
import { LADDER_MAX_M } from "../domain/climb";
import { TOWERS, REORGANIZACION } from "./site";
import { FLOOR_PLANS } from "./floors";

type R = { x0: number; x1: number; z0: number; z1: number };
const touch = (a: R, b: R, m = 0.05) => a.x0 <= b.x1 + m && b.x0 <= a.x1 + m && a.z0 <= b.z1 + m && b.z0 <= a.z1 + m;

describe("los castillos de la cima de la Residencia (Berón 2026-11-24)", () => {
  it("las reglas deciden: la Residencia sube a una cima gigante, queda sola con ella y la cede a Ciencias", () => {
    expect(TOWERS.map((t) => t.id)).not.toContain("residencia");
    expect(TOWERS.find((t) => t.cima)?.id).toBe("ciencias");
    expect(TOWERS.find((t) => t.cima)?.cima?.furnish).toBe("residencia-cima");
    expect(REORGANIZACION).toHaveLength(2);
    expect(CROWN_AREA_M2).toBeGreaterThan(40 * 40 * 6);
  });

  it("cuatro castillos, uno por equipo, con los 30 aposentos y un tesoro cada uno", () => {
    expect(CASTILLOS.map((c) => c.team)).toEqual(["rojo", "azul", "amarillo", "verde"]);
    expect(CASTILLOS.flatMap((c) => c.rooms)).toHaveLength(30);
    for (const c of CASTILLOS) expect(castleAt(c.treasure.x, c.treasure.z)).toBe(c);
    expect(FLOOR_PLANS.get("residencia-cima")!.items.filter((i) => i.model.startsWith("res-habitacion"))).toHaveLength(30);
  });

  it("de cada castillo se sube desde el suelo a la torre por más de un camino (escaleras, redes, puentes)", () => {
    for (const c of CASTILLOS) {
      const ground: Deck = { x0: -CROWN.half, x1: CROWN.half, z0: -CROWN.half, z1: CROWN.half, y: 0, kind: "cubierta" };
      const all = [ground, ...c.decks];
      const linked = (a: Deck, b: Deck) => {
        const [lo, hi] = a.y <= b.y ? [a, b] : [b, a];
        if (hi.y - lo.y <= STEP_M + 1e-6 && touch(lo, hi)) return true;
        return !!hi.ladder && hi.y - lo.y <= LADDER_MAX_M + 1e-6 && touch(lo, hi.ladder);
      };
      const ways = (cut?: Deck) => {
        const seen = new Set<Deck>([ground]);
        const todo = [ground];
        while (todo.length) {
          const d = todo.pop()!;
          for (const e of all) if (e !== cut && !seen.has(e) && linked(d, e)) (seen.add(e), todo.push(e));
        }
        return seen;
      };
      const tower = c.decks.find((d) => d.kind === "torre")!;
      expect(ways().has(tower), c.name).toBe(true);
      // Every deck level has more than one way up: no single step whose loss cuts the top deck off.
      const top = c.decks.find((d) => d.y === Math.max(...c.decks.filter((q) => q.kind === "cubierta").map((q) => q.y)) && d.kind === "cubierta")!;
      for (const d of c.decks.filter((q) => q.kind === "escalon" && q.y < top.y - 0.1)) expect(ways(d).has(top), `${c.name} sin ${d.y.toFixed(2)}`).toBe(true);
    }
  });

  it("sus toboganes bajan de un piso alto y desembocan a orillas del ring de almohadas", () => {
    const ring = arenaRects();
    for (const c of CASTILLOS) {
      expect(c.slides.length).toBeGreaterThanOrEqual(2);
      for (const s of c.slides) {
        const end = s[s.length - 1]!;
        expect(ring.some((r) => end.x >= r.x0 && end.x <= r.x1 && end.z >= r.z0 && end.z <= r.z1), c.name).toBe(true);
        expect(end.y).toBeLessThanOrEqual(ARENA_Y + 0.8);
        expect(s[0]!.y).toBeGreaterThan(4);
        for (let i = 1; i < s.length; i++) expect(s[i]!.y).toBeLessThanOrEqual(s[i - 1]!.y + 1e-6);
      }
    }
  });
});
