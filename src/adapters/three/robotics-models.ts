import * as THREE from "three";

const mat = (color: number, emissive = 0x000000, metal = 0.4) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: metal, emissive });

/**
 * Dextre (SPDM, data/robotics.ts): a 3,5 m body that pivots at the waist, with a PDGF at its head for Canadarm2
 * and two 3,5 m arms of seven joints ending in an OTCM (jaws, socket drive, camera and lights). `reach(hand, p)`
 * bends one arm so its OTCM touches a point (two links, in the body's frame).
 */
export class DextreModel {
  readonly root = new THREE.Group();
  /** The PDGF on its head, where Canadarm2's LEE takes it (local). */
  readonly head = new THREE.Vector3(0, 1.95, 0);
  private readonly arms: { upper: THREE.Mesh; lower: THREE.Mesh; otcm: THREE.Mesh; shoulder: THREE.Vector3; rest: THREE.Vector3 }[] = [];
  private readonly seg = 1.75;

  constructor() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.5, 0.9), mat(0xe9ecef));
    body.name = "Dextre";
    const pdgf = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), mat(0x56606e));
    pdgf.position.copy(this.head).add(new THREE.Vector3(0, -0.1, 0));
    // The tool holster and the two lower-body cameras.
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), mat(0x8a939c));
    holster.position.set(0, -0.8, 0.55);
    const cams = [-0.35, 0.35].map((x) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), mat(0x222831, 0x113344));
      c.position.set(x, -1.6, 0.5);
      return c;
    });
    this.root.add(body, pdgf, holster, ...cams);
    const white = mat(0xf2f4f6);
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Vector3(side * 0.55, 1.1, 0);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, this.seg, 10), white);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, this.seg, 10), white);
      const otcm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), mat(0x56606e, 0x101820));
      upper.name = lower.name = "Dextre";
      otcm.name = "OTCM de Dextre";
      this.root.add(upper, lower, otcm);
      this.arms.push({ upper, lower, otcm, shoulder, rest: new THREE.Vector3(side * 1.2, -0.6, 1.3) });
    }
    this.restArms();
  }

  /** Both arms folded in front of it. */
  restArms(): void {
    for (let i = 0; i < this.arms.length; i++) this.reachLocal(i, this.arms[i]!.rest);
  }

  /** Where hand `i`'s OTCM is (world). */
  hand(i: number): THREE.Vector3 {
    return this.arms[i]!.otcm.getWorldPosition(new THREE.Vector3());
  }

  /** Hand `i` (0 left, 1 right) to world point `p`. */
  reach(i: number, p: THREE.Vector3): void {
    this.root.updateMatrixWorld();
    this.reachLocal(i, this.root.worldToLocal(p.clone()));
  }

  private reachLocal(i: number, p: THREE.Vector3): void {
    const a = this.arms[i]!;
    const to = p.clone().sub(a.shoulder);
    const d = Math.min(to.length(), 2 * this.seg - 0.02);
    const dir = to.normalize();
    const side = new THREE.Vector3(0, 1, 0).projectOnPlane(dir);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const h = Math.sqrt(Math.max(0, this.seg ** 2 - (d / 2) ** 2));
    const elbow = a.shoulder.clone().addScaledVector(dir, d / 2).addScaledVector(side, h);
    const end = a.shoulder.clone().addScaledVector(dir, d);
    place(a.upper, a.shoulder, elbow);
    place(a.lower, elbow, end);
    a.otcm.position.copy(end);
  }
}

function place(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
}

/**
 * A Cygnus (Enhanced: 6,39 m long, 3,07 m across; Wikipedia), CBM ring up, the grapple fixture on its side near
 * the top, and its two round UltraFlex arrays (size drawn: the source gives none). `thrusting` shows the RCS
 * puffs; in free drift they stop.
 */
export class CygnusModel {
  readonly root = new THREE.Group();
  readonly lengthM = 6.39;
  readonly radiusM = 3.07 / 2;
  /** The grapple fixture (local) and its outward axis. */
  readonly grapple: THREE.Vector3;
  /** The CBM ring's face (local). */
  readonly cbm: THREE.Vector3;
  private readonly puffs: THREE.Mesh[] = [];

  constructor() {
    const L = this.lengthM;
    const r = this.radiusM;
    const pcm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L * 0.72, 20), mat(0xe8e4d8, 0, 0.2));
    pcm.name = "Cygnus";
    pcm.position.y = L * 0.14;
    const sm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, L * 0.28, 16), mat(0x8a8f96));
    sm.name = "Cygnus";
    sm.position.y = -L * 0.36;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 24), mat(0xc0c6cc));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = L / 2;
    this.cbm = new THREE.Vector3(0, L / 2 + 0.05, 0);
    this.grapple = new THREE.Vector3(r + 0.35, L * 0.3, 0);
    const frgf = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), mat(0x2a2f36, 0x2a1a00));
    frgf.rotation.z = Math.PI / 2;
    frgf.position.copy(this.grapple).add(new THREE.Vector3(-0.2, 0, 0));
    frgf.name = "Accesorio de agarre del Cygnus";
    this.root.add(pcm, sm, ring, frgf);
    // The two UltraFlex arrays, opened like fans on booms (drawn size).
    for (const s of [-1, 1]) {
      const fan = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20), new THREE.MeshStandardMaterial({ color: 0x1d2e5a, emissive: 0x060a18, side: THREE.DoubleSide, metalness: 0.3 }));
      fan.position.set(0, -L * 0.36, s * (r + 2.9));
      this.root.add(fan);
    }
    for (const [x, z] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.45 }));
      p.position.set(x * 1.15, -L * 0.42, z * 1.15);
      p.visible = false;
      this.puffs.push(p);
      this.root.add(p);
    }
  }

  set thrusting(on: boolean) {
    for (const p of this.puffs) p.visible = on;
  }

  /** Where its grapple fixture is now (world). */
  grappleWorld(): THREE.Vector3 {
    return this.root.localToWorld(this.grapple.clone());
  }
}

/** A box of an ORU (a camera, a part) with its grapple fixture (drawn). */
export function oruBox(sizeM: number, color = 0xd9b24a, name = "Pieza"): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sizeM, sizeM * 0.7, sizeM), mat(color, 0x221500, 0.6));
  m.name = name;
  return m;
}

/**
 * A label in the scene (a sprite of constant size on screen, so it stays on screen with the challenge sheet, reglas.md §4.3): the name and
 * its source's agency, readable on a phone.
 */
export function sceneLabel(text: string, screenH = 0.042): THREE.Sprite {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  const font = "600 40px system-ui, sans-serif";
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 36;
  c.width = w;
  c.height = 64;
  g.font = font;
  g.fillStyle = "rgba(2,10,16,0.78)";
  g.beginPath();
  g.roundRect(0, 0, w, 64, 16);
  g.fill();
  g.strokeStyle = "#7fdcff";
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = "#e6f8ff";
  g.textBaseline = "middle";
  g.fillText(text, 18, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Constant size on screen (a fraction of its height), whatever the distance.
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: false }));
  s.scale.set((screenH * w) / 64, screenH, 1);
  s.renderOrder = 10;
  s.name = `etiqueta: ${text}`;
  return s;
}
