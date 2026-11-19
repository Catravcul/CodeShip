/**
 * THE ANIMATION CATALOG of sanctuary 1 (Berón 2026-11-19: «he ido a la máquina de jalón al pecho y el reto mostraba
 * la animación de correr… quizás nos falta una lista de animaciones categorizadas y con los retos que las lanzan y en
 * qué paso»). Every animation she (or the staff) plays, by category, and which step of which reto launches it.
 * `application/animations.ts` builds the full table (reto → step → animation) and its test checks it against the
 * retos, so no step is left with a wrong or missing animation. The shapes are drawn in
 * adapters/three/interior/step-show.ts (`gesture`, «entrenar» by its `mov:` name).
 */
export type AnimationCategory = "fuerza-maquina" | "peso-libre" | "cardio" | "peso-corporal" | "preparar" | "oficio" | "yoga";

export interface Animation {
  readonly label: string;
  readonly category: AnimationCategory;
  /** What the body does, in one line (the real technique it follows). */
  readonly does: string;
}

export const CATEGORY_LABEL: Readonly<Record<AnimationCategory, string>> = {
  "fuerza-maquina": "Fuerza en máquina",
  "peso-libre": "Peso libre",
  cardio: "Cardio",
  "peso-corporal": "Peso corporal y saltos",
  preparar: "Preparar, recoger y limpiar",
  oficio: "Gestos de oficio (cocina, cuidado, laboratorio, taller)",
  yoga: "Yoga",
};

/** The exercise motions (played as «entrenar» with `vessel: "mov:<id>"`). */
export const MOTIONS = {
  jalon: { label: "Jalón al pecho", category: "fuerza-maquina", does: "Sentada, tira de la barra desde arriba hasta el pecho y vuelve con los brazos estirados" },
  "press-pecho": { label: "Press de pecho", category: "fuerza-maquina", does: "Sentada, empuja los agarres hacia delante hasta estirar los brazos" },
  "press-hombros": { label: "Press de hombros", category: "fuerza-maquina", does: "Sentada, empuja los agarres desde los hombros por encima de la cabeza" },
  "remo-sentado": { label: "Remo sentado", category: "fuerza-maquina", does: "Sentada, tira de los agarres hacia el abdomen juntando las escápulas" },
  prensa: { label: "Prensa de piernas", category: "fuerza-maquina", does: "Recostada, estira las rodillas empujando la plataforma y vuelve a 90°" },
  extension: { label: "Extensión de cuádriceps", category: "fuerza-maquina", does: "Sentada, estira las rodillas levantando el rodillo" },
  "curl-femoral": { label: "Curl femoral", category: "fuerza-maquina", does: "Sentada, dobla las rodillas llevando el rodillo hacia atrás" },
  "hip-thrust": { label: "Hip thrust", category: "fuerza-maquina", does: "Espalda en el banco, sube la cadera hasta alinearla con el tronco" },
  gemelos: { label: "Elevación de gemelos", category: "fuerza-maquina", does: "De pie bajo las almohadillas, sube y baja los talones" },
  "curl-biceps": { label: "Curl de bíceps", category: "fuerza-maquina", does: "Sentada con los brazos en el apoyo, dobla los codos" },
  sentadilla: { label: "Sentadilla con barra", category: "peso-libre", does: "La barra en los trapecios, baja hasta muslos paralelos y sube" },
  "press-banca": { label: "Press de banca", category: "peso-libre", does: "Tumbada, baja la barra al pecho y empuja hasta estirar los brazos" },
  "peso-muerto": { label: "Peso muerto", category: "peso-libre", does: "Bisagra de cadera con la espalda neutra, sube la barra rozando las piernas" },
  "curl-mancuernas": { label: "Curl con mancuernas", category: "peso-libre", does: "De pie, sube las mancuernas doblando los codos pegados al cuerpo" },
  "press-mancuernas": { label: "Press con mancuernas", category: "peso-libre", does: "Empuja las mancuernas por encima de la cabeza" },
  "cargar-discos": { label: "Cargar discos", category: "peso-libre", does: "Agachada con la espalda recta, levanta un disco y lo lleva a la barra" },
  correr: { label: "Correr en la cinta", category: "cardio", does: "Zancada de carrera, brazos a 90°" },
  pedalear: { label: "Pedalear", category: "cardio", does: "Sentada, rodillas alternas en círculo" },
  remar: { label: "Remo ergómetro", category: "cardio", does: "Piernas, tronco y brazos; vuelta en orden inverso" },
  eliptica: { label: "Elíptica", category: "cardio", does: "Zancada sin impacto con los brazos empujando y tirando de las barras" },
  escaladora: { label: "Escaladora", category: "cardio", does: "Sube escalones con las rodillas altas" },
  skierg: { label: "SkiErg", category: "cardio", does: "Tira de las asas desde arriba doblando la cadera, como el esquí de fondo" },
  dominada: { label: "Dominada", category: "peso-corporal", does: "Colgada, sube hasta pasar la barbilla de la barra y baja estirando los brazos" },
  plancha: { label: "Plancha frontal", category: "peso-corporal", does: "Sobre antebrazos y puntas, el cuerpo en línea" },
  puente: { label: "Puente de glúteos", category: "peso-corporal", does: "Tumbada boca arriba, sube la cadera" },
  "bird-dog": { label: "Bird-dog", category: "peso-corporal", does: "A cuatro patas, brazo y pierna contrarios estirados" },
  estirar: { label: "Estiramiento", category: "peso-corporal", does: "Estiramientos estáticos de cuádriceps e isquios" },
  agacharse: { label: "Preparar el salto", category: "peso-corporal", does: "Rodillas y cadera flexionadas, brazos atrás" },
  salto: { label: "Salto de precisión", category: "peso-corporal", does: "Despega con los dos pies lanzando los brazos" },
  aterrizar: { label: "Aterrizaje", category: "peso-corporal", does: "Puntas primero, amortigua con tobillos, rodillas y cadera" },
  "empujar-trineo": { label: "Empujar el trineo", category: "peso-corporal", does: "Inclinada a 45°, brazos estirados, pasos cortos de la punta del pie" },
} as const satisfies Record<string, Animation>;
export type MotionId = keyof typeof MOTIONS;

