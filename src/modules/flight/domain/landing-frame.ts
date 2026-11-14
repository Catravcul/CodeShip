import { Vec3 } from "@core/math/vec3";
import { CRASH_SPEED_MS, LANDING_SPEED_MS, MAX_LANDING_TILT_RAD } from "./contact";

/**
 * Landing indicators (docs/design/aterrizaje.md): where the craft is and how it moves relative to the
 * landing site, in a local frame the pilot can fly by, coloured against the contact limits of
 * `contact.ts`. Like the Apollo LM cross-pointer (forward and lateral velocity in the craft's own
 * axes) plus altitude and altitude rate, and the Dragon/ISS docking display (range, rate and attitude
 * with green inside the limits).
 *
 * Frame: Z is the local vertical (up, away from the body's centre); X is the craft's right and Y its
 * forward, both laid flat on the horizontal plane. With the belly on the ground X is the A/D thrust,
 * Y the W/S thrust and Z the R/F thrust.
 */
export interface LandingFrame {
  readonly right: Vec3;
  readonly forward: Vec3;
  readonly up: Vec3;
}

/**
 * The local frame at the craft. `up`: local vertical (unit). `bodyRight`, `bodyForward`, `bodyUp`:
 * the craft's +X, −Z and +Y in world. The craft's right is laid flat; if it points straight up or
 * down (rolled on its side) its up axis is used instead.
 */
export function landingFrame(up: Vec3, bodyRight: Vec3, bodyForward: Vec3, bodyUp: Vec3): LandingFrame {
  const flat = (v: Vec3) => v.sub(up.scale(v.dot(up)));
  let r = flat(bodyRight);
  if (r.length() < 0.2) {
    // Right axis along the vertical: take whichever other axis lies flattest as "forward".
    const f = flat(bodyForward).length() > flat(bodyUp).length() ? flat(bodyForward) : flat(bodyUp);
    r = f.normalize().cross(up);
  }
  const right = r.normalize();
  return { right, forward: up.cross(right), up };
}

/** A world vector in the landing frame (x right, y forward, z up). */
export function toLanding(frame: LandingFrame, v: Vec3): Vec3 {
  return new Vec3(v.dot(frame.right), v.dot(frame.forward), v.dot(frame.up));
}

/** Contact limits the readout colours against (from contact.ts: the same rules the physics applies). */
export const LANDING_LIMITS = {
  /** The legs (the probe's screw anchors too) hold below this total speed relative to the ground, m/s. */
  touchdownMs: LANDING_SPEED_MS,
  /** Above this the gear fails and the hull is damaged, m/s. */
  crashMs: CRASH_SPEED_MS,
  /** Belly tilt from the local vertical that still lands on the legs, degrees. */
  tiltDeg: (MAX_LANDING_TILT_RAD * 180) / Math.PI,
  /**
   * Readout game values: green up to this share of a limit, amber up to the limit, red beyond.
   * Like the Dragon display's green/amber/red bands round each docking limit.
   */
  okShare: 2 / 3,
  /** Share of the braking acceleration the safe-speed curve assumes (a margin, like the autopilot's 0,8). */
  brakeShare: 0.5,
  /** Below this clearance the touchdown limit applies as it is, m. */
  contactM: 1,
} as const;

export type Level = "ok" | "warn" | "bad";

const level = (value: number, limit: number): Level => (value <= limit * LANDING_LIMITS.okShare ? "ok" : value <= limit ? "warn" : "bad");

/**
 * Fastest speed toward the ground (or across it) that the craft can still null before touchdown with
 * `brakeMs2` (its RCS), plus the touchdown limit: √(2·a·share·h) + 0,10 m/s. At contact it is the
 * touchdown limit itself.
 */
export function safeSpeedMs(clearanceM: number, brakeMs2: number): number {
  const h = Math.max(0, clearanceM - LANDING_LIMITS.contactM);
  return LANDING_LIMITS.touchdownMs + Math.sqrt(2 * brakeMs2 * LANDING_LIMITS.brakeShare * h);
}

