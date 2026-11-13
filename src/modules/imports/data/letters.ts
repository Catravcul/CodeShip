import type { Letter } from "@modules/story/domain/mailbox";
import type { ImportQuote } from "../domain/quote";

const es = (v: number, d = 0) => v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Nevaeh's answer on the radio when an order leaves the Sanctuary (docs/design/importacion.md). */
export function orderLetter(seq: number, what: string, q: ImportQuote, launcherName: string): Letter {
  return {
    id: `pedido-santuario-${seq}`,
    from: "Nevaeh",
    to: "Doménica",
    subject: `Tu pedido sale del Santuario: ${what}`,
    origin: "Nueva: importaciones del Santuario (docs/design/importacion.md).",
    trigger: { kind: "posted" },
    body: [
      "Querida Doménica:",
      `Ya está en el ${launcherName}: ${what}, ${es(q.massKg, 1)} kg. Para que llegue hasta ti hay que subir ${es(q.leoKg)} kg a la órbita baja, casi todo propelente que se quemará por el camino.`,
      `Te cuesta ${es(q.credits)} créditos. Tardará ${es(q.transitDays)} días por la elipse de Hohmann; con el reloj acelerado, unas ${es(q.gameHours)} horas de estación.`,
      "Cada kilo que puedas sacar de los asteroides y los cometas es un kilo que no tengo que lanzar desde aquí.",
    ],
    postscripts: ["Si un día tienes un remolcador o un lanzador de masas, la roca te saldrá mucho más barata que mis cohetes."],
  };
}
