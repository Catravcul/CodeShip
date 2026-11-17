import type { Chore } from "@modules/chores/domain/chore";
import type { ChoiceExercise, OrderExercise } from "@modules/mind-duel/domain/exercise";
import { APOLLO_A7LB } from "./suit";

const steps: OrderExercise = {
  kind: "order",
  id: "eva-prerrespirar",
  concept: 1,
  idea: "El módulo lunar no tiene esclusa: con el traje cerrado se vacía toda la cabina y se sale por la escotilla delantera",
  blocks: [
    { id: "a", pseudo: "ponerse la mochila PLSS y el OPS encima", js: "ponerseMochila();" },
    { id: "b", pseudo: "conectar las mangueras de la PLSS al traje", js: "conectarMangueras();" },
    { id: "c", pseudo: "cerrar el casco y los guantes y comprobar fugas", js: "comprobarFugas();" },
    { id: "d", pseudo: "vaciar la cabina por la válvula de la escotilla", js: "despresurizarCabina();" },
    { id: "e", pseudo: "abrir la escotilla delantera y salir de espaldas al porche", js: "abrirEscotillaDelantera();" },
    { id: "x", pseudo: "abrir la escotilla sin casco", js: "abrirEscotilla(sinCasco);" },
  ],
  solution: ["a", "b", "c", "d", "e"],
};

const pressure: ChoiceExercise = {
  kind: "choice",
  id: "eva-presion",
  concept: 6,
  skill: "completar",
  idea: "El traje se infla hasta su presión de trabajo y no más",
  question: "¿Qué número completa el bucle? (kPa)",
  code: [
    { id: "a", pseudo: "mientras presiónTraje < ___", js: "while (presionTraje < ___) {" },
    { id: "b", pseudo: "abrir un poco la válvula de oxígeno", js: "abrirValvulaO2();", indent: 1 },
    { id: "c", pseudo: "fin", js: "}" },
  ],
  options: ["101,3", String(APOLLO_A7LB.pressureKPa.value).replace(".", ","), "0", "300"],
  correct: 1,
};

const tether: ChoiceExercise = {
  kind: "choice",
  id: "eva-cable",
  concept: 5,
  skill: "reparar",
  idea: "En Bennu la velocidad de escape es de unos 0,2 m/s: un salto normal te manda al espacio",
  question: "¿Qué línea tiene el fallo?",
  code: [
    { id: "a", pseudo: "si cable.enganchado", js: "if (cable.enganchado) {" },
    { id: "b", pseudo: "saltar con 1,5 m/s", js: "saltar(1.5);", indent: 1 },
    { id: "c", pseudo: "si no, enganchar el cable", js: "} else { engancharCable(); }" },
  ],
  options: ["si cable.enganchado", "saltar con 1,5 m/s: es más que la velocidad de escape", "si no, enganchar el cable"],
  correct: 1,
};

/** Suit-up and airlock checks as a chain of code challenges. */
export const SUIT_UP: Chore = {
  id: "salir-eva",
  kind: "salir-eva",
  title: "Ponerse el traje y salir",
  scenario: "Como en Apolo: el A7LB con su PLSS, la cabina del módulo lunar vaciada y fuera por la escotilla delantera (la cabina ya va a 33 kPa de oxígeno puro, así que no hace falta prerrespirar)",
  exercises: [steps, pressure, tether],
};
