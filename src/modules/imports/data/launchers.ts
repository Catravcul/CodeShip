import type { Sourced } from "@core/units";
import { IMPORT_SRC } from "./sources";

/** A launcher the Sanctuary can buy a ride on, and its price to low Earth orbit. */
export interface Launcher {
  readonly id: string;
  readonly name: string;
  /** US$ per kg to LEO. */
  readonly usdPerKg: Sourced<number>;
  /** It has no public price yet: the number is a target. */
  readonly target?: boolean;
}

export const LAUNCHERS: readonly Launcher[] = [
  { id: "falcon-9", name: "Falcon 9", usdPerKg: { value: 3246, source: IMPORT_SRC.launchPrices2026, note: "≈ 74 M US$ por 22 800 kg a LEO (precio de 2026)" } },
  { id: "falcon-heavy", name: "Falcon Heavy", usdPerKg: { value: 1410, source: IMPORT_SRC.launchCost, note: "1,41 k US$/kg (Jones 2018, tabla A2, dólares de 2018)" } },
  {
    id: "starship",
    name: "Starship (objetivo)",
    usdPerKg: { value: 100, source: IMPORT_SRC.launchPrices2026, note: "objetivo: menos de 10 M US$ por vuelo con 100 t (Musk, 2022); sin precio público" },
    target: true,
  },
];

export const launcherById = (id: string): Launcher | undefined => LAUNCHERS.find((l) => l.id === id);

/** The in-space stages that push the goods from LEO to the region. */
export const TRANSFER_STAGE = {
  /** Methane–oxygen vacuum engine, s. */
  ispS: { value: 380, source: IMPORT_SRC.raptor, note: "Raptor Vacuum, ≈ 380 s" } as Sourced<number>,
  /** Tanks and engine per kg of propellant (game value: a lean upper stage). */
  tankage: { value: 0.1, source: "game value", note: "masa seca de cada etapa = 10 % de su propelente" } as Sourced<number>,
} as const;

/**
 * Game time a shipment takes: each real day of the Hohmann transfer is this many game hours on the
 * station clock (game value; the real trip is about a year).
 */
export const GAME_HOURS_PER_TRANSIT_DAY = 1;
