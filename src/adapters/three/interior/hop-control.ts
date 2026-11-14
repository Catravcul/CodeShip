import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { ARROWS, arrowVector, type Arrow, type HopEdge, type HopGraph, type LandingPoint, planHop, type ViewFrame } from "@modules/gravity/domain/hops";
import type { HopPlan, IvaState } from "@modules/gravity/domain/iva";
import { ArrowPad } from "../../input/arrow-pad";

const GLYPH: Readonly<Record<Arrow, string>> = { arriba: "▲", abajo: "▼", izquierda: "◀", derecha: "▶" };
/** Recompute the targets when the view turns more than this (cos of ~3°), or every this many seconds. */
const TURN_COS = Math.cos((3 * Math.PI) / 180);
const REFRESH_S = 0.4;
/** Markers closer than this to the camera are hidden, m. */
const NEAR_EYE_M = 1.4;

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

/** What the arrows do from a hold: a hop, or (on a ladder, along it) climbing. */
type ArrowDo = { hop: HopEdge } | { climb: Vec3 };

/** An arrow along a ladder climbs it when its direction is within this of the ladder's (cos 50°). */
const CLIMB_COS = Math.cos((50 * Math.PI) / 180);

/**
 * Arrow-pad hopping for a zero-g place (docs/design/ingravidez.md, «Fase C: flechas» and «Fase D»):
 * works out what each arrow would land on from the rail she holds, shows it with a faint marker, and
 * turns a tap into a hop (held: chained hops without the aim pause, or climbing a ladder). `goTo`
 * chains hops to a point by itself (a tap on an interactable, the task list's «Ir»). While she hops,
 * the pad is disabled and only her target stays marked, brighter.
 */
