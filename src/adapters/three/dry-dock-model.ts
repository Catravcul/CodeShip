import * as THREE from "three";
import type { DryDock, Segment } from "@modules/station/domain/dry-dock";

const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const UP = new THREE.Vector3(0, 1, 0);

/** A beam between two points (an open-section box, so it reads as truss and not as a pipe). */
function beam(s: Segment, m: THREE.Material, wire?: THREE.Material): THREE.Group {
  const a = v(s.from);
  const b = v(s.to);
  const len = a.distanceTo(b);
  const g = new THREE.Group();
  g.position.copy(a.clone().add(b).multiplyScalar(0.5));
  g.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  const w = s.radiusM * 2;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, len, w * 0.35), m));
  if (wire) g.add(new THREE.Mesh(new THREE.BoxGeometry(w, len, w, 1, Math.max(1, Math.round(len / w)), 1), wire));
  return g;
}

/**
 * The station's dry dock seen from outside (docs/design/dique-seco.md): an open truss cradle around
 * where the mothership lies berthed, with its hoops, two struts to the station's truss, floodlights at
 * the hoop corners, arms that close on the spine once she is in, and umbilicals to her nose. It lives
 * in the station's frame (main keeps it on the station's pose).
 */
export class DryDockModel {
  readonly root = new THREE.Group();
  private readonly arms: { g: THREE.Group; len: number }[] = [];
  private readonly umbilicals: THREE.Object3D[] = [];
  private readonly beams: THREE.Mesh[] = [];
  private readonly cones: THREE.Mesh[] = [];
  private reach = 0;
  private glow = 0;

  constructor(d: DryDock) {
    this.root.name = "dique-seco";
    const steel = new THREE.MeshStandardMaterial({ color: 0x8f98a4, metalness: 0.6, roughness: 0.45 });
    const wire = new THREE.MeshStandardMaterial({ color: 0xb4bcc6, metalness: 0.5, roughness: 0.5, wireframe: true });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xe8c547, metalness: 0.3, roughness: 0.5, emissive: 0x3a2c05 });
    for (const s of [...d.beams, ...d.links]) this.root.add(beam(s, steel, wire));
    // Arms: a boom from the frame with a yellow grapple; they slide out to the spine (setHold).
    for (const a of d.arms) {
      const from = v(a.from);
      const to = v(a.to);
      const len = from.distanceTo(to);
      const g = new THREE.Group();
      g.position.copy(from);
      g.quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize());
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(a.radiusM, a.radiusM, 1, 8), steel);
      boom.position.y = 0.5;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(a.radiusM * 5, a.radiusM * 2, a.radiusM * 5), yellow);
      grip.name = "grip";
      g.add(boom, grip);
      this.root.add(g);
      this.arms.push({ g, len });
      this.beams.push(boom);
    }
    const hose = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.8 });
    for (const u of d.umbilicals) {
      const line = beam({ ...u, radiusM: u.radiusM }, hose);
      this.umbilicals.push(line);
      this.root.add(line);
    }
    // Floodlights: a lamp and a faint cone of light at each hoop corner, aimed at the ship.
    const lamp = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xfff1c8, emissiveIntensity: 2 });
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    for (const l of d.lights) {
      const g = new THREE.Group();
      g.position.copy(v(l.at));
      g.quaternion.setFromUnitVectors(UP, v(l.aim));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), lamp));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 40, 16, 1, true), coneMat);
      cone.position.y = 20;
      cone.rotation.x = Math.PI;
      g.add(cone);
      this.cones.push(cone);
      this.root.add(g);
    }
    this.setHold(0, 0);
  }

  /** How far the arms are out (0 stowed at the frame, 1 on the spine) and how bright the floodlights are (0..1). */
  setHold(reach: number, glow: number): void {
    this.reach = reach;
    this.glow = glow;
    for (const a of this.arms) {
      const L = Math.max(0.5, a.len * (0.08 + 0.92 * reach));
      const boom = a.g.children[0]!;
      boom.scale.y = L;
      boom.position.y = L / 2;
      a.g.getObjectByName("grip")!.position.y = L;
    }
    for (const u of this.umbilicals) u.visible = reach > 0.95;
    // No real lights (each one recompiles every material of the scene): the cones and lamps glow.
    for (const c of this.cones) ((c.material as THREE.MeshBasicMaterial).opacity = 0.07 * glow);
  }

  /** Arms out and umbilicals on (0..1, for checks). */
  get holding(): number {
    return this.reach;
  }
  get lit(): number {
    return this.glow;
  }

  /**
   * Each frame: lights up as the mothership comes in (`near`), closes the arms once she is berthed and
   * opens them when she leaves (about 4 s, game value).
   */
  update(dtS: number, berthed: boolean, near: boolean): void {
    const k = Math.min(1, dtS / 4);
    const reach = this.reach + ((berthed ? 1 : 0) - this.reach) * Math.min(1, k * 3);
    const glow = this.glow + ((berthed || near ? 1 : 0) - this.glow) * Math.min(1, k * 4);
    if (Math.abs(reach - this.reach) > 1e-4 || Math.abs(glow - this.glow) > 1e-4) this.setHold(reach, glow);
  }
}
