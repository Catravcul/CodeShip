import { C, COL, rep, type Part } from "./kit";

/**
 * The shapes of the Ciencias blocks that Cold Sanctuary leaves as one box (Research.cs, Informatica.cs): each drawn
 * from the real equipment inside its own footprint and height (w × d × h of its Block), front towards −z. Sources of
 * the shapes: makers' data sheets of each kind (glove box with antechamber and gas purifier, EN 14470 safety cabinets,
 * −80 °C upright freezers, floor centrifuges, X-ray diffractometers with lead-glass doors, 42U racks, in-row CDUs…);
 * sizes are Cold Sanctuary's.
 */
const { steel, darkSteel, white, glass, screen, red, chrome, rubber } = COL;
const LEAD_GLASS = 0xd9a54a;
const PORT = 0x1a1a1e;
const LED = 0x40d080;

/** A cabinet body with two doors' seam, handles and plinth: the base of most of these. */
function cabinet(w: number, d: number, h: number, body: number, doors = 2): Part[] {
  return [
    C(0, 0.05, 0, w - 0.04, 0.1, d - 0.04, rubber),
    C(0, 0.1 + (h - 0.1) / 2, 0, w, h - 0.1, d, body),
    ...rep(doors - 1, (i) => [C(-w / 2 + (w * (i + 1)) / doors, h / 2 + 0.05, -d / 2 - 0.005, 0.01, h - 0.3, 0.01, darkSteel)]),
    ...rep(doors, (i) => [C(-w / 2 + (w * (i + 0.5)) / doors + (i % 2 ? -0.08 : 0.08) * (doors > 1 ? 1 : 0), h * 0.55, -d / 2 - 0.02, 0.03, 0.25, 0.03, chrome)]),
  ];
}

/** A safety sign (a small square on the front). */
const sign = (x: number, y: number, d: number, c: number): Part => C(x, y, -d / 2 - 0.012, 0.18, 0.18, 0.01, c);

/** A 42U rack (0,6 × 1,2 × 2,2 m class) with its perforated door and status LEDs. */
function rack(x: number, w: number, d: number, h: number, body: number): Part[] {
  return [C(x, h / 2, 0, w - 0.02, h, d, body), C(x, h / 2, -d / 2 - 0.01, w - 0.08, h - 0.15, 0.01, 0x3a3e46), ...rep(6, (i) => [C(x - w / 4, 0.4 + i * 0.28, -d / 2 - 0.02, 0.04, 0.02, 0.01, LED)])];
}

