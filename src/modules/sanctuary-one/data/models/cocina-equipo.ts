import { C, COL, rep, type Part } from "./kit";

/**
 * The real equipment inside each block along the restaurant's walls (Berón 2026-11-19: «investigar a profundidad…
 * equipamiento, utensilios, ingredientes, máquinas para hacer pan, harina, queso, kéfir»). Cold Sanctuary draws each
 * block as one box; here each one is the machines a professional kitchen of that trade actually has, at their
 * makers' typical footprints, with the utensils and ingredients on top. Every block keeps Cold Sanctuary's footprint
 * (w × d) so the floor plan does not move: the front, where the cook stands, is −z; the wall is +z.
 *
 * Typical sizes (rounded, from the makers' sheets):
 *  - Báscula de plataforma 80 × 80 cm (Mettler Toledo PBA, Dibal); APPCC: recepción con termómetro y albarán.
 *  - Estantería de almacén seco: primer estante a ≥ 15 cm del suelo (Reglamento CE 852/2004, anexo II).
 *  - Cámara frigorífica modular de paneles de 8–10 cm, puerta con cortina de lamas y termómetro exterior.
 *  - Tablas de corte por colores (código APPCC habitual): verde verdura, rojo carne, azul pescado, amarillo ave.
 *  - Cortadora de hortalizas Robot Coupe CL50: 35 × 32 × 59 cm. Picadora de carne del 22: 25 × 45 × 45 cm.
 *  - Envasadora al vacío de campana (Henkelman Boxer 35): 46 × 52 × 44 cm.
 *  - Lavavajillas de capota (Hobart AM, Winterhalter PT): 64 × 75 cm, 1,5 m con la capota; mesas de entrada y salida.
 *  - Molino de muelas de piedra (Osttiroler, Mockmill Pro): armario de madera de 60 × 60 cm, tolva arriba; tamizadora.
 *  - Prensa de aceite de tornillo (expeller) de mesa, 60 × 25 cm; paila para la panela y moldes de madera (CORPOICA).
 *  - Amasadora espiral de 50 kg (Sottoriva, Mecnosud): 55 × 90 × 110 cm (aquí girada para caber); batidora planetaria 20 l.
 *  - Horno de pisos (3 pisos, 2 bandejas 60 × 80 por piso): 1,9 m de ancho; carro de bandejas (18 bandejas) al lado.
 *  - Laminadora de pasta de mesa (Imperia Restaurant, La Monferrina Sfogliatrice): 60 × 40 × 40 cm.
 *  - Extrusora de pasta (La Monferrina Dolly: 30 × 60 × 70 cm) sobre carro; secadero de bandejas.
 *  - Cuba quesera de doble pared de 200 l con lira y agitador; mesa de moldeo con moldes; prensa de queso.
 *  - Cava: estantes de madera con quesos, tina de salmuera, termohigrómetro (10–13 °C, 85–90 % HR).
 *  - Yogurtera/incubadora de armario a 42 °C; incubadora de tempeh a 30 °C con bandejas perforadas; tarros de kéfir.
 */
const { steel, darkSteel, white, wood, oak, glass, rubber, screen } = COL;
const STAINLESS = 0xd0d4d8;
const BOARD = { verde: 0x3f9b4f, rojo: 0xc23b3b, azul: 0x3b6fc2, amarillo: 0xe2c13b } as const;
const FLOUR = 0xece4d2;
const SACK = 0xd8c7a0;
const CHEESE = 0xe8c66a;
const DOUGH = 0xf0dcb0;

/** A steel work table (mesa de acero inoxidable con entrepaño) of `len` × `depth`, top at 0,9 m, about x. */
const table = (x: number, len: number, depth: number, top = STAINLESS): Part[] => [
  C(x, 0.88, 0, len, 0.04, depth, top),
  C(x, 0.18, 0, len - 0.06, 0.03, depth - 0.06, steel),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(x + sx * (len / 2 - 0.03), 0.43, sz * (depth / 2 - 0.03), 0.04, 0.86, 0.04, steel))),
];

/** The kick plate under the whole block: keeps the footprint (w × d) exact. */
const plinth = (w: number, d: number): Part => C(0, 0.01, 0, w, 0.02, d, 0x2a2b2e);

