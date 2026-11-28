import * as THREE from "three";

/**
 * Seconds a hatch leaf takes to swing fully open or shut (game value: on the ISS opening a hatch
 * between vehicles takes minutes of leak checks; here the leaf only shows that the way is a hatch
 * she opens, docs/design/viajes.md «Trayectos por dentro»).
 */
export const HATCH_SWING_S = 1.2;
/** How far the leaf swings, rad (it folds back against the bulkhead). */
const OPEN_RAD = (100 * Math.PI) / 180;

/**
 * A hatch leaf she opens to go through (docs/design/reglas.md §3.1): a square plate with its window and
 * handle, hinged on one side, in the wall plane at `at`, opening into the room (towards `into`). Drawn
 * at the size the room gives it. `open` eases towards `target` at the swing time.
 */
export class HatchLeaf {
  readonly root = new THREE.Group();
  private readonly hinge = new THREE.Group();
  /** 0 shut, 1 fully open. */
  open = 0;
  target = 0;

  constructor(at: THREE.Vector3, into: THREE.Vector3, sizeM: number, opts: { readonly round?: boolean; readonly frame?: boolean } = {}) {
    const n = into.clone().normalize();
    // The leaf's plane is square to `into`; its hinge on the side that is «up» in the room, or along x for a floor or a roof.
    const up = Math.abs(n.y) > 0.7 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(up, n).normalize();
    const m = new THREE.Matrix4().makeBasis(side, up, n);
    this.root.quaternion.setFromRotationMatrix(m);
    this.root.position.copy(at).addScaledVector(n, 0.03);
    const s = sizeM;
    // The frame stays in the wall; the leaf turns on its hinge at the left edge.
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffc84a, roughness: 0.6, metalness: 0.2 });
    const t = 0.09 * s;
    const frames = opts.frame === false ? [] : opts.round ? [] : ([
      [s + 2 * t, t, 0, s / 2 + t / 2],
      [s + 2 * t, t, 0, -s / 2 - t / 2],
      [t, s, s / 2 + t / 2, 0],
      [t, s, -s / 2 - t / 2, 0],
    ] as const);
    if (opts.round && opts.frame !== false) this.root.add(new THREE.Mesh(new THREE.TorusGeometry(s / 2 + t / 2, t / 2, 8, 32), frameMat));
    for (const [w, h, x, y] of frames) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameMat);
      bar.position.set(x, y, 0);
      this.root.add(bar);
    }
    this.hinge.position.set(-s / 2, 0, 0);
    this.root.add(this.hinge);
    // Darker than the white panels round it, so its swing reads.
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x7d8a97, roughness: 0.45, metalness: 0.45 });
    const plate = opts.round ? new THREE.Mesh(new THREE.CylinderGeometry(s / 2, s / 2, 0.05, 32), plateMat) : new THREE.Mesh(new THREE.BoxGeometry(s, s, 0.05), plateMat);
    if (opts.round) plate.rotation.x = Math.PI / 2;
    plate.position.set(s / 2, 0, 0.025);
    const window_ = new THREE.Mesh(new THREE.CircleGeometry(0.11 * s, 24), new THREE.MeshStandardMaterial({ color: 0x223a4a, roughness: 0.1, metalness: 0.6 }));
    window_.position.set(s / 2, 0.18 * s, 0.052);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.05 * s, 0.05 * s), new THREE.MeshStandardMaterial({ color: 0x2b2f36 }));
    handle.position.set(s / 2, -0.12 * s, 0.075);
    this.hinge.add(plate, window_, handle);
    this.root.name = this.hinge.name = "escotilla-hoja";
  }

  /** Ease the leaf towards its target. */
  update(dt: number): void {
    const step = dt / HATCH_SWING_S;
    this.open = this.target > this.open ? Math.min(this.target, this.open + step) : Math.max(this.target, this.open - step);
    // Smooth start and stop.
    const e = this.open * this.open * (3 - 2 * this.open);
    this.hinge.rotation.y = -e * OPEN_RAD;
  }

  /** Set it at once (a hatch seen open from the start). */
  set(open: number): void {
    this.open = this.target = open;
    this.update(0);
  }
}
