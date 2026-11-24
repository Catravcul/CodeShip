/**
 * What someone wears (Berón 2026-11-24: «el personaje debe llevar vestimenta típica del microcosmos donde se encuentre,
 * y también debería llevar la ropa específica para la tarea laboral que indique su horario»). Pure: the clothes of a
 * work place (sanctuary 1's floors, by their furnish id) and of a period (the microcosms), as colours and pieces the
 * figure puts on (adapters/three/interior/figure.ts `wear`).
 */

export interface Outfit {
  readonly label: string;
  readonly top: number;
  readonly pants: number;
  /** Forearms covered (long sleeves) in this colour; bare if absent. */
  readonly sleeves?: number;
  readonly sleeveless?: boolean;
  /** Shins bare (shorts, a short tunic). */
  readonly shorts?: boolean;
  readonly shoes: number;
  /** A tunic or dress over the hips: to the knee or to the ankle. */
  readonly robe?: { readonly color: number; readonly long: boolean; readonly border?: number };
  /** A cloak over one shoulder (himation, chlamys). */
  readonly cloak?: number;
  readonly apron?: number;
  /** A long open coat (lab coat, doctor's). */
  readonly coat?: number;
  /** Headwear: a cap, a helmet, a surgeon's or cook's hat, a wreath. */
  readonly hat?: { readonly kind: "gorra" | "casco" | "quirofano" | "cocinero" | "corona" | "petaso"; readonly color: number };
  readonly gloves?: number;
}

const BOOTS = 0x3a3028;
const WHITE_SHOES = 0xe8e8e8;
const SANDALS = 0x8a5a32;

/**
 * Work clothes of sanctuary 1's floors (by the floor's furnish id, or its prefix). Sources: what each trade wears —
 * scrubs and caps (OMS, prevención de infecciones), white coats in labs (Prudent Practices 2011), chef's jacket and
 * hat (Reglamento 852/2004, ropa limpia), helmet and high-visibility vest on a building site (RD 1627/1997), overalls in
 * a garage, sportswear in the gym; the colours are ours.
 */
const WORK: readonly (readonly [RegExp, Outfit])[] = [
  [/^hospital-veterinario/, { label: "Pijama verde de veterinaria", top: 0x3f8f6a, pants: 0x3f8f6a, shoes: WHITE_SHOES, hat: { kind: "quirofano", color: 0x3f8f6a } }],
  [/^hospital/, { label: "Pijama sanitario y gorro", top: 0x5a8fc0, pants: 0x5a8fc0, shoes: WHITE_SHOES, hat: { kind: "quirofano", color: 0x5a8fc0 } }],
  [/^(laboratorios|informatica|cria-carne-cultivada)/, { label: "Bata de laboratorio", top: 0x9fb8c9, pants: 0x3a4a5a, shoes: WHITE_SHOES, coat: 0xf2f2f0 }],
  [/^(cocina|restaurante)/, { label: "Chaqueta y gorro de cocina", top: 0xf4f4f0, pants: 0x2a2a2a, sleeves: 0xf4f4f0, shoes: BOOTS, apron: 0xf4f4f0, hat: { kind: "cocinero", color: 0xffffff } }],
  [/^construccion/, { label: "Casco y chaleco de obra", top: 0x7a6a50, pants: 0x3a4a6a, shoes: BOOTS, apron: 0xf28c1e, hat: { kind: "casco", color: 0xf2c21e }, gloves: 0x8a7a50 }],
  [/^(mecanica|taller|submarino)/, { label: "Mono de taller", top: 0x2f4f7a, pants: 0x2f4f7a, sleeves: 0x2f4f7a, shoes: BOOTS, gloves: 0x303030 }],
  [/^(textil)/, { label: "Delantal de taller textil", top: 0xc9a07a, pants: 0x4a3a30, shoes: SANDALS, apron: 0x8a5a3a }],
  [/^(campos|huerto|granja)/, { label: "Ropa de campo y sombrero", top: 0x7a8a5a, pants: 0x5a4a30, shoes: BOOTS, hat: { kind: "petaso", color: 0xd9c38f }, gloves: 0x9a8a60 }],
  [/^(gimnasio|funcional|combate|entrenamiento)/, { label: "Ropa de deporte", top: 0x2f7f8f, pants: 0x222a30, sleeveless: true, shorts: true, shoes: 0xf0f0f0 }],
  [/^(asambleas-guardia)/, { label: "Chaqueta de guardia", top: 0x3a4a3a, pants: 0x2a302a, sleeves: 0x3a4a3a, shoes: BOOTS }],
];

/** The work clothes for a floor (by its furnish id), if it has its own. */
export function workOutfit(furnish: string | undefined): Outfit | undefined {
  if (!furnish) return undefined;
  for (const [re, o] of WORK) if (re.test(furnish)) return o;
  return undefined;
}

/**
 * Athens, 4th c. a. C. (the Academy microcosm): the chiton (a linen or wool tunic, short for men and work, long for
 * women), the himation over it (a wool cloak over the left shoulder), sandals; for the gymnasium, the exomis (a short
 * tunic off one shoulder; athletes trained naked, which the game leaves out), for work, a short chiton girded up.
 * Sources: Lee, M. M., Body, Dress, and Identity in Ancient Greece (2015); Llewellyn-Jones (ed.), Women's Dress in the
 * Ancient Greek World (2002). Colours: undyed wool and linen, ochres, madder reds, woad blues.
 */
export function greekOutfit(o: { feminine?: boolean; robe?: number; what?: "estudio" | "ejercicio" | "trabajo" | "casa"; elder?: boolean }): Outfit {
  const c = o.robe ?? 0xe9e2d0;
  if (o.what === "ejercicio") return { label: "Exomis (túnica corta de ejercicio)", top: c, pants: c, sleeveless: true, shorts: true, shoes: SANDALS, robe: { color: c, long: false } };
  if (o.what === "trabajo") return { label: "Quitón corto ceñido", top: c, pants: c, sleeveless: true, shorts: true, shoes: SANDALS, robe: { color: c, long: false, border: 0x8a5a32 } };
  if (o.feminine) return { label: "Quitón largo y manto", top: c, pants: c, sleeves: c, shoes: SANDALS, robe: { color: c, long: true, border: 0x8a3a2a }, cloak: 0x5a6f8a };
  return { label: o.elder ? "Quitón y himatión" : "Quitón y himatión", top: c, pants: c, sleeveless: true, shorts: !o.elder, shoes: SANDALS, robe: { color: c, long: !!o.elder, border: 0x7a5a3a }, cloak: o.elder ? 0xd8d0c0 : 0x9a6a4a };
}
