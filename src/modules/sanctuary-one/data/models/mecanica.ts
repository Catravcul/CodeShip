import { C, COL, bar, pz, rep, type ModelDef, type Part } from "./kit";
import { shelves } from "./produccion";

/**
 * The vehicle workshop (Mecánica). Cold Sanctuary names it — SanctuaryAreaType.cs `VehicleWorkshop // Taller / Mecánica
 * — tractor, boat, submarine maintenance` and docs/world-simulation.md «Taller. Tractor, barco, submarino» — but leaves
 * its floor empty (only its toilets). Here it is a real workshop for those three: a two-post lift with the compact
 * tractor, the work submarine on its maintenance cradle, the workboat on its trailer, and the equipment every
 * agricultural / marine workshop has (engine crane and stand, parts washer, tyre changer and balancer, workbench and
 * tool cabinets, MIG welder and screen, compressor, 20 t press, waste-oil drain, battery charger, racking, safety
 * point). Sizes are those of common models of each kind; the layout is ours. Front towards −z.
 */
const { steel, darkSteel, white, glass, red, chrome, rubber, iron, acc, wood, screen } = COL;
const SRC = "Cold Sanctuary, Assets/Scripts/World/SanctuaryAreaType.cs VehicleWorkshop (tractor, barco, submarino) y docs/world-simulation.md; equipo de taller real (medidas de modelos comunes); distribución nuestra";
const LIFT = 0x3a6fb0;
const TRACTOR = 0x3a7a3a;
const SUB = 0xe0a81c;
const HULL = 0xb8bec6;
const M = (id: string, label: string, color: number, parts: readonly Part[]): ModelDef => pz(id, "maquina", "mecanica", label, color, parts, "real", SRC);

/** A wheel standing on the floor at x, z: diameter dia, width w (axle along x). */
const wheel = (x: number, y: number, z: number, dia: number, w: number): Part[] => [C(x, y, z, w, dia, dia * 0.7, rubber), C(x, y, z, w + 0.02, dia * 0.45, dia * 0.35, acc)];

/** The compact tractor (≈ 25 kW class: 3 m long, 1,4 m track), front towards −z, its wheels' bottom at y0. */
const tractor = (y0: number): Part[] => [
  ...wheel(-0.7, y0 + 0.55, 0.75, 1.1, 0.35),
  ...wheel(0.7, y0 + 0.55, 0.75, 1.1, 0.35),
  ...wheel(-0.6, y0 + 0.33, -0.95, 0.66, 0.25),
  ...wheel(0.6, y0 + 0.33, -0.95, 0.66, 0.25),
  C(0, y0 + 0.55, 0, 0.6, 0.35, 2.4, darkSteel),
  C(0, y0 + 0.95, -0.7, 0.62, 0.6, 1.3, TRACTOR),
  C(0, y0 + 1.2, -1.36, 0.5, 0.2, 0.04, white),
  C(0, y0 + 1.1, 0.55, 1.1, 0.12, 1.0, TRACTOR),
  C(0, y0 + 1.35, 0.6, 0.45, 0.4, 0.45, rubber),
  C(0, y0 + 1.5, 0.1, 0.4, 0.06, 0.06, rubber),
  ...[-0.5, 0.5].map((x) => C(x, y0 + 1.75, 0.95, 0.07, 1.3, 0.07, darkSteel)),
  C(0, y0 + 2.4, 0.95, 1.07, 0.07, 0.07, darkSteel),
  C(0.25, y0 + 1.6, -0.4, 0.07, 0.6, 0.07, darkSteel),
  C(0, y0 + 0.6, 1.3, 0.8, 0.12, 0.2, iron),
];

/** The work submarine as in the garage (sub-obra): hull, acrylic dome, stern thruster, side thrusters. */
const submarine = (y0: number): Part[] => [
  C(0, y0 + 0.65, 0, 1.9, 1.3, 4.6, SUB),
  C(0, y0 + 1.55, -0.6, 1.5, 1.0, 1.6, glass),
  C(0, y0 + 0.65, 2.55, 0.8, 0.8, 0.5, darkSteel),
  C(-1.1, y0 + 0.45, 0.5, 0.3, 0.3, 1.2, darkSteel),
  C(1.1, y0 + 0.45, 0.5, 0.3, 0.3, 1.2, darkSteel),
];

