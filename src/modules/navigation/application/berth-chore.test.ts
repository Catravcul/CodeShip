import { describe, expect, it } from "vitest";
import { ChoreRun } from "@modules/chores/domain/chore";
import { BERTH_STEP_ACTS, berthChore, berthStage } from "./berth-chore";
import type { Exercise } from "@modules/mind-duel/domain/exercise";

const FACTS = { stationName: "la estación", portName: "IDA-2", waypoint1M: 150, waypoint2M: 20, closingMs: 0.07, closingMinMs: 0.05, closingMaxMs: 0.1, lateralMaxM: 0.1, holdS: 1157 };

describe("NAV-26 docking by program: the real approach as a challenge", () => {
  it("orders the Demo-1 waypoints with a rushing distractor, and its numbers are the real ones", () => {
    const c = berthChore(FACTS);
    const [seq, time, contact] = c.exercises as [Exercise, Exercise, Exercise];
    expect(seq.kind).toBe("order");
    if (seq.kind !== "order") return;
    // Six blocks (fits 390×664 without scrolling): five steps from Waypoint 1 and the distractor.
    expect(seq.blocks).toHaveLength(6);
    expect(seq.solution).not.toContain("f");
    expect(seq.blocks.find((b) => b.id === "f")!.pseudo).toMatch(/1 m\/s/);
    if (time.kind !== "choice" || contact.kind !== "choice") throw new Error("choice");
    // 130 m at 0,07 m/s: 30 min 57 s.
    expect(time.options[time.correct]).toBe("30 min 57 s");
    expect(contact.options[contact.correct]).toBe("cierre ≤ máx");
  });

  it("each solved step has its act at the docking seat (hands on the screen, eyes on the camera), one per block", () => {
    const c = berthChore(FACTS);
    const seq = c.exercises[0]!;
    expect(seq.kind === "order" && BERTH_STEP_ACTS[0]!.length).toBe(seq.kind === "order" ? seq.solution.length : -1);
    expect(BERTH_STEP_ACTS).toHaveLength(c.exercises.length);
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
