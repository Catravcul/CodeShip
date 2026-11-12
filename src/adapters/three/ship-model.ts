import * as THREE from "three";
import type { ShipDesign, ThrustCommand } from "@modules/ship/domain/ship";
import type { Propellant, ThrusterModel } from "@modules/ship/domain/components";
import type { RcsThruster } from "@modules/ship/domain/rcs-layout";
import { explorerDesign } from "@modules/ship/data/explorer";
import { MMH_DENSITY, MMH_NTO_MIXTURE_RATIO, NTO_DENSITY, PROPELLANT_DENSITY, tankVolumeM3 } from "@modules/ship/data/propellants";

/** Ids of the ship's parts, as the ship bay names them (see modules/ship-bay). */
export type PartId = "casco" | "motor" | "rcs" | `tanque-${number}` | "alas-solares" | "bateria" | "escudo-mmod" | "sistemas-fijos" | `nodriza-equipo:${string}` | `maquina:${string}` | `propulsor:${string}` | "cubierta-cultivo" | "despensa";

const v3 = (v: { x: number; y: number; z: number }) => new THREE.Vector3(v.x, v.y, v.z);
const sphereR = (volumeM3: number) => Math.cbrt((3 * volumeM3) / (4 * Math.PI));

/**
 * The ship seen from outside, built from its design: hull of the design's size, the main engine
 * drawn from its real model (bipropellant bell or hydrazine catalyst chamber, sized by thrust), one
 * nozzle per RCS thruster where the layout puts it, tanks sized by capacity / propellant density,
 * solar wings, and plumes that light up with the pilot's commands. A part swap rebuilds it.
 * Every part is a group tagged with its PartId so the ship bay can pick and highlight it.
 */
export class ShipModel {
  readonly root = new THREE.Group();
  readonly parts = new Map<PartId, THREE.Group>();
  private mainFlame: THREE.Mesh | null = null;
  private puffs: { mesh: THREE.Mesh; t: RcsThruster }[] = [];
  private design: ShipDesign | null = null;
  private systems: { id: PartId; label: string }[] = [];
  private systemsVisible = false;

  constructor(design: ShipDesign = explorerDesign()) {
    this.setDesign(design);
  }

  /** Rebuild if the design changed (a part swap gives a new design object). */
  setDesign(design: ShipDesign): void {
    if (design === this.design) return;
    this.design = design;
    this.build(design);
  }

  /**
   * Inner systems (life-support machines, farm deck, stores) shown as beacons on the hull, for the
   * ship bay. The habitat ring itself is not part of this exterior model yet.
   */
  setSystems(systems: { id: PartId; label: string }[], visible: boolean): void {
    this.systems = systems;
    this.systemsVisible = visible;
    if (this.design) this.build(this.design);
  }

  private part(id: PartId): THREE.Group {
    let g = this.parts.get(id);
    if (!g) {
      g = new THREE.Group();
      g.userData.partId = id;
      this.parts.set(id, g);
      this.root.add(g);
    }
    return g;
  }

  private clear(): void {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.root.clear();
    this.parts.clear();
    this.puffs = [];
  }

