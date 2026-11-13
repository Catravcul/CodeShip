import * as THREE from "three";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { MachineId } from "@modules/station/domain/blueprint";
import type { StationLayout } from "@modules/station/domain/structure";
import type { Vec3 } from "@core/math/vec3";
import { ShipModel } from "./ship-model";
import { buildStarfield } from "./starfield";

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4, ...extra });
const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r: number, h: number, m: THREE.Material, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);

/**
 * The space station seen from outside, in the region (metres), built from its layout
 * (docs/design/estacion.md): pressurised modules like the ISS's nodes and the Gateway's HALO, a
 * truss with four solar wings that turn on their long axis to follow the Sun, radiators, the
 * fabrication module with the furnace glow, the hangar with its lit door and two IDSS ports with
 * approach lights and a docking cross. The station holds its attitude.
 */
export class StationModel {
  readonly root = new THREE.Group();
  private beacons: THREE.Mesh[] = [];
  private portLights: THREE.Mesh[] = [];
  private wings: THREE.Object3D[] = [];
  /** The station's swappable components as groups (the bay's «Estación» tab tints and picks them). */
  readonly slots = new Map<string, THREE.Group>();

  constructor(layout: StationLayout, orientation: { x: number; y: number; z: number; w: number } = { x: 0, y: 0, z: 0, w: 1 }) {
    this.build(layout);
    this.root.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
  }

  /** The station grew: build it again from its new layout (same place and attitude). */
  rebuild(layout: StationLayout): void {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.root.clear();
    this.beacons = [];
    this.portLights = [];
    this.wings = [];
    this.slots.clear();
    this.build(layout);
  }

