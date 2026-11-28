import { describe, expect, it } from "vitest";
import { failingAnswer } from "@modules/chores/domain/testing";
import { Vec3 } from "@core/math/vec3";
import { G } from "@core/units";
import type { Chore } from "@modules/chores/domain/chore";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { BENNU } from "@modules/celestial/data/bennu";
import { REMOTE_NETS } from "../data/networks";
import { NANO_TUNING } from "../domain/core";
import { NanoNet } from "../domain/network";
import { coreCode, type NanoSite } from "./challenges";
import { NanoNetOps } from "./operations";

const site: NanoSite = {
  id: BENNU.id,
  name: BENNU.name,
  position: Vec3.ZERO,
  radiusM: BENNU.meanRadiusM.value,
  massKg: BENNU.massKg.value,
  muM3S2: G * BENNU.massKg.value,
};
const never = () => 0.999;
const right = (e: Exercise): Answer => (e.kind === "order" ? { kind: "order", order: e.solution } : { kind: "choice", index: e.correct });
const wrong = (e: Exercise): Answer => (e.kind === "order" ? { kind: "order", order: [...e.solution].reverse() } : { kind: "choice", index: (e.correct + 1) % e.options.length });

function solve(ops: NanoNetOps, chore: Chore): void {
  const s = ops.start(chore, site);
  for (const e of chore.exercises) expect(s.answer(right(e))).toBe(true);
  expect(s.run.status).toBe("done");
}
const only = (ops: NanoNetOps, kind: Chore["kind"]) => {
  const c = ops.actionsAt(site, true).find((x) => x.kind === kind);
  expect(c, `no ${kind} chore`).toBeDefined();
  return c!;
};

function solvable(chores: readonly Chore[]) {
  for (const c of chores)
    for (const e of c.exercises) {
      if (e.kind === "choice") {
        expect(e.options[e.correct]).toBeDefined();
        expect(new Set(e.options).size, `${e.id} has repeated options`).toBe(e.options.length);
      } else expect(e.solution.length).toBeGreaterThan(1);
    }
}

