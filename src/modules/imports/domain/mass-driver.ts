/**
 * A mass driver set on a subjugated body: a coil gun that flings bagged regolith at the station, where
 * a catcher stops it (O'Neill's lunar launcher, Ames 1977). Here it only has to beat a small body's
 * escape speed, so Mass Driver Two's 112 m/s is plenty.
 */
export interface MassDriverSpec {
  /** Muzzle speed, m/s. */
  readonly launchSpeedMs: number;
  /** Acceleration along the coils, m/s². */
  readonly accelMs2: number;
  /** Payload of one bucket, kg. */
  readonly packageKg: number;
  /** Hours the miner needs to dig and bag one package (game value). */
  readonly packHours: number;
}

/** Length of the coils that reach the muzzle speed: v² / 2a, m. */
export const driverLengthM = (s: Pick<MassDriverSpec, "launchSpeedMs" | "accelMs2">): number => (s.launchSpeedMs * s.launchSpeedMs) / (2 * s.accelMs2);

/** Kinetic energy of one package at the muzzle, J. */
export const launchEnergyJ = (s: Pick<MassDriverSpec, "launchSpeedMs" | "packageKg">): number => 0.5 * s.packageKg * s.launchSpeedMs * s.launchSpeedMs;

/** Coasting time to the station in a straight line (the body's gravity is negligible past escape), h. */
export const flightHours = (distanceM: number, speedMs: number): number => distanceM / speedMs / 3600;

/** A driver installed on one body: it bags a package every `packHours` and throws it. */
export class MassDriver {
  private packed = 0;
  private _launched = 0;

  constructor(
    readonly spec: MassDriverSpec,
    readonly bodyId: string,
    readonly bodyName: string,
  ) {}

  get launched(): number {
    return this._launched;
  }
  /** 0..1 of the package being bagged now. */
  get progress(): number {
    return this.packed / this.spec.packHours;
  }

  /** Let `hours` pass; returns how many packages left the muzzle. */
  tick(hours: number): number {
    this.packed += hours;
    let n = 0;
    while (this.packed >= this.spec.packHours - 1e-9) {
      this.packed -= this.spec.packHours;
      n++;
    }
    this._launched += n;
    return n;
  }
}

/** Whether a muzzle speed escapes a body: v ≥ √(2GM/R). */
export const escapes = (speedMs: number, escapeSpeedMs: number): boolean => speedMs >= escapeSpeedMs;
