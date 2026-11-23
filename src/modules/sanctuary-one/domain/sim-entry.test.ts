import { describe, expect, it } from "vitest";
import { SIM_ENTRY_S, simMoment } from "./sim-entry";

describe("entrar en la máquina de simulación (Cold Sanctuary, VirtualizationTank.Enter)", () => {
  it("se acerca, se pone la máscara de la puerta, se abren las puertas, entra, se cierran, va al centro, flota a media altura y se abre en estrella", () => {
    const phases: string[] = [];
    for (let t = 0; t < SIM_ENTRY_S + 0.5; t += 0.05) {
      const p = simMoment(t).phase;
      if (phases[phases.length - 1] !== p) phases.push(p);
    }
    expect(phases).toEqual(["acercarse", "mascara", "abrir", "entrar", "cerrar", "centro", "flotar", "estrella", "fin"]);
  });
  it("no cruza la puerta cerrada: entra solo con las puertas abiertas, y con la máscara puesta", () => {
    for (let t = 0; t < SIM_ENTRY_S; t += 0.02) {
      const m = simMoment(t);
      if (m.along > 1.02 && m.along < 1.98) {
        expect(m.doors).toBe(1);
        expect(m.mask).toBe(true);
      }
    }
  });
  it("acaba en el centro, a la mitad del agua, con brazos y piernas abiertos y la cámara habiendo girado alrededor", () => {
    const end = simMoment(SIM_ENTRY_S);
    expect(end.along).toBe(3);
    expect(end.rise).toBeCloseTo(0.5);
    expect(end.star).toBe(1);
    expect(end.doors).toBe(0);
    expect(end.orbit).toBeGreaterThan(Math.PI);
    expect(end.fade).toBeCloseTo(1, 5);
    expect(simMoment(0).fade).toBe(0);
  });
});
