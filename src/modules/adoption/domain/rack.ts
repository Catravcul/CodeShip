import type { SanctuaryArea } from "@modules/sanctuary/domain/area";

/**
 * A real flight habitat that fits in a rack slot of any interior (the Starship's, the ISS's or, until those
 * land, the ring's spot): a small closed tank like JAXA's Aquatic Habitat, or NASA's Rodent Habitat. Only the
 * species it was actually flown with (`accepts`, with its source) can be adopted into it; its living
 * conditions (`area`) go through the sanctuary's `fit()` and `loopStatus()` like any area.
 */
export interface RackHabitat {
  readonly id: string;
  /** Its conditions as an area: 0 g, its light, its water, its temperature, and what its machines do. */
  readonly area: SanctuaryArea;
  /** Species ids (fauna catalogue) flown in this kind of habitat. */
  readonly accepts: readonly string[];
  /** How many animals it holds at most. */
  readonly capacity: number;
  /** One line on the real hardware, in Spanish for the card. */
  readonly summary: string;
  readonly source: string;
}

/** Whether a species can be adopted into one of these habitats (flown in that kind of hardware). */
export const habitatFor = (habitats: readonly RackHabitat[], speciesId: string): RackHabitat[] => habitats.filter((h) => h.accepts.includes(speciesId));
