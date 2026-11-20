import * as THREE from "three";
import type { Vec3 } from "@core/math/vec3";
import { DEEP_SPACE_DEPLOYER } from "@modules/subjugation/data/deployer";

/**
 * The probes' deployers on the carrier's hull (docs/design/modulo-lunar-juventas.md, «Cómo sale»): one
 * Deep Space Deployer per Juventas, sunk in the hull with its door flush with the skin. The door swings open
 * when the deployer's sequence starts and stays open once the deployer is empty; a new probe loaded shuts it.
 * Drawn in the carrier's body frame (add `root` to the carrier's model).
 */
export class DeployerModel {
  readonly root = new THREE.Group();
  private readonly doors: THREE.Object3D[] = [];

  /** @param slots where each deployer's probe sits (body frame), and the hull's radius over it. */
  constructor(slots: readonly Vec3[], hullRadiusM: number) {
    const [w, h, l] = DEEP_SPACE_DEPLOYER.closedM.value;
    const box = new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide });
    const lid = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.45, metalness: 0.7 });
    const rim = new THREE.MeshStandardMaterial({ color: 0x2e333b, roughness: 0.6, metalness: 0.6 });
    this.root.name = "dispensadores-sonda";
    slots.forEach((s, i) => {
      const g = new THREE.Group();
      g.name = `dispensador-${i}`;
      g.position.set(s.x, hullRadiusM, s.z);
      // The deployer's body, sunk in the hull (open on top: the door closes it).
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l, 1, 1, 1), box);
      (body.geometry as THREE.BoxGeometry).groups.splice(2, 1);
      body.position.y = -h / 2;
      // A frame round the opening, on the skin.
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.03, l + 0.06), rim);
      frame.position.y = 0.005;
      // The door: hinged on its aft edge, it swings up and over.
      const hinge = new THREE.Group();
      hinge.position.set(0, 0.025, l / 2);
      const door = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, l), lid);
      door.position.z = -l / 2;
      hinge.add(door);
      g.add(body, frame, hinge);
      this.doors.push(hinge);
      this.root.add(g);
    });
  }

  /** Door `i` open 0..1 (0 shut flush with the skin, 1 swung up 110°). */
  setDoor(i: number, open: number): void {
    const d = this.doors[i];
    if (d) d.rotation.x = ((110 * Math.PI) / 180) * Math.max(0, Math.min(1, open));
  }
}
