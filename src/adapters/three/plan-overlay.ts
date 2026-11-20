import * as THREE from "three";
import type { SketchItem, SketchStep, SketchTone } from "@modules/navigation/application/plan-sketch";
import type { StepVisual } from "@modules/chores/domain/step-visual";

/** Colour of each tone of a plan (also the navigation map's, which shows the plan while it covers the scene). */
export const SKETCH_COLOUR: Readonly<Record<SketchTone, number>> = { plan: 0x7fdcff, burn: 0xffb347, brake: 0xff7a5a, site: 0x7dffb0, ok: 0x7dffb0 };

/**
 * Draws plan sketches (plan-sketch.ts) in the 3D scene as plain lines (no lights, one material per
 * tone), with a one-line caption over the scene: the plan builds up as each step is answered right.
 */
export class PlanOverlay {
  private readonly root = new THREE.Group();
  private readonly materials = new Map<SketchTone, THREE.LineBasicMaterial>();
  private readonly caption: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly items: SketchItem[] = [];
  /** Set by main: what is drawn changed (the navigation map redraws the plan it shows). */
  onChange?: () => void;

  constructor(scene: THREE.Scene, host: HTMLElement) {
    this.root.name = "plan-overlay";
    this.root.renderOrder = 5;
    scene.add(this.root);
    this.caption = document.createElement("div");
    this.caption.className = "plan-caption";
    this.caption.setAttribute("role", "status");
    // Main moves it into the challenge's sheet (DuelView.hold): with a challenge open only the sheet and the scene show.
    host.appendChild(this.caption);
  }

  /** The step line, for the challenge's sheet to hold. */
  get captionElement(): HTMLElement {
    return this.caption;
  }

  /** The plan's items drawn so far. */
  get sketch(): readonly SketchItem[] {
    return this.items;
  }

  /** Lines drawn now (for checks). */
  get drawn(): number {
    return this.root.children.length;
  }

  private material(tone: SketchTone): THREE.LineBasicMaterial {
    let m = this.materials.get(tone);
    if (!m) {
      m = new THREE.LineBasicMaterial({ color: SKETCH_COLOUR[tone], transparent: true, opacity: 0.9, depthTest: false });
      this.materials.set(tone, m);
    }
    return m;
  }

  private line(points: THREE.Vector3[], tone: SketchTone, loop = false): void {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const l = loop ? new THREE.LineLoop(g, this.material(tone)) : new THREE.Line(g, this.material(tone));
    l.frustumCulled = false;
    l.renderOrder = 5;
    this.root.add(l);
  }