/** A gastronorm pan (GN 1/3, 32,5 × 17,6 cm) with what it holds. */
const gn = (x: number, z: number, food: number): Part[] => [C(x, 0.95, z, 0.17, 0.1, 0.32, STAINLESS), C(x, 0.99, z, 0.15, 0.03, 0.3, food)];

/** A cutting board of the colour code with a chef's knife on it. */
const board = (x: number, colour: number): Part[] => [C(x, 0.91, -0.1, 0.5, 0.02, 0.32, colour), C(x + 0.05, 0.925, -0.12, 0.3, 0.01, 0.04, STAINLESS), C(x - 0.15, 0.93, -0.12, 0.1, 0.02, 0.03, 0x222222)];

/** A sack of 25 kg (40 × 15 × 60 cm lying down). */
const sack = (x: number, y: number, z: number, colour = SACK): Part => C(x, y, z, 0.4, 0.16, 0.6, colour);

/** A shelf rack of `levels` (first at 15 cm) and its uprights. */
const rack = (x: number, len: number, depth: number, h: number, levels: number, colour = STAINLESS): Part[] => [
  ...rep(levels, (i) => [C(x, 0.15 + (i * (h - 0.25)) / (levels - 1), 0, len, 0.03, depth, colour)]),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(x + sx * (len / 2 - 0.02), h / 2, sz * (depth / 2 - 0.02), 0.03, h, 0.03, steel))),
];

const shelfY = (h: number, levels: number, i: number) => 0.15 + (i * (h - 0.25)) / (levels - 1);

function recepcion(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Platform scale with its indicator on a column.
    C(-0.9, 0.05, 0, 0.8, 0.08, 0.78, darkSteel), C(-0.9, 0.45, 0.34, 0.05, 0.8, 0.05, steel), C(-0.9, 0.86, 0.3, 0.3, 0.18, 0.06, screen),
    // Reception table: crates, the probe thermometer and the delivery notes.
    ...table(0.5, 1.7, d),
    C(0.15, 1.05, 0, 0.6, 0.3, 0.4, 0x3d8b5a), C(0.85, 1.05, 0, 0.6, 0.3, 0.4, 0x3b6fc2),
    C(0.95, 0.92, -0.22, 0.2, 0.02, 0.28, white), C(0.6, 0.93, -0.25, 0.04, 0.04, 0.16, 0xd9a420),
  ];
}

function almacenSeco(w: number, d: number, h: number): Part[] {
  const L = 4;
  return [
    plinth(w, d),
    ...rack(0, w, d, h, L, oak),
    // Sacks of flour and grain on the low shelves, tubs of legumes, jars and oil above.
    ...rep(4, (i) => [C(-1.3 + i * 0.85, shelfY(h, L, 0) + 0.1, 0, 0.6, 0.16, 0.4, i % 2 ? FLOUR : SACK)]),
    ...rep(6, (i) => [C(-1.5 + i * 0.6, shelfY(h, L, 1) + 0.18, 0, 0.35, 0.33, 0.35, [0xe8e4da, 0xa8452c, 0xd9b44a, 0x6b4a2a, 0xe8e4da, 0x8a9a3c][i])]),
    ...rep(10, (i) => [C(-1.6 + i * 0.36, shelfY(h, L, 2) + 0.12, 0, 0.14, 0.22, 0.14, i % 3 ? 0xc9a04a : 0x7aa04a)]),
    ...rep(5, (i) => [C(-1.4 + i * 0.7, shelfY(h, L, 3) + 0.15, 0, 0.3, 0.28, 0.2, i % 2 ? 0x8a9a3c : white)]),
  ];
}

