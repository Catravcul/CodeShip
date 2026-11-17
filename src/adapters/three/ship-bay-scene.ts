import * as THREE from "three";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { Attention } from "@modules/ship-bay/domain/attention";
import { ShipModel, type PartId } from "./ship-model";
import { buildStarfield } from "./starfield";
import type { MothershipModel } from "./mothership-model";
import type { StarshipModel } from "./starship-model";

/** Which ship the bay shows: the probe, the mothership (scaled down to fit the same camera) or the station. */
export type BayView = "sonda" | "nodriza" | "estacion";
/**
 * The mothership and the station at true scale (Berón, 2026-11-17: «en la bahía la nodriza se ve muy
 * pequeña»): the camera frames each view by its size instead (`fit`), and zooms in proportion.
 */
const MOTHERSHIP_SCALE = 1;
const STATION_SCALE = 1;
/** The lander's home distance, m (its bay view as it was). */
const LANDER_FIT_M = 17;
/** Zoom range, as shares of a view's home distance: from a close look at a part to the whole thing small. */
export const BAY_ZOOM = { minShare: 0.12, maxShare: 2.5 } as const;
/** Half the bay camera's vertical field of view before the inset widens it, rad. */
const HALF_FOV = (25 * Math.PI) / 180;

/** A model the bay can show as the station: its root and its swappable parts by slot. */
export interface BayStationModel {
  readonly root: THREE.Object3D;
  readonly slots: ReadonlyMap<string, THREE.Object3D>;
}

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
  private dist = LANDER_FIT_M;
  private distGoal = LANDER_FIT_M;
  /** Home distance of the view shown: the whole ship fits the visible area. */
  private fit = LANDER_FIT_M;
  private turnTo: { yaw: number; pitch: number } | null = null;
  private inset: Inset = { right: 0, bottom: 0 };
  private _view: BayView = "sonda";
  private mothership?: MothershipModel | StarshipModel;
  private station?: { readonly root: THREE.Object3D; readonly parts: Map<PartId, THREE.Group> };
  private stationModel?: BayStationModel;

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
  addMothership(m: MothershipModel | StarshipModel): void {
    this.mothership = m;
    m.root.scale.setScalar(MOTHERSHIP_SCALE);
    // Centre it on its rings.
    m.root.position.set(0, 0, -(((m.spec.layout.habRingZ ?? 0) + (m.spec.layout.twinRingZ ?? 0)) / 2) * MOTHERSHIP_SCALE);
    m.root.visible = false;
    this.scene.add(m.root);
  }

  /** Put the station in the bay (its wings, radiators and shield are its parts). */
  addStation(m: BayStationModel): void {
    const holder = new THREE.Group();
    holder.scale.setScalar(STATION_SCALE);
    // The station model carries its attitude; the bay shows it in its own frame.
    m.root.quaternion.identity();
    m.root.position.set(0, 0, 0);
    holder.add(m.root);
    holder.visible = this._view === "estacion";
    this.scene.add(holder);
    this.stationModel = m;
    this.station = { root: holder, parts: new Map() };
    this.syncStation();
  }

  /** The station model was rebuilt (it grew): pick up its new slot groups. */
  syncStation(): void {
    if (!this.station || !this.stationModel) return;
    this.station.parts.clear();
    for (const [id, g] of this.stationModel.slots) this.station.parts.set(`estacion:${id}` as PartId, g as THREE.Group);
  }

  get view(): BayView {
    return this._view;
  }

  setView(v: BayView): void {
    if (v === this._view || (v === "nodriza" && !this.mothership) || (v === "estacion" && !this.station)) return;
    this._view = v;
    this.model.root.visible = v === "sonda";
    if (this.mothership) this.mothership.root.visible = v === "nodriza";
    if (this.station) this.station.root.visible = v === "estacion";
    this.yaw = v === "sonda" ? 2.35 : 2.6;
    this.fit = v === "sonda" ? LANDER_FIT_M : this.fitOf(this.root);
    this.dist = this.fit;
    this.select(null);
  }

  /** The distance at which a model's bounding sphere fills the view's height, with a margin. */
  private fitOf(o: THREE.Object3D): number {
    const vis = o.visible;
    o.visible = true;
    o.updateMatrixWorld(true);
    const r = new THREE.Box3().setFromObject(o).getBoundingSphere(new THREE.Sphere()).radius;
    o.visible = vis;
    return Math.max(LANDER_FIT_M, (r / Math.tan(HALF_FOV)) * 1.05);
  }

  /** Home distance of the view shown, m (for checks). */
  get homeDistanceM(): number {
    return this.fit;
  }

  /** Camera distance now, m (for checks). */
  get distanceM(): number {
    return this.distGoal;
  }

  private get parts(): Map<PartId, THREE.Group> {
    if (this._view === "estacion" && this.station) return this.station.parts;
    return this._view === "nodriza" && this.mothership ? this.mothership.parts : this.model.parts;
  }

  private get root(): THREE.Object3D {
    if (this._view === "estacion" && this.station) return this.station.root;
    return this._view === "nodriza" && this.mothership ? this.mothership.root : this.model.root;
  }

  orbit(dYaw: number, dPitch: number): void {
    if (dYaw || dPitch) this.turnTo = null;
    this.yaw += dYaw;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dPitch));
  }

  zoom(factor: number): void {
    this.distGoal = Math.max(this.fit * BAY_ZOOM.minShare, Math.min(this.fit * BAY_ZOOM.maxShare, this.distGoal * factor));
  }

  /** Ease the camera towards a part (or the whole ship) and outline it. */
  select(id: PartId | null): void {
    const g = id ? this.parts.get(id) : undefined;
    if (!g) {
      this.target.set(0, 0, 0);
      this.distGoal = this.fit;
      this.box.visible = false;
      return;
    }
    const b = new THREE.Box3().setFromObject(g);
    b.getCenter(this.target);
    const r = b.getSize(new THREE.Vector3()).length();
    const k = this.fit / LANDER_FIT_M;
    this.distGoal = Math.max(this.fit * 0.35, Math.min(this.fit * 1.05, r * 2.2 + 4 * k));
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
