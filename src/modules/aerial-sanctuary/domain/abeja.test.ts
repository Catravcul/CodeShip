import { describe, expect, it } from "vitest";
import { BEE_DAYS, BEE_STAGES, BEE_TOTAL_DAYS, CELL, FLY_SHARE, LARVA, LARVA_MAX, advanceBee, beeAt, beeStageAt, larvaShape } from "./abeja";

describe("la abeja de la pupa del centro de la pirámide (Apis cerana)", () => {
  it("dura 3 + 5 + 11 = 19 días, uno o dos menos que A. mellifera (21: Winston 1987)", () => {
    expect(BEE_DAYS.egg + BEE_DAYS.larva + BEE_DAYS.capped).toBe(19);
    expect(BEE_TOTAL_DAYS).toBeLessThan(21);
  });

  it("sus etapas van en orden: huevo, larva, prepupa, pupa, adulta", () => {
    const order = ["huevo", "larva", "prepupa", "pupa", "adulta"];
    let last = 0;
    for (const s of BEE_STAGES) {
      expect(order.indexOf(s.phase)).toBeGreaterThanOrEqual(last);
      last = order.indexOf(s.phase);
    }
    expect(beeStageAt(0).phase).toBe("huevo");
    expect(beeStageAt(4 / 19).phase).toBe("larva");
    expect(beeStageAt(12 / 19).phase).toBe("pupa");
    expect(beeStageAt(1).phase).toBe("adulta");
  });

  it("el huevo se inclina y se tumba, y la larva sale al tercer día", () => {
    expect(beeAt(0).lean).toBe(0);
    expect(beeAt(2.8 / 19).lean).toBeCloseTo(Math.PI / 2, 2);
    expect(beeAt(2.9 / 19).egg).toBe(1);
    expect(beeAt(3.1 / 19).egg).toBe(0);
    expect(beeAt(3.5 / 19).larva).toBeGreaterThan(0);
  });

  it("la larva crece mucho, la operculan al día 8 y la pupa se oscurece: primero los ojos", () => {
    // ~1 500 veces su peso: largo × grosor² (a lo largo y a lo ancho), aunque su C deja de alargarse al llenar el fondo.
    const vol = (d: number) => beeAt(d / 19).larva * beeAt(d / 19).thick ** 2;
    expect(vol(7.9)).toBeGreaterThan(vol(3.2) * 40);
    expect(beeAt(7.9 / 19).cap).toBe(0);
    expect(beeAt(9 / 19).cap).toBe(1);
    const p = beeAt(14 / 19);
    expect(p.eyes).toBeGreaterThan(0.3);
    expect(p.body).toBe(0);
  });

  it("cambia de forma continua (sin saltos) en todo el ciclo", () => {
    const keys = ["egg", "lean", "larva", "thick", "curl", "cap", "bee", "eyes", "thorax", "body", "wings", "out"] as const;
    const N = 4000;
    for (let i = 1; i <= N; i++) {
      const a = beeAt(((i - 1) / N) * (1 + FLY_SHARE));
      const b = beeAt((i / N) * (1 + FLY_SHARE));
      for (const k of keys) expect(Math.abs(b[k] - a[k]), `${k} en ${i}`).toBeLessThan(0.12);
    }
  });

  it("nada se sale de la celda (Berón 2026-11-28): la larva es una C en el fondo que como mucho lo llena", () => {
    const half = CELL.width / 2;
    for (let i = 0; i <= 2000; i++) {
      const p = beeAt(i / 2000 - 1e-9);
      if (p.thick <= 0 || p.larva <= 0) continue;
      const f = larvaShape(p);
      expect(f.reach, `día ${(i / 2000) * 19}`).toBeLessThanOrEqual(half);
      expect(f.top).toBeLessThanOrEqual(CELL.depth);
    }
    // La larva crecida, enroscada en C, llena el fondo (su borde al 95 % del medio ancho): ni más ni menos.
    const grown = beeAt(7.99 / 19);
    expect(grown.curl).toBe(1);
    expect(grown.larva).toBeCloseTo(LARVA_MAX, 2);
    expect(larvaShape(grown).reach).toBeCloseTo(LARVA.fill * half, 2);
  });

  it("el giro a lo largo del eje es de la prepupa: enroscada hasta operculada, recta antes de la pupa", () => {
    expect(beeAt(7.9 / 19).curl).toBe(1);
    expect(beeAt(9.6 / 19).curl).toBe(0);
    expect(beeAt(9.6 / 19).phase).toBe("prepupa");
    expect(beeAt(9.6 / 19).larva).toBeCloseTo(LARVA.prepupa, 2);
    expect(beeAt(10.3 / 19).larva).toBe(0);
    // La pupa no despliega las alas dentro de la celda.
    expect(beeAt(18.99 / 19).wings).toBe(0);
  });

  it("su reloj recorre el desarrollo en los minutos del ajuste y vuelve a empezar", () => {
    let k = 0;
    for (let s = 0; s < 179; s++) k = advanceBee(k, 1, 3);
    expect(k).toBeGreaterThan(0.99);
    expect(advanceBee(1 + FLY_SHARE, 1, 3)).toBe(0);
  });
});
