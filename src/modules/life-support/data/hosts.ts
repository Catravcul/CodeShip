import type { LifeSupportConfig } from "../domain/life-support";
import { resupply } from "../domain/resupply";
import { ECLSS_MACHINES } from "./eclss-machines";
import { ECLSS_SOURCES as S, GAME_VALUE } from "./eclss-sources";

/** One kit of spares: one of each failure mode's spare (what a year's resupply brings, at least). */
const ONE_OF_EACH = Object.fromEntries(resupply(1, 1, ECLSS_MACHINES).spares.map((s) => [s.id, 1]));

/**
 * The ISS-type station's life support as it starts (docs/design/soporte-vital.md, «Anfitriones»).
 * - Crew: Doménica alone.
 * - Free air: the ISS's 388 m³ habitable volume (issFacts).
 * - Water: the 1200 L the ISS keeps stored (its floor is 818 L; ICES-2022-098).
 * - Food (the galley's pantry): two months of packaged food for one (2,39 kg a day), what the last cargo left;
 *   the next ones are ordered at the galley (Dragon or Cygnus, cargo-vehicles.ts). Tanks and spares: game values.
 */
export const STATION_LIFE_SUPPORT: LifeSupportConfig = {
  crew: 1,
  freeAirM3: 388,
  waterKg: 1200,
  foodKg: 2.39 * 60,
  o2TankKg: 100,
  n2TankKg: 100,
  spares: ONE_OF_EACH,
};

export const STATION_LIFE_SUPPORT_SOURCES = {
  freeAirM3: S.issFacts,
  waterKg: S.water2022,
  food: `${S.metman} (2,39 kg/día); 60 días: ${GAME_VALUE}`,
  tanksAndSpares: GAME_VALUE,
} as const;
