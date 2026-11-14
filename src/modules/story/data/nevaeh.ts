import type { Letter } from "../domain/mailbox";
import { KUSHAL_CALLS, PROLOGUE } from "./friends";

/**
 * Nevaeh's letters to Doménica, rescued from the 2023 draft (branch recuperar-onedrive,
 * src/Levels/1_Variables/{number,text,boolean}.js) and translated. In the draft each letter asked to
 * configure the nano_net from a panel. Canon from Berón (2026-11-12): the nano_net is a network of
 * nodes built in space that gives travellers energy, safety and speed, and its cores are persuaded
 * asteroids. Now every mission is a flight to a core and code challenges done landed on it
 * (modules/nano-net). The draft's variables live on inside those challenges.
 */
const DRAFT = "https://github.com/Catravcul/CodeShip/tree/recuperar-onedrive/src/Levels/1_Variables";
/** Where every mission is done. */
const ON_CORE = "Vuela a Bennu, aterriza y pulsa el botón de la nano_net en la cabina.";

export const NEVAEH_LETTERS: readonly Letter[] = [
  {
    id: "nano-net-nucleo",
    from: "Nevaeh",
    to: "Doménica",
    subject: "La nano_net necesita un núcleo",
    origin: `${DRAFT}/number.js (reescrita: la misión ahora es convertir un asteroide en núcleo)`,
    trigger: { kind: "start" },
    body: [
      "Querida Doménica:",
      "Como te dijimos, la nano_net es difícil de ver: es una red de nodos diminutos que estamos tendiendo por el espacio. Donde llega, los viajeros tienen energía, protección y pueden ir más deprisa.",
      "Los nodos no se traen de la Tierra: se le piden a un asteroide. Si persuades la mente de Bennu, puede aprender a ser un núcleo, una célula madre de la red. Aterriza, entra en su mente y, cuando te obedezca, plántale el programa semilla.",
      "El núcleo guarda sus valores como variables. Por ejemplo:",
    ],
    example: { pseudo: "variable pulsosPorHora = 20", js: "let pulsosPorHora = 20;" },
    postscripts: [
      "Me alegra saber que llegaste al lugar correcto. Por favor, no pierdas el contacto con tus seres queridos: algunos nos escriben preocupados por ti.",
      "¡Espero que lo estés pasando genial!",
    ],
    mission: { title: "Convertir a Bennu en núcleo", goal: "nucleo", where: "Aterriza en Bennu, persuade su mente y pulsa «Convertir en núcleo»." },
  },
  {
    id: "nano-net-generar",
    from: "Nevaeh",
    to: "Doménica",
    subject: "Que el núcleo aprenda a generar nodos",
    origin: `${DRAFT}/text.js (reescrita: la misión ahora es una etapa del núcleo)`,
    trigger: { kind: "mission-done", letterId: "nano-net-nucleo", days: 0.25 },
    body: [
      "Querida Doménica:",
      "¡El núcleo late! Lo vemos desde el santuario. Ahora tiene que aprender a moldear nodos con su propio regolito: uno de energía, uno de escudo y uno de impulso, y otra vez.",
      "Es un bucle: repite lo mismo para cada nodo. Por ejemplo:",
    ],
    example: { pseudo: "para i desde 0 hasta 2 hacer\n  generarNodo(roles[i % 3])\nfin", js: "for (let i = 0; i < 3; i++) {\n  generarNodo(roles[i % 3]);\n}" },
    postscripts: [
      "Sentimos que la comunicación haya fallado; nuestros expertos están investigando el origen.",
      "¡Qué alegría que tengas seres queridos que se preocupan tanto por ti!",
    ],
    mission: { title: "Bennu: generar nodos", goal: "generar", where: ON_CORE },
  },
  {
    id: "nano-net-mover",
    from: "Nevaeh",
    to: "Doménica",
    subject: "Mover los nodos a su órbita",
    origin: "Nueva: continúa las cartas del borrador con la etapa de mover nodos.",
    trigger: { kind: "mission-done", letterId: "nano-net-generar", days: 0.25 },
    body: [
      "Querida Doménica:",
      "Los nodos recién nacidos flotan pegados a Bennu y no cubren casi nada. Enséñale al núcleo a subirlos a un anillo y dejarlos en órbita.",
      "La velocidad de una órbita circular no se inventa: sale de la masa de Bennu. Por ejemplo:",
    ],
    example: { pseudo: "variable v = raiz(mu / r)", js: "let v = Math.sqrt(mu / r);" },
    postscripts: ["Kushal pasó por el santuario y preguntó por ti. Le dije que estabas aprendiendo física de órbitas con un asteroide; no me creyó."],
    mission: { title: "Bennu: mover nodos", goal: "mover", where: ON_CORE },
  },
  {
    id: "nano-net-cubrir",
    from: "Nevaeh",
    to: "Doménica",
    subject: "Cerrar el anillo y cubrir un área",
    origin: `${DRAFT}/boolean.js (reescrita: la misión ahora es una etapa del núcleo)`,
    trigger: { kind: "mission-done", letterId: "nano-net-mover", days: 0.25 },
    body: [
      "Querida Doménica:",
      "Algunos nodos quedaron sueltos por una anomalía en la entrada de energía. El núcleo tiene que generar los que faltan y enlazar cada nodo con el siguiente hasta cerrar el anillo. Así la red reparte entre todos lo que da.",
      "Para que el último nodo se enlace con el primero hace falta el resto de una división. Por ejemplo:",
    ],
    example: { pseudo: "vecino = (i + 1) % nodos", js: "const vecino = (i + 1) % nodos;" },
    postscripts: [
      "Te informo de que alguien estaba detrás del fallo de comunicaciones, aunque sospecho que ya lo sabías. Te recuerdo que puedes contar con nosotros: dime si necesitas algo.",
      "Cuídate.",
    ],
    mission: { title: "Bennu: cubrir un área", goal: "cubrir", where: ON_CORE },
  },
  {
    id: "nano-net-enlazar",
    from: "Nevaeh",
    to: "Doménica",
    subject: "Enlazar tu red con la nuestra",
    origin: "Nueva: la última etapa del núcleo.",
    trigger: { kind: "mission-done", letterId: "nano-net-cubrir", days: 0.25 },
    body: [
      "Querida Doménica:",
      "Tu red ya cubre Bennu. A 50 km hay un relevo nuestro, del santuario. Si el núcleo aprende a enlazarse con él, las dos redes serán una y el corredor entre ellas te dejará viajar todavía más deprisa.",
      "Primero comprueba si llega. Por ejemplo:",
    ],
    example: { pseudo: "si distancia < alcance entonces enlazarRed(relevo)", js: "if (distancia < alcance) enlazarRed(relevo);" },
    postscripts: ["Quien cortó las comunicaciones sigue ahí fuera. Cuanto más grande sea la red, más difícil le será esconderse."],
    mission: { title: "Bennu: enlazar con el relevo del santuario", goal: "enlazar", where: ON_CORE },
  },
  {
    id: "sacudida",
    from: "Nevaeh",
    to: "Doménica",
    subject: "¿Estáis bien?",
    origin: "Nueva (no estaba en el borrador): continúa la intriga del sabotaje.",
    trigger: { kind: "event", event: "sacudida" },
    body: [
      "Querida Doménica:",
      "Los sensores de la nano_net registraron una sacudida fuerte cerca de tu nave. ¿Estáis bien tú, los gatos y las gallinas? Si alguien se ha hecho daño, pasa primero por la enfermería: la nano_net puede esperar.",
    ],
    postscripts: ["Seguimos investigando quién cortó las comunicaciones. No creo que sea casualidad que esto pase justo ahora."],
  },
];

