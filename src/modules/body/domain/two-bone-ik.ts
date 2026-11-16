import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { between, slerp } from "./rotation";

export interface TwoBoneInput {
  /** Root (shoulder/hip), middle (elbow/knee) and end (hand/ankle) joints, in one frame. */
  readonly a: Vec3;
  readonly b: Vec3;
  readonly c: Vec3;
  readonly rootWorld: Quat;
  readonly midWorld: Quat;
  readonly target: Vec3;
  /** A point the elbow/knee bends toward. */
  readonly pole: Vec3;
  /** 0 = leave as it is, 1 = all the way (eases in with the breath). */
  readonly weight: number;
}

const clamp = (x: number) => Math.max(-1, Math.min(1, x));

/** The rotation from `from` to `to`: about `normal` within the plane, then the least rotation for what is left. */
function inPlane(from: Vec3, to: Vec3, normal: Vec3): Quat {
  const flat = from.sub(normal.scale(from.dot(normal)));
  if (flat.length() < 1e-6) return between(from, to);
  const goal = to.sub(normal.scale(to.dot(normal)));
  const u = flat.normalize();
  const v = goal.normalize();
  const turn = Quat.fromAxisAngle(normal, Math.atan2(u.cross(v).dot(normal), u.dot(v)));
  return between(turn.rotate(from), to).multiply(turn);
}

/**
 * Analytic two-bone IK (Cold Sanctuary's TwoBoneIK, the law of cosines): the elbow/knee goes where the
 * two bones meet with the end on the target, on the pole's side of the line from root to target; the
 * root and then the middle bone turn by the least rotation onto those directions. Building the answer
 * from the pole (instead of nudging the present bend, as the C# does) keeps it right whichever way the
 * pose had the joint bent. Returns the new world rotations of root and middle, blended by `weight`.
 */
export function twoBoneIk({ a, b, c, rootWorld, midWorld, target, pole, weight }: TwoBoneInput): { rootWorld: Quat; midWorld: Quat } {
  const keep = { rootWorld, midWorld };
  if (weight <= 0) return keep;
  const lab = b.sub(a).length();
  const lcb = c.sub(b).length();
  const at = target.sub(a);
  if (lab < 1e-6 || lcb < 1e-6 || at.length() < 1e-6) return keep;
  const dir = at.normalize();
  const lat = Math.max(Math.abs(lab - lcb) + 1e-4, Math.min(at.length(), lab + lcb - 1e-4));
  // Angle at the root between root→target and root→elbow.
  const cosA = clamp((lab * lab + lat * lat - lcb * lcb) / (2 * lab * lat));
  // The bend's side: the pole, minus its part along the line (or the present elbow if the pole is on it).
  const side = (p: Vec3) => p.sub(dir.scale(p.dot(dir)));
  let n = side(pole.sub(a));
  if (n.length() < 1e-6) n = side(b.sub(a));
  if (n.length() < 1e-6) n = side(Math.abs(dir.y) < 0.9 ? Vec3.Y : Vec3.X);
  n = n.normalize();
  const elbow = a.add(dir.scale(lab * cosA)).add(n.scale(lab * Math.sqrt(1 - cosA * cosA)));
  const end = a.add(dir.scale(lat));
  // Turns about the bend plane's normal first, so a bone that points the other way (a folded elbow)
  // turns the same way every frame; then the small rest, out of the plane.
  const normal = dir.cross(n).normalize();
  const turnRoot = inPlane(b.sub(a), elbow.sub(a), normal);
  const forearm = turnRoot.rotate(c.sub(b));
  const turnMid = inPlane(forearm, end.sub(elbow), normal);
  const newRoot = turnRoot.multiply(rootWorld);
  const newMid = turnMid.multiply(turnRoot).multiply(midWorld);
  return { rootWorld: slerp(rootWorld, newRoot, weight), midWorld: slerp(midWorld, newMid, weight) };
}
