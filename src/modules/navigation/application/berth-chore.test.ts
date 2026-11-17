import { describe, expect, it } from "vitest";
import { ChoreRun } from "@modules/chores/domain/chore";
import { BERTH_STEP_ACTS, BERTH_STEP_STAGES, berthChore, berthStage } from "./berth-chore";
import type { Exercise } from "@modules/mind-duel/domain/exercise";

const FACTS = { stationName: "la estación", portName: "IDA-2", waypoint1M: 150, waypoint2M: 20, closingMs: 0.07, closingMinMs: 0.05, closingMaxMs: 0.1, lateralMaxM: 0.1, holdS: 1157 };

describe("NAV-26 docking by program: the real approach as a challenge", () => {
  it("the Demo-1 approach decision by decision, three short options each (fits 390×664), with the real numbers", () => {
    const c = berthChore(FACTS);
    expect(c.exercises).toHaveLength(4);
    const [first, time, hold, contact] = c.exercises as [Exercise, Exercise, Exercise, Exercise];
    for (const e of c.exercises) expect(e.kind === "choice" && e.options.length).toBe(3);
    if (first.kind !== "choice" || time.kind !== "choice" || hold.kind !== "choice" || contact.kind !== "choice") throw new Error("choice");
    expect(first.options[first.correct]).toBe("alinear con el eje");
    expect(first.options).toContain("ir directa a 1 m/s");
    // 130 m at 0,07 m/s: 30 min 57 s.
    expect(time.options[time.correct]).toBe("30 min 57 s");
    expect(hold.options[hold.correct]).toMatch(/«adelante»/);
    expect(contact.options[contact.correct]).toBe("cierre ≤ máx");
  });

  it("each solved step has its act at the docking seat (hands on the screen, eyes on the camera) and its stages", () => {
    const c = berthChore(FACTS);
    expect(BERTH_STEP_ACTS).toHaveLength(c.exercises.length);
    expect(BERTH_STEP_STAGES).toHaveLength(c.exercises.length);
    expect(BERTH_STEP_STAGES.flat()).toEqual([1, 2, 3, 4, 5]);
    // The camera's approach: from Waypoint 1 to 2, the hold, then to contact and the hooks.
    expect(berthStage(FACTS, 2)).toMatchObject({ fromM: 150, toM: 20 });
    expect(berthStage(FACTS, 4)).toMatchObject({ fromM: 20, toM: 0 });
    expect(berthStage(FACTS, 5).caption).toMatch(/ganchos/);
  });

  it("solved in order, the run is done", () => {
    const c = berthChore(FACTS);
    const run = new ChoreRun(c);
    for (const e of c.exercises) run.submit(e.kind === "order" ? { kind: "order", order: e.solution } : { kind: "choice", index: e.correct });
    expect(run.status).toBe("done");
  });
});
