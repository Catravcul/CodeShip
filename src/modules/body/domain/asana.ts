import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { UnityVec } from "./unity-axes";
import { fromUnityEuler, fromUnityPoint } from "./unity-axes";
import { JOINTS, restBody, type BodyPose, type JointId, type SkeletonSpec } from "./skeleton";

export type ReachEnd = "HandLeft" | "HandRight" | "FootLeft" | "FootRight";

/**
 * A posture as Cold Sanctuary's `AsanaPoseSpell` holds it (YogaSpells.cs), in Unity's convention:
 * local Euler angles in degrees per joint (the ones not named go back to standing), the pelvis height
 * (`rootHeight`, null = standing), the distance between the feet (`stanceWidth`, null = leave it) and
 * the IK reaches (a hand or foot to a point of the body: palms together, ten fingers on the floor).
 */
export interface AsanaData {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly joints: Readonly<Partial<Record<JointId, UnityVec>>>;
  readonly rootHeight: number | null;
  readonly stanceWidth: number | null;
  readonly reaches: readonly { readonly end: ReachEnd; readonly target: UnityVec }[];
}

/** A sequence: its asanas in order, each held `phases` breath phases (arriving included). */
export interface AsanaSequenceData {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly steps: readonly { readonly asana: string; readonly label: string; readonly phases: number }[];
}

/** Cold Sanctuary's chest pivot standing (`AsanaPoseSpell.ChestRest`): reaches above 0,3 m follow the chest. */
export const COLD_SANCTUARY_CHEST_REST = 1.29;
/** Below this height a reach is a fixed point on the floor (Cold Sanctuary: `localTarget.y < 0.3f`). */
export const FLOOR_REACH_BELOW = 0.3;

/** Where a reach aims, in the body frame (floor reaches) or in the chest's frame (the rest). */
export interface Reach {
  readonly end: ReachEnd;
  readonly onFloor: boolean;
  readonly point: Vec3;
}

export function reachesOf(a: AsanaData): Reach[] {
  return a.reaches.map(({ end, target }) => {
    const onFloor = target[1] < FLOOR_REACH_BELOW;
    const point = fromUnityPoint(onFloor ? target : [target[0], target[1] - COLD_SANCTUARY_CHEST_REST, target[2]]);
    return { end, onFloor, point };
  });
}

/** The pose an asana asks for, before IK and grounding: its joint rotations, pelvis height and stance. */
export function asanaTarget(spec: SkeletonSpec, a: AsanaData): BodyPose {
  const rest = restBody(spec);
  const rot = {} as Record<JointId, Quat>;
  for (const j of JOINTS) {
    const e = a.joints[j];
    rot[j] = e ? fromUnityEuler(e) : Quat.IDENTITY;
  }
  // "Heels together" is legs side by side, not in the same place (YogaSpells.cs, Stance).
  const thigh = spec.joints.find((j) => j.id === "ThighLeft")!;
  const minHip = (thigh.box?.size.x ?? 0.14) / 2 + 0.005;
  const hipX = a.stanceWidth === null ? rest.hipX : Math.max(minHip, a.stanceWidth / 2);
  return { rot, pelvis: new Vec3(rest.pelvis.x, a.rootHeight ?? rest.pelvis.y, rest.pelvis.z), hipX };
}
