import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";

/** A vector in Unity's convention, as Cold Sanctuary writes it: [x right, y up, z forward]. */
export type UnityVec = readonly [number, number, number];

const DEG = Math.PI / 180;

/**
 * Unity (left-handed, X right) to Codeship's body frame (right-handed, Y up, the figure faces +Z so
 * its left is +X). Both have Y up and Z forward, so the change of basis is the mirror M = diag(−1, 1, 1).
 */
export const fromUnityPoint = ([x, y, z]: UnityVec): Vec3 => new Vec3(-x, y, z);

/**
 * Unity's `Quaternion.Euler(x, y, z)` (degrees; Z first, then X, then Y about the parent's axes) in
 * Codeship's frame: M·R·M keeps the rotation about X and turns those about Y and Z the other way.
 */
export function fromUnityEuler([x, y, z]: UnityVec): Quat {
  const qy = Quat.fromAxisAngle(Vec3.Y, -y * DEG);
  const qx = Quat.fromAxisAngle(Vec3.X, x * DEG);
  const qz = Quat.fromAxisAngle(Vec3.Z, -z * DEG);
  return qy.multiply(qx).multiply(qz);
}
