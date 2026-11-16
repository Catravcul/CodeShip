import { CODESHIP_RING } from "@modules/gravity/data/ring";
import { NODRIZA } from "@modules/mothership/data/mothership";
import type { CraftEnvelope, HangarSize } from "../domain/hangar-berth";
import { OLD_HANGAR_HALF } from "./interior";

/**
 * The old hangar's box (20 × 14 × 20 m). The hangar is backlog (docs/pendientes.md): the ISS has no
 * hangar. The catalogue's assembly site still reads it until `catalogo-montaje` moves assembly to the
 * arm and the exposed platform.
 */
export const HANGAR_SIZE: HangarSize = { x: 2 * OLD_HANGAR_HALF.x, y: 2 * OLD_HANGAR_HALF.y, z: 2 * OLD_HANGAR_HALF.z };

/** The lander: hull 3 × 2 × 5 m (ship/data/explorer.ts) on legs about 1 m long (game value), ≈ 680 kg. */
export const LANDER_ENVELOPE: CraftEnvelope = { id: "explorador", name: "Módulo de aterrizaje", lengthM: 5, widthM: 3, heightM: 3, massKg: 680, basis: "Casco de 3 × 2 × 5 m (ship/data/explorer.ts) y patas de ~1 m; ~680 kg (docs/design/gravedad.md)" };

/** The mothership: 152 m long, rings of 56 m floor radius (112 m across), ~877 t with its xenon. */
export const MOTHERSHIP_ENVELOPE: CraftEnvelope = {
  id: "nodriza",
  name: "Nodriza",
  lengthM: NODRIZA.layout.lengthM,
  widthM: 2 * CODESHIP_RING.floorRadiusM,
  heightM: 2 * CODESHIP_RING.floorRadiusM,
  massKg: 877000,
  basis: "152 m de eslora (mothership/data/mothership.ts), anillos de 56 m de radio de suelo (gravity/data/ring.ts) y ~877 t (docs/design/gravedad.md)",
};
