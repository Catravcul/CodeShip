import { describe, expect, it } from "vitest";
import { cabinActions, clampToFloor, nearestStation, type CabinState } from "./cabin";
import { LANDER_CABIN } from "../data/cabin";

const base: CabinState = { dockedTo: null, dockInRange: false, dockAssist: false, landed: false, canLeaveEva: false, mind: null };
const ids = (s: Parameters<typeof cabinActions>[0], st: CabinState) => cabinActions(s, st).map((a) => a.id);

describe("lander crew cabin (docs/design/habitaculo.md)", () => {
  it("HAB-01 every machine of the cabin stands on the walkable floor and is far enough from the next to tell them apart", () => {
    const st = LANDER_CABIN.stations;
    expect(st.map((s) => s.id).sort()).toEqual(["acople", "asiento", "escotilla", "esterilla", "mente"]);
    for (const s of st) expect(clampToFloor(LANDER_CABIN.floor, s.stand)).toEqual(s.stand);
    for (const a of st) for (const b of st) if (a !== b) expect(Math.hypot(a.stand.x - b.stand.x, a.stand.z - b.stand.z)).toBeGreaterThan(2 * LANDER_CABIN.reachM);
    // Small and real: about the Apollo LM ascent stage's habitable volume up to Orion's.
    expect(LANDER_CABIN.habitableM3).toBeGreaterThanOrEqual(4.5);
    expect(LANDER_CABIN.habitableM3).toBeLessThanOrEqual(9);
  });

  it("HAB-01 she reaches a machine only standing next to it, and the nearest one wins", () => {
    const acople = LANDER_CABIN.stations.find((s) => s.id === "acople")!;
    expect(nearestStation(LANDER_CABIN, acople.stand)?.id).toBe("acople");
    expect(nearestStation(LANDER_CABIN, { x: acople.stand.x + 0.1, z: acople.stand.z })?.id).toBe("acople");
    expect(nearestStation(LANDER_CABIN, { x: 5, z: 5 })).toBeUndefined();
  });

  it("HAB-01 the floor keeps her inside the walls and off the seats", () => {
    const f = LANDER_CABIN.floor;
    const p = clampToFloor(f, { x: 9, z: -9 });
    expect(p.x).toBeLessThanOrEqual(f.maxX);
    expect(p.z).toBeGreaterThanOrEqual(f.minZ);
    for (const b of f.blocked) {
      const c = { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
      const q = clampToFloor(f, c, { x: f.minX + 0.05, z: f.minZ + 0.05 });
      const inside = q.x > b.minX && q.x < b.maxX && q.z > b.minZ && q.z < b.maxZ;
      expect(inside).toBe(false);
    }
  });

  it("HAB-02 the docking console undocks, enters the vehicle it is docked to, or arms the docking assist", () => {
    expect(ids("acople", { ...base, dockedTo: "nodriza" })).toEqual(["entrar-nodriza", "desacoplar"]);
    expect(ids("acople", { ...base, dockedTo: "estacion" })).toEqual(["entrar-estacion", "desacoplar"]);
    const free = cabinActions("acople", { ...base, dockInRange: true });
    expect(free.map((a) => a.id)).toEqual(["asistente-acople"]);
    expect(free[0]!.enabled).toBe(true);
    const far = cabinActions("acople", base);
    expect(far[0]!.enabled).toBe(false);
    expect(far[0]!.why).toMatch(/puerto/);
    expect(cabinActions("acople", { ...base, dockInRange: true, dockAssist: true })[0]!.label).toMatch(/Apagar/);
  });

  it("HAB-02 the EVA hatch opens only anchored, and says why not", () => {
    const shut = cabinActions("escotilla", base)[0]!;
    expect(shut.id).toBe("salir-eva");
    expect(shut.enabled).toBe(false);
    expect(shut.why).toMatch(/anclad/);
    expect(cabinActions("escotilla", { ...base, landed: true, canLeaveEva: true })[0]!.enabled).toBe(true);
  });

  it("HAB-02 the pilot seat always sits her down to fly; the mat opens the settings", () => {
    expect(cabinActions("asiento", base)[0]).toMatchObject({ id: "pilotar", enabled: true });
    expect(cabinActions("esterilla", base)[0]).toMatchObject({ id: "ajustes", enabled: true });
  });

  it("HAB-04 the asteroid's mind console offers the duel only when the stage allows it", () => {
    expect(cabinActions("mente", base)[0]).toMatchObject({ id: "mente", enabled: false });
    const open = cabinActions("mente", { ...base, landed: true, mind: { label: "Entrar en su mente", enabled: true } })[0]!;
    expect(open).toMatchObject({ id: "mente", enabled: true, label: "Entrar en su mente" });
    const locked = cabinActions("mente", { ...base, landed: true, mind: { label: "Entrar en su mente", enabled: false, why: "Primero la sonda" } })[0]!;
    expect(locked.why).toBe("Primero la sonda");
  });
});

describe("walking between the cabin's machines (HAB-01)", () => {
  it("HAB-01 the way from any machine to any other goes around the seats, never through them", async () => {
    const { floorPath, clearPath } = await import("./cabin");
    const f = LANDER_CABIN.floor;
    for (const a of LANDER_CABIN.stations)
      for (const b of LANDER_CABIN.stations) {
        if (a === b) continue;
        const path = floorPath(f, a.stand, b.stand);
        expect(path[path.length - 1]).toEqual(b.stand);
        let p = a.stand;
        for (const q of path) {
          expect(clearPath(f, p, q)).toBe(true);
          p = q;
        }
      }
  });
});
