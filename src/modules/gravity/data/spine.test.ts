import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { INTERACTABLE_SPACING, spacingViolations } from "@core/spacing";
import { RailGraph } from "../domain/handrails";
import { HopGraph, hopSeconds, launcherLoads, type HopEdge } from "../domain/hops";
import { holdAt, ivaStep, type IvaState, type IvaWorld } from "../domain/iva";
import { CODESHIP_RING } from "./ring";
import { RING_MODULE } from "@modules/habitat/data/ring-module";
import { spineFits, spineHandrails, spineInteractables, spineLauncher, spineLaunchers, spineLayout, spinePois } from "./spine";

const L = spineLayout(CODESHIP_RING.floorRadiusM, RING_MODULE.halfL);
const fits = (p: Vec3) => spineFits(L, p, 0.45);
const rails = new RailGraph(spineHandrails(L));
const g = new HopGraph(rails, fits, [], spineLaunchers());
const world: IvaWorld = { graph: rails, fits };

/** The old rule (Fase C): v = L/3 s within 0,5–1,0 m/s, a 0,35 m push, a 0,3 m catch and a 0,25 s aim every hop. */
const oldSeconds = (len: number) => {
  const v = Math.max(0.5, Math.min(1.0, len / 3));
  const k = Math.min(1, len / 0.65);
  return 0.25 + (2 * 0.35 * k) / v + Math.max(0, len - 0.65 * k) / v + (2 * 0.3 * k) / v;
};
const total = (route: readonly HopEdge[]) => route.reduce((t, e, i) => t + hopSeconds(e, i > 0), 0);

describe("ING-05 the spine's points of interest", () => {
  it("every hatch, machine, console, the suits, the elevator and the launchers has a grab point she can hop to", () => {
    const ids = spinePois(L).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["ascensor", "atraque", "puente", "guantera", "impresora", "almacen", "trajes", "lanzador-popa", "lanzador-proa"]));
    for (const id of ids) expect(g.poiPoint(id), id).toBeDefined();
  });

  it("nobody gets stranded: from the docking hatch every point is reachable", () => {
    expect(g.reachable(g.poiPoint("atraque")!).size).toBe(g.points.length);
  });

  it("looking down the spine, ▲ goes from one thing to the next", () => {
    const view = (x: number) => ({ forward: new Vec3(x, 0, 0), right: new Vec3(0, 0, x) });
    const order: string[] = [];
    let at = g.poiPoint("guantera")!;
    for (let i = 0; i < 3; i++) {
      const e = g.targets(at, view(1)).arriba!;
      at = e.to;
      if (at.poi) order.push(at.poi);
    }
    expect(order.length).toBeGreaterThanOrEqual(2);
    expect(order[0]).toBe("impresora");
  });

  it("a tap on any of them chains hops there from anywhere", () => {
    const from = g.poiPoint("atraque")!;
    for (const p of spinePois(L)) {
      const r = g.route(from, g.poiPoint(p.id)!.id);
      expect(r, p.id).toBeDefined();
    }
  });
});

describe("ING-06 / ING-07 crossing the spine is quicker", () => {
  const from = g.poiPoint("atraque")!;
  const to = g.poiPoint("ascensor")!;

  it("from the docking hatch to the elevator: the old best chain took over 20 s; a tap now takes it via the launcher in under 15 s", () => {
    // Before: the old rails, the old speeds, no launcher; the quickest chain of hops (a lower bound).
    const plain = spineHandrails(L).filter((r) => !r.ladder && !r.id.startsWith("lanzador") && !["guantera", "impresora", "almacen", "puente", "trajes"].includes(r.id));
    const old = new HopGraph(new RailGraph(plain), fits);
    const oldRoute = old.route(old.nearest(from.body)!, old.pointOf("pozo")!.id)!;
    const before = oldRoute.reduce((t, e) => t + oldSeconds(e.length), 0);
    const route = g.route(from, to.id)!;
    const after = total(route);
    expect(before).toBeGreaterThan(20);
    expect(route.some((e) => e.launcher)).toBe(true);
    expect(after).toBeLessThan(15);
    expect(after).toBeLessThan(before * 0.7);
  });

  it("the route really flies: simulated hop by hop it lands on the elevator's bar", () => {
    let s: IvaState = { position: from.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: from.rail, t: from.t, hands: 0 } };
    let time = 0;
    for (const [i, e] of g.route(from, to.id)!.entries()) {
      let r = ivaStep(s, { hop: { path: e.path, rail: e.to.rail, t: e.to.t, speed: e.launcher ? e.launcher.speedMS : Math.max(0.6, Math.min(1.2, e.length / 1.6)), aimS: i ? 0 : 0.25, pushM: e.launcher?.strokeM ?? 0.35, catchM: e.launcher?.catchM ?? 0.35, ...(e.launcher ? { launcher: e.launcher.id } : {}) } }, world, 1 / 60);
      while (r.state.motion.kind === "salto" && time < 60) {
        r = ivaStep(r.state, {}, world, 1 / 60);
        time += 1 / 60;
      }
      s = r.state;
    }
    expect(s.motion).toMatchObject({ kind: "sujeta", rail: to.rail });
    expect(time).toBeLessThan(15);
  });
});

describe("ING-07 the spine's launchers", () => {
  it("one at each end, each to the other's net, with real loads", () => {
    const ls = spineLaunchers();
    expect(ls.map((l) => [l.from, l.to])).toEqual([
      ["lanzador-popa", "lanzador-proa"],
      ["lanzador-proa", "lanzador-popa"],
    ]);
    for (const l of ls) {
      const { pushN, catchN } = launcherLoads(l);
      expect(pushN).toBeLessThan(225);
      expect(catchN).toBeLessThan(137);
      expect(l.speedMS).toBeLessThanOrEqual(2.5);
    }
    expect(spineLauncher("lanzador-popa")?.speedMS).toBe(2.5);
  });
});

describe("ING-08 the spine's ladders", () => {
  it("one along the spine's floor and one up the hub's end wall, each a row of landing points", () => {
    const ladders = rails.rails.filter((r) => r.ladder);
    expect(ladders.map((r) => r.id).sort()).toEqual(["escalera-cubo", "escalera-espina"]);
    const floor = rails.rail("escalera-espina");
    expect(Math.abs(floor.b.x - floor.a.x)).toBeGreaterThan(10);
    const wall = rails.rail("escalera-cubo");
    expect(Math.abs(wall.b.y - wall.a.y)).toBeGreaterThan(2);
    for (const r of ladders) {
      expect(g.points.filter((p) => p.rail === r.id).length).toBeGreaterThan(2);
      expect(fits(holdAt(rails, r.id, 0).body) && fits(holdAt(rails, r.id, 1).body)).toBe(true);
    }
  });
});

describe("HAB-08 room between interactables in the spine", () => {
  it(`every thing and its grab point at least ${INTERACTABLE_SPACING.minM} m from the next`, () => {
    expect(spacingViolations(spineInteractables(L))).toEqual([]);
  });
});
