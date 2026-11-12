import * as THREE from "three";
import type { RingSpec } from "@modules/gravity/domain/spin-gravity";

/**
 * The two counter-rotating habitat rings seen from outside, on a mast over the hull (body +y).
 * The lower ring holds the habitat module and the farm deck; the upper twin (stores, water, cabins)
 * turns the other way so the ship carries no net spin. Ribs, spokes and lit windows make the slow
 * 4 rpm turn visible. Kept apart from ShipModel so it can stay visible from the cockpit.
 */
export class RingModel {
  readonly root = new THREE.Group();
  private readonly lower = new THREE.Group();
  private readonly upper = new THREE.Group();
  private angle = 0;
  /** Height of each ring's centre above the hull centre, m. */
  readonly lowerY: number;
  readonly upperY: number;

  constructor(spec: RingSpec, hullTopY = 1) {
    const R = spec.floorRadiusM;
    const w = spec.widthM;
    const inner = R - spec.deckHeightM - 1;
    this.lowerY = hullTopY + 4 + w / 2;
    this.upperY = this.lowerY + w + 3;
    const shell = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.6, metalness: 0.6 });
    const lit = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc870, emissiveIntensity: 1.4, side: THREE.DoubleSide });
    const farm = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x9fd8ff, emissiveIntensity: 1.1, side: THREE.DoubleSide });

    // Mast (the non-rotating spine axis) from the hull up through both hubs.
    const mastTop = this.upperY + w / 2 + 6;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, mastTop - hullTopY, 16), dark);
    mast.position.y = hullTopY + (mastTop - hullTopY) / 2;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), shell);
    dish.position.y = mastTop;
    this.root.add(mast, dish);

    for (const [g, y, windows] of [
      [this.lower, this.lowerY, true],
      [this.upper, this.upperY, false],
    ] as const) {
      g.position.y = y;
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.5, w, 160, 1, true), shell);
      const inside = new THREE.Mesh(new THREE.CylinderGeometry(inner, inner, w, 160, 1, true), shell);
      const cap = new THREE.RingGeometry(inner, R + 0.5, 160, 1);
      const top = new THREE.Mesh(cap, shell);
      top.rotation.x = -Math.PI / 2;
      top.position.y = w / 2;
      const bottom = top.clone();
      bottom.position.y = -w / 2;
      g.add(outer, inside, top, bottom);
      // Ribs every 30°: they are what shows the ring turning.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(R + 0.5 - inner + 0.6, w + 0.6, 0.8), dark);
        rib.position.set(Math.cos(a) * (inner + R + 0.5) / 2, 0, Math.sin(a) * (inner + R + 0.5) / 2);
        rib.rotation.y = -a;
        g.add(rib);
      }
      // Spokes and hub.
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 6, 20), shell);
      g.add(hub);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        const len = inner - 3;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, len, 10), shell);
        spoke.rotation.z = Math.PI / 2;
        const holder = new THREE.Group();
        holder.rotation.y = -a;
        spoke.position.x = 3 + len / 2;
        holder.add(spoke);
        g.add(holder);
      }
      // Windows on the inner face: the habitat module and the farm deck's daylight panels (lower ring),
      // cabin windows on the twin.
      const segments: [number, number, THREE.Material][] = windows
        ? [
            [0.0, 12 / R, lit],
            [12 / R + 0.02, 18 / R, farm],
            [Math.PI, 0.5, lit],
          ]
        : [
            [0.4, 0.6, lit],
            [2.5, 0.6, lit],
            [4.6, 0.6, lit],
          ];
      for (const [start, len, m] of segments) {
        const strip = new THREE.Mesh(new THREE.CylinderGeometry(inner - 0.05, inner - 0.05, w * 0.35, 24, 1, true, start, len), m);
        g.add(strip);
      }
    }
    this.root.add(this.lower, this.upper);
  }

  /** Turn the rings by `omegaRadS` for `dt` seconds (the twin turns the other way). */
  update(dt: number, omegaRadS: number): void {
    this.angle = (this.angle + omegaRadS * dt) % (Math.PI * 2);
    this.lower.rotation.y = this.angle;
    this.upper.rotation.y = -this.angle;
  }

  get rotation(): number {
    return this.angle;
  }
}
