import type { Procedure } from "@modules/sanctuary-one/data/retos";
import type { StepAction } from "@modules/chores/domain/step-visual";

/**
 * THE FIELD WORK OF THE RESEARCH HUT (docs/design/bioma-s3.md §La estación): Doménica helps like the field teams of
 * the Karakoram and the Himalaya: camera traps for the snow leopard, the double-observer count of the wild goats and
 * the monitoring of the griffons' nests on the cliffs. Each job is a real procedure (same shape as sanctuary 1's retos,
 * data/retos.ts), one challenge per step; a step written `… {right|wrong|wrong} unit` asks for the real value. The
 * totals are the island's own, from the food chain and its crowd (application/field-work.ts fills them in).
 */

const JACKSON = "Jackson, Roe, Wangchuk y Hunter 2006, «Estimating snow leopard population abundance using photography and capture-recapture techniques», Wildlife Society Bulletin 34(3): 772–781 (Hemis, Ladakh: cámaras en los caminos, junto a rocas rociadas y rascaderos; cada leopardo se reconoce por las manchas de las patas delanteras, los flancos y la cola; de enero a marzo; programa CAPTURE)";
const DURBACH = "Durbach, Sharma y Alexander, guía de diseño de muestreos con cámaras para el leopardo de las nieves (Snow Leopard Trust): estaciones a 2–5 km unas de otras, para fotografiar al menos 10 individuos";
const GSLEP = "GSLEP 2019, «Double-observer survey manual» (Global Snow Leopard and Ecosystem Protection Program): dos observadores (o equipos) por la misma ruta, el segundo 15–30 minutos detrás; no se comunican; barren con prismáticos cada 100–200 m; anotan cada grupo con su tamaño y sus clases de edad y sexo; al final del día deciden qué grupos vieron los dos y el total sale por captura-recaptura";
const BLM = "Smith, Slater y Neal, BLM Technical Note 436, «Raptor nest monitoring»: observar desde 400–800 m, al menos una hora; tres visitas (ocupación, eclosión y pollo con el 80 % de la edad de volar, que cuenta como éxito); cada nido con GPS, rumbo y distancia, y fotografiado";

export const FIELD = {
  camaras: {
    id: "s3-camaras-leopardo",
    title: "Cámaras trampa para el leopardo de las nieves",
    kind: "trabajar",
    reward: "compania",
    scenario: "Invierno en las crestas: toca revisar las cámaras trampa y saber cuántos leopardos distintos hay",
    steps: [
      "elige los puntos en los caminos del leopardo: crestas, rocas rociadas y rascaderos",
      "separa cada cámara de la siguiente {2 a 5|0,1|50} km",
      "fija la cámara a una roca, de lado al camino, y pruébala pasando por delante",
      "en cada visita cambia la tarjeta y las pilas",
      "reconoce a cada leopardo por las manchas de las patas delanteras, los flancos y la cola",
      "anota cada foto por individuo, cámara y fecha para la captura-recaptura",
      "anota los individuos distintos: {LEOPARDOS} leopardos",
    ],
    wrong: ["ponlas en mitad de la pradera, donde se ve más", "cuenta cada foto como un leopardo distinto", "ceba la cámara con carne"],
    reality: "real",
    source: `${JACKSON}; ${DURBACH}`,
  },
  doble: {
    id: "s3-doble-observador",
    title: "Censo de íbices por doble observador",
    kind: "trabajar",
    reward: "compania",
    scenario: "Una ruta por la ladera de los cantiles: dos equipos cuentan los íbices sin hablarse",
    steps: [
      "formad dos equipos que recorran la misma ruta",
      "el segundo equipo sale {15 a 30|1|120} min después",
      "no os contéis lo que habéis visto hasta el final del día",
      "barre las laderas con los prismáticos cada {100 a 200|10|2 000} m de ruta",
      "anota cada grupo: hora, lugar, tamaño y cuántos machos, hembras, jóvenes y crías",
      "al final del día, juntad las fichas y decid qué grupos visteis los dos",
      "estima el total por captura-recaptura: {IBICES} íbices",
    ],
    wrong: ["id juntos para no perderos ningún grupo", "avisa al otro equipo de dónde están los íbices", "cuenta solo los machos, que se ven mejor"],
    reality: "real",
    source: GSLEP,
  },
  buitres: {
    id: "s3-nidos-buitre",
    title: "Seguimiento de los nidos de buitre del Himalaya",
    kind: "trabajar",
    reward: "compania",
    scenario: "La colonia del farallón cría: toca la visita a los nidos de las repisas",
    steps: [
      "ponte frente al cantil a {400 a 800|20|3 000} m, sin acercarte a las repisas",
      "observa la colonia con el telescopio al menos {1|0,1|10} hora",
      "sitúa cada nido con el GPS, el rumbo y la distancia",
      "primera visita: anota qué nidos tienen un adulto incubando",
      "segunda visita: anota los que tienen pollo recién nacido",
      "tercera visita: cuenta como éxito el pollo con el {80|20|100} % de la edad de volar",
      "fotografía cada nido y anota: {NIDOS} nidos ocupados",
    ],
    wrong: ["sube a la repisa a ver el huevo", "haz una sola visita al final de la cría", "espanta a los adultos para ver dentro del nido"],
    reality: "real",
    source: BLM,
  },
} as const satisfies Readonly<Record<string, Procedure>>;

/**
 * What she does at each step, at the hut's field table (the ships' step player, chores/domain/step-visual.ts):
 * reading the notebook and the maps, taking the camera or the binoculars, working the camera's mount.
 */
export const FIELD_GESTURES: Readonly<Record<string, readonly StepAction[]>> = {
  "s3-camaras-leopardo": ["revisar", "revisar", "reparar", "tomar", "revisar", "revisar", "revisar"],
  "s3-doble-observador": ["revisar", "revisar", "revisar", "tomar", "revisar", "revisar", "revisar"],
  "s3-nidos-buitre": ["revisar", "tomar", "revisar", "revisar", "revisar", "revisar", "tomar"],
};
