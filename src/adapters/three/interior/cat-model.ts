import * as THREE from "three";

/** Low-poly cat built from primitives. Wanders on the floor; `goTo` makes it walk somewhere. */
export class CatModel {
  readonly root = new THREE.Group();
  private readonly tail: THREE.Mesh;
  private readonly body: THREE.Group;
  private target = new THREE.Vector3();
  private wait = 0;
  private t = Math.random() * 10;
  /** 0 calm … 1 scared: a scared cat hides low and fast. */
  stress = 0;
  /** Family member to stay close to. */
  follow: THREE.Object3D | null = null;

  constructor(
    readonly id: string,
    color: number,
    private bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    this.body = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 4, 8), mat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), mat);
    head.position.set(0, 0.29, 0.2);
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), mat);
      ear.position.set(0.045 * s, 0.37, 0.2);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), dark);
      eye.position.set(0.032 * s, 0.305, 0.278);
      this.body.add(ear, eye);
      for (const z of [0.1, -0.1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 6), mat);
        leg.position.set(0.05 * s, 0.065, z);
        this.body.add(leg);
      }
    }
    this.tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.26, 6), mat);
    this.tail.position.set(0, 0.3, -0.24);
    this.tail.rotation.x = -0.6;
    this.body.add(torso, head, this.tail);
    this.root.add(this.body);
    this.pickTarget();
    this.root.position.copy(this.target);
  }

  goTo(p: THREE.Vector3): void {
    this.follow = null;
    this.target.set(p.x, 0, p.z);
    this.wait = 0;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.follow) this.target.copy(this.follow.position).add(new THREE.Vector3(-0.25, 0, 0.1));
    const to = this.target.clone().sub(this.root.position);
    to.y = 0;
    const d = to.length();
    const speed = 0.35 + 0.6 * this.stress;
    if (d > 0.05) {
      this.root.rotation.y = Math.atan2(to.x, to.z);
      this.root.position.addScaledVector(to.normalize(), Math.min(d, speed * dt));
      this.body.position.y = Math.abs(Math.sin(this.t * 10)) * 0.01;
    } else if (!this.follow && (this.wait -= dt) <= 0) {
      this.wait = 2 + Math.random() * 5;
      this.pickTarget();
    }
    this.body.scale.y = 1 - 0.25 * this.stress; // crouch when scared
    this.tail.rotation.z = Math.sin(this.t * (2 + 6 * this.stress)) * 0.4;
  }

  private pickTarget(): void {
    const b = this.bounds;
    this.target.set(b.minX + Math.random() * (b.maxX - b.minX), 0, b.minZ + Math.random() * (b.maxZ - b.minZ));
  }
}
