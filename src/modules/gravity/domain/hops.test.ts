import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { aisleRails, hatchRails, RailGraph, tubeRails } from "./handrails";
import { arrowVector, HOP, HopGraph, hopSeconds, hopSpeed, launcherLoads, planHop, type Launcher, type Portal } from "./hops";
import { armForceN, hopPhase, holdAt, IVA, ivaStep, type IvaEvent, type IvaState, type IvaWorld } from "./iva";

/** Two Destiny-like aisles (2 × 2 m, 6,3 m long) joined by a 1,27 m CBM hatch 1 m deep at z = 6,8. */
const A = { id: "a", centre: new Vec3(0, 0, 3.15), half: new Vec3(1, 1, 3.15) };
const B = { id: "b", centre: new Vec3(0, 0, 10.45), half: new Vec3(1, 1, 3.15) };
const M = 0.3;
const inAisle = (b: typeof A, p: Vec3) => Math.abs(p.x - b.centre.x) <= b.half.x - M && Math.abs(p.y - b.centre.y) <= b.half.y - M && Math.abs(p.z - b.centre.z) <= b.half.z - M;
const inHatch = (p: Vec3) => Math.abs(p.x) <= 0.635 - M && Math.abs(p.y) <= 0.635 - M && Math.abs(p.z - 6.8) <= 0.5 + M + 0.01;
const fits = (p: Vec3) => inAisle(A, p) || inAisle(B, p) || inHatch(p);
const rails = [...aisleRails(A, "z", "x"), ...aisleRails(B, "z", "x"), ...hatchRails(A, "z", "x", 1, 0.635), ...hatchRails(B, "z", "x", -1, 0.635)];
const railGraph = new RailGraph(rails);
const portal: Portal = { centre: new Vec3(0, 0, 6.8), axis: Vec3.Z, halfDepth: 0.5 };
const hops = new HopGraph(railGraph, fits, [portal]);
const world: IvaWorld = { graph: railGraph, fits };
const view = { forward: Vec3.Z, right: new Vec3(-1, 0, 0) };

const pointNear = (p: Vec3) => hops.nearest(p)!;

describe("arrows relative to the view", () => {
  it("▲ goes where the camera looks, ▼ back, ◄ ► to its sides", () => {
    expect(arrowVector("arriba", view).z).toBeCloseTo(1);
    expect(arrowVector("abajo", view).z).toBeCloseTo(-1);
    expect(arrowVector("derecha", view).x).toBeCloseTo(-1);
    expect(arrowVector("izquierda", view).x).toBeCloseTo(1);
    // Looking up at the ceiling, ▲ goes up.
    expect(arrowVector("arriba", { forward: Vec3.Y, right: Vec3.X }).y).toBeCloseTo(1);
  });
});

