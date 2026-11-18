/**
 * How a training post acts out each step of its challenge (reglas.md §4: every step answered right is seen
 * happening, at the post, with hands and objects visible and nothing going through anything). The domain says what
 * happens in a small vocabulary; the scene (adapters/three/s3-stage.ts) decides how it looks, at the post's own
 * furniture. Pure.
 */

/** Where she is for the beat, at the post's furniture. */
export type HerSpot =
  | "silla" // the chair before the tribunal's table
  | "bascula" // on the medical scale
  | "camilla-sentada"
  | "camilla-tumbada"
  | "tabla-vista" // standing before the eye chart
  | "borde" // on the pool's edge
  | "largo" // swimming a length of the pool
  | "flotando" // treading water in the pool
  | "balsa" // in the life raft
  | "izada" // hoisted on the rescue harness
  | "camara" // seated inside the hypobaric chamber
  | "banco-traje" // standing at the suit's stand on the pool's edge
  | "fondo"; // on the pool's floor by the ISS mock-up

/** How she holds herself. */
export type HerPose = "de-pie" | "sentada" | "tumbada" | "nadando" | "flotando" | "brazos-arriba" | "mano-adelante" | "mareada" | "neutra";

/** The things in the beat. */
export type Thing =
  | "carpeta"
  | "sello"
  | "acreditacion"
  | "manguito"
  | "electrodos"
  | "tabla-vista"
  | "mono"
  | "balsa"
  | "arnes"
  | "mascara"
  | "lista"
  | "prenda-lcvg"
  | "pantalon-emu"
  | "torso-emu"
  | "casco"
  | "plomo"
  | "espuma";

/** Where a thing is: on the table, in a hand (hers or the trainer's), on her (arm, chest, face, body, waist), in the water. */
export type ThingSpot = "mesa" | "mano-ella" | "mano-entrenador" | "brazo" | "pecho" | "cara" | "cuerpo" | "cintura" | "agua" | "pared";

export interface Beat {
  readonly her: HerSpot;
  readonly pose: HerPose;
  /** The trainer's gesture: watching, writing, handing over, helping her (at her side). */
  readonly trainer: "mira" | "escribe" | "da" | "ayuda";
  /** What is out and where; anything not listed is put away. */
  readonly things: readonly { readonly thing: Thing; readonly at: ThingSpot }[];
  /** What the screen says while it happens. */
  readonly caption: string;
  /** For a loop: how many times the motion repeats (a length swum three times). */
  readonly times?: number;
}

/** The beats of a challenge: per exercise, one per step of an order (in its order) or one for a question. */
export type Beats = readonly (readonly Beat[])[];

/** The beats to play when step `index` of a chore is answered right, from part `from` on (the parts already seen are skipped). */
export function beatsFor(beats: Beats, index: number, from = 0): readonly Beat[] {
  return (beats[index] ?? []).slice(from);
}
