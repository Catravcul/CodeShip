import { C, COL, bar, m, pz, rep, type ModelDef, type Part } from "./kit";

/**
 * MUSIC AND CLASSROOMS rebuilt from zero (Berón 2026-11-20: «se pasaba por pasillos muy estrechos entre compartimentos…
 * una habitación parecía casi vacía con solo tres cubos en el centro… quizás el área de música se debe recrear de cero,
 * se crean las salas necesarias a lujo de detalle/realismo y se separan en pisos propios… también para las aulas de
 * estudio… cada aula preparada para una materia»). Every room is its own floor (data/floors/musica-aulas.ts) and every
 * piece of equipment its own model with the real one's size: front (where she stands, sits or plays) towards −z.
 * Sources per model; the rooms' layouts follow the real references named on each floor.
 */
const { iron, chrome, wood, oak, white, steel, darkSteel, glass, fabric, screen } = COL;
const BLACK = 0x161618;
const SPRUCE = 0xd9b77a;
const MAPLE = 0xc9a26b;
const FOAM = 0x2f3a4a;
const BRASS = 0xc9a43a;
const CYMBAL = 0xd4aa4a;
const DRUM = 0x8c2a2a;
const SEAT = 0x80242a;
const BOARD = 0xf4f6f2;
const BOOK = [0x8c3333, 0x33598c, 0x4d7340, 0x998040, 0x6b4a8c] as const;

// --- Pieces ------------------------------------------------------------------------------------------------------------
/** A drum (shell axis vertical) at (x, y, z) of diameter d and depth h. */
const drum = (x: number, y: number, z: number, d: number, h: number, c: number = DRUM): Part[] => [C(x, y, z, d, h, d, c), C(x, y + h / 2 + 0.005, z, d * 0.96, 0.01, d * 0.96, white)];
/** A cymbal on its stand at height h. */
const cymbal = (x: number, z: number, h: number, d = 0.45): Part[] => [bar(x, 0, z, x, h, z, 0.025, chrome), C(x, h + 0.01, z, d, 0.015, d, CYMBAL)];
/** A mic on a boom stand, mic at height h pointing −z. */
const mic = (x: number, z: number, h = 1.5): Part[] => [C(x, 0.02, z, 0.35, 0.03, 0.35, BLACK), bar(x, 0, z, x, h - 0.1, z, 0.025, BLACK), bar(x, h - 0.1, z, x, h, z - 0.3, 0.02, BLACK), C(x, h, z - 0.36, 0.05, 0.05, 0.16, darkSteel)];
/** A music stand (desk 0,5 × 0,35 at 1,1 m, tilted shown flat). */
const stand = (x: number, z: number): Part[] => [bar(x, 0, z, x, 1.0, z, 0.02, BLACK), C(x, 1.08, z, 0.5, 0.35, 0.02, BLACK), C(x, 1.08, z - 0.012, 0.42, 0.28, 0.005, white)];
/** An orchestra chair (seat 0,45 m): she sits facing +z (the conductor, the stand), the back rest on −z. */
const chair = (x: number, z: number, c: number = BLACK): Part[] => [C(x, 0.45, z, 0.45, 0.05, 0.45, c), C(x, 0.75, z - 0.22, 0.45, 0.55, 0.04, c), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(x + sx * 0.19, 0.22, z + sz * 0.19, 0.03, 0.44, 0.03, chrome)))];
/** A school desk (0,7 × 0,5, top 0,76 m) with its chair on −z (she faces +z, the board). */
const desk = (x: number, z: number): Part[] => [
  C(x, 0.75, z, 0.7, 0.03, 0.5, oak),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(x + sx * 0.32, 0.37, z + sz * 0.22, 0.03, 0.74, 0.03, iron))),
  C(x, 0.6, z + 0.05, 0.6, 0.02, 0.4, iron), // book shelf under the top
  C(x, 0.44, z - 0.55, 0.42, 0.04, 0.4, 0x5a6b80),
  C(x, 0.7, z - 0.76, 0.42, 0.4, 0.03, 0x5a6b80),
  ...[-1, 1].flatMap((sx) => [C(x + sx * 0.18, 0.22, z - 0.55, 0.025, 0.44, 0.35, iron)]),
];
/** A wall at the far end (+z) of a room: x wide, h high, 0,15 thick, centred at x = 0. */
const wall = (w: number, h = 3): Part => C(0, h / 2, 0.075, w, h, 0.15, 0xe8e4da);
/** A bookcase (w × 2 m, 0,35 deep) with its shelves full of books, against +z at z. */
const bookcase = (x: number, z: number, w: number, h = 2): Part[] => [
  C(x, h / 2, z, w, h, 0.35, wood),
  ...rep(Math.round(h / 0.4) - 1, (r) => rep(Math.max(1, Math.round(w / 0.25)), (b) => [C(x - w / 2 + 0.14 + b * 0.25, 0.25 + r * 0.4, z - 0.02, 0.2, 0.28, 0.26, BOOK[(r + b) % BOOK.length])])),
];
/** An acoustic absorber panel (1,2 × 0,1 m, 2,4 m high, on the floor against a wall line). */
const panel = (x: number, z: number, alongX = true): Part => (alongX ? C(x, 1.3, z, 1.2, 2.4, 0.1, FOAM) : C(x, 1.3, z, 0.1, 2.4, 1.2, FOAM));