/** What broke, in words, for a fault letter. */
export interface FaultReport {
  readonly faultId: string;
  readonly coreName: string;
  /** "el nodo N3 (escudo)" or "el programa del núcleo". */
  readonly what: string;
}

/** Nevaeh announces a nano_net fault: the mission is to repair it landed on that core. `seq` keeps ids unique. */
export function faultLetter(f: FaultReport, seq: number): Letter {
  return {
    id: `averia-${f.faultId}-${seq}`,
    from: "Nevaeh",
    to: "Doménica",
    subject: `Avería en la nano_net: ${f.what}`,
    origin: "Generada: sustituye a las misiones del panel del borrador.",
    trigger: { kind: "posted" },
    body: [
      "Querida Doménica:",
      `Los sensores del santuario dicen que ${f.what} de ${f.coreName} ha dejado de responder. Mientras siga así, esa parte de la red no da energía, protección ni velocidad.`,
      "Las reparaciones se hacen en el propio núcleo: vuela hasta él, aterriza y arregla su programa.",
    ],
    postscripts: ["No sé si es desgaste o si alguien está tocando lo que no debe. Avísame si ves algo raro."],
    mission: { title: `Reparar ${f.what} de ${f.coreName}`, goal: "reparar", faultId: f.faultId, where: `Vuela a ${f.coreName}, aterriza y pulsa «Reparar» en la cabina.` },
  };
}

/** Everything the radio can receive: Nevaeh's prologue and letters, and Kushal's calls. */
export const STORY: readonly Letter[] = [PROLOGUE, ...NEVAEH_LETTERS, ...KUSHAL_CALLS];
