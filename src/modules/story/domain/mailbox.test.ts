import { describe, expect, it } from "vitest";
import { NEVAEH_LETTERS, faultLetter } from "../data/nevaeh";
import { Mailbox } from "./mailbox";

describe("mailbox", () => {
  it("the first letter is there from the start; the next arrives a quarter day after its mission", () => {
    const m = new Mailbox(NEVAEH_LETTERS);
    expect(m.received.map((r) => r.letter.id)).toEqual(["nano-net-nucleo"]);
    expect(m.unread).toBe(1);
    expect(m.drainNew().map((l) => l.id)).toEqual(["nano-net-nucleo"]);
    m.tick(3);
    expect(m.received).toHaveLength(1);
    m.achieve("nucleo");
    m.tick(0.2);
    expect(m.received).toHaveLength(1);
    m.tick(0.1);
    expect(m.received.map((r) => r.letter.id)).toEqual(["nano-net-nucleo", "nano-net-generar"]);
    expect(m.pendingMissions.map((l) => l.id)).toEqual(["nano-net-generar"]);
  });

  it("the letters follow the core's stages: núcleo → generar → mover → cubrir → enlazar", () => {
    const m = new Mailbox(NEVAEH_LETTERS);
    for (const g of ["nucleo", "generar", "mover", "cubrir", "enlazar"] as const) {
      expect(m.pendingMissions.map((l) => l.mission!.goal)).toEqual([g]);
      m.achieve(g);
      m.tick(0.3);
    }
    expect(m.pendingMissions).toHaveLength(0);
  });

  it("a stage done before its letter arrives comes already done", () => {
    const m = new Mailbox(NEVAEH_LETTERS);
    m.achieve("nucleo");
    m.achieve("generar");
    m.tick(0.3);
    expect(m.received.find((r) => r.letter.id === "nano-net-generar")?.missionDone).toBe(true);
    m.tick(0.3);
    expect(m.pendingMissions.map((l) => l.id)).toEqual(["nano-net-mover"]);
  });

  it("a fault letter asks to repair that fault; only repairing that one completes it", () => {
    const m = new Mailbox(NEVAEH_LETTERS);
    const l = faultLetter({ faultId: "nodo-bennu-n3", coreName: "101955 Bennu", what: "el nodo N3 (escudo)" }, 1);
    m.post(l);
    m.post(l);
    expect(m.received.filter((r) => r.letter.id === l.id)).toHaveLength(1);
    expect(l.mission?.goal).toBe("reparar");
    m.achieve("reparar", "programa-bennu");
    expect(m.pendingMissions.map((x) => x.id)).toContain(l.id);
    m.achieve("reparar", "nodo-bennu-n3");
    expect(m.pendingMissions.map((x) => x.id)).not.toContain(l.id);
  });

  it("a jolt brings Nevaeh's worried letter once", () => {
    const m = new Mailbox(NEVAEH_LETTERS);
    m.notify("sacudida");
    m.notify("sacudida");
    expect(m.received.filter((r) => r.letter.id === "sacudida")).toHaveLength(1);
    m.read("sacudida");
    expect(m.unread).toBe(1);
  });

  it("no mission is done on the ship's panel any more: each one points to the nano_net", () => {
    for (const l of NEVAEH_LETTERS) if (l.mission) expect(l.mission.where).toMatch(/aterriza/i);
  });
});
