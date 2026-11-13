import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { aisleRails, RailGraph } from "./handrails";
import { aimThroughPortal, airDragAccel, armForceN, freePath, holdAt, IVA, ivaStep, planGlide, pushDurationS, startAt, wallNormal, type IvaIntent, type IvaState, type IvaWorld } from "./iva";

/** A Destiny-like aisle, 2 × 2 m, 6,3 m long, from z = 0 to 6,3, rails on both sides. */
const box = { id: "lab", centre: new Vec3(0, 0, 3.15), half: new Vec3(1, 1, 3.15) };
const fits = (p: Vec3) => Math.abs(p.x) <= 0.7 && Math.abs(p.y) <= 0.7 && p.z >= 0.3 && p.z <= 6.0;
const world: IvaWorld = { graph: new RailGraph(aisleRails(box, "z", "x")), fits };
const firstRail = world.graph.rails.find((r) => r.a.x < 0 && r.a.y < 0 && r.a.z < 1)!;

const run = (s: IvaState, w: IvaWorld, seconds: number, intent: IvaIntent = {}, dt = 1 / 60) => {
  const events = [];
  for (let i = 0; i < seconds / dt; i++) {
    const r = ivaStep(s, i === 0 ? intent : { ...intent, push: undefined }, w, dt);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
};
const holding = (): IvaState => ({ position: holdAt(world.graph, firstRail.id, 0.5).body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: firstRail.id, t: 0.5, hands: 0 } });

describe("push and glide kinematics", () => {
  it("an ordinary push at Skylab speeds needs Mir-like forces", () => {
    // 0,5 m/s over a 0,35 m arm stroke: about 21 N for 58 kg (Mir median 16 N, 96 % < 60 N).
    expect(armForceN(IVA.glide.suave, IVA.strokeM)).toBeCloseTo(20.7, 1);
    expect(armForceN(IVA.glide.suave, IVA.strokeM)).toBeLessThan(60);
    expect(pushDurationS(0.5, 0.35)).toBeCloseTo(1.4);
  });

  it("a hard push lands four times as hard", () => {
    expect(armForceN(IVA.glide.fuerte, IVA.catchM) / armForceN(IVA.glide.suave, IVA.catchM)).toBeCloseTo(4);
  });

  it("cabin air barely moves her: at 0,1 m/s the pull is under 10⁻⁴ m/s²", () => {
    const a = airDragAccel(Vec3.ZERO, new Vec3(0, 0, 0.1));
    expect(a.z).toBeGreaterThan(0);
    expect(a.length()).toBeLessThan(1e-4);
  });
});

describe("planning a flight", () => {
  it("the free path ends where her body meets the wall", () => {
    expect(freePath(new Vec3(0, 0, 1), Vec3.Z, fits)).toBeCloseTo(5, 1);
  });

  it("aims at the rail in reach nearest the end of the flight, not at the one she leaves", () => {
    const s = holding();
    const p = planGlide(world, s.position, Vec3.Z, firstRail.id);
    expect(p.target).toBeDefined();
    const r = world.graph.rail(p.target!.rail);
    expect(r.a.z).toBeGreaterThan(5);
    expect(p.target!.rail).not.toBe(firstRail.id);
  });

  it("flying down the middle of a wide aisle passes every side rail out of reach", () => {
    expect(planGlide(world, new Vec3(0, 0, 1), new Vec3(0, 0, 1)).target).toBeUndefined();
  });

  it("knows when her body touches a wall", () => {
    expect(wallNormal(new Vec3(0, 0, 6.0), fits)?.z).toBeCloseTo(-1);
    expect(wallNormal(new Vec3(0, 0, 3), fits)).toBeUndefined();
  });
});

