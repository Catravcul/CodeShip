import * as THREE from "three";
import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { AsanaData, ReachEnd } from "@modules/body/domain/asana";
import { AsanaPlayer } from "@modules/body/domain/asana-player";
import { MotionPlayer, type ExerciseMotionData } from "@modules/body/domain/exercise-motion";
import { contactHeights } from "@modules/body/domain/body-solver";
import { CUBE_FIGURE, JOINTS, type BodyPose, type JointId } from "@modules/body/domain/skeleton";

/** Joint angles (radians) of the cube figure. Figure faces +Z; limbs hang along −Y from their pivot. */
export interface PoseAngles {
  rootY: number; // pelvis height
  rootX: number; // whole-body pitch (π/2 = lying face down)
  torso: number; // + bends forward, − arches back
  headX: number;
  headY: number;
  headZ: number;
  shoulderX: [number, number]; // − raises the arm forward/up
  shoulderZ: [number, number]; // opens (+ for left, − for right)
  elbow: [number, number]; // − bends the forearm forward
  hip: [number, number]; // − leg forward, + leg back
  knee: [number, number]; // + bends the knee
}

const STAND: PoseAngles = { rootY: 0.95, rootX: 0, torso: 0, headX: 0, headY: 0, headZ: 0, shoulderX: [0, 0], shoulderZ: [0.08, -0.08], elbow: [0, 0], hip: [0, 0], knee: [0, 0] };
/** A pose: standing, with some joints changed. */
export const P = (o: Partial<PoseAngles>): PoseAngles => ({ ...STAND, ...o });

