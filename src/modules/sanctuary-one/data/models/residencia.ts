import { CAMPOS_MODELS } from "./campos";
import { C, COL, m, pz, rep, type ModelDef, type Part } from "./kit";

/**
 * Models of the Residencia (Cold Sanctuary's ResidentialBuilder.cs): the open room «al estilo de los templos griegos»
 * (9 × 7 m, floor and stylobate, the bunk bed for 8, bedside table, wardrobe and the carpet that is also
 * the yoga mat), its fruit terrace (7 × 7 m with a potted fruit tree), and the plaza's pillow ring (the colossal bed)
 * and reading benches.
 */
const RB = (what: string) => `Cold Sanctuary, Assets/Editor/ResidentialBuilder.cs ${what}`;
const WOOD = 0x9e8566;
const WOOD_DARK = 0x7a6654;
const MARBLE = 0xd1ccc2;
const { white, soil } = COL;

/**
 * Bunk bed of two 4-place mattresses 3,6 × 2,1 m (BedWidth, BedLength), head at +z. The upper bed at
 * 3,2 m, twice Cold Sanctuary's 1,6 (Berón 2026-11-22: «las literas el doble de alto y la escalera vertical, que se
 * pueda subir con trepar»), its vertical ladder at the foot on +x (rungs every 30 cm, EN 747) and a rail all round.
 */
export const BUNK = { W: 3.6, L: 2.1, up: 3.2, ladderX: 1.5 } as const;
function bunk(blanket: number, blanket2: number): Part[] {
  const { W, L, up, ladderX } = BUNK;
  const foot = -(L / 2 + 0.1);
  const parts: Part[] = [
    C(0, 0.2, 0, W + 0.1, 0.3, L + 0.2, WOOD_DARK), C(0, 0.42, 0, W, 0.16, L, white), C(0, 0.52, -0.15, W + 0.04, 0.06, L * 0.62, blanket),
    C(0, up - 0.22, 0, W + 0.1, 0.12, L + 0.2, WOOD_DARK), C(0, up - 0.08, 0, W, 0.16, L, white), C(0, up + 0.02, -0.15, W + 0.04, 0.06, L * 0.62, blanket2),
    C(0, (up + 0.5) / 2, L / 2 + 0.06, W + 0.1, up + 0.5, 0.1, WOOD_DARK),
    ...rep(4, (k) => [C((k - 1.5) * 0.9, 0.55, L / 2 - 0.3, 0.7, 0.1, 0.35, white), C((k - 1.5) * 0.9, up + 0.05, L / 2 - 0.3, 0.7, 0.1, 0.35, white)]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * (W / 2 + 0.05), (up + 0.5) / 2, sz * (L / 2 + 0.1), 0.1, up + 0.5, 0.1, WOOD_DARK))),
    // The upper bed's rail (30 cm over the mattress), open at the ladder.
    C(-(W / 2 + 0.05), up + 0.3, 0, 0.05, 0.05, L, WOOD_DARK), C(W / 2 + 0.05, up + 0.3, 0, 0.05, 0.05, L, WOOD_DARK), C(-0.35, up + 0.3, foot, W - 0.7, 0.05, 0.05, WOOD_DARK),
    // The ladder: two rails and the rungs, straight up to the upper bed.
    ...[-0.22, 0.22].map((dx) => C(ladderX + dx, (up + 0.4) / 2, foot - 0.05, 0.05, up + 0.4, 0.05, WOOD_DARK)),
    ...rep(Math.floor(up / 0.3), (i) => [C(ladderX, 0.3 + i * 0.3, foot - 0.05, 0.44, 0.035, 0.035, WOOD)]),
  ];
  // No slide (Berón 2026-11-24: «en las literas veo unas gradas que no puedo usar, quítalas»): Cold Sanctuary's
  // tobogán, drawn in boxes, read as steps that could not be walked.
  return parts;
}

const BLANKETS = [0x8c5a7a, 0x5a7a8c, 0x7a8c5a, 0x8c7a5a, 0x6a5a8c, 0x8c5a5a];

