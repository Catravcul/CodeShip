import * as THREE from "three";
import type { Vec3 } from "@core/math/vec3";

/**
 * The uncrewed probe drawn to scale: a 6U-XL cubesat bus (Juventas-like) with the MPS-120 module
 * under it, two deployed solar wings, three short anchoring legs and a beacon light so it can be
 * found against the dark regolith.
 */
export class ProbeModel {
  readonly root = new THREE.Group();
  private readonly beacon: THREE.Mesh;
  private readonly plumes: THREE.Mesh[] = [];
  private clock = 0;

  constructor(hull: Vec3) {
    const bus = new THREE.Mesh(
      new THREE.BoxGeometry(hull.x, hull.y * 0.48, hull.z),
      new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 0.35, metalness: 0.8, emissive: 0x2a1c00 }),
    );
    bus.position.y = hull.y * 0.26;
    const prop = new THREE.Mesh(new THREE.BoxGeometry(hull.x * 0.85, hull.y * 0.52, hull.z * 0.55), new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: 0.5, metalness: 0.5 }));
    prop.position.set(0, -hull.y * 0.24, hull.z * 0.2);
    const cell = new THREE.MeshStandardMaterial({ color: 0x1a2a6a, roughness: 0.3, metalness: 0.6, emissive: 0x050a20 });
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.006, hull.z * 0.9), cell);
      wing.position.set(s * (hull.x / 2 + 0.18), hull.y * 0.45, 0);
      this.root.add(wing);
    }
    const legMat = new THREE.MeshStandardMaterial({ color: 0xb0b6bc, roughness: 0.4, metalness: 0.7 });
    for (const [x, z] of [[-0.09, -0.14], [0.09, -0.14], [0, 0.16]] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), legMat);
      leg.position.set(x, -hull.y / 2 - 0.25, z);
      this.root.add(leg);
    }
    // Camera lens on the nose (−z).
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, hull.y * 0.26, -hull.z / 2 - 0.01);
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5dff9a }));
    this.beacon.position.set(0, hull.y / 2 + 0.03, 0);
    const plume = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.5, depthWrite: false });
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 8, 1, true), plume);
        p.rotation.x = -Math.PI / 2;
        p.position.set((sx * hull.x) / 4, (sy * hull.y) / 4 - hull.y * 0.1, hull.z / 2 + 0.1);
        p.visible = false;
        this.plumes.push(p);
        this.root.add(p);
      }
    this.root.add(bus, prop, lens, this.beacon);
  }

  update(dt: number, firing: boolean): void {
    this.clock += dt;
    this.beacon.visible = this.clock % 1.2 < 0.25;
    for (const p of this.plumes) p.visible = firing;
  }
}
