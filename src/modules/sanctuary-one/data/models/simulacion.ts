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
  pz("simulador", "maquina", "simulacion", "Máquina de simulación: pecera de agua con puerta de cristal y campo magnético", STEEL, [
    C(0, T.base / 2, 0, r * 2.2, T.base, r * 2.2, DARK),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * r, T.base + T.water / 2, sz * r, 0.06, T.water, 0.06, STEEL))),
    C(0, top + 0.04, 0, r * 2.1, 0.08, r * 2.1, DARK),
    // The door's frame with its coils (copper), at the front (−z).
    ...[-1, 1].map((s) => C(s * (T.door + 0.06), T.base + T.water / 2, -r - 0.02, 0.1, T.water, 0.1, COPPER)),
    C(0, top - 0.05, -r - 0.02, T.door * 2 + 0.2, 0.1, 0.1, COPPER),
    // The breathing mask on its hook and its tube, by the door.
    C(T.mask.x, T.mask.y, T.mask.z, 0.18, 0.14, 0.1, 0x4d525a), C(T.mask.x, T.mask.y - 0.55, T.mask.z, 0.04, 0.95, 0.04, 0x8cb3cc),
    C(T.mask.x - 0.1, T.mask.y + 0.1, T.mask.z, 0.25, 0.04, 0.04, STEEL),
    // The console beside it, with its screen and keys.
    C(T.console.x, 0.6, T.console.z, 0.5, 1.2, 0.4, 0xe6e9ec), C(T.console.x, 1.05, T.console.z - 0.21, 0.4, 0.25, 0.01, 0x1f4052),
    ...rep(3, (i) => [C(T.console.x - 0.12 + i * 0.12, 0.85, T.console.z - 0.21, 0.08, 0.05, 0.01, [0x40d080, 0xe6b326, 0xc03030][i]!)]),
  ], "ficcion", `${T.source}: tanque de 1,8 × 1,8 m con 2,4 m de agua, zócalo de 0,25 m, puerta de 1,1 m entre bobinas; el campo que sostiene el agua es la magia del santuario (hacen falta ~75–80 T)`),
];
