import * as THREE from "three";
import type { StepAct } from "@modules/chores/domain/step-visual";
import type { RingAquarium } from "@modules/sanctuary/domain/aquarium";
import { textSign } from "./sign";

/** Tank inside sizes, m: 1,6 × 0,8 × 0,8 = 1,02 m³ (the domain's 1 000 L). Its base sits on a 0,75 m cabinet. */
export const TANK = { w: 1.6, h: 0.8, d: 0.8, base: 0.75 } as const;

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

/**
 * The ring aquarium on the farm deck: cabinet, glass tank, gravel, hornwort, biofilter and LED bar, a medaka
 * school drawn as one organism (Cold Sanctuary's `Swarm`: one state, many bodies) and the snails. It follows
 * the domain tank: the glass greens with algae, the school comes to the front glass once they are friends (and
 * rises to warn), and the snails climb the glass when asked to clean it. Solved steps play on the tank (`react`).
 */
export class AquariumModel {
  readonly root = new THREE.Group();
  private readonly fish: THREE.InstancedMesh;
  private readonly fishPhase: { a: number; r: number; y: number; s: number }[] = [];
  private readonly snails: THREE.InstancedMesh;
  private readonly snailAt: THREE.Vector3[] = [];
  private readonly film: THREE.Mesh;
  private readonly water: THREE.MeshStandardMaterial;
  private readonly flakes: THREE.Points;
  private readonly glow: THREE.Mesh;
  private readonly weeds = new THREE.Group();
  private readonly centre = new THREE.Vector3();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly prev: THREE.Vector3[] = [];
  private t = 0;
  private flakeT = -1;
  private glowT = -1;
  private washT = -1;
  /** Where the school is heading now (for the experience suite): "libre", "cristal" or "superficie". */
  school: "libre" | "cristal" | "superficie" = "libre";

