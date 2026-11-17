import * as THREE from "three";
import type { ShipDesign, ThrustCommand } from "@modules/ship/domain/ship";
import { VirtualStick, curve } from "../input/stick";
import { buildLmCabin, type LmCabinGeometry } from "./lm-cabin";
import type { LmReading } from "./lm-instruments";
import { LANDER_CABIN, CABIN_SPREAD } from "@modules/lander-cabin/data/cabin";
import { worldScale, scaleLights } from "./interior/world-scale";
import { ShipModel } from "./ship-model";
import { RootMenu, type RootItem } from "../../ui/root-menu";
import { ICON } from "../../ui/icons";

export type CameraMode = "cabina" | "ventana" | "ventral" | "trasera" | "exterior" | "acople" | "nodriza";
/**
 * Tilt (rad) of the landing camera while the landing sheet is open: the point right under the craft shows
 * about a sixth of the way down the screen, in the strip above the sheet (30 % of a phone's height).
 */
const LANDING_SHEET_PITCH = -0.45;
const MODES: readonly CameraMode[] = ["cabina", "ventral", "trasera", "exterior", "acople", "nodriza", "ventana"];
const LABEL: Record<CameraMode, string> = { cabina: "Cabina", ventana: "Ventana (LPD)", ventral: "Ventral", trasera: "Trasera", exterior: "Exterior", acople: "Acople", nodriza: "Nodriza" };
/** First or third person, for the eye icon's name. */
const PERSON: Record<CameraMode, string> = { cabina: "1ª persona", ventana: "1ª persona", ventral: "1ª persona", trasera: "1ª persona", acople: "1ª persona", exterior: "3ª persona", nodriza: "3ª persona" };

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
 * What the pilot sees (docs/design/cabina-lm.md): the commander standing at his station in the LM's real cabin
 * (the same model as the walkable cabin, lm-cabin.ts, with the presentation layer's scale and spacing),
 * looking out of his triangular window («Cabina») or up through the overhead docking window and the COAS
 * («Acople»), with a free-turning head; the landing, rear and exterior cameras (real spacecraft carry
 * external cameras for what windows can't show), plus drifting space dust so that motion is visible.
 */
export class FlightView {
  readonly rig = new THREE.Group();
  private readonly lm: LmCabinGeometry = buildLmCabin(LANDER_CABIN, worldScale(), CABIN_SPREAD);
  /** The cabin, placed so that the commander's eye is at the ship's origin (the camera's place). */
  private readonly cockpit = new THREE.Group();
  /** From the commander's eye to the middle of the LPD scale on his window, in the ship's frame. */
  private readonly toLpd: THREE.Vector3;
  /** From the commander's eye to the overhead docking window, in the ship's frame. */
  private readonly toDockWindow: THREE.Vector3;
  private reading: LmReading | undefined;
  private readonly ship = new ShipModel();
  private readonly dust: THREE.Points;
  private readonly dustPos: Float32Array;
  private readonly stick: VirtualStick;
  private readonly camBtn: HTMLButtonElement;
  private readonly warpBtn: HTMLButtonElement;
  private readonly tag: HTMLElement;
  /** The cockpit's icons: the eye (camera) pinned, the flight toggles folded into the root. */
  readonly menu: RootMenu;
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
    scaleLights(this.lm.group, worldScale());
    // The cabin's ambient light would light space too: in flight only its lamps (short reach) light it.
    const ambient: THREE.Object3D[] = [];
    this.lm.group.traverse((o) => (o as THREE.AmbientLight).isAmbientLight && ambient.push(o));
    for (const a of ambient) a.removeFromParent();
    const fill = new THREE.PointLight(0xdfefff, 2.5, 3 * worldScale(), 1);
    fill.position.set(0, 0.3, 0.4);
    this.cockpit.add(fill);
    this.lm.group.position.copy(this.lm.commanderEye).negate();
    this.cockpit.name = "cabina-lm";
    this.cockpit.add(this.lm.group);
    this.toDockWindow = this.lm.dockingWindow.clone().sub(this.lm.commanderEye).normalize();
    // The LPD scale on the commander's window (lm-cabin.ts), from his eye: P64's sight line.
    const lpd = this.lm.group.getObjectByName("lpd") as THREE.LineSegments | undefined;
    lpd?.geometry.computeBoundingBox();
    this.toLpd = lpd?.geometry.boundingBox ? lpd.geometry.boundingBox.getCenter(new THREE.Vector3()).sub(this.lm.commanderEye) : new THREE.Vector3(0, -0.3, -0.6);

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
    // Icons that sprout from a root (docs/design/ux-acciones.md §Iconos): only the eye is always out.
    this.menu = new RootMenu(root, "flight-bar", "Mandos de vuelo", ICON.root);
    this.camBtn = this.menu.add({ className: "cam-btn", icon: ICON.eye, label: "Cámara", key: "C", pinned: true }, () => {
      this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]!;
      this.center();
    });
    this.warpBtn = this.menu.add({ className: "warp-btn", icon: ICON.warp, label: "Tiempo ×1", key: "X" }, () => this.warpAvailable && (this.warpIdx = (this.warpIdx + 1) % WARPS.length));
    // Centring the view is a double tap on «Mirar» (or V): no icon of its own (Berón, 2026-11-17: an icon nobody understood).
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

  /** The camera before a landing program's sheet opened (put back if it closes without flying). */
  private beforeSheet: { mode: CameraMode; yaw: number; pitch: number } | undefined;

  /**
   * A landing program is being written (docs/design/aterrizaje.md): each step draws on the ground below
   * (site, drift, descent curve), which the forward cabin view cannot see. While the sheet is open the
   * landing camera looks down past the legs, tilted so the ground below shows in the strip above the sheet
   * (PX-20, animation audit); once the program flies it keeps that view; closed without flying,
   * the camera goes back to what it was.
   */
  landingSheet(state: "open" | "flying" | "closed"): void {
    if (state === "open") {
      this.beforeSheet ??= { mode: this.mode, yaw: this.yaw, pitch: this.pitch };
      this.mode = "ventral";
      this.yaw = 0;
      this.pitch = LANDING_SHEET_PITCH;
    } else if (state === "flying") {
      // Still tilted: the descent and the site stay on screen while the sheet goes away, and after.
      this.beforeSheet = undefined;
    } else if (this.beforeSheet) {
      ({ mode: this.mode, yaw: this.yaw, pitch: this.pitch } = this.beforeSheet);
      this.beforeSheet = undefined;
    }
  }

  get cameraMode(): CameraMode {
    return this.mode;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.center();
  }

  /**
   * Whether the time-warp button makes sense now (set by main each frame): off while docked,
   * anchored or close to the surface. Turning it off also drops any warp asked for.
   */
  set warpAvailable(on: boolean) {
    if (!on) this.warpIdx = 0;
    if (this.warpBtn.classList.contains("hidden") === !on) return;
    this.warpBtn.classList.toggle("hidden", !on);
    this.menu.sync();
  }

  get warpAvailable(): boolean {
    return !this.warpBtn.classList.contains("hidden");
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
    if (this.mode === "cabina" || this.mode === "ventana" || this.mode === "ventral" || this.mode === "acople") {
      this.yaw = Math.max(-2.6, Math.min(2.6, this.yaw));
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
    } else this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
  }

  /** The flight readings for the LM's instruments (panels 1, 2, 4 and 5), set by main each frame. */
  instruments(r: LmReading): void {
    this.reading = r;
  }

  /** What the instruments show now (for checks). */
  get instrumentReading(): LmReading | undefined {
    return this.lm.instruments.shown;
  }

  /** Whether the camera is inside the LM's cabin (the commander's window or the docking window). */
  get inCabin(): boolean {
    return this.mode === "cabina" || this.mode === "ventana" || this.mode === "acople";
  }

  /** Adds an icon to the cockpit's root menu (flight-computer toggles). */
  addButton(className: string, onClick: () => void, item: Partial<RootItem> = {}): HTMLButtonElement {
    return this.menu.add({ className, icon: item.icon ?? ICON.root, label: item.label ?? className, ...(item.key ? { key: item.key } : {}), ...(item.pinned ? { pinned: true } : {}) }, onClick);
  }

  /** Place ship, camera and dust. `pos`/`q` are the ship pose; `warp` is the warp in effect. */
  update(dt: number, pos: THREE.Vector3, q: THREE.Quaternion, cmd: ThrustCommand, warp: number, warpNote: string): void {
    const s = this.stick.value;
    this.turn(-curve(s.x) * 2.0 * dt, -curve(s.y) * 1.5 * dt);
    this.rig.position.copy(pos);
    this.rig.quaternion.copy(q);
    this.cockpit.visible = this.inCabin;
    this.ship.root.visible = !this.inCabin;
    // The instruments run whatever the camera (the panels are there when she looks back in).
    if (this.reading) this.lm.instruments.update(this.reading, performance.now() / 1000);
    if (this.design) this.ship.setDesign(this.design());
    this.ship.thrust(cmd, performance.now() / 1000);
    const head = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    if (this.mode === "cabina") {
      this.camera.position.copy(pos);
      this.camera.quaternion.copy(q).multiply(head);
    } else if (this.mode === "ventana") {
      // P64 (Apollo): the commander's head at the window, his eye lining up the LPD scale's two etched lines
      // (inner and outer pane) to read where guidance aims; the window fills the view on a phone.
      this.camera.position.copy(pos).add(this.toLpd.clone().multiplyScalar(0.55).applyQuaternion(q));
      const look = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), this.toLpd.clone().normalize());
      this.camera.quaternion.copy(q).multiply(look).multiply(head);
    } else if (this.mode === "ventral") {
      // Landing camera under the belly, looking straight down past the legs.
      this.camera.position.copy(pos).add(new THREE.Vector3(0, -1.05, -0.8).applyQuaternion(q));
      this.camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)).multiply(head);
    } else if (this.mode === "trasera") {
      // Camera on the hull's back, looking aft over the engine bell.
      this.camera.position.copy(pos).add(new THREE.Vector3(0, 1.25, 2.55).applyQuaternion(q));
      this.camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)).multiply(head);
    } else if (this.mode === "acople") {
      // The commander tips his head back and looks up through the overhead docking window and the COAS
      // (as in the LM): the back of the cabin toward the top of the screen.
      this.camera.position.copy(pos);
      const up = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), this.toDockWindow);
      this.camera.quaternion.copy(q).multiply(up).multiply(head);
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
    this.menu.relabel(this.camBtn, `Cámara: ${LABEL[this.mode]} · ${PERSON[this.mode]}`, "C");
    this.menu.relabel(this.warpBtn, `Tiempo ×${this.warpRequested}`, "X");
    this.warpBtn.classList.toggle("limited", warp < this.warpRequested);
    this.tag.textContent = this.mode === "cabina" ? warpNote : this.mode === "ventana" ? `Ventana del comandante: la escala LPD marca adónde baja el programa (P64)${warpNote ? ` · ${warpNote}` : ""}` : `Cámara ${LABEL[this.mode].toLowerCase()}${warpNote ? ` · ${warpNote}` : ""}`;
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
