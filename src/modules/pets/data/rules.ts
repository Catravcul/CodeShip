import type { Exercise } from "@modules/mind-duel/domain/exercise";
import type { CatRule } from "../domain/behavior";

/** A rule the player can write into a cat's mind, and the ideas that must be solved to write it. */
export interface CatLesson {
  readonly rule: CatRule;
  readonly exercises: readonly Exercise[];
}

export const RESPECT_PLANTS: CatLesson = {
  rule: {
    id: "respetar-plantas",
    when: "planta-nueva",
    then: "olfatear",
    pseudo: "cuando aparezca una planta nueva → olfatearla y seguir mi camino",
    js: "on('planta-nueva', planta => { olfatear(planta); alejarme(); });",
  },
  exercises: [
    {
      kind: "order",
      id: "gato-planta-evento",
      concept: 9,
      idea: "Hay algo verde y nuevo junto a mi cama",
      blocks: [
        { id: "a", pseudo: "cuando aparezca una planta nueva", js: "on('planta-nueva', (planta) => {" },
        { id: "b", pseudo: "olfatearla", js: "olfatear(planta);", indent: 1 },
        { id: "c", pseudo: "seguir mi camino", js: "alejarme();", indent: 1 },
        { id: "d", pseudo: "fin", js: "});" },
      ],
      solution: ["a", "b", "c", "d"],
    },
    {
      kind: "choice",
      id: "gato-planta-predecir",
      concept: 5,
      skill: "predecir",
      idea: "¿Muerdo o no muerdo?",
      question: "La planta tiene 2 días. ¿Qué hará el gato?",
      code: [
        { id: "a", pseudo: "si planta.edad < 3 entonces", js: "if (planta.edad < 3) {" },
        { id: "b", pseudo: "olfatear(planta)", js: "olfatear(planta);", indent: 1 },
        { id: "c", pseudo: "si no", js: "} else {" },
        { id: "d", pseudo: "ignorar(planta)", js: "ignorar(planta);", indent: 1 },
        { id: "e", pseudo: "fin", js: "}" },
      ],
      options: ["La olfatea", "La ignora", "La muerde"],
      correct: 0,
    },
    {
      kind: "choice",
      id: "gato-planta-especificar",
      concept: 5,
      skill: "especificar",
      idea: "Dime exactamente qué quieres de mí",
      question: "¿Qué orden protege a la planta sin prohibirle al gato curiosear?",
      code: [],
      options: [
        "Cuando veas una planta nueva, muérdela con cuidado",
        "Cuando veas una planta nueva, olfatéala y sigue tu camino",
        "No te acerques nunca a ninguna planta",
      ],
      correct: 1,
    },
  ],
};

export const BEFRIEND: CatLesson = {
  rule: {
    id: "hacer-amigos",
    when: "gato-desconocido",
    then: "saludar",
    pseudo: "cuando vea a un gato desconocido → acercarme despacio y saludar nariz con nariz",
    js: "on('gato-desconocido', gato => { acercarme(gato, 'despacio'); saludar(gato); });",
  },
  exercises: [
    {
      kind: "order",
      id: "gato-amigo-evento",
      concept: 9,
      idea: "Huele a otro gato al otro lado de la puerta",
      blocks: [
        { id: "a", pseudo: "cuando vea al gato nuevo", js: "on('gato-desconocido', (gato) => {" },
        { id: "b", pseudo: "acercarme despacio", js: "acercarme(gato, 'despacio');", indent: 1 },
        { id: "c", pseudo: "saludar nariz con nariz", js: "saludar(gato);", indent: 1 },
        { id: "d", pseudo: "fin", js: "});" },
      ],
      solution: ["a", "b", "c", "d"],
    },
    {
      kind: "choice",
      id: "gato-amigo-predecir",
      concept: 5,
      skill: "predecir",
      idea: "¿Me quiere o me quiere echar?",
      question: "El otro gato tiene las orejas hacia delante. ¿Qué hará este gato?",
      code: [
        { id: "a", pseudo: "si otro.orejas == \"atrás\" entonces", js: "if (otro.orejas === 'atrás') {" },
        { id: "b", pseudo: "esperar()", js: "esperar();", indent: 1 },
        { id: "c", pseudo: "si no", js: "} else {" },
        { id: "d", pseudo: "saludar(otro)", js: "saludar(otro);", indent: 1 },
        { id: "e", pseudo: "fin", js: "}" },
      ],
      options: ["Espera", "Saluda", "Bufa"],
      correct: 1,
    },
    {
      kind: "choice",
      id: "gato-amigo-reparar",
      concept: 5,
      skill: "reparar",
      idea: "Algo en mi plan me hace bufar",
      question: "¿Qué línea hace que el gato bufe aunque el otro esté tranquilo?",
      code: [
        { id: "a", pseudo: "si otro.tranquilo entonces", js: "if (otro.tranquilo) {" },
        { id: "b", pseudo: "bufar()", js: "bufar();", indent: 1 },
        { id: "c", pseudo: "fin", js: "}" },
      ],
      options: ["si otro.tranquilo entonces", "bufar()", "fin"],
      correct: 1,
    },
  ],
};

export const RESPECT_HENS: CatLesson = {
  rule: {
    id: "respetar-gallinas",
    when: "gallina",
    then: "ignorar",
    pseudo: "cuando vea una gallina → no acecharla y seguir mi camino",
    js: "on('gallina', gallina => { ignorar(gallina); });",
  },
  exercises: [
    {
      kind: "order",
      id: "gato-gallina-evento",
      concept: 9,
      idea: "Algo con plumas se mueve tras la malla",
      blocks: [
        { id: "a", pseudo: "cuando vea una gallina", js: "on('gallina', (gallina) => {" },
        { id: "b", pseudo: "mirarla desde lejos", js: "mirar(gallina, 'lejos');", indent: 1 },
        { id: "c", pseudo: "seguir mi camino", js: "alejarme();", indent: 1 },
        { id: "d", pseudo: "fin", js: "});" },
      ],
      solution: ["a", "b", "c", "d"],
    },
    {
      kind: "choice",
      id: "gato-gallina-predecir",
      concept: 5,
      skill: "predecir",
      idea: "Mis bigotes vibran",
      question: "El gato tiene estrés 0,9 (límite 0,8). ¿Qué hará al ver una gallina?",
      code: [
        { id: "a", pseudo: "si estrés < 0,8 entonces", js: "if (estres < 0.8) {" },
        { id: "b", pseudo: "seguir la regla aprendida", js: "regla(gallina);", indent: 1 },
        { id: "c", pseudo: "si no", js: "} else {" },
        { id: "d", pseudo: "seguir el instinto", js: "instinto(gallina);", indent: 1 },
        { id: "e", pseudo: "fin", js: "}" },
      ],
      options: ["Sigue la regla y la ignora", "Sigue su instinto y puede acecharla", "Se duerme"],
      correct: 1,
    },
  ],
};

export const CAT_LESSONS: readonly CatLesson[] = [RESPECT_PLANTS, BEFRIEND, RESPECT_HENS];
