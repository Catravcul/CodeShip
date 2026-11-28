import { C, COL, rep, type Part } from "./kit";

/**
 * The gym's machines and benches in pieces (Berón 2026-11-19: realism floor by floor, after the Unity export): each
 * from the real machine (Technogym Selection / Life Fitness Signature references for the weight-stack ones, the
 * IWF/IPF benches and racks), inside its catalogue size, front (where she gets on) towards −z. Also the last
 * one-box things of the hospital, the vet, the building site and the parkour.
 */
const { iron, chrome, pad, rubber, steel, darkSteel, white, wood, red } = COL;
const PLATES = 0x2a2a2e;

/** A weight stack with its two guide rods, centred at (x, z), plates from y0 to y1. */
const stack = (x: number, z: number, y0: number, y1: number, w = 0.34, rods = 0.5): Part[] => [
  C(x, (y0 + y1) / 2, z, w, y1 - y0, 0.16, PLATES),
  C(x - w / 2 - 0.03, (y0 + y1 + rods) / 2, z, 0.03, y1 - y0 + rods, 0.03, chrome),
  C(x + w / 2 + 0.03, (y0 + y1 + rods) / 2, z, 0.03, y1 - y0 + rods, 0.03, chrome),
  C(x, y1 + rods * 0.54, z, w + 0.12, 0.04, 0.2, iron),
];
/** A seat (pad on its post) at height h. */
const seat = (x: number, z: number, h: number, w = 0.42, d = 0.4): Part[] => [C(x, h / 2, z, 0.08, h, 0.08, iron), C(x, h + 0.04, z, w, 0.08, d, pad)];
/** A back pad leaning at the seat's back. */
const back = (x: number, z: number, y: number, h = 0.6, w = 0.4): Part[] => [C(x, y, z, w, h, 0.08, pad)];
const base = (x: number, z: number): Part => C(0, 0.03, 0, x, 0.06, z, iron);

