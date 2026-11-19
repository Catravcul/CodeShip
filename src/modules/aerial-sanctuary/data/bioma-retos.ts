import type { Procedure } from "@modules/sanctuary-one/data/retos";
import type { StepAction } from "@modules/chores/domain/step-visual";

/**
 * THE FIELD WORK OF THE RESEARCH HUT (docs/design/bioma-s3.md §La estación): Doménica helps like the field staff of
 * Bird Island, where the British Antarctic Survey counts the colonies every season and rings the albatross chicks.
 * Each job is a real procedure (same shape as sanctuary 1's retos, data/retos.ts), one challenge per step; a step
 * written `… {right|wrong|wrong} unit` asks for the real value. The nest count's total is the colony's own, from the
 * food chain's crowd (application/field-work.ts fills it in).
 */

const CEMP = "CCAMLR, CEMP Standard Methods, método A3 (tamaño de la población reproductora): recuento de nidos ocupados en la incubación temprana, repetido hasta que los recuentos coincidan en un 10 % (https://www.ccamlr.org/en/document/science/cemp-standard-methods)";
const GSGSSI = "Gobierno de Georgia del Sur, normas para visitantes: no acercarse a menos de 5 m de pingüinos y aves (https://www.gov.gs/visitors/)";
const BTO = "BTO, Ringing Scheme: manejo y anillado (cubrir la cabeza calma al ave, sujetar alas contra el cuerpo sin oprimir el pecho, anilla del tamaño de la especie que gire y suba por el tarso, anotar número, fecha y lugar; https://www.bto.org/our-science/projects/ringing)";
const BAS_WA = "British Antarctic Survey, Bird Island: los pollos de albatros viajero se anillan cada año antes de volar (seguimiento desde 1958; Pardo et al. 2017, PNAS)";

export const FIELD = {
  nidos: {
    id: "s3-contar-nidos",
    title: "Contar los nidos de papúa",
    kind: "trabajar",
    reward: "compania",
    scenario: "La colonia está en incubación: toca el recuento de nidos ocupados de esta temporada",
    steps: [
      "espera a la incubación temprana: se cuenta cuando ya han puesto casi todas",
      "toma el contador manual y el plano de la colonia con sus grupos",
      "cuenta desde fuera, a no menos de {5|0,5|50} m de los nidos",
      "cuenta cada nido ocupado (un ave sobre su nido) grupo a grupo, sin pasar dos veces",
      "repite el recuento de cada grupo {3|1|10} veces",
      "si dos recuentos difieren más del {10|50|1} %, vuelve a contar ese grupo",
      "anota la media en el cuaderno: {NIDOS} nidos ocupados",
    ],
    wrong: ["cuenta los pollos en vez de los nidos", "entra en la colonia para verlos mejor", "suma también los nidos vacíos"],
    reality: "real",
    source: `${CEMP}; ${GSGSSI}`,
  },
  anillar: {
    id: "s3-anillar-albatros",
    title: "Anillar un pollo de albatros viajero",
    kind: "trabajar",
    reward: "compania",
    scenario: "Un pollo de albatros en su nido de barro de la ladera: se anilla antes de que vuele",
    steps: [
      "comprueba el permiso de anillamiento y el siguiente número de anilla del cuaderno",
      "acércate despacio por detrás del nido, sin correr",
      "cubre la cabeza del pollo con un paño: se calma a oscuras",
      "sujeta el cuerpo y las alas plegadas contra ti, sin apretar el pecho",
      "cierra la anilla metálica en el tarso con los alicates: que gire y no apriete",
      "lee y anota el número de anilla, la fecha y el nido",
      "déjalo en su nido, quita el paño y retírate",
    ],
    wrong: ["anilla al pollo por el ala", "levántalo por las patas", "aprieta la anilla para que no se mueva"],
    reality: "real",
    source: `${BTO}; ${BAS_WA}`,
  },
} as const satisfies Readonly<Record<string, Procedure>>;

/**
 * What she does at each step, at the hut's field table (the ships' step player, chores/domain/step-visual.ts):
 * reading the notebook, taking the counter or the pliers, working the ring.
 */
export const FIELD_GESTURES: Readonly<Record<string, readonly StepAction[]>> = {
  "s3-contar-nidos": ["revisar", "tomar", "revisar", "revisar", "revisar", "revisar", "revisar"],
  "s3-anillar-albatros": ["revisar", "tomar", "tomar", "tomar", "reparar", "revisar", "tomar"],
};