/** Where the bunk stands in its room (frame centred, trunk side −z), and the room's floor height. */
const BUNK_AT = { x: -2.6, y: 0.25, z: 2.3 } as const;
/** A room (Cabin): its frame centred, the trunk side at −z. Two blanket tints, for variety. */
const room = (i: number): Part[] => [
  C(0, 0.075, 0, 9, 0.15, 7, WOOD), C(0, 0.2, 0, 8.6, 0.1, 6.6, MARBLE),
  ...bunk(BLANKETS[i % 6]!, BLANKETS[(i + 1) % 6]!).map(([x, y, z, a, b, c, col]) => [x + BUNK_AT.x, y + BUNK_AT.y, z + BUNK_AT.z, a, b, c, col] as Part),
  // Bedside table: four legs, a drawer with its knob, a lamp.
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(-0.4 + sx * 0.19, 0.4, 3.2 + sz * 0.15, 0.04, 0.3, 0.04, WOOD_DARK))), C(-0.4, 0.66, 3.2, 0.45, 0.22, 0.38, WOOD), C(-0.4, 0.66, 3.0, 0.38, 0.14, 0.01, WOOD_DARK), C(-0.4, 0.66, 2.99, 0.05, 0.03, 0.02, 0xc7ccd6),
  C(-0.4, 0.86, 3.25, 0.12, 0.18, 0.12, 0xe8e0d0), C(-0.4, 1.02, 3.25, 0.24, 0.14, 0.24, 0xf2e6c8),
  // Wardrobe: two doors with their handles and the plinth.
  C(2.6, 0.3, 3.2, 1.4, 0.1, 0.5, WOOD_DARK), C(2.6, 1.3, 3.2, 1.4, 1.9, 0.55, WOOD), C(2.6, 1.3, 2.92, 0.02, 1.8, 0.01, WOOD_DARK), C(2.53, 1.3, 2.91, 0.03, 0.3, 0.03, 0xc7ccd6), C(2.67, 1.3, 2.91, 0.03, 0.3, 0.03, 0xc7ccd6), C(2.6, 2.28, 3.2, 1.46, 0.06, 0.6, WOOD_DARK),
  // The carpet that is also the yoga mat (alfombra-esterilla): its border and a rolled mat at its end.
  C(2.8, 0.26, -1.65, 2.8, 0.02, 3.6, 0x6a8f7a), C(2.8, 0.265, -1.65, 2.5, 0.02, 3.3, 0x8fb09a), C(2.8, 0.33, -3.3, 0.7, 0.14, 0.14, 0x5a7a8c),
];
/** The upper bed one stands on, and its ladder (room frame, above the room's model origin). */
const ROOM_DECK = {
  x: BUNK_AT.x, z: BUNK_AT.z, w: BUNK.W, d: BUNK.L, y: BUNK_AT.y + BUNK.up,
  ladder: { x: BUNK_AT.x + BUNK.ladderX, z: BUNK_AT.z - (BUNK.L / 2 + 0.15), w: 0.5, d: 0.1 },
} as const;

/**
 * The fruit terrace (Terraza_frutal): a 7 × 7 m deck with its potted dwarf fruit 2 m off its centre (+x), the pot of the
 * tips (Orchards.cs BuildPotted) of the room's species, one model per growth form.
 */
const FORMS = ["arbol", "palmera", "arbusto", "herbacea", "rastrera"] as const;
const terrace = (form: (typeof FORMS)[number]): Part[] => [
  C(0, 0.075, 0, 7, 0.15, 7, WOOD),
  ...(CAMPOS_MODELS.find((d) => d.id === `maceta-${form}`)!.parts ?? []).map(([x, y, z, a, b, c, col]) => [x + 2, y + 0.15, z, a, b, c, col] as Part),
];

