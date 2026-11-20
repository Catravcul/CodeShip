import { Vec3 } from "@core/math/vec3";
import type { Reach, ReachEnd } from "./asana";
import { forwardKinematics, lowestPoint, type BodyPose, type BodyWorld, type JointId, type SkeletonSpec } from "./skeleton";
import { twoBoneIk } from "./two-bone-ik";

const CHAIN: Readonly<Record<ReachEnd, readonly [JointId, JointId, JointId]>> = {
  HandLeft: ["ShoulderLeft", "ForearmLeft", "HandLeft"],
  HandRight: ["ShoulderRight", "ForearmRight", "HandRight"],
  FootLeft: ["ThighLeft", "ShinLeft", "FootLeft"],
  FootRight: ["ThighRight", "ShinRight", "FootRight"],
};
const parentOf = (spec: SkeletonSpec, id: JointId) => spec.joints.find((j) => j.id === id)!.parent!;

const CORNERS = [-0.5, 0.5].flatMap((x) => [-0.5, 0.5].flatMap((y) => [-0.5, 0.5].map((z) => new Vec3(x, y, z))));

/** How far the box of joint `id` reaches below `y` (the corners of a slanted forearm or foot dip under the joint). */
function dipBelow(spec: SkeletonSpec, world: BodyWorld, id: JointId, y: number): number {
  const box = spec.joints.find((j) => j.id === id)!.box;
  if (!box) return 0;
  let low = Infinity;
  for (const c of CORNERS) low = Math.min(low, world[id].p.y + world[id].q.rotate(box.center.add(c.mul(box.size))).y);
  return Math.max(0, y - low);
}

/**
 * A floor point the limb can get to: Cold Sanctuary's targets are for its own proportions, so when one is
 * out of reach the point slides along the floor toward the shoulder (or hip) by what it is short. Not to
 * the exact edge of reach, which grows like a square root as the body lowers and would make the hand jump.
 */
function withinReach(spec: SkeletonSpec, world: BodyWorld, root: JointId, mid: JointId, end: JointId, t: Vec3): Vec3 {
  const a = world[root].p;
  const len = world[mid].p.sub(a).length() + world[end].p.sub(world[mid].p).length();
  const short = t.sub(a).length() - len;
  if (short <= 0) return t;
  const flat = new Vec3(a.x - t.x, 0, a.z - t.z);
  if (flat.length() < 1e-6) return t;
  return t.add(flat.normalize().scale(Math.min(flat.length(), short)));
}

/**
 * One reach: the limb's two bones turn so its end goes to the point (Cold Sanctuary's `Reach`). On the
 * floor, the point is where the palm (or sole) rests: the joint goes up by what its slanted box dips under
 * it, so the box lies on the floor instead of lifting the whole body when grounding.
 */
function reach(spec: SkeletonSpec, pose: BodyPose, world: BodyWorld, r: Reach, weight: number): BodyPose {
  const [root, mid, end] = CHAIN[r.end];
  const arm = r.end === "HandLeft" || r.end === "HandRight";
  const lift = r.onFloor ? dipBelow(spec, world, arm ? mid : end, world[end].p.y) : 0;
  const target = r.onFloor ? withinReach(spec, world, root, mid, end, new Vec3(r.point.x, Math.max(lift, 0.004), r.point.z)) : r.inBody ? r.point : world.Chest.p.add(world.Chest.q.rotate(r.point));
  // Elbows out and down (in the prayer they went into the torso otherwise); knees forward.
  const b = world[mid].p;
  const wanted = arm ? new Vec3(Math.sign(world[root].p.sub(world.Chest.p).x || 1) * 0.35, -0.2, 0) : new Vec3(0, 0, 0.3);
  // While the reach eases in, the elbow keeps the side the pose bent it to and turns toward the pole as
  // the weight grows (else, the moment the reach starts, the elbow would snap over to the pole's side).
  const line = world[end].p.sub(world[root].p).normalize();
  const bent = b.sub(world[root].p);
  const side = bent.sub(line.scale(bent.dot(line)));
  const now = side.length() > 0.02 ? side.normalize().scale(wanted.length()) : wanted;
  const k = Math.min(1, Math.max(0, weight));
  const pole = b.add(now.scale(1 - k).add(wanted.scale(k)));
  // Eased in by moving the target from where the hand is to the point (a blend of rotations would turn a
  // folded elbow the long way round now and then); the solve itself is always whole.
  if (weight <= 0) return pose;
  const c = world[end].p;
  const goal = c.add(target.sub(c).scale(Math.min(1, weight)));
  const out = twoBoneIk({ a: world[root].p, b, c, rootWorld: world[root].q, midWorld: world[mid].q, target: goal, pole, weight: 1 });
  const parent = world[parentOf(spec, root)].q;
  return {
    ...pose,
    rot: { ...pose.rot, [root]: parent.conjugate().multiply(out.rootWorld), [mid]: out.rootWorld.conjugate().multiply(out.midWorld) },
  };
}

