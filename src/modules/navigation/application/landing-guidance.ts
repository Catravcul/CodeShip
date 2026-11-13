import { Vec3 } from "@core/math/vec3";
import type { FlightTarget, Guidance } from "@modules/flight/application/flight-computer";
import { reachToward } from "@modules/flight/domain/contact";
import { LANDING_LIMITS } from "@modules/flight/domain/landing-frame";
import type { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { Ship, ThrustCommand } from "@modules/ship/domain/ship";

/** What the descent guidance is doing, for the HUD and the trip chip. */
export type LandingPhase = "nivelar" | "trasladar" | "descender" | "frenar" | "posada" | "rebote";

/** Gains and limits of the descent guidance (game values; docs/design/aterrizaje.md). */
export const LANDING_GUIDANCE = {
  /** Clearance where the final, constant-speed descent starts, m (Apollo's «low gate» idea, scaled down). */
  flareM: 3,
  /** Descend only with the belly this close to the vertical, degrees. */
  holdTiltDeg: 12,
  /** Share of the RCS acceleration used to plan the braking curve. */
  brakeShare: LANDING_LIMITS.brakeShare,
  /** Fastest drift across the ground toward the site, m/s. */
  maxLateralMs: 0.5,
  /** Time constant of the lateral approach close to the site, s. */
  lateralTauS: 6,
  /** Velocity error removed in about this time with the RCS (proportional gain), s. */
  responseS: 0.6,
  /** Descend while the horizontal miss is within this share of the clearance (an approach cone). */
  coneShare: 1,
  /** …or within this, m. */
  coneMinM: 2,
  /** A rise after touching the ground faster than this is a bounce, m/s. */
  bounceMs: 0.015,
} as const;

/** The program the guidance flies (from the landing challenges; docs/design/aterrizaje.md). */
export interface DescentProgram {
  /** Where to land, in the body's own frame (it turns with the asteroid). */
  readonly siteLocal: Vec3;
  /** Final descent speed at touchdown, m/s. Above the 0,10 m/s limit it bounces. */
  readonly touchdownMs: number;
  /** Fastest descent, m/s. */
  readonly maxDescentMs: number;
}

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

export interface LandingGuidanceStatus {
  readonly phase: LandingPhase;
  /** Clearance above the ground, m. */
  readonly clearanceM: number;
  /** Horizontal miss from the site, m. */
  readonly missM: number;
  /** Speed relative to the ground, m/s. */
  readonly speedMs: number;
  /** Rough game seconds left. */
  readonly etaS: number;
}

/**
 * Autonomous descent to a site with the RCS only (the belly faces the ground, so the main engine is
 * sideways): level the belly, match the ground's motion and drift over the site, then come down on a
 * braking curve √(2·a·h) capped at `maxDescentMs`, and the last metres at `touchdownMs`. Velocity
 * tracking like the trip autopilot. The flight computer's landing assist does the levelling (the
 * guidance leaves rotation to it). It hands back (null) once anchored, or after a bounce.
 */
export class LandingGuidance implements Guidance {
  private touched = false;
  private _phase: LandingPhase = "nivelar";
  private _status: LandingGuidanceStatus;

  constructor(
    private readonly ship: Ship,
    private readonly target: FlightTarget,
    readonly program: DescentProgram,
    /** The flight computer is anchored to the ground now. */
    private readonly landed: () => boolean,
  ) {
    this._status = { phase: "nivelar", clearanceM: Infinity, missM: Infinity, speedMs: 0, etaS: Infinity };
  }

  get phase(): LandingPhase {
    return this._phase;
  }
  get status(): LandingGuidanceStatus {
    return this._status;
  }
  /** Ended: anchored or bounced. */
  get done(): boolean {
    return this._phase === "posada" || this._phase === "rebote";
  }

  /** RCS translation acceleration on each body axis, m/s². */
  private rcsAccel(): Vec3 {
    const m = this.ship.massKg;
    const a = (axis: Vec3) => Math.abs(this.ship.preview({ mainThrottle: 0, translation: axis, rotation: Vec3.ZERO }).forceBody.dot(axis)) / m;
    return new Vec3(a(Vec3.X), a(Vec3.Y), a(Vec3.Z));
  }

  siteWorld(timeS: number): Vec3 {
    return this.target.toWorld(this.program.siteLocal, timeS);
  }

  command(state: RigidBodyState, simTimeS: number): ThrustCommand | null {
    const G = LANDING_GUIDANCE;
    const pos = state.position;
    const up = pos.sub(this.target.position).normalize();
    const vRel = state.velocity.sub(this.target.surfaceVelocity(pos));
    const downBody = state.toBody(up.scale(-1));
    const reach = reachToward(this.ship.design.hull.size.scale(0.5), downBody);
    const clearance = this.target.surfaceDistance(pos, simTimeS) - reach;
    const vUp = vRel.dot(up);
    const flat = (v: Vec3) => v.sub(up.scale(v.dot(up)));
    const miss = flat(pos.sub(this.siteWorld(simTimeS)));
    const dist = miss.length();
    if (this.landed()) return this.finish("posada", clearance, dist, vRel.length());
    if (clearance < 0.08) this.touched = true;
    if (this.touched && vUp > G.bounceMs) return this.finish("rebote", clearance, dist, vRel.length());

    const a = this.rcsAccel();
    const aLat = Math.min(a.x, a.z) * G.brakeShare;
    const aUp = a.y * G.brakeShare;
    const tilt = (Math.acos(clamp(-downBody.y)) * 180) / Math.PI;

    // Across the ground: toward the site on a braking curve, gently at the end.
    const lateral = dist < 1e-3 ? 0 : Math.min(G.maxLateralMs, Math.sqrt(2 * aLat * dist), dist / G.lateralTauS);
    const vhWant = dist < 1e-3 ? Vec3.ZERO : miss.scale(-lateral / dist);
    // Down: only levelled and inside the approach cone over the site.
    const level = tilt <= G.holdTiltDeg;
    const inCone = dist <= Math.max(G.coneMinM, clearance * G.coneShare);
    const p = this.program;
    let vzWant = 0;
    let phase: LandingPhase;
    if (!level) phase = "nivelar";
    else if (!inCone) phase = "trasladar";
    else if (clearance > G.flareM) {
      vzWant = -Math.min(p.maxDescentMs, p.touchdownMs + Math.sqrt(2 * aUp * (clearance - G.flareM)));
      phase = "descender";
    } else {
      vzWant = -p.touchdownMs;
      phase = "frenar";
    }
    const err = vhWant.add(up.scale(vzWant)).sub(vRel);
    const b = state.toBody(err);
    const axis = (e: number, ai: number) => (ai === 0 ? 0 : clamp(e / (ai * G.responseS)));
    const translation = new Vec3(axis(b.x, a.x), axis(b.y, a.y), axis(b.z, a.z));
    this._phase = phase;
    const eta = Math.max(0, clearance - G.flareM) / Math.max(0.05, p.maxDescentMs) + G.flareM / Math.max(0.01, p.touchdownMs) + dist / G.maxLateralMs;
    this._status = { phase, clearanceM: Math.max(0, clearance), missM: dist, speedMs: vRel.length(), etaS: eta };
    // Rotation stays with the landing assist (it levels the belly whenever the rotation command is idle).
    return { mainThrottle: 0, translation, rotation: Vec3.ZERO };
  }

  private finish(phase: "posada" | "rebote", clearance: number, miss: number, speed: number): null {
    this._phase = phase;
    this._status = { phase, clearanceM: Math.max(0, clearance), missM: miss, speedMs: speed, etaS: 0 };
    return null;
  }
}