const ROOMS: readonly ModelDef[] = [
  // ── Music: the band's rehearsal room (a real rehearsal room is 25–40 m², treated walls, backline and PA) ──
  pz("mus-bateria", "maquina", "musica-banda", "Batería acústica en su tarima (bombo 22″, caja, 3 toms, charles, crash y ride)", DRUM, [
    C(0, 0.1, 0, 2.4, 0.2, 2.0, 0x3a3a3e), // the riser, 20 cm
    C(0, 0.48, 0.35, 0.56, 0.56, 0.4, DRUM), C(0, 0.48, 0.14, 0.5, 0.5, 0.01, white), // kick 22″ (head towards −z)
    ...drum(-0.35, 0.78, -0.2, 0.36, 0.14, 0xc0c0c0), // snare
    ...drum(-0.15, 0.95, 0.15, 0.25, 0.2), ...drum(0.18, 0.95, 0.15, 0.3, 0.22), ...drum(0.5, 0.65, -0.1, 0.4, 0.4), // toms and floor tom
    ...cymbal(-0.7, -0.15, 1.05, 0.36), // hi-hat
    ...cymbal(-0.55, 0.45, 1.55), ...cymbal(0.75, 0.35, 1.5, 0.52),
    C(0.05, 0.62, -0.55, 0.38, 0.06, 0.38, BLACK), bar(0.05, 0.2, -0.55, 0.05, 0.6, -0.55, 0.05, chrome), // throne
  ], "real", "Batería estándar de rock (Pearl Export, Yamaha Stage Custom): bombo 22″, caja 14″, toms 10″/12″, base 16″; tarima de 2,4 × 2 m"),
  pz("mus-ampli-guitarra", "maquina", "musica-banda", "Amplificador de guitarra (cabezal y pantalla 4×12″) con la guitarra en su soporte", BLACK, [
    C(0, 0.38, 0.2, 0.76, 0.76, 0.36, BLACK), C(0, 0.38, 0.015, 0.68, 0.68, 0.01, 0x3a3a3a), C(0, 0.89, 0.2, 0.74, 0.26, 0.24, BLACK), ...rep(6, (i) => [C(-0.25 + i * 0.1, 0.9, 0.07, 0.03, 0.03, 0.02, BRASS)]),
    C(-0.75, 0.25, -0.1, 0.3, 0.02, 0.3, BLACK), bar(-0.75, 0, -0.1, -0.75, 0.55, -0.15, 0.02, BLACK), C(-0.75, 0.45, -0.18, 0.34, 0.45, 0.06, 0xb03a2e), C(-0.75, 0.95, -0.2, 0.05, 0.6, 0.03, MAPLE),
  ], "real", "Marshall JCM800 + 1960A (pantalla 4×12″, 76 × 76 × 36 cm); Fender Stratocaster en soporte de guitarra"),
  pz("mus-ampli-bajo", "maquina", "musica-banda", "Amplificador de bajo (pantalla 8×10″) con el bajo en su soporte", BLACK, [
    C(0, 0.62, 0.22, 0.6, 1.24, 0.42, BLACK), C(0, 0.62, 0.005, 0.54, 1.16, 0.01, 0x3a3a3a), C(0, 1.34, 0.22, 0.6, 0.2, 0.36, darkSteel),
    C(0.7, 0.25, -0.1, 0.3, 0.02, 0.3, BLACK), bar(0.7, 0, -0.1, 0.7, 0.55, -0.15, 0.02, BLACK), C(0.7, 0.48, -0.18, 0.34, 0.5, 0.06, 0x2a2a2a), C(0.7, 1.05, -0.2, 0.05, 0.75, 0.03, MAPLE),
  ], "real", "Ampeg SVT-810E (61 × 124 × 42 cm) y SVT-CL; Fender Precision Bass"),
  pz("mus-teclado", "maquina", "musica-banda", "Piano de escenario de 88 teclas en su soporte en X, con banqueta", BLACK, [
    C(0, 0.8, 0, 1.33, 0.13, 0.35, BLACK), C(0, 0.875, -0.08, 1.24, 0.02, 0.16, white), ...rep(36, (i) => [C(-0.6 + i * 0.034, 0.89, -0.03, 0.012, 0.01, 0.08, BLACK)]),
    bar(-0.45, 0, -0.15, -0.45, 0.74, 0.15, 0.03, iron), bar(-0.45, 0, 0.15, -0.45, 0.74, -0.15, 0.03, iron), bar(0.45, 0, -0.15, 0.45, 0.74, 0.15, 0.03, iron), bar(0.45, 0, 0.15, 0.45, 0.74, -0.15, 0.03, iron),
    C(0, 0.48, -0.6, 0.55, 0.06, 0.32, BLACK), ...[-1, 1].map((s) => C(s * 0.22, 0.23, -0.6, 0.04, 0.46, 0.28, chrome)),
  ], "real", "Nord Stage 4 88 (130 × 34 cm) en soporte en X; banqueta de piano"),
  pz("mus-pa-ensayo", "maquina", "musica-banda", "Equipo de voces: mesa de mezclas de 12 canales y dos cajas activas en trípode", BLACK, [
    C(0, 0.4, 0, 0.8, 0.8, 0.5, darkSteel), C(0, 0.85, 0, 0.5, 0.1, 0.42, 0x2a2a2e), ...rep(12, (i) => [C(-0.2 + i * 0.036, 0.91, 0, 0.02, 0.02, 0.3, i % 4 === 0 ? 0xe6b340 : 0xd8d8d8)]),
    ...[-1.6, 1.6].flatMap((x) => [bar(x, 0, 0.1, x, 1.5, 0.1, 0.035, BLACK), C(x, 1.85, 0.1, 0.38, 0.62, 0.36, BLACK), C(x, 1.85, -0.075, 0.3, 0.5, 0.01, 0x333333)]),
  ], "real", "Yamaha MG12XU (12 canales) y dos QSC K12.2 (38 × 62 × 36 cm) en trípode"),
  pz("mus-microfonos", "maquina", "musica-banda", "Tres micrófonos de voz en pie de jirafa", BLACK, [...mic(-1.0, 0), ...mic(0, 0), ...mic(1.0, 0)], "real", "Shure SM58 en pie de jirafa K&M 210/9"),
  pz("mus-paneles-acusticos", "mueble", "musica-banda", "Pared tratada: absorbentes de lana de roca y difusor (6 m)", FOAM, [
    ...rep(4, (i) => [panel(-2.4 + i * 1.6, 0)]), C(0, 1.3, 0.04, 1.2, 1.8, 0.2, oak), ...rep(7, (i) => [C(-0.51 + i * 0.17, 1.3, -0.03 + (i % 3) * 0.04, 0.14, 1.8, 0.1 + (i % 3) * 0.08, oak)]),
  ], "real", "Absorbentes de lana de roca de 10 cm (GIK 244) y difusor QRD; Everest, Master Handbook of Acoustics, 6.ª ed."),
  pz("mus-sofa", "mueble", "musica", "Sofá de tres plazas", fabric, [C(0, 0.22, 0, 2.0, 0.44, 0.9, fabric), C(0, 0.6, 0.38, 2.0, 0.5, 0.18, fabric), C(-0.95, 0.5, 0, 0.14, 0.3, 0.9, fabric), C(0.95, 0.5, 0, 0.14, 0.3, 0.9, fabric)], "real", "Sofá de tres plazas (200 × 90 cm)"),

  // ── Music: the recording studio (control room, live room, vocal booth) ──
  pz("mus-consola", "maquina", "musica-estudio", "Consola de grabación de 24 canales con monitores de campo cercano", 0x3a3a40, [
    C(0, 0.4, 0, 2.4, 0.8, 1.0, 0x3a3a40), C(0, 0.86, -0.05, 2.3, 0.12, 0.9, 0x2a2a2e), ...rep(24, (i) => [C(-1.08 + i * 0.094, 0.93, -0.05, 0.03, 0.02, 0.8, i % 6 === 0 ? 0xe6b340 : 0xc8c8c8)]),
    C(0, 1.1, 0.42, 0.7, 0.42, 0.04, screen), ...[-0.85, 0.85].flatMap((x) => [C(x, 1.15, 0.38, 0.2, 0.33, 0.25, BLACK), C(x, 1.17, 0.25, 0.12, 0.12, 0.01, 0x777777)]),
    C(0, 0.5, -0.9, 0.6, 0.08, 0.55, BLACK), bar(0, 0, -0.9, 0, 0.48, -0.9, 0.05, chrome),
  ], "real", "SSL AWS 924 (24 canales, 2,3 m) y Genelec 8040 en la consola; silla de técnico"),
  pz("mus-monitores-principales", "mueble", "musica-estudio", "Monitores principales empotrados en la pared frontal tratada (5 m)", FOAM, [
    C(0, 1.4, 0.1, 5, 2.8, 0.2, FOAM), ...[-1.5, 1.5].flatMap((x) => [C(x, 1.7, -0.02, 0.6, 0.9, 0.1, BLACK), C(x, 1.55, -0.08, 0.38, 0.38, 0.01, 0x555555), C(x, 1.95, -0.08, 0.14, 0.14, 0.01, 0x777777)]),
    C(0, 1.7, -0.02, 1.5, 0.85, 0.06, screen),
  ], "real", "Monitores principales empotrados (Genelec 1238A, ATC SCM150) en pared frontal tratada"),
  pz("mus-rack-equipos", "mueble", "musica-estudio", "Rack de equipos (previos, compresores, interfaz)", BLACK, [C(0, 0.6, 0, 0.6, 1.2, 0.7, BLACK), ...rep(10, (i) => [C(0, 0.12 + i * 0.105, -0.355, 0.48, 0.08, 0.01, i % 3 === 0 ? 0x8a8f96 : i % 3 === 1 ? 0x3a5f8a : 0x2a2a2a)])], "real", "Rack de 19″ y 22 U: Neve 1073, UA 1176, interfaz Avid HDX"),
  pz("mus-ventana-control", "mueble", "musica-estudio", "Pared de doble cristal entre la sala de control y la de grabación, con su puerta (6 m)", 0xe8e4da, [
    C(-2.3, 1.4, 0, 1.4, 2.8, 0.3, 0xe8e4da), C(1.1, 0.45, 0, 2.6, 0.9, 0.3, 0xe8e4da), C(1.1, 2.3, 0, 2.6, 1.0, 0.3, 0xe8e4da), C(1.1, 1.35, -0.08, 2.5, 0.9, 0.02, glass), C(1.1, 1.35, 0.08, 2.5, 0.9, 0.02, glass), C(2.8, 1.4, 0, 0.4, 2.8, 0.3, 0xe8e4da),
    C(-1.05, 1.05, 0.0, 1.0, 2.1, 0.08, 0x6b4a32), C(-0.65, 1.05, -0.06, 0.04, 0.15, 0.04, chrome), C(-1.05, 2.45, 0, 1.1, 0.7, 0.3, 0xe8e4da),
  ], "real", "Ventana de doble vidrio laminado inclinada y puerta acústica (Studio Designs, Newell: Recording Studio Design, 4.ª ed.)"),
  pz("mus-piano-cola", "maquina", "musica", "Piano de cola de concierto (2,74 m) con su banqueta", BLACK, [
    C(0, 0.75, 0.55, 1.57, 0.32, 1.5, BLACK), C(0.25, 0.75, 1.55, 0.95, 0.32, 0.7, BLACK), C(0, 0.85, -0.12, 1.45, 0.08, 0.2, white), ...rep(36, (i) => [C(-0.66 + i * 0.037, 0.9, -0.08, 0.014, 0.01, 0.1, BLACK)]),
    ...[[-0.7, -0.1], [0.7, -0.1], [0.3, 1.7]].map(([x, z]) => C(x!, 0.3, z!, 0.12, 0.6, 0.12, BLACK)), C(0, 1.3, 0.9, 1.4, 0.03, 1.4, BLACK), bar(0.6, 0.92, 0.2, 0.6, 1.3, 0.9, 0.02, BLACK),
    C(0, 0.48, -0.65, 0.7, 0.06, 0.35, BLACK), ...[-1, 1].map((s) => C(s * 0.3, 0.23, -0.65, 0.04, 0.46, 0.3, BLACK)),
  ], "real", "Steinway & Sons modelo D (274 × 157 cm, 480 kg); banqueta de piano regulable"),
  pz("mus-bateria-estudio", "maquina", "musica-estudio", "Batería de estudio con sus micrófonos (overheads y de bombo)", DRUM, [
    C(0, 0.35, 0.3, 0.56, 0.56, 0.4, DRUM), C(0, 0.35, 0.09, 0.5, 0.5, 0.01, white), ...drum(-0.35, 0.65, -0.25, 0.36, 0.14, 0xc0c0c0), ...drum(0.1, 0.8, 0.1, 0.3, 0.22), ...drum(0.45, 0.5, -0.15, 0.4, 0.4),
    ...cymbal(-0.65, -0.2, 0.95, 0.36), ...cymbal(0.7, 0.35, 1.4, 0.52), C(0, 0.5, -0.6, 0.38, 0.06, 0.38, BLACK), bar(0, 0, -0.6, 0, 0.48, -0.6, 0.05, chrome),
    bar(-0.9, 0, 0.6, -0.9, 2.0, 0.6, 0.025, BLACK), bar(-0.9, 2.0, 0.6, -0.3, 2.0, 0.2, 0.02, BLACK), bar(0.9, 0, 0.6, 0.9, 2.0, 0.6, 0.025, BLACK), bar(0.9, 2.0, 0.6, 0.3, 2.0, 0.2, 0.02, BLACK),
    C(0, 0.3, -0.05, 0.08, 0.08, 0.2, darkSteel),
  ], "real", "Kit de estudio (Gretsch Brooklyn) con overheads Neumann KM184 y AKG D112 en el bombo"),
  pz("mus-mamparas", "mueble", "musica-estudio", "Dos mamparas acústicas móviles", FOAM, [...[-0.7, 0.7].flatMap((x) => [C(x, 0.95, 0, 1.2, 1.7, 0.12, FOAM), C(x, 0.06, 0, 1.0, 0.06, 0.4, BLACK), C(x, 1.55, -0.065, 1.0, 0.4, 0.01, glass)])], "real", "Gobos acústicos con ventana (Auralex MAX-Wall, 1,2 × 1,7 m)"),
  pz("mus-cabina-voz", "maquina", "musica-estudio", "Cabina de voz aislada (2,4 × 2,4 m) con micrófono de condensador y filtro antipop", 0xd8d4ca, [
    C(0, 1.2, 1.15, 2.4, 2.4, 0.1, 0xd8d4ca), C(-1.15, 1.2, 0, 0.1, 2.4, 2.4, 0xd8d4ca), C(1.15, 1.2, 0, 0.1, 2.4, 2.4, 0xd8d4ca), C(0, 2.45, 0, 2.4, 0.1, 2.4, 0xd8d4ca),
    C(-0.75, 1.2, -1.15, 0.9, 2.4, 0.1, 0xd8d4ca), C(0.85, 1.2, -1.15, 0.7, 2.4, 0.1, 0xd8d4ca), C(0.85, 1.35, -1.16, 0.5, 0.5, 0.11, glass), // front: the door gap between
    ...rep(3, (i) => [C(-1.08, 1.3, -0.7 + i * 0.7, 0.04, 1.8, 0.6, FOAM), C(1.08, 1.3, -0.7 + i * 0.7, 0.04, 1.8, 0.6, FOAM)]),
    ...mic(0, 0.45, 1.6), C(0, 1.6, 0.0, 0.2, 0.2, 0.01, 0x222222), ...stand(0.5, 0.2),
  ], "real", "Cabina de voz modular (WhisperRoom MDL 9696, 2,4 × 2,4 m); Neumann U 87 con filtro antipop"),

  // ── Music: practice rooms (Wenger SoundLok modules) ──
  pz("mus-cabina-practica", "maquina", "musica-practica", "Cabina de estudio insonorizada (2,4 × 3 m) con piano vertical, silla, atril y espejo", 0xc9ccc8, [
    C(0, 1.2, 1.45, 2.4, 2.4, 0.1, 0xc9ccc8), C(-1.15, 1.2, 0, 0.1, 2.4, 3.0, 0xc9ccc8), C(1.15, 1.2, 0, 0.1, 2.4, 3.0, 0xc9ccc8), C(0, 2.45, 0, 2.4, 0.1, 3.0, 0xc9ccc8),
    C(-0.7, 1.2, -1.45, 1.0, 2.4, 0.1, 0xc9ccc8), C(0.95, 1.2, -1.45, 0.5, 2.4, 0.1, 0xc9ccc8), C(0.25, 2.25, -1.45, 0.9, 0.4, 0.1, 0xc9ccc8), C(0.25, 1.3, -1.47, 0.3, 0.9, 0.02, glass), // door with its window
    C(0, 0.65, 1.1, 1.5, 1.3, 0.6, 0x3a2a20), C(0, 0.75, 0.75, 1.4, 0.05, 0.2, white), C(0, 0.48, 0.35, 0.7, 0.06, 0.35, BLACK), C(0, 0.23, 0.35, 0.6, 0.46, 0.3, BLACK), // upright piano and its bench
    C(-1.09, 1.2, -0.4, 0.02, 1.6, 0.8, 0xdfeaf0), // mirror
    ...stand(0.7, -0.3), ...chair(0.7, -0.85),
  ], "real", "Wenger SoundLok (módulo de 2,4 × 3 m, −55 dB); piano vertical Yamaha U1 (153 × 61 × 121 cm)"),

  // ── Music: the orchestra's rehearsal hall ──
  pz("mus-atriles-cuerda", "maquina", "musica-orquesta", "Atril doble de la cuerda: dos sillas y un atril", BLACK, [...chair(-0.4, 0), ...chair(0.4, 0), ...stand(0, 0.55)], "real", "Silla de orquesta Wenger Nota y atril Wenger Classic 50 (dos músicos por atril, como en la cuerda)"),
  pz("mus-podio", "maquina", "musica-orquesta", "Podio del director con su atril", 0x3a3a3e, [C(0, 0.1, 0, 1.0, 0.2, 1.0, 0x3a3a3e), C(0, 0.6, 0.45, 1.0, 0.8, 0.04, chrome), bar(0, 0.2, -0.4, 0, 1.2, -0.4, 0.02, BLACK), C(0, 1.28, -0.4, 0.6, 0.4, 0.02, BLACK), C(0, 1.28, -0.412, 0.5, 0.32, 0.005, white)], "real", "Podio de director Wenger (100 × 100 × 20 cm, barandilla trasera)"),
  pz("mus-timbales", "maquina", "musica-orquesta", "Cuatro timbales de pedal (32″, 29″, 26″, 23″) y la banqueta", 0xb87333, [
    ...[[-0.9, 0.81], [-0.3, 0.74], [0.3, 0.66], [0.85, 0.58]].flatMap(([x, d]) => [C(x!, 0.55, 0.3, d!, 0.6, d!, 0xb87333), C(x!, 0.86, 0.3, d! * 0.98, 0.01, d! * 0.98, white), C(x!, 0.12, 0.3, 0.3, 0.24, 0.3, BLACK)]),
    C(0, 0.62, -0.35, 0.35, 0.06, 0.35, BLACK), bar(0, 0, -0.35, 0, 0.6, -0.35, 0.04, chrome),
  ], "real", "Timbales Adams Professional (81, 74, 66 y 58 cm)"),
  pz("mus-arpa", "maquina", "musica-orquesta", "Arpa de concierto de 47 cuerdas con su banqueta", MAPLE, [
    C(0, 0.06, 0.2, 0.5, 0.12, 0.6, MAPLE), bar(0, 0.12, 0.45, 0, 1.85, 0.45, 0.08, MAPLE), bar(0, 0.12, -0.05, 0, 1.6, 0.4, 0.1, SPRUCE), bar(0, 1.85, 0.45, 0, 1.6, -0.1, 0.07, MAPLE),
    ...rep(8, (i) => [bar(0, 0.3 + i * 0.15, 0.0 + i * 0.05, 0, 1.75 - i * 0.02, 0.4 - i * 0.04, 0.006, 0xeeeeee)]), C(0, 0.5, -0.45, 0.4, 0.06, 0.35, BLACK), C(0, 0.24, -0.45, 0.3, 0.48, 0.3, BLACK),
  ], "real", "Lyon & Healy Style 23 (1,88 m, 47 cuerdas)"),
  pz("mus-contrabajos", "maquina", "musica-orquesta", "Dos contrabajos con sus taburetes altos", 0x7a4a2a, [
    ...[-0.5, 0.5].flatMap((x) => [C(x, 0.6, 0.25, 0.7, 0.9, 0.22, 0x7a4a2a), C(x, 1.3, 0.25, 0.08, 0.6, 0.06, BLACK), C(x, 1.62, 0.25, 0.1, 0.12, 0.06, 0x7a4a2a), bar(x, 0, 0.25, x, 0.15, 0.25, 0.02, chrome), C(x, 0.75, -0.3, 0.38, 0.05, 0.38, BLACK), bar(x, 0, -0.3, x, 0.72, -0.3, 0.04, chrome)]),
  ], "real", "Contrabajo 3/4 (1,8 m) y taburete de contrabajista (75 cm)"),
  pz("mus-percusion", "maquina", "musica-orquesta", "Marimba de concierto, bombo sinfónico y platos de choque", 0x6b3a2a, [
    C(0, 0.85, 0.2, 2.4, 0.06, 0.9, 0x6b3a2a), ...rep(20, (i) => [C(-1.1 + i * 0.115, 0.89, 0.2, 0.09, 0.03, 0.4 + 0.4 * (1 - i / 20), 0x9a5a3a)]), ...rep(10, (i) => [C(-1.1 + i * 0.23, 0.45, 0.45, 0.06, 0.8, 0.06, chrome)]),
    C(1.9, 0.85, 0.3, 0.9, 0.9, 0.5, 0xd8d0c0), C(1.9, 0.3, 0.3, 0.6, 0.6, 0.6, BLACK), C(-1.85, 0.9, 0.3, 0.5, 0.02, 0.5, CYMBAL),
  ], "real", "Marimba Adams Alpha (4,3 octavas, 2,4 m), bombo de concierto 36″ y platos de choque de 18″"),
  pz("mus-taquillas", "mueble", "musica", "Taquillas de instrumentos (6 cuerpos)", 0x5a6070, rep(6, (i) => [C(-1.5 + i * 0.6, 0.9, 0, 0.58, 1.8, 0.6, 0x5a6070), C(-1.5 + i * 0.6, 0.9, -0.305, 0.5, 1.7, 0.01, 0x6a7080), C(-1.3 + i * 0.6, 0.95, -0.31, 0.03, 0.12, 0.02, chrome)]), "real", "Taquillas de instrumentos Wenger (60 × 60 × 180 cm por cuerpo)"),
  pz("mus-estanteria-partituras", "mueble", "musica", "Archivo de partituras", wood, bookcase(0, 0, 2.4), "real", "Archivo de partituras de orquesta (estantería de 2,4 m)"),

  // ── Music: the recital hall (stage, PA, front-of-house, raked seating) ──
  pz("mus-escenario", "maquina", "musica-auditorio", "Escenario de 12 × 6 m (80 cm) con su escalera, monitores de suelo y torres de luz", 0x2a2628, [
    C(0, 0.4, 0, 12, 0.8, 6, 0x2a2628), C(0, 0.81, 0, 11.8, 0.02, 5.8, 0x6b4a32), C(-5, 0.2, -3.4, 1.4, 0.4, 0.8, 0x2a2628), // steps
    ...[-3, 0, 3].flatMap((x) => [C(x, 0.95, -2.4, 0.5, 0.28, 0.4, BLACK)]), // wedges
    ...[-5.6, 5.6].flatMap((x) => [bar(x, 0.8, 2.6, x, 5.5, 2.6, 0.3, 0x55585e), bar(x, 0.8, -2.6, x, 5.5, -2.6, 0.3, 0x55585e)]),
    bar(-5.6, 5.5, -2.6, 5.6, 5.5, -2.6, 0.3, 0x55585e), bar(-5.6, 5.5, 2.6, 5.6, 5.5, 2.6, 0.3, 0x55585e),
    ...rep(6, (i) => [C(-4.5 + i * 1.8, 5.2, -2.6, 0.3, 0.35, 0.3, BLACK)]),
    C(0, 3.2, 2.95, 12, 4.8, 0.06, 0x1a1a1e), // the black backdrop
  ], "real", "Escenario modular de 80 cm (Prolyte StageDex), monitores de suelo d&b M4 y truss cuadrado de 30 cm con focos LED"),
  pz("mus-line-array", "mueble", "musica-auditorio", "Torre de sonido: line array sobre su torre y subgrave", BLACK, [C(0, 0.35, 0, 0.9, 0.7, 0.8, BLACK), bar(0, 0.7, 0, 0, 4.6, 0, 0.12, 0x55585e), ...rep(6, (i) => [C(0, 4.5 - i * 0.28, -0.02 - i * 0.015, 0.7, 0.26, 0.5, BLACK)])], "real", "d&b Y-Series (6 cajas) sobre torre y subgrave Y-SUB"),
  pz("mus-control-sala", "maquina", "musica-auditorio", "Control de sala: mesa de mezclas digital y de luces en su tarima", 0x2a2a2e, [
    C(0, 0.15, 0, 3.0, 0.3, 2.0, 0x2a2a2e), C(0, 0.75, 0.2, 2.6, 0.9, 0.8, 0x3a3a40), C(-0.6, 1.25, 0.15, 1.2, 0.1, 0.7, 0x2a2a2e), ...rep(16, (i) => [C(-1.1 + i * 0.065, 1.31, 0.1, 0.03, 0.02, 0.5, 0xc8c8c8)]), C(-0.6, 1.5, 0.45, 0.6, 0.35, 0.03, screen),
    C(0.8, 1.25, 0.15, 0.8, 0.1, 0.5, 0x2a2a2e), C(0.8, 1.45, 0.4, 0.4, 0.28, 0.03, screen), C(0, 0.6, -0.95, 3.0, 0.6, 0.05, darkSteel),
    ...[-0.6, 0.8].flatMap((x) => [C(x, 0.75, -0.5, 0.45, 0.06, 0.45, BLACK), bar(x, 0.3, -0.5, x, 0.72, -0.5, 0.04, chrome)]),
  ], "real", "Yamaha CL5 (sonido) y grandMA3 compact (luces) en tarima de 30 cm"),
  pz("mus-graderio", "mueble", "musica-auditorio", "Gradas de 6 filas de 10 butacas (escalón de 30 cm)", SEAT, [
    ...rep(6, (r) => [C(0, (0.3 + r * 0.3) / 2, -r * 1.0, 8, 0.3 + r * 0.3, 1.0, 0x5a4a3e)]),
    ...rep(6, (r) => rep(10, (s) => [C(-3.15 + s * 0.7, 0.3 + r * 0.3 + 0.23, -r * 1.0 - 0.05, 0.55, 0.08, 0.5, SEAT), C(-3.15 + s * 0.7, 0.3 + r * 0.3 + 0.55, -r * 1.0 - 0.32, 0.55, 0.6, 0.06, SEAT)])),
    ...rep(6, (r) => [C(3.75, 0.3 + r * 0.3 + 0.01, -r * 1.0, 0.5, 0.02, 1.0, 0x8a7a6a)]),
  ], "real", "Butacas de auditorio (Figueras, 55 cm, paso de 1 m entre filas) sobre gradas de 30 cm; pasillo lateral"),

  // ── Classrooms: what every classroom has ──
  pz("aula-pupitre", "mueble", "aula", "Pupitre individual con su silla", oak, desk(0, 0), "real", "Pupitre escolar UNE-EN 1729 (talla 6: mesa 70 × 50 a 76 cm, silla a 46 cm)"),
  pz("aula-pupitres-24", "mueble", "aula", "24 pupitres individuales con su silla (4 filas de 6)", oak, rep(4, (r) => rep(6, (c) => desk(-2.9 + c * 1.04 + (c >= 3 ? 0.7 : 0), -r * 1.5))), "real", "Pupitre escolar UNE-EN 1729 (talla 6: mesa 70 × 50 a 76 cm, silla a 46 cm); filas a 1,5 m y pasillo central de 1,4 m (la puerta da a él)"),
  pz("aula-pared-pizarra", "mueble", "aula", "Pared frontal: pizarra blanca, pantalla del proyector y reloj (8 m)", 0xe8e4da, [
    wall(8), C(-1.2, 1.5, -0.01, 3.6, 1.2, 0.03, BOARD), C(-1.2, 0.88, -0.06, 3.6, 0.04, 0.1, 0x9a9a9a), C(2.4, 1.6, -0.02, 2.0, 1.25, 0.02, white), C(0, 2.55, -0.01, 0.3, 0.3, 0.03, white),
  ], "real", "Pizarra blanca de 360 × 120 cm a 90 cm del suelo y pantalla de 2 m (aulas tipo, guía del Ministerio de Educación)"),
  pz("aula-mesa-profesor", "maquina", "aula", "Mesa del profesor con su silla y portátil", oak, [C(0, 0.75, 0, 1.6, 0.04, 0.8, oak), C(-0.7, 0.37, 0, 0.1, 0.74, 0.75, oak), C(0.5, 0.37, 0, 0.5, 0.74, 0.75, oak), C(-0.2, 0.88, 0.05, 0.34, 0.22, 0.01, screen), C(-0.2, 0.78, -0.05, 0.34, 0.02, 0.24, darkSteel), ...chair(0, -0.65)], "real", "Mesa de profesor de 160 × 80 cm con cajonera"),
  pz("aula-armario", "mueble", "aula", "Armario de material y perchero", oak, [C(-0.6, 1.0, 0, 1.0, 2.0, 0.5, oak), C(-0.6, 1.0, -0.255, 0.02, 1.9, 0.01, 0x7a5a3a), C(0.55, 0.9, 0.15, 0.9, 0.05, 0.05, chrome), ...rep(5, (i) => [C(0.2 + i * 0.18, 1.55, 0.05, 0.03, 0.1, 0.1, chrome)])], "real", "Armario de aula (100 × 50 × 200 cm) y perchero de 5 ganchos"),

  // Mathematics
  pz("mat-material", "maquina", "aula-matematicas", "Mesa de material de matemáticas: ábacos, geoplanos, regletas, balanza y cuerpos geométricos", oak, [
    C(0, 0.75, 0, 2.0, 0.04, 0.9, oak), ...[-0.9, 0.9].map((x) => C(x, 0.37, 0, 0.06, 0.74, 0.8, iron)),
    ...rep(2, (i) => [C(-0.7 + i * 0.35, 0.88, -0.1, 0.3, 0.22, 0.04, wood), ...rep(5, (r) => [C(-0.7 + i * 0.35, 0.8 + r * 0.04, -0.1, 0.28, 0.006, 0.006, 0x888888)])]),
    C(0.05, 0.78, 0.15, 0.3, 0.02, 0.3, 0xd8c8a0), ...rep(4, (i) => [C(0.4 + i * 0.06, 0.8 + i * 0.01, -0.2, 0.05, 0.03 + i * 0.01, 0.05, [0xc04040, 0x40a040, 0x4060c0, 0xd0b030][i])]),
    C(0.65, 0.85, 0.15, 0.4, 0.15, 0.1, steel), C(0.5, 0.95, 0.15, 0.12, 0.02, 0.12, steel), C(0.8, 0.95, 0.15, 0.12, 0.02, 0.12, steel),
  ], "real", "Material manipulativo de matemáticas: ábaco, geoplano, regletas Cuisenaire y balanza de platillos"),
  pz("mat-estante-poliedros", "mueble", "aula-matematicas", "Vitrina de poliedros y cuerpos de revolución", glass, [
    C(0, 0.9, 0, 1.6, 1.8, 0.45, 0xd8d8d0), C(0, 0.9, -0.23, 1.5, 1.7, 0.01, glass), ...rep(3, (r) => [C(0, 0.4 + r * 0.5, 0, 1.5, 0.02, 0.4, 0xd8d8d0), ...rep(4, (c) => [C(-0.55 + c * 0.37, 0.52 + r * 0.5, 0, 0.18, 0.2 - (c % 2) * 0.05, 0.18, [0xc04040, 0x40a040, 0x4060c0, 0xd0b030, 0x9050b0][(r + c) % 5])])]),
  ], "real", "Los cinco sólidos platónicos, prismas, pirámides, cilindro, cono y esfera de madera"),
  pz("mat-mural", "mueble", "aula-matematicas", "Mural de la recta numérica y del teorema de Pitágoras (4 m)", white, [C(0, 1.5, 0, 4, 1.0, 0.02, white), C(0, 1.3, -0.012, 3.8, 0.02, 0.005, 0x222222), ...rep(11, (i) => [C(-1.8 + i * 0.36, 1.3, -0.012, 0.01, 0.08, 0.005, 0x222222)]), C(1.2, 1.7, -0.012, 0.3, 0.3, 0.005, 0xc04040), C(1.5, 1.75, -0.012, 0.4, 0.4, 0.005, 0x4060c0), C(1.4, 1.5, -0.012, 0.5, 0.02, 0.005, 0x222222)], "real", "Recta numérica y la demostración de Pitágoras por áreas (Euclides, Elementos I.47)"),

  // Language and literature
  pz("len-rincon-lectura", "mueble", "aula-lengua", "Rincón de lectura: alfombra, pufs y expositor de libros", 0x8a5a3a, [
    C(0, 0.01, 0, 3.0, 0.02, 2.4, 0x8a5a3a), ...[[-0.9, -0.4], [0, 0.3], [0.9, -0.4]].map(([x, z]) => C(x!, 0.22, z!, 0.7, 0.44, 0.7, [0xc06040, 0x4080a0, 0x80a040][Math.round(x! + 1)])),
    C(0, 0.6, 1.1, 2.4, 1.2, 0.3, wood), ...rep(3, (r) => rep(8, (b) => [C(-1.05 + b * 0.3, 0.3 + r * 0.35, 1.0, 0.22, 0.28, 0.02, BOOK[(r + b) % 5])])),
  ], "real", "Biblioteca de aula con expositor frontal (IFLA, Directrices para bibliotecas escolares, 2015)"),
  pz("len-biblioteca", "mueble", "aula-lengua", "Biblioteca de aula (3 m)", wood, bookcase(0, 0, 3), "real", "Estantería de biblioteca escolar (300 × 35 × 200 cm)"),
  pz("len-mural", "mueble", "aula-lengua", "Mural de autores y del alfabeto (4 m)", white, [C(0, 1.6, 0, 4, 1.0, 0.02, white), ...rep(6, (i) => [C(-1.6 + i * 0.64, 1.7, -0.012, 0.45, 0.55, 0.005, [0xd8c8a0, 0xc0d0e0, 0xe0c8c0][i % 3])]), C(0, 1.2, -0.012, 3.8, 0.12, 0.005, 0x2a4a7a)], "real", "Retratos de Cervantes, Sor Juana Inés de la Cruz, García Márquez, Mistral, Neruda y Borges"),

  // Natural sciences (school laboratory)
  pz("cie-mesa-laboratorio", "maquina", "aula-ciencias", "Mesa de laboratorio escolar (4 plazas) con fregadero, gas y taburetes", 0x2a2f36, [
    C(0, 0.9, 0, 2.4, 0.04, 1.2, 0x2a2f36), C(0, 0.45, 0, 2.3, 0.86, 1.1, 0xd8d4c8), C(0, 0.89, 0, 0.5, 0.05, 0.4, steel), bar(0, 0.9, 0.15, 0, 1.25, 0.15, 0.025, chrome), bar(0, 1.25, 0.15, 0, 1.2, -0.05, 0.02, chrome),
    ...[-0.8, 0.8].map((x) => C(x, 0.95, 0.5, 0.06, 0.06, 0.06, 0xd0b030)), C(-0.7, 0.98, -0.2, 0.08, 0.12, 0.08, glass), C(0.7, 0.98, -0.25, 0.1, 0.1, 0.1, glass), C(-0.4, 0.95, 0, 0.18, 0.06, 0.12, 0x333333),
    ...[-0.75, 0.75].flatMap((x) => [-1, 1].flatMap((s) => [C(x, 0.62, s * 0.85, 0.36, 0.04, 0.36, 0x2a2f36), bar(x, 0, s * 0.85, x, 0.6, s * 0.85, 0.03, chrome)])),
  ], "real", "Mesa de laboratorio escolar de resina fenólica (240 × 120 × 90 cm) con fregadero, llave de gas y taburetes"),
  pz("cie-mesa-demostracion", "maquina", "aula-ciencias", "Mesa de demostración del profesor con vitrina de gases", 0x2a2f36, [
    C(0, 0.9, 0, 3.0, 0.04, 0.9, 0x2a2f36), C(0, 0.45, 0, 2.9, 0.86, 0.8, 0xd8d4c8), C(-1.1, 0.89, 0, 0.4, 0.05, 0.35, steel), bar(-1.1, 0.9, 0.2, -1.1, 1.25, 0.2, 0.025, chrome),
    C(0.8, 1.6, 0.1, 1.2, 1.4, 0.7, 0xe0e0dc), C(0.8, 1.5, -0.26, 1.1, 0.8, 0.02, glass), C(0.8, 2.35, 0.1, 0.3, 0.3, 0.3, 0xe0e0dc),
    C(-0.2, 1.0, 0, 0.3, 0.2, 0.2, 0xe8e8e8), C(-0.2, 1.15, 0, 0.06, 0.12, 0.06, BLACK),
  ], "real", "Mesa de demostración (300 × 90 cm) y vitrina de gases de sobremesa (UNE-EN 14175)"),
  pz("cie-vitrina", "mueble", "aula-ciencias", "Vitrina de ciencias: rocas, fósiles, especímenes y tabla periódica", glass, [
    C(0, 1.0, 0, 2.0, 2.0, 0.45, 0xd8d8d0), C(0, 1.0, -0.23, 1.9, 1.9, 0.01, glass), ...rep(3, (r) => [C(0, 0.5 + r * 0.55, 0, 1.9, 0.02, 0.4, 0xd8d8d0), ...rep(5, (c) => [C(-0.75 + c * 0.38, 0.6 + r * 0.55, 0, 0.16, 0.16, 0.16, [0x8a7a6a, 0x5a6a4a, 0xc0a080, 0x6a5a8a, 0xa06040][(r + c) % 5])])]),
    C(0, 2.4, 0.2, 2.0, 0.7, 0.02, white), ...rep(18, (i) => [C(-0.9 + i * 0.106, 2.55, 0.185, 0.09, 0.09, 0.005, [0xc06060, 0x60a0c0, 0xd0c060][i % 3])]),
  ], "real", "Colección escolar de minerales y fósiles; tabla periódica de la IUPAC (118 elementos)"),
  pz("cie-esqueleto", "maquina", "aula-ciencias", "Esqueleto humano de tamaño real en su soporte, y modelo de torso", 0xece4d0, [
    C(0, 0.03, 0, 0.5, 0.06, 0.5, darkSteel), bar(0, 0.06, 0.15, 0, 1.75, 0.15, 0.02, chrome), C(0, 1.62, 0.05, 0.17, 0.22, 0.2, 0xece4d0), C(0, 1.3, 0.05, 0.3, 0.32, 0.18, 0xece4d0), C(0, 1.0, 0.05, 0.06, 0.3, 0.06, 0xece4d0), C(0, 0.9, 0.05, 0.3, 0.15, 0.15, 0xece4d0),
    ...[-1, 1].flatMap((s) => [C(s * 0.09, 0.5, 0.05, 0.04, 0.78, 0.04, 0xece4d0), C(s * 0.22, 1.15, 0.05, 0.03, 0.55, 0.03, 0xece4d0)]),
    C(0.6, 0.6, 0, 0.4, 1.2, 0.4, 0xd8d8d0), C(0.6, 1.4, 0, 0.3, 0.4, 0.2, 0xd8a090),
  ], "real", "Esqueleto humano de 170 cm (3B Scientific A10) y torso anatómico"),
  pz("cie-lavaojos", "mueble", "aula-ciencias", "Lavaojos y ducha de seguridad", 0x3a9a5a, [C(0, 0.45, 0, 0.3, 0.9, 0.3, 0x3a9a5a), C(0, 0.95, -0.05, 0.4, 0.1, 0.3, 0x3a9a5a), bar(0.25, 0, 0.1, 0.25, 2.3, 0.1, 0.05, 0xd0b030), C(0.25, 2.25, -0.2, 0.3, 0.06, 0.3, 0xd0b030), C(0, 1.6, 0.12, 0.3, 0.3, 0.01, 0x3a9a5a)], "real", "Ducha y lavaojos de emergencia (ANSI Z358.1)"),

  // History and geography
  pz("his-globo", "maquina", "aula-historia", "Globo terráqueo de pie (60 cm)", 0x3a6a9a, [C(0, 0.03, 0, 0.6, 0.06, 0.6, wood), bar(0, 0.06, 0, 0, 0.7, 0, 0.05, wood), C(0, 1.05, 0, 0.6, 0.6, 0.6, 0x3a6a9a), C(0.1, 1.1, -0.2, 0.25, 0.3, 0.25, 0x6a9a4a), C(0, 1.05, 0, 0.66, 0.66, 0.02, BRASS)], "real", "Globo terráqueo de 60 cm con meridiano de latón (Columbus)"),
  pz("his-mapa-mural", "mueble", "aula-historia", "Mapamundi físico y político enrollable (2,4 m)", white, [C(0, 1.6, 0, 2.4, 1.6, 0.02, 0x5a8ab0), ...rep(6, (i) => [C(-0.9 + (i % 3) * 0.9, 1.4 + Math.floor(i / 3) * 0.5, -0.012, 0.5, 0.35, 0.005, [0x8ab060, 0xc0a060, 0x9ab070][i % 3])]), C(0, 2.42, 0, 2.5, 0.06, 0.06, wood)], "real", "Mapamundi mural de 240 × 160 cm (proyección de Robinson)"),
  pz("his-vitrina", "maquina", "aula-historia", "Vitrina de objetos del mundo: ábaco, astrolabio, quipu, esfera armilar y ánfora", glass, [
    C(0, 0.45, 0, 2.0, 0.9, 0.6, wood), C(0, 1.1, 0, 2.0, 0.4, 0.6, glass), C(-0.7, 0.98, 0, 0.3, 0.2, 0.05, wood), C(-0.25, 0.98, 0, 0.22, 0.22, 0.02, BRASS), C(0.2, 0.95, 0, 0.3, 0.02, 0.2, 0xc0a060), ...rep(6, (i) => [C(0.1 + i * 0.04, 0.92, 0, 0.01, 0.1, 0.01, [0xc04040, 0x40a040, 0xd0b030][i % 3])]),
    C(0.6, 1.0, 0, 0.22, 0.22, 0.22, 0xb08d57), C(0.6, 1.0, 0, 0.24, 0.02, 0.24, BRASS), C(0.85, 1.0, 0, 0.14, 0.3, 0.14, 0xb06040),
  ], "real", "Réplicas: suanpan (China), astrolabio andalusí, quipu inca, esfera armilar griega y ánfora romana"),
  pz("his-linea-tiempo", "mueble", "aula-historia", "Línea del tiempo de la humanidad (6 m)", white, [C(0, 1.6, 0, 6, 0.8, 0.02, 0xf0e8d8), C(0, 1.5, -0.012, 5.8, 0.04, 0.005, 0x2a2a2a), ...rep(8, (i) => [C(-2.6 + i * 0.74, 1.75, -0.012, 0.5, 0.3, 0.005, [0xc08060, 0x80a0c0, 0xa0c080, 0xc0b060][i % 4])])], "real", "De Göbekli Tepe (9600 a. C.) a la Estación Espacial Internacional"),

  // Languages (language lab)
  pz("idi-cabinas", "maquina", "aula-idiomas", "Laboratorio de idiomas: 6 puestos con separadores, auriculares con micrófono y pantalla", 0x4a5a6a, [
    C(0, 0.74, 0, 4.8, 0.04, 0.7, 0x4a5a6a), ...rep(7, (i) => [C(-2.4 + i * 0.8, 1.0, 0.05, 0.03, 0.5, 0.6, 0x8a9aaa)]), ...rep(6, (i) => [C(-2 + i * 0.8, 1.0, 0.25, 0.4, 0.28, 0.03, screen), C(-2 + i * 0.8 + 0.25, 0.8, -0.1, 0.18, 0.06, 0.12, BLACK), ...chair(-2 + i * 0.8, -0.6)]),
    ...[-2.35, 2.35].map((x) => C(x, 0.37, 0, 0.06, 0.74, 0.65, 0x4a5a6a)),
  ], "real", "Laboratorio de idiomas digital (Sanako Study 1200): puesto con auriculares de diadema y micrófono"),
  pz("idi-mural", "mueble", "aula-idiomas", "Mural de las lenguas del santuario (4 m)", white, [C(0, 1.6, 0, 4, 1.0, 0.02, white), ...rep(8, (i) => [C(-1.6 + (i % 4) * 1.07, 1.4 + Math.floor(i / 4) * 0.45, -0.012, 0.8, 0.3, 0.005, [0xc04040, 0x4060c0, 0xd0b030, 0x40a040][i % 4])])], "real", "«Hola» en español, inglés, quechua, náhuatl, hindi, chino, árabe e inuktitut"),

  // Art and drawing
  pz("art-caballetes", "maquina", "aula-arte", "Tres caballetes de estudio con su lienzo y taburete", wood, rep(3, (i) => {
    const x = -1.3 + i * 1.3;
    return [bar(x - 0.25, 0, 0.1, x, 1.9, 0.25, 0.04, wood), bar(x + 0.25, 0, 0.1, x, 1.9, 0.25, 0.04, wood), bar(x, 0, 0.6, x, 1.8, 0.28, 0.04, wood), C(x, 0.8, 0.15, 0.6, 0.04, 0.08, wood), C(x, 1.2, 0.17, 0.6, 0.75, 0.03, [0xf4f0e6, 0xe8f0f4, 0xf4e8e0][i]), C(x + 0.1, 1.25, 0.15, 0.25, 0.2, 0.005, [0x4a8ac0, 0xc06040, 0x6aa04a][i]), C(x, 0.6, -0.55, 0.35, 0.04, 0.35, wood), bar(x, 0, -0.55, x, 0.58, -0.55, 0.04, chrome)];
  }), "real", "Caballete de estudio en H (Mabef M/18, 190 cm) y taburete de pintor"),
  pz("art-mesas-dibujo", "maquina", "aula-arte", "Dos mesas de dibujo inclinables con sus taburetes", 0xe0d8c8, rep(2, (i) => {
    const x = -0.75 + i * 1.5;
    return [C(x, 0.95, 0.05, 1.2, 0.03, 0.8, 0xe0d8c8), bar(x - 0.5, 0, 0.1, x - 0.5, 0.92, 0.1, 0.04, iron), bar(x + 0.5, 0, 0.1, x + 0.5, 0.92, 0.1, 0.04, iron), C(x - 0.2, 0.97, 0.05, 0.42, 0.005, 0.3, white), C(x + 0.3, 0.98, -0.1, 0.25, 0.02, 0.04, darkSteel), C(x, 0.65, -0.6, 0.35, 0.04, 0.35, BLACK), bar(x, 0, -0.6, x, 0.63, -0.6, 0.04, chrome)];
  }), "real", "Mesa de dibujo técnico de 120 × 80 cm, tablero inclinable, con escuadra y cartabón"),
  pz("art-fregadero", "maquina", "aula-arte", "Fregadero de taller con escurridor de pinceles y secadero de láminas", steel, [C(0, 0.45, 0, 1.6, 0.9, 0.6, 0xd8d4c8), C(0, 0.9, 0, 1.6, 0.04, 0.6, steel), C(-0.35, 0.88, 0, 0.6, 0.05, 0.45, darkSteel), bar(-0.35, 0.9, 0.25, -0.35, 1.25, 0.25, 0.025, chrome), C(0.45, 1.0, 0, 0.4, 0.15, 0.3, 0x8a8a8a),
    C(1.4, 0.9, 0.1, 0.7, 1.8, 0.5, darkSteel), ...rep(12, (i) => [C(1.4, 0.2 + i * 0.13, 0.1, 0.62, 0.005, 0.45, i % 2 ? white : 0xe8e4d8)])], "real", "Fregadero de taller con decantador de pintura y secadero de 25 bandejas"),
  pz("art-ceramica", "maquina", "aula-arte", "Torno de alfarero y horno cerámico eléctrico", 0x8a8a8a, [
    C(-0.6, 0.3, 0, 0.6, 0.6, 0.6, 0x5a5a60), C(-0.6, 0.62, 0, 0.36, 0.04, 0.36, 0x8a8a8a), C(-0.6, 0.72, 0, 0.18, 0.15, 0.18, 0xa06a4a), C(-0.6, 0.45, -0.6, 0.35, 0.04, 0.35, wood), bar(-0.6, 0, -0.6, -0.6, 0.43, -0.6, 0.04, chrome),
    C(0.6, 0.45, 0.1, 0.75, 0.9, 0.75, 0x8a8a8a), C(0.6, 0.91, 0.1, 0.65, 0.04, 0.65, darkSteel), C(0.6, 0.6, -0.27, 0.2, 0.12, 0.01, BLACK),
  ], "real", "Torno eléctrico Shimpo VL-Whisper y horno de 100 L (Skutt KM-1027, 1287 °C)"),
  pz("art-estanteria", "mueble", "aula-arte", "Estantería de materiales: pinturas, papeles, arcilla y trabajos", wood, [C(0, 1.0, 0, 2.4, 2.0, 0.45, wood), ...rep(4, (r) => rep(8, (c) => [C(-1.05 + c * 0.3, 0.25 + r * 0.45, 0, 0.22, 0.2, 0.3, [0xc04040, 0x4060c0, 0xd0b030, 0x40a040, 0xe0e0e0, 0xa06a4a][(r * 3 + c) % 6])]))], "real", "Estantería de material de plástica (240 × 45 × 200 cm)"),
];

