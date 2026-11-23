import { describe, expect, it } from "vitest";
import { blocked, groundFloors } from "@modules/aerial-sanctuary/domain/walk";
import { academiaWorld, estaEn, K, ruta, zonaAt } from "./mundo";
import { AGUAS, ALTARES, CARRO, COSAS_FUERA, EDIFICIOS, FAMILIAS, HALF, HISTORIA, INSECT_SCALE, LUGARES, LUGARES_ABIERTOS, PERIBOLO, PERIBOLO_MUROS, PERSONAS, trees } from "../data/academia";
import { RETOS_ACADEMIA } from "../data/retos-academia";
import { JORNADA } from "../domain/vida";

const all = <T>(xs: readonly T[]) => xs;
const inside = (x: number, z: number) => Math.abs(x) <= HALF && Math.abs(z) <= HALF;

describe("Plato's Academy, the microcosm (data/academia.ts, application/mundo.ts)", () => {
  it("follows the microcosm rules: insect-humans at half size, the place at 1:1, a district of 300 × 300 m", () => {
    expect(INSECT_SCALE).toBe(0.5);
    expect(K).toBe(2);
    expect(HALF * 2).toBe(300);
  });
  it("every doorway is at least 1,2 m wide", () => {
    for (const m of [...EDIFICIOS.flatMap((b) => b.walls), ...PERIBOLO_MUROS]) for (const gp of m.gaps ?? []) expect(gp.to - gp.from, `${m.axis}@${m.at}`).toBeGreaterThanOrEqual(1.2 - 1e-9);
  });
  it("everything walkable is inside the district", () => {
    for (const b of EDIFICIOS) expect(inside(b.x0, b.z0) && inside(b.x1, b.z1), b.id).toBe(true);
    for (const c of [...ALTARES, ...COSAS_FUERA, ...EDIFICIOS.flatMap((b) => b.things)]) expect(inside(c.x, c.z), c.id).toBe(true);
    for (const t of trees()) expect(inside(t.x, t.z)).toBe(true);
    for (const l of LUGARES) expect(inside(l.x, l.z), l.id).toBe(true);
  });
  it("each building's things stand in it, clear of its walls' line", () => {
    for (const b of EDIFICIOS)
      for (const c of b.things) {
        expect(c.x - c.w / 2 >= b.x0 && c.x + c.w / 2 <= b.x1 && c.z - c.d / 2 >= b.z0 && c.z + c.d / 2 <= b.z1, c.id).toBe(true);
      }
  });
  it("every way between two places is clear of walls and things (people keep to doors and gates)", () => {
    const w = academiaWorld(false);
    for (const a of LUGARES)
      for (const b of LUGARES) {
        if (a === b) continue;
        const pts = ruta(a.id, b.id);
        for (let i = 1; i < pts.length; i++) {
          const [x0, z0] = pts[i - 1]!;
          const [x1, z1] = pts[i]!;
          const n = Math.ceil((Math.hypot(x1 - x0, z1 - z0) * K) / 0.25);
          for (let k = 0; k <= n; k++) {
            const x = (x0 + ((x1 - x0) * k) / n) * K;
            const z = (z0 + ((z1 - z0) * k) / n) * K;
            const y = Math.max(...groundFloors(w, x, z).map((f) => f.y), 0);
            expect(blocked(w, x, y + 0.01, z, 1.6), `${a.id}→${b.id} at (${(x / K).toFixed(1)}, ${(z / K).toFixed(1)})`).toBe(false);
          }
        }
      }
  });
  it("the place names find the rooms", () => {
    expect(zonaAt(-137.5, -16.5)).toBe("casa-cocina");
    expect(zonaAt(-20, -40)).toBe("palestra-patio");
    expect(zonaAt(0, 100)).toBe("dromos");
    expect(estaEn("exedra", 50, -56)).toBe(true);
  });
  it("has the basic needs inside: water, food, beds and somewhere to relieve oneself", () => {
    const kinds = new Set(EDIFICIOS.flatMap((b) => b.things.map((t) => t.kind)));
    for (const k of ["pozo", "hogar", "anforas", "cama", "pila"]) expect(kinds.has(k), k).toBe(true);
    expect(EDIFICIOS.flatMap((b) => b.things).some((t) => /orinal/i.test(t.label))).toBe(true);
    expect(AGUAS.some((a) => a.id === "fuente")).toBe(true);
  });
  it("has its landmark and a period transport that is used", () => {
    expect(ALTARES.find((a) => a.id === "altar-prometeo")?.fire).toBe(true);
    expect(Math.abs(CARRO.to.z - CARRO.from.z)).toBeGreaterThan(50);
    expect(LUGARES_ABIERTOS.find((l) => l.id === "dromos")!.x1 - LUGARES_ABIERTOS.find((l) => l.id === "dromos")!.x0).toBe(40);
  });
  it("every datum carries its source", () => {
    for (const x of all<{ fuente: { source: string } }>([...EDIFICIOS, ...LUGARES_ABIERTOS, ...ALTARES, ...AGUAS, ...PERSONAS, PERIBOLO])) expect(x.fuente.source.length).toBeGreaterThan(10);
    for (const r of Object.values(RETOS_ACADEMIA)) expect(r.source.length).toBeGreaterThan(10);
  });
  it("the story, the day and the people point at things that exist", () => {
    const ids = new Set(LUGARES.map((l) => l.id));
    const people = new Set(PERSONAS.map((p) => p.id));
    for (const s of HISTORIA) {
      expect(ids.has(s.at), s.at).toBe(true);
      if (s.reto) expect(RETOS_ACADEMIA[s.reto], s.reto).toBeDefined();
      if (s.with) expect(people.has(s.with), s.with).toBe(true);
    }
    for (const day of Object.values(JORNADA)) for (const t of day) expect(ids.has(t.at), t.at).toBe(true);
    expect(FAMILIAS.length).toBeGreaterThanOrEqual(10);
  });
});
