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