/** Each room's floor finish, its plan's size (floors/musica-aulas.ts): sprung wood for music, linoleum for classrooms. */
const FINISH: readonly (readonly [string, number, number, number, string])[] = [
  ["musica-auditorio", 22, 26, 0x6b4a32, "Tarima de roble"],
  ["musica-ensayo", 10, 10, 0x3a3f4a, "Moqueta acústica"],
  ["musica-estudio", 16, 13, 0x8a6a4a, "Tarima flotante"],
  ["musica-cabinas", 14, 10, 0x8a8f96, "Linóleo"],
  ["musica-orquesta", 19, 16, 0x9a7a52, "Tarima de roble"],
  ["aula-matematicas", 12, 11, 0xa8b4a0, "Linóleo"],
  ["aula-lengua", 12, 11, 0xb4a890, "Linóleo"],
  ["aula-ciencias", 13, 13, 0x9aa4ac, "Suelo vinílico de laboratorio"],
  ["aula-historia", 12, 12, 0xb4a084, "Linóleo"],
  ["aula-idiomas", 12, 12, 0x8a9aac, "Linóleo"],
  ["aula-arte", 13, 12, 0xa0a0a0, "Hormigón pulido"],
  ["aula-estudio", 20, 16, 0xb89973, "Tarima de madera"],
  ["dojo-karate", 14, 13, 0x9a7a52, "Tarima de madera"],
  ["dojo-kickboxing", 16, 13, 0x4a4f57, "Suelo de caucho"],
  ["dojo-mma", 15, 13, 0x4a4f57, "Suelo de caucho"],
  ["dojo-judo", 15, 15, 0x9a7a52, "Tarima de madera"],
  ["ballet-grande", 15, 12, 0x3a3a3e, "Suelo flotante con vinilo de danza"],
  ["ballet-pequeno", 12, 10, 0x3a3a3e, "Suelo flotante con vinilo de danza"],
];
/**
 * The martial arts rooms' own kit (Berón 2026-11-20: «el piso de artes marciales también se puede dividir en pisos
 * pequeños y realistas»): the judo tatami (IJF: contest area of 8 × 8 m inside a 3 m safety area, here a club's 10 × 10
 * with 1 m of safety), the kamiza shelf of a traditional dojo, the mirror wall, the speed-bag platform and a bench.
 */
