import { Vec3 } from "@core/math/vec3";
import type { Quat } from "@core/math/quat";
import type { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { ThrustCommand } from "@modules/ship/domain/ship";

const DEG = 180 / Math.PI;

/**
 * Contact conditions a docking mechanism can latch within (IDSS IDD, "Initial Contact Conditions").
 * All must hold at the same time.
 */
export interface DockingLimits {
  readonly closingMinMs: number;
  readonly closingMaxMs: number;
  readonly lateralRateMs: number;
  /** Pitch/yaw rate (vector sum), deg/s. */
  readonly angularRateDegS: number;
  readonly rollRateDegS: number;
  readonly lateralMisalignM: number;
  /** Pitch/yaw misalignment (vector sum), deg. */
  readonly angularMisalignDeg: number;
  readonly rollMisalignDeg: number;
  readonly sources: readonly string[];
}

/** A docking port: its face, and the orientation a docked probe must have (probe +y = −normal). */
export interface PortPose {
  readonly position: Vec3;
  /** Outward axis of the port (the probe comes in against it). */
  readonly normal: Vec3;
  readonly orientation: Quat;
}

/**
 * Anything with a docking port a craft can latch to: the mothership, a station's ports. The
 * docking assist, the contact check and navigation work with this, not with a particular ship.
 */
export interface DockingTarget {
  readonly id: string;
  readonly name: string;
  /** The port in world space now. */
  readonly port: PortPose;
  /** Pose of a craft latched to the port (its port at `craftPortBody`), at rest with the target. */
  dockedPose(craftPortBody: Vec3): RigidBodyState;
}

/**
 * Where a craft carries its own docking port, body frame: the face, the outward axis and the
 * direction across the axis that must line up with the target port's `forward` (roll). The probe's
 * port looks up (+y) with its nose (−z) as forward; the mothership's looks ahead from its nose.
 */
export interface CraftPort {
  readonly position: Vec3;
  readonly axis: Vec3;
  readonly forward: Vec3;
}

/** How the probe's port sits relative to the mothership's port. */
export interface Alignment {
  /** Gap along the port axis between the two port faces, m (≤ 0 = touching). */
  readonly axialM: number;
  /** Offset across the axis, world vector and its size, m. */
  readonly lateral: Vec3;
  readonly lateralM: number;
  /** Speed toward the port along its axis, m/s (+ = approaching). */
  readonly closingMs: number;
  readonly lateralRateMs: number;
  /** Tilt of the probe's docking axis from the port axis (pitch/yaw), deg. */
  readonly misalignDeg: number;
  readonly rollDeg: number;
  readonly rateDegS: number;
  readonly rollRateDegS: number;
}

/** Measure the probe (port at `probePortBody`, axis body +y) against `port`. */
export function alignment(probe: RigidBodyState, probePortBody: Vec3, port: PortPose): Alignment {
  const q = probe.orientation;
  const p = probe.position.add(q.rotate(probePortBody));
  const n = port.normal;
  const rel = p.sub(port.position);
  const axialM = rel.dot(n);
  const lateral = rel.sub(n.scale(axialM));
  const wWorld = q.rotate(probe.angularVelocityBody);
  const v = probe.velocity.add(wWorld.cross(q.rotate(probePortBody)));
  const closingMs = -v.dot(n);
  const lateralRateMs = v.sub(n.scale(v.dot(n))).length();
  const up = q.rotate(Vec3.Y);
  const misalignDeg = Math.acos(Math.max(-1, Math.min(1, up.dot(n.scale(-1))))) * DEG;
  // Roll: the probe's nose against the port's forward, both projected across the axis.
  const flat = (d: Vec3) => d.sub(n.scale(d.dot(n)));
  const a = flat(q.rotate(new Vec3(0, 0, -1)));
  const b = flat(port.orientation.rotate(new Vec3(0, 0, -1)));
  const rollDeg = a.length() < 1e-9 || b.length() < 1e-9 ? 0 : Math.acos(Math.max(-1, Math.min(1, a.normalize().dot(b.normalize())))) * DEG;
  const w = probe.angularVelocityBody;
  return {
    axialM,
    lateral,
    lateralM: lateral.length(),
    closingMs,
    lateralRateMs,
    misalignDeg,
    rollDeg,
    rateDegS: Math.hypot(w.x, w.z) * DEG,
    rollRateDegS: Math.abs(w.y) * DEG,
  };
}

export interface ContactJudgement {
  readonly capture: boolean;
  /** What was out of limits, in Spanish for the HUD. */
  readonly failures: readonly string[];
}

const f2 = (v: number) => v.toFixed(2).replace(".", ",");
const f1 = (v: number) => v.toFixed(1).replace(".", ",");

/** Whether the latches catch at this contact (IDSS limits), and why not. */
export function judgeContact(a: Alignment, l: DockingLimits): ContactJudgement {
  const f: string[] = [];
  if (a.closingMs > l.closingMaxMs) f.push(`demasiado rápido: ${f2(a.closingMs)} m/s (máx. ${f2(l.closingMaxMs)})`);
  if (a.closingMs < l.closingMinMs) f.push(`demasiado lento para enganchar: ${f2(a.closingMs)} m/s (mín. ${f2(l.closingMinMs)})`);
  if (a.lateralRateMs > l.lateralRateMs) f.push(`deriva lateral ${f2(a.lateralRateMs)} m/s (máx. ${f2(l.lateralRateMs)})`);
  if (a.lateralM > l.lateralMisalignM) f.push(`desalineado ${f2(a.lateralM)} m (máx. ${f2(l.lateralMisalignM)})`);
  if (a.misalignDeg > l.angularMisalignDeg) f.push(`inclinado ${f1(a.misalignDeg)}° (máx. ${f1(l.angularMisalignDeg)}°)`);
  if (a.rollDeg > l.rollMisalignDeg) f.push(`girado ${f1(a.rollDeg)}° (máx. ${f1(l.rollMisalignDeg)}°)`);
  if (a.rateDegS > l.angularRateDegS) f.push(`cabeceo ${f2(a.rateDegS)}°/s (máx. ${f2(l.angularRateDegS)})`);
  if (a.rollRateDegS > l.rollRateDegS) f.push(`alabeo ${f2(a.rollRateDegS)}°/s (máx. ${f2(l.rollRateDegS)})`);
  return { capture: f.length === 0, failures: f };
}

/** What the probe's RCS can do, so the assist knows its own authority. */
export interface Authority {
  readonly inertiaKgM2: Vec3;
  /** Torque per body axis at full rotation command, N·m. */
  readonly maxTorque: Vec3;
  /** Acceleration per body axis at full translation command, m/s². */
  readonly maxAccel: Vec3;
}

/** Game tuning of the docking assist (like the landing assist's): how it flies the approach. */
export const DOCKING_ASSIST = {
  /** Aim speed for the contact, inside the IDSS range of 0.05–0.10 m/s. */
  contactSpeedMs: 0.07,
  /** Last stretch flown at contact speed, m. */
  finalM: 2,
  maxSpeedMs: 5,
  /** Share of the RCS acceleration the braking profile counts on. */
  brakeShare: 0.3,
  /** Off the axis by more than this (and this fraction of the range), it stops closing and centres first. */
  corridorM: 0.3,
  corridorShare: 0.15,
  /** Tilted by more than this, it holds still and turns first, deg. */
  turnFirstDeg: 8,
  /** Attitude controller time, s. */
  attitudeTimeS: 4,
  /** Velocity controller time, s. */
  velocityTimeS: 1.2,
} as const;

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * Closing speed the assist wants at `axialM` from the port: a braking profile that ends with the
 * last `finalM` at contact speed (inside the IDSS 0.05–0.10 m/s window). Shared by the probe's
 * assist and the mothership's berthing.
 */
export function approachSpeed(axialM: number, accelMs2: number, t = DOCKING_ASSIST): number {
  if (axialM <= t.finalM) return t.contactSpeedMs;
  return clamp(Math.sqrt(t.brakeShare * accelMs2 * (axialM - t.finalM)), t.contactSpeedMs, t.maxSpeedMs);
}

/**
 * Docking assist: turns the probe to the port's attitude, centres it on the port axis and closes
 * along it with a braking profile, arriving at about 0.07 m/s. Pure function of the state.
 */
export function dockingCommand(probe: RigidBodyState, probePortBody: Vec3, port: PortPose, auth: Authority, t = DOCKING_ASSIST): ThrustCommand {
  // --- Attitude: rotate onto the port orientation (PD, saturated by RCS torque).
  const qe = probe.orientation.conjugate().multiply(port.orientation).normalize();
  const sign = qe.w < 0 ? -1 : 1;
  const vec = new Vec3(qe.x * sign, qe.y * sign, qe.z * sign);
  const s = vec.length();
  const angle = 2 * Math.atan2(s, Math.abs(qe.w));
  const err = s < 1e-12 ? Vec3.ZERO : vec.scale(angle / s);
  const k = 2 / (t.attitudeTimeS * t.attitudeTimeS);
  const c = 2 / t.attitudeTimeS;
  const w = probe.angularVelocityBody;
  const I = auth.inertiaKgM2;
  const m = auth.maxTorque;
  const rot = (e: number, wi: number, Ii: number, mi: number) => (mi === 0 ? 0 : clamp(((k * e - c * wi) * Ii) / mi));
  const rotation = new Vec3(rot(err.x, w.x, I.x, m.x), rot(err.y, w.y, I.y, m.y), rot(err.z, w.z, I.z, m.z));

  // --- Translation: centre on the axis, then close with a braking profile.
  const a = alignment(probe, probePortBody, port);
  const n = port.normal;
  const accel = Math.min(auth.maxAccel.x, auth.maxAccel.y, auth.maxAccel.z);
  let closing: number;
  if (a.misalignDeg > t.turnFirstDeg) closing = 0;
  // Too slow too close to latch (e.g. just pushed back by the petals): back off a metre and try again.
  else if ((a.axialM < 0.3 && a.closingMs < t.contactSpeedMs * 0.6) || (a.axialM < 1 && a.closingMs < -0.01)) closing = -0.05;
  else if (a.axialM < 0.5) closing = a.axialM < -0.5 ? -0.3 : t.contactSpeedMs;
  else if (a.lateralM > Math.max(t.corridorM, a.axialM * t.corridorShare)) closing = a.axialM < 6 ? -0.05 : 0;
  else closing = approachSpeed(a.axialM, accel, t);
  // Below the port plane (behind or above the mothership): back out along the axis first.
  if (a.axialM < -0.5) closing = -0.3;
  // Lateral: approach the axis with the same kind of profile, softly at the end.
  const latDist = a.lateralM;
  const latSpeed = latDist < 1e-9 ? 0 : Math.min(t.maxSpeedMs, Math.sqrt(t.brakeShare * accel * latDist), latDist * 0.25);
  const latVel = latDist < 1e-9 ? Vec3.ZERO : a.lateral.scale(-latSpeed / latDist);
  const desired = n.scale(-closing).add(latVel);
  const errBody = probe.toBody(desired.sub(probe.velocity));
  const tr = (e: number, ai: number) => (ai === 0 ? 0 : clamp(e / (ai * t.velocityTimeS)));
  const translation = new Vec3(tr(errBody.x, auth.maxAccel.x), tr(errBody.y, auth.maxAccel.y), tr(errBody.z, auth.maxAccel.z));
  return { mainThrottle: 0, translation, rotation };
}