/** Shapes of the yoga data `pose` keys (approximate, like Cold Sanctuary's cube rig). */
export const POSES: Record<string, PoseAngles> = {
  stand: STAND,
  prayer: P({ shoulderX: [-0.35, -0.35], shoulderZ: [-0.35, 0.35], elbow: [-2.0, -2.0] }),
  "arms-up": P({ torso: -0.15, headX: -0.25, shoulderX: [-3.0, -3.0], shoulderZ: [0, 0] }),
  fold: P({ rootY: 0.92, torso: 2.3, headX: 0.3, shoulderX: [-2.1, -2.1] }),
  lunge: P({ rootY: 0.52, torso: -0.15, headX: -0.3, hip: [-1.45, 0.75], knee: [1.5, 1.35], shoulderX: [-0.2, -0.2] }),
  plank: P({ rootY: 0.36, rootX: 1.35, shoulderX: [-1.35, -1.35], headX: 0.1 }),
  "eight-limbs": P({ rootY: 0.28, rootX: 1.2, torso: 0.35, shoulderX: [-0.4, -0.4], elbow: [-1.9, -1.9], hip: [0.2, 0.2], knee: [0.4, 0.4] }),
  cobra: P({ rootY: 0.12, rootX: Math.PI / 2, torso: -1.0, headX: -0.4, shoulderX: [-0.9, -0.9], elbow: [-0.3, -0.3] }),
  "down-dog": P({ rootY: 0.98, torso: 2.25, headX: 0.2, shoulderX: [-3.0, -3.0], shoulderZ: [0, 0], hip: [0.65, 0.65] }),
  "neck-down": P({ headX: 0.65 }),
  "neck-up": P({ headX: -0.6 }),
  "neck-turn": P({ headY: 0.9 }),
  "neck-tilt": P({ headZ: 0.55 }),
  "neck-circle": P({ headX: 0.3, headZ: -0.45 }),
  // Padmasana (lotus), approximated with the rig's hinges: thighs forward, shins folded back under them, hands on the knees.
  // Doménica sits like this on a mat to open the general settings (docs/design/habitaculo.md §Ajustes).
  lotus: P({ rootY: 0.17, headX: 0.05, hip: [-1.5, -1.5], knee: [2.7, 2.7], shoulderX: [-0.55, -0.55], shoulderZ: [0.3, -0.3], elbow: [-0.7, -0.7] }),
  // Neutral body posture in microgravity (NASA-STD-3000): arms float forward, hips and knees bend.
  float: P({ torso: 0.15, headX: 0.15, shoulderX: [-0.9, -0.9], shoulderZ: [0.35, -0.35], elbow: [-0.7, -0.7], hip: [-0.7, -0.7], knee: [1.0, 1.0] }),
  shoulders: P({ shoulderZ: [0.25, -0.25], shoulderX: [0.25, 0.25] }),
  // Moving about in zero g (docs/design/ingravidez.md). Holding a rail: one arm up to it, legs loose.
  hold: P({ torso: 0.1, headX: -0.2, shoulderX: [-2.2, -0.9], shoulderZ: [0.05, -0.35], elbow: [-0.25, -0.7], hip: [-0.4, -0.25], knee: [0.6, 0.4] }),
  // Pushing off: arms swept back toward the rail behind her, body straightening.
  push: P({ torso: -0.05, headX: -0.5, shoulderX: [0.5, 0.5], shoulderZ: [0.15, -0.15], elbow: [-0.2, -0.2], hip: [0.05, 0.05], knee: [0.1, 0.1] }),
  // Gliding head first («Superman»): body extended, arms forward, head up to see where she goes.
  glide: P({ torso: -0.05, headX: -0.6, shoulderX: [-2.95, -2.95], shoulderZ: [0.12, -0.12], elbow: [-0.1, -0.1], hip: [0.05, 0.05], knee: [0.15, 0.15] }),
  // Reaching for a rail as it comes: arms out ahead, knees tucking to soak up the stop.
  reach: P({ torso: 0.15, headX: -0.4, shoulderX: [-2.5, -2.3], shoulderZ: [0.2, -0.2], elbow: [-0.35, -0.35], hip: [-0.6, -0.6], knee: [0.9, 0.9] }),
  // Braced on a bare wall with both hands.
  brace: P({ torso: 0.2, headX: -0.1, shoulderX: [-1.6, -1.6], shoulderZ: [0.25, -0.25], elbow: [-0.9, -0.9], hip: [-0.5, -0.5], knee: [0.8, 0.8] }),
  // Sanctuary 3's training posts (adapters/three/s3-stage.ts). Seated on a chair or a couch's edge: pelvis 0,5 m over the feet.
  sit: P({ rootY: 0.5, hip: [-1.55, -1.55], knee: [1.55, 1.55], shoulderX: [-0.35, -0.35], elbow: [-0.9, -0.9] }),
  // Seated, one arm out to the front (a folder handed over, the arm for the cuff).
  "sit-reach": P({ rootY: 0.5, hip: [-1.55, -1.55], knee: [1.55, 1.55], shoulderX: [-1.35, -0.35], shoulderZ: [0.15, -0.08], elbow: [-0.15, -0.9] }),
  // Seated and light-headed (hypoxia): head tilted, shoulders dropped.
  "sit-dizzy": P({ rootY: 0.5, torso: 0.25, headX: 0.25, headZ: 0.35, hip: [-1.55, -1.55], knee: [1.55, 1.55], shoulderX: [-0.2, -0.5], elbow: [-0.3, -1.2] }),
  // On her back (the ECG): the whole body pitched back, arms by her sides.
  supine: P({ rootY: 0.12, rootX: -Math.PI / 2, shoulderZ: [0.12, -0.12] }),
  // Swimming freestyle, face down.
  swim: P({ rootY: 0.1, rootX: Math.PI / 2, headX: -0.3, shoulderX: [-2.9, 0.4], elbow: [-0.1, -0.3], hip: [0.1, -0.1], knee: [0.15, 0.15] }),
  // Treading water: upright, arms sculling out to the sides, legs bent.
  tread: P({ torso: 0.05, shoulderX: [-0.5, -0.5], shoulderZ: [0.9, -0.9], elbow: [-0.4, -0.4], hip: [-0.5, 0.2], knee: [0.9, 0.5] }),
  // One arm out to the front, standing (pressing the suit's check, handing over).
  "reach-one": P({ shoulderX: [-1.35, 0], shoulderZ: [0.1, -0.08], elbow: [-0.2, 0] }),
  // Holding a clipboard in front and writing on it.
  write: P({ headX: 0.3, shoulderX: [-0.9, -0.7], shoulderZ: [0.25, -0.25], elbow: [-1.3, -1.4] }),
};

function box(w: number, h: number, d: number, color: number, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  m.position.y = y;
  return m;
}