  private build(layout: StationLayout): void {
    const slot = (id: string) => {
      let g = this.slots.get(id);
      if (!g) {
        g = new THREE.Group();
        g.userData.partId = `estacion:${id}`;
        this.slots.set(id, g);
        this.root.add(g);
      }
      return g;
    };
    const shell = slot("escudo");
    const hull = mat(0xd9dde3, { metalness: 0.25, roughness: 0.55 });
    const mli = mat(0xe8e2cf, { metalness: 0.05, roughness: 0.9 });
    const dark = mat(0x3a4250);
    const v = (p: Vec3) => new THREE.Vector3(p.x, p.y, p.z);
    for (const m of layout.modules) {
      const a = v(m.from), b = v(m.to);
      const len = a.distanceTo(b);
      const g = new THREE.Group();
      // Inflatable modules (the farm, like a B330) and the habitat wear white blankets.
      const body = cyl(m.radiusM, len, m.kind === "habitat" || m.kind === "agricola" ? mli : m.kind === "adaptador" ? dark : hull, 28);
      g.add(body);
      // Ribs every metre or so, like the ISS modules' panels.
      if (m.kind !== "adaptador")
        for (let k = 1; k < len; k += 1.4) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(m.radiusM + 0.02, 0.05, 4, 28), dark);
          rib.rotation.x = Math.PI / 2;
          rib.position.y = -len / 2 + k;
          g.add(rib);
        }
      g.position.copy(a.clone().add(b).multiplyScalar(0.5));
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      shell.add(g);
      if (m.kind === "agricola") {
        // Grow lights glowing pink through a row of windows.
        for (let k = -2; k <= 2; k++) {
          const win = box(0.9, 0.2, 0.5, new THREE.MeshBasicMaterial({ color: 0xe070ff }));
          win.position.copy(g.position).add(new THREE.Vector3(((a.x < b.x ? 1 : -1) * k * len) / 6, m.radiusM, 0));
          this.root.add(win);
        }
      }
      if (m.kind === "fabrica") {
        // Furnace glow of the refinery through a port window.
        const glow = cyl(0.7, 0.3, new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
        glow.position.copy(g.position).add(new THREE.Vector3(0, -m.radiusM, 0));
        this.root.add(glow);
      }
    }
    const panel = mat(0x1d3a7a, { metalness: 0.3, roughness: 0.35, emissive: 0x0a1430 });
    const radiatorMat = mat(0xf4f6f8, { metalness: 0.1, roughness: 0.7 });
    for (const p of layout.parts) {
      const c = v(p.centre);
      if (p.kind === "solar") {
        // Two blankets on a mast (like an ISS wing); it turns about the mast (beta gimbal).
        const wing = new THREE.Group();
        wing.position.copy(c);
        const h = p.half.y * 2;
        const mast = cyl(0.15, h, dark, 6);
        wing.add(mast);
        for (const s of [-1, 1]) {
          const blanket = box(p.half.x * 0.92 - 0.5, h * 0.96, 0.08, panel);
          blanket.position.x = s * (p.half.x * 0.46 + 0.3);
          wing.add(blanket);
        }
        this.wings.push(wing);
        slot("alas").add(wing);
      } else if (p.kind === "radiador") {
        const r = box(p.half.x * 2, 0.12, p.half.z * 2, radiatorMat);
        r.position.copy(c);
        slot("radiadores").add(r);
      } else if (p.kind === "celosia") {
        const t = box(p.half.x * 2, p.half.y * 2, p.half.z * 2, new THREE.MeshStandardMaterial({ color: 0x8a919c, metalness: 0.6, roughness: 0.5, wireframe: true }));
        t.position.copy(c);
        const core = box(p.half.x * 2, p.half.y * 0.6, p.half.z * 0.6, dark);
        core.position.copy(c);
        this.root.add(t, core);
      } else {
        const hgr = box(p.half.x * 2, p.half.y * 2, p.half.z * 2, hull.clone());
        hgr.position.copy(c);
        const door = box(p.half.x * 1.3, p.half.y * 1.4, 0.3, new THREE.MeshBasicMaterial({ color: 0xffd27f }));
        door.position.copy(c).add(new THREE.Vector3(0, 0, p.half.z + 0.2));
        this.root.add(hgr, door);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
        b.position.copy(c).add(new THREE.Vector3(0, p.half.y + 0.8, p.half.z));
        this.beacons.push(b);
        this.root.add(b);
      }
    }
    // Docking ports: a yellow guide ring, approach lights and a cross to aim at (like the mothership's).
    const lit = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const port of layout.ports) {
      const g = new THREE.Group();
      g.position.copy(v(port.position));
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), v(port.normal).normalize());
      const guide = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 8, 24), new THREE.MeshStandardMaterial({ color: 0xe8c547, emissive: 0x6a5410, emissiveIntensity: 0.6 }));
      guide.rotation.x = Math.PI / 2;
      g.add(guide);
      const c1 = box(0.9, 0.05, 0.08, lit);
      const c2 = box(0.08, 0.05, 0.9, lit);
      c1.position.y = c2.position.y = 0.02;
      g.add(c1, c2);
      for (const [dx, dz, col] of [[-1.3, 0, 0x30ff60], [1.3, 0, 0xff3030], [0, -1.3, 0xffffff], [0, 1.3, 0xffffff]] as const) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2 }));
        lamp.position.set(dx, 0.2, dz);
        this.portLights.push(lamp);
        g.add(lamp);
      }
      this.root.add(g);
    }
    this.root.traverse((o) => (o.userData.station = true));
  }

  update(timeS: number, sun?: THREE.Vector3): void {
    const on = Math.sin(timeS * 3) > 0.6;
    for (const b of this.beacons) b.visible = on;
    const blink = Math.sin(timeS * 2) > 0;
    for (const l of this.portLights) l.visible = blink;
    // Each wing turns about its mast (y) to face the Sun, like the ISS's beta gimbals.
    if (sun) {
      const local = sun.clone().applyQuaternion(this.root.quaternion.clone().invert());
      const yaw = Math.atan2(local.x, local.z);
      for (const w of this.wings) w.rotation.y = yaw;
    }
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
