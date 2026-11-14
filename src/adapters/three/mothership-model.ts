import * as THREE from "three";
import type { MothershipSpec } from "@modules/mothership/domain/mothership";
import { Mothership } from "@modules/mothership/domain/mothership";
import { MOUNT_PITCH_FACTOR, mountGrid, type MountFit } from "@modules/mothership/domain/propulsion";
import { wingCorners } from "@modules/mothership/domain/thermal";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import type { PartId } from "./ship-model";

/**
 * The mothership seen from outside, in its body frame (spine along z, forward −z): the forward node
 * with the docking port and its approach lights, the non-rotating spine, the two counter-rotating
 * rings (open truss rim with pressurised segments: the habitat module and the big farm deck with its
 * glowing skylights on one, cabins and water tanks on the twin), the pressurised spine modules
 * (workshop, stores, airlock), the two-sided radiator wings sized from the waste heat and tapered
 * to stay in the shield's shadow, the reactor behind its conical shadow shield with its Brayton
 * converters, and the two thruster pods (what they hold is swappable).
 * Systems (life-support machines, farm deck, stores) can be tagged as parts for the ship bay.
 */
export class MothershipModel {
  readonly root = new THREE.Group();
  readonly parts = new Map<PartId, THREE.Group>();
  private readonly hab = new THREE.Group();
  private readonly twin = new THREE.Group();
  private readonly lights: THREE.Mesh[] = [];
  private angle = 0;
  private readonly pods = new Map<string, THREE.Group>();

