import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { chaseProfile, driveTripS, transitProfile } from "@modules/celestial/domain/gravity-drive";
import { RapportBook } from "../domain/rapport";
import { packageKg, shipPackage, stationPackage } from "../domain/yields";
import { AsteroidServices, SERVICE_TUNING, type PursuitPort, type ServiceDeps } from "./asteroid-services";

const DAY_S = 40;

function world(opts: { anchored?: boolean; scale?: (eta: number) => number; wrath?: PursuitPort } = {}) {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const member = new Asteroid(POLANA_MEMBERS[0]!, new Vec3(-4200, 900, -9000));
  const book = new RapportBook();
  const sent: { source: string; label: string; goods: Readonly<Record<string, number>>; hours: number }[] = [];
  const hold: number[] = [];
  let stationPos = new Vec3(-450, 150, 1100);
  const deps: ServiceDeps = {
    rapport: book,
    station: {
      position: () => stationPos,
      radiusM: () => 66,
      send: (source, label, goods, hours) => sent.push({ source, label, goods, hours }),
      goods: (p) => Object.fromEntries(p.map((c) => [c.material, c.kg])),
    },
    ship: { position: () => new Vec3(250, 120, 1600), load: (p) => (hold.push(packageKg(p)), packageKg(p)) },
    wrath: opts.wrath,
    anchoredOn: () => !!opts.anchored,
    secondsPerDay: DAY_S,
    stationHoursPerSecond: 24 / DAY_S,
    travelTimeScale: opts.scale,
  };
  const s = new AsteroidServices([bennu, member], deps);
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1) s.update(1);
  };
  return { bennu, member, book, sent, hold, s, run, moveStation: (p: Vec3) => (stationPos = p), stationPos: () => stationPos, deps };
}

describe("what subjugated asteroids do, level by level", () => {
  it("below level 2 nothing is sent and nothing moves", () => {
    const w = world();
    w.book.of(BENNU.id).setLevel(1);
    w.run(3 * DAY_S);
    expect(w.sent).toHaveLength(0);
    expect(w.hold).toHaveLength(0);
    expect(w.bennu.position).toEqual(Vec3.ZERO);
    expect(w.s.mode(BENNU.id)).toBe("en-casa");
  });

  it("level 2: a package of its own rock reaches the travel ship's hold every game day, after flying there", () => {
    const w = world();
    w.book.of(BENNU.id).setLevel(2);
    w.run(DAY_S + 1);
    expect(w.s.packagesInFlight(BENNU.id)).toBe(1);
    expect(w.hold).toHaveLength(0);
    const flightS = new Vec3(250, 120, 1600).length() / SERVICE_TUNING.packageSpeedMs;
    w.run(Math.ceil(flightS) + 1);
    expect(w.hold).toHaveLength(1);
    expect(w.hold[0]).toBeCloseTo(packageKg(shipPackage(BENNU)), 6);
    expect(w.s.drainEvents().some((e) => e.type === "paquete-nave")).toBe(true);
  });

  it("level 3: a bigger package to the station's inbox every game day, with its flight hours", () => {
    const w = world();
    w.book.of(POLANA_MEMBERS[0]!.id).setLevel(3);
    w.run(2 * DAY_S + 1);
    expect(w.sent).toHaveLength(2);
    const kg = Object.values(w.sent[0]!.goods).reduce((a, b) => a + b, 0);
    expect(kg).toBeCloseTo(packageKg(stationPackage(POLANA_MEMBERS[0]!)), 6);
    expect(kg).toBeGreaterThan(4000);
    expect(w.sent[0]!.hours).toBeGreaterThan(0);
    expect(w.hold).toHaveLength(0);
  });

  it("level 4: waits while something is anchored on it", () => {
    const w = world({ anchored: true });
    w.book.of(BENNU.id).setLevel(4);
    w.run(30);
    expect(w.s.mode(BENNU.id)).toBe("espera");
    expect(w.bennu.position).toEqual(Vec3.ZERO);
  });

  it("level 4: flies itself to the station at high speed, parks clear of it and is extracted lot by lot", () => {
    const w = world();
    w.book.of(BENNU.id).setLevel(4);
    w.s.update(0.25);
    expect(w.s.mode(BENNU.id)).toBe("viaja");
    const eta = w.s.etaS(BENNU.id)!;
    expect(eta).toBeGreaterThan(0);
    let top = 0;
    let t = 0;
    while (w.s.mode(BENNU.id) === "viaja" && t < 2000) {
      w.s.update(0.5);
      top = Math.max(top, w.bennu.velocity.length());
      t += 0.5;
    }
    expect(w.s.mode(BENNU.id)).toBe("aparcado");
    // Even on Bennu's short hop to the station it goes many times faster than it ever chases.
    expect(top).toBeGreaterThan(5 * chaseProfile(BENNU.massKg.value, 1).topSpeedMs);
    expect(t).toBeLessThan(eta * 1.4);
    const gap = w.bennu.position.sub(w.stationPos()).length() - 66 - w.bennu.meanRadiusM;
    expect(gap).toBeCloseTo(SERVICE_TUNING.parkGapM, 0);
    expect(w.s.drainEvents().map((e) => e.type)).toEqual(expect.arrayContaining(["sale", "llega"]));
    w.run(2 * DAY_S);
    const x = w.s.extraction(BENNU.id)!;
    expect(x.takenKg).toBeGreaterThan(0);
    expect(w.sent.length).toBeGreaterThan(0);
    expect(w.sent.every((d) => d.label.startsWith("Extracción"))).toBe(true);
    // The station flees (survival mode): the parked asteroid rides along.
    w.moveStation(w.stationPos().add(new Vec3(1000, 0, 0)));
    w.run(1);
    expect(w.bennu.position.sub(w.stationPos()).length()).toBeCloseTo(66 + SERVICE_TUNING.parkGapM + w.bennu.meanRadiusM, 0);
  });

  it("the compressed-travel hook speeds up the level-4 trip", () => {
    const plain = world();
    const fast = world({ scale: () => 10 });
    for (const w of [plain, fast]) w.book.of(POLANA_MEMBERS[0]!.id).setLevel(4);
    const time = (w: ReturnType<typeof world>) => {
      let t = 0;
      while (w.s.mode(POLANA_MEMBERS[0]!.id) !== "aparcado" && t < 5000) {
        w.s.update(1);
        t++;
      }
      return t;
    };
    const tp = time(plain);
    const tf = time(fast);
    expect(tp).toBeGreaterThan(driveTripS(9000, transitProfile(POLANA_MEMBERS[0]!.massKg.value)) * 0.8);
    expect(tf).toBeLessThan(tp / 5);
  });

  it("parks two asteroids side by side, not inside each other", () => {
    const w = world();
    w.book.of(BENNU.id).setLevel(4);
    w.book.of(POLANA_MEMBERS[0]!.id).setLevel(4);
    w.run(1500);
    expect(w.s.mode(BENNU.id)).toBe("aparcado");
    expect(w.s.mode(POLANA_MEMBERS[0]!.id)).toBe("aparcado");
    expect(w.bennu.position.sub(w.member.position).length()).toBeGreaterThan(w.bennu.meanRadiusM + w.member.meanRadiusM);
  });
});