  constructor(at: THREE.Vector3) {
    this.root.position.copy(at);
    const { w, h, d, base } = TANK;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, base, d + 0.1), std(0x3b2f28));
    cab.position.y = base / 2;
    this.root.add(cab);
    const y0 = base;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0xcfe9f2, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }));
    glass.position.y = y0 + h / 2;
    this.water = new THREE.MeshStandardMaterial({ color: 0x5fa8b8, transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false });
    const water = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.08, d - 0.02), this.water);
    water.position.y = y0 + (h - 0.08) / 2;
    this.root.add(water, glass);
    // Algae film on the front glass (the side Doménica stands at, +z).
    this.film = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.02, h - 0.1), new THREE.MeshStandardMaterial({ color: 0x4f8a2a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.film.position.set(0, y0 + (h - 0.1) / 2, d / 2 - 0.004);
    this.root.add(this.film);
    const gravel = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, 0.06, d - 0.02), std(0x8a7d6a, { roughness: 1 }));
    gravel.position.y = y0 + 0.03;
    this.root.add(gravel);
    // Hornwort: rootless strands drifting in the water column (instanced: two draw calls for the whole bed).
    const weedMat = std(0x3f8f3a, { roughness: 0.8 });
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.012, 0.12, 5), weedMat, 9 * 5);
    const leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(0.02, 0.06, 4), weedMat, 9 * 5 * 3);
    const mm = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    let si = 0;
    let li = 0;
    for (let i = 0; i < 9; i++) {
      const x = -w / 2 + 0.12 + ((i * 0.37) % (w - 0.24));
      const z = -d / 2 + 0.12 + ((i * 0.23) % 0.3);
      for (let k = 0; k < 5; k++) {
        const y = y0 + 0.12 + k * 0.11;
        stems.setMatrixAt(si++, mm.makeTranslation(x, y, z));
        for (let j = 0; j < 3; j++) leaves.setMatrixAt(li++, mm.makeTranslation(x, y + 0.02, z).multiply(rot.makeRotationZ((j - 1) * 0.9)));
      }
    }
    this.weeds.add(stems, leaves);
    this.root.add(this.weeds);
    // Biofilter canister beside the tank, with its return pipe; LED bar on top (day/night photoperiod).
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 12), std(0x2a3540, { metalness: 0.4 }));
    filter.position.set(w / 2 + 0.16, base - 0.22 + 0.45, -0.1);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, h, 6), std(0x1d252c));
    pipe.position.set(w / 2 - 0.06, y0 + h / 2, -d / 2 + 0.06);
    const led = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 1.2 }));
    led.position.set(0, y0 + h + 0.03, 0);
    this.root.add(filter, pipe, led);
    // The medaka school: orange «himedaka», one instance each.
    // Drawn a little larger than a real 3,5 cm medaka so a phone can see the school.
    const body = new THREE.ConeGeometry(0.013, 0.055, 5);
    body.rotateX(Math.PI / 2);
    this.fish = new THREE.InstancedMesh(body, std(0xffa040, { roughness: 0.4, emissive: 0x6a3000 }), 40);
    for (let i = 0; i < 40; i++) {
      this.fishPhase.push({ a: i * 2.39, r: 0.05 + (i % 7) * 0.018, y: ((i * 37) % 11) / 11 - 0.5, s: 0.8 + (i % 5) * 0.1 });
      this.prev.push(new THREE.Vector3());
    }
    this.root.add(this.fish);
    // Snails on the gravel (instanced).
    this.snails = new THREE.InstancedMesh(new THREE.TorusGeometry(0.018, 0.01, 6, 10), std(0x9a6a3a, { roughness: 0.5 }), 12);
    for (let i = 0; i < 12; i++) this.snailAt.push(new THREE.Vector3(-w / 2 + 0.1 + ((i * 0.53) % (w - 0.2)), y0 + 0.07, -d / 2 + 0.1 + ((i * 0.31) % (d - 0.2))));
    this.root.add(this.snails);
    // Food flakes and the program glow (mind challenges): hidden until a step plays.
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3));
    this.flakes = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xd9a04a, size: 0.012 }));
    this.flakes.visible = false;
    this.root.add(this.flakes);
    this.glow = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, d + 0.04), new THREE.MeshBasicMaterial({ color: 0x5ad7ff, transparent: true, opacity: 0, wireframe: true }));
    this.glow.position.y = y0 + h / 2;
    this.root.add(this.glow);
    const label = textSign("Acuario del anillo · 1 m³");
    label.position.set(0, y0 + h + 0.9, 0);
    this.root.add(label);
    this.centre.set(0, y0 + h / 2, 0);
  }

  /** Solved steps acted out on the tank: flakes fall, the glass is wiped, a program glows over the school. */
  react(acts: readonly StepAct[]): void {
    for (const a of acts) {
      if (a.action === "servir" || a.action === "verter") this.flakeT = 0;
      else if (a.action === "lavar") this.washT = 0;
      else if (a.action === "programar") this.glowT = 0;
    }
  }

  /** Follow the tank and animate; `viewer` is where Doménica is (the school comes to her when they are friends). */
  update(dt: number, tank: RingAquarium, viewer: THREE.Vector3): void {
    this.t += dt;
    const { w, h, d, base } = TANK;
    const y0 = base;
    // The glass: algae film, briefly wiped when a step cleans it.
    const fm = this.film.material as THREE.MeshStandardMaterial;
    const wipe = this.washT >= 0 ? Math.max(0, 1 - this.washT / 1.2) : 0;
    fm.opacity = Math.min(0.7, tank.algae * 0.9) * (1 - wipe);
    if (this.washT >= 0) this.washT = this.washT > 1.5 ? -1 : this.washT + dt;
    this.water.color.setHex(0x5fa8b8).lerp(new THREE.Color(0x6f9a4a), Math.min(1, tank.nitrateMgL / 80));
    // Where the school goes: to the surface at the front when they warn, the front glass when she is near and they are friends.
    const local = this.root.worldToLocal(viewer.clone());
    const near = Math.hypot(local.x, local.z - d / 2) < 2.2;
    const warn = tank.helping("medakas-avisan") && tank.nitrateMgL >= 30;
    this.school = warn ? "superficie" : tank.friends && near ? "cristal" : "libre";
    // At the glass they gather beside her, not behind her (the camera looks over her shoulder).
    const beside = local.x < 0.1 ? Math.min(0.55, local.x + 0.5) : Math.max(-0.55, local.x - 0.5);
    const target =
      this.school === "superficie"
        ? new THREE.Vector3(beside, y0 + h - 0.16, d / 2 - 0.12)
        : this.school === "cristal"
          ? new THREE.Vector3(beside, y0 + h / 2, d / 2 - 0.12)
          : new THREE.Vector3(Math.sin(this.t * 0.31) * (w / 2 - 0.3), y0 + h / 2 + Math.sin(this.t * 0.53) * 0.12, Math.cos(this.t * 0.23) * (d / 2 - 0.25));
    this.centre.lerp(target, Math.min(1, dt * 0.8));
    const pos = new THREE.Vector3();
    for (let i = 0; i < 40; i++) {
      const p = this.fishPhase[i]!;
      const a = p.a + this.t * p.s * 1.4;
      pos.set(this.centre.x + Math.cos(a) * p.r * 1.6, this.centre.y + p.y * 0.12 + Math.sin(a * 1.3) * 0.02, this.centre.z + Math.sin(a) * p.r);
      pos.x = Math.max(-w / 2 + 0.04, Math.min(w / 2 - 0.04, pos.x));
      pos.y = Math.max(y0 + 0.1, Math.min(y0 + h - 0.1, pos.y));
      pos.z = Math.max(-d / 2 + 0.04, Math.min(d / 2 - 0.04, pos.z));
      const prev = this.prev[i]!;
      const dir = pos.clone().sub(prev);
      if (dir.lengthSq() > 1e-10) this.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
      prev.copy(pos);
      this.m.compose(pos, this.q, new THREE.Vector3(1, 1, 1));
      this.fish.setMatrixAt(i, this.m);
    }
    this.fish.instanceMatrix.needsUpdate = true;
    // Snails: on the gravel, or up the front glass grazing when asked.
    const up = tank.helping("caracoles-limpian");
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), up ? 0 : Math.PI / 2);
    this.snailAt.forEach((at, i) => {
      const gx = -w / 2 + 0.1 + ((i * 0.53) % (w - 0.2));
      const goal = up ? new THREE.Vector3(gx, y0 + 0.15 + ((i * 0.29) % 0.5) + Math.sin(this.t * 0.2 + i) * 0.03, d / 2 - 0.012) : new THREE.Vector3(gx, y0 + 0.07, -d / 2 + 0.1 + ((i * 0.31) % (d - 0.2)));
      at.lerp(goal, Math.min(1, dt * 0.3));
      this.snails.setMatrixAt(i, this.m.compose(at, turn, new THREE.Vector3(1, 1, 1)));
    });
    this.snails.instanceMatrix.needsUpdate = true;
    this.weeds.rotation.z = Math.sin(this.t * 0.6) * 0.01;
    // Flakes drift down from the surface.
    if (this.flakeT >= 0) {
      this.flakes.visible = true;
      const attr = this.flakes.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 60; i++) attr.setXYZ(i, ((i * 0.37) % 1) * 0.6 - 0.3 + this.centre.x * 0.3, y0 + h - 0.08 - this.flakeT * 0.05 * (1 + (i % 4)), ((i * 0.61) % 1) * 0.4 - 0.2);
      attr.needsUpdate = true;
      this.flakeT += dt;
      if (this.flakeT > 4) {
        this.flakeT = -1;
        this.flakes.visible = false;
      }
    }
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    if (this.glowT >= 0) {
      gm.opacity = 0.7 * Math.max(0, 1 - this.glowT / 2) * (0.6 + 0.4 * Math.sin(this.glowT * 12));
      this.glowT = this.glowT > 2 ? -1 : this.glowT + dt;
    } else gm.opacity = 0;
  }
}
