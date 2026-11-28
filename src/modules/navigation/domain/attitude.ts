import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";

/** Orientation whose nose (body −z) points along `forward`, with body +y as close to `up` as possible. */
export function facing(forward: Vec3, up: Vec3 = Vec3.Y): Quat {
  const back = forward.normalize().scale(-1);
  let right = up.cross(back);
  if (right.length() < 1e-9) right = Vec3.X.cross(back);
  right = right.normalize();
  const u = back.cross(right);
  // Rotation matrix columns: right, up, back.
  const m00 = right.x, m01 = u.x, m02 = back.x;
  const m10 = right.y, m11 = u.y, m12 = back.y;
  const m20 = right.z, m21 = u.z, m22 = back.z;
  const tr = m00 + m11 + m22;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    return new Quat(0.25 * s, (m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s).normalize();
  }
  if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    return new Quat((m21 - m12) / s, 0.25 * s, (m01 + m10) / s, (m02 + m20) / s).normalize();
  }
  if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    return new Quat((m02 - m20) / s, (m01 + m10) / s, 0.25 * s, (m12 + m21) / s).normalize();
  }
  const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
  return new Quat((m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, 0.25 * s).normalize();
}

/** Angle between two orientations, rad. */
export function angleBetween(a: Quat, b: Quat): number {
  const d = Math.abs(a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z);
  return 2 * Math.acos(Math.min(1, d));
}

/** Turn `from` toward `to` by at most `maxRad` (the shorter way): an attitude slew at a capped rate. */
export function turnToward(from: Quat, to: Quat, maxRad: number): Quat {
  const angle = angleBetween(from, to);
  if (angle <= Math.max(0, maxRad) || angle < 1e-9) return to;
  const k = maxRad / angle;
  let dot = from.w * to.w + from.x * to.x + from.y * to.y + from.z * to.z;
  const s = dot < 0 ? -1 : 1;
  dot *= s;
  const theta = Math.acos(Math.min(1, dot));
  const sin = Math.sin(theta);
  const a = Math.sin((1 - k) * theta) / sin;
  const b = (s * Math.sin(k * theta)) / sin;
  return new Quat(a * from.w + b * to.w, a * from.x + b * to.x, a * from.y + b * to.y, a * from.z + b * to.z).normalize();
}

/**
 * Attitude as a display shows it (Crew Dragon's manual flight page: pitch, yaw, roll), degrees, against the
 * reference frame: yaw is the nose's heading round +y (0 along −z), pitch its elevation, roll the turn of
 * body +y about the nose from the frame's «up».
 */
export function attitudeDeg(q: Quat): { pitch: number; yaw: number; roll: number } {
  const deg = (r: number) => (r * 180) / Math.PI;
  const nose = q.rotate(new Vec3(0, 0, -1));
  const up = q.rotate(Vec3.Y);
  const pitch = Math.asin(Math.max(-1, Math.min(1, nose.y)));
  const yaw = Math.atan2(-nose.x, -nose.z);
  // The frame's level up and right for this nose (straight up or down: any heading is level, take −z).
  let right = nose.cross(Vec3.Y);
  if (right.length() < 1e-9) right = new Vec3(Math.cos(yaw), 0, -Math.sin(yaw));
  right = right.normalize();
  const levelUp = right.cross(nose).normalize();
  const roll = Math.atan2(-up.dot(right), up.dot(levelUp));
  return { pitch: deg(pitch), yaw: deg(yaw), roll: deg(roll) };
}
