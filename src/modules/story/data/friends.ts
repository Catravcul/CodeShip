import type { Letter } from "../domain/mailbox";

/**
 * Story canon from Berón (2026-11-12): Doménica had a hard situation on Earth that forced her to
 * flee. She reached Cold Sanctuary with her group of friends; there she told Nevaeh, the sanctuary's
 * Magnate, about her problems, and Nevaeh offered her a place in space. She accepted without a
 * second thought. She will spend years out here with no contact with her family; her friend Kushal
 * calls her now and then over the sanctuary's line.
 */
const CANON = "docs/design/vida-a-bordo.md#historia-doménica-nevaeh-y-kushal";

export const PROLOGUE: Letter = {
  id: "el-santuario",
  from: "Nevaeh",
  to: "Doménica",
  subject: "Antes de que empieces",
  origin: CANON,
  trigger: { kind: "start" },
  body: [
    "Querida Doménica:",
    "Todavía me acuerdo de la noche en que llegasteis al santuario, todo el grupo junto, con frío y con hambre. Tú fuiste la última en sentarte a la mesa y la primera en ofrecerte a fregar.",
    "Después me contaste lo que te hizo huir. No voy a escribirlo aquí: esta línea la oye más gente de la que debería. Solo quiero que sepas que nada de eso viaja contigo.",
    "Cuando te hablé de la nave y de la nano_net no me dejaste terminar la frase. Dijiste que sí antes de que te dijera cuántos años serían. Serán muchos, y sin hablar con tu familia: por eso la nave lleva vida dentro.",
    "La cubierta de cultivo puede alimentarte a ti y a todos los animales durante el viaje entero, si la cuidas. Las gallinas pueden andar libres; los gatos y los chihuahuas también. Escríbeles buenas reglas y verás que acaban siendo una familia. Te harán más compañía de la que imaginas.",
  ],
  postscripts: ["Kushal me pidió la frecuencia del santuario para llamarte. Se la di.", "Nevaeh, la Magnate de Cold Sanctuary"],
};

export const KUSHAL_CALLS: readonly Letter[] = [
  {
    id: "kushal-primera-llamada",
    from: "Kushal",
    to: "Doménica",
    channel: "llamada",
    subject: "Llamada de Kushal",
    origin: CANON,
    trigger: { kind: "day", day: 2 },
    body: [
      "—¿Me oyes? ¡Doménica! Te oigo con un poco de retraso, pero te oigo.",
      "—Aquí todo sigue igual: Goluis quemó el arroz otra vez y Linduarda nos tiene haciendo el upa-yoga de cuello cada mañana. Los demás del grupo te mandan abrazos.",
      "—¿Y tú? ¿Cómo es eso de vivir con gallinas en una nave? Cuéntamelo todo la próxima vez.",
    ],
    postscripts: ["La llamada se corta: la línea del santuario solo aguanta unos minutos."],
  },
  {
    id: "kushal-familia",
    from: "Kushal",
    to: "Doménica",
    channel: "llamada",
    subject: "Kushal ha visto las fotos",
    origin: CANON,
    trigger: { kind: "event", event: "familia" },
    body: [
      "—¿Es verdad lo que me contó Nevaeh? ¿Que tus animales ya son una familia?",
      "—En el santuario decimos que las gallinas son las madres de todos. Ya lo ves: una clueca cuida lo que haga falta, aunque tenga pelo en vez de plumas.",
      "—Me alegra mucho. Se te oye la voz distinta, más tranquila.",
    ],
    postscripts: ["Kushal se despide con un «cuídalos», y la línea se apaga."],
  },
];
