import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { aisleRails, hatchRails, RailGraph, tubeRails } from "./handrails";
import { arrowVector, HOP, HopGraph, hopSpeed, planHop, type Portal } from "./hops";
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

describe("landing points and hops", () => {
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

  it("works in a wide tube too (the mothership's spine): rows round the wall, all linked", () => {
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
  it("between Skylab's ordinary rate and a brisk 1 m/s", () => {
    expect(hopSpeed(0.6)).toBe(0.5);
    expect(hopSpeed(2.4)).toBeCloseTo(0.8);
    expect(hopSpeed(7)).toBe(1.0);
    // Arriving at the fastest hop costs ~97 N in the arms: under the Mir maximum (137 N).
    expect(armForceN(1.0, IVA.catchM)).toBeLessThan(137);
  });
});

describe("the hop as a motion", () => {
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
