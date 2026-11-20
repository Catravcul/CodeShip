import * as THREE from "three";
import { STATIONS, type StationId } from "./room";

/**
 * Generic rack slots for the sanctuary's hardware (docs/design/catalogo-especies.md, «Ranuras de rack»): the
 * catalogue terminal with its rodent/insect shelf, and the aquatic habitat. Any interior that has rack slots
 * (the Starship's, the ISS's) hosts them by giving each slot a place; nothing else depends on the ring.
 */
export type RackSlotId = "rack-catalogo" | "rack-acuatico";

/** Where an interior puts a slot: the floor point in front of which the hardware stands. */
export interface RackHost {
  slot(id: RackSlotId): THREE.Vector3;
  /** The interactable station that opens it (its button). */
  station(id: RackSlotId): StationId;
}

/** Until the Starship and ISS interiors land: the ring's current spots on the farm deck. */
const RING_SPOT: Readonly<Record<RackSlotId, StationId>> = { "rack-catalogo": "catalogo", "rack-acuatico": "acuario" };

export const RING_RACK_HOST: RackHost = {
  slot: (id) => {
    const look = STATIONS.find((s) => s.id === RING_SPOT[id])!.look;
    return new THREE.Vector3(look.x, 0, look.z);
  },
  station: (id) => RING_SPOT[id],
};
