import type { AsanaData, AsanaSequenceData } from "../domain/asana";
import { COLD_SANCTUARY_ASANAS, COLD_SANCTUARY_SEQUENCES } from "./cold-sanctuary-asanas";

/**
 * Codeship's additions to Cold Sanctuary's postures (docs/design/esqueleto.md, «Añadidos»), kept apart so
 * that the generated file stays a copy. Two postures of the Sun Salutation rest on the hands in the asana
 * sheet (docs/yoga-asanas-spec.md: «manos de apoyo», «codos pegados al cuerpo») but Cold Sanctuary only
 * angles the arms; without a floor reach, the arms hold the body up and the legs float. Same convention
 * as the generated data (Unity, metres from the pelvis, y < 0,3 = on the floor).
 */
export const CODESHIP_REACHES: Readonly<Record<string, AsanaData["reaches"]>> = {
  // Bhujangasana: palms under the lower ribs, beside the chest.
  "bhujangasana-cobra": [
    { end: "HandLeft", target: [-0.2, 0.03, 0.42] },
    { end: "HandRight", target: [0.2, 0.03, 0.42] },
  ],
  // Ashtanga Namaskara: palms under the shoulders, elbows bent by the ribs.
  "ashtanga-namaskara-ocho-miembros": [
    { end: "HandLeft", target: [-0.2, 0.03, 0.4] },
    { end: "HandRight", target: [0.2, 0.03, 0.4] },
  ],
};

/** Every asana Codeship knows: Cold Sanctuary's, with Codeship's additions. */
export const ASANAS: readonly AsanaData[] = COLD_SANCTUARY_ASANAS.map((a) => (CODESHIP_REACHES[a.id] ? { ...a, reaches: [...a.reaches, ...CODESHIP_REACHES[a.id]!] } : a));
export const ASANA_SEQUENCES: readonly AsanaSequenceData[] = COLD_SANCTUARY_SEQUENCES;

export const asanaById = (id: string): AsanaData | undefined => ASANAS.find((a) => a.id === id);
