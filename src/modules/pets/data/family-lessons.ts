import type { Exercise } from "@modules/mind-duel/domain/exercise";
import type { AnimalAction, Species, Stimulus } from "../domain/behavior";
import { CAT_LESSONS, type AnimalLesson } from "./rules";

interface LessonSpec {
  readonly id: string;
  readonly species: Species;
  readonly level: 1 | 2;
  readonly when: Stimulus;
  readonly then: AnimalAction;
  readonly broodyOnly?: boolean;
  /** Event line, then the body lines (pseudocode, JS). */
  readonly event: readonly [string, string];
  readonly body: readonly (readonly [string, string])[];
  readonly ideas: readonly [string, string, string];
  readonly predict: { question: string; code: readonly (readonly [string, string, number?])[]; options: readonly string[]; correct: number };
  readonly specify: { question: string; options: readonly string[]; correct: number };
}

/** Three ideas per lesson: write the handler, predict what it does, choose the clearest order. */
function lesson(s: LessonSpec): AnimalLesson {
  const blocks = [
    { id: "a", pseudo: s.event[0], js: s.event[1] },
    ...s.body.map(([pseudo, js], i) => ({ id: String.fromCharCode(98 + i), pseudo, js, indent: 1 })),
    { id: "z", pseudo: "fin", js: "});" },
  ];
  const exercises: Exercise[] = [
    { kind: "order", id: `${s.id}-evento`, concept: 9, idea: s.ideas[0], blocks, solution: blocks.map((b) => b.id) },
    {
      kind: "choice",
      id: `${s.id}-predecir`,
      concept: 5,
      skill: "predecir",
      idea: s.ideas[1],
      question: s.predict.question,
      code: s.predict.code.map(([pseudo, js, indent], i) => ({ id: String.fromCharCode(97 + i), pseudo, js, ...(indent ? { indent } : {}) })),
      options: s.predict.options,
      correct: s.predict.correct,
    },
    { kind: "choice", id: `${s.id}-especificar`, concept: 5, skill: "especificar", idea: s.ideas[2], question: s.specify.question, code: [], options: s.specify.options, correct: s.specify.correct },
  ];
  const pseudo = `${s.event[0]} → ${s.body.map(([p]) => p).join(" y ")}`;
  const js = `${s.event[1]} ${s.body.map(([, j]) => j).join(" ")} });`;
  return { rule: { id: s.id, when: s.when, then: s.then, pseudo, js }, exercises, species: s.species, level: s.level, broodyOnly: s.broodyOnly };
}

const STRESS_CHECK: LessonSpec["predict"]["code"] = [
  ["si estrés < 0,8 entonces", "if (estres < 0.8) {"],
  ["seguir la regla aprendida", "regla();", 1],
  ["si no", "} else {"],
  ["seguir el instinto", "instinto();", 1],
  ["fin", "}"],
];

// --- Cats ---------------------------------------------------------------------------------------

/** Level 2 on top of RESPECT_HENS: from ignoring the hens to sleeping against them. */
export const CAT_HENS_FAMILY = lesson({
  id: "gato-familia-gallinas",
  species: "gato",
  level: 2,
  when: "gallina",
  then: "acurrucarse",
  event: ["cuando vea una gallina", "on('gallina', (gallina) => {"],
  body: [
    ["acercarme despacio, sin agacharme", "acercarme(gallina, 'despacio');"],
    ["acurrucarme a su lado", "acurrucarme(gallina);"],
  ],
  ideas: ["Sus plumas están calentitas", "¿Me deja quedarme?", "Dime cómo acercarme"],
  predict: {
    question: "Agacharse con la cola moviéndose es la postura de caza. ¿Qué siente la gallina si el gato se agacha?",
    code: [
      ["si gato.agachado entonces", "if (gato.agachado) {"],
      ["gallina.miedo ← alto", "gallina.miedo = 'alto';", 1],
      ["si no", "} else {"],
      ["gallina.miedo ← bajo", "gallina.miedo = 'bajo';", 1],
      ["fin", "}"],
    ],
    options: ["Miedo alto: huye", "Miedo bajo: se queda", "Nada"],
    correct: 0,
  },
  specify: {
    question: "¿Qué orden hace familia sin asustar a la gallina?",
    options: ["Cuando veas una gallina, salta a jugar con ella", "Cuando veas una gallina, acércate despacio, erguido, y acurrúcate a su lado", "Cuando veas una gallina, mírala fijamente"],
    correct: 1,
  },
});

