import * as THREE from "three";

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * Low-poly chihuahua: apple-domed head, big upright ears, short muzzle, fine legs. Puppies are
 * smaller. Wanders, or follows another animal (its family) when `follow` is set.
 */
export class DogModel {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly tail: THREE.Mesh;
  private target = new THREE.Vector3();
  private wait = 0;
  private t = Math.random() * 10;
  stress = 0;
  follow: THREE.Object3D | null = null;

  constructor(
    readonly id: string,
    color: number,
    private bounds: Bounds,
    puppy = false,
  ) {
    const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x141414 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xe8a0a0 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.12, 4, 8), fur);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.15;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), fur);
    head.position.set(0, 0.25, 0.12);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), fur);
    muzzle.position.set(0, 0.23, 0.18);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 5), dark);
    nose.position.set(0, 0.235, 0.21);
    this.body.add(torso, head, muzzle, nose);
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 4), fur);
      ear.position.set(0.05 * s, 0.32, 0.1);
      ear.rotation.z = -0.45 * s;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), pink);
      inner.position.set(0.048 * s, 0.315, 0.112);
      inner.rotation.z = -0.45 * s;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), dark);
      eye.position.set(0.028 * s, 0.26, 0.175);
      this.body.add(ear, inner, eye);
      for (const z of [0.07, -0.07]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.11, 6), fur);
        leg.position.set(0.035 * s, 0.055, z);
        this.body.add(leg);
      }
    }
    this.tail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.013, 0.12, 6), fur);
    this.tail.position.set(0, 0.22, -0.15);
    this.tail.rotation.x = -0.9;
    this.body.add(this.tail);
    this.root.add(this.body);
    if (puppy) this.root.scale.setScalar(0.65);
    this.pick();
    this.root.position.copy(this.target);
  }

  setBounds(b: Bounds): void {
    this.bounds = b;
    this.pick();
  }

  goTo(p: THREE.Vector3): void {
    this.follow = null;
    this.target.set(p.x, 0, p.z);
    this.wait = 0;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.follow) this.target.copy(this.follow.position).add(new THREE.Vector3(0.22, 0, -0.1));
    const to = this.target.clone().sub(this.root.position);
    to.y = 0;
    const d = to.length();
    if (d > (this.follow ? 0.12 : 0.05)) {
      this.root.rotation.y = Math.atan2(to.x, to.z);
      this.root.position.addScaledVector(to.normalize(), Math.min(d, (0.5 + 0.8 * this.stress) * dt));
      this.body.position.y = Math.abs(Math.sin(this.t * 14)) * 0.012;
    } else if (!this.follow && (this.wait -= dt) <= 0) {
      this.wait = 1.5 + Math.random() * 4;
      this.pick();
    }
    // Trembling when scared; a happy tail otherwise.
    this.body.position.x = this.stress > 0.5 ? Math.sin(this.t * 60) * 0.004 : 0;
    this.tail.rotation.z = Math.sin(this.t * (this.stress > 0.5 ? 2 : 12)) * 0.5;
  }

  private pick(): void {
    const b = this.bounds;
    this.target.set(b.minX + Math.random() * (b.maxX - b.minX), 0, b.minZ + Math.random() * (b.maxZ - b.minZ));
  }
}
