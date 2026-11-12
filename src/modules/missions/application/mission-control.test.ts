import { describe, expect, it } from "vitest";
import { Mailbox } from "@modules/story/domain/mailbox";
import { STORY } from "@modules/story/data/nevaeh";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { MissionLog } from "../domain/mission";
import { MISSION_LETTERS, NEVAEH_MISSIONS } from "../data/nevaeh-missions";
import { MissionControl } from "./mission-control";

const TARGETS = [BENNU, ...POLANA_MEMBERS].map((a) => ({ id: a.id, name: a.name }));

function setup() {
  const box = new Mailbox(STORY);
  const granted: Record<string, number>[] = [];
  const ctl = new MissionControl(new MissionLog(NEVAEH_MISSIONS, TARGETS), box, MISSION_LETTERS, (a) => granted.push({ ...a }));
  const persuaded = new Set<string>();
  const run = (...ids: string[]) => {
    ids.forEach((i) => persuaded.add(i));
    return ctl.update((id) => persuaded.has(id));
  };
  return { box, ctl, granted, run };
}
const ids = (box: Mailbox) => box.received.map((r) => r.letter.id);

describe("mission control (Nevaeh's chain on the radio)", () => {
  it("Bennu is the first main mission, asked in the first nano_net letter", () => {
    const { ctl, box } = setup();
    expect(ctl.log.active?.target.id).toBe(BENNU.id);
    expect(ctl.letterFor(ctl.log.active!)?.id).toBe("nano-net-nucleo");
    expect(ids(box)).not.toContain("mision-242916");
  });

  it("finishing a main mission gives its reward and posts the next letter, with a persuade mission", () => {
    const { ctl, box, granted, run } = setup();
    const notes = run(BENNU.id);
    expect(notes.map((n) => n.kind)).toEqual(["cumplida", "nueva"]);
    expect(granted).toEqual([{ kit: 2 }]);
    const r = box.received.find((x) => x.letter.id === "mision-242916")!;
    expect(r.letter.mission).toMatchObject({ goal: "persuadir", targetId: "242916" });
    expect(box.pendingMissions.map((l) => l.id)).toContain("mision-242916");
    // The nano_net letter's own mission (plant a core) is not closed by persuading.
    expect(box.pendingMissions.map((l) => l.id)).toContain("nano-net-nucleo");
    expect(ctl.log.state("persuadir-242916")).toBe("activa");
  });

  it("closes the radio mission when its target is persuaded", () => {
    const { box, run } = setup();
    run(BENNU.id);
    run("242916");
    expect(box.received.find((x) => x.letter.id === "mision-242916")!.missionDone).toBe(true);
    expect(ids(box)).toContain("mision-58587");
  });

  it("after the last asteroid Nevaeh announces Deimos, which stays locked", () => {
    const { ctl, box, granted, run } = setup();
    run(BENNU.id);
    run("242916");
    const notes = run("58587");
    expect(notes.map((n) => n.kind)).toEqual(["cumplida", "anunciada"]);
    expect(granted.reduce((s, g) => s + (g.kit ?? 0), 0)).toBe(7);
    expect(ids(box)).toContain("mision-deimos");
    expect(box.received.find((x) => x.letter.id === "mision-deimos")!.letter.mission).toBeUndefined();
    expect(ctl.log.state("persuadir-deimos")).toBe("bloqueada");
    expect(ctl.log.state("persuadir-marte")).toBe("bloqueada");
    expect(ids(box)).not.toContain("mision-fobos");
  });

  it("other asteroids are side missions with their own notice", () => {
    const { ctl, granted, run } = setup();
    const notes = run("265900");
    expect(notes).toEqual([{ kind: "secundaria", text: expect.stringContaining("(1/4)") }]);
    expect(granted).toEqual([]);
    expect(ctl.log.sideCount).toEqual({ done: 1, total: 4 });
  });
});

describe("Nevaeh's missions data", () => {
  it("chapter 1 targets are real asteroids of the region; later chapters are a moon then Mars, locked", () => {
    const region = new Set(TARGETS.map((t) => t.id));
    const playable = NEVAEH_MISSIONS.filter((m) => m.playable);
    expect(playable.every((m) => region.has(m.target.id) && m.target.kind === "asteroide")).toBe(true);
    const locked = NEVAEH_MISSIONS.filter((m) => !m.playable);
    expect(locked.map((m) => m.target.kind)).toEqual(["luna", "luna", "planeta"]);
    expect(locked.every((m) => m.lockedNote)).toBe(true);
    expect(NEVAEH_MISSIONS.findIndex((m) => !m.playable)).toBe(playable.length);
  });

  it("every mission has sourced facts and a letter; every reward is kits", () => {
    const letters = new Set([...MISSION_LETTERS, ...STORY].map((l) => l.id));
    for (const m of NEVAEH_MISSIONS) {
      expect(letters.has(m.letterId)).toBe(true);
      expect(m.facts.length).toBeGreaterThan(2);
      expect(m.facts.every((f) => /^https?:|game value/.test(f.source))).toBe(true);
      if (m.reward) expect(Object.keys(m.reward.amounts)).toEqual(["kit"]);
    }
  });

  it("the reasons use the real numbers: 242916 is the biggest neighbour, 58587 the darkest", () => {
    const big = Math.max(...POLANA_MEMBERS.map((m) => m.meanRadiusM.value));
    expect(POLANA_MEMBERS.find((m) => m.id === "242916")!.meanRadiusM.value).toBe(big);
    const dark = Math.min(...POLANA_MEMBERS.map((m) => m.albedo.value));
    expect(POLANA_MEMBERS.find((m) => m.id === "58587")!.albedo.value).toBe(dark);
    const m2 = NEVAEH_MISSIONS[1]!;
    expect(m2.why).toMatch(/2,44 km/);
    expect(m2.why).toMatch(/124 veces/);
  });
});
