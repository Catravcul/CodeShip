import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import type { AsteroidData } from "@modules/celestial/domain/asteroid";
import type { Letter } from "@modules/story/domain/mailbox";
import type { MainMission, MissionFact } from "../domain/mission";

/**
 * Nevaeh's main missions (docs/design/misiones.md). Chapter 1 is played in New Polana; chapters 2
 * and 3 (Mars' moons, then Mars) are written down but locked: there is no gameplay for them yet.
 * Asteroid numbers are read from the celestial data so the reasons never drift from what the map
 * shows. Rewards are game values.
 */

const DEIMOS_SRC = "https://en.wikipedia.org/wiki/Deimos_(moon)";
const PHOBOS_SRC = "https://en.wikipedia.org/wiki/Phobos_(moon)";
const MARS_SRC = "https://en.wikipedia.org/wiki/Mars";
const ORIGIN = "Nueva: misiones principales de Nevaeh (docs/design/misiones.md).";
const GAME = "valor de juego";

/** Spanish number: decimal comma, thin grouping. */
const es = (n: number, d = 0) => n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
/** 9,05 × 10¹² */
function sci(v: number): string {
  const e = Math.floor(Math.log10(v));
  const sup = String(e).replace(/./g, (c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(c)]!);
  return `${es(v / 10 ** e, 2)} × 10${sup}`;
}
const share = (a: AsteroidData, material: string) => a.composition.find((c) => c.material === material)!.massFraction;

const member = (id: string) => {
  const m = POLANA_MEMBERS.find((x) => x.id === id);
  if (!m) throw new Error(`No New Polana member ${id}`);
  return m;
};
const BIG = member("242916");
const DARK = member("58587");

const diameterKm = (a: AsteroidData) => (a.meanRadiusM.value * 2) / 1000;
const bennuTimes = (a: AsteroidData) => a.massKg.value / BENNU.massKg.value;
const waterKg = (a: AsteroidData) => a.massKg.value * share(a, "Water (in hydrated minerals)").value[0];
const carbonKg = (a: AsteroidData) => a.massKg.value * share(a, "Carbon").value[0];

function asteroidFacts(a: AsteroidData, measured: boolean): MissionFact[] {
  const src = a.meanRadiusM.source;
  const assumed = measured ? "medida" : "calculada con su diámetro y la densidad de Bennu (supuesta)";
  return [
    { label: "Diámetro", value: `${es(diameterKm(a), 2)} km`, source: src, note: measured ? "medido" : "NEOWISE" },
    { label: "Masa", value: `${sci(a.massKg.value)} kg${a.id === BENNU.id ? "" : ` (${es(bennuTimes(a))} × Bennu)`}`, source: a.massKg.source, note: assumed },
    { label: "Rotación", value: `${es(a.rotationPeriodH.value, 2)} h`, source: a.rotationPeriodH.source, note: a.rotationPeriodH.source === "game value" ? GAME : "medida" },
    {
      label: "Agua y carbono",
      value: `≥ ${sci(waterKg(a))} kg de agua · ${sci(carbonKg(a))} kg de carbono`,
      source: share(a, "Carbon").source,
      note: measured ? "1 % de agua (estimación prudente) y 4,5 % de carbono de la muestra" : "si su roca es como la de Bennu (supuesto)",
    },
  ];
}

const DARK_ALBEDO = (DARK as { albedo: { value: number; source: string } }).albedo;

