import { describe, expect, it } from "vitest";
import { buildLayout } from "../data/layout";
import { launchStage, stageFor } from "../data/stages";
import { POSTS, READY_POSTS } from "./initiation";
import { launchChallenges, launchStations, rendezvousSteps } from "./launch";
import { LAUNCH_STEPS } from "../domain/launch-sequence";

const all = launchStations();
const steps = launchChallenges();
const text = (o: unknown) => JSON.stringify(o);

describe("Fase 6: puestos 10 y 13 y el día del lanzamiento", () => {
  it("los puestos 10 y 13, en su máquina, con sus fuentes", () => {
    const L = buildLayout(1);
    expect(all.map((s) => s.post)).toEqual([10, 13]);
    for (const s of all) {
      expect(READY_POSTS).toContain(s.post);
      expect(POSTS.find((p) => p.n === s.post)!.machine).toBe(s.machine);
      expect(L.machines.find((m) => m.id === s.machine)?.post, s.machine).toBe(s.post);
      expect(s.sources.length).toBeGreaterThan(0);
    }
  });

  it("después del traje, un reto por paso del día, en el orden de la tripulación", () => {
    expect(["traje", ...steps.map((c) => c.step)]).toEqual([...LAUNCH_STEPS]);
    for (const c of steps) expect(c.sources.length, c.chore.id).toBeGreaterThan(0);
  });

  it("cada paso tiene su tiempo: uno por bloque del orden y uno por pregunta", () => {
    for (const s of [...all, ...steps]) {
      expect(s.beats.length, s.chore.id).toBe(s.chore.exercises.length);
      s.chore.exercises.forEach((ex, i) => expect(s.beats[i]!.length, `${s.chore.id} ${ex.id}`).toBe(ex.kind === "order" ? ex.solution.length : 1));
    }
  });

  it("las respuestas buenas llevan los números reales", () => {
    expect(text(all[0]!.chore)).toMatch(/Unos 300 m/);
    expect(text(all[1]!.chore)).toMatch(/3 h 22 min/);
    expect(text(steps[0]!.chore)).toMatch(/1 h 55 min/);
    expect(text(steps[1]!.chore)).toMatch(/Unos 1,1 km/);
    expect(text(steps[2]!.chore)).toMatch(/8 min 49 s/);
    expect(text(steps[3]!.chore)).toMatch(/118,2 m\/s/);
    expect(rendezvousSteps()).toContain("Waypoint 2: a 20 m, la última espera");
  });

  it("como con el EMU: nadie sigue sin comprobar las fugas", () => {
    const suit = all[1]!.chore.exercises[0]!;
    expect(suit.kind).toBe("order");
    if (suit.kind !== "order") return;
    const at = (t: string) => suit.solution.indexOf(suit.blocks.find((b) => b.pseudo === t)!.id);
    expect(at("comprobar que el traje no pierde presión (fugas)")).toBeLessThan(at("salir del edificio hacia la plataforma"));
  });

  for (const k of [1, 1.5])
    it(`a escala ${k}, cada sitio del día existe: el brazo y la sala blanca entre la torre y la Dragon, a la altura de su escotilla`, () => {
      const L = buildLayout(k);
      const st = launchStage(L)!;
      for (const c of steps) for (const ex of c.beats) for (const b of ex) expect(st.her[b.her], `${c.step} ${b.her}`).toBeDefined();
      const f9 = L.props.find((p) => p.kind === "falcon9")!;
      const tower = L.props.find((p) => p.kind === "crew-tower")!;
      const arm = st.her["brazo-acceso"]!;
      const white = st.her["sala-blanca"]!;
      expect(arm.z).toBeGreaterThan(white.z);
      expect(arm.z).toBeLessThan(tower.z);
      expect(white.z).toBeGreaterThan(f9.z + 2);
      expect(arm.y - f9.y).toBeGreaterThan(62);
      expect(st.mounted).toEqual(["dragon-real"]);
      for (const s of [10, 13]) for (const b of all.find((q) => q.post === s)!.beats.flat()) expect(stageFor(L, s)!.her[b.her], `${s} ${b.her}`).toBeDefined();
    });
});