describe("ING-03 landing points and hops", () => {
  it("every rail whose body point fits is a landing point", () => {
    expect(hops.points.length).toBe(rails.filter((r) => fits(holdAt(railGraph, r.id, 0.5).body)).length);
    expect(hops.points.length).toBeGreaterThan(30);
    for (const p of hops.points) expect(fits(p.body)).toBe(true);
  });

  it("▲ along the aisle picks a point straight ahead, about two bays on", () => {
    const from = pointNear(new Vec3(-0.5, -0.5, 1));
    const e = hops.pick(from, Vec3.Z)!;
    expect(e).toBeDefined();
    expect(e.to.body.z - from.body.z).toBeGreaterThan(1.5);
    expect(e.to.body.z - from.body.z).toBeLessThan(HOP.maxM);
    // In line: same wall, same row.
    expect(e.to.body.x).toBeCloseTo(from.body.x);
    expect(e.to.body.y).toBeCloseTo(from.body.y);
  });

  it("◄ ► cross the aisle; an arrow with nothing that way gives no hop", () => {
    const from = pointNear(new Vec3(-0.5, -0.5, 3));
    const across = hops.pick(from, Vec3.X)!;
    expect(across.to.body.x).toBeGreaterThan(0);
    // Into the wall she holds: nothing.
    expect(hops.pick(from, new Vec3(-1, 0, 0))).toBeUndefined();
  });

  it("a hop needs a clear line for her body", () => {
    for (const p of hops.points) for (const e of hops.edges(p)) if (!e.hatch) expect(hops.clear(e.path[0]!, e.path[1]!)).toBe(true);
  });

  it("toward the hatch, the hop goes through it to the first point of the next module", () => {
    const from = pointNear(new Vec3(-0.5, -0.5, 5.6));
    const e = hops.pick(from, Vec3.Z)!;
    expect(e.hatch).toBe(true);
    expect(e.to.body.z).toBeGreaterThan(7.3);
    expect(e.to.body.z).toBeLessThan(9);
    // Every leg is clear.
    for (let i = 1; i < e.path.length; i++) expect(hops.clear(e.path[i - 1]!, e.path[i]!)).toBe(true);
  });

  it("nobody gets stranded: from any point every other one can be reached", () => {
    for (const p of hops.points) expect(hops.edges(p).length).toBeGreaterThan(0);
    expect(hops.reachable(hops.points[0]!).size).toBe(hops.points.length);
  });

  it("ING-04 works in a wide tube too (the mothership's 5,5 m spine): rows round the wall, all linked", () => {
    const R = 2.75;
    const tube = new RailGraph(tubeRails("t", 0, 0, R, 0, 12, 8, Math.PI / 8));
    const g = new HopGraph(tube, (p) => Math.hypot(p.y, p.z) < R - 0.45 && p.x > 0.45 && p.x < 11.55);
    expect(g.points.length).toBe(tube.rails.length);
    expect(g.reachable(g.points[0]!).size).toBe(g.points.length);
    const from = g.points[0]!;
    const ahead = g.pick(from, Vec3.X)!;
    expect(ahead.to.body.x - from.body.x).toBeGreaterThan(1.5);
  });
});

describe("hop speeds", () => {
  it("ING-06 from Skylab's ordinary rate to a firm 1,2 m/s (Fase D: faster)", () => {
    expect(hopSpeed(0.6)).toBe(0.6);
    expect(hopSpeed(1.6)).toBeCloseTo(1.0);
    expect(hopSpeed(7)).toBe(1.2);
    // Under Skylab's play (~1,8 m/s) and its «vigorous soaring» (~1,9 m/s).
    expect(HOP.speed.max).toBeLessThan(1.8);
    // Pushing off and catching the fastest hop: ~119 N, under the Mir maximum (137 N, Amir & Newman).
    expect(armForceN(HOP.speed.max, HOP.pushM)).toBeLessThan(137);
    expect(armForceN(HOP.speed.max, HOP.catchM)).toBeLessThan(137);
  });

  it("ING-06 a typical 2,5 m hop takes under 3 s (it took ~4 s at 0,5–1,0 m/s), and a chained one skips the aim", () => {
    const e = { to: hops.points[0]!, path: [Vec3.ZERO, new Vec3(0, 0, 2.5)], length: 2.5, aim: Vec3.Z, hatch: false };
    expect(hopSeconds(e)).toBeLessThan(3);
    expect(hopSeconds(e) - hopSeconds(e, true)).toBeCloseTo(HOP.aimS);
    // The old rule: 2,5/3 = 0,83 m/s and a 0,3 m catch.
    const old = 0.25 + (2 * 0.35) / 0.833 + (2.5 - 0.65) / 0.833 + (2 * 0.3) / 0.833;
    expect(old).toBeGreaterThan(3.7);
  });
});

