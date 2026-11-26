import { describe, expect, it } from "vitest";
import { BEE_DAYS, BEE_STAGES, BEE_TOTAL_DAYS, FLY_SHARE, advanceBee, beeAt, beeStageAt } from "./abeja";

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
    expect(beeAt(7.9 / 19).larva).toBeGreaterThan(beeAt(3.2 / 19).larva * 5);
    expect(beeAt(7.9 / 19).cap).toBe(0);
    expect(beeAt(9 / 19).cap).toBe(1);
    const p = beeAt(14 / 19);
    expect(p.eyes).toBeGreaterThan(0.3);
    expect(p.body).toBe(0);
  });

  it("cambia de forma continua (sin saltos) en todo el ciclo", () => {
    const keys = ["egg", "lean", "larva", "cap", "bee", "eyes", "thorax", "body", "wings", "out"] as const;
    const N = 4000;
    for (let i = 1; i <= N; i++) {
      const a = beeAt(((i - 1) / N) * (1 + FLY_SHARE));
      const b = beeAt((i / N) * (1 + FLY_SHARE));
      for (const k of keys) expect(Math.abs(b[k] - a[k]), `${k} en ${i}`).toBeLessThan(0.12);
    }
  });

  it("su reloj recorre el desarrollo en los minutos del ajuste y vuelve a empezar", () => {
    let k = 0;
    for (let s = 0; s < 179; s++) k = advanceBee(k, 1, 3);
    expect(k).toBeGreaterThan(0.99);
    expect(advanceBee(1 + FLY_SHARE, 1, 3)).toBe(0);
  });
});
