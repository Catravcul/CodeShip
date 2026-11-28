import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { carpetRoute, Grid, obstaclesOf } from "@modules/sanctuary-one/data/alfombras";
import { buildTowers } from "@modules/sanctuary-one/data/layout";
import { TOWERS, WATER_Y } from "@modules/sanctuary-one/data/site";
import { CENTRE_FREE_M, GIANT, HOLLOW, HOLLOW_INSIDE, NAVE, TRAINING_TOWERS, ceilingAt, flightTouches, flightWorld, hollowPlan } from "./montana";
import { CORE_DEF, GATE_H_M, GATE_HALF_M, GATE_PASSAGE, LARGEST_S3_ANIMAL, gates } from "./bioma-island";
import { CAMPUS_IN_S1 } from "./campus";
import { NEEDED as S1_DOOR, PASSAGE } from "@modules/sanctuary-one/data/paso";
import { placeAt, step } from "../domain/walk";
import { shortestWay } from "../domain/route";
import { pupaSolid } from "./pupa-abeja";

for (const k of [1, 1.5]) {
  describe(`La nave dentro de la montaña a escala ${k} (montana-hueca.md)`, () => {
    const L = buildLayout(k);
    const plan = hollowPlan(L);

    it("es otra escena: más ancha que la montaña, excavada bajo el nivel del mar y lejos de todas las islas", () => {
      expect(2 * NAVE.half).toBeGreaterThan(2 * CORE_DEF.half);
      expect(NAVE.bottomY).toBeLessThan(0);
      const lake = L.world.waters.find((w) => w.id === "lago-montana")!;
      expect(lake.yTop).toBe(WATER_Y);
      expect(lake.yBottom).toBe(NAVE.bottomY);
      for (const i of L.islands) {
        if (i.id === "entrenamiento") continue;
        const d = Math.max(Math.max(i.rect.x0 - HOLLOW.x, HOLLOW.x - i.rect.x1, 0), Math.max(i.rect.z0 - HOLLOW.z, HOLLOW.z - i.rect.z1, 0));
        expect(d, i.id).toBeGreaterThan(NAVE.half + 2000);
      }
    });

    it("las compuertas dejan pasar al mayor animal con 2 m a cada lado y por encima, nunca menores que la puerta de un tronco del santuario 1", () => {
      expect(LARGEST_S3_ANIMAL.x).toBeGreaterThan(1);
      expect(2 * GATE_HALF_M).toBeGreaterThanOrEqual(LARGEST_S3_ANIMAL.x + 2 * PASSAGE.beside);
      expect(GATE_H_M).toBeGreaterThanOrEqual(LARGEST_S3_ANIMAL.y + PASSAGE.over);
      expect(GATE_PASSAGE.w).toBeGreaterThanOrEqual(S1_DOOR.w);
      expect(GATE_H_M).toBeGreaterThanOrEqual(S1_DOOR.h);
    });

    it("cada compuerta une su lado de fuera (en la cara sur) con su muelle de dentro, que tiene estación de alfombras", () => {
      expect(plan.gates.length).toBe(gates().length);
      for (const g of plan.gates) {
        const out = L.graph.points.find((p) => p.id === g.out.point)!;
        const inn = L.graph.points.find((p) => p.id === g.in.point)!;
        expect(out.gate).toBe(g.id);
        expect(inn.gate).toBe(g.id);
        expect(L.graph.links.some(([a, b]) => (a === out.id && b === inn.id) || (a === inn.id && b === out.id))).toBe(true);
        expect(Math.max(Math.abs(inn.x - HOLLOW.x), Math.abs(inn.z - HOLLOW.z))).toBeLessThan(NAVE.half);
        expect(Math.hypot(out.x - HOLLOW.x, out.z - HOLLOW.z)).toBeGreaterThan(5000);
        expect(plan.stations.some((s) => s.id === `entrenamiento:compuerta-${g.id}:muelle:alfombras` && s.reach === "santuario")).toBe(true);
      }
      // From the helipad outside, «Ir» reaches the hall through the south gate.
      const way = shortestWay(L.graph, L.start, plan.gates[0]!.in.point)!;
      expect(way.some((p) => p.gate === "sur")).toBe(true);
    });

    it("los edificios del santuario 1 están tal cual: los mismos pisos, a sus mismas distancias del centro", () => {
      const s1 = buildTowers(TOWERS, k);
      for (const t of TOWERS) {
        const here = plan.s1.towers.find((q) => q.id === t.id)!;
        const there = s1.towers.find((q) => q.id === t.id)!;
        expect(here.x - HOLLOW.x).toBeCloseTo(there.x, 6);
        expect(here.z - HOLLOW.z).toBeCloseTo(there.z, 6);
        expect(here.floors.length).toBe(there.floors.length);
        expect(here.rootHeight).toBeCloseTo(there.rootHeight, 6);
        expect(!!here.cima).toBe(!!there.cima);
      }
      expect(plan.s1.instances.length).toBeGreaterThan(1000);
    });

    it("todo cabe bajo el techo: cada edificio con aire encima, y el camino de las alfombras bajo el techo", () => {
      for (const t of plan.trees) expect(t.top + GIANT.headroom, t.def.id).toBeLessThan(ceilingAt(t.x, t.z));
      for (const s of plan.stations) expect(plan.sky + 4, s.id).toBeLessThan(ceilingAt(s.x, s.z));
    });

    it("los pisos de entrenamiento: cada sala en un piso de su edificio-árbol, con su edificio en Áreas", () => {
      for (const t of TRAINING_TOWERS)
        t.floors.forEach((rooms, i) => {
          const floor = L.areas.find((a) => a.id === `${t.id}:piso-${i + 1}`)!;
          expect(floor.tower?.id, `${t.id} piso ${i + 1}`).toBe(t.id);
          for (const r of rooms) {
            const a = L.areas.find((q) => q.id === `entrenamiento:${r}`)!;
            expect(a.tower?.id, r).toBe(t.id);
            expect(a.floorY, r).toBeCloseTo(floor.floorY!, 6);
          }
        });
    });

    it("los servicios del campus se hacen en los pisos del santuario 1 que los hacen: su máquina junto a su mueble", () => {
      for (const [room, cfg] of Object.entries(CAMPUS_IN_S1)) {
        const a = L.areas.find((q) => q.id === `entrenamiento:${room}`)!;
        expect(a, room).toBeDefined();
        expect(a.tower?.id, room).toBe(cfg.area.split(":")[0]);
        const ms = L.machines.filter((m) => m.area === a.id);
        expect(ms.length, room).toBeGreaterThan(0);
        for (const m of ms) if (m.kind === "cama" || m.kind === "comedor") expect(m.seat, m.id).toBeDefined();
      }
    });

    it("el centro de la nave queda libre para la pupa: ningún piso, tronco ni estación en su radio salvo la propia pupa", () => {
      const pupa = (area: string) => area === "entrenamiento:pupa" || area.startsWith("entrenamiento:pupa-");
      const near = (r: { x0: number; x1: number; z0: number; z1: number }) => Math.hypot(Math.max(r.x0 - HOLLOW.x, 0, HOLLOW.x - r.x1), Math.max(r.z0 - HOLLOW.z, 0, HOLLOW.z - r.z1)) < CENTRE_FREE_M;
      const inside = (y0: number, y1: number) => y1 > HOLLOW.lakeTop - 1 && y0 < HOLLOW_INSIDE.apexY;
      const huge = (r: { x0: number; x1: number }) => r.x1 - r.x0 > 2 * NAVE.half;
      expect(L.world.floors.filter((f) => inside(f.y, f.y) && near(f) && !pupa(f.area) && !huge(f)).map((f) => f.area)).toEqual([]);
      const cell = pupaSolid(plan.pupa);
      const isCell = (q: { x0: number; x1: number; z0: number; z1: number }) => q.x0 >= cell.x0 - 1e-6 && q.x1 <= cell.x1 + 1e-6 && q.z0 >= cell.z0 - 1e-6 && q.z1 <= cell.z1 + 1e-6;
      expect(L.world.solids.filter((q) => inside(q.y0, q.y1) && near(q) && !isCell(q) && !huge(q)).map((q) => JSON.stringify(q))).toEqual([]);
      for (const st of plan.stations) expect(Math.hypot(st.x - HOLLOW.x, st.z - HOLLOW.z), st.id).toBeGreaterThan(CENTRE_FREE_M);
    });

    it("las alfombras entre edificios (compuertas, pies, copas y Starship) llegan a cualquier estación en un solo vuelo; las de un piso, a las de su edificio", () => {
      const links = new Set(L.graph.links.map(([a, b]) => `${a}|${b}`));
      const linked = (a: string, b: string) => links.has(`${a}|${b}`) || links.has(`${b}|${a}`);
      for (const s of plan.stations)
        for (const t of plan.stations) {
          if (s === t) continue;
          const should = s.tower === t.tower || s.reach === "santuario" || t.reach === "santuario";
          expect(linked(s.point, t.point), `${s.id} → ${t.id}`).toBe(should);
        }
    });

    it("cada vuelo de alfombra va de una estación a otra sin tocar nada ni el techo", () => {
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
        const hit = flightTouches(g, carpetRoute(W, s, t, plan.sky), s, t);
        if (hit) bad.push(`${s.id} → ${t.id} en ${hit}`);
      }
      expect(flights).toBeGreaterThan(100);
      expect(bad).toEqual([]);
    }, 120_000);

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
