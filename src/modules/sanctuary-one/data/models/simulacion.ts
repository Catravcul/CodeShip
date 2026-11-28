import { SIM_TANK } from "../simulacion";
import { C, pz, rep, type ModelDef } from "./kit";

/**
 * The simulation machine's solid parts (data/simulacion.ts SIM_TANK, from Cold Sanctuary's VirtualizationTank.Build):
 * the plinth, the four steel edges, the lid, the copper coils of the door's frame, the mask on its tube and the
 * console. Its glass, its water and its two sliding door leaves are drawn apart, see-through and moving
 * (adapters/three/sim-tank.ts).
 */
const T = SIM_TANK;
const STEEL = 0xb8bec6;
const DARK = 0x3a3f46;
const COPPER = 0xb87338;
const r = T.half;
const top = T.base + T.water;

export const SIMULACION_MODELS: readonly ModelDef[] = [
  pz("simulador", "maquina", "simulacion", "Máquina de simulación: gran pecera de agua con puerta de cristal y campo magnético", STEEL, [
    C(0, T.base / 2, 0, r * 2.2, T.base, r * 2.2, DARK),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * r, T.base + T.water / 2, sz * r, 0.06, T.water, 0.06, STEEL))),
    // The lid's steel frame (its glass is drawn see-through, adapters/three/sim-tank.ts).
    ...[-1, 1].flatMap((e) => [C(e * r, top + 0.04, 0, 0.12, 0.08, r * 2.1, DARK), C(0, top + 0.04, e * r, r * 2.1, 0.08, 0.12, DARK)]),
    // The door's frame with its coils (copper), at the front (−z).
    ...[-1, 1].map((s) => C(s * (T.door + 0.06), T.base + T.water / 2, -r - 0.02, 0.1, T.water, 0.1, COPPER)),
    C(0, top - 0.05, -r - 0.02, T.door * 2 + 0.2, 0.1, 0.1, COPPER),
    // The rack of breathing masks on their hooks and tubes, by the door: one for each who goes in.
    C(T.mask.x + 0.6, T.mask.y + 0.12, T.mask.z, (T.places - 1) * 0.22 + 0.3, 0.05, 0.05, STEEL),
    ...rep(T.places, (i) => [C(T.mask.x + i * 0.22 - 0.28, T.mask.y, T.mask.z, 0.16, 0.13, 0.09, 0x4d525a), C(T.mask.x + i * 0.22 - 0.28, T.mask.y - 0.5, T.mask.z, 0.035, 0.85, 0.035, 0x8cb3cc)]),
    // The console beside it, with its screen and keys.
    C(T.console.x, 0.6, T.console.z, 0.5, 1.2, 0.4, 0xe6e9ec), C(T.console.x + 0.26, 1.05, T.console.z, 0.01, 0.25, 0.4, 0x1f4052),
    ...rep(3, (i) => [C(T.console.x + 0.26, 0.85, T.console.z - 0.12 + i * 0.12, 0.01, 0.05, 0.08, [0x40d080, 0xe6b326, 0xc03030][i]!)]),
  ], "ficcion", `${T.source}: gran pecera de 9 × 9 m con 4 m de agua, zócalo de 0,3 m, puerta de 2,8 m entre bobinas, ${T.places} máscaras; el campo que sostiene el agua es la magia del santuario (hacen falta ~75–80 T)`),
];