/**
 * A cube humanoid (same style as Cold Sanctuary) that eases between poses. Its joints are Cold
 * Sanctuary's (`CubeHumanoid`): pelvis → lumbar → chest → neck → head; chest → scapula → shoulder →
 * elbow → wrist; pelvis → hip → knee → ankle. Gestures (`pose`, `poseAngles`, `walk`) move the
 * original nine; `asana` hands the whole skeleton to the body module's `AsanaPlayer` (IK, grounding,
 * breath; docs/design/esqueleto.md). The boxes and their sizes are the same as before.
 */
export class CubeFigure {
  readonly root = new THREE.Group();
  /** The lumbar spine (Cold Sanctuary's `Back`): gestures bend the torso here. */
  protected readonly torso = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly neck = new THREE.Group();
  protected readonly head = new THREE.Group();
  private readonly scapulae: THREE.Group[] = [];
  private readonly shoulders: THREE.Group[] = [];
  private readonly elbows: THREE.Group[] = [];
  private readonly wrists: THREE.Group[] = [];
  private readonly hips: THREE.Group[] = [];
  private readonly knees: THREE.Group[] = [];
  private readonly ankles: THREE.Group[] = [];
  private current: PoseAngles = { ...STAND, shoulderX: [0, 0], shoulderZ: [...STAND.shoulderZ], elbow: [0, 0], hip: [0, 0], knee: [0, 0] };
  protected target: PoseAngles = STAND;
  /** Only created when she does yoga (the other figures never pay for it). */
  private player?: AsanaPlayer;
  private asanaMode = false;
  /** An exercise on a machine, played round and round on the skeleton (body/domain/exercise-motion.ts). */
  private mover?: MotionPlayer;

  /** `longHair` adds hair down to the shoulders (Doménica: long lavender hair, from her portrait). */
  constructor(skin = 0xe0b48c, suit = 0x3d6fa8, hair = 0x3a2a1e, longHair = false) {
    this.root.add(box(0.34, 0.16, 0.2, suit, 0)); // pelvis
    this.root.add(this.torso);
    // The torso in two boxes (lumbar 0,24 + chest 0,26 m = the old 0,5 m box), so the spine can curve.
    this.torso.add(box(0.38, 0.24, 0.22, suit, 0.17));
    this.chest.position.y = 0.29;
    this.chest.add(box(0.38, 0.26, 0.22, suit, 0.13));
    this.torso.add(this.chest);
    this.neck.position.y = 0.26;
    this.chest.add(this.neck);
    this.neck.add(this.head);
    this.head.position.y = 0.03;
    this.head.add(box(0.22, 0.25, 0.22, skin, 0.13));
    for (const side of [1, -1]) this.head.add(box(0.035, 0.035, 0.01, 0x222222, 0.16).translateX(0.05 * side).translateZ(0.111));
    this.head.add(box(0.24, 0.07, 0.24, hair, 0.27)); // hair
    if (longHair) {
      this.head.add(box(0.25, 0.34, 0.06, hair, 0.1).translateZ(-0.1)); // down the back
      for (const side of [1, -1]) this.head.add(box(0.03, 0.3, 0.2, hair, 0.11).translateX(0.12 * side).translateZ(-0.01)); // framing the face
    }
    for (const side of [1, -1]) {
      const scap = new THREE.Group();
      scap.position.set(0.08 * side, 0.23, 0);
      this.chest.add(scap);
      const sh = new THREE.Group();
      sh.position.set(0.17 * side, 0, 0);
      sh.add(box(0.11, 0.3, 0.11, suit, -0.15));
      const el = new THREE.Group();
      el.position.y = -0.3;
      el.add(box(0.1, 0.28, 0.1, skin, -0.14));
      sh.add(el);
      const wrist = new THREE.Group();
      wrist.position.y = -0.28;
      el.add(wrist);
      scap.add(sh);
      this.scapulae.push(scap);
      this.shoulders.push(sh);
      this.elbows.push(el);
      this.wrists.push(wrist);
      const hip = new THREE.Group();
      hip.position.set(0.1 * side, -0.06, 0);
      hip.add(box(0.14, 0.44, 0.14, suit, -0.22));
      const knee = new THREE.Group();
      knee.position.y = -0.44;
      knee.add(box(0.12, 0.42, 0.12, suit, -0.21));
      const ankle = new THREE.Group();
      ankle.position.y = -0.42;
      ankle.add(box(0.12, 0.06, 0.22, 0x222222, 0).translateZ(0.05));
      knee.add(ankle);
      hip.add(knee);
      this.root.add(hip);
      this.hips.push(hip);
      this.knees.push(knee);
      this.ankles.push(ankle);
    }
    this.apply();
  }