describe("ING-03 the hop as a motion", () => {
  const holding = (rail: string, t: number): IvaState => ({ position: holdAt(railGraph, rail, t).body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail, t, hands: 0 } });

  const fly = (s: IvaState, hop: ReturnType<typeof planHop>, maxS = 20) => {
    const events: IvaEvent[] = [];
    const phases = new Set<string>();
    let r = ivaStep(s, { hop }, world, 1 / 60);
    events.push(...r.events);
    let time = 0;
    let vmax = 0;
    while (r.state.motion.kind === "salto" && time < maxS) {
      phases.add(hopPhase(r.state.motion));
      r = ivaStep(r.state, {}, world, 1 / 60);
      events.push(...r.events);
      vmax = Math.max(vmax, r.state.velocity.length());
      time += 1 / 60;
    }
    return { s: r.state, events, phases, time, vmax };
  };

  it("aims, pushes, glides and catches the point it aimed at, then holds it", () => {
    const from = pointNear(new Vec3(-0.5, -0.5, 1));
    const e = hops.pick(from, Vec3.Z)!;
    const out = fly(holding(from.rail, from.t), planHop(e));
    expect(out.s.motion).toMatchObject({ kind: "sujeta", rail: e.to.rail });
    expect(out.s.position.sub(e.to.body).length()).toBeLessThan(1e-9);
    expect([...out.phases]).toEqual(["apunta", "impulso", "planeo", "agarre"]);
    expect(out.events.map((x) => x.kind)).toEqual(["impulso", "agarra", "llega"]);
    expect(out.vmax).toBeLessThanOrEqual(hopSpeed(e.length) + 1e-9);
    // Push + glide + catch at that speed, plus the turn: a few seconds.
    expect(out.time).toBeGreaterThan(e.length / hopSpeed(e.length));
    expect(out.time).toBeLessThan(e.length / hopSpeed(e.length) + 2);
  });

  it("through the hatch the path bends at it and always arrives", () => {
    const from = pointNear(new Vec3(-0.5, -0.5, 5.6));
    const e = hops.pick(from, Vec3.Z)!;
    const out = fly(holding(from.rail, from.t), planHop(e));
    expect(out.s.motion).toMatchObject({ kind: "sujeta", rail: e.to.rail });
  });

  it("a hop can only start from a hold: not in flight", () => {
    const from = pointNear(new Vec3(-0.5, -0.5, 1));
    const e = hops.pick(from, Vec3.Z)!;
    const flying: IvaState = { position: from.body, velocity: new Vec3(0, 0, 0.5), motion: { kind: "planeo" } };
    expect(ivaStep(flying, { hop: planHop(e) }, world, 1 / 60).state.motion.kind).toBe("planeo");
  });
});

describe("ING-05 points of interest: grab points at every interactable", () => {
  const poiRails = [...rails.map((r) => (r.id === "a:da4" ? { ...r, poi: "refineria" } : r))];
  const g = new HopGraph(new RailGraph(poiRails), fits, [portal]);

  it("a rail with a point of interest gives a landing point that says so", () => {
    expect(g.poiPoint("refineria")?.rail).toBe("a:da4");
    expect(g.pois().map((p) => p.poi)).toEqual(["refineria"]);
  });

  it("the arrows prefer a point of interest over a plain rail at about the same angle", () => {
    const from = g.nearest(new Vec3(0.5, 0.5, 1.6))!;
    const target = g.poiPoint("refineria")!;
    const plain = new HopGraph(new RailGraph(rails), fits, [portal]).pick(plain0(from), Vec3.Z)!;
    expect(plain.to.id).not.toBe(target.id);
    expect(g.pick(from, Vec3.Z)!.to.id).toBe(target.id);
  });
  const plain0 = (p: { id: string }) => hops.points.find((q) => q.id === p.id)!;

  it("a route chains hops to any point (the tap on an interactable, the task list's «Ir»)", () => {
    const from = g.nearest(new Vec3(-0.5, -0.5, 12))!;
    const to = g.poiPoint("refineria")!;
    const route = g.route(from, to.id)!;
    expect(route.length).toBeGreaterThan(1);
    expect(route[route.length - 1]!.to.id).toBe(to.id);
    // Each hop starts where the last one landed.
    let at = from.id;
    for (const e of route) {
      expect(g.edges(g.points.find((p) => p.id === at)!)).toContain(e);
      at = e.to.id;
    }
    expect(g.route(to, to.id)).toEqual([]);
  });
});

