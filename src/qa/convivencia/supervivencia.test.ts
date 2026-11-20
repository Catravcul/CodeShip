/**
 * Survival mode (docs/design/poderes-ira.md §5): the station flees an angry asteroid under its own
 * engines while everything that feeds its store keeps arriving (docs/qa/casos.md, área CV).
 * Wired like WrathMode.moveStation: the escape moves the station and whatever follows it.
 */
import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { AsteroidWrath } from "@modules/asteroid-wrath/application/wrath";
import { StationEscape } from "@modules/asteroid-wrath/application/station-escape";
import { POLANA_DRIVE } from "@modules/station/data/drive";
import { frames, servicesWorld, wrathTarget } from "./mundo";

const MEMBER = POLANA_MEMBERS[0]!;

function survivalWorld() {
  let wrath: AsteroidWrath | undefined;
  const w = servicesWorld({ wrath: { anger: (id) => wrath!.anger(id), pursuit: (id) => wrath!.pursuit(id) } });
  wrath = new AsteroidWrath([w.bennu, w.member]);
  const escape = new StationEscape(POLANA_DRIVE, w.station.position);
  const station = wrathTarget("estacion", "estacion", w.station.position, { crewed: true });
  // The station target reads the live position, like WrathMode's.
  station.t.position = () => w.station.position;
  wrath.addTarget(station.t);
  const frame = (c: Parameters<typeof w.frame>[0]) => {
    wrath!.update(c.missionS);
    const flee = wrath!.survival ? wrath!.fleeGuidance("estacion") : null;
    w.station.moveTo(escape.update(c.missionS, flee));
    w.frame(c);
  };
  return { ...w, wrath, escape, frame };
}

describe("CV · modo supervivencia con entregas en camino", () => {
  it("CV-09 la estación huye mientras llegan un pedido del Santuario y los lotes de un asteroide de nivel 4 aparcado, que la sigue", () => {
    const w = survivalWorld();
    w.book.of(MEMBER.id).setLevel(4);
    // The level-4 member flies to the station and parks (a few minutes of game time).
    frames(400, 0.25, 1, w.frame);
    expect(w.services.mode(MEMBER.id)).toBe("aparcado");
    const offset = w.member.position.sub(w.station.position);
    const start = w.station.position;
    // An order from the Sanctuary is on its way, and Bennu (with tier-4 powers, the demo hook) is enraged.
    w.inbox.send("santuario", "Pedido de prueba", { xenon: 40 }, 2);
    w.wrath.demoTier(BENNU.id, 4);
    w.wrath.duelFailed(BENNU.id, 2);
    expect(w.wrath.survival).toBe(true);
    frames(120, 0.25, 1, w.frame);
    expect(w.escape.state).toBe("huyendo");
    expect(w.station.position.sub(start).length()).toBeGreaterThan(50);
    // The order landed in the store although the station moved.
    expect(w.station.stock.amount("xenon")).toBeCloseTo(40, 6);
    // The parked asteroid rode along at its spot and kept handing over its rock.
    expect(w.member.position.sub(w.station.position).sub(offset).length()).toBeLessThan(1e-6);
    expect(w.storedKg()).toBeGreaterThan(40 + 500);
  });

  it("CV-09 cuando la ira se apaga la estación frena y se queda donde llegó; las entregas siguen llegando", () => {
    const w = survivalWorld();
    w.wrath.demoTier(BENNU.id, 4);
    w.wrath.duelFailed(BENNU.id, 2);
    frames(60, 0.25, 1, w.frame);
    w.wrath.setAnger(BENNU.id, 0);
    w.inbox.send("santuario", "Pedido de prueba", { xenon: 10 }, 1);
    frames(600, 0.25, 1, w.frame);
    expect(w.wrath.survival).toBe(false);
    expect(w.escape.state).toBe("en-reposo");
    expect(w.station.stock.amount("xenon")).toBeCloseTo(10, 6);
    expect(w.station.position.sub(new Vec3(-450, 150, 1100)).length()).toBeGreaterThan(0);
  });
});
