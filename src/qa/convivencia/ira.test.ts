/**
 * The asteroids' wrath (anger, chase, projectiles) crossing compressed travel, the probe and the suit
 * (docs/qa/casos.md, área CV). Wired like main: wrath and services on the mission clock.
 */
import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { BENNU } from "@modules/celestial/data/bennu";
import { AsteroidWrath } from "@modules/asteroid-wrath/application/wrath";
import { TravelClock, TRAVEL_TIME, legBudgets } from "@modules/navigation/domain/travel-time";
import { frames, servicesWorld, wrathTarget } from "./mundo";

/** Wrath and services over the same bodies, as main wires them (WrathMode and LevelsUi). */
function angryWorld() {
  let wrath: AsteroidWrath | undefined;
  const w = servicesWorld({ wrath: { anger: (id) => wrath!.anger(id), pursuit: (id) => wrath!.pursuit(id) } });
  wrath = new AsteroidWrath([w.bennu, w.member]);
  return { ...w, wrath };
}

describe("CV · ira de los asteroides con otros procesos", () => {
  it("CV-06 ira durante un viaje de la nodriza: el módulo acoplado no es blanco, nadie persigue y la ira se apaga en el reloj de misión", () => {
    const w = angryWorld();
    let docked = true;
    const lander = wrathTarget("aterrizador", "aterrizador", new Vec3(250, 120, 1600), { active: () => !docked });
    w.wrath.addTarget(lander.t);
    w.wrath.duelFailed(BENNU.id, 2);
    expect(w.wrath.pursuit(BENNU.id)).toBeUndefined();
    const home = w.bennu.position;
    // 30 s of a ×600 hop: 5 h of mission clock, far beyond Bennu's time to calm (≈2 min).
    frames(30, 1 / 60, 600, (c) => {
      w.wrath.update(c.missionS);
      w.frame(c);
    });
    expect(w.wrath.anger(BENNU.id)).toBe(0);
    expect(w.services.mode(BENNU.id)).toBe("en-casa");
    expect(w.bennu.position.sub(home).length()).toBeLessThan(1);
    expect(w.services.drainEvents().some((e) => e.type === "persigue")).toBe(false);
    expect(lander.log.damage).toBe(0);
    docked = false;
  });

  it("CV-06 si el módulo se desacopla con el asteroide aún furioso, la persecución empieza entonces", () => {
    const w = angryWorld();
    let docked = true;
    w.wrath.addTarget(wrathTarget("aterrizador", "aterrizador", new Vec3(250, 120, 1600), { active: () => !docked }).t);
    w.wrath.duelFailed(BENNU.id, 2);
    frames(1, 1 / 60, 1, (c) => (w.wrath.update(c.missionS), w.frame(c)));
    expect(w.services.mode(BENNU.id)).not.toBe("persigue");
    docked = false;
    frames(1, 1 / 60, 1, (c) => (w.wrath.update(c.missionS), w.frame(c)));
    expect(w.services.mode(BENNU.id)).toBe("persigue");
  });

  // B-02: AsteroidWrath.update keeps at most 60 s of game time per call. A long mothership hop plays
  // above ×600 (the cap shared with the lander's leg), and below 10 fps main's frame is capped at 0,1 s:
  // more than 60 s of mission clock per frame, and the anger falls behind it.
  it.fails("CV-07 a pocos fps y cámara rápida de más de ×600 la ira se apaga al ritmo del reloj de misión (B-02)", () => {
    // Mothership 30 km (≈9,1 h) plus the lander's last 2 min: the cap is shared, the hop plays above ×600.
    const [carrierS] = legBudgets([
      { gameS: 9.1 * 3600, lapse: TRAVEL_TIME.lapse.carrier },
      { gameS: 120, lapse: TRAVEL_TIME.lapse.lander },
    ]);
    const lapse = new TravelClock(9.1 * 3600, carrierS!).lapse();
    expect(lapse).toBeGreaterThan(600);
    const member = servicesWorld().member;
    const id = member.data.id;
    const slow = new AsteroidWrath([member]);
    const fine = new AsteroidWrath([member]);
    slow.duelFailed(id, 3);
    fine.duelFailed(id, 3);
    // Five frames at 5 fps (main caps dt at 0,1 s) against the same mission time in small steps.
    for (let i = 0; i < 5; i++) slow.update(0.1 * lapse);
    for (let i = 0; i < 50; i++) fine.update(0.01 * lapse);
    expect(slow.anger(id)).toBeCloseTo(fine.anger(id), 6);
  });

  it("CV-12 un duelo de la sonda falla con el módulo volando cerca: el asteroide persigue a la sonda, no al módulo", () => {
    const w = angryWorld();
    let probeOut = true;
    const lander = wrathTarget("aterrizador", "aterrizador", new Vec3(0, 0, 600));
    const probe = wrathTarget("sonda", "sonda", new Vec3(0, 900, 0), { active: () => probeOut });
    w.wrath.addTarget(lander.t);
    w.wrath.addTarget(probe.t);
    w.wrath.duelFailed(BENNU.id, 1);
    expect(w.wrath.pursuit(BENNU.id)?.targetId).toBe("sonda");
    // The probe is lost (or abandoned): nobody it is angry with is out, so it stays put, still angry.
    probeOut = false;
    expect(w.wrath.pursuit(BENNU.id)).toBeUndefined();
    const at = w.bennu.position;
    frames(5, 1 / 60, 1, (c) => (w.wrath.update(c.missionS), w.frame(c)));
    expect(w.wrath.anger(BENNU.id)).toBeGreaterThan(0);
    expect(w.bennu.position.sub(at).length()).toBeLessThan(1);
  });

  it("CV-13 fase 3 fallada con Doménica fuera: persigue al traje o al módulo, pero no se les echa encima (se queda a su distancia)", () => {
    const w = angryWorld();
    const r = w.bennu.meanRadiusM;
    // The suit stage failed: she was thrown a few metres off; the lander is anchored on the surface.
    const suit = wrathTarget("traje", "traje", new Vec3(0, r + 6, 0));
    const lander = wrathTarget("aterrizador", "aterrizador", new Vec3(r + 2, 0, 0));
    w.wrath.addTarget(suit.t);
    w.wrath.addTarget(lander.t);
    w.wrath.duelFailed(BENNU.id, 3);
    const p = w.wrath.pursuit(BENNU.id)!;
    expect(["traje", "aterrizador"]).toContain(p.targetId);
    expect(p.standoffM).toBeGreaterThan(r + 6);
    let closest = Infinity;
    frames(30, 1 / 60, 1, (c) => {
      w.wrath.update(c.missionS);
      w.frame(c);
      closest = Math.min(closest, suit.log.pos.sub(w.bennu.position).length(), lander.log.pos.sub(w.bennu.position).length());
    });
    // Inside its standoff it only matches their speed (here, at rest): it never closes in on them.
    expect(closest).toBeGreaterThanOrEqual(r + 2 - 1e-6);
    expect(w.services.mode(BENNU.id)).toBe("persigue");
  });
});
