import { describe, expect, it } from "vitest";
import { hoverThrottle, lmAcross, lmStart, lmStep, lmThrottle, type LmSimSpec } from "./lm-sim";

const S: LmSimSpec = { dryKg: 4280 + 2353 + 287, thrustN: 45040, minThrottle: 0.1, maxThrottle: 0.6, ispS: 311, moonG: 1.62, startAltM: 150, propKg: 400, touchdown: { verticalMs: 3.05, horizontalMs: 1.22 } };

describe("el alunizaje a mano del simulador del LM (puesto 8)", () => {
  it("en vuelo estacionario se mantiene: el empuje iguala el peso lunar", () => {
    const h = hoverThrottle(S, S.propKg);
    expect(h).toBeGreaterThan(0.1);
    expect(h).toBeLessThan(0.6);
    let m = { ...lmStart(S), vzMs: 0 };
    for (let i = 0; i < 10; i++) m = lmStep(S, m, 0.1);
    expect(m.altM).toBeCloseTo(150, 0);
  });

  it("el acelerador va del 10 % al 60 % a pasos del 5 %, y el corte lo apaga", () => {
    let m = { ...lmStart(S), throttle: 0.55 };
    m = lmThrottle(S, m, 1);
    m = lmThrottle(S, m, 1);
    expect(m.throttle).toBeCloseTo(0.6, 6);
    m = lmThrottle(S, m, 0);
    expect(m.throttle).toBe(0);
    m = lmThrottle(S, m, 1);
    expect(m.throttle).toBeCloseTo(0.1, 6);
    m = lmThrottle(S, m, -1);
    expect(m.throttle).toBe(0);
  });

  it("toca suave dentro de los límites del tren (3,05 m/s y 1,22 m/s) o se da un golpe", () => {
    let soft = { ...lmStart(S), altM: 1, vzMs: -1, vxMs: 0.2, vyMs: 0.3 };
    while (!soft.landed) soft = lmStep(S, soft, 0.05);
    expect(soft.landed.ok).toBe(true);
    let hard = { ...lmStart(S), altM: 20, throttle: 0 };
    while (!hard.landed) hard = lmStep(S, hard, 0.05);
    expect(hard.landed.ok).toBe(false);
    let drift = lmAcross({ ...lmStart(S), altM: 0.5, vzMs: -0.5, vxMs: 1.2, vyMs: 0 }, "x", 1);
    while (!drift.landed) drift = lmStep(S, drift, 0.05);
    expect(drift.landed.ok).toBe(false);
  });

  it("sin propelente el motor se apaga", () => {
    let m = { ...lmStart(S), propKg: 0.5, throttle: 0.6 };
    for (let i = 0; i < 20; i++) m = lmStep(S, m, 0.1);
    expect(m.propKg).toBe(0);
    expect(m.throttle).toBe(0);
  });
});
