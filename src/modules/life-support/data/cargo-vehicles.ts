import type { Sourced } from "@core/units";
import { ECLSS_SOURCES as S, GAME_VALUE } from "./eclss-sources";

export type CargoVehicleId = "dragon" | "cygnus";

/** A real ISS cargo vehicle: what it carries pressurised and how long it takes from launch to the station. */
export interface CargoVehicle {
  readonly id: CargoVehicleId;
  readonly name: string;
  readonly pressurizedKg: Sourced<number>;
  /** From launch to docking or berthing, board hours. */
  readonly transitH: Sourced<number>;
  /** Where it arrives (said on the card). */
  readonly port: string;
  /** Caught by Canadarm2 at the capture point and berthed (Cygnus); otherwise it docks by itself (Dragon). */
  readonly captured?: boolean;
}

/**
 * The cargo vehicles that fill the pantry until the station grows food (docs/design/soporte-vital.md,
 * «Despensa»). Both real: Cargo Dragon docks by itself on Harmony's IDA; Cygnus is caught by Canadarm2 and
 * berthed on Unity's nadir CBM.
 */
export const CARGO_VEHICLES: readonly CargoVehicle[] = [
  {
    id: "dragon",
    name: "Dragon de carga",
    pressurizedKg: { value: 2507, source: S.dragon2, note: "Hasta 2507 kg presurizados (y 800 kg en el maletero, que aquí no se usa)" },
    transitH: { value: 18, source: S.crs28, note: "CRS-28: lanzada el 5 de junio de 2023 a las 15:47 UTC, acoplada el 6 a las 09:54 (18 h)" },
    port: "se acopla sola en el IDA de Harmony",
  },
  {
    id: "cygnus",
    name: "Cygnus",
    pressurizedKg: { value: 3749, source: S.ng19, note: "NG-19: 3749 kg presurizados" },
    transitH: { value: 60, source: S.ng19, note: "NG-19: lanzada el 2 de agosto de 2023 a las 00:31 UTC, atracada el 4 a las 12:28 (60 h)" },
    port: "Canadarm2 la atrapa y la atraca en el CBM de nadir de Unity",
    captured: true,
  },
];

export const cargoVehicle = (id: CargoVehicleId): CargoVehicle => CARGO_VEHICLES.find((v) => v.id === id)!;

export const CARGO_TUNING = {
  /** Days of supplies a cargo brings for the crew (the ISS gets several cargo vehicles a year). */
  daysPerCargo: { value: 180, source: S.logistics2024, note: GAME_VALUE },
  /** Mass of one spare (ORU or bed): not published per ORU (docs/research/soporte-vital.md §6). */
  spareKg: { value: 20, source: S.logistics2024, note: "Estimación nuestra" },
} as const satisfies Record<string, Sourced<number>>;
