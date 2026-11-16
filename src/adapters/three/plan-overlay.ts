import * as THREE from "three";
import type { SketchItem, SketchStep, SketchTone } from "@modules/navigation/application/plan-sketch";
import type { StepVisual } from "@modules/chores/domain/step-visual";

const COLOUR: Record<SketchTone, number> = { plan: 0x7fdcff, burn: 0xffb347, brake: 0xff7a5a, site: 0x7dffb0, ok: 0x7dffb0 };

/**
 * Draws plan sketches (plan-sketch.ts) in the 3D scene as plain lines (no lights, one material per
 * tone), with a one-line caption over the scene: the plan builds up as each step is answered right.
 */
export class PlanOverlay {
  private readonly root = new THREE.Group();
  private readonly materials = new Map<SketchTone, THREE.LineBasicMaterial>();
  private readonly caption: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(scene: THREE.Scene, host: HTMLElement) {
    this.root.name = "plan-overlay";
    this.root.renderOrder = 5;
    scene.add(this.root);
    this.caption = document.createElement("div");
    this.caption.className = "plan-caption";
    this.caption.setAttribute("role", "status");
    // The step overlay stays on screen with a challenge open (docs/design/ux-acciones.md §7).
    this.caption.dataset.duelKeep = "paso";
    host.appendChild(this.caption);
  }

  /** Lines drawn now (for checks). */
  get drawn(): number {
    return this.root.children.length;
  }

  private material(tone: SketchTone): THREE.LineBasicMaterial {
    let m = this.materials.get(tone);
    if (!m) {
      m = new THREE.LineBasicMaterial({ color: COLOUR[tone], transparent: true, opacity: 0.9, depthTest: false });
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

  /** Add a step's sketch to what is drawn and say it. */
  show(step: SketchStep): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const it of step.items) this.draw(it);
    this.caption.textContent = step.caption;
    this.caption.classList.remove("on");
    void this.caption.offsetWidth;
    this.caption.classList.add("on");
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const c of [...this.root.children]) {
      (c as THREE.Line).geometry.dispose();
      this.root.remove(c);
    }
    this.caption.classList.remove("on");
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
