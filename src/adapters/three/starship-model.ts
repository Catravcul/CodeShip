import * as THREE from "three";
import type { MothershipSpec } from "@modules/mothership/domain/mothership";
import type { MountFit } from "@modules/mothership/domain/propulsion";
import type { PartId } from "./ship-model";

/**
 * Starship seen from outside (docs/design/nodriza-starship.md), in the game's body frame: hull along z,
 * nose to −z. Real sizes from the spec (data/starship.ts): a 9 m stainless-steel barrel, the ogive nose
 * with the header tanks, the heat-shield tiles on the windward half, two forward and two aft flaps, the
 * 3 sea-level Raptors (inner ring) and 3 vacuum Raptors (outer ring, big bells), the HLS-style band of
 * body-mounted solar cells, the IDSS docking ports (the nose's and our ventral one for the lander) and
 * the flight-deck windows. Procedural and cheap: a few lathe and box meshes, shared materials.
 */
export class StarshipModel {
  readonly root = new THREE.Group();
  readonly parts = new Map<PartId, THREE.Group>();
  private readonly lights: THREE.Mesh[] = [];
  /** The vacuum Raptors' plumes and the RCS puffs, shown while they fire (setThrust). */
  private readonly plumes = new THREE.Group();
  private readonly puffs = new THREE.Group();
  private rcsOn = false;

