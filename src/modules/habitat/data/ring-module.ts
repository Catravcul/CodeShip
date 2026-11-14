import { ACTION_REACH_M, type Interactable } from "@core/spacing";

/**
 * The habitat module in the spinning ring (docs/design/interiores.md): 4 m wide, 18 m long, 2,6 m
 * high, at 1 g. Lengthened from 12 m so that every thing one can use stands 2 m from the next
 * (HAB-08, the spacing rule from Cold Sanctuary): the exercise corner, the yoga mat, Doménica's cabin
 * and the cats' corner were crowded within 1,1 m of each other. A ring of 56 m radius is 352 m round,
 * so a longer module costs nothing in the design.
 */
export const RING_MODULE = { halfW: 2, halfL: 9, height: 2.6 } as const;

export type RingStationId = "huerto" | "cocina" | "procesado" | "biorreactor" | "enfermeria" | "panel" | "yoga" | "ejercicio" | "camarote" | "gatos" | "gallinero" | "terreno" | "perros" | "navegacion" | "acuario";

/** A station of the ring: where she stands to use it (floor, m) and what she looks at (the thing). */
export interface RingStationData {
  readonly id: RingStationId;
  readonly label: string;
  readonly stand: { readonly x: number; readonly z: number };
  readonly look: { readonly x: number; readonly y: number; readonly z: number };
}

/** Farm deck positions are measured from the doorway in the far wall (z = halfL). */
const D = RING_MODULE.halfL;

/**
 * The stations, laid out 2 m apart (stands 1 m off each wall, so the two walls' stands are 2 m
 * apart across the aisle). Noisy, wet end by the elevator: growing racks, galley, mill, lab; then the
 * sickbay, the ship-mind panel and the navigation console; the quiet crew end: exercise, cabin, yoga
 * mat and the cats; the farm deck past the doorway.
 */
export const RING_STATIONS: readonly RingStationData[] = [
  { id: "huerto", label: "Huerto", stand: { x: -1.0, z: -3.2 }, look: { x: -1.75, y: 0.9, z: -3.2 } },
  { id: "cocina", label: "Cocina", stand: { x: 1.0, z: -4.4 }, look: { x: 1.7, y: 1.0, z: -4.6 } },
  { id: "procesado", label: "Molino y procesador de soja", stand: { x: 1.0, z: -2.3 }, look: { x: 1.7, y: 0.85, z: -2.3 } },
  { id: "biorreactor", label: "Laboratorio de carne cultivada", stand: { x: 1.0, z: -0.3 }, look: { x: 1.6, y: 1.0, z: -0.3 } },
  { id: "enfermeria", label: "Enfermería", stand: { x: -1.0, z: 0.6 }, look: { x: -1.6, y: 0.75, z: 0.6 } },
  { id: "panel", label: "Mente de la nave", stand: { x: 1.0, z: 2.0 }, look: { x: 1.95, y: 1.4, z: 2.0 } },
  // Navigation console on the left wall: repeats the flight deck (map, trips, missions, nano_net).
  { id: "navegacion", label: "Consola de navegación", stand: { x: -1.0, z: 2.75 }, look: { x: -1.95, y: 1.3, z: 2.75 } },
  { id: "ejercicio", label: "Rincón de ejercicio", stand: { x: 1.0, z: 4.4 }, look: { x: 1.6, y: 0.8, z: 4.6 } },
  // Doménica's cabin (her letters are read there, like the ISS crew quarters' laptop).
  { id: "camarote", label: "Camarote de Doménica", stand: { x: -1.0, z: 5.4 }, look: { x: -1.6, y: 0.9, z: 5.3 } },
  { id: "yoga", label: "Esterilla de yoga", stand: { x: 1.0, z: 7.6 }, look: { x: 1.5, y: 0.3, z: 7.8 } },
  { id: "gatos", label: "Rincón de los gatos", stand: { x: -1.0, z: 7.7 }, look: { x: -1.6, y: 0.15, z: 8.0 } },
  // Through the doorway at the far end: the farm deck.
  { id: "perros", label: "Rincón de los chihuahuas", stand: { x: 2.4, z: D + 1.0 }, look: { x: 3.6, y: 0.15, z: D + 1.7 } },
  { id: "gallinero", label: "Gallinero", stand: { x: 5.7, z: D + 1.4 }, look: { x: 7.3, y: 0.4, z: D + 1.4 } },
  { id: "terreno", label: "Cubierta de cultivo", stand: { x: 0, z: D + 2.6 }, look: { x: -2, y: 0.5, z: D + 5 } },
  // The ring aquarium (1 m³, docs/design/santuario-espacial.md) against the doorway wall, left of the hygiene stall.
  { id: "acuario", label: "Acuario del anillo", stand: { x: -4.0, z: D + 1.6 }, look: { x: -4.0, y: 1.1, z: D + 0.5 } },
];

/** The elevator up the spoke, at the near end wall: its column (the thing) and where its button shows. */
export const RING_ELEVATOR = { centre: { x: 0, y: 1.3, z: -RING_MODULE.halfL + 0.5 }, anchor: { x: 0, z: -RING_MODULE.halfL + 1.4 } } as const;

/** Every thing one can use in the ring module and on the farm deck (HAB-08). */
export function ringInteractables(): Interactable[] {
  return [
    { id: "ascensor", centre: RING_ELEVATOR.centre, anchor: { x: RING_ELEVATOR.anchor.x, y: 0, z: RING_ELEVATOR.anchor.z } },
    ...RING_STATIONS.map((s) => ({ id: s.id, centre: s.look, anchor: { x: s.stand.x, y: 0, z: s.stand.z } })),
  ];
}

/** Within this of a station's stand its button shows (half the spacing: never two at once). */
export const RING_REACH_M = ACTION_REACH_M;
