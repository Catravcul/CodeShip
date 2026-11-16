import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";

/**
 * The joints Cold Sanctuary's yoga poses (`BodyPart` in its BodyPosition.cs, the ones `CubeHumanoid`
 * builds): pelvis, two-piece spine, neck, head, scapulae, and shoulder → elbow → wrist, hip → knee → ankle.
 */
export const JOINTS = [
  "Hips", "Back", "Chest", "Neck", "Head",
  "ScapulaLeft", "ScapulaRight", "ShoulderLeft", "ShoulderRight", "ForearmLeft", "ForearmRight", "HandLeft", "HandRight",
  "ThighLeft", "ThighRight", "ShinLeft", "ShinRight", "FootLeft", "FootRight",
] as const;
export type JointId = (typeof JOINTS)[number];

/** A box hung from a joint (its size and centre in the joint's frame), for grounding. */
export interface SegmentBox {
  readonly size: Vec3;
  readonly center: Vec3;
}

export interface JointSpec {
  readonly id: JointId;
  readonly parent: JointId | null;
  /** Where the joint sits in its parent's frame, at rest (metres; the figure faces +Z, left is +X). */
  readonly pivot: Vec3;
  readonly box?: SegmentBox;
  /** Where the limb ends past this joint (fingertips, the ankle): the IK's end point. */
  readonly tip?: Vec3;
}

export interface SkeletonSpec {
  /** Parents before children. */
  readonly joints: readonly JointSpec[];
}

const v = (x: number, y: number, z: number) => new Vec3(x, y, z);
const box = (w: number, h: number, d: number, cy: number, cz = 0): SegmentBox => ({ size: v(w, h, d), center: v(0, cy, cz) });

function sides(make: (side: 1 | -1, s: "Left" | "Right") => JointSpec[]): JointSpec[] {
  return [...make(1, "Left"), ...make(-1, "Right")];
}

/**
 * Codeship's cube figure (`CubeFigure`, adapters/three/interior/figure.ts) as a skeleton, with Cold
 * Sanctuary's joints. The sizes are Codeship's, so she looks the same: pelvis 0,95 m up, torso
 * 0,5 m (now lumbar 0,24 + chest 0,26, as Cold Sanctuary splits it), arm 0,30 + 0,28, leg 0,44 + 0,42.
 */
export const CUBE_FIGURE: SkeletonSpec = {
  joints: [
    { id: "Hips", parent: null, pivot: v(0, 0.95, 0), box: box(0.34, 0.16, 0.2, 0) },
    { id: "Back", parent: "Hips", pivot: v(0, 0, 0), box: box(0.38, 0.24, 0.22, 0.17) },
    { id: "Chest", parent: "Back", pivot: v(0, 0.29, 0), box: box(0.38, 0.26, 0.22, 0.13) },
    { id: "Neck", parent: "Chest", pivot: v(0, 0.26, 0) },
    { id: "Head", parent: "Neck", pivot: v(0, 0.03, 0), box: box(0.22, 0.25, 0.22, 0.13) },
    ...sides((k, s) => [
      { id: `Scapula${s}`, parent: "Chest", pivot: v(0.08 * k, 0.23, 0) },
      { id: `Shoulder${s}`, parent: `Scapula${s}`, pivot: v(0.17 * k, 0, 0), box: box(0.11, 0.3, 0.11, -0.15) },
      { id: `Forearm${s}`, parent: `Shoulder${s}`, pivot: v(0, -0.3, 0), box: box(0.1, 0.28, 0.1, -0.14) },
      { id: `Hand${s}`, parent: `Forearm${s}`, pivot: v(0, -0.28, 0), tip: v(0, 0, 0) },
    ]),
    ...sides((k, s) => [
      { id: `Thigh${s}`, parent: "Hips", pivot: v(0.1 * k, -0.06, 0), box: box(0.14, 0.44, 0.14, -0.22) },
      { id: `Shin${s}`, parent: `Thigh${s}`, pivot: v(0, -0.44, 0), box: box(0.12, 0.42, 0.12, -0.21) },
      { id: `Foot${s}`, parent: `Shin${s}`, pivot: v(0, -0.42, 0), box: box(0.12, 0.06, 0.22, 0, 0.05), tip: v(0, -0.03, 0) },
    ]),
  ] as JointSpec[],
};

/** A body's pose: each joint's rotation in its parent, the pelvis position and the hips' half-width. */
export interface BodyPose {
  readonly rot: Readonly<Record<JointId, Quat>>;
  readonly pelvis: Vec3;
  /** Distance of each hip joint from the middle (Cold Sanctuary's `stanceWidth` moves it). */
  readonly hipX: number;
}

export interface JointWorld {
  readonly p: Vec3;
  readonly q: Quat;
}
export type BodyWorld = Readonly<Record<JointId, JointWorld>>;

const specOf = (spec: SkeletonSpec, id: JointId) => spec.joints.find((j) => j.id === id)!;

/** Standing still, every joint at rest. */
export function restBody(spec: SkeletonSpec): BodyPose {
  const rot = Object.fromEntries(JOINTS.map((j) => [j, Quat.IDENTITY])) as Record<JointId, Quat>;
  return { rot, pelvis: specOf(spec, "Hips").pivot, hipX: Math.abs(specOf(spec, "ThighLeft").pivot.x) };
}

/** Each joint's position and orientation in the body frame (feet on y = 0 at rest). */
export function forwardKinematics(spec: SkeletonSpec, body: BodyPose): BodyWorld {
  const out = {} as Record<JointId, JointWorld>;
  for (const j of spec.joints) {
    const local = body.rot[j.id];
    if (!j.parent) {
      out[j.id] = { p: body.pelvis, q: local };
      continue;
    }
    const parent = out[j.parent];
    const pivot = j.id === "ThighLeft" || j.id === "ThighRight" ? new Vec3(Math.sign(j.pivot.x) * body.hipX, j.pivot.y, j.pivot.z) : j.pivot;
    out[j.id] = { p: parent.p.add(parent.q.rotate(pivot)), q: parent.q.multiply(local) };
  }
  return out;
}

/** Where a limb ends (fingertips at the wrist joint, the sole under the ankle), in the body frame. */
export function tipOf(spec: SkeletonSpec, fk: BodyWorld, id: JointId): Vec3 {
  const w = fk[id];
  return w.p.add(w.q.rotate(specOf(spec, id).tip ?? Vec3.ZERO));
}

const CORNERS = [-0.5, 0.5].flatMap((x) => [-0.5, 0.5].flatMap((y) => [-0.5, 0.5].map((z) => new Vec3(x, y, z))));

/** The lowest corner of all the boxes (Cold Sanctuary's `Ground`: that corner rests on the floor). */
export function lowestPoint(spec: SkeletonSpec, fk: BodyWorld, skip?: ReadonlySet<JointId>): number {
  let low = Infinity;
  for (const j of spec.joints) {
    if (!j.box || skip?.has(j.id)) continue;
    const w = fk[j.id];
    for (const c of CORNERS) {
      const y = w.p.y + w.q.rotate(j.box.center.add(c.mul(j.box.size))).y;
      if (y < low) low = y;
    }
  }
  return low;
}
