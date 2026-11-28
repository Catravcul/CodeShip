/**
 * The challenges of the Academy's story (data/academia.ts HISTORIA): CodeShip's pattern, each mission solved by
 * ordering its steps (sanctuary-one's Procedure, run by application/challenges.ts procedureReto). Each with its source.
 */
import type { Procedure, Reality, RetoKind, Reward } from "@modules/sanctuary-one/data/retos";
import type { MotionId } from "@modules/sanctuary-one/data/animaciones";

const p = (id: string, title: string, kind: RetoKind, reward: Reward, scenario: string, steps: readonly string[], wrong: readonly string[], source: string, reality: Reality = "real"): Procedure => ({ id, title, kind, reward, scenario, steps, wrong, source, reality });

export const RETOS_ACADEMIA: Readonly<Record<string, Procedure>> = {
  "aca-lucha": p(
    "aca-lucha",
    "La lucha en la palestra",
    "ejercicio",
    "fuerza",
    "El paidotriba enseña la lucha (pale): antes y después, el cuidado del cuerpo",
    [
      "deja la ropa en el vestuario (apodyterion)",
      "úntate de aceite de oliva en la sala del aceite",
      "espolvoréate de polvo fino para poder agarrar y no quemarte al sol",
      "lucha de pie en el foso de arena: gana quien derriba {3|2|5} veces",
      "ráscate el aceite y el polvo con el estrígilo",
      "lávate en las pilas de los baños",
    ],
    ["golpea al caído en el suelo", "lucha con la ropa puesta"],
    "Miller, S. G., Ancient Greek Athletics (2004), la lucha y la palestra; Vitruvio, De architectura V.11",
  ),
  "aca-cuadrado": p(
    "aca-cuadrado",
    "Duplicar el cuadrado",
    "trabajar",
    "compania",
    "Platón pregunta, como Sócrates al joven esclavo del Menón: ¿qué lado tiene un cuadrado del doble de área?",
    [
      "dibuja en la arena un cuadrado de {2|1|3} pies de lado: su área es 4",
      "prueba a doblar el lado: el área sale {16|8|4}, cuatro veces, no el doble",
      "prueba con 3 pies de lado: el área sale {9|8|6}, demasiado",
      "traza la diagonal del cuadrado",
      "el cuadrado construido sobre la diagonal tiene el doble de área: {8|6|16} pies cuadrados",
    ],
    ["dobla el lado para doblar el área", "suma las dos diagonales y divide entre dos"],
    "Platón, Menón 82b–85b (la duplicación del cuadrado)",
  ),
  "aca-riego": p(
    "aca-riego",
    "Regar el olivar sagrado",
    "regar",
    "comida",
    "Cimón trajo el agua del Cefiso a la Academia: hoy toca regar los olivos de Atenea",
    [
      "mira que la acequia trae agua",
      "abre la compuerta de tierra con la azada",
      "lleva el agua por el surco hasta el alcorque de cada olivo",
      "cierra la compuerta cuando los alcorques estén llenos",
      "no cortes ni dañes ningún olivo sagrado (moriai)",
    ],
    ["corta una rama de un olivo sagrado para la lumbre", "deja la compuerta abierta toda la noche"],
    "Plutarco, Cimón 13.8 (el agua de la Academia); Lisias VII (los olivos sagrados, protegidos por ley); los pasos del riego por acequia: práctica tradicional",
  ),
  "aca-comida": p(
    "aca-comida",
    "La comida sencilla de la Academia",
    "cocinar",
    "comida",
    "Platón comía con sencillez: tras sus cenas se estaba bien al día siguiente",
    [
      "saca agua de la cisterna con la hidria",
      "muele la cebada en el molino de mano",
      "amasa la maza de cebada con agua y un poco de aceite",
      "sirve aceitunas, higos secos y queso",
      "mezcla el vino con agua en la crátera",
    ],
    ["sirve el vino puro, sin agua", "asa carne como en un día de fiesta"],
    "Ateneo, Banquete de los eruditos X 419c–d (las cenas sobrias de la Academia, Timoteo); Dalby, A., Siren Feasts (1996)",
  ),
  "aca-gnomon": p(
    "aca-gnomon",
    "Medir el día con el gnomon",
    "trabajar",
    "compania",
    "El gnomon es una varilla vertical: su sombra marca la hora y la estación",
    [
      "planta el gnomon vertical en suelo llano",
      "marca la punta de la sombra cada poco rato",
      "la sombra más corta del día es el mediodía",
      "en el solsticio de verano la sombra del mediodía es la más corta del año",
    ],
    ["la sombra más larga es el mediodía", "inclina el gnomon hacia el sol"],
    "Heródoto II.109 (el gnomon llegó de Babilonia); Diógenes Laercio III 37 y la Suda (Filipo de Opunte, astrónomo)",
  ),
  "aca-antorcha": p(
    "aca-antorcha",
    "La carrera de antorchas",
    "ejercicio",
    "fuerza",
    "Desde el altar de Prometeo se corre hacia la ciudad con la antorcha encendida",
    [
      "enciende la antorcha en el fuego del altar de Prometeo",
      "protege la llama con la mano al arrancar",
      "corre por el Dromos sin que se apague",
      "si se apaga, gana el siguiente que llegue con la suya encendida",
    ],
    ["vuelve a encenderla por el camino", "corre con la antorcha apagada"],
    "Pausanias I.30.2 (la carrera de antorchas desde el altar de Prometeo)",
  ),
};

/**
 * What she does at each step of each challenge (Berón 2026-11-24: «las animaciones deben ser al detalle»), from the
 * motions of sanctuary 1 (data/animaciones.ts), and what the one who is with her does meanwhile.
 */
export const PASOS_ACADEMIA: Readonly<Record<string, { readonly her: readonly MotionId[]; readonly partner: readonly MotionId[] }>> = {
  "aca-lucha": { her: ["agacharse", "estirar", "mezclar", "derribo", "estirar", "agacharse"], partner: ["pedir", "estirar", "mezclar", "uchikomi", "pedir", "respirar"] },
  "aca-cuadrado": { her: ["agacharse", "agacharse", "agacharse", "agacharse", "pedir"], partner: ["pedir", "pedir", "pedir", "agacharse", "respirar"] },
  "aca-riego": { her: ["respirar", "agacharse", "agacharse", "agacharse", "respirar"], partner: ["pedir", "agacharse", "agacharse", "pedir", "respirar"] },
  "aca-comida": { her: ["agacharse", "mezclar", "mezclar", "servir-plato", "mezclar"], partner: ["pedir", "cocinar", "cocinar", "emplatar-plato", "pedir"] },
  "aca-gnomon": { her: ["agacharse", "agacharse", "respirar", "pedir"], partner: ["pedir", "agacharse", "pedir", "pedir"] },
  "aca-antorcha": { her: ["estirar", "guardia", "correr", "correr"], partner: ["pedir", "guardia", "correr", "respirar"] },
};

/** In a talk, she and they speak in turns. */
export const PASOS_DIALOGO: { readonly her: readonly MotionId[]; readonly partner: readonly MotionId[] } = { her: ["respirar", "pedir"], partner: ["pedir", "respirar"] };
