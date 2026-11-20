import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { NANO_TUNING, NanoCore, ringNodeCount } from "./core";

const T = NANO_TUNING;
const R = 245;
const bennuCore = () => new NanoCore("bennu", "101955 Bennu", Vec3.ZERO, R);
const learnAll = (c: NanoCore, upTo: number) => {
  const remote = { id: "santuario", name: "Red del santuario", position: new Vec3(30_000, 0, -40_000) };
  for (const s of ["generar", "mover", "cubrir", "enlazar"] as const) {
    if (c.learned.length >= upTo) break;
    c.learn(s, remote);
  }
};
/** A rng that always says "no event". */
const never = () => 0.999;

describe("nano_net core (an ex-asteroid)", () => {
  it("is born knowing nothing: no nodes, no coverage, and learns its stages in order", () => {
    const c = bennuCore();
    expect(c.nodes).toHaveLength(0);
    expect(c.nextStage).toBe("generar");
    expect(() => c.learn("mover")).toThrow();
    expect(c.effectsAt(new Vec3(R + 50, 0, 0)).covered).toBe(false);
  });

  it("generar: grows its first nodes just above its surface, each giving energy, safety or speed", () => {
    const c = bennuCore();
    c.learn("generar");
    expect(c.nodes).toHaveLength(T.firstNodes);
    expect(new Set(c.nodes.map((n) => n.role))).toEqual(new Set(["energia", "escudo", "impulso"]));
    for (const n of c.nodes) expect(n.position.length()).toBeCloseTo(R + T.bornAltitudeM, 5);
    expect(c.nextStage).toBe("mover");
  });

  it("mover: sends the nodes out to the parking ring, which widens what they cover", () => {
    const c = bennuCore();
    c.learn("generar");
    const far = new Vec3(0, 0, R + T.ringAltitudeM + 300);
    const before = c.effectsAt(far).covered;
    c.learn("mover");
    for (const n of c.nodes) expect(n.position.length()).toBeCloseTo(R + T.ringAltitudeM, 5);
    expect(before).toBe(false);
    expect(c.effectsAt(far).covered).toBe(true);
  });

  it("cubrir: grows enough nodes to close the ring and links each one to the next", () => {
    const c = bennuCore();
    learnAll(c, 3);
    const n = ringNodeCount(R + T.ringAltitudeM, T.linkRangeM);
    expect(n).toBe(8); // ceil(2π·845 / 700)
    expect(c.nodes).toHaveLength(n);
    expect(c.links).toHaveLength(n);
    for (const [a, b] of c.links) {
      const pa = c.nodes.find((x) => x.id === a)!.position;
      const pb = c.nodes.find((x) => x.id === b)!.position;
      expect(pa.sub(pb).length()).toBeLessThanOrEqual(T.linkRangeM);
    }
    expect(c.meshed).toBe(true);
  });

  it("meshed nodes give their full effect; before the mesh they give half", () => {
    const c = bennuCore();
    learnAll(c, 2);
    const at = c.nodes.find((n) => n.role === "energia")!.position;
    const half = c.effectsAt(at).energyKw;
    c.learn("cubrir");
    const full = c.effectsAt(at).energyKw;
    expect(half).toBeCloseTo(T.energyKwPerNode * T.unmeshedFactor, 5);
    expect(full).toBeGreaterThanOrEqual(T.energyKwPerNode);
  });

  it("effects inside coverage: more warp, energy and safety, all capped", () => {
    const c = bennuCore();
    learnAll(c, 3);
    const fx = c.effectsAt(c.nodes[0]!.position);
    expect(fx.covered).toBe(true);
    expect(fx.warpFactor).toBeGreaterThan(1);
    expect(fx.warpFactor).toBeLessThanOrEqual(T.maxWarpFactor);
    expect(fx.safety).toBeGreaterThan(0);
    expect(fx.safety).toBeLessThanOrEqual(T.maxSafety);
    expect(c.effectsAt(new Vec3(10_000, 0, 0))).toEqual({ covered: false, energyKw: 0, safety: 0, warpFactor: 1 });
  });

  it("the ring is polar: a ship anchored at a pole, where landing is easiest, is inside coverage", () => {
    const c = bennuCore();
    learnAll(c, 3);
    expect(c.effectsAt(new Vec3(0, R + 25, 0)).covered).toBe(true);
    expect(c.effectsAt(new Vec3(0, -(R + 25), 0)).covered).toBe(true);
  });

  it("enlazar: links to another network in range, which adds a speed corridor", () => {
    const c = bennuCore();
    learnAll(c, 3);
    const p = c.nodes.find((n) => n.role === "impulso")!.position;
    const w = c.effectsAt(p).warpFactor;
    expect(() => c.learn("enlazar", { id: "lejos", name: "Lejos", position: new Vec3(1e6, 0, 0) })).toThrow();
    c.learn("enlazar", { id: "santuario", name: "Red del santuario", position: new Vec3(30_000, 0, -40_000) });
    expect(c.linkedTo?.id).toBe("santuario");
    expect(c.effectsAt(p).warpFactor).toBeCloseTo(Math.min(T.maxWarpFactor, w + T.linkedWarpBonus), 5);
    expect(c.nextStage).toBeUndefined();
  });

  it("a broken node gives nothing and is a fault; repairing it brings it back", () => {
    const c = bennuCore();
    learnAll(c, 3);
    const n = c.nodes[0]!;
    n.damage(0.7);
    expect(c.faults().map((f) => f.id)).toEqual([`nodo-${n.id}`]);
    expect(c.effectsAt(n.position).covered).toBe(c.nodes.some((m) => m !== n && m.working && m.position.sub(n.position).length() <= T.nodeRangeM));
    c.repair(`nodo-${n.id}`);
    expect(n.health).toBe(1);
    expect(c.faults()).toHaveLength(0);
  });

  it("a node cut off from the core (no working path) stops giving effects", () => {
    const c = bennuCore();
    learnAll(c, 2); // not meshed yet: every node hangs from the core directly
    c.corruptProgram();
    expect(c.connectedNodes()).toHaveLength(0);
    expect(c.effectsAt(c.nodes[0]!.position).covered).toBe(false);
    expect(c.faults().map((f) => f.target)).toEqual(["programa"]);
    expect(() => c.learn("cubrir")).toThrow();
    c.repair("programa-bennu");
    expect(c.connectedNodes()).toHaveLength(c.nodes.length);
  });

  it("wears out over time and reports only new faults", () => {
    const c = bennuCore();
    learnAll(c, 3);
    expect(c.tick(1, never)).toEqual([]);
    const days = (1 - T.brokenBelow) / T.wearPerDay + 1;
    const fresh = c.tick(days, never);
    expect(fresh.length).toBe(c.nodes.length);
    expect(c.tick(1, never)).toEqual([]);
  });

  it("random hits break nodes and the program (rng injected)", () => {
    const c = bennuCore();
    learnAll(c, 3);
    const fresh = c.tick(0.01, () => 0); // every Poisson draw fires
    expect(fresh.some((f) => f.target === "programa")).toBe(true);
    expect(fresh.some((f) => f.target === "nodo")).toBe(true);
  });

  it("a strong jolt corrupts the program and damages a node", () => {
    const c = bennuCore();
    learnAll(c, 3);
    expect(c.jolt(0.2, never)).toEqual([]);
    const f = c.jolt(0.8, () => 0);
    expect(f.map((x) => x.target).sort()).toEqual(["nodo", "programa"]);
  });

  it("a core with no nodes yet has nothing to break", () => {
    const c = bennuCore();
    expect(c.tick(10, () => 0)).toEqual([]);
  });
});
