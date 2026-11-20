/**
 * How a craft without anchors comes to rest (Juventas on Dimorphos: it touches down at «centimetres per
 * second», bounces several times and its accelerometers record each bounce until it stays still;
 * docs/design/modulo-lunar-juventas.md). Each bounce gives back `restitution` of the vertical speed; it
 * is at rest once a bounce is slower than `restMs`. Pure: the flight computer sets the craft down at the
 * touchdown point and this tells how long that took and what the accelerometers saw.
 */
export interface Settling {
  /** Bounces before it stays still. */
  readonly bounces: number;
  /** Highest hop, m. */
  readonly highestHopM: number;
  /** Seconds from the first touch until it is still. */
  readonly seconds: number;
  /** Vertical speed of each touch, m/s (what the accelerometers record). */
  readonly touchesMs: readonly number[];
}

/** Coefficient of restitution on regolith: game value (no published figure for Juventas). */
export const REGOLITH_RESTITUTION = 0.5;
/** Below this vertical speed a bounce is too small to count: it is at rest, m/s. Game value. */
export const REST_MS = 0.002;

export function settle(touchdownMs: number, gravityMs2: number, restitution = REGOLITH_RESTITUTION, restMs = REST_MS): Settling {
  const touches = [Math.abs(touchdownMs)];
  let v = Math.abs(touchdownMs) * restitution;
  let seconds = 0;
  let highest = 0;
  const g = Math.max(1e-9, gravityMs2);
  while (v >= restMs && touches.length < 50) {
    seconds += (2 * v) / g;
    highest = Math.max(highest, (v * v) / (2 * g));
    touches.push(v);
    v *= restitution;
  }
  return { bounces: touches.length - 1, highestHopM: highest, seconds, touchesMs: touches };
}
