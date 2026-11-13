import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { DA_1986, CERES } from "../data/reference-bodies";
import { HULL_ENERGY_J, PROBE_ELECTRONICS_TOLERANCE_MSV, type Protection } from "../domain/protection";
import type { TargetKind } from "../domain/power";
import { AsteroidWrath, type WrathTarget } from "./wrath";

/** A test target: stands still (or moves at `velocity`), records what it takes. */
function target(id: string, kind: TargetKind, position: Vec3, opts: { velocity?: Vec3; crewed?: boolean; accel?: number } = {}) {
  const log = { damage: 0, dose: 0, pulled: Vec3.ZERO, pos: position, causes: [] as string[] };
  const protection: Protection = opts.crewed
    ? { hullEnergyJ: HULL_ENERGY_J[kind], debrisFactor: 1, radiation: { material: "aluminio", arealDensityGcm2: 1 } }
    : { hullEnergyJ: HULL_ENERGY_J[kind], debrisFactor: 1, electronicsToleranceMSv: PROBE_ELECTRONICS_TOLERANCE_MSV };
  const t: WrathTarget = {
    id,
    kind,
    name: id,
    radiusM: kind === "estacion" ? 60 : 2,
    position: () => log.pos,
    velocity: () => opts.velocity ?? Vec3.ZERO,
    active: () => true,
    protection: () => protection,
    damage: (f, c) => {
      log.damage += f;
      log.causes.push(c);
    },
    dose: (m) => (log.dose += m),
    pull: (dv) => (log.pulled = log.pulled.add(dv)),
    thrustAccelMs2: () => opts.accel ?? 0.33,
  };
  return { t, log };
}

const run = (w: AsteroidWrath, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) w.update(0.1);
};

describe("asteroid wrath", () => {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);

  it("a calm asteroid throws nothing and can be dueled; a failed duel makes it angry and blocks a retry", () => {
    const w = new AsteroidWrath([bennu]);
    const probe = target("sonda", "sonda", new Vec3(0, 300, 0));
    w.addTarget(probe.t);
    run(w, 10);
    expect(w.projectiles.length).toBe(0);
    expect(w.canRetry(BENNU.id)).toBe(true);
    w.duelFailed(BENNU.id, 1);
    expect(w.canRetry(BENNU.id)).toBe(false);
    expect(w.drainEvents()[0]).toMatchObject({ type: "enraged", tier: 1 });
  });

  it("Bennu (tier 1) throws only at the probe: the lander next to it is left alone", () => {
    const w = new AsteroidWrath([bennu]);
    const probe = target("sonda", "sonda", new Vec3(0, 260, 0));
    const lander = target("lander", "aterrizador", new Vec3(0, 0, 260), { crewed: true });
    w.addTarget(probe.t);
    w.addTarget(lander.t);
    w.duelFailed(BENNU.id, 2);
    run(w, 60);
    const launched = w.drainEvents().filter((e) => e.type === "launched");
    expect(launched.length).toBeGreaterThan(3);
    expect(launched.every((e) => e.type === "launched" && e.projectile.targetId === "sonda")).toBe(true);
    expect(probe.log.damage).toBeGreaterThan(0);
    expect(lander.log.damage).toBe(0);
  });

  it("anger decays to calm with the tier's half-life; then the asteroid can be dueled again", () => {
    const w = new AsteroidWrath([bennu]);
    w.duelFailed(BENNU.id, 3);
    const t = w.timeToCalmS(BENNU.id);
    expect(t).toBeCloseTo(30 * Math.log2(1 / 0.05), 3);
    run(w, t + 1);
    expect(w.canRetry(BENNU.id)).toBe(true);
    expect(w.drainEvents().some((e) => e.type === "calmed")).toBe(true);
  });

  it("fleeing beyond the reach ends the pursuit: an escape event, no new throws, flee guidance says 0 m", () => {
    const w = new AsteroidWrath([bennu]);
    const probe = target("sonda", "sonda", new Vec3(0, 400, 0));
    w.addTarget(probe.t);
    w.duelFailed(BENNU.id, 3);
    const g = w.fleeGuidance("sonda")!;
    expect(g.direction.y).toBeCloseTo(1);
    expect(g.distanceM).toBeCloseTo(2000 - (400 - BENNU.meanRadiusM.value), 3);
    run(w, 1);
    probe.log.pos = new Vec3(0, 3000, 0);
    run(w, 1);
    expect(w.drainEvents().some((e) => e.type === "escaped" && e.targetId === "sonda")).toBe(true);
    expect(w.fleeGuidance("sonda")).toBeNull();
    const before = w.projectiles.length;
    run(w, 20);
    expect(w.projectiles.length).toBeLessThanOrEqual(before);
  });

  it("a New Polana member (tier 3) also throws volatile charges that burst into fragments, and reaches the travel ship", () => {
    const m = POLANA_MEMBERS[0]!;
    const a = new Asteroid(m, Vec3.ZERO);
    const w = new AsteroidWrath([a]);
    const lander = target("lander", "aterrizador", new Vec3(0, m.meanRadiusM.value + 300, 0), { crewed: true });
    const ship = target("nodriza", "nodriza", new Vec3(m.meanRadiusM.value + 1350, 0, 0), { crewed: true });
    w.addTarget(lander.t);
    w.addTarget(ship.t);
    w.duelFailed(m.id, 3);
    run(w, 240);
    const ev = w.drainEvents();
    expect(ev.some((e) => e.type === "launched" && e.projectile.kind === "carga")).toBe(true);
    expect(ev.some((e) => e.type === "burst" && e.kind === "carga")).toBe(true);
    expect(ev.some((e) => e.type === "launched" && e.projectile.targetId === "nodriza")).toBe(true);
    expect(lander.log.damage).toBeGreaterThan(0);
  });

  it("a metallic asteroid (tier 4) fires radiation pulses: crew dose behind the shield, and puts the station in survival mode", () => {
    const a = new Asteroid(DA_1986, Vec3.ZERO);
    const w = new AsteroidWrath([a]);
    const lander = target("lander", "aterrizador", new Vec3(0, 2500, 0), { crewed: true });
    const station = target("estacion", "estacion", new Vec3(4000, 0, 0), { crewed: true });
    w.addTarget(lander.t);
    w.addTarget(station.t);
    expect(w.survival).toBe(false);
    w.duelFailed(DA_1986.id, 2);
    expect(w.survival).toBe(true);
    run(w, 60);
    expect(w.drainEvents().some((e) => e.type === "pulse")).toBe(true);
    expect(lander.log.dose + station.log.dose).toBeGreaterThan(0);
    station.log.pos = new Vec3(20_000, 0, 0);
    expect(w.survival).toBe(false);
  });

  it("a tier-5 body grips: the pull points at it and escape can be impossible", () => {
    const ceres = new Asteroid(CERES, Vec3.ZERO);
    const w = new AsteroidWrath([ceres]);
    const R = CERES.meanRadiusM.value;
    const lander = target("lander", "aterrizador", new Vec3(0, R * 1.1, 0), { crewed: true, accel: 0.33 });
    w.addTarget(lander.t);
    w.duelFailed(CERES.id, 3);
    run(w, 1);
    expect(lander.log.pulled.y).toBeLessThan(0);
    expect(w.fleeGuidance("lander")!.trapped).toBe(true);
  });

  it("refuses unknown asteroids", () => {
    expect(() => new AsteroidWrath([bennu]).duelFailed("nope", 1)).toThrow();
  });
});
