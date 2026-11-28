import type { Procedure } from "@modules/sanctuary-one/data/retos";
import type { StepAction } from "@modules/chores/domain/step-visual";

/**
 * THE FIELD WORK OF THE RESEARCH HUT (docs/design/bioma-s3.md §La estación): Doménica helps like the entomologists of
 * the Karakoram: the inspection of the Asian honeybee's hives, the butterfly transect (Pollard's walk) for the
 * Apollos, and the pitfall traps for the beetles that recycle the mountain. Each job is a real procedure (same shape
 * as sanctuary 1's retos, data/retos.ts), one challenge per step; a step written `… {right|wrong|wrong} unit` asks for
 * the real value. The totals are the island's own, from the food chain and its colonies (application/field-work.ts).
 */

const BEEBOOK = "Delaplane, van der Steen y Guzmán-Novoa 2013, «Standard methods for estimating strength parameters of Apis mellifera colonies», Journal of Apicultural Research 52(1) (COLOSS BEEBOOK): abrir con humo suave, sacar cada panal y estimar a ojo en sextos de cara cubiertos de abejas (método de Liebefeld) y la cría operculada; buscar huevos o la reina; con buen tiempo, a mediodía, cuando pecorean";
const POLLARD = "Pollard 1977, «A method for assessing changes in the abundance of butterflies», Biological Conservation 12: 115–134; Pollard y Yates 1993, «Monitoring Butterflies for Ecology and Conservation», Chapman & Hall: una ruta fija a paso constante; se cuentan las mariposas a 2,5 m a cada lado y 5 m por delante; entre las 10:45 y las 15:45, con sol y más de 13 °C (o más de 17 °C nublado) y poco viento; cada semana de la temporada de vuelo";
const PITFALL = "Barber 1931, «Traps for cave-inhabiting insects», Journal of the Elisha Mitchell Scientific Society 46: 259–266; Woodcock 2005, «Pitfall trapping in ecological studies», en Leather (ed.), Insect Sampling in Forest Ecosystems, Blackwell: vasos enterrados a ras del suelo, con un líquido conservante y un tejadillo contra la lluvia, en línea a distancia fija; se vacían cada semana y se identifica lo caído";

export const FIELD = {
  colmenas: {
    id: "s3-colmenas-cerana",
    title: "Revisión de las colmenas de abeja asiática",
    kind: "trabajar",
    reward: "compania",
    scenario: "Mediodía de sol en la estepa: toca revisar la fuerza de las colonias de Apis cerana",
    steps: [
      "ve a mediodía, con sol, cuando las pecoreadoras están fuera",
      "echa humo suave en la piquera y espera {1|0|20} minuto",
      "saca cada panal despacio y míralo por las dos caras",
      "estima cuántos sextos de cada cara cubren las abejas (método de Liebefeld)",
      "estima la cría operculada y busca huevos o la reina",
      "cierra la colmena sin aplastar abejas",
      "anota las colonias revisadas: {COLMENAS} colmenas",
    ],
    wrong: ["ábrela de noche, cuando están todas dentro", "sacude los panales para contarlas mejor", "echa mucho humo hasta que salgan"],
    reality: "real",
    source: BEEBOOK,
  },
  mariposas: {
    id: "s3-transecto-mariposas",
    title: "Transecto de mariposas (paseo de Pollard)",
    kind: "trabajar",
    reward: "compania",
    scenario: "Un día de verano con sol en la pedrera: el recorrido fijo para contar las apolo",
    steps: [
      "sigue siempre la misma ruta fija, por tramos",
      "sal entre las {10:45 y las 15:45|7:00 y las 9:00|20:00 y las 22:00}",
      "solo con sol y más de {13|5|30} °C, y poco viento",
      "anda a paso constante, sin pararte a perseguirlas",
      "cuenta las que veas a {2,5|20|0,5} m a cada lado y 5 m por delante",
      "anota cada tramo con su hora y el tiempo que hace",
      "anota el total del paseo: {APOLOS} apolos",
    ],
    wrong: ["cuenta también las que veas lejos con los prismáticos", "sal un día nublado y frío", "corre detrás de cada una para verla de cerca"],
    reality: "real",
    source: POLLARD,
  },
  trampas: {
    id: "s3-trampas-escarabajos",
    title: "Trampas de caída para los escarabajos",
    kind: "trabajar",
    reward: "compania",
    scenario: "Los escarabajos que limpian la montaña: una línea de trampas de caída por la pradera y el enebral",
    steps: [
      "entierra los vasos a ras del suelo, sin dejar borde",
      "ponlos en línea, a {10|0,1|500} m uno de otro",
      "echa un dedo de líquido conservante en cada vaso",
      "cubre cada vaso con un tejadillo contra la lluvia",
      "vacía los vasos a la semana",
      "identifica lo que ha caído: enterradores y escarabajos del estiércol",
      "anota los escarabajos de la línea: {ESCARABAJOS} escarabajos",
    ],
    wrong: ["deja el borde del vaso por encima del suelo", "ceba los vasos con miel", "vacíalos al año siguiente"],
    reality: "real",
    source: PITFALL,
  },
} as const satisfies Readonly<Record<string, Procedure>>;

/** What she does at each step, at the hut's field table (the ships' step player, chores/domain/step-visual.ts). */
export const FIELD_GESTURES: Readonly<Record<string, readonly StepAction[]>> = {
  "s3-colmenas-cerana": ["revisar", "tomar", "tomar", "revisar", "revisar", "reparar", "revisar"],
  "s3-transecto-mariposas": ["revisar", "revisar", "revisar", "revisar", "revisar", "revisar", "revisar"],
  "s3-trampas-escarabajos": ["reparar", "revisar", "tomar", "reparar", "tomar", "revisar", "revisar"],
};
