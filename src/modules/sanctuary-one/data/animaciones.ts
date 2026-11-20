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
  "curl-femoral": { label: "Curl femoral tumbado", category: "fuerza-maquina", does: "Boca abajo en el banco, dobla las rodillas llevando el rodillo hacia los glúteos" },
  "hip-thrust": { label: "Hip thrust", category: "fuerza-maquina", does: "Espalda en el banco, sube la cadera hasta alinearla con el tronco" },
  gemelos: { label: "Gemelos sentado", category: "fuerza-maquina", does: "Sentada con las almohadillas sobre los muslos, sube y baja los talones" },
  "press-inclinado": { label: "Press inclinado", category: "peso-libre", does: "Recostada a 45° en el banco inclinado, empuja la barra por encima de la cara" },
  "elevar-rodillas": { label: "Elevación de rodillas", category: "fuerza-maquina", does: "En la silla romana, antebrazos en los apoyos, sube las rodillas al pecho" },
  "abdominal-declinado": { label: "Abdominal declinado", category: "fuerza-maquina", does: "Pies bajo el rodillo, sube el tronco de tumbada a sentada" },
  hiperextension: { label: "Hiperextensión", category: "fuerza-maquina", does: "Cadera en el apoyo y talones bajo el rodillo, baja el tronco y sube hasta alinearlo con las piernas" },
  fondos: { label: "Fondos en paralelas", category: "peso-corporal", does: "Apoyada en las barras, dobla los codos a 90° y vuelve a estirarlos" },
  "remo-australiano": { label: "Remo australiano", category: "peso-corporal", does: "Colgada bajo la barra baja con el cuerpo recto, lleva el pecho a la barra" },
  swing: { label: "Swing con kettlebell", category: "peso-libre", does: "Bisagra de cadera y la pesa entre las piernas; la cadera empuja y la pesa sube hasta el pecho" },
  "curl-biceps": { label: "Curl de bíceps", category: "fuerza-maquina", does: "Sentada con los brazos en el apoyo, dobla los codos" },
  sentadilla: { label: "Sentadilla con barra", category: "peso-libre", does: "La barra en los trapecios, baja hasta muslos paralelos y sube" },
  "press-banca": { label: "Press de banca", category: "peso-libre", does: "Tumbada, baja la barra al pecho y empuja hasta estirar los brazos" },
  "peso-muerto": { label: "Peso muerto", category: "peso-libre", does: "Bisagra de cadera con la espalda neutra, sube la barra rozando las piernas" },
  "curl-mancuernas": { label: "Curl con mancuernas", category: "peso-libre", does: "De pie, sube las mancuernas doblando los codos pegados al cuerpo" },
  "press-mancuernas": { label: "Press con mancuernas", category: "peso-libre", does: "De pie, empuja las mancuernas por encima de la cabeza" },
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
  plie: { label: "Plié", category: "peso-corporal", does: "De lado a la barra, dobla las rodillas sobre las puntas de los pies con la espalda recta" },
  tendu: { label: "Tendu", category: "peso-corporal", does: "La pierna sale estirada desde la cadera, rozando el suelo hasta la punta" },
  releve: { label: "Relevé", category: "peso-corporal", does: "Sube a media punta despacio y baja los talones" },
  guardia: { label: "Guardia", category: "peso-corporal", does: "Manos arriba, barbilla abajo, pies a la anchura de los hombros, rebotando" },
  golpear: { label: "Golpear", category: "peso-corporal", does: "Directo de un brazo y otro, girando la cadera" },
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
  "gym-press-inclinado": "press-inclinado",
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
  "gym-silla-romana": "elevar-rodillas",
  "gym-espalderas-3": "elevar-rodillas",
  "gym-banco-declinado": "abdominal-declinado",
  "gym-hiperextensiones": "hiperextension",
  "cf-ghd": "hiperextension",
  "cal-dominadas": "dominada",
  "cal-monkey-bars": "dominada",
  "cal-anillas": "remo-australiano",
  "cal-bandera": "dominada",
  "cal-barras-bajas": "remo-australiano",
  "cal-paralelas": "fondos",
  "cal-fondos-v": "fondos",
  "cal-paralelas-bajas": "plancha",
  "cf-rig": "dominada",
  "pk-lache": "dominada",
};

export type StepAnimation = MotionId | GestureId | "maquina";

/** Each exercise procedure (data/retos.ts) step by step: the animation each solved step plays. */
export const PROCEDURE_STEPS: Readonly<Record<string, readonly StepAnimation[]>> = {
  "gym-maquina-placas": ["ajustar", "ajustar", "maquina", "maquina", "maquina", "ajustar"],
  "gym-peso-libre": ["ajustar", "tomar", "maquina", "maquina", "maquina", "maquina", "ajustar"],
  "gym-press-banca": ["ajustar", "maquina", "maquina", "maquina", "maquina", "ajustar"],
  "gym-peso-muerto": ["peso-muerto", "peso-muerto", "peso-muerto", "peso-muerto", "peso-muerto", "peso-muerto"],
  "gym-mancuernas": ["tomar", "curl-mancuernas", "curl-mancuernas", "press-mancuernas", "tomar"],
  "gym-cardio": ["maquina", "maquina", "maquina", "maquina", "limpiar"],
  "gym-zona-libre": ["tomar", "plancha", "puente", "bird-dog", "estirar", "tomar"],
  "ballet-barra": ["tomar", "tomar", "plie", "tendu", "releve", "estirar"],
  "dojo-saco": ["tomar", "salto", "guardia", "golpear", "golpear", "estirar"],
  "gym-calistenia": ["maquina", "maquina", "maquina", "maquina", "maquina"],
  "gym-fondos": ["maquina", "maquina", "maquina", "maquina", "estirar"],
  "gym-core-maquina": ["ajustar", "maquina", "maquina", "maquina", "maquina", "limpiar"],
  "gym-swing": ["tomar", "swing", "swing", "swing", "tomar"],
  "gym-salto-cajon": ["mirar", "mirar", "agacharse", "salto", "aterrizar"],
  "gym-parkour": ["mirar", "agacharse", "salto", "aterrizar", "aterrizar"],
  "gym-crossfit": ["cargar-discos", "empujar-trineo", "empujar-trineo", "empujar-trineo", "cargar-discos"],
  "gym-limpiar-maquina": ["limpiar", "limpiar", "limpiar", "limpiar"],
};