export const GYM_DETAIL: Readonly<Record<string, readonly Part[]>> = {
  "gym-jalon": [
    base(1.2, 1.4),
    ...seat(0, -0.25, 0.48),
    C(0, 0.72, -0.48, 0.5, 0.1, 0.12, pad), // knee pads that hold her down
    C(0, 0.4, -0.48, 0.06, 0.6, 0.06, iron),
    C(0, 0.925, 0.55, 0.12, 1.85, 0.12, iron), // the column
    ...stack(0, 0.35, 0.08, 0.8),
    C(0, 1.79, -0.05, 0.1, 0.08, 1.3, iron), // the top beam with its pulley
    C(0, 1.62, -0.48, 0.01, 0.26, 0.01, steel), // cable
    C(0, 1.48, -0.48, 1.3, 0.04, 0.04, chrome), // the lat bar
    C(-0.6, 1.44, -0.48, 0.1, 0.08, 0.05, rubber),
    C(0.6, 1.44, -0.48, 0.1, 0.08, 0.05, rubber),
  ],
  "gym-press-pecho": [
    base(1.2, 1.0),
    ...seat(0, -0.15, 0.45),
    ...back(0, 0.08, 0.85),
    C(0, 0.74, 0.32, 0.12, 1.48, 0.12, iron),
    ...stack(0, 0.43, 0.08, 0.75, 0.3),
    // the two converging arms with their grips, ahead of her chest
    C(-0.45, 1.0, -0.2, 0.06, 0.06, 0.6, steel),
    C(0.45, 1.0, -0.2, 0.06, 0.06, 0.6, steel),
    C(-0.5, 0.95, -0.45, 0.05, 0.22, 0.05, rubber),
    C(0.5, 0.95, -0.45, 0.05, 0.22, 0.05, rubber),
  ],
  "gym-press-hombros": [
    base(1.25, 1.3),
    ...seat(0, -0.2, 0.45),
    ...back(0, 0.05, 0.95, 0.75),
    C(0, 0.775, 0.5, 0.12, 1.55, 0.12, iron),
    ...stack(0, 0.6, 0.08, 0.75, 0.3),
    C(-0.38, 1.35, -0.05, 0.05, 0.4, 0.05, steel),
    C(0.38, 1.35, -0.05, 0.05, 0.4, 0.05, steel),
    C(-0.38, 1.2, -0.12, 0.12, 0.05, 0.05, rubber),
    C(0.38, 1.2, -0.12, 0.12, 0.05, 0.05, rubber),
  ],
  "gym-remo": [
    base(1.0, 1.3),
    ...seat(0, -0.05, 0.45),
    C(0, 0.85, -0.38, 0.4, 0.4, 0.1, pad), // chest pad
    C(0, 0.89, 0.6, 0.12, 1.78, 0.12, iron),
    ...stack(0, 0.45, 0.08, 0.75, 0.3),
    C(0, 0.95, -0.55, 0.5, 0.04, 0.04, chrome), // the grips in front
    C(0, 0.95, -0.2, 0.01, 0.01, 0.5, steel),
  ],
  "gym-prensa": [
    base(1.0, 2.0),
    // 45° leg press: the sled rails, the reclined seat and the footplate high in front
    C(-0.35, 0.6, -0.2, 0.08, 0.08, 1.6, iron),
    C(0.35, 0.6, -0.2, 0.08, 0.08, 1.6, iron),
    C(0, 0.45, 0.55, 0.55, 0.1, 0.6, pad),
    C(0, 0.8, 0.85, 0.55, 0.5, 0.1, pad),
    C(0, 1.15, -0.75, 0.75, 0.7, 0.08, steel),
    C(-0.45, 1.2, -0.65, 0.08, 0.5, 0.08, chrome),
    C(0.45, 1.2, -0.65, 0.08, 0.5, 0.08, chrome),
    C(-0.5, 0.75, 0.6, 0.06, 0.3, 0.06, rubber),
    C(0.5, 0.75, 0.6, 0.06, 0.3, 0.06, rubber),
  ],
  "gym-extension": [
    base(1.2, 1.2),
    ...seat(0, 0, 0.5),
    ...back(0, 0.22, 0.95),
    C(0, 0.9, 0.55, 0.12, 1.8, 0.12, iron),
    ...stack(0.4, 0.45, 0.08, 0.8, 0.28),
    C(0, 0.35, -0.3, 0.5, 0.12, 0.12, pad), // the roller at her shins
    C(0, 0.45, -0.22, 0.06, 0.2, 0.06, steel),
  ],
  "gym-curl-femoral": [
    base(0.6, 1.5),
    C(0, 0.6, 0.1, 0.4, 0.08, 1.1, pad), // lying pad
    C(0, 0.3, 0.1, 0.08, 0.6, 0.08, iron),
    C(0, 0.6, -0.6, 0.4, 0.1, 0.1, pad), // the roller behind her ankles
    ...stack(0, -0.6, 0.08, 0.3, 0.24, 0.3),
    C(-0.25, 0.65, 0.6, 0.05, 0.08, 0.15, rubber),
    C(0.25, 0.65, 0.6, 0.05, 0.08, 0.15, rubber),
  ],
  "gym-hip-thrust": [
    base(1.4, 1.5),
    C(0, 0.22, 0.45, 1.2, 0.44, 0.35, pad), // the bench at her back
    C(0, 0.06, -0.3, 0.9, 0.06, 0.7, rubber),
    C(0, 0.45, -0.2, 1.4, 0.06, 0.06, chrome), // the hip bar over her pelvis
    C(-0.6, 0.3, -0.2, 0.08, 0.5, 0.1, iron),
    C(0.6, 0.3, -0.2, 0.08, 0.5, 0.1, iron),
    C(0, 0.55, -0.2, 0.5, 0.08, 0.16, pad),
  ],
  "gym-gemelos": [
    base(0.55, 1.1),
    ...seat(0, 0.15, 0.45, 0.36, 0.36),
    C(0, 0.08, -0.25, 0.4, 0.1, 0.25, rubber), // the foot block
    C(0, 0.62, -0.18, 0.4, 0.08, 0.22, pad), // the pads on her knees
    C(0, 0.4, -0.35, 0.06, 0.5, 0.06, iron),
    C(0, 0.55, 0.45, 0.14, 0.9, 0.14, darkSteel), // the plate horn
    C(0, 0.75, 0.45, 0.04, 0.3, 0.3, PLATES),
  ],
  "gym-curl-biceps": [
    base(1.0, 1.2),
    ...seat(0, 0.25, 0.48),
    C(0, 0.92, -0.05, 0.6, 0.08, 0.3, pad), // the preacher pad for her arms
    C(0, 0.7, 0.0, 0.08, 0.4, 0.08, iron),
    C(0, 0.7, 0.5, 0.12, 1.4, 0.12, iron),
    ...stack(0.35, 0.5, 0.08, 0.7, 0.24),
    C(0, 1.0, -0.3, 0.55, 0.04, 0.04, chrome),
  ],
  "gym-smith": [
    base(1.9, 1.4),
    ...rep(2, (i) => [C(-0.85 + i * 1.7, 1.1, -0.6, 0.08, 2.2, 0.08, iron), C(-0.85 + i * 1.7, 1.1, 0.6, 0.08, 2.2, 0.08, iron)]),
    C(0, 2.16, -0.6, 1.8, 0.08, 0.08, iron),
    C(0, 2.16, 0.6, 1.8, 0.08, 0.08, iron),
    // the guided bar on its rails, with discs
    C(-0.7, 1.1, 0, 0.04, 2.1, 0.04, chrome),
    C(0.7, 1.1, 0, 0.04, 2.1, 0.04, chrome),
    C(0, 1.4, 0, 1.95, 0.03, 0.03, chrome),
    C(-0.8, 1.4, 0, 0.05, 0.45, 0.45, red),
    C(0.8, 1.4, 0, 0.05, 0.45, 0.45, red),
    C(0, 0.4, 0.3, 0.4, 0.06, 1.0, pad),
  ],
  "gym-jaula": [
    base(2.0, 1.3),
    ...rep(2, (i) => [C(-0.65 + i * 1.3, 1.15, -0.6, 0.08, 2.3, 0.08, iron), C(-0.65 + i * 1.3, 1.15, 0.6, 0.08, 2.3, 0.08, iron)]),
    C(0, 2.26, -0.6, 1.4, 0.08, 0.08, iron),
    C(0, 2.26, 0.6, 1.4, 0.08, 0.08, iron),
    C(-0.65, 2.26, 0, 0.08, 0.08, 1.2, iron),
    C(0.65, 2.26, 0, 0.08, 0.08, 1.2, iron),
    C(-0.65, 0.75, 0, 0.06, 0.05, 1.2, chrome), // the safety arms
    C(0.65, 0.75, 0, 0.06, 0.05, 1.2, chrome),
    C(0, 1.42, -0.45, 2.2, 0.03, 0.03, chrome), // the bar on its J-hooks (inside the front uprights)
    C(-0.95, 1.42, -0.45, 0.05, 0.45, 0.45, 0x3a6fb0),
    C(0.95, 1.42, -0.45, 0.05, 0.45, 0.45, 0x3a6fb0),
  ],
  "gym-press-banca": [
    C(0, 0.4, 0.15, 0.3, 0.08, 1.2, pad),
    C(0, 0.2, -0.3, 0.3, 0.36, 0.08, iron),
    C(0, 0.2, 0.6, 0.3, 0.36, 0.08, iron),
    C(-0.55, 0.6, 0.72, 0.08, 1.2, 0.08, iron), // the uprights at her head
    C(0.55, 0.6, 0.72, 0.08, 1.2, 0.08, iron),
    C(0, 1.05, 0.7, 2.2, 0.03, 0.03, chrome),
    C(-0.95, 1.05, 0.67, 0.05, 0.45, 0.45, red),
    C(0.95, 1.05, 0.67, 0.05, 0.45, 0.45, red),
    C(-0.55, 0.85, 0.3, 0.06, 0.05, 0.6, chrome), // spotter arms
    C(0.55, 0.85, 0.3, 0.06, 0.05, 0.6, chrome),
  ],
  "gym-press-inclinado": [
    C(0, 0.45, -0.25, 0.3, 0.08, 0.45, pad),
    C(0, 0.75, 0.3, 0.3, 0.08, 0.8, pad),
    C(0, 0.3, 0.1, 0.3, 0.5, 0.1, iron),
    C(0, 0.45, 0.45, 0.08, 0.9, 0.08, iron), // the back's strut
    C(0, 0.03, 0.2, 0.5, 0.06, 1.0, iron),
    C(-0.55, 0.7, 0.72, 0.08, 1.4, 0.08, iron),
    C(0.55, 0.7, 0.72, 0.08, 1.4, 0.08, iron),
    C(0, 1.15, 0.7, 2.2, 0.03, 0.03, chrome),
    C(-0.95, 1.15, 0.67, 0.05, 0.45, 0.45, 0x3a6fb0),
    C(0.95, 1.15, 0.67, 0.05, 0.45, 0.45, 0x3a6fb0),
  ],
  "gym-banco-fid": [
    C(0, 0.43, -0.3, 0.3, 0.08, 0.5, pad),
    C(0, 0.55, 0.3, 0.3, 0.08, 0.75, pad),
    C(0, 0.2, 0, 0.12, 0.08, 1.3, iron),
    C(0, 0.22, -0.55, 0.6, 0.06, 0.08, iron),
    C(0, 0.22, 0.6, 0.6, 0.06, 0.08, iron),
    C(0, 0.3, 0.2, 0.06, 0.4, 0.06, steel), // the ladder of the incline
  ],
  "gym-estante-mancuernas": [
    C(-1.05, 0.45, 0, 0.08, 0.9, 0.6, iron),
    C(1.05, 0.45, 0, 0.08, 0.9, 0.6, iron),
    C(0, 0.5, 0.1, 2.1, 0.04, 0.3, darkSteel),
    C(0, 0.85, -0.12, 2.1, 0.04, 0.3, darkSteel),
    // pairs of hex dumbbells from 2 to 40 kg, growing along the rack
    ...rep(10, (i) => [C(-0.95 + i * 0.21, 0.58 + i * 0.006, 0.1, 0.16, 0.12 + i * 0.006, 0.12 + i * 0.008, PLATES), C(-0.95 + i * 0.21, 0.9, -0.12, 0.16, 0.08 + i * 0.004, 0.08 + i * 0.006, PLATES)]),
  ],
  "gym-plataforma": [C(0, 0.012, 0, 2.4, 0.024, 2.4, rubber), C(0, 0.04, 0, 1.0, 0.02, 2.4, wood)],
  "gym-fuente": [C(0, 0.45, 0.05, 0.4, 0.9, 0.3, steel), C(0, 0.95, 0, 0.45, 0.1, 0.38, chrome), C(0, 1.02, -0.05, 0.05, 0.05, 0.05, darkSteel)],
  "gym-toallas": [
    C(0, 0.66, 0, 0.8, 1.32, 0.04, wood),
    ...rep(4, (i) => [C(0, 0.25 + i * 0.3, -0.1, 0.7, 0.04, 0.3, wood), C(0, 0.32 + i * 0.3, -0.1, 0.6, 0.1, 0.25, white)]),
  ],
  "pk-muro-alto": [C(0, 1.2, 0, 3.0, 2.4, 0.3, 0x8a8f96), C(0, 2.37, 0, 3.0, 0.06, 0.3, wood)],
  "pk-muro-medio": [C(0, 0.75, 0, 2.4, 1.5, 0.3, 0x8a8f96), C(0, 1.47, 0, 2.4, 0.06, 0.3, wood)],
  "cf-cajon-61": [C(0, 0.305, 0, 0.76, 0.61, 0.51, wood), C(0, 0.3, -0.256, 0.2, 0.06, 0.01, darkSteel)],
  "hospital-botiquin": [
    C(0, 1.0, 0.05, 1.2, 2.0, 0.35, white),
    C(-0.3, 1.0, -0.13, 0.58, 1.9, 0.02, 0xe8eef2),
    C(0.3, 1.0, -0.13, 0.58, 1.9, 0.02, 0xe8eef2),
    C(0, 1.6, -0.15, 0.3, 0.3, 0.01, 0x2a9d58), // the green cross
    C(-0.03, 1.0, -0.15, 0.02, 0.2, 0.02, chrome),
    C(0.03, 1.0, -0.15, 0.02, 0.2, 0.02, chrome),
  ],
  "vet-pediluvio": [C(0, 0.03, 0, 1.2, 0.06, 1.6, darkSteel), C(0, 0.05, 0, 1.1, 0.02, 1.5, 0x4a90b0)],
  "cons-ladrillos": [...rep(2, (i) => [C(-0.55 + i * 1.1, 0.06, 0, 1.0, 0.12, 1.0, wood), C(-0.55 + i * 1.1, 0.55, 0, 1.0, 0.86, 1.0, 0xa0522d)])],
  "cons-cemento": [...rep(2, (i) => [C(-0.55 + i * 1.1, 0.06, 0, 1.0, 0.12, 1.0, wood), ...rep(4, (k) => [C(-0.55 + i * 1.1, 0.2 + k * 0.15, 0, 0.9, 0.14, 0.9, 0xd8d0b8)])])],
  "cons-madera": [...rep(5, (i) => [C(-0.45 + i * 0.22, 0.12, 0, 0.2, 0.05, 3.6, wood), C(-0.45 + i * 0.22, 0.3, 0, 0.2, 0.05, 3.6, 0xc4996a)]), C(0, 0.04, -1.5, 1.2, 0.08, 0.1, wood), C(0, 0.04, 1.5, 1.2, 0.08, 0.1, wood)],
  "cons-vigas": [C(-0.25, 0.15, 0, 0.3, 0.3, 4.0, 0x6a6f78), C(0.25, 0.15, 0, 0.3, 0.3, 4.0, 0x6a6f78), C(0, 0.4, 0, 0.3, 0.2, 4.0, 0x6a6f78)],
  "cons-tuberias": [...rep(3, (i) => [C(-0.4 + i * 0.4, 0.15, 0, 0.3, 0.3, 3.2, i === 1 ? 0xd06020 : 0x8a8f96)]), C(0, 0.4, 0, 0.3, 0.2, 3.2, 0x8a8f96)],
  "cons-tejas": [C(0, 0.06, 0, 1.6, 0.12, 1.2, wood), ...rep(6, (i) => [C(0, 0.18 + i * 0.12, 0, 1.5, 0.1, 1.1, 0xb5523b)])],
};