const ground = (spec: SkeletonSpec, pose: BodyPose, world: BodyWorld, skip?: ReadonlySet<JointId>): BodyPose => ({ ...pose, pelvis: pose.pelvis.sub(new Vec3(0, lowestPoint(spec, world, skip), 0)) });

/**
 * A pose made real, after Cold Sanctuary's `AsanaPoseSpell.Apply`: the reaches to the body (palms
 * together…), then the lowest corner to the floor, then the reaches to the floor. Unlike the C#, the
 * grounding leaves out the limbs that are about to reach the floor (else a hand that hangs low in the
 * pose holds the body up and the feet float), and the floor reaches run twice because tilting a forearm
 * changes how far its box dips. A last grounding keeps everything above the floor.
 */
export function settleBody(spec: SkeletonSpec, pose: BodyPose, reaches: readonly Reach[], weight: number, opts: { grounded?: boolean } = {}): { pose: BodyPose; world: BodyWorld } {
  let p = pose;
  // Not grounded (pedalling a cycle with no seat in 0 g): the pelvis stays where the pose puts it and the limbs reach.
  if (opts.grounded === false) {
    let w = forwardKinematics(spec, p);
    for (const r of reaches) {
      p = reach(spec, p, w, r, weight);
      w = forwardKinematics(spec, p);
    }
    return { pose: p, world: w };
  }
  let w = forwardKinematics(spec, p);
  const floor = reaches.filter((r) => r.onFloor);
  for (const r of reaches) {
    if (r.onFloor) continue;
    p = reach(spec, p, w, r, weight);
    w = forwardKinematics(spec, p);
  }
  const skip = new Set<JointId>(floor.flatMap((r) => CHAIN[r.end]));
  p = ground(spec, p, w, skip);
  w = forwardKinematics(spec, p);
  for (let pass = 0; pass < (floor.length ? 2 : 0); pass++) {
    for (const r of floor) {
      p = reach(spec, p, w, r, weight);
      w = forwardKinematics(spec, p);
    }
  }
  p = ground(spec, p, w);
  return { pose: p, world: forwardKinematics(spec, p) };
}

/** How high each hand (the lowest corner of the forearm, where the palm is) and each sole is over the floor. */
export function contactHeights(spec: SkeletonSpec, world: BodyWorld): Record<ReachEnd, number> {
  const sole = (id: JointId) => {
    const j = spec.joints.find((x) => x.id === id)!;
    const box = j.box!;
    let low = Infinity;
    for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) low = Math.min(low, world[id].p.add(world[id].q.rotate(box.center.add(new Vec3(x, -0.5, z).mul(box.size)))).y);
    return low;
  };
  const palm = (forearm: JointId, hand: JointId) => world[hand].p.y - dipBelow(spec, world, forearm, world[hand].p.y);
  return { HandLeft: palm("ForearmLeft", "HandLeft"), HandRight: palm("ForearmRight", "HandRight"), FootLeft: sole("FootLeft"), FootRight: sole("FootRight") };
}
