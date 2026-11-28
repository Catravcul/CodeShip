import { Vec3 } from "@core/math/vec3";
import type { ThrustCommand } from "@modules/ship/domain/ship";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { num } from "@modules/navigation/application/trip-chore";
import { LANDING_SPEED_MS, MAX_LANDING_TILT_RAD } from "@modules/flight/domain/contact";
import { RcsPad, type RcsCell } from "./ui/rcs-pad";

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
  /** Over a body, in its landing zone, with a landing by program possible: «Pasar a automático» on the pad. */
  landingOffer(): boolean;
  /** «Pasar a automático»: the landing by program (its challenge), the automatic mode near the ground. */
  toAuto(): void;
  /** «Cámara»: the flight view's next camera (cockpit, ventral, chase). */
  camera(): void;
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
      screen: { w: 340, h: 112 },
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
      auto: () => d.toAuto(),
      camera: () => d.camera(),
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
    const t = this.d.flight.telemetry();
    this.pad.setFlying(!t.landed);
    const w = t.angularVelocityBody.scale(1 / RAD);
    const sn = (v: number, d: number) => `${v < -0.5 * 10 ** -d ? "−" : "+"}${Math.abs(v).toFixed(d).replace(".", ",")}`;
    // Near the ground (under 30 m) the touchdown limits colour the numbers (reglas.md §5.6): ✓ inside, ▲ out.
    const low = t.clearance < 30 && !t.landed;
    const vRel = t.relativeVelocityBody;
    const drift = Math.hypot(vRel.x, vRel.z);
    const lim = (v: number, max: number): RcsCell => (low ? { text: "", ok: Math.abs(v) <= max } : { text: "" });
    const withText = (c: RcsCell, text: string): RcsCell => ({ ...c, text });
    const att = lmAttitude(t.upBody);
    this.pad.setExtra(this.d.dockOffer());
    this.pad.setAuto(this.d.landingOffer());
    this.pad.update({
      title: "Módulo lunar · a mano",
      head: ["cab.", "guiñ.", "alab."],
      rows: [
        { label: "°/s", cells: [w.x, w.y, w.z].map((r): RcsCell => ({ text: sn(r, 1) })) },
      ],
      lines: [
        { label: "Inclinación", cells: [withText(lim(t.tiltDeg, (MAX_LANDING_TILT_RAD * 180) / Math.PI), `${num(t.tiltDeg, 0)}° (cab. ${sn(att.pitch, 0)}°, alab. ${sn(att.roll, 0)}°)`)] },
        { label: "Bajada", cells: [withText(lim(-t.closingSpeed, LANDING_SPEED_MS), `${sn(-t.closingSpeed, 2)} m/s`), withText(lim(drift, LANDING_SPEED_MS), `deriva ${num(drift, 2)} m/s`)] },
        `Motor de descenso ${Math.round(this.throttle * 100)} % · Δv ${num(t.deltaV, 0)} m/s`,
      ],
    });
    const sc = this.pad.screen();
    if (sc) drawLmInstruments(sc.g, sc.w, sc.h, { att, ratesDegS: w, forwardMs: -vRel.z, lateralMs: vRel.x, altitudeM: Math.max(0, t.clearance), altRateMs: -t.closingSpeed });
  }
}

/** Pitch of the nose over the local horizon and roll about it, degrees, from local up in the craft's frame (the FDAI's ball). */
export function lmAttitude(upBody: { x: number; y: number; z: number }): { pitch: number; roll: number } {
  const l = Math.hypot(upBody.x, upBody.y, upBody.z) || 1;
  const u = { x: upBody.x / l, y: upBody.y / l, z: upBody.z / l };
  // The nose is body −z: its height over the horizon is −u.z; rolled right, local up leans to the craft's left (−x).
  return { pitch: (Math.asin(Math.max(-1, Math.min(1, -u.z))) * 180) / Math.PI, roll: (Math.atan2(-u.x, u.y) * 180) / Math.PI };
}

/**
 * The LM's flight instruments for Manual, as on its panel 1 (lm-instruments.ts, docs/design/cabina-lm.md): the FDAI
 * «8-ball» (white sky, black ground) with its three error needles (roll on top, pitch on the right, yaw at the
 * bottom: here the error from upright, and the yaw rate), the cross-pointer of forward and lateral velocity over
 * the ground (±2 m/s), and the ALT and ALT RATE tapes.
 */
