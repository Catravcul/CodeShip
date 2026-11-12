import { Vec3 } from "@core/math/vec3";
import type { Craft } from "../domain/hangar";
import type { StationSite } from "../domain/station";

/**
 * The station of the starting region, parked about 1,2 km from Bennu on the side the ship starts on.
 * Game values: position, size and docking range.
 */
export const POLANA_STATION: StationSite = {
  id: "estacion-polana",
  name: "Estación Nueva Polana",
  position: new Vec3(-450, 150, 1100),
  radiusM: 60,
  dockingRangeM: 400,
};

/** What the station had in store when the game starts (game values). */
export const STARTING_STOCK = { agua: 40, hierro: 30, niquel: 5, carbono: 6, ceramica: 4, oxigeno: 20, kit: 6 } as const;

/** The player's ship, out flying. */
export const EXPLORER_CRAFT: Craft = { id: "explorador", name: "Explorador", kind: "nave", massKg: 0, docked: false, note: "La nave del jugador" };
