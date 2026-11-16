import * as THREE from "three";

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 });

/**
 * Canadarm2 (SSRMS): 17,6 m in two booms with an elbow, a latching end effector at each end, on its
 * Mobile Base System that rides the truss (data/iss.ts, «canadarm2»). `reach` bends it so the free end
 * touches a point: a two-link solution in the plane of the base, the target and a bend hint.
 */
export class CanadarmModel {
  readonly root = new THREE.Group();
  private readonly mbs: THREE.Mesh;
  private readonly upper: THREE.Mesh;
  private readonly lower: THREE.Mesh;
  private readonly elbow: THREE.Mesh;
  private readonly lee: THREE.Mesh;
  private readonly boom: number;

  constructor(lengthM = 17.6) {
    this.boom = lengthM / 2;
    const white = mat(0xeef1f4);
    this.mbs = new THREE.Mesh(new THREE.BoxGeometry(5.7, 1.2, 4.5), mat(0x9aa3ad));
    this.upper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, this.boom, 12), white);
    this.lower = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, this.boom, 12), white);
    this.elbow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), mat(0x56606e));
    this.lee = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12), mat(0x56606e));
    this.root.add(this.mbs, this.upper, this.lower, this.elbow, this.lee);
  }

  /** Put the base at `base` (on the truss) and the free end at `target`, bending toward `hint`. */
  reach(base: THREE.Vector3, target: THREE.Vector3, hint: THREE.Vector3): void {
    this.mbs.position.copy(base);
    const shoulder = base.clone().add(new THREE.Vector3(0, -0.9, 0));
    const toT = target.clone().sub(shoulder);
    const d = Math.min(toT.length(), 2 * this.boom - 0.05);
    const dir = toT.clone().normalize();
    const end = shoulder.clone().addScaledVector(dir, d);
    // Elbow: off the middle of the line, toward the hint, so both booms are `boom` long.
    const side = hint.clone().sub(shoulder).projectOnPlane(dir);
    if (side.lengthSq() < 1e-6) side.set(0, 1, 0).projectOnPlane(dir);
    side.normalize();
    const h = Math.sqrt(Math.max(0, this.boom ** 2 - (d / 2) ** 2));
    const elbow = shoulder.clone().addScaledVector(dir, d / 2).addScaledVector(side, h);
    this.place(this.upper, shoulder, elbow);
    this.place(this.lower, elbow, end);
    this.elbow.position.copy(elbow);
    this.lee.position.copy(end);
    this.lee.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(elbow).normalize());
  }

  private place(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
}