export function drawLmInstruments(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  r: { att: { pitch: number; roll: number }; ratesDegS: { x: number; y: number; z: number }; forwardMs: number; lateralMs: number; altitudeM: number; altRateMs: number },
): void {
  g.fillStyle = "#1c2024";
  g.fillRect(0, 0, w, h);
  g.font = "9px monospace";
  // FDAI.
  const R = 46, bx = 52, by = 52;
  g.save();
  g.beginPath();
  g.arc(bx, by, R, 0, Math.PI * 2);
  g.clip();
  g.translate(bx, by);
  g.rotate((-r.att.roll * Math.PI) / 180);
  const off = (r.att.pitch / 90) * R;
  g.fillStyle = "#e9e9e4";
  g.fillRect(-2 * R, -2 * R + off, 4 * R, 2 * R);
  g.fillStyle = "#1b1b1b";
  g.fillRect(-2 * R, off, 4 * R, 2 * R);
  g.strokeStyle = "#ff8a2a";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-2 * R, off);
  g.lineTo(2 * R, off);
  g.stroke();
  g.lineWidth = 1;
  for (const p of [-60, -30, 30, 60]) {
    const y = off - (p / 90) * R;
    g.strokeStyle = p > 0 ? "#555" : "#bbb";
    g.beginPath();
    g.moveTo(-R * 0.4, y);
    g.lineTo(R * 0.4, y);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = "#9aa4ae";
  g.beginPath();
  g.arc(bx, by, R, 0, Math.PI * 2);
  g.stroke();
  // The craft's fixed wings in the middle.
  g.strokeStyle = "#ffd23f";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(bx - 18, by);
  g.lineTo(bx - 6, by);
  g.moveTo(bx + 6, by);
  g.lineTo(bx + 18, by);
  g.stroke();
  // Error needles, full scale 15°: roll on top, pitch on the right; the yaw rate at the bottom (±5 °/s).
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  g.strokeStyle = "#ff5a3a";
  g.lineWidth = 2;
  const rx = bx + clamp(r.att.roll / 15) * R * 0.7;
  const py = by - clamp(r.att.pitch / 15) * R * 0.7;
  const yx = bx + clamp(r.ratesDegS.y / 5) * R * 0.7;
  g.beginPath();
  g.moveTo(rx, by - R);
  g.lineTo(rx, by - R + 12);
  g.moveTo(bx + R, py);
  g.lineTo(bx + R - 12, py);
  g.moveTo(yx, by + R);
  g.lineTo(yx, by + R - 12);
  g.stroke();
  g.fillStyle = "#c9ccce";
  g.fillText("FDAI", bx - 10, h - 2);
  // Cross-pointer.
  const cx = 150, cy = 50, C = 38;
  g.fillStyle = "#08090a";
  g.fillRect(cx - C, cy - C, 2 * C, 2 * C);
  g.strokeStyle = "#555";
  g.lineWidth = 1;
  g.strokeRect(cx - C, cy - C, 2 * C, 2 * C);
  g.strokeStyle = "#f2f2f2";
  g.lineWidth = 2;
  const lx = cx + clamp(r.lateralMs / 2) * C;
  const fy = cy - clamp(r.forwardMs / 2) * C;
  g.beginPath();
  g.moveTo(lx, cy - C);
  g.lineTo(lx, cy + C);
  g.moveTo(cx - C, fy);
  g.lineTo(cx + C, fy);
  g.stroke();
  g.fillStyle = "#c9ccce";
  g.fillText("X-POINTER ±2", cx - 32, h - 2);
  // ALT and ALT RATE tapes: the scale moves past the fixed index.
  const tape = (x: number, label: string, v: number, step: number, fmt: (v: number) => string) => {
    const tw = 62, top = 4, th = h - 18;
    g.fillStyle = "#08090a";
    g.fillRect(x, top, tw, th);
    g.save();
    g.beginPath();
    g.rect(x, top, tw, th);
    g.clip();
    g.strokeStyle = "#888";
    g.fillStyle = "#c9ccce";
    const mid = top + th / 2;
    const px = 22 / step;
    const first = Math.floor((v - (th / 2) / px) / step) * step;
    for (let i = 0, k = first; Number.isFinite(v) && i < 12; i++, k += step) {
      const y = mid - (k - v) * px;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 8, y);
      g.stroke();
      g.fillText(fmt(k), x + 11, y + 3);
    }
    g.restore();
    g.fillStyle = "#e9e9e4";
    g.fillRect(x + 2, mid - 8, tw - 4, 16);
    g.fillStyle = "#111";
    g.font = "bold 10px monospace";
    g.fillText(fmt(v), x + 5, mid + 4);
    g.font = "9px monospace";
    g.fillStyle = "#c9ccce";
    g.fillText(label, x + 2, h - 2);
  };
  const altStep = r.altitudeM > 500 ? 100 : r.altitudeM > 50 ? 10 : 1;
  tape(200, "ALT m", Math.min(99999, r.altitudeM), altStep, (v) => `${Math.round(v)}`);
  tape(270, "ALT RT m/s", r.altRateMs, Math.abs(r.altRateMs) > 5 ? 5 : 0.5, (v) => v.toFixed(1).replace(".", ","));
}
