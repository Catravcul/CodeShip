import { describe, expect, it } from "vitest";
import { QuestEva } from "./quest-eva";
import { EMU, SAFETY_TETHER_M } from "../data/suit";
import { EVA_ROUTES, PREBREATHE_MIN, QUEST_EVA } from "../data/station-eva";
import { donningChore, jobChore } from "../application/station-eva-chores";

const make = () => new QuestEva(EMU, { prebreatheMin: PREBREATHE_MIN, depressMin: QUEST_EVA.depressMin.value, repressMin: QUEST_EVA.repressMin.value }, SAFETY_TETHER_M.value);
const out = (site: keyof typeof EVA_ROUTES = "alas") => {
  const e = make();
  e.suitUp();
  e.prebreathe();
  e.tick(PREBREATHE_MIN);
  e.depress();
  e.tick(QUEST_EVA.depressMin.value);
  e.egress(EVA_ROUTES[site]);
  return e;
};

describe("A spacewalk from Quest (real order, board clock)", () => {
  it("ISLE prebreathe is an hour of mask and about 100 min in the suit", () => {
    expect(PREBREATHE_MIN).toBe(160);
  });

  it("no depress before the prebreathe ends, no egress with air in the lock", () => {
    const e = make();
    expect(e.prebreathe()).toMatch(/traje/);
    e.suitUp();
    expect(e.depress()).toMatch(/traje y la prerrespiración/);
    e.prebreathe();
    e.tick(100);
    expect(e.depress()).toMatch(/quedan 60 min/);
    e.tick(60);
    expect(e.phase).toBe("listo");
    expect(e.depress()).toBeUndefined();
    expect(e.egress(EVA_ROUTES.alas)).toMatch(/aire/);
    e.tick(QUEST_EVA.depressMin.value);
    expect(e.egress(EVA_ROUTES.alas)).toBeUndefined();
    expect(e.atHatch).toBe(true);
  });

  it("the 85 ft safety tether stops her: she swaps it at an anchor to reach the arrays", () => {
    const e = out("alas");
    expect(e.length).toBeGreaterThan(SAFETY_TETHER_M.value);
    for (let i = 0; i < 200; i++) e.move(0.5);
    expect(e.tetherOut).toBeCloseTo(SAFETY_TETHER_M.value, 5);
    expect(e.atWorksite).toBe(false);
    // Back to the last anchor she passed and hook there.
    const anchors = EVA_ROUTES.alas.map((p, i) => (p.anchor ? i : -1)).filter((i) => i > 0);
    let swapped = false;
    for (let i = 0; i < 200 && !swapped; i++) {
      e.move(-0.25);
      swapped = !e.swapTether();
    }
    expect(swapped).toBe(true);
    expect(anchors).toContain(e.anchor);
    for (let i = 0; i < 200; i++) e.move(0.5);
    expect(e.atWorksite).toBe(true);
  });

  it("feet in the APFR only at the worksite, and no moving with them in", () => {
    const e = out("radiadores");
    expect(e.setFeet(true)).toMatch(/sitio de trabajo/);
    for (let i = 0; i < 100; i++) e.move(0.5);
    expect(e.setFeet(true)).toBeUndefined();
    expect(e.move(-1)).toMatch(/APFR/);
    e.setFeet(false);
    for (let i = 0; i < 100; i++) e.move(-0.5);
    expect(e.atHatch).toBe(true);
    expect(e.ingress()).toBeUndefined();
    e.tick(QUEST_EVA.repressMin.value);
    expect(e.phase).toBe("en-esclusa");
    expect(e.doff()).toBeUndefined();
    expect(e.suit.oxygen).toBe(1);
  });

  it("the suit's oxygen runs on the board clock outside: a 6 h 27 min walk leaves less than 2 h", () => {
    const e = out("escudo");
    e.tick(QUEST_EVA.typicalH.value * 60, true);
    expect(e.outsideMin).toBeCloseTo(387, 0);
    expect(e.suit.timeLeftS / 3600).toBeLessThan(2);
  });
});

describe("Spacewalk challenges", () => {
  it("donning in the real order, the trap out of the solution, and 160 min of ISLE", () => {
    const c = donningChore();
    const [steps, isle] = c.exercises;
    expect(steps!.kind === "order" && steps!.solution).not.toContain("x");
    expect(isle!.kind === "choice" && isle!.options[isle!.correct]).toBe("160 min");
  });

  it.each(["alas", "radiadores", "escudo"] as const)("%s: the work time is the suit's oxygen minus the 30 min margin", (site) => {
    const c = jobChore(site, { o2H: 5 });
    const q = c.exercises[0]!;
    expect(q.kind === "choice" && q.options[q.correct]).toBe("4,5 h");
    for (const ex of c.exercises) if (ex.kind === "order") expect(ex.blocks.length).toBeLessThanOrEqual(6);
  });
});