export class HopControl {
  readonly pad: ArrowPad;
  private hops: HopGraph | null = null;
  private readonly marks = new Map<Arrow, THREE.Sprite>();
  private targets: Partial<Record<Arrow, ArrowDo>> = {};
  private fromId = "";
  private lastFwd = new Vec3(0, 0, 0);
  private age = Infinity;
  private target: THREE.Sprite;
  /** Hops still to do toward a chosen point, or the point to route to once she holds on. */
  private route: HopEdge[] = [];
  private goal: string | null = null;
  private chained = false;
  /** Called when a chain of hops to a chosen point arrives. */
  onArrive?: (pointId: string) => void;

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
    this.cancel();
  }

  get graph(): HopGraph | null {
    return this.hops;
  }

  /** Chain hops to a landing point (by itself, hop after hop). False if there is no such point. */
  goTo(pointId: string): boolean {
    if (!this.hops?.points.some((p) => p.id === pointId)) return false;
    this.goal = pointId;
    this.route = [];
    return true;
  }

  /** Whether a chain of hops to a chosen point is under way. */
  get routing(): boolean {
    return this.goal !== null;
  }

  cancel(): void {
    this.goal = null;
    this.route = [];
  }

  /** Hide the pad and the markers. */
  hide(): void {
    this.pad.show(false);
    for (const m of this.marks.values()) m.visible = false;
    this.target.visible = false;
  }

  /** The landing point she holds now. */
  holding(s: IvaState): LandingPoint | undefined {
    const g = this.hops;
    const m = s.motion;
    if (!g || m.kind !== "sujeta") return undefined;
    return g.pointAt(m.rail, m.t) ?? g.nearest(s.position);
  }

  /**
   * Every frame while floating: returns what to do (a hop to start, or climbing along a ladder), if
   * an arrow or a chosen point asks for it. `enabled` false (another mode, a chore, the airlock
   * cycling) hides the pad.
   */
  update(s: IvaState, view: ViewFrame, enabled: boolean, dt: number, eye?: THREE.Vector3): { hop?: HopPlan; along?: Vec3 } {
    const g = this.hops;
    if (!enabled || !g) {
      this.hide();
      return {};
    }
    this.pad.show(true);
    const m = s.motion;
    if (m.kind !== "sujeta") {
      this.pad.sync({ arriba: false, abajo: false, izquierda: false, derecha: false }, true);
      for (const mk of this.marks.values()) mk.visible = false;
      this.fromId = "";
      if (m.kind === "salto") {
        const last = this.route.length ? this.route[this.route.length - 1]!.to : undefined;
        const r = g.rails.rail(last?.rail ?? m.rail);
        const at = r.a.add(r.b.sub(r.a).scale(last?.t ?? m.t)).add(r.normal.scale(0.12));
        this.target.position.set(at.x, at.y, at.z);
        this.target.visible = true;
      } else this.target.visible = false;
      return {};
    }
    this.target.visible = false;
    const from = this.holding(s);
    if (!from) return {};
    // A chosen point: hop after hop by itself; any arrow takes over again.
    if (this.goal) {
      const touched = this.pad.take();
      if (touched && !touched.repeat) this.cancel();
      else {
        if (from.id === this.goal) {
          const id = this.goal;
          this.cancel();
          this.chained = false;
          this.onArrive?.(id);
        } else {
          if (!this.route.length || this.route[0]!.path[0]!.sub(from.body).length() > 1e-6) {
            const r = g.route(from, this.goal);
            if (!r?.length) {
              this.cancel();
              return {};
            }
            this.route = r;
            this.chained = false;
          }
          const e = this.route.shift()!;
          const hop = planHop(e, s.position, this.chained);
          this.chained = true;
          this.pad.sync({ arriba: false, abajo: false, izquierda: false, derecha: false }, true);
          return { hop };
        }
      }
    }
    this.age += dt;
    const fwd = view.forward.normalize();
    if (from.id !== this.fromId || fwd.dot(this.lastFwd) < TURN_COS || this.age > REFRESH_S) {
      this.fromId = from.id;
      this.lastFwd = fwd;
      this.age = 0;
      this.targets = this.arrowTargets(s, from, view);
    }
    this.pad.sync({ arriba: !!this.targets.arriba, abajo: !!this.targets.abajo, izquierda: !!this.targets.izquierda, derecha: !!this.targets.derecha }, false);
    for (const a of ARROWS) {
      const mk = this.marks.get(a)!;
      const t = this.targets[a];
      const e = t && "hop" in t ? t.hop : undefined;
      mk.visible = !!e;
      if (!e) continue;
      const r = g.rails.rail(e.to.rail);
      const at = e.to.grip.add(r.normal.scale(0.12));
      mk.position.set(at.x, at.y, at.z);
      // Right by the camera it would fill the screen: the pad's arrow says enough.
      if (eye && mk.position.distanceTo(eye) < NEAR_EYE_M) mk.visible = false;
    }
    // Holding an arrow along a ladder climbs it.
    const held = this.pad.held();
    const climb = held ? this.targets[held] : undefined;
    if (climb && "climb" in climb) {
      this.pad.take();
      this.chained = false;
      return { along: climb.climb };
    }
    const press = this.pad.take();
    const t = press ? this.targets[press.arrow] : undefined;
    if (!t || !("hop" in t)) {
      if (!press) this.chained = false;
      return {};
    }
    this.fromId = "";
    const hop = planHop(t.hop, s.position, press!.repeat && this.chained);
    this.chained = true;
    return { hop };
  }

  /** What each arrow does from a hold: a hop, or on a ladder, climbing along it. */
  private arrowTargets(s: IvaState, from: LandingPoint, view: ViewFrame): Partial<Record<Arrow, ArrowDo>> {
    const g = this.hops!;
    const hops = g.targets(from, view);
    const out: Partial<Record<Arrow, ArrowDo>> = {};
    const m = s.motion;
    const rail = m.kind === "sujeta" ? g.rails.rail(m.rail) : undefined;
    // On a ladder ▲ ▼ climb it (▲ the way the view looks, or up it when it is level with the view);
    // ◀ ▶ climb too when they lie along it, otherwise they hop off.
    const axis = rail?.ladder ? rail.b.sub(rail.a).normalize() : undefined;
    for (const a of ARROWS) {
      if (axis) {
        const k = arrowVector(a, view).dot(axis);
        if (a === "arriba" || a === "abajo") {
          const ahead = view.forward.normalize().dot(axis);
          const way = Math.abs(ahead) > 0.2 ? Math.sign(ahead) : Math.sign(axis.y) || 1;
          out[a] = { climb: axis.scale(a === "arriba" ? way : -way) };
          continue;
        }
        if (Math.abs(k) > CLIMB_COS) {
          out[a] = { climb: axis.scale(Math.sign(k)) };
          continue;
        }
      }
      const e = hops[a];
      if (e) out[a] = { hop: e };
    }
    return out;
  }

  /** What the arrows would do now (for tests and the HUD). */
  available(): Readonly<Partial<Record<Arrow, HopEdge>>> {
    const out: Partial<Record<Arrow, HopEdge>> = {};
    for (const a of ARROWS) {
      const t = this.targets[a];
      if (t && "hop" in t) out[a] = t.hop;
    }
    return out;
  }
}
