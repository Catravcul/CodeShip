import * as THREE from "three";
import type { ShipDesign, ThrustCommand } from "@modules/ship/domain/ship";
import { VirtualStick, curve } from "../input/stick";
import { buildCockpit } from "./cockpit";
import { ShipModel } from "./ship-model";

export type CameraMode = "cabina" | "ventral" | "trasera" | "exterior" | "acople" | "nodriza";
const MODES: readonly CameraMode[] = ["cabina", "ventral", "trasera", "exterior", "acople", "nodriza"];
const LABEL: Record<CameraMode, string> = { cabina: "Cabina", ventral: "Ventral", trasera: "Trasera", exterior: "Exterior", acople: "Acople", nodriza: "Nodriza" };

/** Where the mothership is (its centre and attitude), so the view can frame it with the probe. */
export interface MothershipPose {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
  /** Toward the Sun, so the "Nodriza" camera starts on the lit side. */
  readonly sun?: THREE.Vector3;
}

/** Time warp steps for long approaches; only allowed far from the asteroid. */
export const WARPS = [1, 10, 50] as const;
export const WARP_MIN_DISTANCE_M = 150;

/**
 * What the pilot sees: the cockpit fixed to the ship with a free-turning head, a rear camera and
 * an exterior chase camera (real spacecraft carry external cameras for what windows can't show),
 * plus drifting space dust so that motion is visible.
 */
