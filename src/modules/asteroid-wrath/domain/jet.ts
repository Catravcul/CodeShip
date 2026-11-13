/**
 * An angry comet's power: it opens a vent and fires a jet of gas and dust at a target. Rosetta saw
 * 67P throw 34 outbursts in the summer of 2015, each under 5 minutes, 60–260 kg/s of dust at
 * 13 m/s or more (Vincent et al. 2016, COMET_SRC.outbursts). The jet spreads in a cone: what the
 * target intercepts is its cross-section over the cone's at that distance.
 */
export const JET = {
  /** Dust mass rate of a 67P outburst, kg/s: 60–260 (Vincent et al. 2016). Scaled by the anger. */
  massRateKgS: [60, 260] as readonly [number, number],
  /** Lowest dust speed seen in an outburst, m/s (Vincent et al. 2016). */
  minDustSpeedMs: 13,
  /** Cone half-angle of the jet, degrees (game value: Rosetta's jets were narrow, tens of degrees at most). */
  halfAngleDeg: 10,
  /** How long one jet blows on its target, s (game value; real outbursts lasted under 5 min). */
  durationS: 20,
  /** One throw in this many is a jet instead of a rock (game value). */
  everyThrows: 3,
} as const;

export interface JetHit {
  /** Dust the target intercepts, kg. */
  readonly interceptedKg: number;
  /** Momentum it carries into the target, kg·m/s. */
  readonly momentumKgMs: number;
  /** Kinetic energy of that dust relative to the target, J. */
  readonly energyJ: number;
}

/** Share of the jet a target of radius r intercepts at distance d from the vent (1 at most). */
export function jetInterceptFraction(distanceM: number, targetRadiusM: number, halfAngleDeg: number = JET.halfAngleDeg): number {
  const coneR = Math.max(distanceM, 1) * Math.tan((halfAngleDeg * Math.PI) / 180);
  return Math.min(1, (targetRadiusM * targetRadiusM) / (coneR * coneR));
}

/** What one jet of an angry comet does to a target at `distanceM` from its surface. */
export function jetOnTarget(distanceM: number, targetRadiusM: number, anger: number, speedMs: number): JetHit {
  const [lo, hi] = JET.massRateKgS;
  const rate = lo + (hi - lo) * Math.min(1, Math.max(0, anger));
  const v = Math.max(JET.minDustSpeedMs, speedMs);
  const interceptedKg = rate * JET.durationS * jetInterceptFraction(distanceM, targetRadiusM);
  return { interceptedKg, momentumKgMs: interceptedKg * v, energyJ: 0.5 * interceptedKg * v * v };
}