function camarasFrias(w: number, d: number, h: number): Part[] {
  const wall = 0xe9eef2, t = 0.1;
  const room = (x0: number, x1: number, label: number): Part[] => {
    const cx = (x0 + x1) / 2, lw = x1 - x0;
    return [
      C(cx, h / 2, d / 2 - t / 2, lw, h, t, wall), C(cx, h - t / 2, 0, lw, t, d, wall), C(x0 + t / 2, h / 2, 0, t, h, d, wall), C(x1 - t / 2, h / 2, 0, t, h, d, wall),
      // Front panel with its door (0,9 × 2 m), the strip curtain behind it and the outside thermometer.
      C(cx - lw / 4 - 0.225, h / 2, -d / 2 + t / 2, lw / 2 - 0.45, h, t, wall), C(cx + lw / 4 + 0.225, h / 2, -d / 2 + t / 2, lw / 2 - 0.45, h, t, wall),
      C(cx, 2.2, -d / 2 + t / 2, 0.9, 0.4, t, wall), C(cx, 1, -d / 2 + 0.03, 0.86, 1.96, 0.06, 0xdfe5ea), C(cx + 0.33, 1.05, -d / 2 + 0.03, 0.04, 0.3, 0.06, darkSteel),
      C(cx, 1.0, -d / 2 + 0.15, 0.84, 1.95, 0.02, 0xbfe3f0), C(cx + 0.7, 1.6, -d / 2 + 0.02, 0.2, 0.12, 0.04, label),
      // Shelving inside, in GN sizes.
      ...[-1, 1].flatMap((s) => rep(4, (i) => [C(cx + s * (lw / 2 - 0.4), 0.3 + i * 0.5, 0.15, 0.6, 0.03, d - 0.5, STAINLESS)])),
    ];
  };
  return [plinth(w, d), ...room(-w / 2, 0.6, 0x2a6a3a), ...room(0.6, w / 2, 0x2a4a8a), C(-1.6, h + 0.25, 0.3, 1.2, 0.5, 0.7, steel), C(2.2, h + 0.25, 0.3, 1.0, 0.5, 0.7, steel)];
}

function prep(w: number, d: number, kind: "verdura" | "carne"): Part[] {
  const ps: Part[] = [plinth(w, d), ...table(0, w, d)];
  if (kind === "verdura") {
    ps.push(...board(-1.2, BOARD.verde), ...board(-0.5, BOARD.verde));
    // Robot Coupe CL50: base, feed head and the GN catching the slices.
    ps.push(C(0.4, 1.12, 0.1, 0.32, 0.44, 0.35, 0x6a6e76), C(0.4, 1.45, 0.05, 0.22, 0.22, 0.22, darkSteel), C(0.4, 0.95, -0.15, 0.3, 0.1, 0.17, STAINLESS));
    ps.push(...gn(1.0, 0.1, 0xe07a2a), ...gn(1.2, 0.1, 0x4f8a3c), ...gn(1.4, 0.1, 0xb03030), ...gn(1.6, 0.1, 0xe8d6a0));
    // Vegetable sink at the left end.
    ps.push(C(-1.55, 0.86, 0.05, 0.25, 0.1, 0.5, 0x9aa6ad), C(-1.55, 1.1, 0.3, 0.03, 0.4, 0.03, steel));
  } else {
    ps.push(...board(-1.2, BOARD.rojo), ...board(-0.5, BOARD.azul), ...board(0.2, BOARD.amarillo));
    // Meat mincer nº22 and the chamber vacuum packer.
    ps.push(C(0.85, 1.12, 0.1, 0.25, 0.45, 0.45, steel), C(0.85, 1.4, -0.05, 0.12, 0.12, 0.3, STAINLESS));
    ps.push(C(1.4, 1.12, 0.05, 0.46, 0.44, 0.52, steel), C(1.4, 1.36, 0.05, 0.42, 0.06, 0.48, glass));
    // Knife magnet on the wall side and the hand-wash sink sign of the APPCC.
    ps.push(C(-0.85, 1.25, 0.33, 0.5, 0.05, 0.02, darkSteel), ...rep(4, (i) => [C(-1.0 + i * 0.1, 1.2, 0.32, 0.03, 0.25, 0.01, STAINLESS)]));
  }
  return ps;
}

function lavado(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Inlet table with the pre-rinse sink and its spray arm.
    ...table(-0.9, 1.0, d), C(-1.0, 0.82, 0, 0.5, 0.14, 0.45, 0x9aa6ad), C(-1.0, 1.3, 0.3, 0.03, 0.8, 0.03, steel), C(-1.0, 1.65, 0.1, 0.03, 0.03, 0.4, steel), C(-1.0, 1.4, -0.08, 0.08, 0.4, 0.08, 0x333333),
    // Hood dishwasher (Hobart AM): body and raised hood, a rack inside.
    C(0, 0.45, 0, 0.64, 0.9, d, steel), C(0, 1.2, 0, 0.64, 0.6, d - 0.05, STAINLESS), C(0, 1.52, 0, 0.6, 0.04, d - 0.1, darkSteel),
    // Outlet table with clean racks of plates and a stack of trays.
    ...table(0.95, 0.9, d), C(0.95, 1.0, 0, 0.5, 0.2, 0.5, 0x3b6fc2), ...rep(8, (i) => [C(0.78 + i * 0.05, 1.08, 0, 0.01, 0.24, 0.24, white)]),
  ];
}

