import { describe, expect, it } from "vitest";
import { ChoreRun } from "@modules/chores/domain/chore";
import { areaVisuals } from "@modules/chores/application/step-visuals";
import { classifyStep } from "@modules/chores/domain/step-visual";
import { ALL_FAILURES, ECLSS_MACHINES, failureMode } from "../data/eclss-machines";
import { LifeSupport } from "../domain/life-support";
import { eclssChore, eclssChores, failureOfChore, serviceChore, serviceOfChore } from "./eclss-chores";

describe("SV-08 a failure is a repair task of code challenges", () => {
  it("the CDRA's clogged beds: its procedure in order, then a real value to restore", () => {
    const c = eclssChore(failureMode("cdra-lechos")!);
    expect(c.kind).toBe("soporte-vital");
    expect(c.machine).toBe("cdra");
    expect(c.title).toMatch(/CDRA/);
    expect(c.exercises.map((e) => e.kind)).toEqual(["order", "choice"]);
    const choice = c.exercises[1]!;
    expect(choice.kind === "choice" && choice.options[choice.correct]).toBe("90 min");
    expect(failureOfChore(c.id)).toBe("cdra-lechos");
  });

  it("maintenance says so in its title (the water processor's bed)", () => {
    expect(eclssChore(failureMode("wpa-lecho-mf")!).title).toMatch(/^Mantenimiento/);
  });

  it("every repair step names a hands-on action, so its step visual shows it happening", () => {
    for (const f of ALL_FAILURES) for (const s of f.steps) expect(classifyStep(s), `${f.id}: ${s}`).toBeDefined();
    const c = eclssChore(failureMode("cdra-lechos")!);
    expect(areaVisuals.acts(c, 0)!.every((a) => a.action === "reparar" || a.action === "revisar" || a.action === "lavar")).toBe(true);
  });

  it("solving it in order finishes the run", () => {
    const c = eclssChore(failureMode("upa-destilacion")!);
    const run = new ChoreRun(c);
    for (const ex of c.exercises) run.submit(ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
    expect(run.status).toBe("done");
  });

  it("the open tasks are the system's active failures", () => {
    const ls = new LifeSupport(ECLSS_MACHINES, { crew: 1, freeAirM3: 388, waterKg: 500, foodKg: 100, o2TankKg: 50, n2TankKg: 50, spares: {} });
    expect(eclssChores(ls)).toEqual([]);
    ls.fail("cdra-lechos");
    ls.fail("wpa-lecho-mf");
    expect(eclssChores(ls).map((c) => c.id)).toEqual(["sv-cdra-lechos", "sv-wpa-lecho-mf"]);
  });
});

describe("SV-15 preventive maintenance is a task of code challenges too", () => {
  it("a worn mode past 80 % gives a «Preventivo» task whose scenario is its cause", () => {
    const ls = new LifeSupport(ECLSS_MACHINES, { crew: 1, freeAirM3: 388, waterKg: 500, foodKg: 100, o2TankKg: 50, n2TankKg: 50, spares: {} }, { wear: true });
    ls.setWear("cdra-lechos", 0.85);
    const c = eclssChores(ls).find((x) => x.id === "sv-pm-cdra-lechos")!;
    expect(c.title).toBe("Preventivo CDRA: limpiar los lechos");
    expect(c.scenario).toMatch(/zeolita/);
    expect(serviceOfChore(c.id)).toBe("cdra-lechos");
    expect(failureOfChore(c.id)).toBeUndefined();
    const run = new ChoreRun(c);
    for (const ex of c.exercises) run.submit(ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });
    expect(run.status).toBe("done");
  });

  it("every service step names a hands-on action too", () => {
    for (const f of ALL_FAILURES) for (const s of serviceChore(f).exercises[0]!.kind === "order" ? (f.wear.service.steps ?? f.steps) : []) expect(classifyStep(s), `${f.id}: ${s}`).toBeDefined();
  });
});