const DOJO_KIT: readonly ModelDef[] = [
  pz("dojo-tatami-judo", "mueble", "dojo", "Tatami de judo (10 × 10 m: zona de combate de 8 × 8 y seguridad)", 0x3f7f4a, [C(0, 0.025, 0, 10, 0.05, 10, 0x3f7f4a), C(0, 0.03, 0, 8, 0.051, 8, 0xd9b84a)], "real", "IJF Sport and Organisation Rules: zona de combate de 8 × 8 m como mínimo, tatamis de 1 × 2 m y 4–5 cm"),
  pz("dojo-tatami-grappling", "mueble", "dojo", "Tapiz de grappling (6 × 6 m)", 0x26262a, [C(0, 0.025, 0, 6, 0.05, 6, 0x26262a), C(0, 0.03, 0, 5.6, 0.051, 5.6, 0x3a3f4a)], "real", "Tapices de lucha de 4 cm en rollos (UWW: círculo de 9 m; aquí el de un club)"),
  pz("dojo-kamiza", "mueble", "dojo", "Kamiza (estante de honor del dojo)", 0x6b4a32, [C(0, 1.5, 0, 1.6, 0.06, 0.4), C(0, 1.62, 0, 0.5, 0.2, 0.3, 0xe8dcc4), C(-0.55, 1.6, 0, 0.12, 0.16, 0.12, 0x3f7f4a), C(0.55, 1.6, 0, 0.12, 0.16, 0.12, 0x3f7f4a), C(0, 2.05, 0.18, 0.6, 0.4, 0.02, 0xf2efe6), C(0, 2.05, 0.17, 0.4, 0.3, 0.01, 0x222222)], "real", "Kamiza o shomen: estante con caligrafía en la pared principal del dojo"),
  pz("dojo-espejo", "mueble", "dojo", "Pared de espejo (6 m)", 0xd9e6ee, [C(0, 1.25, 0, 6, 2.1, 0.04, 0xd9e6ee), C(0, 0.12, -0.02, 6, 0.24, 0.06, 0x6b4a32)], "real", "Espejos de sala de entrenamiento (2 m de alto desde 0,2 m)"),
  pz("dojo-pera", "maquina", "dojo", "Plataforma de pera loca (speed bag)", 0x26262a, [C(0, 2.1, -0.3, 0.7, 0.06, 0.7, 0x6b4a32), C(0, 1.2, 0.02, 0.1, 2.4, 0.06, 0x26262a), C(0, 1.88, -0.3, 0.2, 0.3, 0.2, 0x8c1f1f)], "real", "Speed bag de 23 cm bajo plataforma regulable"),
  pz("dojo-banco", "mueble", "dojo", "Banco (2 m)", 0x9e7a52, [C(0, 0.44, 0, 2, 0.05, 0.35), C(-0.85, 0.22, 0, 0.06, 0.44, 0.3), C(0.85, 0.22, 0, 0.06, 0.44, 0.3)], "real", "Banco de vestuario"),
];

