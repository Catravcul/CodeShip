import * as THREE from "three";

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
const P = (o: Partial<PoseAngles>): PoseAngles => ({ ...STAND, ...o });

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
  shoulders: P({ shoulderZ: [0.25, -0.25], shoulderX: [0.25, 0.25] }),
};

function box(w: number, h: number, d: number, color: number, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  m.position.y = y;
  return m;
}

/** A cube humanoid (same style as Cold Sanctuary) that eases between poses. */
export class CubeFigure {
  readonly root = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly shoulders: THREE.Group[] = [];
  private readonly elbows: THREE.Group[] = [];
  private readonly hips: THREE.Group[] = [];
  private readonly knees: THREE.Group[] = [];
  private current: PoseAngles = { ...STAND, shoulderX: [0, 0], shoulderZ: [...STAND.shoulderZ], elbow: [0, 0], hip: [0, 0], knee: [0, 0] };
  private target: PoseAngles = STAND;

  constructor(skin = 0xe0b48c, suit = 0x3d6fa8) {
    this.root.add(box(0.34, 0.16, 0.2, suit, 0)); // pelvis
    this.root.add(this.torso);
    this.torso.add(box(0.38, 0.5, 0.22, suit, 0.3));
    this.torso.add(this.head);
    this.head.position.y = 0.58;
    this.head.add(box(0.22, 0.25, 0.22, skin, 0.13));
    for (const side of [1, -1]) this.head.add(box(0.035, 0.035, 0.01, 0x222222, 0.16).translateX(0.05 * side).translateZ(0.111));
    this.head.add(box(0.24, 0.07, 0.24, 0x3a2a1e, 0.27)); // hair
    for (const side of [1, -1]) {
      const sh = new THREE.Group();
      sh.position.set(0.25 * side, 0.52, 0);
      sh.add(box(0.11, 0.3, 0.11, suit, -0.15));
      const el = new THREE.Group();
      el.position.y = -0.3;
      el.add(box(0.1, 0.28, 0.1, skin, -0.14));
      sh.add(el);
      this.torso.add(sh);
      this.shoulders.push(sh);
      this.elbows.push(el);
      const hip = new THREE.Group();
      hip.position.set(0.1 * side, -0.06, 0);
      hip.add(box(0.14, 0.44, 0.14, suit, -0.22));
      const knee = new THREE.Group();
      knee.position.y = -0.44;
      knee.add(box(0.12, 0.42, 0.12, suit, -0.21));
      knee.add(box(0.12, 0.06, 0.22, 0x222222, -0.42).translateZ(0.05));
      hip.add(knee);
      this.root.add(hip);
      this.hips.push(hip);
      this.knees.push(knee);
    }
    this.apply();
  }

  pose(key: string): void {
    this.target = POSES[key] ?? STAND;
  }

  /** Ease toward the target pose; `k` = fraction per second. */
  update(dt: number, k = 3): void {
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
}