function molienda(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Stone mill: wooden cabinet, the stones' housing, the hopper and the flour chute into a bin.
    C(-1.4, 0.5, 0.05, 0.6, 1.0, 0.6, oak), C(-1.4, 1.08, 0.05, 0.5, 0.16, 0.5, 0x8a8a84), C(-1.4, 1.3, 0.05, 0.4, 0.3, 0.4, wood), C(-1.4, 0.3, -0.35, 0.3, 0.4, 0.2, white),
    // Sifter (tamizadora): box on legs with its two outlets, white flour and bran.
    C(-0.2, 0.8, 0.05, 1.0, 0.45, 0.6, 0xc9c0ae), ...[-0.5, 0.1].flatMap((x, i) => [C(x, 0.3, -0.05, 0.05, 0.6, 0.05, steel), C(x, 0.22, -0.35, 0.35, 0.4, 0.3, i ? 0xa8854a : FLOUR)]), C(0.2, 0.3, -0.05, 0.05, 0.6, 0.05, steel),
    // Grain cleaner (criba) and the sacks: grain in, flour out, on a pallet.
    C(0.9, 0.6, 0.1, 0.7, 0.5, 0.5, 0x7a8a6a), C(0.9, 0.2, 0.1, 0.6, 0.4, 0.4, steel),
    C(1.75, 0.07, 0, 0.8, 0.14, 1.0, 0xa88a5a), sack(1.75, 0.22, 0, SACK), sack(1.75, 0.38, 0, FLOUR), sack(1.75, 0.54, 0, FLOUR),
  ];
}

function aceitePanela(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Screw oil press on its stand, the oilcake tray and the settling bottles.
    ...table(-0.85, 1.1, d), C(-1.0, 1.05, 0.05, 0.6, 0.25, 0.25, 0x2f5f8a), C(-1.2, 1.25, 0.05, 0.2, 0.2, 0.2, steel), C(-0.6, 0.95, -0.2, 0.3, 0.06, 0.2, 0x6b4a2a),
    ...rep(4, (i) => [C(-1.25 + i * 0.15, 1.02, 0.3, 0.08, 0.24, 0.08, 0xd9b44a)]),
    // Panela: the small cane mill (trapiche), the paila on its burner and the wooden moulds.
    C(0.1, 0.6, 0.1, 0.5, 1.2, 0.5, darkSteel), C(0.1, 1.05, -0.2, 0.4, 0.15, 0.15, 0x7aa04a),
    C(0.75, 0.4, 0.05, 0.6, 0.8, 0.6, 0x3a3a3a), C(0.75, 0.86, 0.05, 0.7, 0.12, 0.7, 0x8c4a2f), C(0.75, 0.9, 0.05, 0.6, 0.04, 0.6, 0x6b3a1a),
    C(1.15, 1.1, 0.0, 0.04, 0.6, 0.04, steel),
    C(1.15, 0.5, 0.0, 0.45, 0.8, 0.7, oak), ...rep(6, (i) => [C(1.02 + (i % 2) * 0.25, 0.92, -0.2 + Math.floor(i / 2) * 0.2, 0.18, 0.06, 0.14, 0x7a4a1a)]),
  ];
}

function panaderia(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Spiral mixer: body, bowl with dough, the head on its column.
    C(-1.4, 0.35, 0.05, 0.6, 0.7, 0.6, 0xe8e8e4), C(-1.4, 0.8, -0.05, 0.55, 0.25, 0.5, STAINLESS), C(-1.4, 0.88, -0.05, 0.45, 0.06, 0.4, DOUGH), C(-1.4, 1.0, 0.25, 0.5, 0.5, 0.15, 0xe8e8e4), C(-1.4, 1.15, 0.0, 0.5, 0.15, 0.4, 0xe8e8e4),
    // Wooden bench: dough pieces, the scraper, flour, proofing baskets (bannetons) on a rack.
    C(0, 0.45, 0, 1.6, 0.9, d, oak), C(0, 0.92, 0, 1.6, 0.05, d, 0xc9a06a),
    ...rep(6, (i) => [C(-0.6 + i * 0.22, 0.98, -0.12, 0.16, 0.08, 0.16, DOUGH)]), C(0.55, 0.96, 0.15, 0.12, 0.02, 0.1, steel), C(0.3, 0.96, 0.2, 0.3, 0.02, 0.2, FLOUR),
    ...rep(4, (i) => [C(-0.55 + i * 0.35, 1.08, 0.22, 0.24, 0.1, 0.24, 0xb08850)]),
    // Planetary mixer (20 l) with its whisk.
    C(1.35, 0.45, 0, 0.6, 0.9, 0.6, oak), C(1.35, 1.05, 0.12, 0.25, 0.3, 0.2, 0xdedede), C(1.35, 1.12, -0.05, 0.3, 0.2, 0.3, STAINLESS), C(1.35, 1.25, -0.05, 0.25, 0.08, 0.25, 0xdedede),
  ];
}

