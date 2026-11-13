import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { DA_1986, CERES } from "../data/reference-bodies";
import { COMETS } from "@modules/celestial/data/comets";
import { HULL_ENERGY_J, PROBE_ELECTRONICS_TOLERANCE_MSV, type Protection } from "../domain/protection";
import type { TargetKind } from "../domain/power";
import { chaseProfile, stepCharge, stepDrive } from "@modules/celestial/domain/gravity-drive";
import { RAM, reducedMassKg } from "../domain/ram";
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

  it("an angry comet fires outgassing jets: dust on the target and a push away from it", () => {
    const c67p = new Asteroid(COMETS.find((c) => c.id === "67p")!, Vec3.ZERO);
    const w = new AsteroidWrath([c67p]);
    const probe = target("sonda", "sonda", new Vec3(0, c67p.meanRadiusM + 300, 0));
    w.addTarget({ ...probe.t, massKg: () => 30 });
    w.duelFailed("67p", 3);
    run(w, 60);
    const jets = w.drainEvents().filter((e) => e.type === "jet");
    expect(jets.length).toBeGreaterThan(0);
    const j = jets[0]!;
    if (j.type !== "jet") throw new Error();
    expect(j.interceptedKg).toBeGreaterThan(0);
    expect(j.deltaVMs).toBeGreaterThan(0);
    // The push points away from the comet.
    expect(probe.log.pulled.y).toBeGreaterThan(0);
    expect(probe.log.causes).toContain("chorro");
  });

  it("chases the craft that enraged it (the nearest active one) until it calms down", () => {
    const b = new Asteroid(BENNU, Vec3.ZERO);
    const w = new AsteroidWrath([b]);
    const probe = target("sonda", "sonda", new Vec3(0, 900, 0));
    const lander = target("aterrizador", "aterrizador", new Vec3(0, 0, 400), { crewed: true });
    w.addTarget(probe.t);
    w.addTarget(lander.t);
    expect(w.pursuit(BENNU.id)).toBeUndefined();
    // Phase 2 (lander): it chases the lander, not the probe.
    w.duelFailed(BENNU.id, 2);
    const p = w.pursuit(BENNU.id)!;
    expect(p.targetId).toBe("aterrizador");
    expect(p.standoffM).toBeGreaterThan(b.meanRadiusM);
    // Phase 3 offends both the suit and the lander; an explicit list overrides the phase.
    w.duelFailed(BENNU.id, 1, ["sonda"]);
    expect(w.pursuit(BENNU.id)!.targetId).toBe("aterrizador");
    lander.log.pos = new Vec3(0, 0, 5000);
    expect(w.pursuit(BENNU.id)!.targetId).toBe("sonda");
    run(w, 600);
    expect(w.anger(BENNU.id)).toBe(0);
    expect(w.pursuit(BENNU.id)).toBeUndefined();
  });

  describe("ram (embestida)", () => {
    const LANDER_KG = 6000;
    /** A craft that moves: `vel` can be changed mid-run (a sideways burn). */
    function craft(position: Vec3, opts: { landed?: boolean; kind?: TargetKind } = {}) {
      const log = { damage: 0, pos: position, vel: Vec3.ZERO, pulled: Vec3.ZERO, landed: !!opts.landed };
      const kind = opts.kind ?? "aterrizador";
      const t: WrathTarget = {
        id: kind,
        kind,
        name: kind,
        radiusM: 3,
        position: () => log.pos,
        velocity: () => log.vel,
        active: () => true,
        protection: () => ({ hullEnergyJ: HULL_ENERGY_J[kind], debrisFactor: 0.5, radiation: { material: "aluminio", arealDensityGcm2: 1 } }),
        damage: (f) => (log.damage += f),
        pull: (dv) => {
          log.landed = false;
          log.pulled = log.pulled.add(dv);
          log.vel = log.vel.add(dv);
        },
        landed: () => log.landed,
        massKg: () => LANDER_KG,
      };
      return { t, log };
    }
    /** The gravity drive as the services module flies it: chase, or sprint while charging. */
    function fly(w: AsteroidWrath, b: Asteroid, c: ReturnType<typeof craft>, seconds: number, each?: (t: number) => void) {
      for (let i = 0; i < seconds * 10; i++) {
        const p = w.pursuit(b.data.id);
        const s = { position: b.position, velocity: b.velocity };
        const next = p?.charge?.phase === "embistiendo" ? stepCharge(s, p.charge.direction, p.charge, 0.1) : p ? stepDrive(s, { position: p.position(), velocity: p.velocity() }, chaseProfile(b.massKg, w.anger(b.data.id)), 0.1, p.standoffM) : s;
        b.moveTo(next.position, next.velocity);
        c.log.pos = c.log.pos.add(c.log.vel.scale(0.1));
        w.update(0.1);
        each?.(i / 10);
      }
    }

    it("a fast asteroid closes in, warns, winds up without throwing, then charges and hits through the hull", () => {
      const b = new Asteroid(BENNU, Vec3.ZERO);
      const w = new AsteroidWrath([b]);
      const c = craft(new Vec3(0, 0, b.meanRadiusM + 600));
      w.addTarget(c.t);
      // Tier 2 powers on Bennu's real mass: it would throw at the lander if it were not charging.
      w.demoTier(BENNU.id, 2);
      w.duelFailed(BENNU.id, 2, ["aterrizador"]);
      w.setAnger(BENNU.id, 1);
      // Ram-prone: it closes to its charge gap, not to 40 % of its reach.
      expect(w.pursuit(BENNU.id)!.standoffM).toBeCloseTo(b.meanRadiusM + RAM.chargeGapM, 6);
      const events: ReturnType<AsteroidWrath["drainEvents"]> = [];
      fly(w, b, c, 200, () => {
        events.push(...w.drainEvents());
        w.setAnger(BENNU.id, 1);
      });
      const windup = events.find((e) => e.type === "ram-windup");
      expect(windup).toBeDefined();
      const iWind = events.indexOf(windup!);
      const iCharge = events.findIndex((e) => e.type === "ram-charge");
      expect(iCharge).toBeGreaterThan(iWind);
      // Committed: nothing is thrown at it from the warning to the impact.
      const iHit = events.findIndex((e) => e.type === "ram-hit");
      expect(iHit).toBeGreaterThan(iCharge);
      expect(events.slice(iWind, iHit).some((e) => e.type === "launched")).toBe(false);
      const hit = events[iHit]!;
      if (hit.type !== "ram-hit") throw new Error();
      // ½·μ·v² with μ ≈ the lander's mass, the hull takes what the bounce does not return (blunt: no shield help).
      const mu = reducedMassKg(b.massKg, LANDER_KG);
      expect(hit.energyJ).toBeGreaterThan(0.5 * mu * hit.closingMs ** 2 * 0.99);
      expect(hit.fraction).toBeCloseTo((0.5 * mu * hit.closingMs ** 2 * (1 - RAM.restitution ** 2)) / HULL_ENERGY_J.aterrizador, 3);
      expect(c.log.damage).toBeGreaterThanOrEqual(hit.fraction);
      expect(hit.closingMs).toBeGreaterThan(5);
      // Knocked away from the asteroid at (1+e)·v.
      expect(c.log.pulled.length()).toBeCloseTo((1 + RAM.restitution) * hit.closingMs * (mu / LANDER_KG), 3);
      expect(c.log.pulled.z).toBeGreaterThan(0);
    });

    it("a sideways burn after the warning makes it miss: it overshoots and needs time to turn around", () => {
      const b = new Asteroid(BENNU, Vec3.ZERO);
      const w = new AsteroidWrath([b]);
      const c = craft(new Vec3(0, 0, b.meanRadiusM + 250));
      w.addTarget(c.t);
      w.duelFailed(BENNU.id, 2, ["aterrizador"]);
      w.setAnger(BENNU.id, 1);
      const events: ReturnType<AsteroidWrath["drainEvents"]> = [];
      let dodging = false;
      let angerAtMiss = 0;
      fly(w, b, c, 120, () => {
        const e = w.drainEvents();
        events.push(...e);
        if (e.some((x) => x.type === "ram-miss")) angerAtMiss = w.anger(BENNU.id);
        // The player sees the line and burns sideways: 1 m/s² for a few seconds is plenty against 4 s of wind-up and a slow sprint.
        if (!dodging && e.some((x) => x.type === "ram-charge")) dodging = true;
        if (dodging && c.log.vel.x < 20) c.log.vel = c.log.vel.add(new Vec3(0.1, 0, 0));
      });
      expect(events.some((e) => e.type === "ram-hit")).toBe(false);
      const miss = events.find((e) => e.type === "ram-miss");
      expect(miss).toBeDefined();
      if (miss?.type !== "ram-miss") throw new Error();
      expect(miss.turnaroundS).toBeCloseTo((2 * miss.speedMs) / chaseProfile(b.massKg, angerAtMiss).accelMs2, 0);
      expect(miss.stopM).toBeGreaterThan(100);
      expect(c.log.damage).toBe(0);
      // No new wind-up while it turns around.
      expect(events.filter((e) => e.type === "ram-windup")).toHaveLength(1);
      expect(w.ram(BENNU.id)).toBeUndefined();
    });

    it("a huge slow body never charges: it holds at 40 % of its reach and throws", () => {
      const big = POLANA_MEMBERS.reduce((a, m) => (m.massKg.value > a.massKg.value ? m : a));
      const b = new Asteroid(big, Vec3.ZERO);
      const w = new AsteroidWrath([b]);
      const c = craft(new Vec3(0, 0, b.meanRadiusM + 200));
      w.addTarget(c.t);
      w.duelFailed(big.id, 2, ["aterrizador"]);
      w.setAnger(big.id, 1);
      expect(w.pursuit(big.id)!.standoffM).toBeGreaterThan(b.meanRadiusM + 1000);
      const events: ReturnType<AsteroidWrath["drainEvents"]> = [];
      fly(w, b, c, 30, () => events.push(...w.drainEvents()));
      expect(events.some((e) => e.type === "ram-windup")).toBe(false);
      expect(events.some((e) => e.type === "launched")).toBe(true);
    });

    it("does not charge a craft fleeing faster than it can close", () => {
      const b = new Asteroid(BENNU, Vec3.ZERO);
      const w = new AsteroidWrath([b]);
      const c = craft(new Vec3(0, 0, b.meanRadiusM + 250));
      c.log.vel = new Vec3(0, 0, 9);
      w.addTarget(c.t);
      w.duelFailed(BENNU.id, 2, ["aterrizador"]);
      w.setAnger(BENNU.id, 1);
      w.update(0.5);
      expect(w.drainEvents().some((e) => e.type === "ram-windup")).toBe(false);
    });

    it("shakes off a craft landed on it instead of ramming it", () => {
      const b = new Asteroid(BENNU, Vec3.ZERO);
      const w = new AsteroidWrath([b]);
      const c = craft(new Vec3(0, b.meanRadiusM + 1, 0), { landed: true });
      w.addTarget(c.t);
      w.duelFailed(BENNU.id, 2, ["aterrizador"]);
      w.setAnger(BENNU.id, 1);
      w.update(0.5);
      const e = w.drainEvents();
      expect(e.some((x) => x.type === "shaken")).toBe(true);
      expect(e.some((x) => x.type === "ram-windup")).toBe(false);
      expect(c.log.pulled.y).toBeCloseTo(RAM.shakeOffMs, 6);
      expect(c.log.damage).toBe(0);
    });
  });
});