export const CAT_DOG = lesson({
  id: "gato-saludar-perro",
  species: "gato",
  level: 1,
  when: "perro",
  then: "saludar",
  event: ["cuando vea al perro", "on('perro', (perro) => {"],
  body: [
    ["esperar a que se calme", "esperar(() => perro.tranquilo);"],
    ["saludarlo nariz con nariz", "saludar(perro);"],
  ],
  ideas: ["Ese animal ladra y huele raro", "¿Qué hago si me ladra?", "Enséñame a saludarlo"],
  predict: {
    question: "El perro está nervioso (tranquilo = falso). ¿Qué hace el gato primero?",
    code: [
      ["mientras no perro.tranquilo", "while (!perro.tranquilo) {"],
      ["esperar()", "esperar();", 1],
      ["fin", "}"],
      ["saludar(perro)", "saludar(perro);"],
    ],
    options: ["Saluda enseguida", "Espera hasta que el perro se calme", "Le bufa"],
    correct: 1,
  },
  specify: { question: "¿Qué orden evita la pelea?", options: ["Cuando veas al perro, búfale primero", "Cuando veas al perro, espera a que se calme y salúdalo", "Cuando veas al perro, escóndete siempre"], correct: 1 },
});

/** Cats have mothered puppies and ducklings: calm adults can adopt a young one. */
export const CAT_YOUNG = lesson({
  id: "gato-cuidar-cria",
  species: "gato",
  level: 1,
  when: "cria",
  then: "acurrucarse",
  event: ["cuando vea una cría", "on('cria', (cria) => {"],
  body: [
    ["lamerla", "lamer(cria);"],
    ["acurrucarme con ella", "acurrucarme(cria);"],
  ],
  ideas: ["Huele a leche y tiembla", "¿Es de los míos?", "Dime qué hacer con ella"],
  predict: { question: "El gato tiene estrés 0,3. ¿Qué hará al ver al cachorro?", code: STRESS_CHECK, options: ["Sigue la regla: lo lame y se acurruca", "Sigue el instinto", "Se va"], correct: 0 },
  specify: { question: "¿Qué orden convierte al gato en familia de la cría?", options: ["Cuando veas una cría, ignórala", "Cuando veas una cría, lámela y acurrúcate con ella", "Cuando veas una cría, juega a cazarla"], correct: 1 },
});

// --- Dogs ---------------------------------------------------------------------------------------

export const DOG_RESPECT_HENS = lesson({
  id: "perro-no-perseguir-gallinas",
  species: "perro",
  level: 1,
  when: "gallina",
  then: "ignorar",
  event: ["cuando vea una gallina", "on('gallina', (gallina) => {"],
  body: [
    ["sentarme", "sentarme();"],
    ["mirar a Doménica en vez de correr", "mirar('Doménica');"],
  ],
  ideas: ["¡Algo corre y aletea!", "¿Corro o me siento?", "Dime qué hago cuando corren"],
  predict: { question: "El chihuahua tiene estrés 0,9. ¿Qué hará al ver la gallina?", code: STRESS_CHECK, options: ["Se sienta", "Sigue el instinto y puede perseguirla", "Duerme"], correct: 1 },
  specify: { question: "¿Qué orden protege a las gallinas?", options: ["Cuando veas una gallina, persíguela despacio", "Cuando veas una gallina, siéntate y mírame", "No mires nunca a nada"], correct: 1 },
});

