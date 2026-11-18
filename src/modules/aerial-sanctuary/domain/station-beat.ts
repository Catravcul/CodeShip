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
  | "fondo" // on the pool's floor by the ISS mock-up
  | "junto-gondola" // standing by the centrifuge's gondola
  | "gondola" // strapped in the centrifuge's gondola (it spins with the arm)
  | "avion-escalerilla" // at the foot of the A310's stairs
  | "avion-asiento" // in a seat at the back of the A310's cabin
  | "avion-suelo" // lying on the padded floor of the test zone (the 1,8 g phases)
  | "avion-flotando" // floating in the test zone (0 g)
  | "dragon-asiento" // in the commander's seat of the Dragon simulator
  | "robotica-puesto" // at the robotics workstation, hands on the two controllers
  | "moto" // on a snowmobile in the search line
  | "meteorito" // by the meteorite on the blue ice
  | "tienda" // pitching the Scott tent
  | "muro" // building the snow wall
  | "zanja" // in the snow trench
  | "hornillo" // by the stove
  | "radio"; // by the HF radio

/** How she holds herself. */
export type HerPose = "de-pie" | "sentada" | "tumbada" | "nadando" | "flotando" | "brazos-arriba" | "mano-adelante" | "mareada" | "neutra" | "recostada" | "manos-mandos" | "rodillas" | "moto" | "boca-abajo";

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
  | "espuma"
  | "sensores" // the centrifuge's ECG leads and the reaction button
  | "boton" // the hand control with the button (TsF-18: cancel the light)
  | "casco-vuelo" // a headset in the simulator
  | "mandos" // the robotics workstation's two hand controllers
  | "gps"
  | "etiqueta" // the meteorite's aluminium tag with its number
  | "contador" // the counter and scale held over the find for the photo
  | "camara-foto"
  | "libro" // the field book
  | "pinzas"
  | "bolsa" // the sterile Teflon bag
  | "cinta" // the freezer tape
  | "bandera"
  | "meteorito"
  | "tienda-scott"
  | "muro-nieve"
  | "moto-nieve"
  | "zanja-techo"
  | "hornillo"
  | "olla"
  | "radio-hf"
  | "antena";

/** Where a thing is: on the table, in a hand (hers or the trainer's), on her (arm, chest, face, body, waist), in the water. */
export type ThingSpot = "mesa" | "mano-ella" | "mano-entrenador" | "brazo" | "pecho" | "cara" | "cuerpo" | "cintura" | "agua" | "pared" | "sitio";

/**
 * What a machine of the post does in the beat: the centrifuge spinning up to `g` (its gondola swings out), the A310
 * at a phase of its flight (seen from outside on the runway and climbing out, from its cabin in the parabolas), the
 * simulator's screens showing a phase, the snowmobile line sweeping the ice.
 */
export type RigCue =
  | { readonly kind: "centrifuga"; readonly g: number }
  | { readonly kind: "avion"; readonly phase: "parado" | "despegue" | "tiron" | "ingravidez" | "salida" | "aterrizaje"; readonly g: number }
  | { readonly kind: "pantalla"; readonly show: "lanzamiento" | "aborto" | "acople" | "fallo" | "reentrada" | "alunizaje" };

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
  /** What the post's machine does meanwhile. */
  readonly rig?: RigCue;
}

/** The beats of a challenge: per exercise, one per step of an order (in its order) or one for a question. */
export type Beats = readonly (readonly Beat[])[];

/** The beats to play when step `index` of a chore is answered right, from part `from` on (the parts already seen are skipped). */
export function beatsFor(beats: Beats, index: number, from = 0): readonly Beat[] {
  return (beats[index] ?? []).slice(from);
}