export const MECANICA_MODELS: readonly ModelDef[] = [
  M("mec-elevador-tractor", "Elevador de dos columnas (3,5 t) con el tractor compacto", LIFT, [
    // two columns 2,9 m with base plates, the overhead bar with its safety cut-out, four swing arms under the tractor's frame, the power unit
    ...[-1.65, 1.65].flatMap((x) => [C(x, 1.45, 0, 0.3, 2.9, 0.35, LIFT), C(x, 0.01, 0, 0.6, 0.02, 0.7, iron)]),
    C(0, 2.85, 0, 3.6, 0.1, 0.15, LIFT),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => bar(sx * 1.5, 0.75, 0, sx * 0.3, 0.75, sz * 0.9, 0.1, iron))),
    C(1.9, 1.2, 0, 0.2, 0.5, 0.25, darkSteel),
    ...tractor(0.5),
  ]),
  M("mec-cuna-submarino", "Cuna de mantenimiento con el submarino de obra (paneles abiertos y la batería fuera)", SUB, [
    // two saddles on beams, the submarine raised 0,6 m, an access panel off and resting on the floor, the battery pod on its cart beside
    ...[-1.4, 1.4].flatMap((z) => [C(0, 0.3, z, 1.6, 0.6, 0.3, iron), C(0, 0.62, z, 1.2, 0.06, 0.4, rubber)]),
    ...[-0.6, 0.6].map((x) => C(x, 0.05, 0, 0.12, 0.1, 3.4, iron)),
    ...submarine(0.6),
    C(0.96, 1.3, 1.0, 0.02, 0.5, 0.7, darkSteel),
    C(1.4, 0.03, 1.6, 0.5, 0.04, 0.7, SUB),
    C(1.6, 0.35, -1.2, 0.6, 0.5, 1.0, darkSteel),
    C(1.6, 0.75, -1.2, 0.5, 0.3, 0.9, 0x2a2e36),
  ]),
  M("mec-barca-remolque", "Barca de trabajo de aluminio (4,8 m) con fueraborda, en su remolque", HULL, [
    // trailer: frame, axle with two wheels, drawbar and jockey wheel; the hull with its console and the outboard tilted up
    ...[-0.55, 0.55].map((x) => C(x, 0.45, 0.3, 0.08, 0.1, 4.6, darkSteel)),
    C(0, 0.38, 0.6, 1.9, 0.08, 0.08, darkSteel),
    ...wheel(-0.95, 0.3, 0.6, 0.6, 0.2),
    ...wheel(0.95, 0.3, 0.6, 0.6, 0.2),
    C(0, 0.45, -2.5, 0.08, 0.08, 1.2, darkSteel),
    C(0, 0.2, -2.9, 0.08, 0.4, 0.08, darkSteel),
    C(0, 0.85, 0.2, 1.4, 0.5, 4.4, HULL),
    C(0, 1.1, 0.2, 1.9, 0.12, 4.6, HULL),
    C(0, 0.85, -2.2, 0.8, 0.3, 0.4, HULL),
    C(0, 1.4, -0.3, 0.5, 0.5, 0.4, white),
    C(0, 1.72, -0.4, 0.45, 0.14, 0.03, glass),
    C(0, 1.45, 2.65, 0.4, 0.5, 0.4, rubber),
    C(0, 1.05, 2.75, 0.12, 0.5, 0.12, darkSteel),
  ]),
  M("mec-grua-motor", "Grúa de taller plegable (1 t) y soporte de motor con un motor", red, [
    // engine crane: legs, mast, boom with hydraulic ram, chain and hook; beside it the engine stand holding an engine block
    ...[-0.4, 0.4].map((x) => C(x, 0.08, -0.2, 0.08, 0.1, 1.4, red)),
    C(0, 0.1, 0.45, 0.9, 0.1, 0.1, red),
    C(0, 0.9, 0.45, 0.1, 1.6, 0.1, red),
    bar(0, 1.7, 0.45, 0, 1.85, -0.75, 0.1, red),
    bar(0, 0.6, 0.45, 0, 1.4, -0.1, 0.07, darkSteel),
    C(0, 1.55, -0.75, 0.03, 0.5, 0.03, chrome),
    C(0, 1.27, -0.75, 0.06, 0.06, 0.06, iron),
    C(0.95, 0.08, 0, 0.5, 0.1, 0.8, red),
    C(0.95, 0.5, 0.25, 0.08, 0.8, 0.08, red),
    C(0.95, 0.85, -0.05, 0.4, 0.45, 0.6, iron),
  ]),
  M("mec-lavapiezas", "Lavapiezas (fregadero sobre bidón, con bomba y cepillo)", red, [
    // a sink on its 75 L drum, the lid, the pumped nozzle and the brush
    C(0, 0.4, 0, 0.6, 0.8, 0.6, red),
    C(0, 0.85, 0, 0.9, 0.12, 0.6, steel),
    C(0, 1.05, 0.28, 0.9, 0.3, 0.03, steel),
    C(0.3, 1.0, 0.2, 0.03, 0.2, 0.03, chrome),
    C(-0.2, 0.93, -0.1, 0.25, 0.04, 0.08, wood),
  ]),
  M("mec-neumaticos", "Desmontadora y equilibradora de neumáticos", 0x3a6fb0, [
    // tyre changer (cabinet, turntable, mount/demount column and the bead breaker) and wheel balancer (body, shaft, hood)
    C(-0.65, 0.4, 0, 0.9, 0.8, 0.9, 0x3a6fb0),
    C(-0.65, 0.84, -0.05, 0.6, 0.06, 0.6, iron),
    C(-0.65, 1.3, 0.35, 0.12, 1.0, 0.12, 0x3a6fb0),
    C(-0.65, 1.75, 0.0, 0.1, 0.1, 0.7, 0x3a6fb0),
    C(-1.15, 0.5, 0, 0.1, 0.5, 0.4, iron),
    C(0.65, 0.45, 0.05, 0.9, 0.9, 0.7, 0xe6e9ec),
    C(0.65, 0.95, -0.25, 0.08, 0.08, 0.4, chrome),
    C(0.65, 1.15, -0.2, 0.7, 0.4, 0.5, 0x3a6fb0),
    C(0.65, 1.0, 0.36, 0.4, 0.25, 0.04, screen),
  ]),
  M("mec-banco", "Banco de trabajo con tornillo, panel de herramientas y carro de cajones", wood, [
    // 2,4 m beech-top bench, a bench vice, the pegboard with tools, a roll cabinet beside
    C(0, 0.43, 0, 2.0, 0.86, 0.75, darkSteel),
    C(0, 0.89, 0, 2.0, 0.06, 0.75, wood),
    C(-0.75, 1.0, -0.3, 0.2, 0.16, 0.25, 0x3a6fb0),
    C(0, 1.5, 0.36, 2.0, 1.0, 0.03, 0x8a8f96),
    ...rep(6, (i) => [C(-0.8 + i * 0.32, 1.5, 0.33, 0.04, 0.3 + (i % 3) * 0.1, 0.03, i % 2 ? red : iron)]),
    C(0.3, 0.95, 0, 0.35, 0.06, 0.25, acc),
    C(1.3, 0.5, 0, 0.6, 1.0, 0.5, red),
    ...rep(5, (i) => [C(1.3, 0.2 + i * 0.17, -0.255, 0.5, 0.01, 0.01, chrome)]),
  ]),
  M("mec-soldadura", "Soldadura MIG con su botella, y mampara de soldadura", 0x3a6fb0, [
    // the MIG set on its cart with the shielding-gas bottle and torch; the red-tinted welding screen on its frame
    C(-0.6, 0.3, 0, 0.5, 0.5, 0.8, 0x3a6fb0),
    C(-0.6, 0.65, 0, 0.45, 0.2, 0.7, 0x2a5a8a),
    C(-0.6, 0.75, 0.35, 0.22, 1.3, 0.22, 0x5a8a5a),
    C(-0.6, 1.45, 0.35, 0.08, 0.1, 0.08, chrome),
    C(-0.3, 0.6, -0.3, 0.06, 0.4, 0.06, iron),
    C(0.5, 0.95, 0, 1.4, 1.6, 0.03, 0xc04030),
    ...[-0.2, 1.2].map((x) => C(x, 0.9, 0, 0.04, 1.8, 0.5, darkSteel)),
  ]),
  M("mec-compresor", "Compresor de pistón (270 L) y enrollador de manguera", red, [
    C(0, 0.35, 0, 1.4, 0.5, 0.5, red),
    ...[-0.5, 0.5].map((x) => C(x, 0.05, 0, 0.1, 0.1, 0.5, iron)),
    C(-0.2, 0.75, 0, 0.5, 0.3, 0.35, darkSteel),
    C(0.35, 0.75, 0, 0.35, 0.3, 0.3, 0x3a6fb0),
    C(0.55, 0.72, -0.2, 0.12, 0.12, 0.04, white),
    C(-0.6, 1.2, 0.2, 0.3, 0.3, 0.15, acc),
  ]),
  M("mec-prensa", "Prensa hidráulica de taller (20 t)", red, [
    // H frame, the bed on its pins, the ram with its gauge and pump lever
    ...[-0.35, 0.35].map((x) => C(x, 0.9, 0, 0.1, 1.8, 0.3, red)),
    ...[-0.25, 0.25].map((z) => C(0, 0.04, z, 0.9, 0.08, 0.12, red)),
    C(0, 1.75, 0, 0.8, 0.1, 0.3, red),
    C(0, 0.75, 0, 0.6, 0.1, 0.25, iron),
    C(0, 1.5, 0, 0.12, 0.4, 0.12, chrome),
    C(0.2, 1.3, -0.18, 0.1, 0.1, 0.03, white),
    C(0.45, 1.0, 0, 0.05, 0.5, 0.05, iron),
  ]),
  M("mec-aceite", "Recogedor de aceite usado y bidones de 205 L en su cubeto", acc, [
    // spill pallet with grating, two drums (used oil, coolant), the wheeled oil drainer with its funnel
    C(0.25, 0.15, 0, 1.3, 0.3, 0.9, acc),
    C(0.25, 0.31, 0, 1.2, 0.02, 0.8, darkSteel),
    C(-0.05, 0.75, 0, 0.58, 0.88, 0.58, 0x2a2e36),
    C(0.6, 0.75, 0, 0.58, 0.88, 0.58, 0x3a7a3a),
    C(-0.85, 0.4, 0, 0.4, 0.6, 0.4, 0xe0a81c),
    C(-0.85, 0.9, 0, 0.12, 0.4, 0.12, darkSteel),
    C(-0.85, 1.12, 0, 0.45, 0.06, 0.45, 0xe0a81c),
  ]),
  M("mec-baterias", "Cargador de baterías y punto de seguridad (extintor, lavaojos, botiquín)", darkSteel, [
    // a charger cart with a battery on charge; the wall panel with the CO₂ extinguisher, the eyewash bottles and the first-aid box
    C(-0.4, 0.4, 0, 0.5, 0.8, 0.5, darkSteel),
    C(-0.4, 0.9, 0, 0.35, 0.2, 0.3, 0x2a2e36),
    C(-0.4, 0.95, -0.16, 0.2, 0.08, 0.01, screen),
    C(0.35, 1.2, 0.2, 0.6, 1.2, 0.03, white),
    C(0.2, 0.75, 0.12, 0.16, 0.6, 0.16, red),
    C(0.5, 1.3, 0.14, 0.2, 0.3, 0.1, 0x40a040),
    C(0.35, 1.65, 0.14, 0.3, 0.2, 0.1, 0x40a040),
  ]),
  M("mec-estanteria", "Estantería de repuestos (filtros, correas, rodamientos, juntas)", 0x3a6fb0, [...shelves(2.7, 1.0, 2.4, 4, 0x3a6fb0, 0xb3855a)]),
];