  private build(design: ShipDesign): void {
    this.clear();
    const size = v3(design.hull.size);
    // Each part has its own materials so the bay can tint one part without touching the others.
    const hullMat = () => new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.5, metalness: 0.4 });
    const dark = () => new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.6, metalness: 0.6 });
    const add = (id: PartId, ...objs: THREE.Object3D[]) => this.part(id).add(...objs);

    // --- Hull, nose, canopy, landing legs ---
    const glass = new THREE.MeshStandardMaterial({ color: 0x1d4f6a, roughness: 0.1, metalness: 0.2, emissive: 0x0a2a3a });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hullMat());
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(size.y * 0.42, size.y * 0.5, 0.9, 16), hullMat());
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -size.z / 2 - 0.45;
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    canopy.position.set(0, size.y / 2 - 0.1, -size.z / 2 + 0.9);
    canopy.scale.set(1.2, 0.6, 1.4);
    add("casco", hull, nose, canopy);
    // Landing legs under the belly (0.5 m, see GEAR_LEG_M) with round pads.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), dark());
        leg.position.set(sx * (size.x / 2 - 0.25), -size.y / 2 - 0.25, sz * (size.z / 2 - 0.5));
        leg.rotation.z = sx * 0.25;
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 12), dark());
        pad.position.set(sx * (size.x / 2 - 0.18), -size.y / 2 - 0.5, sz * (size.z / 2 - 0.5));
        add("casco", leg, pad);
      }

    // Dorsal docking port (the probe latches to the mothership with it), with its guide ring.
    if (design.dockingPort) {
      const port = v3(design.dockingPort);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, port.y - size.y / 2, 20), dark());
      collar.position.set(port.x, (port.y + size.y / 2) / 2, port.z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xe8c547, roughness: 0.4, metalness: 0.5 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(port.x, port.y, port.z);
      add("casco", collar, ring);
    }

    // --- Main engine ---
    const engine = design.mainEngines[0];
    if (engine) this.buildEngine(engine.model, v3(engine.position), dark);

    // --- Power source: what is fitted (solar wings sized by power, RTGs, or nothing) ---
    const source = design.equipment.find((e) => e.kind === "energia");
    if (source?.solar) {
      // The starting 1.5 kW wings are drawn 3.2 × 1.4 m; others scale with power (ROSA is long and narrow).
      const k = Math.sqrt(source.powerW / 1500);
      const span = source.id.startsWith("rosa") ? 8.6 / 2 : 3.2 * k;
      const chord = source.id.startsWith("rosa") ? 0.8 : 1.4 * k;
      const cell = new THREE.MeshStandardMaterial({ color: 0x1a2a6a, roughness: 0.3, metalness: 0.5, emissive: 0x050a20 });
      for (const sx of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), dark());
        arm.position.set(sx * (size.x / 2 + 0.4), 0, 0.6);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(span, 0.04, chord), sx < 0 ? cell : cell.clone());
        wing.position.set(sx * (size.x / 2 + 0.8 + span / 2), 0, 0.6);
        add("alas-solares", arm, wing);
      }
    } else if (source && source.powerW > 0) {
      // Two finned RTG cylinders (0.67 m long, 0.64 m across the fins) on struts at the stern.
      for (const sx of [-1, 1]) {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.67, 12), dark());
        const fins = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.6, 0.04), dark());
        const fins2 = fins.clone();
        fins2.rotation.y = Math.PI / 2;
        const g = new THREE.Group();
        g.add(body, fins, fins2);
        g.position.set(sx * (size.x / 2 + 0.5), 0, size.z / 2 - 0.6);
        add("alas-solares", g);
      }
    }
    // --- Whipple shield: a thin bumper standing off the cabin's sides and belly (the canopy and port stay clear) ---
    const shield = design.equipment.find((e) => e.kind === "escudo" && e.bumper);
    if (shield?.bumper) {
      const off = shield.bumper.standoffCm / 100;
      const sheet = new THREE.MeshStandardMaterial({ color: shield.bumper.material === "Acero" ? 0x8a8f96 : 0xc9ced6, roughness: 0.6, metalness: 0.7, transparent: true, opacity: 0.55 });
      const len = size.z * 0.45;
      const z = -size.z / 2 + len / 2 + 0.1;
      const belly = new THREE.Mesh(new THREE.BoxGeometry(size.x + 2 * off, 0.02, len), sheet);
      belly.position.set(0, -size.y / 2 - off, z);
      add("escudo-mmod", belly);
      for (const sx of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.02, size.y + off, len), sheet);
        side.position.set(sx * (size.x / 2 + off), -off / 2, z);
        add("escudo-mmod", side);
      }
    }

    // --- Tanks: sphere volume = capacity / density. MMH/NTO is a pair (fuel left, oxidizer right). ---
    design.tanks.forEach((t, i) => this.buildTank(i, t.spec.propellant, t.spec.capacityKg, size));

    // --- RCS: one pod per mount point, one nozzle per thruster, pointing along its exhaust. ---
    this.buildRcs(design.rcs, size, dark);

    // --- Inner systems as beacons on the hull (ship bay only) ---
    if (this.systemsVisible) this.buildBeacons(size);
  }

  private buildEngine(m: ThrusterModel, at: THREE.Vector3, dark: () => THREE.MeshStandardMaterial): void {
    // Drawn larger than life so it reads at 16 m; size grows with the square root of thrust.
    const k = Math.sqrt(m.thrustN / 490);
    const g = this.part("motor");
    const biprop = m.propellant === "MMH/NTO";
    if (biprop) {
      // Radiation-cooled bell (R-4D style: dark niobium/rhenium, long expansion).
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.5 * k, 0.8 * k, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a2f45, roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide }));
      bell.rotation.x = -Math.PI / 2;
      bell.position.copy(at).add(new THREE.Vector3(0, 0, 0.4 * k));
      const valves = new THREE.Mesh(new THREE.BoxGeometry(0.35 * k, 0.2 * k, 0.15), dark());
      valves.position.copy(at).add(new THREE.Vector3(0, 0, 0.05));
      g.add(bell, valves);
    } else {
      // Hydrazine monopropellant: a catalyst-bed chamber with heaters and a short, narrow nozzle.
      const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * k, 0.2 * k, 0.4 * k, 16), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.35, metalness: 0.8 }));
      chamber.rotation.x = Math.PI / 2;
      chamber.position.copy(at).add(new THREE.Vector3(0, 0, 0.2 * k));
      const heater = new THREE.Mesh(new THREE.TorusGeometry(0.21 * k, 0.03, 6, 20), new THREE.MeshStandardMaterial({ color: 0xc86a2a, roughness: 0.5, metalness: 0.4 }));
      heater.position.copy(at).add(new THREE.Vector3(0, 0, 0.25 * k));
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * k, 0.26 * k, 0.4 * k, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide }));
      nozzle.rotation.x = -Math.PI / 2;
      nozzle.position.copy(at).add(new THREE.Vector3(0, 0, 0.6 * k));
      g.add(chamber, heater, nozzle);
    }
    // Hypergolic MMH/NTO burns with a visible plume; hydrazine decomposition exhaust is nearly clear.
    this.mainFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.45 * k, 2.6 * k, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: biprop ? 0x9fd8ff : 0xe8f0ff, transparent: true, opacity: biprop ? 0.7 : 0.3, depthWrite: false }),
    );
    this.mainFlame.rotation.x = Math.PI / 2;
    this.mainFlame.position.copy(at).add(new THREE.Vector3(0, 0, 2.1 * k));
    this.mainFlame.visible = false;
    this.root.add(this.mainFlame);
  }

  private buildTank(i: number, p: Propellant, capacityKg: number, size: THREE.Vector3): void {
    const id: PartId = `tanque-${i}`;
    const g = this.part(id);
    const steel = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.3 });
    if (p === "MMH/NTO") {
      const of = MMH_NTO_MIXTURE_RATIO;
      const fuel = capacityKg / (1 + of) / MMH_DENSITY;
      const ox = (capacityKg * of) / (1 + of) / NTO_DENSITY;
      [
        [-1, fuel, 0xc9a0a0],
        [1, ox, 0xa0b4c9],
      ].forEach(([sx, vol, color]) => {
        const r = sphereR(vol!);
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), steel(color!));
        s.position.set(sx! * (size.x / 2 + r * 0.55), 0.25, -0.9);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.025, 6, 24), steel(0x40444c));
        strap.position.copy(s.position);
        strap.rotation.y = Math.PI / 2;
        g.add(s, strap);
      });
    } else {
      const r = sphereR(tankVolumeM3(p, capacityKg));
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), steel(0xe0e4ea));
      s.position.set(0, size.y / 2 + r * 0.55, 1.2);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.025, 6, 24), steel(0x40444c));
      strap.position.copy(s.position);
      g.add(s, strap);
    }
    g.userData.densityKgM3 = PROPELLANT_DENSITY[p].value;
  }

  private buildRcs(rcs: readonly RcsThruster[], size: THREE.Vector3, dark: () => THREE.MeshStandardMaterial): void {
    const g = this.part("rcs");
    const pods = new Map<string, THREE.Vector3>();
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
    const nozzleMat = dark();
    for (const t of rcs) {
      const at = v3(t.position);
      // Mounts at the nose and tail face centres sit where the nose cone and the engine are drawn:
      // the pod is drawn just past the nose and just above the engine so both stay visible.
      if (at.z < -size.z / 2 + 1e-6) at.z -= 0.95;
      if (at.z > size.z / 2 - 1e-6) at.y += 0.75;
      const key = `${at.x.toFixed(2)},${at.y.toFixed(2)},${at.z.toFixed(2)}`;
      if (!pods.has(key)) {
        pods.set(key, at);
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), nozzleMat);
        pod.position.copy(at);
        g.add(pod);
      }
      // Nozzle size from thrust (MR-111G 4 N small, MR-107T 110 N big).
      const k = Math.max(0.6, Math.min(2.2, Math.sqrt(t.model.thrustN / 22)));
      const exhaust = v3(t.direction).multiplyScalar(-1).normalize();
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.05 * k, 0.12 * k, 8, 1, true), nozzleMat);
      nozzle.position.copy(at).addScaledVector(exhaust, 0.13 + 0.06 * k);
      nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), exhaust.clone().multiplyScalar(-1));
      g.add(nozzle);
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.08 * k, 0.5 * k, 8, 1, true), puffMat);
      p.position.copy(at).addScaledVector(exhaust, 0.2 + 0.25 * k + 0.06 * k);
      p.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), exhaust);
      p.visible = false;
      this.root.add(p);
      this.puffs.push({ mesh: p, t });
    }
  }

  private buildBeacons(size: THREE.Vector3): void {
    const n = this.systems.length;
    this.systems.forEach((s, i) => {
      const g = this.part(s.id);
      const color = s.id.startsWith("maquina:") ? 0x7dffb0 : s.id === "cubierta-cultivo" ? 0x9be36a : 0xffd27f;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), new THREE.MeshStandardMaterial({ color: 0x60666e }));
      const bulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
      // A row along the spine of the hull, behind the canopy.
      const z = -size.z / 2 + 1.9 + ((size.z - 2.4) * i) / Math.max(1, n - 1);
      const x = i % 2 ? 0.55 : -0.55;
      stalk.position.set(x, size.y / 2 + 0.17, z);
      bulb.position.set(x, size.y / 2 + 0.42, z);
      g.add(stalk, bulb);
    });
  }

  /** Show plumes for the current command: each thruster fires like Ship.fire would fire it. */
  thrust(cmd: ThrustCommand, t: number): void {
    if (this.mainFlame) {
      this.mainFlame.visible = cmd.mainThrottle > 0;
      this.mainFlame.scale.setScalar(0.9 + 0.15 * Math.sin(t * 40));
    }
    for (const { mesh, t: th } of this.puffs) {
      const d = th.direction;
      const duty =
        th.role === "translation"
          ? d.x * cmd.translation.x + d.y * cmd.translation.y + d.z * cmd.translation.z
          : th.position.cross(d).normalize().dot(cmd.rotation);
      mesh.visible = duty > 0;
    }
  }
}
