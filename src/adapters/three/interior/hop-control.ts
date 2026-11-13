import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { ARROWS, type Arrow, type HopEdge, type HopGraph, planHop, type ViewFrame } from "@modules/gravity/domain/hops";
import type { HopPlan, IvaState } from "@modules/gravity/domain/iva";
import { ArrowPad } from "../../input/arrow-pad";

const GLYPH: Readonly<Record<Arrow, string>> = { arriba: "▲", abajo: "▼", izquierda: "◀", derecha: "▶" };
/** Recompute the targets when the view turns more than this (cos of ~3°), or every this many seconds. */
const TURN_COS = Math.cos((3 * Math.PI) / 180);
const REFRESH_S = 0.4;

/** A faint round marker with an arrow glyph, 0,22 m across (what that arrow would land on). */
function marker(glyph: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = "#7fdcff";
  ctx.lineWidth = 6;
  ctx.fillStyle = "#06141c99";
  ctx.beginPath();
  ctx.arc(48, 48, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d8f6ff";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, 48, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false }));
  s.scale.set(0.22, 0.22, 1);
  s.renderOrder = 5;
  s.visible = false;
  return s;
}

/**
 * Arrow-pad hopping for a zero-g place (docs/design/ingravidez.md, «Fase C: flechas»): works out
 * what each arrow would land on from the rail she holds, shows it with a faint marker, and turns a
 * tap into a hop. While she hops, the pad is disabled and only her target stays marked, brighter.
 */
export class HopControl {
  readonly pad: ArrowPad;
  private hops: HopGraph | null = null;
  private readonly marks = new Map<Arrow, THREE.Sprite>();
  private targets: Partial<Record<Arrow, HopEdge>> = {};
  private fromId = "";
  private lastFwd = new Vec3(0, 0, 0);
  private age = Infinity;
  private target: THREE.Sprite;

  constructor(root: HTMLElement, scene: THREE.Scene) {
    this.pad = new ArrowPad(root);
    for (const a of ARROWS) {
      const m = marker(GLYPH[a]);
      this.marks.set(a, m);
      scene.add(m);
    }
    this.target = marker("●");
    (this.target.material as THREE.SpriteMaterial).opacity = 0.9;
    this.target.scale.set(0.28, 0.28, 1);
    scene.add(this.target);
  }

  /** The landing points of the place (rebuilt with the rooms). */
  setGraph(hops: HopGraph): void {
    this.hops = hops;
    this.fromId = "";
    this.targets = {};
  }

  /** Hide the pad and the markers. */
  hide(): void {
    this.pad.show(false);
    for (const m of this.marks.values()) m.visible = false;
    this.target.visible = false;
  }

  /**
   * Every frame while floating: returns the hop to start, if an arrow asks for one. `enabled` false
   * (another mode, a chore, the airlock cycling) hides the pad.
   */
  update(s: IvaState, view: ViewFrame, enabled: boolean, dt: number): HopPlan | undefined {
    const g = this.hops;
    if (!enabled || !g) {
      this.hide();
      return undefined;
    }
    this.pad.show(true);
    const m = s.motion;
    if (m.kind !== "sujeta") {
      this.pad.sync({ arriba: false, abajo: false, izquierda: false, derecha: false }, true);
      for (const mk of this.marks.values()) mk.visible = false;
      this.fromId = "";
      if (m.kind === "salto") {
        const r = g.rails.rail(m.rail);
        const at = r.a.add(r.b.sub(r.a).scale(m.t)).add(r.normal.scale(0.12));
        this.target.position.set(at.x, at.y, at.z);
        this.target.visible = true;
      } else this.target.visible = false;
      return undefined;
    }
    this.target.visible = false;
    const from = g.pointOf(m.rail) ?? g.nearest(s.position);
    if (!from) return undefined;
    this.age += dt;
    const fwd = view.forward.normalize();
    if (from.id !== this.fromId || fwd.dot(this.lastFwd) < TURN_COS || this.age > REFRESH_S) {
      this.fromId = from.id;
      this.lastFwd = fwd;
      this.age = 0;
      this.targets = g.targets(from, view);
    }
    this.pad.sync({ arriba: !!this.targets.arriba, abajo: !!this.targets.abajo, izquierda: !!this.targets.izquierda, derecha: !!this.targets.derecha }, false);
    for (const a of ARROWS) {
      const mk = this.marks.get(a)!;
      const e = this.targets[a];
      mk.visible = !!e;
      if (!e) continue;
      const r = g.rails.rail(e.to.rail);
      const at = e.to.grip.add(r.normal.scale(0.12));
      mk.position.set(at.x, at.y, at.z);
    }
    const a = this.pad.take();
    const e = a ? this.targets[a] : undefined;
    if (!e) return undefined;
    this.fromId = "";
    return planHop(e, s.position);
  }

  /** What the arrows would do now (for tests and the HUD). */
  available(): Readonly<Partial<Record<Arrow, HopEdge>>> {
    return this.targets;
  }
}
