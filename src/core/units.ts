/** Standard gravity used to convert specific impulse (s) to exhaust velocity (m/s). */
export const G0 = 9.80665;
/** Newtonian gravitational constant, m^3 kg^-1 s^-2 (CODATA 2018). */
export const G = 6.6743e-11;

/** A real-world value with the place it was taken from. Every catalog number must carry one. */
export interface Sourced<T> {
  readonly value: T;
  readonly source: string;
  readonly note?: string;
}
