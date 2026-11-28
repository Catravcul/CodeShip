import { describe, expect, it } from "vitest";
import { buildLayout } from "./layout";
import { HOLLOW, ceilingAt } from "./montana";
import { CELL } from "../domain/abeja";
import { PUPA_AREA, PUPA_POINT, PUPA_RULES, hollowObstacles, pupaOfArea, pupaPlan, pupaSolid } from "./pupa-abeja";
import { placeAt, step, type Body, type WalkWorld } from "../domain/walk";
import { shortestWay } from "../domain/route";

function walk(w: WalkWorld, from: Body, to: { x: number; z: number }): Body {
  let b = from;
  for (let i = 0; i < 4000; i++) {
    const d = Math.hypot(to.x - b.x, to.z - b.z);
    if (d < 0.05) break;
    const s = Math.min(0.25, d) / d;
    const next = step(w, b, { dx: (to.x - b.x) * s, dz: (to.z - b.z) * s });
    if (next === b) break;
    b = next;
  }
  return b;
}

const L = buildLayout(1.5);
const area = L.areas.find((a) => a.id === PUPA_AREA)!;
const p = pupaOfArea(area);

describe("la pupa de la abeja en el centro de la pirámide (pupa-abeja.md)", () => {
  it("está en el centro del hueco y sus proporciones son las de una celda de obrera", () => {
    expect(p.x).toBeCloseTo(HOLLOW.x, 6);
    expect(p.z).toBeCloseTo(HOLLOW.z, 6);
    expect(p.r).toBeGreaterThanOrEqual(PUPA_RULES.minR);
    expect(p.h / p.beeLength).toBeCloseTo(CELL.depth, 5);
    expect((Math.sqrt(3) * p.r) / p.beeLength).toBeCloseTo(CELL.width, 5);
    expect(p.y0 + p.h).toBeLessThan(ceilingAt(p.x, p.z) - PUPA_RULES.headroom + 0.01);
  });

  it("no toca nada del campus: pisos, troncos, pies, el Starship (los árboles la rodean)", () => {
    const s = pupaSolid(p);
    const g = p.gallery;
    const others = L.world.floors.filter((f) => f.area !== PUPA_AREA && f.area !== "entrenamiento:lago");
    for (const f of others) {
      const inside = f.x0 < g.x1 && f.x1 > g.x0 && f.z0 < g.z1 && f.z1 > g.z0 && f.y < s.y1 + 3;
      expect(inside, f.id).toBe(false);
    }
    // Every tree stands round it, farther than its gallery.
    for (const t of L.hollow.trees) expect(Math.hypot(t.x - p.x, t.z - p.z), t.def.id).toBeGreaterThan(g.x1 - p.x);
  });

  it("se llega andando por el muelle desde el pie del árbol más cercano, y el «Ir» de Áreas la encuentra", () => {
    const pier = L.walkChecks.find((c) => c.id.startsWith("La pupa"))!;
    let b = placeAt(L.world, pier.pts[0]!.x, pier.pts[0]!.y, pier.pts[0]!.z)!;
    expect(b).toBeDefined();
    for (const q of pier.pts.slice(1)) b = walk(L.world, b, q);
    expect(b.area).toBe(PUPA_AREA);
    // From the first tree's foot (the carpets' station there), the way graph reaches the lookout.
    const from = L.hollow.stations.find((s) => s.kind === "pie" && s.tower.startsWith("arbol-"))!;
    expect(shortestWay(L.graph, from.point, PUPA_POINT)).toBeDefined();
    expect(area.point).toBe(PUPA_POINT);
  });

  it("el camino del grafo desde la estación del pie de su árbol hasta el mirador se anda entero sin caer al lago", () => {
    const deck = L.graph.points.find((q) => q.id.startsWith(`${PUPA_AREA}:muelle`) && L.graph.links.some(([a, c]) => (a === q.id || c === q.id) && /:pie:anillo-/.test(a + c)))!;
    const foot = L.areas.find((a) => L.graph.links.some(([x, y]) => (x === deck.id && y.startsWith(`${a.id}:anillo-`)) || (y === deck.id && x.startsWith(`${a.id}:anillo-`))))!;
    const way = shortestWay(L.graph, foot.point, PUPA_POINT)!;
    expect(way.length).toBeGreaterThan(2);
    let b = placeAt(L.world, way[0]!.x, way[0]!.y, way[0]!.z)!;
    for (const q of way.slice(1)) {
      b = walk(L.world, b, q);
      expect(b.motion, q.id).not.toBe("agua");
      expect(Math.hypot(b.x - q.x, b.z - q.z), q.id).toBeLessThan(0.3);
    }
    expect(b.area).toBe(PUPA_AREA);
  });

  it("su tamaño sale del sitio que deja el campus, no de números fijos", () => {
    const narrow = pupaPlan([{ x0: HOLLOW.x + 30, x1: HOLLOW.x + 40, z0: HOLLOW.z - 5, z1: HOLLOW.z + 5, y0: 100, y1: 200 }]);
    expect(narrow.r).toBeLessThan(p.r + 0.01);
    expect(narrow.gallery.x1).toBeLessThan(HOLLOW.x + 30);
    expect(hollowObstacles({ floors: [], solids: [] })).toEqual([]);
  });
});
