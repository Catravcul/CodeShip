import { describe, expect, it } from "vitest";
import { ChoreRun } from "@modules/chores/domain/chore";
import { DONNING_STEPS } from "@modules/eva/application/station-eva-chores";
import { buildLayout } from "../data/layout";
import { POSTS, READY_POSTS } from "./initiation";
import { HYPOXIA, MEDICAL, SELECTION, stations, usefulConsciousness } from "./stations";
import { beatsFor } from "../domain/station-beat";

const L = buildLayout(1);
const all = stations();

describe("Puestos 1–4 y 7: retos con pasos reales y su animación", () => {
  it("uno por puesto listo, en la máquina del puesto", () => {
    expect(all.map((s) => s.post)).toEqual(READY_POSTS);
    for (const s of all) {
      expect(POSTS.find((p) => p.n === s.post)!.machine).toBe(s.machine);
      expect(L.machines.find((m) => m.id === s.machine)?.post, s.machine).toBe(s.post);
      expect(s.sources.length).toBeGreaterThan(0);
    }
  });

  it("cada paso de cada reto tiene lo que se ve: un tiempo por bloque del orden y uno por pregunta", () => {
    for (const s of all) {
      expect(s.beats.length, s.chore.id).toBe(s.chore.exercises.length);
      s.chore.exercises.forEach((ex, i) => {
        expect(s.beats[i]!.length, `${s.chore.id} ${ex.id}`).toBe(ex.kind === "order" ? ex.solution.length : 1);
      });
    }
    expect(beatsFor(all[0]!.beats, 0, 3).map((b) => b.caption)[0]).toMatch(/Segunda ronda/);
  });

  it("cada reto se resuelve con sus respuestas, y una respuesta mal resta un intento", () => {
    for (const s of all) {
      const run = new ChoreRun(s.chore);
      for (const ex of s.chore.exercises) expect(run.submit(ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct })).toBe(true);
      expect(run.status).toBe("done");
      const bad = new ChoreRun(s.chore);
      const first = s.chore.exercises[0]!;
      if (first.kind === "order") expect(bad.submit({ kind: "order", order: [...first.solution].reverse() })).toBe(false);
      expect(bad.mistakesLeft).toBe(1);
    }
  });

  it("los números son los reales: 3 años o 750 h, 140/90, 3–5 min a 25 000 pies", () => {
    expect(SELECTION).toEqual({ minYears: 3, jetHours: 750 });
    expect(MEDICAL.bpMax).toEqual({ sys: 140, dia: 90 });
    expect(usefulConsciousness(25000)).toBe("3–5 min");
    expect(usefulConsciousness(31000)).toBe("1–2 min");
    expect(usefulConsciousness(18000)).toBe(HYPOXIA.at(-1)!.tuc);
  });

  it("la NBL reutiliza los pasos del EMU del paseo espacial, y la natación suma 150 m", () => {
    const nbl = all.find((s) => s.post === 7)!.chore.exercises[0]!;
    expect(nbl.kind === "order" && nbl.solution.map((id) => nbl.blocks.find((b) => b.id === id)!.pseudo)).toEqual([...DONNING_STEPS]);
    const q = all.find((s) => s.post === 3)!.chore.exercises[1]!;
    expect(q.kind === "choice" && q.options[q.correct]).toBe("150 m");
  });
});
