import { describe, expect, it } from "vitest";
import { dockGuidance, dockPractice, dockTick, dockVerdict } from "./dock-practice";

describe("la práctica de acople del simulador de Dragon (puesto 8)", () => {
  it("empieza a 12 m del puerto, algo fuera del eje y girada", () => {
    const g = dockGuidance(dockPractice());
    expect(g.rangeM).toBeCloseTo(12, 6);
    expect(Math.hypot(g.right, g.up)).toBeGreaterThan(0.1);
    expect(Math.abs(g.errDeg.y)).toBeCloseTo(2, 3);
  });

  it("centrada, alineada y a 0,1 m/s, acopla; a 0,2 m/s o fuera del eje, no", () => {
    const p = dockPractice();
    // Off the axis and turned: the verdict says what is out.
    const bad = dockVerdict({ ...dockGuidance(p), closingMs: 0.2 }, { x: 0, y: 0, z: 0 });
    expect(bad.ok).toBe(false);
    expect(bad.out.join(" · ")).toContain("cierre 0,20 m/s");
    expect(bad.out.join(" · ")).toContain("fuera del eje");
    expect(dockVerdict({ name: "", rangeM: 0, closingMs: 0.08, right: 0.03, up: -0.02, errDeg: { x: 0.5, y: -1, z: 0.2 } }, { x: 0, y: 0.1, z: 0 }).ok).toBe(true);
  });

  it("con los toques de la pantalla llega al puerto y el IDSS dice si acopla", () => {
    const p = dockPractice();
    const err = () => dockGuidance(p).errDeg.y;
    // Turn back to the axis: a tap one way; if the error grows, the other.
    const e0 = Math.abs(err());
    p.run.rotate("y", 1);
    dockTick(p, 1);
    const sign = Math.abs(err()) < e0 ? 1 : -1;
    p.run.stop();
    if (sign < 0) p.run.rotate("y", -1);
    for (let i = 0; i < 1000 && Math.abs(err()) > 0.1; i++) dockTick(p, 0.02);
    p.run.stop();
    // Then onto the axis, one axis at a time, with taps towards it.
    for (const axis of ["x", "y"] as const) {
      const off = () => (axis === "x" ? dockGuidance(p).right : dockGuidance(p).up);
      const o0 = Math.abs(off());
      p.run.translate(axis, 1);
      dockTick(p, 0.5);
      const s = Math.abs(off()) < o0 ? 1 : -1;
      p.run.stop();
      p.run.translate(axis, s);
      for (let i = 0; i < 2000 && Math.abs(off()) > 0.02; i++) dockTick(p, 0.01);
      p.run.stop();
    }
    p.run.translate("z", -1);
    for (let i = 0; i < 4000 && !p.contact; i++) dockTick(p, 0.05);
    expect(p.contact?.out).toEqual([]);
    expect(p.contact?.ok).toBe(true);
    expect(Math.abs(dockGuidance(p).closingMs)).toBe(0);
  });
});
