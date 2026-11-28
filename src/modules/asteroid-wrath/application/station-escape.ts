import { Vec3 } from "@core/math/vec3";
import { G0 } from "@core/units";
import { totalThrustN, type StationDriveSpec } from "@modules/station/domain/drive";
import type { FleeGuidance } from "./wrath";

export type EscapeState = "en-reposo" | "huyendo" | "frenando" | "sin-propelente";

/**
 * Survival mode for the station: while an angry asteroid has it in reach, it fires its own engines
 * straight away from the asteroid; once out of reach (or the asteroid calms down) it brakes to a stop.
 * Propellant follows the rocket equation (ṁ = F / (Isp·g₀)). See docs/design/poderes-ira.md.
 */
export class StationEscape {
  private _velocity = Vec3.ZERO;
  private _propellantKg: number;
  private _state: EscapeState = "en-reposo";

  constructor(
    readonly drive: StationDriveSpec,
    private _position: Vec3,
  ) {
    this._propellantKg = drive.propellantKg.value;
  }

  get position(): Vec3 {
    return this._position;
  }
  get velocity(): Vec3 {
    return this._velocity;
  }
  get propellantKg(): number {
    return this._propellantKg;
  }
  get state(): EscapeState {
    return this._state;
  }
  get massKg(): number {
    return this.drive.dryMassKg.value + this._propellantKg;
  }
  /** Thrust acceleration with the propellant on board, m/s² (0 when the tanks are dry). */
  get accelMs2(): number {
    return this._propellantKg > 0 ? totalThrustN(this.drive) / this.massKg : 0;
  }
  /** Δv left, m/s (Tsiolkovsky). */
  get deltaVMs(): number {
    return this.drive.ispS.value * G0 * Math.log(this.massKg / this.drive.dryMassKg.value);
  }
  /** Seconds of thrust to cover `distanceM` from rest at full thrust (½at²), ignoring the braking. */
  timeToCoverS(distanceM: number): number {
    const a = this.accelMs2;
    return a > 0 ? Math.sqrt((2 * Math.max(0, distanceM)) / a) : Infinity;
  }

  /** A pull from outside (a gravity grip), m/s. */
  push(deltaV: Vec3): void {
    this._velocity = this._velocity.add(deltaV);
  }

  /** Teleport (e.g. the game resets it); velocity is kept. */
  moveTo(p: Vec3): void {
    this._position = p;
  }

  /**
   * One step. `flee` is where to go to leave the reach (null when nothing threatens the station).
   * Returns the new position.
   */
  update(dtS: number, flee: FleeGuidance | null): Vec3 {
    let thrustDir = Vec3.ZERO;
    if (flee && flee.distanceM > 0) {
      thrustDir = flee.direction;
      this._state = "huyendo";
    } else if (this._velocity.length() > 0.01) {
      thrustDir = this._velocity.normalize().scale(-1);
      this._state = "frenando";
    } else {
      this._velocity = Vec3.ZERO;
      this._state = "en-reposo";
    }
    if (thrustDir.length() > 0 && this._propellantKg <= 0) this._state = "sin-propelente";
    const a = this.accelMs2;
    if (thrustDir.length() > 0 && a > 0) {
      let dv = a * dtS;
      // Braking: never overshoot zero.
      if (this._state === "frenando") dv = Math.min(dv, this._velocity.length());
      const burnS = dv / a;
      const mdot = totalThrustN(this.drive) / (this.drive.ispS.value * G0);
      this._propellantKg = Math.max(0, this._propellantKg - mdot * burnS);
      this._velocity = this._velocity.add(thrustDir.scale(dv));
    }
    this._position = this._position.add(this._velocity.scale(dtS));
    return this._position;
  }
}
