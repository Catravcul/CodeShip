import type { Sourced } from "@core/units";

export type Breath = "inhala" | "exhala" | "retén";

/** One posture of a sequence. `pose` is the key the 3D figure uses to take the shape. */
export interface Posture {
  readonly name: string;
  readonly breath: Breath;
  readonly cue: string;
  readonly pose: string;
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
      { name: "Flexión", breath: "exhala", cue: "barbilla al pecho", pose: "neck-down" },
      { name: "Extensión", breath: "inhala", cue: "cabeza atrás", pose: "neck-up" },
      { name: "Rotación", breath: "inhala", cue: "cara a la derecha y vuelve al frente", pose: "neck-turn" },
      { name: "Inclinación lateral", breath: "exhala", cue: "oreja al hombro derecho, luego al izquierdo", pose: "neck-tilt" },
      { name: "Círculo completo", breath: "inhala", cue: "barbilla, oreja, atrás, oreja, barbilla", pose: "neck-circle" },
      { name: "Hombros hacia delante", breath: "exhala", cue: "arriba-atrás inhalando, abajo-delante exhalando", pose: "shoulders" },
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
      { name: "Pranamasana", breath: "exhala", cue: "palmas juntas frente al esternón", pose: "prayer" },
      { name: "Hasta Uttanasana", breath: "inhala", cue: "brazos arriba a la anchura de los hombros", pose: "arms-up" },
      { name: "Uttanasana", breath: "exhala", cue: "bisagra de cadera, manos junto a los pies", pose: "fold" },
      { name: "Ashwa Sanchalanasana", breath: "inhala", cue: "pie derecho atrás, rodilla al suelo", pose: "lunge" },
      { name: "Dandasana", breath: "retén", cue: "plancha: talón a coronilla en línea", pose: "plank" },
      { name: "Ashtanga Namaskara", breath: "exhala", cue: "rodillas, pecho y barbilla al suelo", pose: "eight-limbs" },
      { name: "Bhujangasana", breath: "inhala", cue: "cobra: pecho arriba", pose: "cobra" },
      { name: "Adho Mukha Svanasana", breath: "exhala", cue: "perro boca abajo, caderas al cielo", pose: "down-dog" },
      { name: "Ashwa Sanchalanasana", breath: "inhala", cue: "zancada con la otra pierna", pose: "lunge" },
      { name: "Uttanasana", breath: "exhala", cue: "vuelve a plegarte", pose: "fold" },
      { name: "Hasta Uttanasana", breath: "inhala", cue: "sube con los brazos arriba", pose: "arms-up" },
      { name: "Pranamasana", breath: "exhala", cue: "palmas al pecho", pose: "prayer" },
    ],
  },
};

export const YOGA_SEQUENCES: readonly YogaSequence[] = [UPA_YOGA_NECK, SUN_SALUTATION];
