import { CAMPOS_MODELS } from "./campos";
import { C, COL, m, pz, rep, type ModelDef, type Part } from "./kit";

/**
 * Models of the Residencia (Cold Sanctuary's ResidentialBuilder.cs): the open room «al estilo de los templos griegos»
 * (9 × 7 m, floor and stylobate, the bunk bed for 8 with its slide, bedside table, wardrobe and the carpet that is also
 * the yoga mat), its fruit terrace (7 × 7 m with a potted fruit tree), and the plaza's pillow ring (the colossal bed)
 * and reading benches.
 */
const RB = (what: string) => `Cold Sanctuary, Assets/Editor/ResidentialBuilder.cs ${what}`;
const WOOD = 0x9e8566;
const WOOD_DARK = 0x7a6654;
const MARBLE = 0xd1ccc2;
const { white, soil } = COL;

/** Bunk bed of two 4-place mattresses 3,6 × 2,1 m (BedWidth, BedLength, BedUpperTop 1,6), head at +z, with its slide. */
function bunk(blanket: number, blanket2: number): Part[] {
  const W = 3.6, L = 2.1, up = 1.6;
  const parts: Part[] = [
    C(0, 0.2, 0, W + 0.1, 0.3, L + 0.2, WOOD_DARK), C(0, 0.42, 0, W, 0.16, L, white), C(0, 0.52, -0.15, W + 0.04, 0.06, L * 0.62, blanket),
    C(0, up - 0.22, 0, W + 0.1, 0.12, L + 0.2, WOOD_DARK), C(0, up - 0.08, 0, W, 0.16, L, white), C(0, up + 0.02, -0.15, W + 0.04, 0.06, L * 0.62, blanket2),
    C(0, (up + 0.5) / 2, L / 2 + 0.06, W + 0.1, up + 0.5, 0.1, WOOD_DARK),
    ...rep(4, (k) => [C((k - 1.5) * 0.9, 0.55, L / 2 - 0.3, 0.7, 0.1, 0.35, white), C((k - 1.5) * 0.9, up + 0.05, L / 2 - 0.3, 0.7, 0.1, 0.35, white)]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * (W / 2 + 0.05), (up + 0.5) / 2, sz * (L / 2 + 0.1), 0.1, up + 0.5, 0.1, WOOD_DARK))),
    C(-(W / 2 + 0.05), up + 0.25, 0, 0.05, 0.05, L, WOOD_DARK), C(0.225, up + 0.25, -(L / 2 + 0.1), 2.25, 0.05, 0.05, WOOD_DARK),
  ];
  // The slide (Tobogán): from the foot of the upper bed, −x side, 2,6 m down towards −z, and its braking strip.
  const sx = -W / 2 + 0.4, z0 = -(L / 2 + 0.1), run = 2.6, drop = up - 0.05;
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    parts.push(C(sx, 0.1 + drop * (1 - t), z0 - run * t, 0.6, 0.06, run / 5, 0xf28c33));
  }
  parts.push(C(sx, 0.08, z0 - run - 0.3, 0.6, 0.04, 0.6, 0xf28c33));
  return parts;
}

const BLANKETS = [0x8c5a7a, 0x5a7a8c, 0x7a8c5a, 0x8c7a5a, 0x6a5a8c, 0x8c5a5a];

/** A room (Cabin): its frame centred, the trunk side at −z. Two blanket tints, for variety. */
const room = (i: number): Part[] => [
  C(0, 0.075, 0, 9, 0.15, 7, WOOD), C(0, 0.2, 0, 8.6, 0.1, 6.6, MARBLE),
  ...bunk(BLANKETS[i % 6]!, BLANKETS[(i + 1) % 6]!).map(([x, y, z, a, b, c, col]) => [x - 2.6, y + 0.25, z + 2.3, a, b, c, col] as Part),
  C(-0.4, 0.55, 3.2, 0.45, 0.55, 0.4, WOOD), C(2.6, 1.25, 3.2, 1.4, 1.9, 0.55, WOOD),
  C(2.8, 0.27, -1.65, 2.8, 0.02, 3.6, 0x6a8f7a),
];

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
  ...[0, 1].map((i) => pz(`res-habitacion-${i + 1}`, "mueble", "residencia-habitaciones", "Habitación abierta (cama-litera de 8 con tobogán, mesilla, armario y alfombra-esterilla)", WOOD, room(i * 3), "real", RB("Cabin (9 × 7 m, BedWidth 3,6, BedUpperTop 1,6)"))),
  ...FORMS.map((f) => pz(`res-terraza-${f}`, "naturaleza", "residencia-terrazas", "Terraza frutal con su frutal enano en maceta", WOOD, terrace(f), "real", RB("Cabin Terraza_frutal y PottedFruit (FruitCare.All, una especie distinta en cada casa)"))),
  pz("res-ring", "mueble", "residencia-ring", `Ring de almohadas: plataforma y cabecero (${RING.x.toFixed(1)} × ${RING.z.toFixed(1)} m)`, WOOD, RING.hard, "ficcion", RB("BuildPillowRing (docs/guerra-de-almohadas.md)")),
  { ...pz("res-ring-colchon", "mueble", "residencia-ring", "Cama colosal del ring, borde blando y almohadas", 0xf7f2e8, RING.soft, "ficcion", RB("BuildPillowRing Colchon_colosal, Borde_blando, Almohadas")), walkThrough: true },
  m("res-banco-lectura", "mueble", "residencia-plaza", "Banco de lectura (12 plazas)", 8.4, 0.45, 0.5, WOOD, "banco", "real", RB("FurnishPlaza Banco_lectura")),
  m("res-alfombras", "mueble", "residencia-plaza", "Zona de alfombras de la plaza (4)", 10.4, 0.02, 4.4, 0x6a8f7a, "caja", "ficcion", RB("FurnishPlaza CarpetPad.BuildZone")),
];