export interface LandingInput {
  readonly frame: LandingFrame;
  /** Craft position minus the site's position (world), m. */
  readonly offset: Vec3;
  /** Craft velocity relative to the ground under it (world), m/s. */
  readonly velocity: Vec3;
  /** Gap between legs (or hull) and ground, m. */
  readonly clearanceM: number;
  readonly tiltDeg: number;
  /** What the craft can brake with (its RCS translation), m/s². */
  readonly brakeMs2: number;
  /** Radius of the landing site, m: inside it the touchdown point is on target. */
  readonly siteRadiusM: number;
}

export interface LandingReadout {
  /** Position from the site: x right, y forward (m), z = clearance above the ground (m). */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Velocity relative to the ground in the same axes, m/s (vz < 0 descending). */
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly tiltDeg: number;
  /** Where it would touch down coasting as it goes (x, y from the site, m), if it is descending. */
  readonly touchdown?: { readonly x: number; readonly y: number; readonly inSite: boolean; readonly inS: number };
  /** Colour of each indicator against the limits. */
  readonly levels: { readonly vz: Level; readonly vh: Level; readonly tilt: Level; readonly site: Level };
  /** Worst of the speed and tilt levels: would it land now? */
  readonly verdict: Level;
  /** Fastest safe speed toward the ground here, m/s (for the label). */
  readonly safeMs: number;
}

const WORST: Record<Level, number> = { ok: 0, warn: 1, bad: 2 };
const worst = (...ls: Level[]): Level => ls.reduce((a, b) => (WORST[b] > WORST[a] ? b : a), "ok" as Level);
/** Predictions further ahead than this are noise, s. */
const MAX_PREDICT_S = 900;

/** The readout: local position and velocity, predicted touchdown and colours. Pure. */
export function landingReadout(i: LandingInput): LandingReadout {
  const p = toLanding(i.frame, i.offset);
  const v = toLanding(i.frame, i.velocity);
  const z = i.clearanceM;
  const safe = safeSpeedMs(z, i.brakeMs2);
  const vh = Math.hypot(v.x, v.y);
  // Descent: against the safe curve; climbing is never a danger.
  const vzLevel = v.z >= 0 ? "ok" : level(-v.z, safe);
  // Lateral: also has to fit the touchdown limit together with the descent; against the same curve.
  const vhLevel = level(vh, safe);
  const tilt = level(i.tiltDeg, LANDING_LIMITS.tiltDeg);
  // Near contact the total speed is what the legs feel.
  const total = Math.hypot(vh, v.z);
  const contact = z <= LANDING_LIMITS.contactM && v.z < 0 ? level(total, LANDING_LIMITS.touchdownMs) : "ok";
  let touchdown: LandingReadout["touchdown"];
  if (v.z < -1e-3) {
    const t = z / -v.z;
    if (t <= MAX_PREDICT_S) {
      const x = p.x + v.x * t;
      const y = p.y + v.y * t;
      touchdown = { x, y, inSite: Math.hypot(x, y) <= i.siteRadiusM, inS: t };
    }
  }
  const off = Math.hypot(p.x, p.y);
  const site: Level = off <= i.siteRadiusM ? "ok" : touchdown?.inSite ? "warn" : off <= Math.max(i.siteRadiusM * 4, z) ? "warn" : "bad";
  const crash = total >= LANDING_LIMITS.crashMs && z <= LANDING_LIMITS.contactM ? "bad" : "ok";
  return {
    x: p.x,
    y: p.y,
    z,
    vx: v.x,
    vy: v.y,
    vz: v.z,
    tiltDeg: i.tiltDeg,
    ...(touchdown ? { touchdown } : {}),
    levels: { vz: worst(vzLevel, contact), vh: worst(vhLevel, contact), tilt, site },
    verdict: worst(vzLevel, vhLevel, tilt, contact, crash),
    safeMs: safe,
  };
}