describe("ivaStep", () => {
  it("starts holding the nearest rail", () => {
    const s = startAt(world.graph, new Vec3(-0.4, -0.5, 0.8));
    expect(s.motion.kind).toBe("sujeta");
  });

  it("push, glide at a steady speed without steering or braking, then catch the planned rail", () => {
    let s = holding();
    let r = ivaStep(s, { push: { dir: Vec3.Z, strength: "suave" } }, world, 1 / 60);
    expect(r.events[0]).toMatchObject({ kind: "impulso", speed: 0.5 });
    s = r.state;
    expect(s.motion.kind).toBe("impulso");
    ({ s } = run(s, world, 1.5));
    expect(s.motion.kind).toBe("planeo");
    expect(s.velocity.z).toBeCloseTo(0.5, 6);
    // The stick does nothing in flight.
    const before = s.velocity;
    ({ s } = run(s, world, 1, { along: Vec3.X }));
    expect(s.velocity.sub(before).length()).toBeLessThan(1e-9);
    const out = run(s, world, 15);
    expect(out.s.motion.kind).toBe("sujeta");
    expect(out.events.some((e) => e.kind === "agarra")).toBe(true);
    expect(out.s.position.z).toBeGreaterThan(5);
    expect(out.s.velocity.length()).toBe(0);
  });

  it("cannot push again in flight", () => {
    let s = holding();
    s = run(s, world, 2, { push: { dir: Vec3.Z, strength: "suave" } }).s;
    const r = ivaStep(s, { push: { dir: Vec3.Z.scale(-1), strength: "fuerte" } }, world, 1 / 60);
    expect(r.events).toContainEqual({ kind: "sin-impulso", why: "en-vuelo" });
    expect(r.state.velocity.z).toBeGreaterThan(0);
  });

  it("can grab a rail in reach mid-flight to stop early", () => {
    let s = holding();
    s = run(s, world, 2.5, { push: { dir: Vec3.Z, strength: "suave" } }).s;
    const r = ivaStep(s, { grab: true }, world, 1 / 60);
    expect(r.state.motion.kind).toBe("agarrando");
    expect(run(r.state, world, 2).s.position.z).toBeLessThan(4);
  });

  it("does not push into the wall she holds: only along it or away", () => {
    const r = ivaStep(holding(), { push: { dir: new Vec3(-1, 0, 0), strength: "suave" } }, world, 1 / 60);
    expect(r.events).toContainEqual({ kind: "sin-impulso", why: "contra-la-pared" });
    const r2 = ivaStep(holding(), { push: { dir: new Vec3(-1, 0, 1), strength: "suave" } }, world, 1 / 60);
    expect(r2.state.motion.kind === "impulso" && r2.state.motion.dir.x).toBe(0);
  });

  it("goes hand over hand along the bar and on to the next one", () => {
    let s = holding();
    const z0 = s.position.z;
    let hopped = false;
    for (let i = 0; i < 6 * 60; i++) {
      s = ivaStep(s, { along: Vec3.Z }, world, 1 / 60).state;
      if (s.motion.kind === "mano-a-mano") hopped = true;
    }
    expect(hopped).toBe(true);
    expect(s.position.z - z0).toBeGreaterThan(1.2);
    expect(s.position.z - z0).toBeLessThan(IVA.handSpeed * 6 + 0.6);
  });

  it("lands on a bare wall gently, braced, and can push off it again", () => {
    const bare: IvaWorld = { graph: new RailGraph([]), fits };
    let s: IvaState = { position: new Vec3(0, 0, 5.9), velocity: new Vec3(0, 0, 0.5), motion: { kind: "planeo" } };
    const out = run(s, bare, 1);
    expect(out.s.motion.kind).toBe("pared");
    expect(out.events.some((e) => e.kind === "pared")).toBe(true);
    s = ivaStep(out.s, { push: { dir: Vec3.Z.scale(-1), strength: "suave" } }, bare, 1 / 60).state;
    expect(s.motion.kind).toBe("impulso");
  });

  it("hitting a wall too fast bounces her back, slowed", () => {
    const bare: IvaWorld = { graph: new RailGraph([]), fits };
    const out = run({ position: new Vec3(0, 0, 5.9), velocity: new Vec3(0, 0, 1.6), motion: { kind: "planeo" } }, bare, 0.2);
    expect(out.events.some((e) => e.kind === "golpe")).toBe(true);
    expect(out.s.velocity.z).toBeCloseTo(-1.6 * IVA.restitution, 6);
  });

  it("stranded out of reach, only the air moves her, very slowly", () => {
    const air: IvaWorld = { graph: new RailGraph([]), fits, air: () => new Vec3(0, 0, 0.1) };
    const r = run({ position: new Vec3(0, 0, 3), velocity: Vec3.ZERO, motion: { kind: "planeo" } }, air, 60);
    expect(r.events).toContainEqual({ kind: "deriva" });
    expect(r.s.motion.kind).toBe("deriva");
    expect(r.s.position.z - 3).toBeGreaterThan(0);
    expect(r.s.position.z - 3).toBeLessThan(0.2);
    expect(ivaStep(r.s, { push: { dir: Vec3.Z, strength: "suave" } }, air, 1 / 60).events).toContainEqual({ kind: "sin-impulso", why: "a-la-deriva" });
  });

  it("in a spinning hub the apparent forces bend her flight", () => {
    const spin: IvaWorld = { ...world, graph: new RailGraph([]), extra: () => new Vec3(0.1, 0, 0) };
    const r = run({ position: new Vec3(0, 0, 1), velocity: new Vec3(0, 0, 0.5), motion: { kind: "planeo" } }, spin, 2);
    expect(r.s.velocity.x).toBeGreaterThan(0.15);
  });

  it("a push roughly at a hatch is aimed through it (game help)", () => {
    // Two aisles joined by a 0,6 m hatch at z = 6: she floats beside it, 0,6 m off its axis.
    const twoRooms = (p: Vec3) => (Math.abs(p.x) <= 0.7 && Math.abs(p.y) <= 0.7 && p.z >= 0.3 && p.z <= 12) && (Math.abs(p.z - 6) > 0.5 || (Math.abs(p.x) <= 0.3 && Math.abs(p.y) <= 0.3));
    const w: IvaWorld = { graph: new RailGraph([]), fits: twoRooms, portals: [new Vec3(0, 0, 6)] };
    const from = new Vec3(0.6, 0, 4.5);
    const d = aimThroughPortal(w, from, Vec3.Z);
    expect(d.x).toBeLessThan(0);
    expect(freePath(from, d, twoRooms)).toBeGreaterThan(2);
    // Far off the hatch's bearing, no help.
    expect(aimThroughPortal(w, from, new Vec3(-1, 0, 0.3)).z).toBeCloseTo(new Vec3(-1, 0, 0.3).normalize().z);
  });
});