/** Gestures of the step player (step-show.ts) used for preparing and cleaning, and their meaning here. */
export const GESTURES = {
  ajustar: { label: "Ajustar la máquina", category: "preparar", does: "Las manos en el asiento, el pasador o los topes" },
  limpiar: { label: "Limpiar", category: "preparar", does: "Frota con la toalla" },
  tomar: { label: "Tomar o dejar algo", category: "preparar", does: "Alcanza, coge y deja" },
  mirar: { label: "Mirar", category: "preparar", does: "Mira y mide con la vista" },
} as const satisfies Record<string, Animation>;
export type GestureId = keyof typeof GESTURES;

/** The motion each machine plays when a step says «the exercise itself» (`maquina`). */
export const MACHINE_MOTION: Readonly<Record<string, MotionId>> = {
  "gym-press-pecho": "press-pecho",
  "gym-press-hombros": "press-hombros",
  "gym-jalon": "jalon",
  "gym-remo": "remo-sentado",
  "gym-prensa": "prensa",
  "gym-extension": "extension",
  "gym-curl-femoral": "curl-femoral",
  "gym-hip-thrust": "hip-thrust",
  "gym-gemelos": "gemelos",
  "gym-curl-biceps": "curl-biceps",
  "gym-jaula": "sentadilla",
  "gym-smith": "sentadilla",
  "gym-arbol-discos": "cargar-discos",
  "gym-soporte-barras": "cargar-discos",
  "gym-press-banca": "press-banca",
  "gym-press-inclinado": "press-banca",
  "gym-banco-fid": "press-banca",
  "gym-plataforma": "peso-muerto",
  "gym-estante-mancuernas": "curl-mancuernas",
  "gym-cinta": "correr",
  "gym-bici": "pedalear",
  "gym-bici-reclinada": "pedalear",
  "gym-assault-bike": "pedalear",
  "gym-remo-ergometro": "remar",
  "gym-eliptica": "eliptica",
  "gym-escaladora": "escaladora",
  "gym-skierg": "skierg",
};

export type StepAnimation = MotionId | GestureId | "maquina";

/** Each exercise procedure (data/retos.ts) step by step: the animation each solved step plays. */
export const PROCEDURE_STEPS: Readonly<Record<string, readonly StepAnimation[]>> = {
  "gym-maquina-placas": ["ajustar", "ajustar", "maquina", "maquina", "maquina", "ajustar"],
  "gym-peso-libre": ["ajustar", "cargar-discos", "sentadilla", "sentadilla", "sentadilla", "sentadilla", "ajustar"],
  "gym-press-banca": ["ajustar", "press-banca", "press-banca", "press-banca", "press-banca", "ajustar"],
  "gym-peso-muerto": ["peso-muerto", "peso-muerto", "peso-muerto", "peso-muerto", "peso-muerto", "peso-muerto"],
  "gym-mancuernas": ["tomar", "curl-mancuernas", "curl-mancuernas", "press-mancuernas", "tomar"],
  "gym-cardio": ["maquina", "maquina", "maquina", "maquina", "limpiar"],
  "gym-zona-libre": ["tomar", "plancha", "puente", "bird-dog", "estirar", "tomar"],
  "gym-calistenia": ["dominada", "dominada", "dominada", "dominada", "dominada"],
  "gym-parkour": ["mirar", "agacharse", "salto", "aterrizar", "aterrizar"],
  "gym-crossfit": ["cargar-discos", "empujar-trineo", "empujar-trineo", "empujar-trineo", "cargar-discos"],
  "gym-limpiar-maquina": ["limpiar", "limpiar", "limpiar", "limpiar"],
};
