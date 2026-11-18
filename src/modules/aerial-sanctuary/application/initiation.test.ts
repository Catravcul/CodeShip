import { describe, expect, it } from "vitest";
import { POSTS, initiationTasks, IN_CONSTRUCTION, READY_POSTS } from "./initiation";
import { buildLayout } from "../data/layout";
import { reachable } from "../domain/route";

describe("La iniciación como tareas (santuario3-iniciacion.md §4)", () => {
  const L = buildLayout(1.5);
  const tasks = initiationTasks(L);
  it("los trece puestos, en el orden de §4.2", () => {
    expect(POSTS.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 9, 11, 12, 8, 10, 13]);
    expect(tasks).toHaveLength(13);
    expect(tasks.every((t) => t.group === "iniciacion")).toBe(true);
  });
  it("cada uno en su máquina, a la que se llega andando desde su isla, y «En construcción» hasta que llegue su reto", () => {
    for (const t of tasks) {
      const n = Number(t.id.split("-").at(-1));
      if (READY_POSTS.includes(n)) expect(t.detail).not.toContain(IN_CONSTRUCTION);
      else expect(t.detail).toContain(IN_CONSTRUCTION);
      if (t.place.spot !== "isla") throw new Error("no es de una isla");
      const isl = L.islands.find((i) => i.id === t.place.vehicle)!;
      expect(reachable(L.graph, isl.arrival).has(t.place.point), t.id).toBe(true);
    }
  });
  it("lo real se hace en la isla de entrenamiento; el Electron, en la lanzadera; el despegue, en la plataforma", () => {
    const at = (n: number) => tasks.find((t) => t.id === `s3-puesto-${n}`)!.place.vehicle;
    expect([1, 2, 3, 4, 5, 7, 8, 9].map(at).every((v) => v === "entrenamiento")).toBe(true);
    expect(at(10)).toBe("lanzadera");
    expect(at(13)).toBe("plataforma");
  });
});