  constructor(
    readonly spec: MothershipSpec,
    systems: readonly { id: PartId; label: string }[] = [],
  ) {
    const l = spec.layout;
    const r = spec.ring;
    const shell = new THREE.MeshStandardMaterial({ color: 0xd2d7de, roughness: 0.55, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.6, metalness: 0.6 });
    const truss = new THREE.MeshStandardMaterial({ color: 0x8a919b, roughness: 0.5, metalness: 0.7 });
    const lit = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc870, emissiveIntensity: 1.3 });
    const farmGlow = new THREE.MeshStandardMaterial({ color: 0xc8f0b0, emissive: 0xb6f29a, emissiveIntensity: 1.0 });
    const box = (x: number, y: number, z: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m);
    const alongZ = (radius: number, length: number, m: THREE.Material, seg = 20) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, seg), m);
      c.rotation.x = Math.PI / 2;
      return c;
    };

    // --- Spine: four longerons, a frame every 8 m and diagonal bracing on each face (an open truss) ---
    const sl = l.spine.toZ - l.spine.fromZ;
    const sz = (l.spine.toZ + l.spine.fromZ) / 2;
    const half = l.spine.radiusM * 0.7;
    for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const rod = alongZ(0.12, sl, truss, 6);
      rod.position.set(x * half, y * half, sz);
      this.root.add(rod);
    }
    for (let z = l.spine.fromZ; z <= l.spine.toZ; z += 8) {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(l.spine.radiusM, 0.1, 4, 4), truss);
      frame.rotation.z = Math.PI / 4;
      frame.position.z = z;
      this.root.add(frame);
    }
    {
      const bay = 8;
      const bays = Math.floor(sl / bay);
      const diag = Math.hypot(bay, 2 * half);
      const braces = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, diag), truss, bays * 4);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const tilt = Math.atan2(2 * half, bay);
      let k = 0;
      for (let i = 0; i < bays; i++) {
        const zc = l.spine.fromZ + (i + 0.5) * bay;
        const flip = i % 2 ? 1 : -1;
        for (const [ax, ay, axis] of [[half, 0, "y"], [-half, 0, "y"], [0, half, "x"], [0, -half, "x"]] as const) {
          q.setFromEuler(axis === "y" ? new THREE.Euler(flip * tilt, 0, 0) : new THREE.Euler(0, flip * tilt, 0));
          braces.setMatrixAt(k++, m4.compose(new THREE.Vector3(ax, ay, zc), q, new THREE.Vector3(1, 1, 1)));
        }
      }
      this.root.add(braces);
    }
    // Pressurised tunnel through the spine from the node to the hubs (the crew's way to the rings).
    const tunnel = alongZ(0.7, l.twinRingZ - l.nodeZ + r.widthM / 2, shell, 14);
    tunnel.position.z = (l.nodeZ + l.twinRingZ + r.widthM / 2) / 2;
    this.root.add(tunnel);

    // --- Forward node with the docking port underneath ---
    const node = alongZ(l.nodeRadiusM, 9, shell, 24);
    node.position.z = l.nodeZ;
    const noseCap = new THREE.Mesh(new THREE.SphereGeometry(l.nodeRadiusM, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    noseCap.rotation.x = -Math.PI / 2;
    noseCap.position.z = l.nodeZ - 4.5;
    this.root.add(node, noseCap);
    // Pressurised spine modules between the node and the hubs: airlock, stores, workshop.
    for (const sm of l.spineModules) {
      const len = sm.toZ - sm.fromZ;
      const can = alongZ(sm.radiusM, len, shell, 24);
      can.position.z = (sm.fromZ + sm.toZ) / 2;
      this.root.add(can);
      for (const z of [sm.fromZ + 0.15, sm.toZ - 0.15]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(sm.radiusM, 0.08, 6, 24), dark);
        ring.position.z = z;
        this.root.add(ring);
      }
      if (sm.id === "esclusa") {
        // Outer EVA hatch on the starboard side, with its handrails.
        const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 20), dark);
        hatch.rotation.z = Math.PI / 2;
        hatch.position.set(sm.radiusM + 0.1, 0, (sm.fromZ + sm.toZ) / 2);
        this.root.add(hatch);
      }
    }
    const p = l.port.position;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.5, 24), dark);
    collar.position.set(p.x, p.y + 0.25, p.z);
    const guide = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 8, 24), new THREE.MeshStandardMaterial({ color: 0xe8c547, emissive: 0x6a5410, emissiveIntensity: 0.6 }));
    guide.rotation.x = Math.PI / 2;
    guide.position.set(p.x, p.y + 0.02, p.z);
    this.root.add(collar, guide);
    // Approach lights around the port (green to port side, red to starboard, white ahead and behind).
    for (const [dx, dz, c] of [[-1.3, 0, 0x30ff60], [1.3, 0, 0xff3030], [0, -1.3, 0xffffff], [0, 1.3, 0xffffff]] as const) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 }));
      lamp.position.set(p.x + dx, p.y + 0.2, p.z + dz);
      this.lights.push(lamp);
      this.root.add(lamp);
    }
    // Docking target: a cross on a standoff, seen through the probe's overhead window.
    const target = box(0.9, 0.05, 0.08, lit);
    target.position.set(p.x, p.y - 0.01, p.z);
    const target2 = box(0.08, 0.05, 0.9, lit);
    target2.position.copy(target.position);
    this.root.add(target, target2);

    // --- The two rings: turn about z ---
    this.buildRing(this.hab, l.habRingZ, true, shell, dark, truss, lit, farmGlow, systems);
    this.buildRing(this.twin, l.twinRingZ, false, shell, dark, truss, lit, farmGlow, []);
    this.root.add(this.hab, this.twin);

    // --- Radiator wings: two-sided panels, edge-on to the reactor, tapered into the shadow cone ---
    const rad = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide });
    const w = l.radiator;
    for (const s of [1, -1] as const) {
      const c = wingCorners(w, s);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap((i) => [c[i]!.x, c[i]!.y, c[i]!.z]), 3));
      geo.computeVertexNormals();
      this.root.add(new THREE.Mesh(geo, rad));
      // Panel seams across the wing and the coolant manifold along its root.
      const n = 8;
      for (let i = 1; i < n; i++) {
        const z = w.fromZ + ((w.toZ - w.fromZ) * i) / n;
        const span = w.spanM + ((w.spanAftM - w.spanM) * i) / n;
        const rib = box(span, 0.18, 0.18, dark);
        rib.position.set(s * (w.innerX + span / 2), 0, z);
        this.root.add(rib);
      }
      const manifold = alongZ(0.25, w.toZ - w.fromZ, dark, 8);
      manifold.position.set(s * w.innerX, 0, (w.fromZ + w.toZ) / 2);
      this.root.add(manifold);
    }

    // --- Reactor behind its conical shadow shield, and the four Brayton converters ---
    const ms = new Mothership(spec, Vec3.ZERO, Quat.IDENTITY);
    const sh = l.shield;
    // Cylinder +y becomes +z (aft, toward the reactor): narrow top near the reactor, wide base forward.
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(ms.shieldRadiusAt(sh.nearZ), ms.shieldRadiusAt(sh.farZ), sh.nearZ - sh.farZ, 28), dark);
    shield.rotation.x = Math.PI / 2;
    shield.position.z = (sh.nearZ + sh.farZ) / 2;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 20), new THREE.MeshStandardMaterial({ color: 0x6b6f76, roughness: 0.4, metalness: 0.8 }));
    core.rotation.x = Math.PI / 2;
    core.position.z = l.reactorZ;
    this.root.add(shield, core);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const conv = alongZ(0.45, 2.4, shell, 12);
      conv.position.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, sh.farZ - 3);
      this.root.add(conv);
    }

    // --- Two thruster pods (mounts), firing aft; what they hold is swappable (setThrusters) ---
    spec.propulsion.mounts.forEach((m, i) => {
      const sy = i === 0 ? 1 : -1;
      const strut = box(0.5, 6, 0.5, truss);
      strut.position.set(0, sy * 4, l.thrusterZ);
      const g = this.part(`propulsor:${m.id}` as PartId, this.root);
      // Own material per pod so the bay can tint one alone.
      const pod = box(m.faceWidthM, m.faceHeightM, 3, (dark as THREE.MeshStandardMaterial).clone());
      g.position.set(0, sy * 7.5, l.thrusterZ);
      g.add(pod);
      this.root.add(strut);
      this.pods.set(m.id, g);
    });
    this.setThrusters(spec.propulsion.fitted);
  }

  /** Lay out the heads each pod holds on its grid (same pitch rule as the domain). */
  setThrusters(fits: readonly MountFit[]): void {
    for (const m of this.spec.propulsion.mounts) {
      const g = this.pods.get(m.id);
      if (!g) continue;
      for (const old of g.children.filter((c) => c.userData.head)) {
        g.remove(old);
        if (old instanceof THREE.Mesh) old.geometry.dispose();
      }
      const f = fits.find((x) => x.mountId === m.id);
      if (!f || !f.count) continue;
      const t = f.thruster;
      const { cols, rows } = mountGrid(m, t);
      const pitch = t.diameterM * MOUNT_PITCH_FACTOR;
      const usedCols = Math.min(cols, Math.ceil(f.count / Math.max(1, rows)));
      const usedRows = Math.min(rows, Math.ceil(f.count / Math.max(1, usedCols)));
      const glow = t.family === "vasimr" ? 0xc050ff : t.family === "ionico" ? 0x40a0ff : 0x2050ff;
      const mat = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.5, metalness: 0.7, emissive: glow, emissiveIntensity: 0.25 });
      for (let k = 0; k < f.count; k++) {
        const c = k % usedCols;
        const r = Math.floor(k / usedCols);
        const len = t.family === "vasimr" ? 2.5 : 0.5;
        const head = new THREE.Mesh(new THREE.CylinderGeometry(t.diameterM / 2, t.diameterM / 2, len, 16), mat);
        head.rotation.x = Math.PI / 2;
        head.userData.head = true;
        head.position.set((c - (usedCols - 1) / 2) * pitch, ((usedRows - 1) / 2 - r) * pitch, 1.5 + len / 2);
        g.add(head);
      }
    }
  }

  private part(id: PartId, parent: THREE.Object3D): THREE.Group {
    let g = this.parts.get(id);
    if (!g) {
      g = new THREE.Group();
      g.userData.partId = id;
      this.parts.set(id, g);
      parent.add(g);
    }
    return g;
  }

  /** A box segment on the rim at angle `a` (0 = straight down, −y), `len` along the floor. */
  private segment(g: THREE.Object3D, R: number, a: number, len: number, height: number, width: number, m: THREE.Material): THREE.Mesh {
    const s = new THREE.Mesh(new THREE.BoxGeometry(len, height, width), m);
    const rc = R - height / 2;
    s.position.set(Math.sin(a) * rc, -Math.cos(a) * rc, 0);
    s.rotation.z = a;
    g.add(s);
    return s;
  }

  private buildRing(
    g: THREE.Group,
    z: number,
    habitat: boolean,
    shell: THREE.Material,
    dark: THREE.Material,
    truss: THREE.Material,
    lit: THREE.Material,
    farmGlow: THREE.Material,
    systems: readonly { id: PartId; label: string }[],
  ): void {
    const r = this.spec.ring;
    const R = r.floorRadiusM;
    const w = r.widthM;
    g.position.z = z;
    // Open truss rim: two rails at the ring's edges and cross-ties every 10°.
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(R - 1, 0.5, 6, 160), truss);
      rail.position.z = side * (w / 2 - 0.5);
      g.add(rail);
      const inner = new THREE.Mesh(new THREE.TorusGeometry(R - r.deckHeightM, 0.25, 6, 160), truss);
      inner.position.z = side * (w / 2 - 0.5);
      g.add(inner);
    }
    // Pressurised corridor along the rim, joining the segments (one can walk all the way round).
    const corridor = new THREE.Mesh(new THREE.TorusGeometry(R - 1.6, 1.3, 10, 180), shell);
    g.add(corridor);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, w - 1), truss);
      tie.position.set(Math.sin(a) * (R - 1), -Math.cos(a) * (R - 1), 0);
      g.add(tie);
    }
    // Hub with its bearing and three spokes (one carries the elevator).
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 6, 20), shell);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const len = R - r.deckHeightM - 3;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, len, 10), shell);
      spoke.position.set(Math.sin(a) * (3 + len / 2), -Math.cos(a) * (3 + len / 2), 0);
      spoke.rotation.z = a;
      g.add(spoke);
    }
    if (habitat) {
      // Habitat module (12 m) and, right after it along the floor, the farm deck (18 × 18 × 7 m).
      this.segment(g, R, 0, 12, 2.6 + 0.6, 4.6, shell);
      this.segment(g, R - 2.7, 0, 10, 0.2, 4.7, lit);
      const farmA = 12 / R / 2 + 18 / R / 2 + 0.01;
      const farm = this.segment(g, R, farmA, 18, r.deckHeightM + 0.6, w, shell);
      const sky = this.segment(g, R - r.deckHeightM - 0.35, farmA, 16, 0.15, w - 2, farmGlow);
      for (const side of [-1, 1]) {
        const pane = this.segment(g, R - 1.5, farmA, 16, 4, 0.1, farmGlow);
        pane.position.z = side * (w / 2 + 0.06);
      }
      // Counterweights opposite the farm deck: water tanks (they double as storage).
      for (const da of [-0.12, 0.12]) this.segment(g, R, farmA + Math.PI + da, 6, 5, 8, dark);
      this.segment(g, R, Math.PI, 8, 3, 4.6, shell);
      // Systems tagged for the ship bay: the module's machines, the farm deck and the stores.
      for (const [i, s] of systems.entries()) {
        const pg = this.part(s.id, g);
        if (s.id === "cubierta-cultivo") {
          // The farm deck itself is the part; own materials so the bay can tint it alone.
          farm.material = shell.clone();
          sky.material = farmGlow.clone();
          pg.add(farm, sky);
        }
        else {
          const color = s.id.startsWith("maquina:") ? 0x7dffb0 : 0xffd27f;
          const bulb = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
          // A row of beacons along the module's roof, side by side.
          const n = systems.length;
          const t = n <= 1 ? 0 : i / (n - 1) - 0.5;
          const a = t * (12 / R);
          bulb.position.set(Math.sin(a) * (R - 5), -Math.cos(a) * (R - 5), ((i % 2) - 0.5) * 2.4);
          pg.add(bulb);
        }
      }
    } else {
      // Twin: three cabin blocks and three water/stores tanks between them (balanced).
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
        this.segment(g, R, a, 14, 4, 8, shell);
        this.segment(g, R - 3.3, a, 12, 0.2, 8.1, lit);
        this.segment(g, R, a + Math.PI / 3, 8, 5, 10, dark);
      }
    }
  }

  /** Turn the rings (the twin the other way) and blink the approach lights. */
  update(dt: number, omegaRadS: number, timeS: number): void {
    this.angle = (this.angle + omegaRadS * dt) % (Math.PI * 2);
    this.hab.rotation.z = this.angle;
    this.twin.rotation.z = -this.angle;
    const on = Math.floor(timeS * 1.5) % 2 === 0;
    for (const l of this.lights) (l.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2.4 : 0.6;
  }
}