  constructor(
    readonly spec: MothershipSpec,
    systems: readonly { id: PartId; label: string }[] = [],
  ) {
    const l = spec.layout;
    const R = l.spine.radiusM;
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.35, metalness: 0.85 });
    const tiles = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.9, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.6, metalness: 0.6 });
    const bell = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.5, metalness: 0.8, side: THREE.DoubleSide });
    const solar = new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.3, metalness: 0.5, emissive: 0x0a1430, emissiveIntensity: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.1, metalness: 0.2, emissive: 0x30506a, emissiveIntensity: 0.4 });

    // The nose cone is the forward 10 m (our reading of photos); the barrel runs from there to the skirt.
    const tipZ = -l.lengthM / 2;
    const noseLen = 10;
    const barrelFrom = tipZ + noseLen;
    // Barrel: steel on the leeward half (+y), tiles on the windward half (−y); along z.
    const barrelLen = l.spine.toZ - barrelFrom;
    for (const [mat, start] of [
      [steel, 0],
      [tiles, Math.PI],
    ] as const) {
      const half = new THREE.Mesh(new THREE.CylinderGeometry(R, R, barrelLen, 24, 1, true, start, Math.PI), mat);
      half.rotation.x = Math.PI / 2;
      half.position.z = (barrelFrom + l.spine.toZ) / 2;
      this.root.add(half);
    }
    // Ogive nose (lathe profile, tip at −z).
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(R * Math.sqrt(1 - t * t) + 0.01, t * noseLen));
    }
    const nose = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), steel);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = barrelFrom + 0.01;
    this.root.add(nose);
    // Header tanks show as a weld band near the tip; the flight deck windows just below them.
    const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.72, 0.06, 4, 24), dark);
    band.position.z = barrelFrom - noseLen * 0.6;
    this.root.add(band);
    for (const a of [-0.35, 0, 0.35]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.1), glass);
      const t = (barrelFrom - l.nodeZ) / noseLen;
      const r = R * Math.sqrt(Math.max(0, 1 - t * t)) - 0.02;
      w.position.set(Math.sin(a) * r, Math.cos(a) * r, l.nodeZ);
      w.rotation.z = -a;
      w.rotation.x = Math.PI / 2;
      this.root.add(w);
    }
    // Body-mounted solar cells (Starship HLS): a band round the hull, leeward half.
    const cells = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 4, 24, 1, true, 0.25, Math.PI - 0.5), solar);
    cells.rotation.x = Math.PI / 2;
    cells.position.z = -5;
    this.root.add(cells);
    // Flaps: thin plates out to each side.
    for (const f of l.flaps ?? [])
      for (const s of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(f.spanM, 0.25, f.toZ - f.fromZ), tiles);
        plate.position.set(s * (R + f.spanM / 2 - 0.2), -0.6, (f.fromZ + f.toZ) / 2);
        this.root.add(plate);
      }
    // Engines: 3 sea-level Raptors (1,3 m bells) round the centre, 3 vacuum Raptors (2,4 m bells) outside.
    const aft = l.spine.toZ;
    const bellOf = (d: number, len: number) => {
      const g = new THREE.CylinderGeometry(0.25, d / 2, len, 20, 1, true);
      const m = new THREE.Mesh(g, bell);
      m.rotation.x = -Math.PI / 2;
      return m;
    };
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const sl = bellOf(1.3, 1.6);
      sl.position.set(Math.sin(a) * 1.1, Math.cos(a) * 1.1, aft + 0.6);
      const vac = bellOf(2.4, 3.2);
      vac.position.set(Math.sin(a + Math.PI / 3) * 3.0, Math.cos(a + Math.PI / 3) * 3.0, aft + 1.0);
      this.root.add(sl, vac);
    }
    const skirt = new THREE.Mesh(new THREE.CircleGeometry(R, 24), dark);
    skirt.position.z = aft;
    this.root.add(skirt);
    // Docking ports: the nose's (station) and our ventral one (the lander), with approach lights.
    const port = (at: THREE.Vector3, normal: THREE.Vector3) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 6, 20), dark);
      ring.position.copy(at);
      ring.lookAt(at.clone().add(normal));
      this.root.add(ring);
      for (const [s, color] of [
        [-1, 0x4cff6a],
        [1, 0xff4c4c],
      ] as const) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 }));
        lamp.position.copy(at).add(new THREE.Vector3(s * 1.1, 0, 0));
        this.root.add(lamp);
        this.lights.push(lamp);
      }
    };
    port(new THREE.Vector3(l.port.position.x, l.port.position.y + 0.1, l.port.position.z), new THREE.Vector3(l.port.normal.x, l.port.normal.y, l.port.normal.z));
    port(new THREE.Vector3(0, 0, tipZ - 0.1), new THREE.Vector3(0, 0, -1));
    // Plumes: faint blue cones behind the vacuum bells; RCS puffs (cold-gas jets: at the nose and the skirt).
    const plumeMat = new THREE.MeshBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 14, 16, 1, true), plumeMat);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(Math.sin(a) * 3.0, Math.cos(a) * 3.0, aft + 1.0 + 8.5);
      this.plumes.add(cone);
    }
    this.plumes.visible = false;
    this.root.add(this.plumes);
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xf2f6ff, transparent: true, opacity: 0.55, depthWrite: false });
    for (const z of [tipZ + 6, aft - 1.5])
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const dir = new THREE.Vector3(Math.sin(a), Math.cos(a), 0);
        const puff = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 8, 1, true), puffMat);
        puff.position.copy(dir.clone().multiplyScalar(R + 1.1)).setZ(z);
        puff.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().negate());
        this.puffs.add(puff);
      }
    this.puffs.visible = false;
    this.root.add(this.puffs);
    // Systems for the ship bay: beacons along the payload section.
    systems.forEach((s, i) => {
      const g = new THREE.Group();
      g.position.set(0, R * 0.6, -16 + i * 2.5);
      g.userData.label = s.label;
      this.root.add(g);
      this.parts.set(s.id, g);
    });
  }

  /** Starship has no electric thruster mounts: nothing to redraw. */
  setThrusters(_fits: readonly MountFit[]): void {}

  /** Main engines (a burn far from a station) and RCS (turns, flips, proximity) firing now. */
  setThrust(main: boolean, rcs: boolean): void {
    this.plumes.visible = main;
    this.rcsOn = rcs;
    if (!rcs) this.puffs.visible = false;
  }

  /** Blink the docking lights (no rings to turn); the RCS fires in short pulses. */
  update(_dt: number, _omegaRadS: number, timeS: number): void {
    if (this.rcsOn) this.puffs.visible = Math.floor(timeS * 4) % 3 === 0;
    const on = Math.floor(timeS * 1.5) % 2 === 0;
    for (const l of this.lights) (l.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2.4 : 0.6;
  }
}
