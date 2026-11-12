import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { NanoNet } from "./network";

const site = { id: "bennu", name: "101955 Bennu", position: Vec3.ZERO, radiusM: 245 };
const remote = { id: "santuario", name: "Red del santuario", position: new Vec3(30_000, 0, -40_000) };

describe("nano_net network", () => {
  it("plants one core per asteroid", () => {
    const net = new NanoNet([remote]);
    net.plant(site);
    expect(net.core("bennu")?.name).toBe("101955 Bennu");
    expect(() => net.plant(site)).toThrow();
  });

  it("finds the closest remote network in link range", () => {
    const net = new NanoNet([{ id: "lejos", name: "Lejos", position: new Vec3(1e6, 0, 0) }, remote]);
    const c = net.plant(site);
    expect(net.remoteInRange(c)?.id).toBe("santuario");
    expect(new NanoNet([]).remoteInRange(c)).toBeUndefined();
  });

  it("adds energy and keeps the best safety and warp among cores covering a point", () => {
    const net = new NanoNet([remote]);
    const a = net.plant(site);
    const b = net.plant({ ...site, id: "otro", name: "Otro", position: new Vec3(0, 0, 1600) });
    for (const s of ["generar", "mover", "cubrir"] as const) {
      a.learn(s);
      b.learn(s);
    }
    const p = new Vec3(0, 0, 845); // on a's ring, and in range of b's ring (1600 − 845 = 755)
    const fa = a.effectsAt(p);
    const fb = b.effectsAt(p);
    const fx = net.effectsAt(p);
    expect(fx.energyKw).toBeCloseTo(fa.energyKw + fb.energyKw, 5);
    expect(fx.warpFactor).toBe(Math.max(fa.warpFactor, fb.warpFactor));
    expect(net.effectsAt(new Vec3(0, 50_000, 0)).covered).toBe(false);
  });

  it("collects the faults of every core", () => {
    const net = new NanoNet();
    const c = net.plant(site);
    c.learn("generar");
    c.corruptProgram();
    expect(net.faults().map((f) => f.id)).toEqual(["programa-bennu"]);
  });
});
