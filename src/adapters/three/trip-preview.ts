import * as THREE from "three";
import type { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { Vec3 } from "@core/math/vec3";

/** What the preview follows: the vehicle's pose, its size (for the camera distance) and a label. */
export interface PreviewSubject {
  readonly label: string;
  pose(): RigidBodyState | { readonly position: Vec3; readonly orientation: RigidBodyState["orientation"] };
  /** Rough length of the vehicle, metres. */
  readonly sizeM: number;
  /** Where it is heading (the camera keeps it in the background), world. */
  goal?(): Vec3;
}

/**
 * Live picture-in-picture of a vehicle flying itself (docs/design/viajes.md): a second camera on the
 * same space scene, drawn into a corner of the canvas after the main view, whatever the player is
 * looking at (cockpit, deck, interior, station). A small DOM frame carries the label and «×».
 */
export class TripPreview {
  readonly camera = new THREE.PerspectiveCamera(50, 1.5, 0.02, 2e6);
  private readonly frame: HTMLElement;
  private readonly label: HTMLElement;
  private subject: PreviewSubject | undefined;
  open = false;
  onClose?: () => void;

  constructor(root: HTMLElement) {
    this.frame = document.createElement("div");
    this.frame.className = "trip-pip";
    this.frame.innerHTML = `<span class="tp-label"></span><button class="tp-close" aria-label="Cerrar la vista">×</button>`;
    root.appendChild(this.frame);
    this.label = this.frame.querySelector(".tp-label")!;
    this.frame.querySelector(".tp-close")!.addEventListener("click", () => {
      this.open = false;
      this.onClose?.();
    });
  }

  /** The rectangle in CSS pixels: wide on the phone (top, under the top bar), a corner on desktop. */
  private rect(): { x: number; y: number; w: number; h: number } {
    const W = window.innerWidth;
    const H = window.innerHeight;
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
    if (!s) {
      this.open = false;
      this.frame.classList.remove("on");
    }
  }

  get visible(): boolean {
    return this.open && !!this.subject;
  }

  /** Draw the preview after the frame's main render. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const on = this.visible;
    this.frame.classList.toggle("on", on);
    if (!on) return;
    const s = this.subject!;
    const r = this.rect();
    Object.assign(this.frame.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    if (this.label.textContent !== s.label) this.label.textContent = s.label;
    const p = s.pose();
    const q = p.orientation;
    // Behind, above and to one side of the vehicle, looking at it with its goal in the background.
    const back = s.goal ? p.position.sub(s.goal()).normalize() : q.rotate(new Vec3(0, 0, 1));
    const up = q.rotate(Vec3.Y);
    const side = back.cross(up).length() > 1e-6 ? back.cross(up).normalize() : Vec3.X;
    const eye = p.position.add(back.scale(s.sizeM * 2.2)).add(up.scale(s.sizeM * 0.7)).add(side.scale(s.sizeM * 0.9));
    this.camera.position.set(eye.x, eye.y, eye.z);
    this.camera.up.set(up.x, up.y, up.z);
    this.camera.lookAt(p.position.x, p.position.y, p.position.z);
    this.camera.aspect = r.w / r.h;
    this.camera.updateProjectionMatrix();
    const H = window.innerHeight;
    renderer.setScissorTest(true);
    renderer.setViewport(r.x, H - r.y - r.h, r.w, r.h);
    renderer.setScissor(r.x, H - r.y - r.h, r.w, r.h);
    renderer.render(scene, this.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, H);
  }
}