function hornoPisos(w: number, d: number, h: number): Part[] {
  const ow = 1.9, ox = -0.45;
  return [
    plinth(w, d),
    // The proofer (cámara de fermentación) below, the three decks with their glass doors, the control panel and the hood.
    C(ox, 0.35, 0.05, ow, 0.7, d - 0.1, darkSteel), C(ox, 0.35, -d / 2 + 0.06, ow - 0.1, 0.6, 0.02, 0x404850),
    ...rep(3, (i) => [C(ox, 0.85 + i * 0.32, 0.05, ow, 0.3, d - 0.1, 0x3a3a3a), C(ox, 0.85 + i * 0.32, -d / 2 + 0.04, 1.3, 0.16, 0.02, 0x3a2a1a), C(ox, 0.94 + i * 0.32, -d / 2 + 0.02, 1.5, 0.03, 0.04, steel), C(ox + 0.8, 0.85 + i * 0.32, -d / 2 + 0.04, 0.2, 0.2, 0.02, screen)]),
    C(ox, 1.8, 0, ow + 0.1, 0.2, d, steel),
    // Tray trolley (18 trays of 60 × 80) with loaves, and the peel against it.
    ...rep(4, (i) => [C(1.05, 0.06, -0.3 + (i % 2) * 0.6, 0.05, 0.08, 0.05, rubber)]),
    ...[-1, 1].map((s) => C(1.05 + s * 0.25, 0.9, 0, 0.03, h - 0.2, 0.75, steel)),
    ...rep(6, (i) => [C(1.05, 0.3 + i * 0.25, 0, 0.5, 0.02, 0.7, 0x8a8a84), ...(i < 4 ? [C(1.05, 0.35 + i * 0.25, 0, 0.4, 0.08, 0.6, i % 2 ? 0xa86a2a : 0xc08a4a)] : [])]),
    C(1.3, 0.9, -0.4, 0.3, 1.7, 0.03, 0xc9a06a),
  ];
}

function pasta(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Wooden table: the sheeter, a sheet of dough, the rolling pin, nests of tagliatelle and ravioli on trays.
    C(0, 0.45, 0, w, 0.9, d, oak), C(0, 0.92, 0, w, 0.05, d, 0xc9a06a),
    C(-1.1, 1.13, 0.05, 0.6, 0.38, 0.4, STAINLESS), C(-1.1, 1.0, -0.2, 0.25, 0.01, 0.3, DOUGH), C(-0.85, 1.15, 0.05, 0.08, 0.08, 0.25, 0x333333),
    C(-0.3, 0.955, -0.05, 0.9, 0.01, 0.4, DOUGH), C(-0.3, 0.98, 0.22, 0.5, 0.04, 0.04, wood),
    ...rep(8, (i) => [C(0.5 + (i % 4) * 0.2, 0.98, -0.15 + Math.floor(i / 4) * 0.2, 0.14, 0.05, 0.14, 0xe8d090)]),
    C(1.25, 0.96, 0.05, 0.6, 0.02, 0.4, steel), ...rep(6, (i) => [C(1.05 + (i % 3) * 0.2, 0.99, -0.05 + Math.floor(i / 3) * 0.2, 0.08, 0.03, 0.08, DOUGH)]),
  ];
}

