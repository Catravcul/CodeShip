import * as THREE from "three";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { MachineId } from "@modules/station/domain/blueprint";
import { ShipModel } from "./ship-model";
import { buildStarfield } from "./starfield";

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4, ...extra });
const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r: number, h: number, m: THREE.Material, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);

/**
 * The space station seen from outside, in the region (metres): a truss with solar arrays, two
 * pressurised modules, the refinery tower and the hangar with its lit door. A simple model.
 */
export class StationModel {
  readonly root = new THREE.Group();
  private readonly beacons: THREE.Mesh[] = [];

  constructor() {
    const hull = mat(0xc9ced6);
    const dark = mat(0x3a4250);
    const truss = box(140, 4, 4, dark);
    this.root.add(truss);
    const panel = mat(0x1d3a7a, { metalness: 0.2, roughness: 0.3, emissive: 0x0a1430 });
    for (const x of [-60, -42, 42, 60]) {
      const p = box(14, 0.4, 46, panel);
      p.position.set(x, 0, 0);
      this.root.add(p);
    }
    for (const [x, len] of [
      [-18, 26],
      [18, 26],
    ] as const) {
      const m = cyl(5, len, hull);
      m.rotation.z = Math.PI / 2;
      m.position.set(x, 7, 0);
      this.root.add(m);
    }
    // Hangar: a big box under the truss with a lit door facing +z.
    const hangar = box(40, 18, 30, hull);
    hangar.position.set(0, -12, 0);
    this.root.add(hangar);
    const door = box(26, 12, 0.5, new THREE.MeshBasicMaterial({ color: 0xffd27f }));
    door.position.set(0, -12, 15.3);
    this.root.add(door);
    // Refinery tower with its furnace glow.
    const tower = cyl(4, 28, dark);
    tower.position.set(-30, -14, -6);
    this.root.add(tower);
    const glow = cyl(4.2, 3, new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
    glow.position.set(-30, -22, -6);
    this.root.add(glow);
    for (const p of [
      [70, 0, 0],
      [-70, 0, 0],
      [0, -21, 15],
    ] as const) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
      b.position.set(p[0], p[1], p[2]);
      this.beacons.push(b);
      this.root.add(b);
    }
    this.root.traverse((o) => (o.userData.station = true));
  }

  update(timeS: number): void {
    const on = Math.sin(timeS * 3) > 0.6;
    for (const b of this.beacons) b.visible = on;
    // It holds position slowly turning to keep the arrays on the Sun (game choice).
    this.root.rotation.y = timeS * 0.01;
  }
}

/** Part of the screen the 3D view may use: the rest is covered by the station panel or the challenge sheet. */
export interface StationInset {
  readonly right: number;
  readonly bottom: number;
}

/**
 * Inside the station's hangar: the player's ship parked, the three machines (refinery, foundry and
 * metal printer, lit while they work), the spare parts on a rack and the probes built so far.
 */
