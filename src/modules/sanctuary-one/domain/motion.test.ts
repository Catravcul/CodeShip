import { describe, expect, it } from "vitest";
import { activityAt, along, route, wanderAt, waypoint } from "./motion";

describe("movimiento del santuario 1", () => {
  it("un animal merodea dentro de su territorio, y el mismo instante da el mismo sitio", () => {
    const home = { x: 10, z: -5 };
    for (let t = 0; t < 600; t += 7.3) {
      const p = wanderAt(home, 8, 42, t, 0.8);
      expect(Math.hypot(p.x - home.x, p.z - home.z)).toBeLessThanOrEqual(8 + 1e-9);
      expect(wanderAt(home, 8, 42, t, 0.8)).toEqual(p);
    }
  });

  it("anda de un punto al siguiente sin saltos y descansa al llegar", () => {
    const home = { x: 0, z: 0 };
    let prev = wanderAt(home, 6, 7, 0, 1);
    let rested = false;
    for (let t = 0.1; t < 200; t += 0.1) {
      const p = wanderAt(home, 6, 7, t, 1);
      expect(Math.hypot(p.x - prev.x, p.z - prev.z)).toBeLessThanOrEqual(0.1 * 1 + 1e-6);
      if (!p.moving) rested = true;
      prev = p;
    }
    expect(rested).toBe(true);
  });

  it("los puntos de paso cubren el territorio", () => {
    const pts = Array.from({ length: 200 }, (_, i) => waypoint({ x: 0, z: 0 }, 10, 3, i));
    expect(pts.some((p) => p.x > 6)).toBe(true);
    expect(pts.some((p) => p.x < -6)).toBe(true);
  });

  it("una ruta se recorre por metros, y marca dónde se nada", () => {
    const r = route([{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 20, z: 0, swim: true }]);
    expect(r.length).toBe(30);
    expect(along(r, 5)).toMatchObject({ x: 5, y: 0, swim: false, done: false });
    expect(along(r, 20)).toMatchObject({ x: 10, y: 10, swim: true });
    expect(along(r, 40)).toMatchObject({ x: 10, y: 20, done: true });
  });

  it("la jornada de Cold Sanctuary: desayuno, entrenamiento, tareas, comida, libre y a dormir", () => {
    expect(activityAt(3)).toBe("dormir");
    expect(activityAt(7.5)).toBe("desayuno");
    expect(activityAt(8.5)).toBe("entrenamiento");
    expect(activityAt(10)).toBe("tareas");
    expect(activityAt(11.5)).toBe("comida");
    expect(activityAt(14.5)).toBe("entrenamiento");
    expect(activityAt(18)).toBe("libre");
    expect(activityAt(23)).toBe("dormir");
  });
});