  pose(key: string): void {
    this.leaveAsana();
    this.leaveMotion();
    this.target = POSES[key] ?? STAND;
  }

  /** Ease toward explicit joint angles (procedural motions such as hand over hand). */
  poseAngles(a: PoseAngles): void {
    this.leaveAsana();
    this.leaveMotion();
    this.target = a;
  }

  /**
   * Move into a yoga asana (Cold Sanctuary's data, src/modules/body): smooth transition, IK hands and
   * feet, resting on the floor, breathing. `transitionS` is how long the move takes.
   */
  asana(a: AsanaData, transitionS = 3): void {
    if (!this.player) this.player = new AsanaPlayer(CUBE_FIGURE, { transitionS });
    if (!this.asanaMode) this.player.startFrom(this.readPose());
    this.mover = undefined;
    this.asanaMode = true;
    this.player.play(a);
  }

  /**
   * Exercise on a machine (the T2's stride, the CEVIS's pedalling, the ARED's squat): the skeleton plays the
   * motion's cycle until another gesture or asana; `pace` speeds it (a hard interval).
   */
  exercise(m: ExerciseMotionData): void {
    if (this.mover?.motion === m) return;
    const from = this.readPose();
    this.leaveAsana();
    this.mover = new MotionPlayer(CUBE_FIGURE, m, from);
  }

  /** The exercise being played and where in its cycle (the machine's moving parts follow it). */
  get exercising(): { readonly motion: ExerciseMotionData; readonly phase: number; pace: number } | undefined {
    return this.mover;
  }

  /** The asana she is in (undefined outside yoga). */
  get currentAsana(): AsanaData | undefined {
    return this.asanaMode ? this.player?.asana : undefined;
  }

  /** Inhale or exhale while in an asana. */
  get breath(): "inhala" | "exhala" | undefined {
    return this.asanaMode ? this.player?.phase : undefined;
  }

  /** In an asana and fully arrived in it. */
  get asanaArrived(): boolean {
    return this.asanaMode && !!this.player?.arrived;
  }

  /** How high hands (palms) and soles are over the floor she stands on, in metres (asanas only). */
  contacts(): Record<ReachEnd, number> | undefined {
    return this.asanaMode && this.player ? contactHeights(CUBE_FIGURE, this.player.body.world) : undefined;
  }

  /** The wrist of hand 0 (left) or 1 (right): what she holds hangs from it. */
  hand(i: 0 | 1): THREE.Group {
    return this.wrists[i]!;
  }

  /** The head: what she wears on it (a mask, a helmet) hangs from it. */
  get headNode(): THREE.Group {
    return this.head;
  }

  /** The chest: a badge or the ECG's electrodes go on it. */
  get chestNode(): THREE.Group {
    return this.chest;
  }

  /** World position of a hand (0 or 1), from the current joint angles; the caller updates world matrices. */
  handWorld(i: 0 | 1, out: THREE.Vector3): THREE.Vector3 {
    return this.elbows[i]!.localToWorld(out.set(0, -0.28, 0));
  }

  /** Walking gait: `phase` advances with distance, `amount` 0 (standing) … 1 (full stride). */
  walk(phase: number, amount: number): void {
    this.leaveAsana();
    this.leaveMotion();
    const s = Math.sin(phase) * 0.55 * amount;
    const k = Math.max(0, Math.sin(phase + Math.PI / 2)) * 0.6 * amount;
    const k2 = Math.max(0, -Math.sin(phase + Math.PI / 2)) * 0.6 * amount;
    this.target = P({ hip: [-s, s], knee: [k, k2], shoulderX: [s * 0.8, -s * 0.8], elbow: [-0.25 * amount, -0.25 * amount] });
  }

