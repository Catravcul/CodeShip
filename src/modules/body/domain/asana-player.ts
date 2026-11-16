import { asanaTarget, reachesOf, type AsanaData, type Reach } from "./asana";
import { settleBody } from "./body-solver";
import { lerp, lerpVec, slerp, smoothstep } from "./rotation";
import { JOINTS, restBody, type BodyPose, type BodyWorld, type JointId, type SkeletonSpec } from "./skeleton";
import { fromUnityEuler } from "./unity-axes";

/** One breath phase, inhale or exhale (Cold Sanctuary, `SunSalutation.Breath`; docs/yoga-asanas-spec.md). */
export const BREATH_PHASE_S = 8;

export interface AsanaPlayerOptions {
  /** Seconds to move into a new asana. Cold Sanctuary takes a whole phase (8 s); a game step is shorter. */
  readonly transitionS?: number;
  readonly phaseS?: number;
}

/** Seconds between solves while an asana is held (20 Hz). */
const HELD_SOLVE_S = 0.05;

/** How much a full breath moves the body (degrees, Unity convention): the chest opens, the shoulders rise. */
const BREATH = { chestX: -3, scapulaZ: 4 } as const;

function blend(a: BodyPose, b: BodyPose, t: number): BodyPose {
  const rot = {} as Record<JointId, BodyPose["rot"][JointId]>;
  for (const j of JOINTS) rot[j] = slerp(a.rot[j], b.rot[j], t);
  return { rot, pelvis: lerpVec(a.pelvis, b.pelvis, t), hipX: lerp(a.hipX, b.hipX, t) };
}

/** The breath on top of a pose (`full` 0…1); a negative `full` takes it off again. */
function breathe(p: BodyPose, full: number): BodyPose {
  if (full === 0) return p;
  const rot = { ...p.rot };
  rot.Chest = rot.Chest.multiply(fromUnityEuler([BREATH.chestX * full, 0, 0]));
  rot.ScapulaLeft = rot.ScapulaLeft.multiply(fromUnityEuler([0, 0, BREATH.scapulaZ * full]));
  rot.ScapulaRight = rot.ScapulaRight.multiply(fromUnityEuler([0, 0, -BREATH.scapulaZ * full]));
  return { ...p, rot };
}

/**
 * Plays asanas on a skeleton, like Cold Sanctuary's `AsanaPoseSpell.Tick`: from wherever the body is, it
 * eases (smoothstep) into the next asana's rotations, pelvis and stance, the IK reaches weighing in as it
 * arrives, and the body always rests on the floor. Meanwhile it breathes, one phase in, one phase out.
 */
export class AsanaPlayer {
  private readonly transitionS: number;
  private readonly phaseS: number;
  private from: BodyPose;
  private target: BodyPose;
  private reaches: readonly Reach[] = [];
  private current?: AsanaData;
  private elapsed = 0;
  private clock = 0;
  private full = 0;
  private sinceSolve = Infinity;
  private last: { pose: BodyPose; world: BodyWorld };

  constructor(
    private readonly spec: SkeletonSpec,
    opts: AsanaPlayerOptions = {},
  ) {
    this.transitionS = opts.transitionS ?? 3;
    this.phaseS = opts.phaseS ?? BREATH_PHASE_S;
    this.from = this.target = restBody(spec);
    this.last = settleBody(spec, this.target, [], 1);
  }

  get asana(): AsanaData | undefined {
    return this.current;
  }

  /** The asana is fully in place (its transition is over). */
  get arrived(): boolean {
    return this.elapsed >= this.transitionS;
  }

  /** Inhale or exhale, by the breath clock. */
  get phase(): "inhala" | "exhala" {
    return Math.floor(this.clock / this.phaseS) % 2 === 0 ? "inhala" : "exhala";
  }

  /** The last solved body (pose and joint positions in the body frame). */
  get body(): { readonly pose: BodyPose; readonly world: BodyWorld } {
    return this.last;
  }

  play(a: AsanaData): void {
    this.begin(asanaTarget(this.spec, a), reachesOf(a));
    this.current = a;
  }

  /** Back to standing. */
  stop(): void {
    this.begin(restBody(this.spec), []);
    this.current = undefined;
  }

  /** Starts from a pose set elsewhere (the figure's other gestures), without a jump. */
  startFrom(p: BodyPose): void {
    this.from = p;
    this.last = settleBody(this.spec, p, [], 1);
  }

  update(dt: number): { pose: BodyPose; world: BodyWorld } {
    this.elapsed += dt;
    this.clock += dt;
    // Held in the asana, only the breath moves (a centimetre in 8 s): solving 20 times a second is enough.
    this.sinceSolve += dt;
    if (this.elapsed > this.transitionS && this.sinceSolve < HELD_SOLVE_S) return this.last;
    this.sinceSolve = 0;
    const t = smoothstep(this.elapsed / this.transitionS);
    // 0 → 1 over the inhale, back to 0 over the exhale.
    this.full = (1 - Math.cos((Math.PI * this.clock) / this.phaseS)) / 2;
    const pose = breathe(blend(this.from, this.target, t), this.full);
    // The reaches weigh in over the second part of the move, once the joints have brought the hand close
    // (from the start, the hand cuts across while the arm still points elsewhere, and the elbow flails).
    this.last = settleBody(this.spec, pose, this.reaches, smoothstep((t - 0.4) / 0.6));
    return this.last;
  }

  private begin(target: BodyPose, reaches: readonly Reach[]): void {
    this.sinceSolve = Infinity;
    // From where the body is, without the breath (it is added again on top, every frame).
    this.from = breathe(this.last.pose, -this.full);
    this.target = target;
    this.reaches = reaches;
    this.elapsed = 0;
  }
}
