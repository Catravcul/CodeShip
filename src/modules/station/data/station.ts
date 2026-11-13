import { Vec3 } from "@core/math/vec3";
import type { Craft } from "../domain/hangar";
import type { StationSite } from "../domain/station";
import { BIO_STARTING_STOCK } from "./bio-materials";

/**
 * The station of the starting region, parked about 1,2 km from Bennu on the side the ship starts on.
 * Game values: position and docking range. The size is that of the structure (`POLANA_LAYOUT`).
 */
export const POLANA_STATION: StationSite = {
  id: "estacion-polana",
  name: "Estación Nueva Polana",
  position: new Vec3(-450, 150, 1100),
  radiusM: 66,
  dockingRangeM: 400,
};

/**
 * What the station had in store when the game starts (game values). The propellants are one fill
 * of the probe's pair and its hydrazine tank, a spare bottle of helium and some xenon for the
 * mothership: all imported (docs/design/estacion.md, «Planta de propelente»). Imported fertiliser and
 * PHB resin for the crops and the composites cell (docs/design/autosustento.md).
 */
export const STARTING_STOCK = {
  agua: 40,
  hierro: 30,
  niquel: 5,
  carbono: 6,
  ceramica: 4,
  oxigeno: 20,
  kit: 6,
  mmh: 170,
  nto: 280,
  hidracina: 45,
  helio: 3,
  xenon: 20000,
  ...BIO_STARTING_STOCK,
} as const;

/** The mothership (rings, farm deck, life on board), parked near Bennu. Mass is filled in at start. */
export const MOTHERSHIP_CRAFT: Craft = { id: "nodriza", name: "Nodriza", kind: "nave", massKg: 0, docked: false, note: "Anillos, huerto y vida a bordo" };
/** The Explorer: the light probe the player flies, which docks on the mothership. */
export const EXPLORER_CRAFT: Craft = { id: "explorador", name: "Explorador", kind: "sonda", massKg: 0, docked: false, note: "El módulo de aterrizaje que pilotas" };
