import { Vec3 } from "@core/math/vec3";
import { asanaTarget, COLD_SANCTUARY_CHEST_REST, FLOOR_REACH_BELOW, type AsanaData, type Reach, type ReachEnd } from "./asana";
import { settleBody } from "./body-solver";
import { lerp, lerpVec, slerp, smoothstep } from "./rotation";
import { JOINTS, type BodyPose, type BodyWorld, type JointId, type SkeletonSpec } from "./skeleton";
import { fromUnityPoint, type UnityVec } from "./unity-axes";

/**
 * A key of a repeated exercise movement, in Cold Sanctuary's convention (as an asana: Unity Euler angles per
 * joint, pelvis height, stance) and its reaches. A reach `en: "cuerpo"` is a point fixed in the body frame (a
 * pedal, a handlebar), in metres with Unity's axes; `en: "pecho"` follows the chest like the asanas' (the bar on
 * her shoulders); `en: "suelo"` rests on the floor.
 */
export interface MotionKey {
  readonly joints: AsanaData["joints"];
  readonly rootHeight: number | null;
  readonly stanceWidth: number | null;
  readonly reaches: readonly { readonly end: ReachEnd; readonly target: UnityVec; readonly en: "cuerpo" | "pecho" | "suelo" }[];
}

/**
 * An exercise on a machine (docs/design/equipos.md): a cycle of keys played round and round on the skeleton of
 * src/modules/body, each machine with its own (running on the T2, pedalling the CEVIS, squats on the ARED).
 */
export interface ExerciseMotionData {
  readonly id: string;
  readonly name: string;
  /** The ISS machine it is done on. */
  readonly device: "cinta" | "bicicleta" | "fuerza";
  readonly source: string;
  /** Seconds of one cycle at the normal pace. */
  readonly cycleS: number;
  /** The lowest point rests on the floor (the T2's harness, the ARED's platform); a seatless cycle is not grounded. */
  readonly grounded: boolean;
  /** `suave`: eases in and out of each key (a squat stops at the top and the bottom); `continuo`: an even flow. */
  readonly ease: "suave" | "continuo";
  readonly keys: readonly MotionKey[];
}

/** The keys as asanas, to reuse their target pose (asana.ts). */
const asAsana = (k: MotionKey): AsanaData => ({ id: "", name: "", source: "", joints: k.joints, rootHeight: k.rootHeight, stanceWidth: k.stanceWidth, reaches: [] });

function reachOf(r: MotionKey["reaches"][number]): Reach {
  const [x, y, z] = r.target;
  if (r.en === "cuerpo") return { end: r.end, onFloor: false, inBody: true, point: fromUnityPoint(r.target) };
  if (r.en === "suelo") return { end: r.end, onFloor: true, point: fromUnityPoint([x, Math.min(FLOOR_REACH_BELOW - 0.01, y), z]) };
  return { end: r.end, onFloor: false, point: fromUnityPoint([x, y - COLD_SANCTUARY_CHEST_REST, z]) };
}

function blend(a: BodyPose, b: BodyPose, t: number): BodyPose {
  const rot = {} as Record<JointId, BodyPose["rot"][JointId]>;
  for (const j of JOINTS) rot[j] = slerp(a.rot[j], b.rot[j], t);
  return { rot, pelvis: lerpVec(a.pelvis, b.pelvis, t), hipX: lerp(a.hipX, b.hipX, t) };
}

/** The body at `phase` (0…1, wrapping) of the motion: keys blended, reaches interpolated, solved. */
export function motionPose(spec: SkeletonSpec, m: ExerciseMotionData, phase: number): { pose: BodyPose; world: BodyWorld; reaches: readonly Reach[] } {
  const n = m.keys.length;
  const x = (((phase % 1) + 1) % 1) * n;
  const i = Math.floor(x) % n;
  const raw = x - Math.floor(x);
  const t = m.ease === "suave" ? smoothstep(raw) : raw;
  const a = m.keys[i]!;
  const b = m.keys[(i + 1) % n]!;
  const pose = blend(asanaTarget(spec, asAsana(a)), asanaTarget(spec, asAsana(b)), t);
  const reaches: Reach[] = [];
  for (const ra of a.reaches) {
    const rb = b.reaches.find((r) => r.end === ra.end && r.en === ra.en) ?? ra;
    const pa = reachOf(ra);
    const pb = reachOf(rb);
    reaches.push({ ...pa, point: lerpVec(pa.point, pb.point, t) });
  }
  const solved = settleBody(spec, pose, reaches, 1, { grounded: m.grounded });
  return { ...solved, reaches };
}

/**
 * Plays an exercise motion round and round: eases in from wherever the body was, then cycles at `pace` (1 = the
 * motion's own cycle; a solved step briefly pushes it, like a sprint interval).
 */
export class MotionPlayer {
  private clock = 0;
  private phaseNow = 0;
  private enter = 0;
  private last: { pose: BodyPose; world: BodyWorld };
  pace = 1;

  constructor(
    private readonly spec: SkeletonSpec,
    readonly motion: ExerciseMotionData,
    private from?: BodyPose,
    private readonly enterS = 0.8,
  ) {
    this.last = motionPose(spec, motion, 0);
  }

  /** Where in the cycle (0…1): the machine's moving parts follow it (the belt, the cranks, the bar). */
  get phase(): number {
    return this.phaseNow;
  }

  get body(): { readonly pose: BodyPose; readonly world: BodyWorld } {
    return this.last;
  }

  update(dt: number): { pose: BodyPose; world: BodyWorld } {
    this.clock += dt;
    this.enter = Math.min(1, this.enter + dt / this.enterS);
    this.phaseNow = (this.phaseNow + (dt * this.pace) / this.motion.cycleS) % 1;
    const now = motionPose(this.spec, this.motion, this.phaseNow);
    if (this.from && this.enter < 1) {
      const k = smoothstep(this.enter);
      this.last = { pose: blend(this.from, now.pose, k), world: now.world };
      return this.last;
    }
    this.from = undefined;
    this.last = now;
    return now;
  }
}

/** Distance between two body-frame points (for tests and the machines' sync). */
export const gap = (a: Vec3, b: Vec3): number => a.sub(b).length();
