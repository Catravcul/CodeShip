import * as THREE from "three";
import type { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Vec3 } from "@core/math/vec3";
import { VirtualStick, curve } from "../input/stick";

/** What the preview follows: the vehicle's pose, its size (for the camera distance) and a label. */
export interface PreviewSubject {
  readonly label: string;
  pose(): RigidBodyState | { readonly position: Vec3; readonly orientation: RigidBodyState["orientation"] };
  /** Rough length of the vehicle, metres. */
  readonly sizeM: number;
  /** Where it is heading (the camera keeps it in the background), world. */
  goal?(): Vec3;
  /** Its planned path, from where it set off to where it ends (world): drawn while the preview is open. */
  route?(): readonly Vec3[];
}

/**
 * «Ver trayecto» (docs/design/viajes.md, docs/design/dique-seco.md): live picture-in-picture of a
 * vehicle flying itself, the same for the mothership, the lander and the probe. A second camera on the
 * same space scene follows it from behind with its goal ahead, and its planned path is drawn (cyan,
 * through the scene's depth) with a ring where it ends. Drawn into a corner of the canvas after the
 * main view, whatever the player is looking at (cockpit, deck, interior, station). A small DOM frame
 * carries the label and «×».
 */
export class TripPreview {
  readonly camera = new THREE.PerspectiveCamera(50, 1.5, 0.02, 2e6);
  private readonly frame: HTMLElement;
  private readonly label: HTMLElement;
  private subject: PreviewSubject | undefined;
  private readonly path = new THREE.Group();
  private pathKey = "";
  private readonly pathMat = new THREE.LineBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.95, depthTest: false });
  private readonly endMat = new THREE.LineBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.95, depthTest: false });
  open = false;
  onClose?: () => void;
  /**
   * The player's own look around the vehicle and distance: «la cámara siempre se puede mover». It turns only with
   * its joystick (reglas.md §5.7: never by dragging the picture); wheel and pinch set the distance.
   */
  private readonly stick: VirtualStick;
  private lastRenderMs = 0;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private zoomK = 1;
  private readonly touches = new Map<number, { x: number; y: number }>();
  private pinchGap = 0;

  constructor(root: HTMLElement) {
    this.frame = document.createElement("div");
    this.frame.className = "trip-pip";
    this.frame.innerHTML = `<span class="tp-label"></span><button class="tp-close" aria-label="Cerrar el trayecto">×</button>`;
    this.path.name = "trayecto";
    this.path.visible = false;
    this.path.renderOrder = 6;
    root.appendChild(this.frame);
    this.label = this.frame.querySelector(".tp-label")!;
    this.frame.querySelector(".tp-close")!.addEventListener("click", () => {
      this.open = false;
      this.onClose?.();
    });
    // Full screen: the camera joystick turns round the vehicle; wheel and two-finger pinch set the distance.
    this.stick = new VirtualStick(this.frame, "tp-stick", "Cámara");
    const gap = () => {
      const [a, b] = [...this.touches.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    this.frame.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest("button, .vstick")) return;
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.pinchGap = gap();
    });
    window.addEventListener("pointermove", (e) => {
      const t = this.touches.get(e.pointerId);
      if (!t) return;
      t.x = e.clientX;
      t.y = e.clientY;
      // One finger does nothing (no drag-to-look); two pinch.
      if (this.touches.size < 2) return;
      const g = gap();
      if (this.pinchGap > 0 && g > 0) this.zoom(this.pinchGap / g);
      this.pinchGap = g;
    });
    const lift = (e: PointerEvent) => {
      this.touches.delete(e.pointerId);
      this.pinchGap = gap();
    };
    window.addEventListener("pointerup", lift);
    window.addEventListener("pointercancel", lift);
    this.frame.addEventListener("wheel", (e) => this.zoom(e.deltaY > 0 ? 1.1 : 0.9), { passive: true });
  }

  /** Turn the view round the vehicle (radians). */
  orbit(dYaw: number, dPitch: number): void {
    this.orbitYaw += dYaw;
    this.orbitPitch = Math.max(-1.3, Math.min(1.3, this.orbitPitch + dPitch));
  }

  /** Closer (<1) or further (>1), between a close look and the whole route around it. */
  zoom(factor: number): void {
    this.zoomK = Math.max(0.35, Math.min(12, this.zoomK * factor));
  }

  /** Camera distance from the vehicle now, m (for checks). */
  get distanceM(): number {
    return this.camera.position.distanceTo(this.lastAt);
  }
  private readonly lastAt = new THREE.Vector3();

  /**
   * The rectangle in CSS pixels. «Ver trayecto» takes the whole screen (the room's HUD hides, the trip's
   * own controls stay); `full = false` keeps the old corner picture.
   */
  full = true;
  private rect(): { x: number; y: number; w: number; h: number } {
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (this.full) return { x: 0, y: 0, w: W, h: H };
    const w = W < 700 ? Math.round(W * 0.56) : Math.round(Math.min(380, W * 0.3));
    const h = Math.round(w * 0.62);
    // On the phone: left, clear of the right-hand column of buttons.
    const x = W < 700 ? 8 : W - w - 12;
    // Desktop: right, under the column of buttons and above the help text.
    const y = W < 700 ? 96 : Math.min(220, Math.max(12, H - h - 120));
    return { x, y, w, h };
  }

  /** Follow `s` (undefined hides it). */
  follow(s: PreviewSubject | undefined): void {
    this.subject = s;
    // The trip is over: close it (the next trip starts with it closed) and hide the frame now,
    // since no render will run to do it.
    if (s?.label !== this.subject?.label) {
      this.orbitYaw = 0;
      this.orbitPitch = 0;
      this.zoomK = 1;
    }
    if (!s) {
      this.open = false;
      this.frame.classList.remove("on");
      document.body.classList.remove("in-trip-view");
    }
  }

  /**
   * Set by the wiring while a challenge is open (docs/design/ux-acciones.md §7): the preview stays open but
   * is not drawn, so the scene behind the sheet is the challenge's, not the trip's.
   */
  held = false;

  get visible(): boolean {
    return this.open && !!this.subject && !this.held;
  }

  /** Points of the path drawn now (for checks): 0 when nothing is drawn. */
  get pathPoints(): number {
    return this.pathKey ? Number(this.pathKey.split("|")[0]) : 0;
  }

  /** Rebuild the drawn path when the route changes. */
  private drawPath(route: readonly Vec3[], size: number): void {
    const last = route[route.length - 1];
    const key = route.length >= 2 && last ? `${route.length}|${route[0]!.x.toFixed(0)},${route[0]!.z.toFixed(0)}|${last.x.toFixed(0)},${last.y.toFixed(0)},${last.z.toFixed(0)}` : "";
    if (key === this.pathKey) return;
    this.pathKey = key;
    for (const c of [...this.path.children]) {
      (c as THREE.Line).geometry.dispose();
      this.path.remove(c);
    }
    if (!key || !last) return;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.map((p) => new THREE.Vector3(p.x, p.y, p.z))), this.pathMat);
    line.frustumCulled = false;
    line.renderOrder = 6;
    // A ring where it ends, square to the last stretch, as big as the vehicle.
    const prev = route[route.length - 2]!;
    const n = last.sub(prev).normalize();
    const u = Math.abs(n.y) < 0.9 ? n.cross(Vec3.Y).normalize() : n.cross(Vec3.X).normalize();
    const w = n.cross(u);
    const ring: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const p = last.add(u.scale(Math.cos(a) * size)).add(w.scale(Math.sin(a) * size));
      ring.push(new THREE.Vector3(p.x, p.y, p.z));
    }
    const end = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring), this.endMat);
    end.frustumCulled = false;
    end.renderOrder = 6;
    this.path.add(line, end);
  }

  /** Draw the preview after the frame's main render. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const on = this.visible;
    this.frame.classList.toggle("on", on);
    this.frame.classList.toggle("full", on && this.full);
    document.body.classList.toggle("in-trip-view", on && this.full);
    const nowMs = performance.now();
    const dt = Math.min(0.1, Math.max(0, (nowMs - (this.lastRenderMs || nowMs)) / 1000));
    this.lastRenderMs = nowMs;
    if (!on) return;
    // The camera joystick: up to 1,6 rad/s round the vehicle.
    const v = this.stick.value;
    if (v.x || v.y) this.orbit(-curve(v.x) * 1.6 * dt, curve(v.y) * 1.6 * dt);
    const s = this.subject!;
    if (this.path.parent !== scene) scene.add(this.path);
    this.drawPath(s.route?.() ?? [], s.sizeM * 0.6);
    const r = this.rect();
    Object.assign(this.frame.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    if (this.label.textContent !== s.label) this.label.textContent = s.label;
    const p = s.pose();
    const q = p.orientation;
    // Behind, above and to one side of the vehicle, looking at it with its goal in the background.
    const back = s.goal ? p.position.sub(s.goal()).normalize() : q.rotate(new Vec3(0, 0, 1));
    const up = q.rotate(Vec3.Y);
    const side = back.cross(up).length() > 1e-6 ? back.cross(up).normalize() : Vec3.X;
    const base = back.scale(2.2).add(up.scale(0.7)).add(side.scale(0.9));
    // The player's own turn: yaw about the vehicle's up, pitch about the side.
    const turned = rotateAbout(rotateAbout(base, up, this.orbitYaw), side, this.orbitPitch);
    const eye = p.position.add(turned.scale(s.sizeM * this.zoomK));
    this.camera.position.set(eye.x, eye.y, eye.z);
    this.lastAt.set(p.position.x, p.position.y, p.position.z);
    this.camera.up.set(up.x, up.y, up.z);
    this.camera.lookAt(p.position.x, p.position.y, p.position.z);
    this.camera.aspect = r.w / r.h;
    this.camera.updateProjectionMatrix();
    const H = window.innerHeight;
    renderer.setScissorTest(true);
    renderer.setViewport(r.x, H - r.y - r.h, r.w, r.h);
    renderer.setScissor(r.x, H - r.y - r.h, r.w, r.h);
    // The path shows only in this view: the main view stays as it was.
    this.path.visible = true;
    renderer.render(scene, this.camera);
    this.path.visible = false;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, H);
  }
}

/** v turned by `a` radians about the unit axis k (Rodrigues). */
function rotateAbout(v: Vec3, k: Vec3, a: number): Vec3 {
  if (!a) return v;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  return v.scale(c).add(k.cross(v).scale(sn)).add(k.scale(k.dot(v) * (1 - c)));
}