function extrusora(w: number, d: number, h: number): Part[] {
  return [
    plinth(w, d),
    // Extruder on a trolley: hopper, auger housing and die, cutting knife, a tray of macaroni under it.
    C(-0.4, 0.4, 0, 0.6, 0.8, d - 0.05, steel), C(-0.4, 1.1, 0, 0.32, 0.6, 0.55, STAINLESS), C(-0.4, 1.5, 0.05, 0.28, 0.2, 0.28, STAINLESS), C(-0.4, 1.0, -0.25, 0.14, 0.14, 0.08, 0x8a8a84), C(-0.4, 0.83, -0.17, 0.4, 0.04, 0.25, 0xe8d090),
    // Drying cabinet: frame with fan on top and trays of short pasta.
    C(0.42, h / 2, 0.29, 0.7, h, 0.02, 0xdedede), ...[-1, 1].map((s) => C(0.42 + s * 0.34, h / 2, 0, 0.02, h, d, 0xdedede)), C(0.42, h - 0.05, 0, 0.7, 0.1, d, 0xdedede),
    ...rep(7, (i) => [C(0.42, 0.2 + i * 0.2, 0, 0.64, 0.02, d - 0.05, 0xe8d090)]),
  ];
}

function queseria(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Double-walled cheese vat (200 l) on legs, with the curd, the harp (lira) and the stirrer motor; the outlet valve.
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(-0.9 + sx * 0.6, 0.2, sz * 0.3, 0.05, 0.4, 0.05, steel))),
    C(-0.9, 0.65, 0, 1.4, 0.5, d - 0.05, STAINLESS), C(-0.9, 0.86, 0, 1.3, 0.04, d - 0.15, 0xf4f0e0), C(-0.9, 1.05, 0.3, 1.3, 0.05, 0.05, steel), C(-0.9, 1.0, 0.0, 0.05, 0.3, 0.5, steel), C(-1.55, 0.45, -0.3, 0.1, 0.1, 0.12, steel),
    // Moulding table with drainage, the moulds and a vertical press.
    ...table(0.65, 1.6, d), ...rep(8, (i) => [C(0.1 + (i % 4) * 0.25, 0.98, -0.15 + Math.floor(i / 4) * 0.3, 0.17, 0.14, 0.17, white)]),
    C(1.25, 1.1, 0.1, 0.3, 0.4, 0.3, steel), C(1.25, 1.35, 0.1, 0.06, 0.25, 0.06, darkSteel),
  ];
}

function cava(w: number, d: number, h: number): Part[] {
  const L = 5;
  return [
    plinth(w, d),
    // Wooden ripening boards (spruce) with wheels of cheese, the brine tub at the bottom and the thermo-hygrometer.
    ...rack(0, w, d, h, L, 0xc9a06a),
    ...rep(L - 1, (lv) => rep(7, (i) => [C(-1.15 + i * 0.38, shelfY(h, L, lv + 1) + 0.07, 0, 0.3, 0.12, 0.3, lv % 2 ? CHEESE : 0xd9a04a)])),
    C(0.4, 0.1, 0, 1.6, 0.2, d - 0.1, 0xdedede), C(0.4, 0.21, 0, 1.5, 0.02, d - 0.2, 0xbfe3f0),
    C(-1.2, 1.5, -d / 2 + 0.02, 0.12, 0.12, 0.03, white),
  ];
}

function fermentos(w: number, d: number): Part[] {
  return [
    plinth(w, d),
    // Yogurt incubator cabinet (42 °C) with its glass door and jars inside.
    C(-0.6, 0.6, 0, 0.9, 1.2, d, steel), C(-0.6, 0.65, -d / 2 + 0.02, 0.8, 1.0, 0.02, glass),
    ...rep(3, (lv) => rep(5, (i) => [C(-0.92 + i * 0.16, 0.3 + lv * 0.33, -0.1, 0.1, 0.13, 0.1, white)])),
    C(-0.6, 1.15, -d / 2 + 0.03, 0.2, 0.08, 0.02, screen),
    // Tempeh incubator (30 °C): perforated bags on trays.
    C(0.55, 0.45, 0, 0.9, 0.9, d, 0xdedede), ...rep(3, (i) => [C(0.55, 0.2 + i * 0.25, -d / 2 + 0.02, 0.8, 0.02, 0.02, darkSteel)]),
    // On top: kefir jars with their grains under cloth, a strainer and milk.
    ...rep(4, (i) => [C(0.25 + i * 0.2, 1.02, -0.1, 0.12, 0.22, 0.12, 0xf4f4ee), C(0.25 + i * 0.2, 1.14, -0.1, 0.13, 0.02, 0.13, 0xc9b28c)]),
    C(0.95, 0.98, 0.15, 0.15, 0.15, 0.15, white),
  ];
}

