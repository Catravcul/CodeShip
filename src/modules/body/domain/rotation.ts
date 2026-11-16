import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";

/** Spherical interpolation between two orientations, by the short way round. */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  let { w, x, y, z } = b;
  let cos = a.w * w + a.x * x + a.y * y + a.z * z;
  if (cos < 0) {
    cos = -cos;
    w = -w;
    x = -x;
    y = -y;
    z = -z;
  }
  if (cos > 0.9995) return new Quat(a.w + (w - a.w) * t, a.x + (x - a.x) * t, a.y + (y - a.y) * t, a.z + (z - a.z) * t).normalize();
  const th = Math.acos(cos);
  const s = Math.sin(th);
  const ka = Math.sin((1 - t) * th) / s;
  const kb = Math.sin(t * th) / s;
  return new Quat(a.w * ka + w * kb, a.x * ka + x * kb, a.y * ka + y * kb, a.z * ka + z * kb);
}

/** The rotation that turns direction `from` onto direction `to` (both non-zero). */
export function between(from: Vec3, to: Vec3): Quat {
  const a = from.normalize();
  const b = to.normalize();
  const d = Math.max(-1, Math.min(1, a.dot(b)));
  if (d > 1 - 1e-9) return Quat.IDENTITY;
  let axis = a.cross(b);
  if (axis.length() < 1e-9) axis = Math.abs(a.x) < 0.9 ? a.cross(Vec3.X) : a.cross(Vec3.Y);
  return Quat.fromAxisAngle(axis, Math.acos(d));
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => new Vec3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
/** Starts and stops gently, like Unity's Mathf.SmoothStep(0, 1, t) that Cold Sanctuary uses. */
export const smoothstep = (t: number): number => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};