  /** Ease toward the target pose; `k` = fraction per second. */
  update(dt: number, k = 3): void {
    if (this.mover) {
      if (this.root.visible) this.write(this.mover.update(dt).pose);
      return;
    }
    if (this.asanaMode && this.player) {
      if (this.root.visible) this.write(this.player.update(dt).pose);
      return;
    }
    const a = 1 - Math.exp(-k * dt);
    const c = this.current;
    const t = this.target;
    const lerp = (x: number, y: number) => x + (y - x) * a;
    c.rootY = lerp(c.rootY, t.rootY);
    c.rootX = lerp(c.rootX, t.rootX);
    c.torso = lerp(c.torso, t.torso);
    c.headX = lerp(c.headX, t.headX);
    c.headY = lerp(c.headY, t.headY);
    c.headZ = lerp(c.headZ, t.headZ);
    for (const key of ["shoulderX", "shoulderZ", "elbow", "hip", "knee"] as const) for (const i of [0, 1] as const) c[key][i] = lerp(c[key][i], t[key][i]);
    this.apply();
  }

  private apply(): void {
    const c = this.current;
    this.root.position.y = c.rootY;
    this.root.rotation.x = c.rootX;
    this.torso.rotation.x = c.torso;
    this.head.rotation.set(c.headX, c.headY, c.headZ);
    for (const i of [0, 1] as const) {
      this.shoulders[i]!.rotation.set(c.shoulderX[i], 0, c.shoulderZ[i]);
      this.elbows[i]!.rotation.x = c.elbow[i];
      this.hips[i]!.rotation.x = c.hip[i];
      this.knees[i]!.rotation.x = c.knee[i];
    }
  }

  // --- Asanas: the skeleton's joints on the figure's groups -------------------------------------

  private joints(): Record<JointId, THREE.Group> {
    const [l, r] = [0, 1] as const;
    return {
      Hips: this.root, Back: this.torso, Chest: this.chest, Neck: this.neck, Head: this.head,
      ScapulaLeft: this.scapulae[l]!, ScapulaRight: this.scapulae[r]!, ShoulderLeft: this.shoulders[l]!, ShoulderRight: this.shoulders[r]!,
      ForearmLeft: this.elbows[l]!, ForearmRight: this.elbows[r]!, HandLeft: this.wrists[l]!, HandRight: this.wrists[r]!,
      ThighLeft: this.hips[l]!, ThighRight: this.hips[r]!, ShinLeft: this.knees[l]!, ShinRight: this.knees[r]!, FootLeft: this.ankles[l]!, FootRight: this.ankles[r]!,
    };
  }

  private jointMap?: Record<JointId, THREE.Group>;

  /** The figure as it stands now, as a skeleton pose (so the first asana starts from here). */
  private readPose(): BodyPose {
    const g = (this.jointMap ??= this.joints());
    const rot = {} as Record<JointId, Quat>;
    for (const j of JOINTS) {
      const q = g[j].quaternion;
      rot[j] = new Quat(q.w, q.x, q.y, q.z);
    }
    return { rot, pelvis: new Vec3(this.root.position.x, this.root.position.y, this.root.position.z), hipX: Math.abs(this.hips[0]!.position.x) };
  }

  private write(p: BodyPose): void {
    const g = (this.jointMap ??= this.joints());
    for (const j of JOINTS) {
      const q = p.rot[j];
      g[j].quaternion.set(q.x, q.y, q.z, q.w);
    }
    this.root.position.set(p.pelvis.x, p.pelvis.y, p.pelvis.z);
    this.hips[0]!.position.x = p.hipX;
    this.hips[1]!.position.x = -p.hipX;
  }

  private leaveMotion(): void {
    if (!this.mover) return;
    this.mover = undefined;
    this.asanaMode = true;
    this.leaveAsana();
  }

  /** Back to the gestures: the joints they do not drive go back to rest. */
  private leaveAsana(): void {
    if (!this.asanaMode) return;
    this.asanaMode = false;
    for (const g of [this.chest, this.neck, ...this.scapulae, ...this.wrists, ...this.ankles]) g.quaternion.identity();
    this.root.position.set(0, this.root.position.y, 0);
    this.hips[0]!.position.x = 0.1;
    this.hips[1]!.position.x = -0.1;
    this.root.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
    for (const i of [0, 1] as const) {
      this.elbows[i]!.rotation.set(0, 0, 0);
      this.hips[i]!.rotation.set(0, 0, 0);
      this.knees[i]!.rotation.set(0, 0, 0);
    }
    this.apply();
  }
}
