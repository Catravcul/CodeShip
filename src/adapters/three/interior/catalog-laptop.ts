import * as THREE from "three";
import type { CrewGear } from "./crew-gear";

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15, ...extra });
/** The rack's face stands this far out of the wall, m (as the AQH's: on the wall plane it would flicker into it). */
const FACE_M = 0.03;
/** The laptop: an HP ZBook 15 as on the ISS, about 38 × 26 × 2,6 cm closed with a 15,6″ screen (catalog-laptop note in gear.ts). */
const LAPTOP = { w: 0.38, d: 0.26, t: 0.026, screenH: 0.24 } as const;
/** Rows of the species list drawn on its screen, with the colour of each species' icon. */
const ROWS = [0xffa040, 0xff8a3d, 0xe8e2cf, 0x9a6a3a, 0x7dffb0, 0xbfd6e6] as const;

/**
 * The species catalogue's place (reglas.md §2.3: a management window opens from a machine of the compartment where
 * it is done): the animal rack beside the AQH, with a laptop on its swing arm at her chest, as the ISS's laptops are
 * fixed to the racks, its screen showing the catalogue (a list of species with their icons). The rack's lower half
 * holds the stowage lockers of the habitats' food and kit. Same model on the station (Kibo) and on Starship.
 * Local frame: origin at the rack's front centre on the wall, +z out into the aisle, +y up.
 */
export class CatalogLaptopModel implements CrewGear {
  readonly kind = "catalogo" as const;
  readonly root = new THREE.Group();
  readonly feet: THREE.Vector3;
  /** The screen's centre (where she and the camera look), in the model's frame. */
  readonly focus: THREE.Vector3;
  private readonly glow: THREE.MeshStandardMaterial;
  private readonly cursor: THREE.Mesh;
  private t = 0;

  constructor(k: number, rack: { w: number; h: number } = { w: 1.05, h: 2.0 }) {
    this.root.name = "gear-catalogo";
    const W = rack.w * k;
    const H = rack.h * k;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, FACE_M), std(0xb9c1ca));
    shell.position.z = FACE_M / 2;
    this.root.add(shell);
    // Lockers (the habitats' food and kit) in the lower half, each with its two latches.
    const locker = std(0xe6e9ec);
    const latch = std(0x39424e);
    for (let r = 0; r < 2; r++)
      for (const sx of [-1, 1]) {
        const lw = W / 2 - 0.06;
        const lh = H * 0.12;
        const y = -H / 2 + 0.12 * k + lh / 2 + r * (lh + 0.04);
        const box = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, 0.03), locker);
        box.position.set((sx * W) / 4, y, FACE_M + 0.015);
        this.root.add(box);
        for (const lx of [-0.3, 0.3]) {
          const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.015), latch);
          l.position.set((sx * W) / 4 + lx * lw, y + lh / 2 - 0.04, FACE_M + 0.037);
          this.root.add(l);
        }
      }
    // The arm: a plate on the rack, two links and a tray at her chest (a little below the rack's middle), left of
    // the rack's middle so the wall's handrails beside it stay clear.
    const y0 = -0.2 * k;
    const x0 = -0.25 * k;
    const arm = std(0x8a929e);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.02), arm);
    plate.position.set(x0, y0 - 0.06, FACE_M + 0.01);
    const link1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 10), arm);
    link1.rotation.x = Math.PI / 2;
    link1.position.set(x0, y0 - 0.06, FACE_M + 0.07);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), std(0x5d6672));
    joint.position.set(x0, y0 - 0.06, FACE_M + 0.12);
    const link2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 10), arm);
    link2.position.set(x0, y0 - 0.04, FACE_M + 0.12);
    const trayD = LAPTOP.d + 0.02;
    const tray = new THREE.Mesh(new THREE.BoxGeometry(LAPTOP.w + 0.04, 0.012, trayD), arm);
    tray.position.set(x0, y0 - 0.012, FACE_M + 0.06 + trayD / 2);
    this.root.add(plate, link1, joint, link2, tray);
    // The laptop: its base (keyboard and touchpad) on the tray, held by a strap, and the screen open a little past upright.
    const lap = new THREE.Group();
    lap.position.set(x0, y0, tray.position.z);
    this.root.add(lap);
    const base = new THREE.Mesh(new THREE.BoxGeometry(LAPTOP.w, LAPTOP.t * 0.6, LAPTOP.d), std(0x2a2f36, { metalness: 0.4 }));
    base.position.y = LAPTOP.t * 0.3;
    const keys = new THREE.Mesh(new THREE.BoxGeometry(LAPTOP.w - 0.04, 0.002, LAPTOP.d * 0.42), std(0x14171c));
    keys.position.set(0, LAPTOP.t * 0.6 + 0.001, -LAPTOP.d * 0.12);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.06), std(0x3a414b));
    pad.position.set(0, LAPTOP.t * 0.6 + 0.001, LAPTOP.d * 0.28);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, LAPTOP.t * 0.7, LAPTOP.d + 0.01), std(0x2b3a52, { roughness: 1 }));
    strap.position.set(LAPTOP.w / 2 - 0.05, LAPTOP.t * 0.35, 0);
    lap.add(base, keys, pad, strap);
    const hinge = new THREE.Group();
    hinge.position.set(0, LAPTOP.t * 0.6, -LAPTOP.d / 2);
    hinge.rotation.x = -0.25;
    lap.add(hinge);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(LAPTOP.w, LAPTOP.screenH, 0.008), std(0x2a2f36, { metalness: 0.4 }));
    lid.position.set(0, LAPTOP.screenH / 2, -0.004);
    hinge.add(lid);
    // The screen: the catalogue, a green header and a list of species, each with its icon's colour.
    this.glow = new THREE.MeshStandardMaterial({ color: 0x0a1a12, emissive: 0x0e2a1c, emissiveIntensity: 1 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(LAPTOP.w - 0.03, LAPTOP.screenH - 0.03), this.glow);
    screen.position.set(0, LAPTOP.screenH / 2, 0.0005);
    hinge.add(screen);
    const ui = (w: number, h: number, x: number, y: number, color: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color }));
      m.position.set(x, y, 0.001);
      hinge.add(m);
      return m;
    };
    const top = LAPTOP.screenH - 0.03;
    ui(LAPTOP.w - 0.05, 0.022, 0, top, 0x2fbf71);
    ui(0.12, 0.006, -0.1, top, 0xeafff2);
    ROWS.forEach((c, i) => {
      const y = top - 0.035 - i * 0.028;
      ui(0.018, 0.018, -LAPTOP.w / 2 + 0.04, y, c);
      ui(0.14, 0.005, -0.04, y + 0.004, 0xd8f6ff);
      ui(0.09, 0.004, -0.065, y - 0.005, 0x7fa8c8);
      ui(0.05, 0.012, LAPTOP.w / 2 - 0.055, y, i < 2 ? 0xffd27f : 0x2fbf71);
    });
    this.cursor = ui(0.008, 0.012, 0.02, top - 0.06, 0xffffff);
    this.focus = new THREE.Vector3(x0, y0 + 0.1, lap.position.z - LAPTOP.d / 2 + 0.03);
    // She floats in front of it, her chest at the laptop.
    this.feet = new THREE.Vector3(x0, y0 - 1.1, 0.8);
  }

  tick(dt: number): void {
    this.t += dt;
    this.glow.emissiveIntensity = 0.9 + 0.1 * Math.sin(this.t * 1.3);
    this.cursor.position.x = 0.02 + 0.06 * Math.sin(this.t * 0.7);
  }
}