/** The pillow ring for `residents` (PillowRing.CellsFor: ⌈√n⌉ cells of 2,5 m, bumper 0,6, walkway 2): platform and its soft bed. */
export function pillowRing(residents: number): { x: number; z: number; hard: Part[]; soft: Part[] } {
  const n = Math.max(1, Math.ceil(Math.sqrt(residents) - 1e-4)), cell = 2.5, B = 0.6, walk = 2, head = 1.2, zoneD = 4.4, edge = 0.3;
  const S = n * cell, bedX = S + 2 * B, bedZ = S + B + head;
  const X = Math.max(bedX, 7.6) + 2 * walk, Z = walk + bedZ + walk + zoneD + edge;
  const headTop = Z / 2 - walk, bedCz = headTop - bedZ / 2, matCz = headTop - head - S / 2;
  const hard: Part[] = [C(0, 0.075, 0, X, 0.15, Z, WOOD), C(0, 1.0, headTop - 0.2, bedX, 1.7, 0.4, WOOD_DARK), C(0, 0.16, -Z / 2 + edge + zoneD / 2, 7.6, 0.02, zoneD, 0x6a8f7a)];
  const pastel = [0xfadbe6, 0xdbebfc, 0xfcf2cc, 0xe0f7e0, 0xedd9fc];
  const soft: Part[] = [
    C(0, 0.25, matCz, S, 0.2, S, 0xf7f2e8), C(0, 0.25, headTop - head / 2, S, 0.2, head, 0xf7f2e8),
    ...[-1, 1].map((s) => C(s * (S / 2 + B / 2), 0.375, bedCz, B, 0.45, bedZ, 0xedc2d4)),
    ...[-1, 1].map((s) => C(s * (1.5 + (bedX - 3) / 4), 0.375, matCz - S / 2 - B / 2, (bedX - 3) / 2, 0.45, B, 0xedc2d4)),
    ...rep(n, (k) => [C((k - (n - 1) / 2) * cell, 0.62, headTop - 0.4 - (head - 0.5) / 2, cell * 0.85, 0.55, head - 0.5, white)]),
    ...rep(n * n, (c) => {
      const cx = ((c % n) - (n - 1) / 2) * cell, cz = (Math.floor(c / n) - (n - 1) / 2) * cell;
      return [C(cx - 0.65, 0.43, matCz + cz + 0.55, 0.6, 0.15, 0.4, pastel[c % 5]), C(cx + 0.65, 0.43, matCz + cz - 0.55, 0.6, 0.15, 0.4, pastel[(c + 1) % 5])];
    }),
  ];
  return { x: X, z: Z, hard, soft };
}

/** The residents (ResidentialBuilder.Shown, with the partners and Neo): 25 owners, 6 partners and 1 child. */
export const ROOM_OWNERS = [
  "Kushal", "la Magnate", "Linduarda", "Goluis", "Panterilia", "Gohageneis", "Irosene y Fausto", "Lizmibet y Tote", "Andrea",
  "Nesvitor", "Amykhuz y Karen", "Alicita y Julian", "Ducristin, Gallarle y Neo", "Josedrilo y Maite", "Shalva", "Adaguchi",
  "David", "Adonis", "Yulo", "Lale", "Ivelyna", "Luciana", "Malena", "Consol", "Fernando",
] as const;
export const RESIDENTS = 25 + 6 + 1;
const RING = pillowRing(RESIDENTS);

export const RESIDENCIA_MODELS: readonly ModelDef[] = [
  m("plaza-suelo", "mueble", "suelos", "Suelo de la plaza", 39.8, 0.1, 37.8, 0xb8a88f, "caja", "real", RB("FurnishPlaza Suelo_plaza")),
  ...[0, 1].map((i) => ({ ...pz(`res-habitacion-${i + 1}`, "mueble", "residencia-habitaciones", "Habitación abierta (cama-litera de 8 con escalera, mesilla, armario y alfombra-esterilla)", WOOD, room(i * 3), "real", RB("Cabin (9 × 7 m, BedWidth 3,6, BedUpperTop 1,6)")), decks: [ROOM_DECK] })),
  ...FORMS.map((f) => pz(`res-terraza-${f}`, "naturaleza", "residencia-terrazas", "Terraza frutal con su frutal enano en maceta", WOOD, terrace(f), "real", RB("Cabin Terraza_frutal y PottedFruit (FruitCare.All, una especie distinta en cada casa)"))),
  pz("res-ring", "mueble", "residencia-ring", `Ring de almohadas: plataforma y cabecero (${RING.x.toFixed(1)} × ${RING.z.toFixed(1)} m)`, WOOD, RING.hard, "ficcion", RB("BuildPillowRing (docs/guerra-de-almohadas.md)")),
  { ...pz("res-ring-colchon", "mueble", "residencia-ring", "Cama colosal del ring, borde blando y almohadas", 0xf7f2e8, RING.soft, "ficcion", RB("BuildPillowRing Colchon_colosal, Borde_blando, Almohadas")), walkThrough: true },
  m("res-banco-lectura", "mueble", "residencia-plaza", "Banco de lectura (12 plazas)", 8.4, 0.45, 0.5, WOOD, "banco", "real", RB("FurnishPlaza Banco_lectura")),
  m("res-alfombras", "mueble", "residencia-plaza", "Zona de alfombras de la plaza (4)", 10.4, 0.02, 4.4, 0x6a8f7a, "caja", "ficcion", RB("FurnishPlaza CarpetPad.BuildZone")),
];