export const DOG_HENS_FAMILY = lesson({
  id: "perro-familia-gallinas",
  species: "perro",
  level: 2,
  when: "gallina",
  then: "acurrucarse",
  event: ["cuando vea una gallina", "on('gallina', (gallina) => {"],
  body: [
    ["tumbarme a su lado", "tumbarme(cerca(gallina));"],
    ["dejar que se suba a mi lomo", "permitir(gallina, 'subirse');"],
  ],
  ideas: ["Ya no corre de mí", "¿Puedo dormir con ella?", "Dime cómo ser su amigo"],
  predict: {
    question: "La gallina tiene frío (temperatura 12 °C). ¿Qué hace el perro?",
    code: [
      ["si gallina.frío entonces", "if (gallina.frio) {"],
      ["tumbarme a su lado", "tumbarme(cerca(gallina));", 1],
      ["fin", "}"],
    ],
    options: ["Se tumba a su lado y le da calor", "Ladra", "Se va"],
    correct: 0,
  },
  specify: { question: "¿Qué orden hace familia?", options: ["Cuando veas una gallina, túmbate a su lado y déjala subirse", "Cuando veas una gallina, ládrale suave", "Cuando veas una gallina, quítale la comida"], correct: 0 },
});

/** The play bow (front down, rear up) is the dog's invitation to play. */
export const DOG_CATS = lesson({
  id: "perro-jugar-gatos",
  species: "perro",
  level: 1,
  when: "gato",
  then: "jugar",
  event: ["cuando vea un gato", "on('gato', (gato) => {"],
  body: [
    ["hacer la reverencia de juego", "reverencia();"],
    ["jugar sin morder fuerte", "jugar(gato, { mordida: 'suave' });"],
  ],
  ideas: ["¡Un amigo con bigotes!", "¿Le ladro o lo invito?", "Enséñame a jugar con él"],
  predict: {
    question: "Si el gato bufa, ¿qué hace el perro con este programa?",
    code: [
      ["si gato.bufa entonces", "if (gato.bufa) {"],
      ["esperar()", "esperar();", 1],
      ["si no", "} else {"],
      ["jugar(gato)", "jugar(gato);", 1],
      ["fin", "}"],
    ],
    options: ["Espera", "Juega igual", "Ladra"],
    correct: 0,
  },
  specify: { question: "¿Qué orden hace amigos al perro y al gato?", options: ["Cuando veas un gato, ládrale para saludar", "Cuando veas un gato, invítalo con la reverencia y juega suave", "Cuando veas un gato, persíguelo"], correct: 1 },
});

export const DOG_YOUNG = lesson({
  id: "perro-cuidar-cria",
  species: "perro",
  level: 1,
  when: "cria",
  then: "acurrucarse",
  event: ["cuando vea una cría", "on('cria', (cria) => {"],
  body: [
    ["olerla despacio", "oler(cria);"],
    ["acurrucarme con ella", "acurrucarme(cria);"],
  ],
  ideas: ["Es pequeñito y llora", "¿Lo cuido?", "Dime cómo cuidarlo"],
  predict: { question: "Estrés 0,2. ¿Qué hace el perro al ver al gatito?", code: STRESS_CHECK, options: ["Lo huele y se acurruca", "Ladra", "Lo persigue"], correct: 0 },
  specify: { question: "¿Qué orden lo hace familia de la cría?", options: ["Cuando veas una cría, huélela despacio y acurrúcate con ella", "Cuando veas una cría, juega fuerte", "Cuando veas una cría, ignórala"], correct: 0 },
});

// --- Hens ---------------------------------------------------------------------------------------

