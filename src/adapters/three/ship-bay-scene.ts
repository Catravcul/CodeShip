import * as THREE from "three";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { Attention } from "@modules/ship-bay/domain/attention";
import { ShipModel, type PartId } from "./ship-model";
import { buildStarfield } from "./starfield";
import type { MothershipModel } from "./mothership-model";

/** Which ship the bay shows: the probe, or the mothership (scaled down to fit the same camera). */
export type BayView = "sonda" | "nodriza";
/** The mothership is shown at 1:10 so the bay's orbit camera and zoom work for both. */
const MOTHERSHIP_SCALE = 0.1;

const TINT: Readonly<Record<Attention | "seleccion", number>> = { ok: 0x000000, aviso: 0xff9a1f, critico: 0xff2a2a, seleccion: 0x2fd0ff };

/** The part of the screen the 3D view may use: the rest is covered by the bay panel or the challenge sheet. */
export interface Inset {
  readonly right: number;
  readonly bottom: number;
}

/**
 * The ship bay's 3D view: the ship in space with an orbit camera that eases towards the selected
 * part, picking by tap, and parts tinted by how urgently they need a look (orange warning, red
 * critical, cyan selected, pulsing).
 */
export class ShipBayScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.05, 5000);
  readonly model: ShipModel;
  private readonly box = new THREE.Box3Helper(new THREE.Box3(), 0x2fd0ff);
  private readonly raycaster = new THREE.Raycaster();
  private readonly target = new THREE.Vector3();
  private readonly focus = new THREE.Vector3();
  private yaw = 2.35;
  private pitch = -0.38;
  private dist = 17;
  private distGoal = 17;
  private turnTo: { yaw: number; pitch: number } | null = null;
  private inset: Inset = { right: 0, bottom: 0 };
  private _view: BayView = "sonda";
  private mothership?: MothershipModel;

  constructor(design: ShipDesign) {
    this.scene.background = new THREE.Color(0x03050a);
    this.scene.add(buildStarfield(2000, 3000));
    const sun = new THREE.DirectionalLight(0xfff4e6, 3);
    sun.position.set(-6, 8, 5);
    const rim = new THREE.DirectionalLight(0x6fb8ff, 0.8);
    rim.position.set(5, -3, -6);
    this.scene.add(sun, rim, new THREE.AmbientLight(0x334455, 0.6));
    this.model = new ShipModel(design);
    this.scene.add(this.model.root, this.box);
    this.box.visible = false;
  }

  /** Put the mothership in the bay (its systems are its parts). */
  addMothership(m: MothershipModel): void {
    this.mothership = m;
    m.root.scale.setScalar(MOTHERSHIP_SCALE);
    // Centre it on its rings.
    m.root.position.set(0, 0, -((m.spec.layout.habRingZ + m.spec.layout.twinRingZ) / 2) * MOTHERSHIP_SCALE);
    m.root.visible = false;
    this.scene.add(m.root);
  }

  get view(): BayView {
    return this._view;
  }

  setView(v: BayView): void {
    if (v === this._view || (v === "nodriza" && !this.mothership)) return;
    this._view = v;
    this.model.root.visible = v === "sonda";
    if (this.mothership) this.mothership.root.visible = v === "nodriza";
    this.yaw = v === "nodriza" ? 2.6 : 2.35;
    this.select(null);
  }

  private get parts(): Map<PartId, THREE.Group> {
    return this._view === "nodriza" && this.mothership ? this.mothership.parts : this.model.parts;
  }

  private get root(): THREE.Object3D {
    return this._view === "nodriza" && this.mothership ? this.mothership.root : this.model.root;
  }

  orbit(dYaw: number, dPitch: number): void {
    if (dYaw || dPitch) this.turnTo = null;
    this.yaw += dYaw;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dPitch));
  }

  zoom(factor: number): void {
    this.distGoal = Math.max(5, Math.min(this._view === "nodriza" ? 60 : 40, this.distGoal * factor));
  }

  /** Ease the camera towards a part (or the whole ship) and outline it. */
  select(id: PartId | null): void {
    const g = id ? this.parts.get(id) : undefined;
    if (!g) {
      this.target.set(0, 0, 0);
      this.distGoal = this._view === "nodriza" ? 34 : 17;
      this.box.visible = false;
      return;
    }
    const b = new THREE.Box3().setFromObject(g);
    b.getCenter(this.target);
    const r = b.getSize(new THREE.Vector3()).length();
    this.distGoal = Math.max(6, Math.min(this._view === "nodriza" ? 24 : 18, r * 2.2 + 4));
    // Swing round to a three-quarter view of the part's side, so the hull does not hide it.
    const c = this.target;
    if (c.length() > 0.5) {
      const yaw = Math.atan2(c.x, c.z) + 0.6;
      const pitch = -Math.max(0.3, Math.min(1.0, Math.atan2(c.y, Math.hypot(c.x, c.z)) + 0.2));
      const dy = Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
      this.turnTo = { yaw: this.yaw + dy, pitch };
    }
    this.box.box.copy(b.expandByScalar(0.08));
    this.box.visible = true;
  }

  /** Part under a screen point, if any. */
  pick(clientX: number, clientY: number): PartId | null {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    for (const hit of this.raycaster.intersectObject(this.root, true)) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.partId) o = o.parent;
      if (o && o.visible) return o.userData.partId as PartId;
    }
    return null;
  }

  setInset(inset: Inset): void {
    this.inset = inset;
    this.resize();
  }

  /** Render into the uncovered part of the screen, keeping the full-screen scale (like the interior's chore framing). */
  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const vh = Math.max(1, h - this.inset.bottom);
    // A larger virtual frame whose centre falls on the centre of the visible area; the fov keeps
    // the ship the same size relative to what is visible.
    const fullW = w + this.inset.right;
    const fullH = h + this.inset.bottom;
    this.camera.aspect = fullW / fullH;
    this.camera.fov = (2 * Math.atan(Math.tan((25 * Math.PI) / 180) * (fullH / Math.max(vh, h * 0.3))) * 180) / Math.PI;
    if (this.inset.right || this.inset.bottom) this.camera.setViewOffset(fullW, fullH, this.inset.right, this.inset.bottom, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, design: ShipDesign, attention: ReadonlyMap<PartId, Attention>, selected: PartId | null): void {
    this.model.setDesign(design);
    this.focus.lerp(this.target, 1 - Math.exp(-dt * 5));
    if (this.turnTo) {
      const k = 1 - Math.exp(-dt * 4);
      this.yaw += (this.turnTo.yaw - this.yaw) * k;
      this.pitch += (this.turnTo.pitch - this.pitch) * k;
    }
    this.dist += (this.distGoal - this.dist) * (1 - Math.exp(-dt * 4));
    // Narrow visible areas (a phone in portrait) need the camera further back to fit the same width.
    const visibleAspect = (window.innerWidth - this.inset.right) / Math.max(1, window.innerHeight - this.inset.bottom);
    const off = new THREE.Vector3(0, 0, this.dist * Math.max(1, 1.3 / visibleAspect)).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    this.camera.position.copy(this.focus).add(off);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.focus);
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 220);
    for (const [id, g] of this.parts) {
      const a = attention.get(id) ?? "ok";
      const color = id === selected ? TINT.seleccion : TINT[a];
      // The hull is big: a softer pulse keeps the rest of the ship readable.
      const soft = id === "casco" ? 0.5 : 1;
      const strength = id === selected ? 0.12 + 0.12 * pulse : a === "ok" ? 0 : soft * (a === "critico" ? 0.25 + 0.55 * pulse : 0.1 + 0.3 * pulse);
      g.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.MeshStandardMaterial)) return;
        const m = o.material;
        if (m.userData.base === undefined) m.userData.base = { color: m.emissive.getHex(), intensity: m.emissiveIntensity };
        const base = m.userData.base as { color: number; intensity: number };
        if (strength === 0) {
          m.emissive.setHex(base.color);
          m.emissiveIntensity = base.intensity;
        } else {
          m.emissive.setHex(color);
          m.emissiveIntensity = strength;
        }
      });
    }
    if (selected && this.box.visible) {
      const g = this.parts.get(selected);
      if (g) this.box.box.setFromObject(g).expandByScalar(0.08);
    }
  }
}
