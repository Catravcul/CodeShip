import * as THREE from "three";
import type { ThrustCommand } from "@modules/ship/domain/ship";

/**
 * The ship seen from outside (for the exterior camera): a hull the size of the design (3 × 2 × 5 m),
 * canopy at the front (−z), the main engine bell at the back, four RCS quads, solar wings and
 * plumes that light up with the pilot's commands.
 */
export class ShipModel {
  readonly root = new THREE.Group();
  private readonly mainFlame: THREE.Mesh;
  private readonly puffs: { mesh: THREE.Mesh; axis: "x" | "y" | "z"; sign: number }[] = [];

  constructor(size = { x: 3, y: 2, z: 5 }) {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.5, metalness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.6, metalness: 0.6 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1d4f6a, roughness: 0.1, metalness: 0.2, emissive: 0x0a2a3a });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hullMat);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(size.y * 0.42, size.y * 0.5, 0.9, 16), hullMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -size.z / 2 - 0.45;
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    canopy.position.set(0, size.y / 2 - 0.1, -size.z / 2 + 0.9);
    canopy.scale.set(1.2, 0.6, 1.4);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 0.8, 16, 1, true), dark);
    bell.rotation.x = -Math.PI / 2;
    bell.position.z = size.z / 2 + 0.4;
    this.mainFlame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.6, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.7, depthWrite: false }));
    this.mainFlame.rotation.x = Math.PI / 2;
    this.mainFlame.position.z = size.z / 2 + 2.1;
    this.root.add(hull, nose, canopy, bell, this.mainFlame);
    // Solar wings.
    const cell = new THREE.MeshStandardMaterial({ color: 0x1a2a6a, roughness: 0.3, metalness: 0.5, emissive: 0x050a20 });
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), dark);
      arm.position.set(sx * (size.x / 2 + 0.4), 0, 0.6);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 1.4), cell);
      wing.position.set(sx * (size.x / 2 + 2.4), 0, 0.6);
      this.root.add(arm, wing);
    }
    // RCS quads at the four corners; each has a small plume per direction.
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const at = new THREE.Vector3((sx * size.x) / 2, 0, (sz * size.z) / 2 * 0.8);
        const quad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), dark);
        quad.position.copy(at);
        this.root.add(quad);
        const dirs: [THREE.Vector3, "x" | "y" | "z", number][] = [
          [new THREE.Vector3(0, 0, -1), "z", 1],
          [new THREE.Vector3(0, 0, 1), "z", -1],
          [new THREE.Vector3(0, 1, 0), "y", -1],
          [new THREE.Vector3(0, -1, 0), "y", 1],
          [new THREE.Vector3(sx, 0, 0), "x", -sx],
        ];
        for (const [d, axis, sign] of dirs) {
          // A plume pointing along d pushes the ship the other way.
          const p = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 8, 1, true), puffMat);
          p.position.copy(at).addScaledVector(d, 0.4);
          p.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
          p.visible = false;
          this.root.add(p);
          this.puffs.push({ mesh: p, axis, sign });
        }
      }
  }

  /** Show plumes for the current command (translation axes in body frame, z back). */
  thrust(cmd: ThrustCommand, t: number): void {
    this.mainFlame.visible = cmd.mainThrottle > 0;
    this.mainFlame.scale.setScalar(0.9 + 0.15 * Math.sin(t * 40));
    const tr = { x: cmd.translation.x, y: cmd.translation.y, z: cmd.translation.z };
    for (const p of this.puffs) p.mesh.visible = Math.sign(tr[p.axis]) === p.sign && tr[p.axis] !== 0;
  }
}
