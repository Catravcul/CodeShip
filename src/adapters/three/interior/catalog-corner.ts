import * as THREE from "three";
import { textSign } from "./sign";

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

/** One terrarium of the shelf: a land colony adopted from the catalogue. */
interface Box {
  readonly id: string;
  readonly critters: THREE.InstancedMesh;
  readonly phase: number;
}

const SLOTS = 6;
const BOX = { w: 0.42, h: 0.26, d: 0.3 } as const;
const MAX_CRITTERS = 14;

/**
 * The species catalogue terminal on the farm deck's doorway wall (docs/design/catalogo-especies.md): a standing
 * console with its screen and sign, and beside it a shelf of terrariums where the land colonies adopted from the
 * catalogue live (crickets, worms, springtails…), each a glass box with its animals drawn small, in their colour.
 */
export class CatalogCorner {
  readonly root = new THREE.Group();
  /** The shelf (kept at real size under the drawn plan by the interior). */
  readonly shelf = new THREE.Group();
  private readonly boxes: Box[] = [];
  private readonly screen: THREE.MeshStandardMaterial;
  private t = 0;
  private readonly m = new THREE.Matrix4();

  /**
   * `console: false` leaves only the shelf (on Starship the catalogue is the laptop on the animal rack,
   * catalog-laptop.ts), at `shelfX` m beside the slot.
   */
  constructor(at: THREE.Vector3, opts: { console?: boolean; shelfX?: number } = {}) {
    this.root.position.copy(at);
    // The console: a column with a slanted screen, facing the deck (+z).
    const column = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.3), std(0x2a3540, { metalness: 0.3 }));
    column.position.set(0, 0.55, 0.05);
    this.screen = new THREE.MeshStandardMaterial({ color: 0x10301e, emissive: 0x2fbf71, emissiveIntensity: 0.6 });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.03), this.screen);
    screen.position.set(0, 1.2, 0.12);
    screen.rotation.x = -0.45;
    // Leaves drawn on the screen: a stylised fern of three bars.
    for (const [x, r] of [[-0.08, 0.5], [0, 0], [0.08, -0.5]] as const) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.005), new THREE.MeshBasicMaterial({ color: 0xbff7d0 }));
      leaf.position.set(x, 0, 0.02);
      leaf.rotation.z = r;
      screen.add(leaf);
    }
    const sign = textSign("Catálogo de especies");
    sign.position.set(0, 1.85, 0);
    if (opts.console !== false) this.root.add(column, screen, sign);
    // The terrarium shelf to its left, against the wall (the aquarium is on its right).
    this.shelf.position.set(opts.shelfX ?? -0.95, 0, 0);
    const frame = std(0x6b5a44);
    for (const y of [0.35, 0.8]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.36), frame);
      board.position.set(0, y, 0);
      this.shelf.add(board);
    }
    for (const x of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.36), frame);
      leg.position.set(x, 0.55, 0);
      this.shelf.add(leg);
    }
    this.root.add(this.shelf);
  }

  /** Where slot `i` sits on the shelf: three per board. */
  private slot(i: number): THREE.Vector3 {
    return new THREE.Vector3(-0.45 + (i % 3) * 0.45, (i < 3 ? 0.35 : 0.8) + 0.015 + BOX.h / 2, 0);
  }

  /** A colony arrived: a terrarium for it, with its animals in its colour (up to six terrariums). */
  addColony(id: string, color: string, accent: string, n: number): void {
    if (this.boxes.some((b) => b.id === id) || this.boxes.length >= SLOTS) return;
    const at = this.slot(this.boxes.length);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d), new THREE.MeshStandardMaterial({ color: 0xd8eef4, transparent: true, opacity: 0.2, depthWrite: false }));
    glass.position.copy(at);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(BOX.w - 0.02, 0.05, BOX.d - 0.02), std(0x4a3622, { roughness: 1 }));
    soil.position.copy(at).setY(at.y - BOX.h / 2 + 0.03);
    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), std(new THREE.Color(accent).getHex()));
    moss.position.copy(at).add(new THREE.Vector3(0.12, -BOX.h / 2 + 0.07, -0.05));
    moss.scale.y = 0.5;
    const critters = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 6, 4), std(new THREE.Color(color).getHex()), MAX_CRITTERS);
    critters.count = Math.min(MAX_CRITTERS, Math.max(3, Math.round(Math.log2(n + 1) * 2)));
    critters.position.copy(at);
    this.shelf.add(glass, soil, moss, critters);
    this.boxes.push({ id, critters, phase: this.boxes.length * 1.7 });
  }

  /** Terrariums on the shelf (for the experience suite). */
  get colonies(): readonly string[] {
    return this.boxes.map((b) => b.id);
  }

  update(dt: number): void {
    this.t += dt;
    this.screen.emissiveIntensity = 0.5 + 0.15 * Math.sin(this.t * 1.3);
    // The animals wander slowly over the soil.
    for (const b of this.boxes) {
      for (let i = 0; i < b.critters.count; i++) {
        const a = b.phase + i * 2.4 + this.t * (0.2 + (i % 3) * 0.05);
        this.m.makeTranslation(Math.cos(a) * (BOX.w / 2 - 0.05) * ((i % 4) / 4 + 0.25), -BOX.h / 2 + 0.07, Math.sin(a * 1.3) * (BOX.d / 2 - 0.05) * 0.8);
        b.critters.setMatrixAt(i, this.m);
      }
      b.critters.instanceMatrix.needsUpdate = true;
    }
  }
}
