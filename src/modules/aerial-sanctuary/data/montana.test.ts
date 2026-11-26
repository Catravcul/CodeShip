import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { carpetRoute, Grid, obstaclesOf } from "@modules/sanctuary-one/data/alfombras";
import { CENTRE_FREE_M, GIANT, GIANT_TREES, HOLLOW, HOLLOW_INSIDE, ceilingAt, flightTouches, flightWorld, hollowPlan } from "./montana";
import { CAVE_HALF_M, CAVE_PASSAGE, CAVE_VAULT_M, CORE_DEF, INNER_H, INNER_HALF, LARGEST_S3_ANIMAL, caves } from "./bioma-island";
import { NEEDED as S1_DOOR, PASSAGE } from "@modules/sanctuary-one/data/paso";
import { placeAt, step } from "../domain/walk";

for (const k of [1, 1.5]) {
  describe(`La montaña hueca a escala ${k} (montana-hueca.md)`, () => {
    const L = buildLayout(k);
    const plan = hollowPlan(L);

    it("su base es un lago de 4 m, y las cuevas quedan por encima del agua y terminan en una estación", () => {
      const lake = L.world.waters.find((w) => w.id === "lago-montana")!;
      expect(lake.yTop - lake.yBottom).toBe(4);
      for (const c of caves()) {
        expect(c.y).toBeGreaterThan(HOLLOW.lakeTop + 5);
        expect(plan.stations.some((s) => s.id === `entrenamiento:cueva-${c.id}:alfombras`)).toBe(true);
      }
    });

    it("la capa de tierra y piedra es delgada: el hueco casi llena la pirámide y las cuevas son cortas", () => {
      expect(CORE_DEF.cover).toBeLessThanOrEqual(5);
      expect(CORE_DEF.half - INNER_HALF).toBeLessThanOrEqual(3);
      expect(CORE_DEF.height - INNER_H).toBeLessThanOrEqual(6);
      for (const c of caves()) expect(c.to.z - c.from.z, c.id).toBeLessThan(50);
    });

    it("las cuevas dejan pasar al mayor animal del santuario con 2 m a cada lado y por encima, y nunca son menores que la puerta de un tronco del santuario 1", () => {
      expect(LARGEST_S3_ANIMAL.x).toBeGreaterThan(1);
      expect(2 * CAVE_HALF_M).toBeGreaterThanOrEqual(LARGEST_S3_ANIMAL.x + 2 * PASSAGE.beside);
      expect(CAVE_VAULT_M).toBeGreaterThanOrEqual(LARGEST_S3_ANIMAL.y + PASSAGE.over);
      expect(CAVE_PASSAGE.w).toBeGreaterThanOrEqual(S1_DOOR.w);
      expect(CAVE_VAULT_M).toBeGreaterThanOrEqual(S1_DOOR.h);
      // Each cave as built is that wide and high, and they fit side by side in the south face.
      const cs = caves();
      for (const c of cs) {
        expect(2 * c.half).toBeGreaterThanOrEqual(CAVE_PASSAGE.w);
        expect(c.vault).toBeGreaterThanOrEqual(CAVE_PASSAGE.h);
        const floor = L.world.floors.find((f) => f.area === `entrenamiento:cueva-${c.id}` && f.y === c.y)!;
        expect(floor.x1 - floor.x0).toBeGreaterThanOrEqual(CAVE_PASSAGE.w);
      }
      const xs = cs.map((c) => c.from.x).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThan(2 * CAVE_HALF_M + 10);
    });

    it("el centro del hueco queda libre para la pupa: ningún piso, tronco ni estación en su radio, del lago al techo", () => {
      const near = (r: { x0: number; x1: number; z0: number; z1: number }) => Math.hypot(Math.max(r.x0 - HOLLOW.x, 0, HOLLOW.x - r.x1), Math.max(r.z0 - HOLLOW.z, 0, HOLLOW.z - r.z1)) < CENTRE_FREE_M;
      const inside = (y0: number, y1: number) => y1 > HOLLOW.lakeTop - 1 && y0 < HOLLOW_INSIDE.apexY;
      expect(L.world.floors.filter((f) => inside(f.y, f.y) && near(f)).map((f) => f.area)).toEqual([]);
      expect(L.world.solids.filter((q) => inside(q.y0, q.y1) && near(q)).length).toBe(0);
      for (const st of plan.stations) expect(Math.hypot(st.x - HOLLOW.x, st.z - HOLLOW.z), st.id).toBeGreaterThan(CENTRE_FREE_M);
      expect(HOLLOW_INSIDE.ceilingAt(HOLLOW.x, HOLLOW.z)).toBeCloseTo(HOLLOW_INSIDE.apexY, 6);
    });

    it("cada árbol llega al techo y lo sostiene; ningún piso ni sala toca el techo", () => {
      for (const t of plan.trees) {
        expect(t.top).toBeCloseTo(ceilingAt(t.x, t.z), 6);
        for (const f of t.floors) {
          for (const [x, z] of [[f.slab.x0, f.slab.z0], [f.slab.x1, f.slab.z1], [f.slab.x0, f.slab.z1], [f.slab.x1, f.slab.z0]] as const) expect(ceilingAt(x, z), `${t.def.id} nivel ${f.level}`).toBeGreaterThan(f.top + GIANT.headroom);
        }
      }
    });

    it("las reglas de los pisos del santuario 1: dos por nivel en lados opuestos, cada nivel girado, 22 m entre niveles como poco, la cima sola arriba", () => {
      for (const t of plan.trees) {
        const levels = [...new Set(t.floors.map((f) => f.level))];
        for (const l of levels) {
          const here = t.floors.filter((f) => f.level === l);
          expect(here.length).toBeLessThanOrEqual(2);
          if (here.length === 2) expect(here[0]!.out.x + here[1]!.out.x === 0 && here[0]!.out.z + here[1]!.out.z === 0).toBe(true);
          if (here.some((f) => f.side === "cima")) expect(here.length).toBe(1);
          const below = t.floors.find((f) => f.level === l - 1);
          if (below) {
            expect(here[0]!.y - below.y).toBeGreaterThanOrEqual(GIANT.levelGap);
            if (here[0]!.side !== "cima" && below.side !== "cima") expect(Math.abs(here[0]!.out.x)).toBe(Math.abs(below.out.z));
          }
        }
      }
      expect(GIANT_TREES.flatMap((t) => [...t.floors.flat(), ...(t.cima ? [t.cima.room] : [])]).length).toBe(21);
    });

    it("cada vuelo de alfombra va de una estación a otra sin tocar nada", () => {
      const W = flightWorld(L);
      const g = new Grid(obstaclesOf(W));
      const byPoint = new Map(plan.stations.map((s) => [s.point, s]));
      const bad: string[] = [];
      let flights = 0;
      for (const [a, b] of L.graph.links) {
        const s = byPoint.get(a);
        const t = byPoint.get(b);
        if (!s || !t) continue;
        flights++;
        const pts = carpetRoute(W, s, t, plan.sky);
        const hit = flightTouches(g, pts, s, t);
        if (hit) bad.push(`${s.id} → ${t.id} en ${hit}`);
      }
      expect(flights).toBeGreaterThan(20);
      expect(bad).toEqual([]);
      // And by carpet alone, from the south cave, every station is reached (in one flight or a few).
      const seen = new Set([plan.stations.find((q) => q.id === "entrenamiento:cueva-sur:alfombras")!.point]);
      for (let more = true; more; ) {
        more = false;
        for (const [a, b] of L.graph.links)
          for (const [p, q] of [[a, b], [b, a]] as const)
            if (seen.has(p) && byPoint.has(q) && byPoint.has(p) && !seen.has(q)) {
              seen.add(q);
              more = true;
            }
      }
      expect(plan.stations.filter((q) => !seen.has(q.point)).map((q) => q.id)).toEqual([]);
    });

    it("se entra nadando al Starship inundado y se visita cada cubierta", () => {
      const gang = L.graph.points.find((p) => p.id === "entrenamiento:starship:pasarela:puerta")!;
      let b = placeAt(L.world, gang.x, gang.y, gang.z)!;
      expect(b.motion).toBe("gravedad");
      for (let i = 0; i < 40 && b.motion === "gravedad"; i++) b = step(L.world, b, { dx: 0, dz: 0.25 });
      expect(b.motion).toBe("agua");
      for (const d of ["cubierta-1", "cubierta-2", "cubierta-3"]) expect(L.areas.some((a) => a.id === `entrenamiento:starship:${d}`)).toBe(true);
    });
  });
}