export const NEVAEH_MISSIONS: readonly MainMission[] = [
  {
    id: "persuadir-bennu",
    chapter: 1,
    chapterTitle: "Nueva Polana",
    target: { id: BENNU.id, name: BENNU.name, kind: "asteroide" },
    title: "Persuadir a Bennu",
    why: "Es el asteroide mejor medido que existe: OSIRIS-REx trajo su roca a la Tierra en 2023. Tiene carbono y agua para hacer nodos: será el primer núcleo de la nano_net.",
    facts: [
      { label: "Tipo", value: `${BENNU.spectralType.value} (rico en carbono)`, source: BENNU.spectralType.source, note: "medido" },
      ...asteroidFacts(BENNU, true),
    ],
    reward: { amounts: { kit: 2 }, text: "2 kits importados" },
    // Asked for in the first nano_net letter (modules/story/data/nevaeh.ts).
    letterId: "nano-net-nucleo",
    playable: true,
  },
  {
    id: "persuadir-242916",
    chapter: 1,
    chapterTitle: "Nueva Polana",
    target: { id: BIG.id, name: BIG.name, kind: "asteroide" },
    title: `Persuadir a ${BIG.name}`,
    why: `Es el más grande de los vecinos de Bennu: ${es(diameterKm(BIG), 2)} km y unas ${es(bennuTimes(BIG))} veces su masa. Con él la red tendrá roca de sobra para crecer.`,
    facts: asteroidFacts(BIG, false),
    reward: { amounts: { kit: 2 }, text: "2 kits importados" },
    letterId: "mision-242916",
    playable: true,
  },
  {
    id: "persuadir-58587",
    chapter: 1,
    chapterTitle: "Nueva Polana",
    target: { id: DARK.id, name: DARK.name, kind: "asteroide" },
    title: `Persuadir a ${DARK.name}`,
    why: `Es el más oscuro de los vecinos de Bennu (albedo ${es(DARK_ALBEDO.value, 3)}): es casi negro y los telescopios del santuario apenas lo ven. Nevaeh sospecha que alguien se esconde a su sombra.`,
    facts: [{ label: "Albedo", value: es(DARK_ALBEDO.value, 3), source: DARK_ALBEDO.source, note: "medido (NEOWISE)" }, ...asteroidFacts(DARK, false)],
    reward: { amounts: { kit: 3 }, text: "3 kits importados" },
    letterId: "mision-58587",
    playable: true,
  },
  {
    id: "persuadir-deimos",
    chapter: 2,
    chapterTitle: "Las lunas de Marte",
    target: { id: "deimos", name: "Deimos", kind: "luna" },
    title: "Persuadir a Deimos",
    why: "La luna pequeña de Marte: roca rica en carbono, como los asteroides tipo C, y 20 000 veces la masa de Bennu. Es el primer paso para llegar a Marte.",
    facts: [
      { label: "Tamaño", value: "16,08 × 11,78 × 10,22 km", source: DEIMOS_SRC, note: "medido" },
      { label: "Masa", value: "1,44 × 10¹⁵ kg", source: DEIMOS_SRC, note: "medida" },
      { label: "Gravedad", value: "0,003 m/s² · escape 5,6 m/s", source: DEIMOS_SRC },
      { label: "Órbita", value: "a 23 458 km de Marte, una vuelta cada 30,3 h", source: DEIMOS_SRC },
    ],
    letterId: "mision-deimos",
    playable: false,
    lockedNote: "Bloqueada: hace falta una nave que llegue a Marte. Todavía no se puede jugar.",
  },
  {
    id: "persuadir-fobos",
    chapter: 2,
    chapterTitle: "Las lunas de Marte",
    target: { id: "fobos", name: "Fobos", kind: "luna" },
    title: "Persuadir a Fobos",
    why: "La luna grande de Marte, a solo 9 375 km del planeta: desde ella se domina la órbita baja. La sonda japonesa MMX va a traer muestras suyas en 2031.",
    facts: [
      { label: "Tamaño", value: "25,90 × 22,60 × 18,32 km", source: PHOBOS_SRC, note: "medido" },
      { label: "Masa", value: "1,06 × 10¹⁶ kg", source: PHOBOS_SRC, note: "medida" },
      { label: "Gravedad", value: "0,0057 m/s² · escape 11,4 m/s", source: PHOBOS_SRC },
      { label: "Órbita", value: "a 9 375 km de Marte, una vuelta cada 7,65 h", source: PHOBOS_SRC },
    ],
    letterId: "mision-fobos",
    playable: false,
    lockedNote: "Bloqueada: llega después de Deimos.",
  },
  {
    id: "persuadir-marte",
    chapter: 3,
    chapterTitle: "Marte",
    target: { id: "marte", name: "Marte", kind: "planeta" },
    title: "Persuadir a Marte",
    why: "Un planeta entero: casi 10¹³ veces la masa de Bennu. El hielo de su casquete sur bastaría para cubrirlo de agua 11 m. La última misión.",
    facts: [
      { label: "Radio medio", value: "3 389,5 km", source: MARS_SRC, note: "medido" },
      { label: "Masa", value: "6,42 × 10²³ kg", source: MARS_SRC, note: "medida" },
      { label: "Gravedad", value: "3,72 m/s² · escape 5,03 km/s", source: MARS_SRC },
      { label: "Día solar", value: "24 h 39 min 36 s", source: MARS_SRC },
      { label: "Agua", value: "hielo del casquete sur: una capa de ~11 m sobre casi todo el planeta", source: MARS_SRC },
    ],
    letterId: "mision-marte",
    playable: false,
    lockedNote: "Bloqueada: el final de la historia.",
  },
];

