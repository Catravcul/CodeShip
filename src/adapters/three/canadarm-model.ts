import * as THREE from "three";

/** From the wrist's three joints to the LEE's face, m (drawn). */
const WRIST_M = 1.6;

const mat = (color: number, emissive = 0x000000) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4, emissive });

/**
 * Canadarm2 (SSRMS, docs/design/brazo-robotico.md): 17,6 m in two booms of 35 cm with seven joints (three at the
 * shoulder, the elbow, three at the wrist) and an identical Latching End Effector at each end, on its Mobile
 * Base System that rides the truss (data/robotics.ts). Either LEE can be the base: `reach` puts the base LEE on
 * a fixture (pointing out along `out`) and bends the arm so the free LEE touches a point, a two-link solution in
 * the plane of the base, the target and a bend hint. The LEE's snares close with `snare(1)`.
 */
export class CanadarmModel {
  readonly root = new THREE.Group();
  /** The MBS (its own position: the arm may be based elsewhere). */
  readonly mbs: THREE.Group;
  private readonly upper: THREE.Mesh;
  private readonly lower: THREE.Mesh;
  private readonly shoulder: THREE.Group;
  private readonly wrist: THREE.Group;
  private readonly elbow: THREE.Mesh;
  private readonly baseLee: THREE.Mesh;
  private readonly tipLee: THREE.Group;
  private readonly snareRing: THREE.Mesh;
  private readonly boom: number;
  /** Where the free LEE is (station frame of the root's parent) and which way it points. */
  readonly tip = new THREE.Vector3();
  readonly tipDir = new THREE.Vector3(0, -1, 0);
  /** The booms' ends now (the live audit samples them: nothing goes through the station). */
  readonly joints = { shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), wrist: new THREE.Vector3() };

  constructor(lengthM = 17.6) {
    // The two booms with the joints: 17,6 m minus the joint housings, as two equal booms (drawn).
    this.boom = lengthM / 2;
    const white = mat(0xeef1f4);
    const joint = mat(0x56606e);
    this.mbs = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.7, 1.0, 4.5), mat(0x9aa3ad));
    deck.name = "MBS";
    this.mbs.add(deck);
    // The MBS's four PDGFs, one at each top corner (real).
    for (const [x, z] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]] as const) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), joint);
      g.position.set(x, -0.65, z);
      this.mbs.add(g);
    }
    this.upper = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, this.boom, 12), white);
    this.lower = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, this.boom, 12), white);
    this.upper.name = "Canadarm2";
    this.lower.name = "Canadarm2";
    this.elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 12), joint);
    // Three joints at each end (roll, yaw, pitch), as three short housings at right angles.
    const triple = () => {
      const g = new THREE.Group();
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 12), joint);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 12), joint);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 12), joint);
      a.position.y = 0.35;
      b.rotation.z = Math.PI / 2;
      b.position.y = 0.85;
      c.rotation.x = Math.PI / 2;
      c.position.y = 1.3;
      g.add(a, b, c);
      return g;
    };
    this.shoulder = triple();
    this.wrist = triple();
    const lee = () => new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.9, 14), mat(0xd8dde3));
    this.baseLee = lee();
    this.tipLee = new THREE.Group();
    const tl = lee();
    tl.name = "LEE";
    this.tipLee.add(tl);
    // The three snare wires inside the LEE: a ring that closes (drawn as a glowing ring).
    this.snareRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 18), mat(0xffd27f, 0x553300));
    this.snareRing.rotation.x = Math.PI / 2;
    this.snareRing.position.y = 0.46;
    this.tipLee.add(this.snareRing);
    this.root.add(this.mbs, this.upper, this.lower, this.elbow, this.shoulder, this.wrist, this.baseLee, this.tipLee);
  }

  /** Every mesh of the arm (the audit does not count it as hiding what it holds). */
  get parts(): THREE.Object3D[] {
    return [this.root];
  }

  /** Put the MBS at `p` on the truss. */
  setMbs(p: THREE.Vector3): void {
    this.mbs.position.copy(p);
  }

  /** The snares: 0 open, 1 closed on a grapple shaft. */
  snare(k: number): void {
    const s = 1 - 0.6 * Math.max(0, Math.min(1, k));
    this.snareRing.scale.set(s, s, 1);
  }

  /**
   * The base LEE on a fixture at `base` (pointing out of it along `out`), the free LEE at `target`, bending
   * toward `hint`. `toward`: where the free LEE points (its axis), default from the elbow.
   */
  reach(base: THREE.Vector3, target: THREE.Vector3, hint: THREE.Vector3, out = new THREE.Vector3(0, -1, 0)): void {
    const n = out.clone().normalize();
    this.place(this.baseLee, base, base.clone().addScaledVector(n, 0.9));
    const sh = base.clone().addScaledVector(n, 0.9);
    this.shoulder.position.copy(sh);
    this.shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const shoulder = sh.clone().addScaledVector(n, 1.5);
    // The wrist turns the LEE to point straight at the target: the booms bring the wrist 1,6 m short of it.
    const toward = target.clone().sub(shoulder);
    const dir = toward.lengthSq() > 1e-9 ? toward.clone().normalize() : n.clone();
    const d = Math.min(Math.max(0, toward.length() - WRIST_M), 2 * this.boom - 0.05);
    const wristEnd = shoulder.clone().addScaledVector(dir, d);
    const side = hint.clone().sub(shoulder).projectOnPlane(dir);
    if (side.lengthSq() < 1e-6) side.copy(n).projectOnPlane(dir);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0).projectOnPlane(dir);
    side.normalize();
    const h = Math.sqrt(Math.max(0, this.boom ** 2 - (d / 2) ** 2));
    const elbow = shoulder.clone().addScaledVector(dir, d / 2).addScaledVector(side, h);
    this.place(this.upper, shoulder, elbow);
    this.place(this.lower, elbow, wristEnd);
    this.joints.shoulder.copy(shoulder);
    this.joints.elbow.copy(elbow);
    this.joints.wrist.copy(wristEnd);
    this.elbow.position.copy(elbow);
    this.elbow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), side);
    this.wrist.position.copy(wristEnd);
    this.wrist.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.tipDir.copy(dir);
    this.tip.copy(wristEnd).addScaledVector(dir, WRIST_M);
    this.tipLee.position.copy(wristEnd).addScaledVector(dir, WRIST_M - 0.45);
    this.tipLee.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  private place(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
}
