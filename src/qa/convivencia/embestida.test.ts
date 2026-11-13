/**
 * The ram (docs/design/poderes-ira.md, «Embestida») crossing compressed travel (docs/qa/casos.md, CV-17).
 * Wired like main: wrath and services on the mission clock of `frameClocks`.
 */
import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { BENNU } from "@modules/celestial/data/bennu";
import { AsteroidWrath, type WrathEvent } from "@modules/asteroid-wrath/application/wrath";
import { RAM } from "@modules/asteroid-wrath/domain/ram";
import { frames, servicesWorld, wrathTarget } from "./mundo";

/** Wrath and services over the same bodies, with a lander of the starting design's mass (1649 kg). */
function world(active: () => boolean) {
  let wrath: AsteroidWrath | undefined;
  const w = servicesWorld({ wrath: { anger: (id) => wrath!.anger(id), pursuit: (id) => wrath!.pursuit(id) } });
  wrath = new AsteroidWrath([w.bennu, w.member]);
  const lander = wrathTarget("aterrizador", "aterrizador", new Vec3(0, 0, w.bennu.meanRadiusM + 300), { active });
  const t = { ...lander.t, radiusM: 3, massKg: () => 1649, pull: (dv: Vec3) => (lander.log.vel = lander.log.vel.add(dv)) };
  wrath.addTarget(t);
  return { ...w, wrath, lander };
}

/** Frames of main for `realS` real seconds at a trip lapse; returns the events with the real time they came at. */
function play(w: ReturnType<typeof world>, realS: number, lapse: number): { atS: number; e: WrathEvent }[] {
  const out: { atS: number; e: WrathEvent }[] = [];
  let t = 0;
  frames(realS, 1 / 60, lapse, (c) => {
    t += 1 / 60;
    w.wrath.setAnger(BENNU.id, 1);
    w.wrath.update(c.missionS);
    w.frame(c);
    w.lander.log.pos = w.lander.log.pos.add(w.lander.log.vel.scale(c.missionS));
    for (const e of w.wrath.drainEvents()) out.push({ atS: t, e });
  });
  return out;
}

describe("CV · embestida con otros procesos", () => {
  it("CV-17 viaje de la nodriza con el módulo acoplado: no es blanco, Bennu furioso no embiste a nada", () => {
    const w = world(() => false);
    w.wrath.duelFailed(BENNU.id, 2, ["aterrizador"]);
    const ev = play(w, 5, 600);
    expect(ev.some((x) => x.e.type.startsWith("ram"))).toBe(false);
    expect(w.lander.log.damage).toBe(0);
  });

  it("CV-17 a ×1 el aviso dura sus 5 s reales y la carga desde 300 m deja tiempo para esquivar", () => {
    const w = world(() => true);
    w.wrath.duelFailed(BENNU.id, 2, ["aterrizador"]);
    const ev = play(w, 60, 1);
    const wind = ev.find((x) => x.e.type === "ram-windup")!;
    const charge = ev.find((x) => x.e.type === "ram-charge")!;
    expect(charge.atS - wind.atS).toBeCloseTo(RAM.windupS, 0);
    // Still charging (or just hit) after half a minute of real time: a sideways burn fits.
    const hit = ev.find((x) => x.e.type === "ram-hit");
    expect(hit ? hit.atS - wind.atS : Infinity).toBeGreaterThan(30);
  });

  it("CV-17 en el tramo comprimido del módulo (×60) el aviso dura menos de 0,1 s real y el choque llega en ~1 s: no se puede esquivar (HC-03)", () => {
    const w = world(() => true);
    w.wrath.duelFailed(BENNU.id, 2, ["aterrizador"]);
    const ev = play(w, 3, 60);
    const wind = ev.find((x) => x.e.type === "ram-windup")!;
    const charge = ev.find((x) => x.e.type === "ram-charge")!;
    const hit = ev.find((x) => x.e.type === "ram-hit")!;
    expect(charge.atS - wind.atS).toBeLessThan(0.1);
    expect(hit.atS - wind.atS).toBeLessThan(1.5);
    expect(w.lander.log.damage).toBeGreaterThan(0.1);
  });
});
