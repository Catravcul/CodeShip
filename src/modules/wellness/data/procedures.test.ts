import { describe, expect, it } from "vitest";
import { Habitat } from "@modules/habitat/application/habitat";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { choreVisuals } from "@modules/chores/application/step-visuals";
import { StationCrew } from "@modules/station/application/station-crew";
import { WORKOUTS } from "./exercise";
import { YOGA_SEQUENCES } from "./yoga";
import { AED_DRILL, CHECKUP, HYGIENE, PROCEDURES, SHELTER_ISS, SHELTER_SHIP } from "./procedures";

const crew = (shelter?: "estacion" | "nodriza") => new StationCrew(new Habitat(() => 0.5, 0, undefined, "Doménica", []), { recipes: RECIPES, yoga: YOGA_SEQUENCES, workouts: WORKOUTS, ...(shelter ? { shelter } : {}) });

describe("everyday procedures as code challenges (VID-46, VID-47, VID-48)", () => {
  it("each one cites its source, has one act per step and wrong steps that are not its own", () => {
    for (const p of PROCEDURES) {
      expect(p.source, p.id).toMatch(/https:\/\//);
      expect(p.acts.length, p.id).toBe(p.steps.length);
      for (const w of p.wrong) expect(p.steps, p.id).not.toContain(w);
    }
    expect(SHELTER_SHIP.label).toBe("en-desarrollo");
    expect([HYGIENE, SHELTER_ISS, CHECKUP, AED_DRILL].every((p) => p.label === "real")).toBe(true);
  });

  it("washing is at the hygiene station, the medical kit at its own area, in both vehicles", () => {
    for (const c of [crew(), crew("nodriza")]) {
      expect(c.choresAt("aseo").map((x) => x.id)).toContain(HYGIENE.id);
      expect(c.choresAt("medico").map((x) => x.id)).toEqual([CHECKUP.id, AED_DRILL.id]);
    }
  });

  it("the station shelters in its crew quarter (Harmony); Starship in its water wall", () => {
    expect(crew().choresAt("camarotes").map((x) => x.id)).toContain(SHELTER_ISS.id);
    expect(crew("nodriza").choresAt("camarotes").map((x) => x.id)).toContain(SHELTER_SHIP.id);
    expect(crew().chore(SHELTER_SHIP.id)).toBeUndefined();
  });

  it("solving each step acts it out where it is done", () => {
    const v = choreVisuals({ recipes: [] });
    const c = crew();
    for (const p of [HYGIENE, SHELTER_ISS, CHECKUP, AED_DRILL]) {
      const chore = c.chore(p.id)!;
      expect(chore.exercises.length, p.id).toBe(p.steps.length);
      p.acts.forEach((a, i) => expect(v.acts(chore, i), `${p.id} ${i}`).toEqual(a));
    }
  });
});