export class StationScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.05, 3000);
  readonly ship: ShipModel;
  private readonly machines = new Map<MachineId, { light: THREE.Mesh; base: number }>();
  private readonly rack = new THREE.Group();
  private readonly probes = new THREE.Group();
  private yaw = 0.7;
  private pitch = -0.32;
  private dist = 22;
  private inset: StationInset = { right: 0, bottom: 0 };
  private rackKey = "";

  constructor(design: ShipDesign) {
    this.scene.background = new THREE.Color(0x05070c);
    // Room 34 × 14 × 28 m (floor at y = -2); the front wall has the open hangar door, stars beyond.
    const wall = new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.9, side: THREE.DoubleSide });
    const plane = (w: number, h: number, x: number, y: number, z: number, rx: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wall);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, 0);
      this.scene.add(m);
    };
    plane(34, 28, 0, -2, 0, -Math.PI / 2, 0);
    plane(34, 28, 0, 12, 0, Math.PI / 2, 0);
    plane(34, 14, 0, 5, -14, 0, 0);
    plane(28, 14, -17, 5, 0, 0, Math.PI / 2);
    plane(28, 14, 17, 5, 0, 0, -Math.PI / 2);
    plane(6, 14, -14, 5, 14, 0, 0);
    plane(6, 14, 14, 5, 14, 0, 0);
    plane(22, 4, 0, 10, 14, 0, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd27f }));
    frame.position.set(0, 8, 14);
    this.scene.add(frame);
    const grid = new THREE.GridHelper(34, 34, 0x3d4c66, 0x283244);
    grid.position.y = -1.99;
    this.scene.add(grid);
    this.scene.add(buildStarfield(900, 1500));
    // Ceiling floodlights.
    const key = new THREE.DirectionalLight(0xf2f6ff, 2.2);
    key.position.set(6, 12, 8);
    const fill = new THREE.DirectionalLight(0x9fc8ff, 0.8);
    fill.position.set(-8, 6, -4);
    this.scene.add(key, fill, new THREE.HemisphereLight(0xc8d4e8, 0x30343c, 1.1));
    for (let i = -2; i <= 2; i++) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xeef4ff }));
      lamp.position.set(i * 6.5, 11.8, 0);
      this.scene.add(lamp);
    }
    this.ship = new ShipModel(design);
    this.ship.root.position.set(0, 0, 2);
    this.scene.add(this.ship.root);

    const add = (id: MachineId, x: number, z: number, body: THREE.Object3D, light: THREE.Mesh) => {
      body.position.set(x, 0, z);
      this.scene.add(body);
      light.position.add(body.position);
      this.scene.add(light);
      this.machines.set(id, { light, base: (light.material as THREE.MeshBasicMaterial).color.getHex() });
    };
    // Refinery: furnace column with a glowing window.
    const refinery = new THREE.Group();
    const col = cyl(1.6, 9, mat(0x56606e));
    col.position.y = 2.5;
    refinery.add(col);
    const pipe = cyl(0.3, 6, mat(0x8a929e));
    pipe.position.set(2, 3, 0);
    refinery.add(pipe);
    const rWin = box(1.4, 1.2, 0.2, new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
    rWin.position.set(0, 1, 1.6);
    add("refineria", -12, -8, refinery, rWin);
    // Foundry: squat box with a crucible glow.
    const foundry = box(4, 3, 3, mat(0x6b5a4a));
    foundry.position.y = -0.5;
    const fGlow = box(2.4, 0.5, 0.2, new THREE.MeshBasicMaterial({ color: 0xffb347 }));
    fGlow.position.set(0, 0.5, 1.55);
    add("fundicion", -4, -10, foundry, fGlow);
    // Metal printer: frame with a glass cube and a laser spot.
    const printer = new THREE.Group();
    const base = box(3, 1, 3, mat(0x3d4552));
    base.position.y = -1.5;
    printer.add(base);
    const glass = box(3, 3, 3, new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.18, roughness: 0.1 }));
    glass.position.y = 0.5;
    printer.add(glass);
    const laser = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2fd0ff }));
    laser.position.set(0, -0.6, 0);
    add("impresora", 5, -10, printer, laser);
    // Parts rack along the left wall, probes parked on the right.
    this.rack.position.set(-15, -2, -3);
    this.scene.add(this.rack);
    this.probes.position.set(9, -2, -4);
    this.scene.add(this.probes);
  }

  orbit(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.max(-1.0, Math.min(0.1, this.pitch + dPitch));
  }

  setInset(inset: StationInset): void {
    this.inset = inset;
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const fullW = w + this.inset.right;
    const fullH = h + this.inset.bottom;
    this.camera.aspect = fullW / fullH;
    if (this.inset.right || this.inset.bottom) this.camera.setViewOffset(fullW, fullH, this.inset.right, this.inset.bottom, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Spare parts on the rack (one crate per part) and probes on the floor. */
  setStore(parts: readonly [string, number][], probes: number): void {
    const key = JSON.stringify([parts, probes]);
    if (key === this.rackKey) return;
    this.rackKey = key;
    this.rack.clear();
    this.probes.clear();
    const crate = mat(0xd9a441);
    const shelf = box(1.8, 0.15, 11, mat(0x56606e));
    for (const y of [0, 1.6, 3.2]) {
      const sh = shelf.clone();
      sh.position.set(0, y, 4.5);
      this.rack.add(sh);
    }
    let i = 0;
    for (const [, n] of parts)
      for (let k = 0; k < Math.min(n, 4); k++, i++) {
        const c = box(1.4, 1, 1.4, crate);
        c.position.set(0, 0.5 + Math.floor(i / 6) * 1.6, (i % 6) * 1.8);
        this.rack.add(c);
      }
    for (let p = 0; p < probes; p++) {
      const g = new THREE.Group();
      g.add(box(1.2, 1.2, 1.2, mat(0xe8e8ee)));
      const wing = box(3.4, 0.08, 0.9, mat(0x1d3a7a));
      g.add(wing);
      g.position.set((p % 3) * 4, 0.6, Math.floor(p / 3) * 3);
      this.probes.add(g);
    }
  }

  /** The ship is only in the hangar when it is docked at the station. */
  update(dt: number, design: ShipDesign, busy: ReadonlySet<MachineId>, shipDocked: boolean): void {
    this.ship.setDesign(design);
    this.ship.root.visible = shipDocked;
    this.yaw += dt * 0.05;
    const visibleAspect = (window.innerWidth - this.inset.right) / Math.max(1, window.innerHeight - this.inset.bottom);
    const d = this.dist * Math.max(1, 1.2 / visibleAspect);
    const off = new THREE.Vector3(0, 0, d).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    off.y = Math.min(off.y, 9);
    off.x = Math.max(-15, Math.min(15, off.x));
    off.z = Math.max(-12, Math.min(12.5, off.z));
    this.camera.position.copy(off);
    this.camera.lookAt(0, 0, -1);
    const t = performance.now() / 1000;
    for (const [id, m] of this.machines) {
      const on = busy.has(id);
      const c = (m.light.material as THREE.MeshBasicMaterial).color;
      c.setHex(on ? m.base : 0x222222);
      if (on) c.multiplyScalar(0.7 + 0.3 * Math.sin(t * 8 + id.length));
      if (id === "impresora") m.light.position.x = 5 + (on ? Math.sin(t * 3) * 0.9 : 0);
    }
  }
}