  private draw(item: SketchItem): void {
    const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
    if (item.kind === "line") this.line(item.points.map(v), item.tone);
    else if (item.kind === "arrow") {
      const a = v(item.from);
      const b = v(item.to);
      const d = b.clone().sub(a);
      const len = d.length();
      const side = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 * len ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize().multiplyScalar(len * 0.12);
      const back = b.clone().sub(d.clone().multiplyScalar(0.2));
      this.line([a, b], item.tone);
      this.line([back.clone().add(side), b, back.clone().sub(side)], item.tone);
    } else {
      const n = v(item.normal).normalize();
      const u = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
      const w = new THREE.Vector3().crossVectors(n, u);
      const c = v(item.centre);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 32; i++) {
        const t = (i / 32) * Math.PI * 2;
        pts.push(c.clone().add(u.clone().multiplyScalar(Math.cos(t) * item.radiusM)).add(w.clone().multiplyScalar(Math.sin(t) * item.radiusM)));
      }
      this.line(pts, item.tone, true);
    }
  }

  /** Frames the plan when the view on screen does not show it (`view`). */
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2e6);
  /** The open challenge's scene is the plan's, seen by `camera` (decided once per plan: no flicker). */
  private framing = false;

  /**
   * The view a challenge that draws a plan shows (docs/design/ux-acciones.md §7, a rule without exceptions):
   * the view on screen when at least half of the plan's points show above the sheet; otherwise the plan's own
   * scene, framed by `camera` so that the whole plan fits the part of the screen the sheet leaves open (`open`,
   * from the top left corner). Wherever the challenge was opened (the cockpit, the travel ship's navigation
   * console, the probe's console, a room), the plan is in the scene behind the sheet and nothing else needs to stay.
   */
  view(challenge: boolean, sc: THREE.Scene, cam: THREE.Camera, open: { readonly w: number; readonly h: number }, size: { readonly w: number; readonly h: number }): { scene: THREE.Scene; camera: THREE.Camera } {
    const home = this.root.parent as THREE.Scene | null;
    if (!challenge || !home || this.drawn === 0) {
      if (!challenge) this.framing = false;
      return { scene: sc, camera: cam };
    }
    if (!this.framing) {
      const a = this.audit(sc, cam, open.h, size);
      // Points beside the sheet in landscape: count those left of it too.
      const enough = a.inView && a.onScreen >= a.points / 2;
      if (enough) return { scene: sc, camera: cam };
      this.framing = true;
    }
    this.frame(open, size);
    return { scene: home, camera: this.camera };
  }

  /** Put `camera` where the whole plan fits the open part of the screen, seen from above and to one side. */
  private frame(open: { readonly w: number; readonly h: number }, size: { readonly w: number; readonly h: number }): void {
    const sphere = new THREE.Box3().setFromObject(this.root).getBoundingSphere(new THREE.Sphere());
    const R = Math.max(1, sphere.radius);
    const W = size.w, H = size.h;
    const cx = Math.min(W / 2, open.w / 2), cy = Math.min(H / 2, open.h / 2);
    const fullW = 2 * (W - cx), fullH = 2 * (H - cy);
    const half = (22 * Math.PI) / 180;
    const focal = open.h / 2 / Math.tan(half);
    const halfW = Math.atan(open.w / 2 / focal);
    const c = this.camera;
    c.fov = (2 * Math.atan(fullH / 2 / focal) * 180) / Math.PI;
    c.aspect = fullW / fullH;
    c.setViewOffset(fullW, fullH, W - 2 * cx, H - 2 * cy, W, H);
    const d = (R / Math.sin(Math.min(half, halfW))) * 1.05;
    const dir = new THREE.Vector3(0.45, 0.6, 0.66).normalize();
    c.position.copy(sphere.center).addScaledVector(dir, d);
    c.up.set(0, 1, 0);
    c.lookAt(sphere.center);
    c.near = Math.max(0.1, d - 2 * R) * 0.5;
    c.far = d + 4 * R + 1e5;
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
  }

  /** Add a step's sketch to what is drawn and say it. */
  show(step: SketchStep): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const it of step.items) this.draw(it);
    this.items.push(...step.items);
    this.caption.textContent = step.caption;
    this.caption.classList.remove("on");
    void this.caption.offsetWidth;
    this.caption.classList.add("on");
    this.onChange?.();
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const c of [...this.root.children]) {
      (c as THREE.Line).geometry.dispose();
      this.root.remove(c);
    }
    this.items.length = 0;
    this.framing = false;
    this.caption.classList.remove("on");
    this.onChange?.();
  }

  /** Clear after `seconds`. */
  clearLater(seconds: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.clear(), seconds * 1000);
  }

  /**
   * The animation audit (tools/experiencia/animaciones.mjs): of the plan's points, how many show on screen
   * above the challenge sheet, with the view being drawn now (`scene`, `camera`). A plan drawn in a
   * scene that is not on screen shows nothing.
   */
  audit(scene: THREE.Object3D, camera: THREE.Camera, sheetTop: number, size: { readonly w: number; readonly h: number }): { drawn: number; inView: boolean; points: number; onScreen: number; caption: string } {
    let inView = false;
    for (let o: THREE.Object3D | null = this.root; o; o = o.parent) if (o === scene) inView = true;
    let points = 0;
    let onScreen = 0;
    const v = new THREE.Vector3();
    camera.updateMatrixWorld();
    for (const c of this.root.children) {
      const pos = (c as THREE.Line).geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        points++;
        v.fromBufferAttribute(pos, i).applyMatrix4(c.matrixWorld).project(camera);
        const x = ((v.x + 1) / 2) * size.w;
        const y = ((1 - v.y) / 2) * size.h;
        if (inView && v.z > -1 && v.z < 1 && x >= 0 && x <= size.w && y >= 0 && y <= sheetTop) onScreen++;
      }
    }
    return { drawn: this.drawn, inView, points, onScreen, caption: this.caption.classList.contains("on") ? (this.caption.textContent ?? "") : "" };
  }

  /** A step visual over a chain whose sketches are computed when the chain opens. */
  visual(steps: () => readonly SketchStep[]): StepVisual {
    this.clear();
    const s = steps();
    return {
      stepDone: (i) => {
        const st = s[i];
        if (st) this.show(st);
      },
      finish: () => this.clearLater(8),
      clear: () => this.clear(),
    };
  }
}