describe("nano_net operations", () => {
  it("nothing to do on an asteroid that was not persuaded, or while flying", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    expect(ops.actionsAt(site, true)).toEqual([]);
    ops.subjugate(site.id);
    expect(ops.actionsAt(site, false)).toEqual([]);
  });

  it("a persuaded asteroid becomes a core with a chain of code challenges", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    ops.subjugate(site.id);
    const c = only(ops, "nano-convertir");
    // μ = G·M with Bennu's real mass: 6.6743e-11 × 7.329e10 ≈ 4.89 m³/s²
    const mu = c.exercises.find((e) => e.id.endsWith("-mu"))!;
    expect(mu.kind === "choice" && mu.options[mu.correct]).toBe("4,89 m³/s²");
    solve(ops, c);
    expect(ops.net.core(site.id)).toBeDefined();
    expect(ops.drainEvents()).toEqual([{ type: "core-planted", coreId: site.id }]);
  });

  it("each stage is programmed in turn until the network links to the sanctuary relay", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    ops.subjugate(site.id);
    solve(ops, only(ops, "nano-convertir"));
    const learned: string[] = [];
    for (let i = 0; i < 4; i++) {
      const c = only(ops, "nano-programar");
      solvable([c]);
      solve(ops, c);
      learned.push(...ops.drainEvents().flatMap((e) => (e.type === "stage-learned" ? [e.stage] : [])));
    }
    expect(learned).toEqual(["generar", "mover", "cubrir", "enlazar"]);
    expect(ops.actionsAt(site, true)).toEqual([]);
    const core = ops.net.core(site.id)!;
    expect(core.linkedTo?.id).toBe("relevo-santuario");
    expect(coreCode(core, site).map((b) => b.id)).toEqual(["nucleo", "generar", "mover", "cubrir", "enlazar"]);
  });

  it("the orbital speed challenge uses v = √(μ / r) with Bennu's real numbers", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    ops.subjugate(site.id);
    solve(ops, only(ops, "nano-convertir"));
    solve(ops, only(ops, "nano-programar"));
    const v = only(ops, "nano-programar").exercises.find((e) => e.id.endsWith("-v"))!;
    // r = 245.03 + 600 m → √(4.8916 / 845.03) ≈ 0.076 m/s
    expect(v.kind === "choice" && v.options[v.correct]).toBe("0,076 m/s");
  });

  it("linking waits until another network is in range", () => {
    const ops = new NanoNetOps(new NanoNet([]), never);
    ops.subjugate(site.id);
    solve(ops, only(ops, "nano-convertir"));
    for (let i = 0; i < 3; i++) solve(ops, only(ops, "nano-programar"));
    expect(ops.actionsAt(site, true)).toEqual([]);
  });

  it("failing too many challenges leaves the stage unlearned", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    ops.subjugate(site.id);
    const c = only(ops, "nano-convertir");
    const s = ops.start(c, site);
    while (s.run.status === "doing") s.answer(failingAnswer(s.run));
    expect(s.run.status).toBe("failed");
    expect(ops.net.core(site.id)).toBeUndefined();
    expect(ops.drainEvents()).toEqual([{ type: "chore-failed", choreId: c.id }]);
  });

  it("faults become repair missions done landed on the core; repairs come first", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    ops.subjugate(site.id);
    solve(ops, only(ops, "nano-convertir"));
    for (let i = 0; i < 3; i++) solve(ops, only(ops, "nano-programar"));
    ops.drainEvents();
    ops.jolt(site.id, 0.8);
    const faults = ops.drainEvents();
    expect(faults.map((e) => e.type)).toEqual(["fault", "fault"]);
    const actions = ops.actionsAt(site, true);
    // The program is broken, so no stage can be learned until it is fixed.
    expect(actions.map((c) => c.kind)).toEqual(["nano-reparar", "nano-reparar"]);
    solvable(actions);
    for (const c of actions) solve(ops, c);
    expect(ops.net.faults()).toEqual([]);
    expect(ops.drainEvents().map((e) => e.type)).toEqual(["repaired", "repaired"]);
    expect(only(ops, "nano-programar").id).toContain("enlazar");
  });

  it("the broken-node challenge asks which node the guard switched off", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    ops.subjugate(site.id);
    solve(ops, only(ops, "nano-convertir"));
    for (let i = 0; i < 3; i++) solve(ops, only(ops, "nano-programar"));
    const node = ops.net.core(site.id)!.nodes[6]!;
    node.damage(0.8);
    const c = only(ops, "nano-reparar");
    const which = c.exercises[0]!;
    expect(which.kind === "choice" && which.options[which.correct]).toBe("N7");
  });

  it("time breaks things: tick reports faults as events", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), () => 0);
    ops.subjugate(site.id);
    solve(ops, only(ops, "nano-convertir"));
    solve(ops, only(ops, "nano-programar"));
    ops.drainEvents();
    ops.tick(0.1);
    expect(ops.drainEvents().some((e) => e.type === "fault")).toBe(true);
  });

  it("inside coverage the network's energy lets the drones mend the hull", () => {
    const ops = new NanoNetOps(new NanoNet(REMOTE_NETS), never);
    let hull = 0.5;
    const ship = { get hullIntegrity() { return hull; }, repair: (f: number) => (hull = Math.min(1, hull + f)) };
    ops.powerShip(ship, { covered: true, energyKw: 6, safety: 0.45, warpFactor: 1.5 }, 3600);
    expect(hull).toBeCloseTo(0.5 + 6 * NANO_TUNING.hullRepairPerKwH, 6);
    ops.powerShip(ship, { covered: false, energyKw: 0, safety: 0, warpFactor: 1 }, 3600);
    expect(hull).toBeCloseTo(0.5 + 6 * NANO_TUNING.hullRepairPerKwH, 6);
  });
});
