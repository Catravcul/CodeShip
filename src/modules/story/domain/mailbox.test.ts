import { describe, expect, it } from "vitest";
import { isCorrect } from "@modules/mind-duel/domain/exercise";
import { NEVAEH_LETTERS } from "../data/nevaeh";
import { Mailbox } from "./mailbox";

describe("mailbox", () => {
  it("the first letter is there from the start; the next arrives half a day after its mission", () => {
    const m = new Mailbox(NEVAEH_LETTERS);
    expect(m.received.map((r) => r.letter.id)).toEqual(["nano-net-numeros"]);
    expect(m.unread).toBe(1);
    expect(m.drainNew().map((l) => l.id)).toEqual(["nano-net-numeros"]);
    m.tick(3);
    expect(m.received).toHaveLength(1);
    m.completeMission("nano-net-numeros");
    m.tick(0.4);
    expect(m.received).toHaveLength(1);
    m.tick(0.2);
    expect(m.received.map((r) => r.letter.id)).toEqual(["nano-net-numeros", "nano-net-textos"]);
    expect(m.pendingMissions.map((l) => l.id)).toEqual(["nano-net-textos"]);
  });

  it("a jolt brings Nevaeh's worried letter once", () => {
    const m = new Mailbox(NEVAEH_LETTERS);
    m.notify("sacudida");
    m.notify("sacudida");
    expect(m.received.filter((r) => r.letter.id === "sacudida")).toHaveLength(1);
    m.read("sacudida");
    expect(m.unread).toBe(1);
  });

  it("every mission is solvable: tokens in order make `let name = value`", () => {
    for (const l of NEVAEH_LETTERS)
      for (const e of l.mission?.exercises ?? []) {
        expect(isCorrect(e, e.kind === "order" ? { kind: "order", order: e.solution } : { kind: "choice", index: e.correct })).toBe(true);
        if (e.kind === "order") expect(e.blocks[0]!.js).toBe("let");
      }
  });
});