describe("ING-07 launchers and catch nets", () => {
  const R = 2.75;
  const tube = new RailGraph(tubeRails("t", 0, 0, R, 0, 14, 8, Math.PI / 8));
  const fitsTube = (p: Vec3) => Math.hypot(p.y, p.z) < R - 0.45 && p.x > 0.45 && p.x < 13.55;
  const first = tube.rails.find((r) => r.id === "t:2:0")!;
  const last = tube.rails.find((r) => r.id === "t:2:12")!;
  const launcher: Launcher = { id: "l", label: "Lanzador", from: first.id, to: last.id, speedMS: 2.0, strokeM: 0.6, catchM: 1.0 };
  const g = new HopGraph(tube, fitsTube, [], [launcher]);

  it("loads are real: a push like a leg push-off and a net catch under the Mir peak", () => {
    const { pushN, catchN } = launcherLoads(launcher);
    // Parabolic flight leg push-offs: 66–462 N, mean 225 N.
    expect(pushN).toBeGreaterThan(66);
    expect(pushN).toBeLessThan(225);
    expect(catchN).toBeLessThan(137);
  });

  it("from its plate, ▲ fires her the whole run to the net, much quicker than hop by hop", () => {
    const from = g.pointOf(first.id)!;
    const e = g.pick(from, Vec3.X)!;
    expect(e.launcher?.id).toBe("l");
    expect(e.to.rail).toBe(last.id);
    const plan = planHop(e);
    expect(plan.speed).toBe(2.0);
    const plain = new HopGraph(tube, fitsTube);
    const byHops = plain.route(plain.pointOf(first.id)!, last.id)!.reduce((t, x, i) => t + hopSeconds(x, i > 0), 0);
    expect(hopSeconds(e)).toBeLessThan(byHops * 0.75);
  });

  it("an unknown rail in a launcher is an error in the data", () => {
    expect(() => new HopGraph(tube, fitsTube, [], [{ ...launcher, to: "nada" }])).toThrow();
  });
});

describe("ING-08 ladders", () => {
  const R = 2.75;
  const ladder = { id: "esc", a: new Vec3(1, -R + 0.08, 0), b: new Vec3(9, -R + 0.08, 0), normal: Vec3.Y, ladder: true };
  const tube = new RailGraph([...tubeRails("t", 0, 0, R, 0, 10, 8, Math.PI / 8), ladder]);
  const fitsTube = (p: Vec3) => Math.hypot(p.y, p.z) < R - 0.45 && p.x > 0.45 && p.x < 9.55;
  const g = new HopGraph(tube, fitsTube);
  const tw: IvaWorld = { graph: tube, fits: fitsTube };

  it("a ladder gives a landing point every rack bay, to hop on and off", () => {
    const on = g.points.filter((p) => p.rail === "esc");
    expect(on.length).toBe(Math.round(8 / HOP.ladderPitchM) + 1);
    const mid = g.pointAt("esc", 0.5)!;
    expect(g.edges(mid).every((e) => e.to.rail !== "esc")).toBe(true);
    expect(g.edges(mid).length).toBeGreaterThan(0);
  });

  it("holding an arrow along it, she climbs hand over hand at 0,6 m/s: quicker than a hop over short runs", () => {
    let s: IvaState = { position: holdAt(tube, "esc", 0.25).body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: "esc", t: 0.25, hands: 0 } };
    let time = 0;
    while (s.motion.kind === "sujeta" && s.motion.t < 0.25 + 1.05 / 8 && time < 10) {
      s = ivaStep(s, { along: Vec3.X }, tw, 1 / 60).state;
      time += 1 / 60;
    }
    expect(time).toBeCloseTo(1.05 / IVA.ladderSpeed, 1);
    const hop = { to: g.points[0]!, path: [Vec3.ZERO, new Vec3(1.05, 0, 0)], length: 1.05, aim: Vec3.X, hatch: false };
    expect(time).toBeLessThan(hopSeconds(hop));
    // Across the ladder the arrow does nothing (that is a hop off it).
    const before = s;
    expect(ivaStep(before, { along: Vec3.Z }, tw, 1 / 60).state).toBe(before);
  });
});

describe("ING-06 chained hops", () => {
  it("a chained hop pushes at once (no aim pause)", () => {
    const from = pointNear(new Vec3(-0.5, -0.5, 1));
    const e = hops.pick(from, Vec3.Z)!;
    const s: IvaState = { position: from.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: from.rail, t: from.t, hands: 0 } };
    const r = ivaStep(s, { hop: planHop(e, from.body, true) }, world, 1 / 60);
    expect(r.events.map((x) => x.kind)).toEqual(["impulso"]);
    const m = r.state.motion;
    expect(m.kind === "salto" && hopPhase(m)).toBe("impulso");
  });
});
