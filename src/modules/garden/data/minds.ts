import type { Exercise } from "@modules/mind-duel/domain/exercise";

/** Ideas a plant's mind surfaces when the player talks to it. Simple blocks: sequence and variables. */
export const PLANT_TALK: readonly Exercise[] = [
  {
    kind: "order",
    id: "planta-luz",
    concept: 1,
    idea: "Quiero crecer hacia la luz",
    blocks: [
      { id: "a", pseudo: "beber agua por las raíces", js: "beber(agua);" },
      { id: "b", pseudo: "subir el agua por el tallo", js: "subir(agua);" },
      { id: "c", pseudo: "abrir las hojas a la luz", js: "abrirHojas();" },
    ],
    solution: ["a", "b", "c"],
  },
  {
    kind: "choice",
    id: "planta-hojas",
    concept: 2,
    skill: "predecir",
    idea: "Cuento mis hojas nuevas",
    question: "¿Cuántas hojas nuevas tiene al final?",
    code: [
      { id: "a", pseudo: "guardar 3 en hojasNuevas", js: "let hojasNuevas = 3;" },
      { id: "b", pseudo: "sumar 2 a hojasNuevas", js: "hojasNuevas = hojasNuevas + 2;" },
    ],
    options: ["3", "5", "32"],
    correct: 1,
  },
  {
    kind: "choice",
    id: "planta-sed",
    concept: 2,
    skill: "completar",
    idea: "Tengo sed",
    question: "¿Qué valor falta para que la planta pida agua cuando le quede menos de la mitad?",
    code: [{ id: "a", pseudo: "si agua < ___ entonces pedirAgua()", js: "if (agua < ___) pedirAgua();" }],
    options: ["0.5", "5", "\"mitad\""],
    correct: 0,
  },
];
