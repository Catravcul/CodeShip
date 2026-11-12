import * as THREE from "three";

/** Low-poly hen: round body, comb, beak and legs. Pecks and wanders inside the coop. */
export class HenModel {
  readonly root = new THREE.Group();
  private readonly head = new THREE.Group();
  private target = new THREE.Vector3();
  private wait = 0;
  private t = Math.random() * 10;
  stress = 0;
  /** Family member to stay close to. */
  follow: THREE.Object3D | null = null;

  constructor(
    readonly id: string,
    color: number,
    private bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) {
    const feathers = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const red = new THREE.MeshStandardMaterial({ color: 0xd8282a });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf0b030 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), feathers);
    body.scale.set(0.8, 0.85, 1.15);
    body.position.y = 0.17;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), feathers);
    tail.position.set(0, 0.25, -0.11);
    tail.rotation.x = -0.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), feathers);
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.05), red);
    comb.position.set(0, 0.045, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 5), yellow);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.005, 0.05);
    this.head.add(head, comb, beak);
    this.head.position.set(0, 0.28, 0.1);
    this.root.add(body, tail, this.head);
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 5), yellow);
      leg.position.set(0.03 * s, 0.045, 0);
      this.root.add(leg);
    }
    this.pick();
    this.root.position.copy(this.target);
  }

  setBounds(b: { minX: number; maxX: number; minZ: number; maxZ: number }): void {
    this.bounds = b;
    this.pick();
  }

  update(dt: number): void {
    this.t += dt;
    if (this.follow) this.target.copy(this.follow.position).add(new THREE.Vector3(0.2, 0, 0.15));
    const to = this.target.clone().sub(this.root.position);
    to.y = 0;
    const d = to.length();
    if (d > 0.03) {
      this.root.rotation.y = Math.atan2(to.x, to.z);
      this.root.position.addScaledVector(to.normalize(), Math.min(d, (0.25 + 0.8 * this.stress) * dt));
      this.head.rotation.x = 0;
    } else {
      // Pecking at the bedding.
      this.head.rotation.x = Math.max(0, Math.sin(this.t * 6)) * 0.9;
      if (!this.follow && (this.wait -= dt) <= 0) {
        this.wait = 1 + Math.random() * 3;
        this.pick();
      }
    }
  }

  private pick(): void {
    const b = this.bounds;
    this.target.set(b.minX + Math.random() * (b.maxX - b.minX), 0, b.minZ + Math.random() * (b.maxZ - b.minZ));
  }
}
