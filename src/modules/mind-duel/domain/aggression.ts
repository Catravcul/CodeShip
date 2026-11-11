/** Hull fraction lost per second at the surface of an aggressive asteroid. */
const MAX_DAMAGE_PER_S = 0.04;
/** Seconds the ship must stay outside the safe distance before the asteroid calms down. */
const CALM_DOWN_S = 60;

/**
 * An enraged asteroid hurls debris. The ship takes damage inside the safe distance and must
 * flee beyond it; after a while outside, the asteroid calms down and a new duel can start.
 */
export class Aggression {
  readonly safeDistanceM: number;
  private outsideS = 0;

  constructor(meanRadiusM: number) {
    this.safeDistanceM = Math.max(500, 3 * meanRadiusM);
  }

  /** @param distanceToSurfaceM current distance from the ship to the asteroid's surface */
  update(dtS: number, distanceToSurfaceM: number): { hullDamage: number; calmed: boolean } {
    if (distanceToSurfaceM < this.safeDistanceM) {
      this.outsideS = 0;
      const closeness = 1 - Math.max(0, distanceToSurfaceM) / this.safeDistanceM;
      return { hullDamage: MAX_DAMAGE_PER_S * closeness * dtS, calmed: false };
    }
    this.outsideS += dtS;
    return { hullDamage: 0, calmed: this.outsideS >= CALM_DOWN_S };
  }
}