export class FlightView {
  readonly rig = new THREE.Group();
  private readonly cockpit = buildCockpit();
  private readonly ship = new ShipModel();
  private readonly dust: THREE.Points;
  private readonly dustPos: Float32Array;
  private readonly stick: VirtualStick;
  private readonly camBtn: HTMLButtonElement;
  private readonly warpBtn: HTMLButtonElement;
  private readonly tag: HTMLElement;
  private mode: CameraMode = "cabina";
  private yaw = 0;
  private pitch = 0;
  private dragId: number | null = null;
  private last = { x: 0, y: 0 };
  private warpIdx = 0;
  enabled = true;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    root: HTMLElement,
    /** The ship's current design, so the exterior model follows part swaps. */
    private readonly design?: () => ShipDesign,
    /** The mothership, framed by the "Nodriza" camera together with the probe. */
    private readonly mothership?: MothershipPose,
  ) {
    scene.add(this.rig);
    this.rig.add(this.cockpit, this.ship.root);
    const cabinLight = new THREE.PointLight(0xdfefff, 3, 4, 1);
    cabinLight.position.set(0, 0.7, 0.3);
    this.cockpit.add(cabinLight);

    // Dust: points in a 160 m box around the ship, wrapped as it moves.
    const n = 700;
    this.dustPos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) this.dustPos[i] = (Math.random() - 0.5) * 160;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.dustPos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfd6e6, size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
    this.dust.frustumCulled = false;
    scene.add(this.dust);

    this.stick = new VirtualStick(root, "pilot-look", "Mirar");
    this.stick.el.addEventListener("dblclick", () => this.center());
    const bar = document.createElement("div");
    bar.className = "flight-bar";
    bar.innerHTML = `<button class="cam-btn"></button><button class="warp-btn"></button><button class="center-btn">Centrar</button>`;
    root.appendChild(bar);
    this.camBtn = bar.querySelector(".cam-btn")!;
    this.warpBtn = bar.querySelector(".warp-btn")!;
    this.camBtn.addEventListener("click", () => {
      this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]!;
      this.center();
    });
    this.warpBtn.addEventListener("click", () => (this.warpIdx = (this.warpIdx + 1) % WARPS.length));
    bar.querySelector(".center-btn")!.addEventListener("click", () => this.center());
    this.tag = document.createElement("div");
    this.tag.className = "cam-tag";
    root.appendChild(this.tag);

    // Drag on empty screen to look around (mouse or finger).
    root.addEventListener("pointerdown", (e) => {
      if (!this.enabled || (e.target as HTMLElement).closest("button, .duel, .board, .vstick, .touch, .hud")) return;
      this.dragId = e.pointerId;
      this.last = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.dragId) return;
      this.turn(-(e.clientX - this.last.x) * 0.005, -(e.clientY - this.last.y) * 0.005);
      this.last = { x: e.clientX, y: e.clientY };
    });
    const end = (e: PointerEvent) => e.pointerId === this.dragId && (this.dragId = null);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      if (e.code === "KeyC" && !e.repeat) this.camBtn.click();
      if (e.code === "KeyV" && !e.repeat) this.center();
      if (e.code === "KeyX" && !e.repeat) this.warpBtn.click();
    });
  }

  get cameraMode(): CameraMode {
    return this.mode;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.center();
  }

  /** Time warp asked for; the caller drops it to 1 near the asteroid or while thrusting. */
  get warpRequested(): number {
    return WARPS[this.warpIdx]!;
  }

  center(): void {
    this.yaw = 0;
    this.pitch = this.mode === "exterior" ? -0.25 : this.mode === "nodriza" ? -0.3 : this.mode === "trasera" ? -0.3 : 0;
  }

  private turn(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch += dPitch;
    if (this.mode === "cabina" || this.mode === "ventral" || this.mode === "acople") {
      this.yaw = Math.max(-2.6, Math.min(2.6, this.yaw));
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
    } else this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
  }

  /** Place ship, camera and dust. `pos`/`q` are the ship pose; `warp` is the warp in effect. */
  /** Adds a button to the flight bar (used for flight-computer toggles). */
  addButton(className: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = className;
    b.addEventListener("click", onClick);
    this.camBtn.parentElement!.insertBefore(b, this.camBtn);
    return b;
  }

  update(dt: number, pos: THREE.Vector3, q: THREE.Quaternion, cmd: ThrustCommand, warp: number, warpNote: string): void {
    const s = this.stick.value;
    this.turn(-curve(s.x) * 2.0 * dt, -curve(s.y) * 1.5 * dt);
    this.rig.position.copy(pos);
    this.rig.quaternion.copy(q);
    this.cockpit.visible = this.mode === "cabina";
    this.ship.root.visible = this.mode !== "cabina";
    if (this.design) this.ship.setDesign(this.design());
    this.ship.thrust(cmd, performance.now() / 1000);
    const head = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    if (this.mode === "cabina") {
      this.camera.position.copy(pos);
      this.camera.quaternion.copy(q).multiply(head);
    } else if (this.mode === "ventral") {
      // Landing camera under the belly, looking straight down past the legs.
      this.camera.position.copy(pos).add(new THREE.Vector3(0, -1.05, -0.8).applyQuaternion(q));
      this.camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)).multiply(head);
    } else if (this.mode === "trasera") {
      // Camera on the hull's back, looking aft over the engine bell.
      this.camera.position.copy(pos).add(new THREE.Vector3(0, 1.25, 2.55).applyQuaternion(q));
      this.camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)).multiply(head);
    } else if (this.mode === "acople") {
      // Docking camera beside the dorsal port, looking straight up the docking axis (like the
      // Apollo LM's overhead window), with the nose toward the top of the screen.
      this.camera.position.copy(pos).add(new THREE.Vector3(0.45, 1.05, 0.6).applyQuaternion(q));
      this.camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)).multiply(head);
    } else {
      // Orbit 16 m from the ship; the "Nodriza" camera frames the probe and the mothership together.
      const m = this.mode === "nodriza" ? this.mothership : undefined;
      const focus = m ? pos.clone().lerp(m.position, 0.5) : pos;
      const around = m ? m.quaternion : q;
      const dist = m ? Math.max(210, pos.distanceTo(m.position) * 1.6) : 16;
      // Seen from the lit side, a little off the Sun line so the rings show their depth.
      const base = new THREE.Quaternion();
      if (m?.sun) {
        const local = m.sun.clone().applyQuaternion(m.quaternion.clone().invert());
        local.add(new THREE.Vector3(0.6, 0.3, 0)).normalize();
        base.setFromUnitVectors(new THREE.Vector3(0, 0, 1), local);
      }
      const off = new THREE.Vector3(0, 0, dist).applyQuaternion(head).applyQuaternion(base).applyQuaternion(around);
      this.camera.position.copy(focus).add(off);
      this.camera.up.set(0, 1, 0).applyQuaternion(around);
      this.camera.lookAt(focus);
    }
    // Wrap the dust around the ship so it always surrounds it.
    const p = this.dustPos;
    for (let i = 0; i < p.length; i += 3)
      for (let k = 0; k < 3; k++) {
        const c = k === 0 ? pos.x : k === 1 ? pos.y : pos.z;
        let v = p[i + k]!;
        if (v - c > 80) v -= 160;
        else if (v - c < -80) v += 160;
        p[i + k] = v;
      }
    (this.dust.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.camBtn.textContent = `Cámara: ${LABEL[this.mode]}`;
    this.warpBtn.textContent = `Tiempo ×${this.warpRequested}`;
    this.warpBtn.classList.toggle("limited", warp < this.warpRequested);
    this.tag.textContent = this.mode === "cabina" ? warpNote : `Cámara ${LABEL[this.mode].toLowerCase()}${warpNote ? ` · ${warpNote}` : ""}`;
    this.tag.classList.toggle("on", this.tag.textContent !== "");
  }
}

/** One line describing what is firing, so the pilot knows the input reached the ship. */
export function thrustText(cmd: ThrustCommand): string {
  const t = cmd.translation;
  const r = cmd.rotation;
  const parts: string[] = [];
  if (cmd.mainThrottle > 0) parts.push("motor principal");
  if (t.z < 0) parts.push("RCS avanzar");
  if (t.z > 0) parts.push("RCS atrás");
  if (t.x) parts.push(t.x > 0 ? "RCS derecha" : "RCS izquierda");
  if (t.y) parts.push(t.y > 0 ? "RCS subir" : "RCS bajar");
  if (r.length() > 0) parts.push("girando");
  return parts.join(" · ");
}
