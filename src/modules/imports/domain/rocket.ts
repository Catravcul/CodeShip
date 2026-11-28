import { G0 } from "@core/units";

/** Tsiolkovsky: initial over final mass for a Δv at a specific impulse. */
export const massRatio = (dvMs: number, ispS: number): number => Math.exp(dvMs / (G0 * ispS));

/**
 * Kilograms that must sit in low Earth orbit for each kilogram delivered, when every burn is a stage
 * that is dropped once empty. Each stage's dry mass is `tankage` times its propellant (tanks, engine).
 * Worked from the last burn back: stage dry mass = f(MR−1)·m / (1 − f(MR−1)), its start mass MR·(m + dry).
 */
export function leoKgPerKgDelivered(burnsMs: readonly number[], ispS: number, tankage: number): number {
  let m = 1;
  for (let i = burnsMs.length - 1; i >= 0; i--) {
    const mr = massRatio(burnsMs[i]!, ispS);
    const k = tankage * (mr - 1);
    if (k >= 1) throw new Error(`A stage of ${Math.round(burnsMs[i]!)} m/s cannot lift its own tanks at Isp ${ispS} s`);
    const dry = (k * m) / (1 - k);
    m = mr * (m + dry);
  }
  return m;
}
