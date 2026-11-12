import * as THREE from "three";
import { CubeFigure, P } from "../interior/figure";

const SUIT = 0xeeede8;
const GLOVE = 0xd8d6cf;

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};

/**
 * Doménica in the EMU: the cube figure in a white suit, a helmet with a gold visor, the life-support
 * backpack (PLSS) and the SAFER jetpack under it. Crawls on hands and knees, or floats.
 */
export class SuitFigure extends CubeFigure {
  private readonly jets: THREE.Mesh[] = [];
  /** Helmet lamp, so the dark regolith shows around her. */
  readonly lamp = new THREE.SpotLight(0xfff6e0, 6, 9, 0.7, 0.5, 1);

  constructor() {
    super(GLOVE, SUIT);
    const white = new THREE.MeshStandardMaterial({ color: SUIT, roughness: 0.6 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: 0.5, metalness: 0.3 });
    const visor = new THREE.MeshStandardMaterial({ color: 0xc89b2a, roughness: 0.12, metalness: 0.9, emissive: 0x2a1a00 });
    // Helmet over the head, gold visor in front.
    this.head.add(mesh(new THREE.BoxGeometry(0.32, 0.33, 0.32), white, 0, 0.14, 0));
    this.head.add(mesh(new THREE.BoxGeometry(0.26, 0.17, 0.02), visor, 0, 0.15, 0.162));
    this.head.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), grey, 0.14, 0.27, 0.08));
    // PLSS backpack and SAFER under it, with four little nitrogen plumes.
    this.torso.add(mesh(new THREE.BoxGeometry(0.44, 0.5, 0.2), white, 0, 0.32, -0.21));
    this.torso.add(mesh(new THREE.BoxGeometry(0.46, 0.14, 0.24), grey, 0, 0.03, -0.21));
    this.torso.add(mesh(new THREE.BoxGeometry(0.2, 0.12, 0.05), grey, 0, 0.36, 0.13)); // chest controls
    const plume = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.6, depthWrite: false });
    for (const [x, y] of [[-0.2, 0.0], [0.2, 0.0], [-0.2, 0.6], [0.2, 0.6]] as const) {
      const p = mesh(new THREE.ConeGeometry(0.04, 0.3, 8, 1, true), plume, x, y, -0.36);
      p.rotation.x = -Math.PI / 2;
      p.visible = false;
      this.torso.add(p);
      this.jets.push(p);
    }
    this.lamp.position.set(0.14, 0.27, 0.12);
    this.lamp.target.position.set(0, -0.6, 2.5);
    this.head.add(this.lamp, this.lamp.target);
  }

  /** Hands-and-knees crawl gripping the rocks; `phase` advances with distance. */
  crawl(phase: number, amount: number): void {
    const s = Math.sin(phase) * 0.35 * amount;
    this.target = P({
      rootY: 0.5,
      rootX: 1.15,
      torso: 0.25,
      headX: -0.9,
      shoulderX: [-1.35 + s, -1.35 - s],
      shoulderZ: [0.15, -0.15],
      elbow: [-0.2, -0.2],
      hip: [-1.05 - s * 0.6, -1.05 + s * 0.6],
      knee: [1.55, 1.55],
    });
  }

  /** Floating free: arms out for balance, knees a little bent. */
  float(t: number): void {
    const b = Math.sin(t * 0.8) * 0.08;
    this.target = P({ rootY: 0.95, headX: 0.25, shoulderZ: [0.55 + b, -0.55 - b], shoulderX: [-0.3, -0.3], elbow: [-0.5, -0.5], hip: [-0.25, -0.15], knee: [0.45, 0.35] });
  }

  jetting(on: boolean): void {
    for (const j of this.jets) j.visible = on;
  }
}