/** Free-range hens scratch up seedlings: teach them to forage in the litter instead. */
export const HEN_RESPECT_PLANTS = lesson({
  id: "gallina-respetar-plantas",
  species: "gallina",
  level: 1,
  when: "planta-nueva",
  then: "ignorar",
  event: ["cuando vea una planta nueva", "on('planta-nueva', (planta) => {"],
  body: [
    ["no escarbar a su alrededor", "evitar(planta, 'escarbar');"],
    ["buscar bichos en el compost", "buscar('bichos', 'compost');"],
  ],
  ideas: ["¡Brotes tiernos!", "¿Escarbo aquí?", "Dime dónde buscar comida"],
  predict: { question: "La gallina tiene estrés 0,4. ¿Qué hará con el plantón?", code: STRESS_CHECK, options: ["Lo respeta y va al compost", "Lo picotea", "Pone un huevo"], correct: 0 },
  specify: { question: "¿Qué orden salva los plantones?", options: ["No comas nunca", "Cuando veas una planta nueva, no escarbes alrededor y busca bichos en el compost", "Cuando veas una planta nueva, picotéala poco"], correct: 1 },
});

/** A hen given young that are not hers may peck at them (SARE FNE08-645): first, leave them be. */
export const HEN_RESPECT_YOUNG = lesson({
  id: "gallina-no-picotear-crias",
  species: "gallina",
  level: 1,
  when: "cria",
  then: "ignorar",
  event: ["cuando vea una cría", "on('cria', (cria) => {"],
  body: [
    ["no picotearla", "evitar(cria, 'picotear');"],
    ["seguir escarbando a su lado", "escarbar(cerca(cria));"],
  ],
  ideas: ["¿Qué es esa bola de pelo?", "¿La picoteo?", "Dime cómo tratarla"],
  predict: { question: "La gallina tiene estrés 0,9. ¿Qué hará al ver al cachorro?", code: STRESS_CHECK, options: ["Sigue la regla y no lo picotea", "Sigue su instinto y puede picotearlo", "Lo cobija"], correct: 1 },
  specify: { question: "¿Qué orden protege a la cría?", options: ["Cuando veas una cría, no la picotees y sigue escarbando a su lado", "Cuando veas una cría, picotéala suave", "Cuando veas una cría, huye"], correct: 0 },
});

/**
 * Level 2 for a broody hen: a broody hen accepts chicks that are not hers when they are placed
 * under her calmly; here she takes a kitten or a puppy.
 */
export const HEN_BROOD = lesson({
  id: "gallina-cobijar-crias",
  species: "gallina",
  level: 2,
  when: "cria",
  then: "cobijar",
  broodyOnly: true,
  event: ["cuando una cría tenga frío", "on('cria', (cria) => {"],
  body: [
    ["cloquear para llamarla", "cloquear();"],
    ["cobijarla bajo mis alas", "cobijar(cria);"],
  ],
  ideas: ["Estoy clueca y algo pequeño tiembla", "¿Es mi cría?", "Dime cómo cuidarla"],
  predict: {
    question: "Las cluecas aceptan crías ajenas si se las dan de noche y en calma. ¿Cuándo es mejor presentárselas?",
    code: [
      ["si es_de_noche y gallina.calma entonces", "if (esDeNoche && gallina.calma) {"],
      ["poner_cria_bajo(gallina)", "ponerBajo(gallina, cria);", 1],
      ["fin", "}"],
    ],
    options: ["A mediodía, con ruido", "De noche y con la gallina tranquila", "Nunca"],
    correct: 1,
  },
  specify: { question: "¿Qué orden convierte a la clueca en madre?", options: ["Cuando veas una cría, picotéala", "Cuando una cría tenga frío, llámala cloqueando y cobíjala bajo tus alas", "Cuando veas una cría, sal corriendo"], correct: 1 },
});

export const FAMILY_LESSONS: readonly AnimalLesson[] = [CAT_HENS_FAMILY, CAT_DOG, CAT_YOUNG, DOG_RESPECT_HENS, DOG_HENS_FAMILY, DOG_CATS, DOG_YOUNG, HEN_RESPECT_PLANTS, HEN_RESPECT_YOUNG, HEN_BROOD];

/** Every lesson for every animal on board. */
export const ANIMAL_LESSONS: readonly AnimalLesson[] = [...CAT_LESSONS, ...FAMILY_LESSONS];
