import { C, COL, rep, type ModelDef, type Part } from "./kit";

/**
 * The shapes of the models that were still one box (Cold Sanctuary draws them as one cube): each from the real thing
 * inside its own size (x × y × z of its entry), front towards −z. Applied over the whole catalogue by `detailed`, so the
 * entries keep their id, group, label, source and reality.
 */
const { steel, darkSteel, white, screen, chrome, rubber, iron } = COL;
const LED = 0x40d080;

export const DETAIL: Readonly<Record<string, readonly Part[]>> = {
  "gym-arbol-discos": [
    // A-frame plate tree: base, upright and six horns with bumper plates of the IWF colours
    C(0, 0.03, 0, 0.6, 0.06, 0.6, iron),
    C(0, 0.65, 0, 0.08, 1.2, 0.08, iron),
    ...rep(3, (i) => [C(0, 0.35 + i * 0.35, -0.12, 0.45 - i * 0.08, 0.45 - i * 0.08, 0.06, [0xc03030, 0x3a6fb0, 0xf0d020][i]), C(0, 0.35 + i * 0.35, 0.12, 0.45 - i * 0.08, 0.45 - i * 0.08, 0.06, [0xc03030, 0x3a6fb0, 0xf0d020][i])]),
    C(0, 1.27, 0, 0.12, 0.06, 0.12, chrome),
  ],
  "gym-soporte-barras": [
    // vertical bar holder: base with six tubes, barbells standing in them
    C(0, 0.06, 0, 0.6, 0.12, 0.6, iron),
    ...rep(6, (i) => [C(-0.2 + (i % 3) * 0.2, 0.2, -0.12 + Math.floor(i / 3) * 0.24, 0.08, 0.2, 0.08, darkSteel), C(-0.2 + (i % 3) * 0.2, 0.7, -0.12 + Math.floor(i / 3) * 0.24, 0.03, 1.0, 0.03, chrome)]),
  ],
  "incinerador-maleza": [
    // small incinerator: firebox with its door, ash drawer, the filter (cyclone and bag) and the stack
    C(0, 0.05, 0, 1.2, 0.1, 1.2, darkSteel),
    C(0, 0.6, 0.1, 1.0, 1.0, 0.9, 0x4a4f57),
    C(0, 0.65, -0.36, 0.5, 0.4, 0.04, iron),
    C(0, 0.2, -0.36, 0.6, 0.12, 0.04, rubber),
    C(0.35, 1.4, 0.2, 0.4, 0.6, 0.4, steel),
    C(-0.2, 1.75, 0.2, 0.18, 1.3, 0.18, 0x3a3e46),
    C(-0.2, 2.38, 0.2, 0.3, 0.04, 0.3, darkSteel),
  ],
  "cons-cono": [C(0, 0.02, 0, 0.35, 0.04, 0.35, rubber), C(0, 0.2, 0, 0.25, 0.32, 0.25, 0xe06020), C(0, 0.4, 0, 0.17, 0.08, 0.17, white), C(0, 0.55, 0, 0.1, 0.3, 0.1, 0xe06020)],
  "vf-dosificador": [
    // nutrient doser: stock tanks A and B, acid tank, the dosing pumps and the controller with EC/pH probes
    C(0, 0.05, 0, 2.4, 0.1, 1.2, darkSteel),
    ...rep(3, (i) => [C(-0.8 + i * 0.6, 0.6, 0.15, 0.5, 1.0, 0.6, [0x3a6fb0, 0x2a8a5a, 0xd9a420][i]), C(-0.8 + i * 0.6, 1.12, 0.15, 0.2, 0.04, 0.2, white)]),
    C(0.85, 0.9, -0.1, 0.5, 0.7, 0.2, white),
    C(0.85, 1.05, -0.21, 0.3, 0.2, 0.01, screen),
    ...rep(3, (i) => [C(0.7 + i * 0.12, 0.65, -0.21, 0.08, 0.08, 0.02, darkSteel)]),
    C(0, 1.3, 0.45, 2.2, 0.06, 0.06, white),
  ],
  "vf-lavado": [
    // tray washer: stainless tunnel with brushes, in- and out-feed rollers
    C(0, 0.45, 0, 1.2, 0.9, 1.0, steel),
    C(0, 0.5, -0.51, 0.8, 0.3, 0.01, 0xbfe3f0),
    C(-0.9, 0.8, 0, 0.6, 0.06, 0.8, chrome),
    C(0.9, 0.8, 0, 0.6, 0.06, 0.8, chrome),
    C(-0.9, 0.4, 0, 0.05, 0.8, 0.7, darkSteel),
    C(0.9, 0.4, 0, 0.05, 0.8, 0.7, darkSteel),
    C(0.45, 0.95, -0.4, 0.2, 0.1, 0.1, screen),
  ],
  "hospital-analizador": [
    // floor-standing clinical chemistry analyser: body, reagent carousel lid, sample rack, touchscreen
    C(0, 0.45, 0, 1.1, 0.9, 0.75, 0xe6e9ec),
    C(0, 1.05, 0.1, 1.1, 0.3, 0.55, 0xd8dce0),
    C(-0.25, 0.92, -0.28, 0.4, 0.04, 0.2, 0x3a6fb0),
    C(0.35, 1.1, -0.2, 0.3, 0.2, 0.04, screen),
    C(0, 0.5, -0.38, 0.9, 0.6, 0.01, 0xd0d4da),
    C(0.45, 1.25, 0.2, 0.08, 0.1, 0.08, LED),
  ],
  "vet-bascula": [C(0, 0.04, 0, 1.2, 0.08, 1, steel), C(0, 0.085, 0, 1.1, 0.01, 0.9, rubber), C(0.5, 0.09, -0.45, 0.15, 0.02, 0.08, screen)],
  "lab-incubadora": [
    C(0, 0.6, 0, 0.75, 1.2, 0.75, white),
    C(-0.03, 0.55, -0.38, 0.6, 0.95, 0.01, 0xe6e9ec),
    C(0.27, 0.6, -0.39, 0.03, 0.3, 0.02, chrome),
    C(0.25, 1.1, -0.38, 0.15, 0.06, 0.01, screen),
  ],
  "lab-autoclave": [
    // front-loading benchtop autoclave on its cart: round door, pressure gauge, display
    C(0, 0.3, 0, 0.8, 0.6, 0.7, darkSteel),
    C(0, 0.8, 0, 0.8, 0.4, 0.7, steel),
    C(-0.1, 0.8, -0.355, 0.32, 0.32, 0.02, chrome),
    C(0.28, 0.9, -0.355, 0.1, 0.1, 0.01, white),
    C(0.28, 0.72, -0.355, 0.14, 0.06, 0.01, screen),
  ],
  "lab-raciones": [
    // the feeder's ration store: an upright cold room door, its display and the ration trays behind the window
    C(0, 0.7, 0, 1.4, 1.4, 0.7, darkSteel),
    C(-0.3, 0.75, -0.355, 0.6, 1.1, 0.01, 0xbfe3f0),
    ...rep(4, (i) => [C(-0.3, 0.35 + i * 0.27, -0.2, 0.55, 0.06, 0.3, 0xc8643c)]),
    C(0.4, 1.2, -0.355, 0.25, 0.12, 0.01, screen),
    C(0.3, 0.75, -0.37, 0.03, 0.4, 0.03, chrome),
  ],
};

/** The catalogue with every one-box entry that has a shape here drawn in pieces (same entry and size, its pieces inside it). */
export function detailed(defs: readonly ModelDef[]): ModelDef[] {
  return defs.map((d) => {
    const parts = d.shape === "caja" ? DETAIL[d.id] : undefined;
    return parts ? { ...d, shape: "piezas", parts } : d;
  });
}
