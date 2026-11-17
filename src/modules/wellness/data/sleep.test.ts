import { describe, expect, it } from "vitest";
import { sleepChore } from "@modules/chores/application/catalog";
import { sleepSource } from "@modules/chores/application/step-visuals";
import { SLEEP_ACTS, SLEEP_SOURCES, SLEEP_STEPS, SLEEP_WRONG } from "./sleep";

describe("VID-33 going to sleep is a chain of code challenges in her crew quarter, each step acted out there", () => {
  const chore = sleepChore(SLEEP_STEPS, SLEEP_WRONG);

  it("one challenge per real step: the fan on, the alarm at 06:00 GMT, into the bag, the zip, the light, asleep", () => {
    expect(chore.kind).toBe("dormir");
    expect(chore.exercises).toHaveLength(SLEEP_STEPS.length);
    expect(SLEEP_STEPS[0]).toMatch(/ventilador/);
    const alarm = chore.exercises[1]!;
    expect(alarm.kind === "choice" && alarm.options[alarm.correct]).toBe("06:00 GMT");
    // Switching the fan off is offered as a wrong step (with no air flow CO₂ gathers round the head in 0 g).
    expect(SLEEP_WRONG.some((w) => /apaga el ventilador/.test(w))).toBe(true);
    for (const s of Object.values(SLEEP_SOURCES)) expect(s).toMatch(/https:\/\//);
  });

  it("every step has its act in the quarter (the bag, the zip, the light, asleep)", () => {
    expect(SLEEP_ACTS).toHaveLength(SLEEP_STEPS.length);
    expect(SLEEP_ACTS.flat().map((a) => a.action)).toEqual(["revisar", "programar", "saco", "saco", "luz", "dormir"]);
    for (let i = 0; i < SLEEP_STEPS.length; i++) expect(sleepSource.acts(chore, i)).toEqual(SLEEP_ACTS[i]);
  });
});