describe("an angry asteroid chases what enraged it", () => {
  function chaser() {
    const state = { anger: 1, target: new Vec3(0, 0, 1500), velocity: Vec3.ZERO };
    const wrath: PursuitPort = {
      anger: () => state.anger,
      pursuit: (id) => (id === BENNU.id && state.anger > 0 ? { targetId: "aterrizador", targetName: "módulo", position: () => state.target, velocity: () => state.velocity, standoffM: 800 } : undefined),
    };
    return { state, w: world({ wrath }) };
  }

  it("closes in to its standoff and stops working while it chases", () => {
    const { w } = chaser();
    w.book.of(BENNU.id).setLevel(3);
    w.run(400);
    expect(w.s.mode(BENNU.id)).toBe("persigue");
    expect(new Vec3(0, 0, 1500).sub(w.bennu.position).length()).toBeLessThan(820);
    expect(w.sent).toHaveLength(0);
    expect(w.s.drainEvents()[0]).toMatchObject({ type: "persigue", targetName: "módulo" });
  });

  it("a craft faster than its chase speed outruns it", () => {
    const { w, state } = chaser();
    state.velocity = new Vec3(0, 0, 15);
    for (let t = 0; t < 300; t++) {
      state.target = state.target.add(state.velocity);
      w.s.update(1);
    }
    expect(state.target.sub(w.bennu.position).length()).toBeGreaterThan(3000);
  });

  it("once calm it flies back home and goes back to work", () => {
    const { w, state } = chaser();
    w.book.of(BENNU.id).setLevel(2);
    w.run(200);
    expect(w.bennu.position.length()).toBeGreaterThan(100);
    state.anger = 0;
    w.run(5);
    expect(w.s.mode(BENNU.id)).toBe("vuelve");
    w.run(1200);
    expect(w.s.mode(BENNU.id)).toBe("en-casa");
    expect(w.bennu.position.length()).toBeLessThan(1.01);
    expect(w.s.drainEvents().some((e) => e.type === "deja-de-perseguir")).toBe(true);
    w.run(DAY_S + 30);
    expect(w.hold.length).toBeGreaterThan(0);
  });
});
