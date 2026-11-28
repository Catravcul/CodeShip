import type { StationDriveSpec } from "../domain/drive";

const S579 = "https://en.wikipedia.org/wiki/S5.79";
const ZVEZDA = "https://en.wikipedia.org/wiki/Zvezda_(ISS_module)";

/**
 * Engines of the Nueva Polana station: two S5.79 like Zvezda's (3,09 kN, Isp 293,7 s, N₂O₄/UDMH).
 * The station's mass and its propellant load are estimates (see the notes).
 */
export const POLANA_DRIVE: StationDriveSpec = {
  engine: "S5.79 (como los motores principales del módulo Zvezda de la ISS)",
  engines: 2,
  thrustN: { value: 3090, source: S579, note: "3,09 kN; Zvezda lleva dos (" + ZVEZDA + ")" },
  ispS: { value: 293.7, source: S579, note: "293,7 s en vacío" },
  propellant: "N₂O₄/UDMH",
  propellantKg: { value: 2000, source: "valor de juego", note: "Valor de juego: del orden de la carga de propelente de reabastecimiento que lleva una Progress" },
  dryMassKg: {
    value: 110_000,
    source: "https://en.wikipedia.org/wiki/Unity_(ISS_module)",
    note:
      "Estimación: nodos como Unity (11,6 t) y Harmony (14,3 t), un laboratorio como Destiny (14,5 t) para la fábrica, un HALO, dos IDA, cuatro alas solares de 1,1 t, radiadores, celosía y hangar",
  },
};
