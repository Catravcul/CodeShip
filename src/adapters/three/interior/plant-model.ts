import * as THREE from "three";
import type { Plant } from "@modules/garden/domain/plant";

/** Procedural pot + plant whose look follows the domain plant: size, health, flowers and fruit. */
export class PlantModel {
  readonly root = new THREE.Group();
  private readonly foliage = new THREE.Group();
  private readonly leafMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  private readonly extras = new THREE.Group();
  private lastKey = "";

  constructor(readonly plant: Plant) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.5 }));
    pot.position.y = 0.08;
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 16), new THREE.MeshStandardMaterial({ color: 0x3b2a1e }));
    soil.position.y = 0.16;
    this.root.add(pot, soil, this.foliage, this.extras);
    this.foliage.position.y = 0.16;
    this.extras.position.y = 0.16;
  }

  sync(): void {
    const p = this.plant;
    const first = p.species.harvestDays.value[0]!;
    const g = Math.min(1, p.developmentDays / first);
    const key = `${Math.round(g * 20)}|${Math.round(p.health * 10)}|${p.flowering}|${p.shaken}|${p.readyToHarvest}|${p.alive}|${p.finished}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.foliage.clear();
    this.extras.clear();
    const healthy = new THREE.Color(p.species.id.startsWith("lechuga") ? 0x8c2a3c : 0x3f8a3a);
    this.leafMat.color.copy(healthy.lerp(new THREE.Color(0x7a6a3a), 1 - p.health));
    const droop = (1 - p.health) * 0.9;
    // Damaged pots lean over.
    this.root.rotation.z = p.health < 0.6 ? 0.25 * (1 - p.health) : 0;
    if (!p.alive || p.finished) return;
    if (p.species.id.startsWith("lechuga")) {
      const n = 5 + Math.round(g * 10);
      for (let i = 0; i < n; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.05 + 0.07 * g, 8, 6), this.leafMat);
        leaf.scale.set(0.55, 1.4, 0.25);
        const a = (i / n) * Math.PI * 2 * 2.4;
        leaf.position.set(Math.cos(a) * 0.03, 0.05 + 0.08 * g, Math.sin(a) * 0.03);
        leaf.rotation.set(0, -a, 0.35 + droop + (i / n) * 0.4);
        this.foliage.add(leaf);
      }
    } else {
      const h = 0.1 + 0.45 * g;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, h, 6), this.leafMat);
      stem.position.y = h / 2;
      stem.rotation.z = droop * 0.4;
      this.foliage.add(stem);
      const n = 4 + Math.round(g * 12);
      for (let i = 0; i < n; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), this.leafMat);
        leaf.scale.set(0.5, 0.15, 1.3);
        const y = (0.3 + 0.7 * (i / n)) * h;
        const a = i * 2.4;
        leaf.position.set(Math.cos(a) * 0.05, y, Math.sin(a) * 0.05);
        leaf.rotation.set(droop, -a, 0);
        this.foliage.add(leaf);
      }
      const flowers = p.flowering && !p.shaken;
      const fruit = p.shaken && g > 0.6;
      if (flowers || fruit) {
        const mat = new THREE.MeshStandardMaterial({ color: fruit ? (p.readyToHarvest ? 0xc0261c : 0x3f9a2a) : 0xf4f1e6 });
        for (let i = 0; i < 5; i++) {
          const m = new THREE.Mesh(fruit ? new THREE.ConeGeometry(0.015, 0.07, 8) : new THREE.SphereGeometry(0.012, 6, 5), mat);
          const a = i * 1.3;
          m.position.set(Math.cos(a) * 0.06, h * (0.55 + 0.08 * i), Math.sin(a) * 0.06);
          if (fruit) m.rotation.x = Math.PI;
          this.extras.add(m);
        }
      }
    }
  }
}