export const CIENCIAS_DETAIL: Readonly<Record<string, readonly Part[]>> = {
  /* Química: síntesis */
  "q-guantes": [
    // stand with the gas purifier (catalyst and molecular-sieve columns) below, the stainless chamber, a glass window with three glove ports, the antechamber on the right
    C(0, 0.4, 0, 2.0, 0.8, 1.0, darkSteel),
    C(-0.3, 0.4, -0.51, 1.0, 0.6, 0.01, steel),
    C(-0.25, 1.3, 0, 1.9, 1.0, 1.0, steel),
    C(-0.25, 1.3, -0.51, 1.6, 0.8, 0.02, glass),
    ...rep(3, (i) => [C(-0.85 + i * 0.6, 1.2, -0.53, 0.22, 0.22, 0.03, PORT)]),
    C(0.97, 1.2, 0, 0.5, 0.42, 0.42, chrome),
    C(0.97, 1.2, -0.22, 0.44, 0.44, 0.03, darkSteel),
    C(-0.25, 1.9, 0.1, 1.0, 0.18, 0.5, white),
    C(0.6, 1.92, -0.3, 0.35, 0.16, 0.03, screen),
  ],
  "q-inflamables": [...cabinet(2.2, 0.5, 1.75, 0xd9b020), C(0.8, 1.76, 0.1, 0.1, 0.06, 0.1, darkSteel), sign(-0.6, 1.5, 0.5, red), sign(0.6, 1.5, 0.5, red)],
  "q-acidos": [...cabinet(1.1, 0.5, 1.7, 0x3a6fb0), C(0.3, 1.75, 0.05, 0.12, 0.1, 0.12, white), sign(0, 1.45, 0.5, 0xe8e8e8), C(0, 0.25, -0.15, 0.95, 0.04, 0.15, white)],
  "q-bases": [...cabinet(1.1, 0.5, 1.7, 0x5aa05a), C(0.3, 1.75, 0.05, 0.12, 0.1, 0.12, white), sign(0, 1.45, 0.5, 0xe8e8e8), C(0, 0.25, -0.15, 0.95, 0.04, 0.15, white)],
  "q-residuos": [
    // spill tray with grating, two 20 L jerrycans (organic, halogenated) and a 60 L drum, labels
    C(0, 0.08, 0, 1.2, 0.16, 0.6, 0xd97a20),
    C(0, 0.17, 0, 1.12, 0.02, 0.52, darkSteel),
    C(-0.4, 0.42, 0, 0.3, 0.48, 0.25, white),
    C(-0.05, 0.42, 0, 0.3, 0.48, 0.25, 0x3a6fb0),
    C(-0.4, 0.69, 0.06, 0.05, 0.06, 0.05, red),
    C(-0.05, 0.69, 0.06, 0.05, 0.06, 0.05, red),
    C(0.36, 0.55, 0, 0.42, 0.75, 0.42, 0x2a5a3a),
    C(0.36, 0.55, -0.215, 0.2, 0.2, 0.01, 0xf0d020),
  ],
  /* Química: análisis */
  "q-drx": [
    // the enclosure (lead glass doors, interlocks), goniometer with tube and detector inside, generator and chiller below, the X-ray-on lamp
    C(0, 0.4, 0, 1.5, 0.8, 1.3, 0xc0c4ca),
    C(0, 1.25, 0, 1.5, 0.9, 1.3, 0xc0c4ca),
    C(-0.33, 1.25, -0.655, 0.6, 0.75, 0.02, LEAD_GLASS),
    C(0.33, 1.25, -0.655, 0.6, 0.75, 0.02, LEAD_GLASS),
    C(0, 1.15, -0.1, 0.35, 0.35, 0.35, darkSteel),
    C(-0.3, 1.25, -0.1, 0.25, 0.1, 0.1, chrome),
    C(0.3, 1.3, -0.1, 0.2, 0.12, 0.12, PORT),
    C(0, 1.75, 0, 1.5, 0.1, 1.3, 0x9aa0a8),
    C(0.6, 1.85, -0.5, 0.1, 0.1, 0.1, 0xf08020),
    C(-0.5, 0.45, -0.655, 0.3, 0.15, 0.02, screen),
  ],
  /* Biología: cultivo */
  "b-incubador": [
    // two stacked CO₂ incubators on a stand, each with its door, display and the gas line to the CO₂ manifold behind
    C(0, 0.1, 0, 0.75, 0.2, 0.8, darkSteel),
    ...rep(2, (i) => [C(0, 0.6 + i * 0.85, 0, 0.8, 0.8, 0.85, white), C(-0.05, 0.6 + i * 0.85, -0.43, 0.6, 0.7, 0.02, 0xe6e9ec), C(0.33, 0.85 + i * 0.85, -0.44, 0.1, 0.06, 0.01, screen), C(0.28, 0.6 + i * 0.85, -0.45, 0.03, 0.3, 0.03, chrome)]),
    C(0.3, 1.0, 0.43, 0.04, 1.6, 0.04, 0x9aa0a8),
  ],
  "b-centrifuga": [
    // floor-standing refrigerated centrifuge: body, lid on top, control panel at the front, castors
    C(0, 0.06, 0, 0.8, 0.12, 0.7, rubber),
    C(0, 0.5, 0, 0.9, 0.76, 0.8, 0xd8dce0),
    C(0, 0.9, 0.05, 0.8, 0.06, 0.65, 0xc8ccd2),
    C(0, 0.75, -0.34, 0.6, 0.22, 0.12, 0xe6e9ec),
    C(0, 0.78, -0.41, 0.3, 0.1, 0.01, screen),
    C(0, 0.96, -0.2, 0.3, 0.04, 0.05, darkSteel),
  ],
  "b-congelador": [...cabinet(1, 1, 1.95, white, 1), C(0, 1.75, -0.51, 0.3, 0.1, 0.01, screen), C(0, 1.85, 0.2, 0.6, 0.2, 0.5, 0xd8dce0), C(-0.38, 1.7, -0.52, 0.1, 0.1, 0.02, 0x3a6fb0)],
  "b-lavamanos": [
    // hands-free sink (knee-operated tap) with an eyewash on the tap, soap and towel dispensers on the side
    C(0, 0.4, 0.2, 0.9, 0.8, 0.8, white),
    C(0, 0.85, 0.15, 0.95, 0.1, 0.9, steel),
    C(0, 0.84, 0.1, 0.6, 0.08, 0.45, darkSteel),
    C(0, 0.95, 0.5, 0.05, 0.1, 0.05, chrome),
    C(0, 0.98, 0.4, 0.05, 0.04, 0.2, chrome),
    C(0.15, 0.95, 0.4, 0.08, 0.06, 0.08, 0x40a040),
    C(0, 0.35, -0.21, 0.25, 0.1, 0.02, chrome),
    C(-0.47, 0.6, 0.3, 0.04, 0.2, 0.12, white),
    C(0.47, 0.55, 0.3, 0.04, 0.3, 0.25, white),
  ],
  /* Biología: molecular */
  "b-dewar": [
    // storage dewar on a dolly: body, neck with the lid, handles, level gauge
    C(0, 0.04, 0, 0.6, 0.08, 0.6, darkSteel),
    C(0, 0.5, 0, 0.55, 0.85, 0.55, steel),
    C(0, 0.98, 0, 0.25, 0.12, 0.25, chrome),
    C(0, 1.06, 0, 0.3, 0.04, 0.3, 0x3a6fb0),
    C(-0.3, 0.85, 0, 0.04, 0.2, 0.15, darkSteel),
    C(0.3, 0.85, 0, 0.04, 0.2, 0.15, darkSteel),
    C(0, 0.75, -0.28, 0.12, 0.12, 0.01, white),
  ],
  "b-nevera": [
    // laboratory refrigerator with a glass door, shelves and racks of reagents
    C(0, 0.9, 0, 0.7, 1.8, 0.75, white),
    C(0, 0.95, -0.38, 0.6, 1.5, 0.01, glass),
    ...rep(4, (i) => [C(0, 0.45 + i * 0.35, -0.1, 0.58, 0.02, 0.5, steel), C(-0.1, 0.52 + i * 0.35, -0.1, 0.3, 0.12, 0.3, [0x3a6fb0, red, 0x40a040, 0xf0d020][i])]),
    C(0.28, 1.0, -0.4, 0.03, 0.4, 0.03, chrome),
    C(0, 1.74, -0.38, 0.2, 0.06, 0.01, screen),
  ],
  /* Informática */
  "i-red": [...rack(0, 0.8, 1.4, 2.2, 0x22262c), ...rep(4, (i) => [C(0.1, 1.2 + i * 0.12, -0.72, 0.4, 0.04, 0.01, 0x3a6fb0)])],
  "i-almacen": [...rack(-0.4, 0.8, 1.4, 2.2, 0x2a2e36), ...rack(0.4, 0.8, 1.4, 2.2, 0x2a2e36)],
  "i-intercambiador": [
    // plate heat exchanger on its frame between the cluster water loop and the building's: frame, plate pack, nozzles, valves
    C(0, 0.1, 0, 2.4, 0.2, 1.4, darkSteel),
    C(-0.95, 0.95, 0, 0.12, 1.7, 0.9, 0x3a6fb0),
    C(0.95, 0.95, 0, 0.12, 1.7, 0.9, 0x3a6fb0),
    C(0, 0.9, 0, 1.75, 1.2, 0.8, 0x7a8c99),
    C(0, 1.75, 0, 2.0, 0.08, 0.1, steel),
    ...rep(4, (i) => [C(-0.95, 0.5 + (i % 2) * 0.9, -0.5 + Math.floor(i / 2) * 1.0 - 0.1, 0.2, 0.2, 0.2, i < 2 ? red : 0x3a6fb0)]),
  ],
  "i-bombas": [
    // two pumps (duty and standby) on a skid, motors, pipes and valves
    C(0, 0.06, 0, 2, 0.12, 1.0, darkSteel),
    ...rep(2, (i) => [C(-0.5 + i, 0.35, 0, 0.35, 0.4, 0.4, 0x3a6fb0), C(-0.5 + i, 0.35, 0.33, 0.3, 0.3, 0.3, 0x2a5a8a), C(-0.5 + i, 0.75, -0.2, 0.12, 0.4, 0.12, steel)]),
    C(0, 0.98, -0.2, 1.4, 0.12, 0.12, steel),
  ],
  "i-cuadro": [...cabinet(2.4, 0.8, 2.0, 0x8a8f96, 3), sign(-0.8, 1.7, 0.8, 0xf0d020), ...rep(3, (i) => [C(-0.8 + i * 0.8, 1.3, -0.42, 0.25, 0.1, 0.01, LED)])],
  "i-sai": [...cabinet(1.2, 0.9, 2.0, 0x2a2e36, 2), C(-0.3, 1.6, -0.46, 0.3, 0.2, 0.01, screen), C(-0.3, 1.4, -0.46, 0.06, 0.06, 0.01, LED)],
  "i-baterias": [...cabinet(0.8, 0.8, 2.0, 0x2a2e36, 1), ...rep(5, (i) => [C(0, 0.35 + i * 0.32, -0.41, 0.5, 0.04, 0.01, 0x4a4f57)])],
  "i-extincion": [
    // inert gas (IG-541) cylinders on a rack, manifold, actuator and the release panel
    C(0, 0.05, 0, 1.6, 0.1, 0.6, darkSteel),
    ...rep(4, (i) => [C(-0.6 + i * 0.4, 0.8, 0, 0.27, 1.5, 0.27, red), C(-0.6 + i * 0.4, 1.6, 0, 0.12, 0.1, 0.12, chrome)]),
    C(0, 1.7, 0, 1.4, 0.08, 0.08, chrome),
    C(0.65, 1.2, -0.25, 0.22, 0.3, 0.08, 0xd0d4da),
  ],
  "i-banco": [
    // maintenance bench with an antistatic (ESD) mat, drawers and a server tray under it
    C(0, 0.45, 0, 2, 0.9, 0.9, 0x8a8f96),
    C(0, 0.92, 0, 2, 0.04, 0.9, 0x2e7a4e),
    C(-0.4, 0.97, 0.1, 0.6, 0.06, 0.6, 0x22262c),
    ...[-0.6, 0, 0.6].map((x) => C(x, 0.7, -0.455, 0.5, 0.2, 0.01, darkSteel)),
    C(0, 0.3, -0.455, 1.8, 0.35, 0.01, 0x22262c),
  ],
  "i-repuestos": [
    // shelving with boxed spares (drives, fans, PSUs, cables)
    C(-0.58, 1.0, 0, 0.04, 2.0, 0.6, darkSteel),
    C(0.58, 1.0, 0, 0.04, 2.0, 0.6, darkSteel),
    ...rep(5, (i) => [C(0, 0.1 + i * 0.45, 0, 1.2, 0.03, 0.6, 0x8a8f96), ...(i < 4 ? [C(-0.25, 0.25 + i * 0.45, 0, 0.45, 0.25, 0.45, [0xb3855a, 0x3a6fb0, 0xb3855a, 0x5a5c66][i]), C(0.3, 0.22 + i * 0.45, 0, 0.4, 0.2, 0.4, 0xb3855a)] : [])]),
  ],
};