/** The parts of a kitchen block (KITCHEN_BLOCKS) at its footprint w × d and height h. */
export function kitchenBlock(id: string, w: number, d: number, h: number): Part[] {
  switch (id) {
    case "recepcion":
      return recepcion(w, d);
    case "almacen-seco":
      return almacenSeco(w, d, h);
    case "camaras-frias":
      return camarasFrias(w, d, h);
    case "prep-verdura":
      return prep(w, d, "verdura");
    case "prep-carne":
      return prep(w, d, "carne");
    case "lavado":
      return lavado(w, d);
    case "molienda":
      return molienda(w, d);
    case "aceite-panela":
      return aceitePanela(w, d);
    case "panaderia":
      return panaderia(w, d);
    case "horno-pisos":
      return hornoPisos(w, d, h);
    case "pasta":
      return pasta(w, d);
    case "extrusora":
      return extrusora(w, d, h);
    case "queseria":
      return queseria(w, d);
    case "cava":
      return cava(w, d, h);
    case "fermentos":
      return fermentos(w, d);
    default:
      return [C(0, h / 2, 0, w, h, d)];
  }
}

/** What a cooking station has on it: pots on the induction, a pan on the griddle, boards and the knife rack. */
export const STATION_UTENSILS: readonly Part[] = [
  // Stockpot and saucepan on the induction (−x side), a sauté pan and fish slice on the griddle.
  C(-3.1, 1.06, 0.9, 0.35, 0.32, 0.35, STAINLESS), C(-3.1, 1.0, -0.25, 0.28, 0.18, 0.28, STAINLESS), C(-3.3, 1.08, -0.25, 0.25, 0.03, 0.04, darkSteel),
  C(-0.9, 0.98, 2.1, 0.3, 0.06, 0.3, 0x2a2a2a), C(-0.65, 0.97, 2.0, 0.2, 0.01, 0.08, steel),
  // Boards and a GN mise en place on the counter, the knife magnet and the ladles hanging over the station.
  C(-2.2, 0.92, 2.1, 0.5, 0.02, 0.32, BOARD.verde), C(-1.85, 0.92, 2.1, 0.4, 0.02, 0.3, BOARD.rojo), C(-2.55, 0.95, 2.25, 0.17, 0.08, 0.32, STAINLESS), C(-2.55, 0.99, 2.25, 0.15, 0.02, 0.3, 0x4f8a3c),
  C(-2.0, 1.35, 2.42, 0.5, 0.05, 0.02, darkSteel), ...rep(4, (i) => [C(-2.15 + i * 0.1, 1.3, 2.41, 0.03, 0.22, 0.01, STAINLESS)]),
  // Plates warming and a stack of clean towels by the pass side.
  ...rep(6, (i) => [C(3.1, 1.02 + i * 0.012, 0.9, 0.28, 0.01, 0.28, white)]), C(3.1, 1.04, -0.25, 0.3, 0.08, 0.2, white),
];

/** What a table for four has when it is set: plates, cutlery, glasses and the water jug. */
export const TABLE_SETTING: readonly Part[] = [
  ...[0, 1, 2, 3].flatMap((s) => {
    const a = (s * Math.PI) / 2, sx = Math.sin(a), sz = Math.cos(a), r = 0.42;
    const px = sx * r, pz = sz * r;
    const along = (o: number): [number, number] => [px + Math.cos(a) * o, pz - Math.sin(a) * o];
    const [fx, fz] = along(-0.17), [kx, kz] = along(0.17), [gx, gz] = along(0.2);
    return [
      C(px, 0.79, pz, 0.27, 0.015, 0.27, white),
      C(fx, 0.785, fz, s % 2 ? 0.18 : 0.02, 0.01, s % 2 ? 0.02 : 0.18, STAINLESS),
      C(kx, 0.785, kz, s % 2 ? 0.2 : 0.02, 0.01, s % 2 ? 0.02 : 0.2, STAINLESS),
      C(gx - sx * 0.15, 0.835, gz - sz * 0.15, 0.07, 0.12, 0.07, glass),
    ];
  }),
  C(0.12, 0.88, 0.12, 0.1, 0.22, 0.1, glass),
];
