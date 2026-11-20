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
    const sp = p.species;
    this.leafMat.color.copy(new THREE.Color(sp.color).lerp(new THREE.Color(0x7a6a3a), 1 - p.health));
    const droop = (1 - p.health) * 0.9;
    // Damaged pots lean over.
    this.root.rotation.z = p.health < 0.6 ? 0.25 * (1 - p.health) : 0;
    if (!p.alive || p.finished) return;
    switch (sp.form) {
      case "hoja":
        this.rosette(g, droop, 5 + Math.round(g * 10), 0.05 + 0.07 * g, 0.35);
        break;
      case "raiz": {
        const potato = sp.id.startsWith("papa");
        this.rosette(g, droop, 6 + Math.round(g * 8), potato ? 0.04 + 0.05 * g : 0.03 + 0.04 * g, potato ? 0.6 : 0.15);
        if (g > 0.7) {
          const root = new THREE.Mesh(new THREE.SphereGeometry(potato ? 0.035 : 0.03, 10, 8), new THREE.MeshStandardMaterial({ color: potato ? 0xc9a46a : 0xd8304a }));
          root.position.set(0.03, 0.01, 0.02);
          this.extras.add(root);
        }
        break;
      }
      case "grano":
      case "hierba": {
        const grain = sp.form === "grano";
        const n = grain ? 14 : 26;
        const h = grain ? 0.12 + 0.5 * g : 0.04 + 0.14 * g;
        const ripe = grain && p.readyToHarvest;
        const blade = new THREE.MeshStandardMaterial({ color: ripe ? 0xd9b64a : this.leafMat.color });
        for (let i = 0; i < n; i++) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.008, h, 0.003), blade);
          const a = i * 2.4;
          const r = 0.02 + 0.06 * ((i * 37) % 10) / 10;
          b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
          b.rotation.set(Math.sin(a) * (0.15 + droop), 0, Math.cos(a) * (0.15 + droop));
          this.foliage.add(b);
          if (grain && g > 0.6 && i % 2 === 0) {
            const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.04, 3, 6), new THREE.MeshStandardMaterial({ color: ripe ? 0xe8c560 : sp.id.startsWith("soja") ? 0x7aa03a : 0x9cbf55 }));
            head.position.set(b.position.x * 1.2, h, b.position.z * 1.2);
            this.extras.add(head);
          }
        }
        break;
      }
      case "fruto":
      case "arbol":
        this.fruiting(g, droop);
        break;
    }
  }

  /** Leaves radiating from the centre (lettuce, radish, potato). */
  private rosette(g: number, droop: number, n: number, size: number, tilt: number): void {
    for (let i = 0; i < n; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), this.leafMat);
      leaf.scale.set(0.55, 1.4, 0.25);
      const a = (i / n) * Math.PI * 2 * 2.4;
      leaf.position.set(Math.cos(a) * 0.03, 0.05 + 0.08 * g, Math.sin(a) * 0.03);
      leaf.rotation.set(0, -a, tilt + droop + (i / n) * 0.4);
      this.foliage.add(leaf);
    }
  }

  /** Stem, leaves, flowers and fruit (chile, tomato). */
  private fruiting(g: number, droop: number): void {
    const p = this.plant;
    const tomato = p.species.id.startsWith("tomate");
    const h = 0.1 + (tomato ? 0.35 : 0.45) * g;
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
    if (!flowers && !fruit) return;
    const ripe = p.readyToHarvest;
    const color = fruit ? (ripe ? (tomato ? 0xe0301e : 0xc0261c) : 0x3f9a2a) : tomato ? 0xf4d23a : 0xf4f1e6;
    const m = new THREE.MeshStandardMaterial({ color });
    for (let i = 0; i < 5; i++) {
      const geo = fruit ? (tomato ? new THREE.SphereGeometry(0.025, 10, 8) : new THREE.ConeGeometry(0.015, 0.07, 8)) : new THREE.SphereGeometry(0.012, 6, 5);
      const f = new THREE.Mesh(geo, m);
      const a = i * 1.3;
      f.position.set(Math.cos(a) * 0.06, h * (0.55 + 0.08 * i), Math.sin(a) * 0.06);
      if (fruit && !tomato) f.rotation.x = Math.PI;
      this.extras.add(f);
    }
  }
}
