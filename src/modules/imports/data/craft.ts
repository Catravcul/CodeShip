import type { CraftSpec } from "@modules/station/domain/blueprint";
import type { TugSpec } from "../domain/tug";
import type { MassDriverSpec } from "../domain/mass-driver";
import { IMPORT_SRC } from "./sources";

/**
 * The station's tug: a small cousin of NASA's asteroid retrieval craft (40 kW SEP at Isp 3 000 s,
 * Keck 2012) with ARM's option-B arms that lift a boulder of up to 4 m off a body.
 */
export const TUG: TugSpec & { readonly sources: Readonly<Record<string, string>> } = {
  powerW: 40e3,
  ispS: 3000,
  efficiency: 0.6,
  // Keck's maximum expected wet mass 15 500 kg minus its 12 000 kg of xenon.
  dryKg: 3500,
  // Game value: hauls inside the region need a fraction of Keck's 13 t.
  xenonCapacityKg: 300,
  maxBoulderM: 4,
  captureHours: 48,
  sources: {
    powerW: IMPORT_SRC.keck,
    ispS: IMPORT_SRC.keck,
    efficiency: IMPORT_SRC.hall,
    dryKg: IMPORT_SRC.keck,
    maxBoulderM: IMPORT_SRC.arm,
    captureHours: "game value",
    xenonCapacityKg: "game value",
  },
};

/**
 * Boulder sizes the tug is sent for: an early, modest source works loose rocks of 1–2 m off bodies
 * that do not obey (game value, under the arms' 4 m): 0,6 to 5 t of Bennu-like rock per haul.
 */
export const TOW_DIAMETERS_M: readonly number[] = [1, 1.5, 2];

export const TUG_CRAFT: CraftSpec = {
  id: "remolcador",
  name: "Remolcador SEP",
  kind: "remolcador",
  massKg: TUG.dryKg,
  note: "40 kW de propulsión eléctrica solar e Isp 3 000 s, como el estudio de Keck de 2012; brazos para rocas de hasta 4 m, como la opción B de ARM",
};

/** A small mass driver: Mass Driver Two's speed and acceleration, O'Neill's 10,5 kg bucket. */
export const MASS_DRIVER: MassDriverSpec & { readonly sources: Readonly<Record<string, string>> } = {
  launchSpeedMs: 112,
  accelMs2: 5000,
  packageKg: 10.5,
  // A slow, modest source (game value): one package every 8 h, about 31 kg a game day.
  packHours: 8,
  sources: { launchSpeedMs: IMPORT_SRC.massDriver, accelMs2: IMPORT_SRC.massDriver, packageKg: IMPORT_SRC.massDriverAmes, packHours: "game value" },
};

export const MASS_DRIVER_CRAFT: CraftSpec = {
  id: "lanzador-masas",
  name: "Lanzador de masas",
  kind: "lanzador",
  massKg: 1200,
  note: "Bobinas de 1,25 m que lanzan paquetes de 10,5 kg a 112 m/s, con un minero que llena los cubos. Masa: valor de juego",
};
