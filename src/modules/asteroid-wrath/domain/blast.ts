/**
 * What a charge does when it bursts in vacuum. There is no air, so there is no blast wave and no
 * overpressure a few metres out: the damage is the cloud of rock fragments the gas throws, which
 * thins out with the square of the distance. See docs/design/poderes-ira.md.
 */

/**
 * Gurney equation for a sphere: fragment speed V = √(2E) · (M/C + 3/5)^(−1/2), with M the casing
 * (rock) mass and C the charge mass (Gurney 1943; https://en.wikipedia.org/wiki/Gurney_equations).
 * TNT has √(2E) ≈ 2,44 km/s.
 */
export function gurneySphereSpeedMs(gurneyConstantMs: number, casingKg: number, chargeKg: number): number {
  if (chargeKg <= 0) return 0;
  return gurneyConstantMs / Math.sqrt(casingKg / chargeKg + 3 / 5);
}

export const BLAST = {
  /** √(2E) of TNT, m/s (table of Gurney constants, https://en.wikipedia.org/wiki/Gurney_equations). */
  tntGurneyMs: 2440,
  /**
   * Specific energy of a volatile charge (water and CO/CO₂ from carbon flashing to gas), J/kg.
   * Game estimate, an order below TNT's 4,2 MJ/kg: a steam explosion, not a detonation.
   */
  volatileEnergyJkg: 0.3e6,
  /** Mass of a thrown volatile charge, kg (game value). */
  chargeMassKg: 40,
  /** Number of fragments the casing breaks into (game value; a real burst follows Mott's law). */
  fragments: 200,
  /** It bursts when this close to its target, m (game value). */
  fuseM: 15,
  /** Nuclear charge yield, J (game value: about a quarter tonne of TNT, a very small device). */
  nuclearYieldJ: 1e9,
  /** In vacuum most of a nuclear yield leaves as X-rays (Glasstone & Dolan 1977, The Effects of Nuclear Weapons, ch. II: bursts above ~100 km); the share is a game value. */
  nuclearXrayFraction: 0.7,
  /** Prompt radiation dose at 100 m from the nuclear charge, mSv (game value). */
  nuclearDoseAt100mMSv: 2000,
  nuclearFuseM: 60,
} as const;

/** Gurney constant of a volatile charge: √(2E). */
export const volatileGurneyMs = (): number => Math.sqrt(2 * BLAST.volatileEnergyJkg);

export interface FragmentCloud {
  readonly fragments: number;
  readonly fragmentKg: number;
  readonly speedMs: number;
}

/**
 * Fragment cloud of a volatile charge of `massKg` whose volatile share is `volatileFraction` (from the
 * asteroid's real composition): the volatiles are the charge, the rest is the casing.
 */
export function volatileCharge(massKg: number, volatileFraction: number): FragmentCloud {
  const f = Math.min(0.9, Math.max(0.01, volatileFraction));
  const charge = massKg * f;
  const casing = massKg - charge;
  return { fragments: BLAST.fragments, fragmentKg: casing / BLAST.fragments, speedMs: gurneySphereSpeedMs(volatileGurneyMs(), casing, charge) };
}

/**
 * Kinetic energy that reaches a target of cross-section radius `targetRadiusM` at `distanceM`:
 * the isotropic cloud puts N·A/(4πr²) fragments on it (all of them when it bursts on contact).
 */
export function fragmentEnergyOnTargetJ(cloud: FragmentCloud, distanceM: number, targetRadiusM: number): number {
  const area = Math.PI * targetRadiusM * targetRadiusM;
  const share = Math.min(1, area / (4 * Math.PI * Math.max(distanceM, 1e-3) ** 2));
  return cloud.fragments * share * 0.5 * cloud.fragmentKg * cloud.speedMs ** 2;
}

/** X-ray energy a nuclear burst deposits on a target's cross-section at `distanceM`, J (inverse square). */
export function nuclearEnergyOnTargetJ(distanceM: number, targetRadiusM: number, yieldJ: number = BLAST.nuclearYieldJ): number {
  const area = Math.PI * targetRadiusM * targetRadiusM;
  const share = Math.min(1, area / (4 * Math.PI * Math.max(distanceM, 1e-3) ** 2));
  return yieldJ * BLAST.nuclearXrayFraction * share;
}

/** Prompt dose of the nuclear burst at `distanceM` before shielding, mSv (inverse square from the 100 m value). */
export const nuclearDoseMSv = (distanceM: number): number => BLAST.nuclearDoseAt100mMSv * (100 / Math.max(distanceM, 10)) ** 2;
