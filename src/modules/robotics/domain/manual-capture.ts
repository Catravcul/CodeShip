import { Vec3 } from "@core/math/vec3";

/**
 * Flying the arm's tip by hand to a vehicle in free drift (docs/design/brazo-robotico.md, «A mano»): at the
 * RWS the operator holds the translational hand controller (THC) to move the tip along the camera's axes and
 * the rotational one (RHC) to line it up; when the grapple shaft is inside the LEE, the trigger closes the
 * snares. Here the THC moves the tip; lining up is part of the envelope. The vehicle still drifts a little.
 */
export interface ManualCaptureSpec {
  /** Fastest the tip moves with the THC fully deflected, m/s. */
  readonly tipSpeedMs: number;
  /** The snares catch within this distance of the shaft, m. */
  readonly envelopeM: number;
  /** …and only this slow relative to it, m/s. */
  readonly closeSpeedMs: number;
  /** Arm length from the base, m: the tip cannot go farther. */
  readonly reachM: number;
}

export type CaptureTry = { readonly ok: true } | { readonly ok: false; readonly why: string };

export class ManualCapture {
  private _tip: Vec3;
  private _target: Vec3;
  private tipV = Vec3.ZERO;
  private _caught = false;

  constructor(
    readonly spec: ManualCaptureSpec,
    readonly base: Vec3,
    tip: Vec3,
    target: Vec3,
    /** The vehicle's leftover drift in free drift, m/s. */
    readonly drift: Vec3,
  ) {
    this._tip = tip;
    this._target = target;
  }

  get tip(): Vec3 {
    return this._tip;
  }
  get target(): Vec3 {
    return this._target;
  }
  get caught(): boolean {
    return this._caught;
  }
  get distanceM(): number {
    return this._target.sub(this._tip).length();
  }
  /** Speed of the tip relative to the shaft, m/s. */
  get closingMs(): number {
    return this.tipV.sub(this._caught ? this.tipV : this.drift).length();
  }

  /**
   * One step: `thc` is the hand controller in −1…1 per axis (station frame; the adapter turns the camera's
   * left/right, up/down, in/out into it). Once caught, the tip carries the vehicle.
   */
  step(thc: Vec3, dt: number): void {
    const c = new Vec3(clamp(thc.x), clamp(thc.y), clamp(thc.z));
    this.tipV = c.length() > 1 ? c.normalize().scale(this.spec.tipSpeedMs) : c.scale(this.spec.tipSpeedMs);
    let next = this._tip.add(this.tipV.scale(dt));
    const fromBase = next.sub(this.base);
    if (fromBase.length() > this.spec.reachM) next = this.base.add(fromBase.normalize().scale(this.spec.reachM));
    this._tip = next;
    this._target = this._caught ? this._tip : this._target.add(this.drift.scale(dt));
  }

  /** The trigger: close the snares. */
  close(): CaptureTry {
    if (this._caught) return { ok: true };
    const d = this.distanceM;
    if (d > this.spec.envelopeM) return { ok: false, why: `Falla: el vástago está a ${fmt(d)} m; tiene que estar dentro del LEE (${fmt(this.spec.envelopeM)} m)` };
    if (this.closingMs > this.spec.closeSpeedMs) return { ok: false, why: `Falla: vas a ${fmt(this.closingMs)} m/s; suelta el mando y espera a ir a menos de ${fmt(this.spec.closeSpeedMs)} m/s` };
    this._caught = true;
    return { ok: true };
  }
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const fmt = (x: number) => (Math.round(x * 100) / 100).toLocaleString("es-ES");
