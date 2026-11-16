import type { Sourced } from "@core/units";

export type Breath = "inhala" | "exhala" | "retén";

/**
 * One posture of a sequence. `asana` is the posture's id in Cold Sanctuary's data (src/modules/body,
 * brought over by scripts/asanas-from-cold-sanctuary.mjs); the figure takes it with IK and breath.
 * `pose` is the older simple shape of the figure's gestures, kept for figures without the skeleton.
 */
export interface Posture {
  readonly name: string;
  readonly breath: Breath;
  readonly cue: string;
  readonly pose: string;
  readonly asana: string;
}

export interface YogaSequence {
  readonly id: string;
  readonly name: string;
  readonly postures: Sourced<readonly Posture[]>;
}

/** Same world as Cold Sanctuary: its asana sheet is the source of truth for sequences and breath. */
const COLD_SANCTUARY_SPEC = "https://github.com/videnacry/cold-sanctuary/blob/master/docs/yoga-asanas-spec.md";

/** Upa-yoga for neck and shoulders: the first thing the Magnate teaches. Breath without sound, 8 s per phase. */
export const UPA_YOGA_NECK: YogaSequence = {
  id: "upa-yoga-cuello",
  name: "Upa-yoga de cuello y hombros",
  postures: {
    source: COLD_SANCTUARY_SPEC,
    note: "6 exercises, 3 repetitions each; 1–4 move only the neck, 5–6 only the shoulders.",
    value: [
      { name: "Flexión", breath: "exhala", cue: "barbilla al pecho", pose: "neck-down", asana: "upa-yoga-barbilla-al-pecho" },
      { name: "Extensión", breath: "inhala", cue: "cabeza atrás", pose: "neck-up", asana: "upa-yoga-cabeza-atras" },
      { name: "Rotación", breath: "inhala", cue: "cara a la derecha y vuelve al frente", pose: "neck-turn", asana: "upa-yoga-cara-a-la-derecha" },
      { name: "Inclinación lateral", breath: "exhala", cue: "oreja al hombro derecho, luego al izquierdo", pose: "neck-tilt", asana: "upa-yoga-oreja-al-hombro-derecho" },
      { name: "Círculo completo", breath: "inhala", cue: "barbilla, oreja, atrás, oreja, barbilla", pose: "neck-circle", asana: "upa-yoga-rueda-a-la-oreja-derecha" },
      { name: "Hombros hacia delante", breath: "exhala", cue: "arriba-atrás inhalando, abajo-delante exhalando", pose: "shoulders", asana: "upa-yoga-hombros-arriba-y-atras" },
    ],
  },
};

/** Surya Namaskar A: 12 asanas, one breath per transition (inhale to open/rise, exhale to fold/lower). */
export const SUN_SALUTATION: YogaSequence = {
  id: "saludo-al-sol",
  name: "Saludo al Sol",
  postures: {
    source: COLD_SANCTUARY_SPEC,
    value: [
      { name: "Pranamasana", breath: "exhala", cue: "palmas juntas frente al esternón", pose: "prayer", asana: "pranamasana-oracion" },
      { name: "Hasta Uttanasana", breath: "inhala", cue: "brazos arriba a la anchura de los hombros", pose: "arms-up", asana: "hasta-uttanasana-brazos-arriba" },
      { name: "Uttanasana", breath: "exhala", cue: "bisagra de cadera, manos junto a los pies", pose: "fold", asana: "uttanasana-flexion-adelante" },
      { name: "Ashwa Sanchalanasana", breath: "inhala", cue: "pie derecho atrás, rodilla al suelo", pose: "lunge", asana: "ashwa-sanchalanasana-zancada" },
      { name: "Dandasana", breath: "retén", cue: "plancha: talón a coronilla en línea", pose: "plank", asana: "dandasana-plancha" },
      { name: "Ashtanga Namaskara", breath: "exhala", cue: "rodillas, pecho y barbilla al suelo", pose: "eight-limbs", asana: "ashtanga-namaskara-ocho-miembros" },
      { name: "Bhujangasana", breath: "inhala", cue: "cobra: pecho arriba", pose: "cobra", asana: "bhujangasana-cobra" },
      { name: "Adho Mukha Svanasana", breath: "exhala", cue: "perro boca abajo, caderas al cielo", pose: "down-dog", asana: "adho-mukha-svanasana-perro-boca-abajo" },
      { name: "Ashwa Sanchalanasana", breath: "inhala", cue: "zancada con la otra pierna", pose: "lunge", asana: "ashwa-sanchalanasana-zancada-2" },
      { name: "Uttanasana", breath: "exhala", cue: "vuelve a plegarte", pose: "fold", asana: "uttanasana-flexion-adelante" },
      { name: "Hasta Uttanasana", breath: "inhala", cue: "sube con los brazos arriba", pose: "arms-up", asana: "hasta-uttanasana-brazos-arriba" },
      { name: "Pranamasana", breath: "exhala", cue: "palmas al pecho", pose: "prayer", asana: "pranamasana-oracion" },
    ],
  },
};

export const YOGA_SEQUENCES: readonly YogaSequence[] = [UPA_YOGA_NECK, SUN_SALUTATION];