const letter = (id: string, subject: string, body: string[], postscripts: string[], targetId?: string, title?: string, where?: string): Letter => ({
  id,
  from: "Nevaeh",
  to: "Doménica",
  subject,
  origin: ORIGIN,
  trigger: { kind: "posted" },
  body: ["Querida Doménica:", ...body],
  postscripts,
  ...(targetId && title && where ? { mission: { title, goal: "persuadir" as const, targetId, where } } : {}),
});

/** The letters the mission chain posts on the radio (Bennu's is the first nano_net letter). */
export const MISSION_LETTERS: readonly Letter[] = [
  letter(
    "mision-242916",
    `Un vecino grande: ${BIG.name}`,
    [
      "Bennu obedece. Desde el santuario lo celebramos como si fuera nuestro.",
      `Ahora necesito que mires a ${BIG.name}. Mide ${es(diameterKm(BIG), 2)} km: es el más grande de los vecinos de Bennu y tiene unas ${es(bennuTimes(BIG))} veces su masa. Si su roca es como la de Bennu, guarda al menos ${sci(waterKg(BIG))} kg de agua.`,
      "Un asteroide así, de nuestro lado, es una reserva para que la red crezca sin depender de nadie. Lo he marcado en tu mapa.",
      "Te mando kits del santuario por cada misión cumplida. No son muchos: el transporte es caro.",
    ],
    ["Subyugarlos a todos no es tu obligación, pero cada asteroide que te escucha es uno menos que nos ignora."],
    BIG.id,
    `Persuadir a ${BIG.name}`,
    `Vuela a ${BIG.name} (marcado en el mapa), aterriza y entra en su mente.`,
  ),
  letter(
    "mision-58587",
    `El más oscuro: ${DARK.name}`,
    [
      `${BIG.name} es nuestro. Gracias.`,
      `Hay un asteroide que me preocupa: ${DARK.name}. Su albedo es ${es(DARK_ALBEDO.value, 3)}: es casi negro y nuestros telescopios casi no lo ven.`,
      "Por eso creo que quien cortó las comunicaciones podría esconder ahí un repetidor. Si lo persuades, su mente nos dirá qué ha visto pasar.",
    ],
    ["Ten cuidado. Si te ataca, aléjate primero y piensa después."],
    DARK.id,
    `Persuadir a ${DARK.name}`,
    `Vuela a ${DARK.name} (marcado en el mapa), aterriza y entra en su mente.`,
  ),
  letter(
    "mision-deimos",
    "Más allá del cinturón: Deimos",
    [
      `${DARK.name} habló. Nadie se escondía en su sombra, pero vio pasar una nave sin luces hacia el Sol, hacia Marte.`,
      "Lo que viene es más grande. Deimos, la luna pequeña de Marte, pesa veinte mil veces lo que Bennu, y su roca es como la de nuestros asteroides oscuros.",
      "Tu nave todavía no puede llegar tan lejos. Cuando pueda, te lo pediré de verdad. Te lo he dejado apuntado en tus misiones.",
    ],
    ["Después de Deimos vendrá Fobos. Y después, si te atreves, Marte."],
  ),
  letter(
    "mision-fobos",
    "Fobos",
    ["Deimos te escucha. Fobos gira a 9 375 km de Marte, tan cerca que da tres vueltas al día. Quien la controle controla la órbita baja del planeta."],
    [],
  ),
  letter(
    "mision-marte",
    "Marte",
    ["Las dos lunas son nuestras. Solo queda el planeta. Nadie ha persuadido nunca una mente tan grande; no sé si se puede. Pero si alguien puede, eres tú."],
    [],
  ),
];
