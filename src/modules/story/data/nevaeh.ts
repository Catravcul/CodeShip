import type { CodeBlock, Exercise } from "@modules/mind-duel/domain/exercise";
import type { Letter } from "../domain/mailbox";

/**
 * Nevaeh's letters to Doménica, rescued from the 2023 draft (branch recuperar-onedrive,
 * src/Levels/1_Variables/{number,text,boolean}.js) and translated. Each one comes with a mission on
 * the nano_net: the draft's own variables, written token by token as in its drag-and-drop puzzles.
 */
const DRAFT = "https://github.com/Catravcul/CodeShip/tree/recuperar-onedrive/src/Levels/1_Variables";

/** `let name = value` as four tokens to put in order (the draft's mechanic). */
function declare(id: string, idea: string, name: string, value: string): Exercise {
  const t = (k: string, pseudo: string, js = pseudo): CodeBlock => ({ id: k, pseudo, js });
  return { kind: "order", id, concept: 2, idea, blocks: [t("a", "variable", "let"), t("b", name), t("c", "="), t("d", value)], solution: ["a", "b", "c", "d"] };
}

const pick = (id: string, idea: string, question: string, options: string[], correct: number, code: CodeBlock[] = []): Exercise => ({
  kind: "choice",
  id,
  concept: 2,
  skill: "predecir",
  idea,
  question,
  code,
  options,
  correct,
});

export const NEVAEH_LETTERS: readonly Letter[] = [
  {
    id: "nano-net-numeros",
    from: "Nevaeh",
    to: "Doménica",
    subject: "Configurar la nano_net: números",
    origin: `${DRAFT}/number.js`,
    trigger: { kind: "start" },
    body: [
      "Querida Doménica:",
      "Empecemos a poner algunos valores numéricos en nuestra nano_net. Como te dijimos, la nano_net es difícil de ver, pero no te preocupes: la nave te guiará. Abre la misión en el panel de la mente de la nave para resolver nuestro problema.",
      "El orden de las órdenes es: primero «let», luego un nombre, luego «=» y por último un número. Por ejemplo:",
    ],
    example: { pseudo: "variable diasDelAño = 365", js: "let diasDelAno = 365;" },
    postscripts: [
      "Me alegra saber que llegaste al lugar correcto. Por favor, no pierdas el contacto con tus seres queridos: algunos nos escriben preocupados por ti.",
      "¡Espero que lo estés pasando genial!",
    ],
    mission: {
      title: "Nano_net: valores numéricos",
      exercises: [
        declare("nano-num-1", "La red late despacio", "pulsosPorHora", "20"),
        declare("nano-num-2", "Ondas apiladas", "capasDeOnda", "10"),
        declare("nano-num-3", "Gira, gira", "girosPorHora", "60"),
        pick("nano-num-4", "¿Número o texto?", "¿Qué valor es un número?", ["20", "'20'", "veinte"], 0),
      ],
    },
  },
  {
    id: "nano-net-textos",
    from: "Nevaeh",
    to: "Doménica",
    subject: "Configurar la nano_net: textos",
    origin: `${DRAFT}/text.js`,
    trigger: { kind: "mission-done", letterId: "nano-net-numeros", days: 0.5 },
    body: [
      "Querida Doménica:",
      "Los valores que introdujiste en la nano_net no funcionan como esperábamos; probablemente faltan códigos. Para resolverlo tendrás que introducir valores de texto, como hiciste con los números.",
      "La única diferencia es que el texto lleva un símbolo al principio y al final: comillas dobles (\"), simples (') o invertidas (`). Por ejemplo:",
    ],
    example: { pseudo: 'variable nombre = "Nevaeh"', js: 'let nombre = "Nevaeh";' },
    postscripts: [
      "Sentimos que la comunicación haya fallado; nuestros expertos están investigando el origen.",
      "¡Qué alegría que tengas seres queridos que se preocupan tanto por ti!",
    ],
    mission: {
      title: "Nano_net: códigos de texto",
      exercises: [
        declare("nano-txt-1", "El código de toda la red", "codigoGlobal", "'3396815'"),
        declare("nano-txt-2", "El código de las ondas", "codigoOnda", "'8819618'"),
        declare("nano-txt-3", "El código del pulso", "codigoPulso", "'441319'"),
        pick("nano-txt-4", "Comillas, por favor", "¿Cuál de estos valores es texto?", ["441319", "'441319'", "true"], 1),
      ],
    },
  },
  {
    id: "nano-net-booleanos",
    from: "Nevaeh",
    to: "Doménica",
    subject: "Configurar la nano_net: encendido y apagado",
    origin: `${DRAFT}/boolean.js`,
    trigger: { kind: "mission-done", letterId: "nano-net-textos", days: 0.5 },
    body: [
      "Querida Doménica:",
      "Algunos módulos de la nano_net cambiaron de estado por una anomalía en la entrada de energía. Se pueden volver a cambiar a mano introduciendo el valor correcto; otra vez, la nave te ayudará.",
      "Este valor se llama «booleano» y solo tiene dos opciones, true y false. No son texto. Por ejemplo:",
    ],
    example: { pseudo: "variable laCienciaExiste = verdadero", js: "let laCienciaExiste = true;" },
    postscripts: [
      "Te informo de que alguien estaba detrás del fallo de comunicaciones, aunque sospecho que ya lo sabías. Te recuerdo que puedes contar con nosotros: dime si necesitas algo.",
      "Cuídate.",
    ],
    mission: {
      title: "Nano_net: módulos encendidos",
      exercises: [
        declare("nano-bool-1", "Módulo A001", "A001Encendido", "true"),
        declare("nano-bool-2", "Módulo P003", "P003Encendido", "false"),
        declare("nano-bool-3", "Módulo A002", "A002Encendido", "true"),
        pick("nano-bool-4", "Verdadero no es texto", "¿Qué valor enciende el módulo?", ["'true'", "true", "\"encendido\""], 1, [
          { id: "a", pseudo: "si A001Encendido entonces", js: "if (A001Encendido) {" },
          { id: "b", pseudo: "encender(A001)", js: "encender('A001');", indent: 1 },
          { id: "c", pseudo: "fin", js: "}" },
        ]),
      ],
    },
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
