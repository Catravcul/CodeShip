import { describe, expect, it } from "vitest";
import { arc, length, pt, resample, toLine, type Pt } from "./shape";
import { checkStroke, StrokeTracker } from "./trace";

const line = (a: Pt, b: Pt, n = 20): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n));
const stroke = [pt(0, 0), pt(200, 0)];
const tol = 24;

describe("geometría de los trazos", () => {
  it("un arco va en el sentido de los ángulos (y hacia abajo: crecer es sentido horario)", () => {
    const a = arc(0, 0, 1, 1, -90, 0);
    expect(a[0]).toEqual({ x: 0, y: -1 });
    expect(a.at(-1)).toEqual({ x: 1, y: 0 });
  });
  it("remuestrear conserva los extremos y reparte por igual", () => {
    const r = resample([pt(0, 0), pt(10, 0), pt(10, 10)], 2);
    expect(r[0]).toEqual({ x: 0, y: 0 });
    expect(r.at(-1)!.x).toBeCloseTo(10);
    expect(r.at(-1)!.y).toBeCloseTo(10);
    expect(r).toHaveLength(11);
    expect(length(r)).toBeCloseTo(20);
  });
  it("distancia a una polilínea", () => {
    expect(toLine(pt(5, 3), [pt(0, 0), pt(10, 0)])).toBeCloseTo(3);
    expect(toLine(pt(-4, 3), [pt(0, 0), pt(10, 0)])).toBeCloseTo(5);
  });
});

describe("seguir un trazo con el dedo", () => {
  it("el trazo ideal cuenta, también con un temblor dentro de la tolerancia", () => {
    expect(checkStroke(stroke, line(pt(0, 0), pt(200, 0)), tol).ok).toBe(true);
    const shaky = line(pt(0, 0), pt(200, 0), 40).map((p, i) => pt(p.x, p.y + (i % 2 ? 15 : -15)));
    expect(checkStroke(stroke, shaky, tol).ok).toBe(true);
  });
  it("con pocos puntos (un dedo rápido) también cuenta: se densifica", () => {
    expect(checkStroke(stroke, [pt(0, 0), pt(100, 2), pt(200, 0)], tol).ok).toBe(true);
  });
  it("al revés no cuenta, y lo dice", () => {
    const c = checkStroke(stroke, line(pt(200, 0), pt(0, 0)), tol);
    expect(c.ok).toBe(false);
    expect(c.why).toBe("sentido");
  });
  it("quedarse a la mitad no cuenta (cobertura < 85 %)", () => {
    const c = checkStroke(stroke, line(pt(0, 0), pt(150, 0)), tol);
    expect(c.ok).toBe(false);
    expect(c.why).toBe("corto");
    expect(c.coverage).toBeLessThan(0.85);
  });
  it("llegar al 90 % cuenta", () => {
    expect(checkStroke(stroke, line(pt(0, 0), pt(185, 0)), tol).ok).toBe(true);
  });
  it("empezar por la mitad no cuenta: hay que empezar en el punto", () => {
    const c = checkStroke(stroke, line(pt(110, 0), pt(200, 0)), tol);
    expect(c.ok).toBe(false);
    expect(c.why).toBe("inicio");
  });
  it("lejos de la línea no cuenta", () => {
    const c = checkStroke(stroke, line(pt(0, 60), pt(200, 60)), tol);
    expect(c.ok).toBe(false);
  });
  it("recorrer la figura y luego garabatear fuera no cuenta", () => {
    const c = checkStroke(stroke, [...line(pt(0, 0), pt(200, 0)), ...line(pt(200, 0), pt(200, 300), 30)], tol);
    expect(c.ok).toBe(false);
    expect(c.why).toBe("fuera");
  });
  it("un círculo en su sentido cuenta y en el contrario no", () => {
    const o = arc(100, 100, 80, 80, -90, -450);
    expect(checkStroke(o, o, tol).ok).toBe(true);
    expect(checkStroke(o, [...o].reverse(), tol).ok).toBe(false);
  });
  it("el progreso crece al avanzar", () => {
    const t = new StrokeTracker(stroke, tol);
    t.add(pt(0, 0));
    const a = t.add(pt(100, 0));
    const b = t.add(pt(200, 0));
    expect(a).toBeGreaterThan(0.4);
    expect(b).toBe(1);
  });
  it("un punto (el de la i) se cubre con tocarlo", () => {
    expect(checkStroke([pt(50, 50), pt(50, 56)], [pt(52, 51)], tol).ok).toBe(true);
  });
});
