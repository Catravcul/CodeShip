import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { carpetRoute, Grid, obstaclesOf } from "@modules/sanctuary-one/data/alfombras";
import { GIANT, GIANT_TREES, HOLLOW, ceilingAt, flightTouches, flightWorld, hollowPlan } from "./montana";
import { caves } from "./bioma-island";
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
