import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { CarrierPort } from "./carrier-trip";
import { attitudeDeg } from "../domain/attitude";

/**
 * Starship flown by hand (Berón, 2026-11-18): free flight with no destination, on the model of Crew Dragon's
 * manual flight (its touchscreen: translation forward/back, up/down, left/right; rotation pitch, yaw, roll; each
 * tap a fixed small Δv or rate step; the page shows the rates and the attitude, as in Hurley's test on Demo-2).
 * Starship's crew controls are not published: this is «en desarrollo», with Dragon as its source. Only the RCS:
 * the Raptors' big burns stay with «Automático». Values are ours (Dragon's per-tap steps are not published).
 */
export const FREE_CARRIER = {
  /** Δv per translation tap, m/s. */
  stepMs: 0.1,
  /** Rate change per rotation tap, °/s. */
  rateStepDegS: 0.2,
  /** Top rate on any axis, °/s (the slew rate of the automatic trips, CARRIER_SLEW_DEG_S). */
  maxRateDegS: 1,
  /** Top speed by hand, m/s (proximity operations). */
  maxMs: 1,
  /** Below this it counts as stopped, m/s. */
  holdMs: 0.05,
} as const;

export type BodyAxis = "x" | "y" | "z";

const RAD = Math.PI / 180;
const AXIS: Record<BodyAxis, Vec3> = { x: Vec3.X, y: Vec3.Y, z: Vec3.Z };

export class FreeCarrierRun {
  private pos: Vec3;
  private vel = Vec3.ZERO;
  private att: Quat;
  /** Body rates, rad/s (x pitch, y yaw, z roll). */
  private rates = Vec3.ZERO;
  /** Δv spent so far, m/s (translation and rotation steps). */
  spentMs = 0;
  /** Why the last tap could not fire (no propellant), if so. */
  refused: string | undefined;

  constructor(private readonly carrier: CarrierPort) {
    this.pos = carrier.position;
    this.att = carrier.orientation;
  }

  /** Velocity in the ship's frame (x right, y up, −z forward), m/s. */
  get velocityBody(): Vec3 {
    return this.att.conjugate().rotate(this.vel);
  }
  get speedMs(): number {
    return this.vel.length();
  }
  /** Body rates, °/s (x pitch, y yaw, z roll). */
  get ratesDegS(): Vec3 {
    return this.rates.scale(1 / RAD);
  }
  get attitude(): { pitch: number; yaw: number; roll: number } {
    return attitudeDeg(this.att);
  }
  /** The RCS fires to turn now (for the model's plumes). */
  get turning(): boolean {
    return this.rates.length() > 1e-9;
  }
  get stopped(): boolean {
    return this.speedMs <= FREE_CARRIER.holdMs && !this.turning;
  }

  private spend(dv: number): boolean {
    if (dv < 1e-9) return true;
    if (!this.carrier.burn(dv)) {
      this.refused = "Sin propelente para el RCS";
      return false;
    }
    this.refused = undefined;
    this.spentMs += dv;
    return true;
  }

  /** One translation tap along a body axis (sign ±1): the speed along it changes by FREE_CARRIER.stepMs. */
  translate(axis: BodyAxis, sign: 1 | -1): boolean {
    const dv = this.att.rotate(AXIS[axis]).scale(sign * FREE_CARRIER.stepMs);
    const next = this.vel.add(dv);
    if (next.length() > FREE_CARRIER.maxMs + 1e-9) {
      this.refused = `Tope a mano: ${FREE_CARRIER.maxMs} m/s (los encendidos grandes, en «Automático»)`;
      return false;
    }
    if (!this.spend(FREE_CARRIER.stepMs)) return false;
    this.vel = next;
    return true;
  }

  /** One rotation tap about a body axis (x pitch, y yaw, z roll; sign ±1): its rate changes by FREE_CARRIER.rateStepDegS. */
  rotate(axis: BodyAxis, sign: 1 | -1): boolean {
    const cur = this.rates[axis];
    const next = Math.max(-FREE_CARRIER.maxRateDegS * RAD, Math.min(FREE_CARRIER.maxRateDegS * RAD, cur + sign * FREE_CARRIER.rateStepDegS * RAD));
    if (Math.abs(next - cur) < 1e-12) {
      this.refused = `Tope de giro: ${FREE_CARRIER.maxRateDegS} °/s`;
      return false;
    }
    // Rotation steps cost little: the RCS's lever arm, counted as a hundredth of a translation step.
    if (!this.spend(FREE_CARRIER.stepMs / 100)) return false;
    this.rates = new Vec3(axis === "x" ? next : this.rates.x, axis === "y" ? next : this.rates.y, axis === "z" ? next : this.rates.z);
    return true;
  }

  /** Stop: null the rates and the speed with the RCS. */
  stop(): boolean {
    if (!this.spend(this.vel.length() + (this.turning ? FREE_CARRIER.stepMs / 100 : 0))) return false;
    this.vel = Vec3.ZERO;
    this.rates = Vec3.ZERO;
    return true;
  }

  /** Let `gameS` pass: the ship drifts at its velocity and turns at its rates. */
  advance(gameS: number): void {
    const dt = Math.max(0, gameS);
    this.pos = this.pos.add(this.vel.scale(dt));
    this.att = this.att.integrate(this.rates, dt);
    this.carrier.moveTo(this.pos, this.att);
  }
}
