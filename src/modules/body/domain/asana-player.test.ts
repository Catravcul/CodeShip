import { describe, expect, it } from "vitest";
import { ASANA_SEQUENCES, asanaById } from "../data/asanas";
import { AsanaPlayer, BREATH_PHASE_S } from "./asana-player";
import { contactHeights } from "./body-solver";
import { CUBE_FIGURE, JOINTS } from "./skeleton";

const fold = asanaById("uttanasana-flexion-adelante")!;
const prayer = asanaById("pranamasana-oracion")!;

describe("AsanaPlayer: transitions and breath (Cold Sanctuary: one breath phase per movement)", () => {
  it("starts standing and eases into the asana, arriving after the transition", () => {
    const p = new AsanaPlayer(CUBE_FIGURE, { transitionS: 2 });
    const stand = p.update(0).world.Head.p.y;
    p.play(fold);
    const mid = p.update(1).world.Head.p.y;
    expect(mid).toBeLessThan(stand);
    const end = p.update(1.5);
    expect(end.world.Head.p.y).toBeLessThan(mid);
    expect(p.arrived).toBe(true);
    expect(contactHeights(CUBE_FIGURE, end.world).HandLeft).toBeLessThan(0.035);
  });

  it("moves smoothly: no frame jumps more than a few centimetres at 60 fps", () => {
    const p = new AsanaPlayer(CUBE_FIGURE, { transitionS: 2 });
    p.play(prayer);
    for (let i = 0; i < 150; i++) p.update(1 / 60);
    p.play(fold);
    let last = p.update(0).world;
    for (let i = 0; i < 150; i++) {
      const w = p.update(1 / 60).world;
      for (const j of ["Head", "HandLeft", "FootLeft", "Hips"] as const) expect(w[j].p.sub(last[j].p).length(), j).toBeLessThan(0.04);
      last = w;
    }
  });

  it("the whole Sun Salutation flows without a snap (3 s per transition at 60 fps)", () => {
    // A snap: a joint moving much more in one frame than in the frame before (the fold itself is fast).
    const sun = ASANA_SEQUENCES.find((s) => s.id === "saludo-al-sol")!;
    const p = new AsanaPlayer(CUBE_FIGURE, { transitionS: 3 });
    let last = p.update(0).world;
    const step = Object.fromEntries(JOINTS.map((j) => [j, 0])) as Record<string, number>;
    for (const s of sun.steps) {
      p.play(asanaById(s.asana)!);
      for (let i = 0; i < 200; i++) {
        const w = p.update(1 / 60).world;
        for (const j of JOINTS) {
          const d = w[j].p.sub(last[j].p).length();
          expect(d, `${s.asana} ${j} frame ${i}`).toBeLessThan(Math.min(0.08, Math.max(0.03, 2 * step[j]! + 0.01)));
          step[j] = d;
        }
        last = w;
      }
    }
  });

  it("breathes: inhale for one phase, exhale for the next, the chest rising a little on the inhale", () => {
    const p = new AsanaPlayer(CUBE_FIGURE, { transitionS: 1 });
    p.play(prayer);
    p.update(2);
    expect(p.phase).toBe("inhala");
    const quarter = p.update(BREATH_PHASE_S - 2).world.Head.p; // full lungs at the end of the inhale
    expect(p.phase).toBe("exhala");
    const empty = p.update(BREATH_PHASE_S).world.Head.p; // empty at the end of the exhale
    expect(p.phase).toBe("inhala");
    const lift = quarter.sub(empty).length();
    expect(lift).toBeGreaterThan(0.003);
    expect(lift).toBeLessThan(0.03);
  });

  it("stop() goes back to standing", () => {
    const p = new AsanaPlayer(CUBE_FIGURE, { transitionS: 1 });
    p.play(fold);
    p.update(2);
    p.stop();
    expect(p.update(2).world.Hips.p.y).toBeCloseTo(0.95, 2);
    expect(p.asana).toBeUndefined();
  });
});
