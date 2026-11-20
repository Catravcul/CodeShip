import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { ECLSS_MACHINES } from "@modules/life-support/data/eclss-machines";
import { STATION_LIFE_SUPPORT } from "@modules/life-support/data/hosts";
import { LM_LIFE_SUPPORT } from "@modules/life-support/data/lm-ecs";
import { LifeSupport } from "@modules/life-support/domain/life-support";
import { OpenLoopEcs } from "@modules/life-support/domain/open-loop";
import { CrewMember } from "@modules/crew/domain/crew-member";
import { RingAquarium } from "@modules/sanctuary/domain/aquarium";
import { Wallet } from "@modules/imports/domain/wallet";
import { MissionLog } from "@modules/missions/domain/mission";
import { NEVAEH_MISSIONS } from "@modules/missions/data/nevaeh-missions";
import { RapportBook } from "@modules/subjugation/domain/rapport";
import { MaterialStock } from "@modules/station/domain/materials";
import { Ship } from "@modules/ship/domain/ship";
import { lunarModuleDesign } from "@modules/ship/data/apollo-lm";
import { FlightComputer } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Mailbox } from "@modules/story/domain/mailbox";
import { STORY } from "@modules/story/data/nevaeh";

/** Through the stored text and back, as a saved game does. */
const viaText = <T>(v: T): unknown => JSON.parse(JSON.stringify(v));

describe("what a saved game keeps comes back the same (snapshot → text → restore)", () => {
  it("a vehicle's life support: air, water, food, tanks, wear, failures and spares", () => {
    const a = new LifeSupport(ECLSS_MACHINES, STATION_LIFE_SUPPORT, { wear: true });
    a.advance(30);
    a.fail("oga-bomba");
    a.drawMeal(0.6);
    a.restock({ waterKg: 12, spares: { "oru-bomba-oga": 2 } });
    const b = new LifeSupport(ECLSS_MACHINES, STATION_LIFE_SUPPORT, { wear: true });
    b.restore(viaText(a.snapshot()));
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.readout()).toEqual(a.readout());
    expect(b.active().map((f) => f.id)).toEqual(["oga-bomba"]);
    // And it goes on the same way.
    a.advance(5);
    b.advance(5);
    expect(b.readout()).toEqual(a.readout());
  });

  it("a broken or unknown life-support field keeps the new game's value", () => {
    const fresh = new LifeSupport(ECLSS_MACHINES, STATION_LIFE_SUPPORT);
    const b = new LifeSupport(ECLSS_MACHINES, STATION_LIFE_SUPPORT);
    b.restore({ water: "mucha", failed: ["no-existe"], worn: { "no-existe": 3 }, food: Number.NaN });
    expect(b.readout()).toEqual(fresh.readout());
    expect(() => b.restore(null)).not.toThrow();
  });

  it("the LM's open-loop life support", () => {
    const a = new OpenLoopEcs(LM_LIFE_SUPPORT);
    a.advance(8);
    const b = new OpenLoopEcs(LM_LIFE_SUPPORT);
    b.restore(viaText(a.snapshot()));
    expect(b.readout()).toEqual(a.readout());
  });

  it("Doménica's needs", () => {
    const a = new CrewMember("Doménica");
    a.tick(0.7, 0.2, 0);
    const b = new CrewMember("Doménica");
    b.restore(viaText(a.snapshot()));
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.hungry).toBe(a.hungry);
  });

  it("an aquarium and the animals adopted into it", () => {
    const a = new RingAquarium({ fish: 0, snails: 0 });
    a.stock("banco", 6, "los peces cebra");
    a.stock("caracoles", 3);
    a.tick(1.5);
    const b = new RingAquarium({ fish: 0, snails: 0 });
    b.restore(viaText(a.snapshot()));
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.fishName).toBe("los peces cebra");
    expect(b.fishCount).toBe(6);
  });

  it("the credits and the missions done", () => {
    const w = new Wallet(1000);
    w.spend(300, "pedido");
    const w2 = new Wallet(1000);
    w2.restore(viaText(w.snapshot()));
    expect(w2.balance).toBe(700);
    expect(w2.history).toEqual(w.history);

    const targets = NEVAEH_MISSIONS.map((m) => ({ id: m.target.id, name: m.target.name })).concat([{ id: "otro", name: "Otro" }]);
    const log = new MissionLog(NEVAEH_MISSIONS, targets);
    const first = NEVAEH_MISSIONS[0]!.target.id;
    log.update((id) => id === first || id === "otro");
    const log2 = new MissionLog(NEVAEH_MISSIONS, targets);
    log2.restore(viaText(log.snapshot()));
    expect(log2.snapshot()).toEqual(log.snapshot());
    expect(log2.active?.id).toBe(log.active?.id);
    expect(log2.isSideDone("otro")).toBe(true);
  });

  it("Nevaeh's letters: what arrived, what was read and done; nothing comes again as new", () => {
    const a = new Mailbox(STORY);
    a.drainNew();
    a.tick(3);
    const first = a.received[0]!.letter;
    a.read(first.id);
    const b = new Mailbox(STORY);
    b.restore(viaText(a.snapshot()));
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.drainNew()).toEqual([]);
    expect(b.unread).toBe(a.unread);
  });

  it("each asteroid's rapport (persuaded, subjugated, levels)", () => {
    const a = new RapportBook();
    a.of("bennu").succeed("sonda");
    a.of("bennu").succeed("nave");
    a.of("ryugu").fail();
    const b = new RapportBook();
    b.restore(viaText(a.snapshot()));
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.of("bennu").next).toBe("traje");
  });

  it("the station's store", () => {
    const a = new MaterialStock({ hierro: 120, agua: 40 });
    a.take({ agua: 15 });
    const b = new MaterialStock({ hierro: 999, oro: 1 });
    b.restore(viaText(a.snapshot()));
    expect(b.snapshot()).toEqual({ hierro: 120, agua: 25 });
  });

  it("the LM's propellant and hull, never past its tanks", () => {
    const a = Ship.create(lunarModuleDesign());
    a.damage(0.25);
    const p = a.propellants[0]!;
    const b = Ship.create(lunarModuleDesign());
    b.restore(viaText(a.snapshot()));
    expect(b.hullIntegrity).toBeCloseTo(0.75);
    expect(b.propellantKg(p)).toBe(a.propellantKg(p));
    b.restore({ fuel: { [p]: 1e12 } });
    expect(b.propellantKg(p)).toBe(b.propellantCapacityKg(p));
  });

  it("CV-16 the flight computer goes back to the saved state and clock, free: a craft saved half-way through a trip comes back where it was, with its velocity, not flying the trip", () => {
    const ship = Ship.create(lunarModuleDesign());
    const f = new FlightComputer(ship, RigidBodyState.at(Vec3.ZERO), { gravitySources: [] });
    const s = new RigidBodyState(new Vec3(10, 20, 30), new Vec3(0.1, 0, 0), Quat.fromAxisAngle(Vec3.Y, 0.5), new Vec3(0, 0.01, 0));
    f.restore(s, 1234);
    expect(f.state.position).toEqual(s.position);
    expect(f.state.velocity).toEqual(s.velocity);
    expect(f.simTimeS).toBe(1234);
    expect(f.landed || f.docked).toBe(false);
  });
});
