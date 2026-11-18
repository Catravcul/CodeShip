import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { stageFor, STAGED_POSTS } from "./stages";
import { READY_POSTS } from "../application/initiation";
import { stations } from "../application/stations";
import type { Solid } from "../domain/walk";

/** Does a body of radius r from y0 to y1 at (x, z) touch a solid? */
const inSolid = (solids: readonly Solid[], x: number, z: number, y0: number, y1: number, r = 0.22) => solids.find((s) => s.y1 > y0 && s.y0 < y1 && x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r);
const inside = (a: { centre: { x: number; z: number }; half: { x: number; z: number } }, x: number, z: number) => Math.abs(x - a.centre.x) < a.half.x - 0.3 && Math.abs(z - a.centre.z) < a.half.z - 0.3;

for (const k of [1, 1.5]) {
  describe(`Escenarios de los puestos a escala ${k} (§4.2: nada atraviesa nada)`, () => {
    const L = buildLayout(k);
    it("hay escenario para cada puesto con reto, y cada sitio de cada paso existe", () => {
      expect(STAGED_POSTS).toEqual(READY_POSTS);
      for (const st of stations()) {
        const stage = stageFor(L, st.post)!;
        for (const ex of st.beats) for (const b of ex) expect(stage.her[b.her] ?? (b.her === "largo" ? stage.lap?.from : undefined), `${st.post} ${b.her}`).toBeDefined();
      }
    });
    it("ella y quien da el reto están dentro de su sala y no dentro de una pared ni de un mueble", () => {
      for (const post of STAGED_POSTS) {
        const s = stageFor(L, post)!;
        const room = L.areas.find((a) => a.id === s.room)!;
        const spots = [...Object.entries(s.her), ["entrenador", s.trainer] as const, ...Object.entries(s.beside).map(([key, q]) => [`entrenador junto a ${key}`, q] as const), ...(s.lap ? [["largo-desde", s.lap.from] as const, ["largo-hasta", s.lap.to] as const] : [])];
        for (const [name, p] of spots) {
          expect(inside(room, p!.x, p!.z), `${post} ${name}`).toBe(true);
          // On a rig (the gondola, the plane's cabin) she rides it: its own body is not in anyone's way.
          if (s.mounted.includes(name as never)) continue;
          // Lying on the couch, seated on the couch's edge or in the raft, she rests on it: only the body above it counts.
          const above = name === "camilla-tumbada" ? p!.y + 0.05 : name === "camilla-sentada" ? 0.72 : p!.y + 0.1;
          const hit = inSolid(L.world.solids, p!.x, p!.z, above, p!.y + 1.5);
          expect(hit, `${post} ${name} en (${p!.x.toFixed(1)}, ${p!.z.toFixed(1)})`).toBeUndefined();
        }
      }
    });
    it("quien da el reto entra desde la puerta de la sala sin atravesar muebles ni paredes", () => {
      for (const post of STAGED_POSTS) {
        const s = stageFor(L, post)!;
        const door = L.graph.points.find((p) => p.id === s.door)!;
        const pts = [door, ...s.trainerVia, s.trainer];
        for (let i = 0; i + 1 < pts.length; i++) {
          const a = pts[i]!;
          const b = pts[i + 1]!;
          for (let t = 0; t <= 1; t += 0.02) {
            const x = a.x + (b.x - a.x) * t;
            const z = a.z + (b.z - a.z) * t;
            const y = Math.max(a.y, b.y);
            expect(inSolid(L.world.solids, x, z, y + 0.25, y + 1.5, 0.2), `${post}: tramo ${i} en (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeUndefined();
          }
        }
      }
    });

    it("los largos van por el agua de la piscina de supervivencia, a lo largo de 25 m", () => {
      const s = stageFor(L, 3)!;
      const lane = L.world.waters.find((w) => w.id === "supervivencia-piscina")!;
      for (const p of [s.lap!.from, s.lap!.to]) expect(p.x > lane.x0 && p.x < lane.x1 && p.z > lane.z0 && p.z < lane.z1).toBe(true);
      const pool = L.world.waters.find((w) => w.id === "nbl-piscina")!;
      expect(Math.abs(s.lap!.to.x - s.lap!.from.x)).toBeCloseTo(25 * k, 6);
      const bottom = stageFor(L, 7)!.her.fondo!;
      expect(bottom.y).toBeCloseTo(pool.yBottom + 0.05, 6);
      const mock = L.blocks.find((b) => b.look === "maqueta" && b.y0 < -10)!;
      expect(bottom.z < mock.z0 - 0.3 || bottom.z > mock.z1 + 0.3).toBe(true);
    });
  });
}
