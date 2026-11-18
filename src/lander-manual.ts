import { Vec3 } from "@core/math/vec3";
import type { ThrustCommand } from "@modules/ship/domain/ship";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { attitudeDeg } from "@modules/navigation/domain/attitude";
import { num } from "@modules/navigation/application/trip-chore";
import { RcsPad } from "./ui/rcs-pad";

/**
 * The LM's «Manual» (Berón, 2026-11-18): the same tap controls as Starship's (Crew Dragon's manual flight), on the
 * Apollo LM's own two hand controllers: the rotation hand controller (ACA) in rate command, each tap a rate step
 * the RCS then holds, and the thrust/translation controller (TTCA): translation taps of a small Δv, and the
 * descent engine's throttle (10–60 % and full on the real DPS; here 10 % steps). Values are ours.
 */
export const LM_TAPS = {
  /** Δv per translation tap, m/s. */
  stepMs: 0.1,
  /** Rate change per rotation tap, °/s. */
  rateStepDegS: 1,
  /** Top rate by taps, °/s. */
  maxRateDegS: 10,
  /** Throttle step of the descent engine. */
  throttleStep: 0.1,
} as const;

export interface LanderManualDeps {
  readonly flight: FlightComputer;
  /** She is at the LM's controls, flying it herself (cockpit view, free, no autopilot). */
  active(): boolean;
  standUp(): void;
  /** Inside a port's reach, «Acoplar» (the docking assist), if so. */
  dockOffer(): string | undefined;
  dock(): void;
  /** Height over the ground, m, if over a body. */
  heightM(): number | undefined;
}

const RAD = Math.PI / 180;

export class LanderManual {
  private readonly pad: RcsPad;
  private rates = Vec3.ZERO;
  private throttle = 0;

  constructor(root: HTMLElement, private readonly d: LanderManualDeps) {
    this.pad = new RcsPad(root, {
      cls: "lander-pad",
      throttle: true,
      endLabel: "Dejar",
      note: "Mandos del LM de Apolo (ACA de giro y TTCA de traslación y empuje), con los toques de Crew Dragon: pasos nuestros",
      translate: (a, s) => d.flight.pulse(new Vec3(a === "x" ? s : 0, a === "y" ? s : 0, a === "z" ? s : 0).scale(LM_TAPS.stepMs)),
      rotate: (a, s) => {
        const max = LM_TAPS.maxRateDegS * RAD;
        const next = Math.max(-max, Math.min(max, this.rates[a] + s * LM_TAPS.rateStepDegS * RAD));
        this.rates = new Vec3(a === "x" ? next : this.rates.x, a === "y" ? next : this.rates.y, a === "z" ? next : this.rates.z);
        d.flight.holdRates = this.rates;
      },
      stop: () => {
        this.rates = Vec3.ZERO;
        this.throttle = 0;
        d.flight.nullRates();
      },
      end: () => d.standUp(),
      throttleStep: (s) => (this.throttle = s === 0 ? 0 : Math.max(0, Math.min(1, Math.round((this.throttle + s * LM_TAPS.throttleStep) * 10) / 10))),
      extra: () => d.dock(),
    });
  }

  /** The pilot's command from the pad this frame: the descent engine's throttle (taps go through the flight computer). */
  command(): ThrustCommand {
    return { mainThrottle: this.pad.visible ? this.throttle : 0, translation: Vec3.ZERO, rotation: Vec3.ZERO };
  }

  /** Once a frame: show the pad at the controls and refresh its display. */
  update(): void {
    const on = this.d.active();
    if (on !== this.pad.visible) {
      this.pad.show(on);
      // Out of the pad's hands (autopilot, docked, out of the seat): the usual assists; the engine off.
      if (!on) {
        this.d.flight.holdRates = null;
        this.rates = Vec3.ZERO;
        this.throttle = 0;
      } else this.d.flight.holdRates = this.rates;
    }
    if (!on) return;
    const s = this.d.flight.state;
    const t = this.d.flight.telemetry();
    const h = this.d.heightM();
    const w = t.angularVelocityBody.scale(1 / RAD);
    this.pad.setExtra(this.d.dockOffer());
    this.pad.update({
      title: "Módulo lunar · a mano",
      vBody: t.relativeVelocityBody,
      att: attitudeDeg(s.orientation),
      rates: { x: w.x, y: w.y, z: w.z },
      lines: [`Motor de descenso ${Math.round(this.throttle * 100)} % · Δv ${num(t.deltaV, 0)} m/s${h !== undefined && Number.isFinite(h) ? ` · altura ${num(h, h < 100 ? 1 : 0)} m` : ""}`],
    });
  }
}