/**
 * The ballet studios' own kit (Berón 2026-11-20: «se debe rehacer un piso real de ballet, se puede dividir en pisos
 * pequeños»): the mirror wall with its double barre (Sport England, Studios for Dance: mirrors 2 m high from ~0,3 m;
 * barres of 38–50 mm at ~0,86 and ~1,07 m, 0,35–0,4 m off the wall) and a freestanding barre in use.
 */
const BALLET_KIT: readonly ModelDef[] = [
  pz("ballet-espejo-barra", "mueble", "ballet", "Pared de espejo con barra doble (6 m)", oak, [
    C(0, 1.3, 0, 6, 2, 0.04, 0xd9e6ee),
    C(0, 0.12, -0.02, 6, 0.24, 0.06, 0x6b4a32),
    ...[-2.7, -0.9, 0.9, 2.7].flatMap((x) => [C(x, 0.97, -0.2, 0.05, 0.3, 0.4, darkSteel)]),
    C(0, 0.86, -0.38, 6, 0.045, 0.045, oak),
    C(0, 1.07, -0.38, 6, 0.045, 0.045, oak),
  ], "real", "Sport England, Studios for Dance (2016): espejos de 2 m desde 0,3 m; barras a 0,86 y 1,07 m, a 0,38 m de la pared"),
  pz("ballet-barra-portatil", "mueble", "ballet", "Barra portátil doble (2,4 m)", oak, [
    ...[-1.1, 1.1].flatMap((x) => [C(x, 0.55, 0, 0.05, 1.1, 0.05, darkSteel), C(x, 0.02, 0, 0.08, 0.04, 0.7, darkSteel)]),
    C(0, 0.86, 0, 2.4, 0.045, 0.045, oak),
    C(0, 1.07, 0, 2.4, 0.045, 0.045, oak),
  ], "real", "Barras portátiles de danza en A (2,4 m, dos alturas)"),
];

export const FLOOR_FINISH_MODELS: readonly ModelDef[] = FINISH.map(([id, x, z, c, what]) => m(`suelo-${id}`, "mueble", "suelos", `${what} (${x} × ${z} m)`, x - 0.2, 0.02, z - 0.2, c, "caja", "real", "Acabados de suelo de salas de música, aulas, dojos y estudios de ballet"));

/** The ids, for the floor plans and the tests. */
export const MUSIC_ROOM_GROUPS = ["musica-banda", "musica-estudio", "musica-practica", "musica-orquesta", "musica-auditorio"] as const;

export const MUSICA_AULAS_MODELS: readonly ModelDef[] = [...ROOMS, ...DOJO_KIT, ...BALLET_KIT, ...FLOOR_FINISH_MODELS];
