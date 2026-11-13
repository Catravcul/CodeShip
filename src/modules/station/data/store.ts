import type { MaterialId } from "../domain/materials";
import { materialInfo } from "./materials";
import { KG_PER_IMPORTED_KIT } from "./blueprints";
import type { StoreStowage } from "../domain/outfit";

/**
 * How big the station's store is (docs/design/estacion.md, «Almacén»; HC-02 in docs/qa). Each module
 * brings stowage counted in rack bays the size of an ISS International Standard Payload Rack: 1,571 m³
 * of internal volume and about 700 kg of payload (real). How many rack bays of stowage each kind of
 * module keeps is a game value, on the order of the ISS: Unity (Node 1) holds four ISPRs (real), used
 * here as stowage. The hangar keeps raw rock in bulk, unpressurised, like the mothership's 20 t hold
 * (game value).
 */
export const STORE_STOWAGE: StoreStowage = {
  rackKg: 700,
  rackM3: 1.571,
  racksByKind: { nodo: 4, habitat: 2, fabrica: 4, planta: 4, agricola: 4, hangar: 0 },
  bulkKgByKind: { hangar: 20000 },
  source: "https://en.wikipedia.org/wiki/International_Standard_Payload_Rack",
  note: "1,571 m³ y 700 kg por bastidor ISPR (reales); Unity tiene 4 ISPR (real, https://en.wikipedia.org/wiki/Unity_(ISS_module)); bastidores de almacén por módulo y bodega a granel del hangar: valores de juego",
};

/**
 * Room that `n` of a material takes in the store's racks, kg: kits are counted in units of
 * `KG_PER_IMPORTED_KIT`; propellants (xenon, hydrazine, NTO…) live in the propellant depot's own tanks
 * («Depósitos de propelente») and take none.
 */
export const storeKgOf = (id: MaterialId, n: number): number => {
  const m = materialInfo(id);
  if (m?.propellant) return 0;
  return m?.unit === "kits" ? n * KG_PER_IMPORTED_KIT : n;
};
