import { G0 } from "@core/units";

/** Tsiolkovsky rocket equation, m/s. */
export function deltaV(ispS: number, initialMassKg: number, finalMassKg: number): number {
  if (finalMassKg <= 0 || finalMassKg > initialMassKg) {
    throw new RangeError(`Invalid masses: initial ${initialMassKg} kg, final ${finalMassKg} kg`);
  }
  return ispS * G0 * Math.log(initialMassKg / finalMassKg);
}

/** Propellant consumed per second at full thrust, kg/s. */
export function massFlow(thrustN: number, ispS: number): number {
  return thrustN / (ispS * G0);
}
