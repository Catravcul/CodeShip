import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { ChoreRun } from "@modules/chores/domain/chore";
import { Hangar } from "@modules/station/domain/hangar";
import { NODRIZA } from "../data/mothership";
import { AEPS, ELECTRIC_THRUSTERS, NEXT_C, VX200, X3 } from "../data/thrusters";
import { Mothership } from "../domain/mothership";
import { applyDriveRefit, driveOptions, driveRefitChore } from "./drive-refit";

const fresh = () => new Mothership(NODRIZA, Vec3.ZERO, Quat.IDENTITY);

describe("drive options in the bay", () => {
  it("only parts in the hangar can be fitted; VASIMR is locked by its propellant", () => {
    const m = fresh();
    const opts = driveOptions(m, "dorsal", ELECTRIC_THRUSTERS, new Hangar({ [AEPS.id]: 6 }));
    const aeps = opts.find((o) => o.thruster === AEPS)!;
    expect(aeps.locked).toBeUndefined();
    expect(aeps.count).toBe(6);
    expect(opts.find((o) => o.thruster === NEXT_C)!.locked).toMatch(/hangar/);
    expect(opts.find((o) => o.thruster === VX200)!.locked).toMatch(/argón.*xenón/);
    expect(opts.find((o) => o.label === "Añadir un X3")!.locked).toMatch(/hangar/);
    expect(opts.find((o) => o.label === "Quitar un X3")!.locked).toBeUndefined();
    // Open options first.
    const firstLocked = opts.findIndex((o) => o.locked);
    expect(opts.slice(firstLocked).every((o) => o.locked)).toBe(true);
  });

  it("changing type moves the new units out of the hangar and the old ones in", () => {
    const m = fresh();
    const h = new Hangar({ [AEPS.id]: 6 });
    applyDriveRefit(m, { mountId: "dorsal", thruster: AEPS, count: 6 }, h);
    expect(m.fitOf("dorsal")).toEqual({ mountId: "dorsal", thruster: AEPS, count: 6 });
    expect(h.count(AEPS.id)).toBe(0);
    expect(h.count(X3.id)).toBe(9);
    // Add one back from the hangar, then take one off.
    applyDriveRefit(m, { mountId: "ventral", thruster: X3, count: 10 }, h);
    expect(h.count(X3.id)).toBe(8);
    applyDriveRefit(m, { mountId: "ventral", thruster: X3, count: 9 }, h);
    expect(h.count(X3.id)).toBe(9);
  });

  it("refuses a change the hangar cannot supply, and changes nothing", () => {
    const m = fresh();
    const h = new Hangar({ [AEPS.id]: 2 });
    expect(() => applyDriveRefit(m, { mountId: "dorsal", thruster: AEPS, count: 3 }, h)).toThrow();
    expect(m.fitOf("dorsal")!.thruster).toBe(X3);
    expect(h.count(AEPS.id)).toBe(2);
  });
});

describe("the refit chore", () => {
  it("asks the real thrust, the units the reactor can feed and the new Δv, then the fitting order", () => {
    const m = fresh();
    const c = driveRefitChore(m, { mountId: "dorsal", thruster: AEPS, count: 6 });
    expect(c.kind).toBe("cambiar-pieza");
    expect(c.exercises).toHaveLength(4);
    const [value, power, dv] = c.exercises as [any, any, any];
    expect(value.options[value.correct]).toBe("0,589 N");
    expect(power.options[power.correct]).toBe("15");
    const next = m.withFit("dorsal", AEPS, 6);
    expect(dv.options[dv.correct]).toBe(`${Math.round(next.deltaV()).toLocaleString("es-ES")} m/s`);
    // Solving it changes nothing by itself: the bay applies the refit when it is done.
    const run = new ChoreRun(c, 2);
    for (const ex of c.exercises) run.submit(ex.kind === "choice" ? { kind: "choice", index: ex.correct } : { kind: "order", order: ex.solution });
    expect(run.status).toBe("done");
    expect(m.fitOf("dorsal")!.thruster).toBe(X3);
  });

  it("with too many X3 the right answer is the reactor's limit, not the count fitted", () => {
    const m = fresh();
    m.refit("ventral", X3, 21);
    const c = driveRefitChore(m, { mountId: "dorsal", thruster: X3, count: 21 });
    const power = c.exercises[1] as any;
    expect(power.options[power.correct]).toBe("18");
    expect(power.options).toContain("42");
  });

  it("emptying a mount still makes a valid chain", () => {
    const m = fresh();
    const c = driveRefitChore(m, { mountId: "dorsal", thruster: X3, count: 0 });
    const value = c.exercises[0] as any;
    expect(value.options[value.correct]).toBe("5,4 N");
    expect(new Set(value.options).size).toBe(value.options.length);
  });
});
