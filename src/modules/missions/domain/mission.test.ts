import { describe, expect, it } from "vitest";
import { MissionLog, type MainMission } from "./mission";

const mission = (id: string, playable = true): MainMission => ({
  id,
  chapter: 1,
  chapterTitle: "c",
  target: { id: `t-${id}`, name: id, kind: "asteroide" },
  title: id,
  why: "",
  facts: [],
  letterId: `l-${id}`,
  playable,
});
const persuaded = (...ids: string[]) => (id: string) => ids.includes(id);

describe("mission log", () => {
  const chain = [mission("a"), mission("b"), mission("luna", false), mission("planeta", false)];
  const targets = [{ id: "t-a", name: "a" }, { id: "t-b", name: "b" }, { id: "x", name: "x" }, { id: "y", name: "y" }];

  it("starts with only the first main mission active; the rest are locked", () => {
    const log = new MissionLog(chain, targets);
    expect(chain.map((m) => log.state(m.id))).toEqual(["activa", "bloqueada", "bloqueada", "bloqueada"]);
    expect(log.isAnnounced("a")).toBe(true);
    expect(log.isAnnounced("b")).toBe(false);
  });

  it("every target without a main mission is a side mission", () => {
    const log = new MissionLog(chain, targets);
    expect(log.sides.map((s) => s.id)).toEqual(["x", "y"]);
    expect(log.mainFor("t-b")?.id).toBe("b");
    expect(log.mainFor("x")).toBeUndefined();
  });

  it("persuading the active target finishes it and opens the next", () => {
    const log = new MissionLog(chain, targets);
    expect(log.update(persuaded())).toEqual([]);
    const ev = log.update(persuaded("t-a"));
    expect(ev.map((e) => `${e.type}:${"mission" in e ? e.mission.id : ""}`)).toEqual(["main-done:a", "main-active:b"]);
    expect(log.state("a")).toBe("hecha");
    expect(log.state("b")).toBe("activa");
    expect(log.update(persuaded("t-a"))).toEqual([]);
  });

  it("a target persuaded early counts when its turn comes", () => {
    const log = new MissionLog(chain, targets);
    expect(log.update(persuaded("t-b"))).toEqual([]);
    expect(log.state("b")).toBe("bloqueada");
    const ev = log.update(persuaded("t-a", "t-b"));
    expect(ev.map((e) => e.type)).toEqual(["main-done", "main-active", "main-done", "main-announced"]);
  });

  it("a chapter with no gameplay is announced but stays locked, and so does everything after it", () => {
    const log = new MissionLog(chain, targets);
    log.update(persuaded("t-a", "t-b"));
    expect(log.active).toBeUndefined();
    expect(log.current?.id).toBe("luna");
    expect(log.state("luna")).toBe("bloqueada");
    expect(log.isAnnounced("luna")).toBe(true);
    expect(log.isAnnounced("planeta")).toBe(false);
    // Even if the moon were somehow persuaded, a locked mission does not complete.
    expect(log.update(persuaded("t-a", "t-b", "t-luna"))).toEqual([]);
    expect(log.mainDone).toBe(2);
  });

  it("side missions are reported once and counted", () => {
    const log = new MissionLog(chain, targets);
    const ev = log.update(persuaded("x"));
    expect(ev).toEqual([{ type: "side-done", target: { id: "x", name: "x" } }]);
    expect(log.update(persuaded("x"))).toEqual([]);
    expect(log.isSideDone("x")).toBe(true);
    expect(log.sideCount).toEqual({ done: 1, total: 2 });
  });

  it("rejects duplicate mission ids", () => {
    expect(() => new MissionLog([mission("a"), mission("a")], [])).toThrow();
  });
});
