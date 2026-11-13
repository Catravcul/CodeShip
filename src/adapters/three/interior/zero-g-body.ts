import * as THREE from "three";
import type { Handrail, RailGraph } from "@modules/gravity/domain/handrails";
import { closestOnRail, railPoint } from "@modules/gravity/domain/handrails";
import { pushDurationS, type IvaState } from "@modules/gravity/domain/iva";
import { P, POSES, type CubeFigure } from "./figure";

const RAIL_COLOR = 0xe8c547;
const num = (v: number, d = 2) => v.toFixed(d).replace(".", ",");

/** One line on what she is doing while floating (HUD). */
export function motionLabel(s: IvaState): string {
  const m = s.motion;
  const v = num(s.velocity.length());
  if (m.kind === "sujeta") return "Sujeta a un asidero";
  if (m.kind === "mano-a-mano") return "Mano a mano por los asideros";
  if (m.kind === "impulso") return "Impulsándose…";
  if (m.kind === "planeo") return `Planeando a ${v} m/s, sin frenar`;
  if (m.kind === "agarrando") return "Agarrando el asidero";
  if (m.kind === "pared") return "Apoyada en la pared";
  return `A la deriva (${num(s.velocity.length(), 3)} m/s)`;
}


/**
 * The handrails as 3D bars: a round grip on two short standoffs to its wall (ISS IVA handrails are
 * bolted to the rack fronts; a single colour so they read at a glance, NASA-STD-3000 §11.8.2.2.2).
 */
export function buildRails(rails: readonly Handrail[]): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: RAIL_COLOR, roughness: 0.45, metalness: 0.35 });
  const bar = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), mat, Math.max(1, rails.length));
  const feet = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 1, 0.03), mat, Math.max(1, 2 * rails.length));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
  rails.forEach((r, i) => {
    const a = v(r.a);
    const b = v(r.b);
    const n = v(r.normal);
    const d = b.clone().sub(a);
    q.setFromUnitVectors(up, d.clone().normalize());
    m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, d.length(), 1));
    bar.setMatrixAt(i, m);
    // Standoffs from the grip back to the wall, 8 cm.
    q.setFromUnitVectors(up, n);
    for (const [k, end] of [a, b].entries()) {
      const at = end.clone().addScaledVector(d, k === 0 ? 0.08 : -0.08).addScaledVector(n, -0.04);
      m.compose(at, q, new THREE.Vector3(1, 0.08, 1));
      feet.setMatrixAt(2 * i + k, m);
    }
  });
  bar.count = rails.length;
  feet.count = 2 * rails.length;
  g.add(bar, feet);
  return g;
}

const V = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** Rotation whose local Y is `up` and local Z is (as near as possible) `front`. */
function frame(up: THREE.Vector3, front: THREE.Vector3, fallback: THREE.Vector3): THREE.Quaternion {
  const y = up.clone().normalize();
  let z = front.clone().addScaledVector(y, -front.dot(y));
  if (z.lengthSq() < 1e-4) z = fallback.clone().addScaledVector(y, -fallback.dot(y));
  if (z.lengthSq() < 1e-4) z = new THREE.Vector3(1, 0, 0).addScaledVector(y, -y.x);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/**
 * Poses and places the cube figure from the zero-g motion (docs/design/ingravidez.md): holding a
 * rail with a hand on it, hand over hand, pushing off, gliding head first, reaching to catch the
 * next rail, braced on a wall, or adrift in the neutral posture.
 */
export class FloatingBody {
  private readonly q = new THREE.Quaternion();
  private readonly pos = new THREE.Vector3();
  private placed = false;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();

  constructor(private readonly rig: THREE.Object3D) {}

  /** Where her body's centre is drawn (a holding hand is on the rail, so it is not exactly the physics point). */
  centre(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(0, 0.9, 0).applyQuaternion(this.q).add(this.pos);
  }

  /** Snap next frame (after a jump: coming in, a teleport). */
  reset(): void {
    this.placed = false;
  }

  /** `look` is the camera's forward: it decides which way along a rail her head points while she holds it. */
  update(fig: CubeFigure, s: IvaState, graph: RailGraph, look: THREE.Vector3, dt: number): void {
    const m = s.motion;
    const p = V(s.position);
    let up = new THREE.Vector3();
    let front = new THREE.Vector3();
    /** Where a hand must be (holding), or null to centre the body at p. */
    let grip: THREE.Vector3 | null = null;
    let hands: "one" | "both" = "one";
    const alongRail = (r: Handrail) => {
      const d = V(r.b).sub(V(r.a)).normalize();
      return d.dot(look) < 0 ? d.negate() : d;
    };
    switch (m.kind) {
      case "sujeta": {
        const r = graph.rail(m.rail);
        up = alongRail(r);
        front = V(r.normal).negate();
        grip = V(railPoint(r, m.t));
        // Hand over hand: the arms take turns reaching ahead along the bar.
        if (m.hands > 0 && this.moving(m.hands)) {
          fig.poseAngles(this.handOverHand(m.hands));
          hands = "both";
        } else fig.pose("hold");
        break;
      }
      case "mano-a-mano": {
        const r = graph.rail(m.rail);
        up = alongRail(r);
        front = V(r.normal).negate();
        grip = V(m.from).lerp(V(railPoint(r, m.t)), m.progress);
        fig.poseAngles(this.handOverHand(m.hands));
        hands = "both";
        break;
      }
      case "impulso": {
        up = V(m.dir);
        front = WORLD_UP.clone().negate();
        // Arms sweep back as the push goes on.
        const k = Math.min(1, m.elapsed / Math.max(0.1, pushDurationS(m.speed)));
        fig.poseAngles(k < 0.5 ? POSES.hold! : POSES.push!);
        break;
      }
      case "planeo": {
        const v = V(s.velocity);
        up = v.lengthSq() > 1e-6 ? v.normalize() : this.bodyUp();
        front = WORLD_UP.clone().negate();
        // Near the planned rail she gets ready to catch it.
        const t = m.target ? closestOnRail(graph.rail(m.target.rail), s.position).distance : Infinity;
        fig.pose(t < 1.6 ? "reach" : "glide");
        break;
      }
      case "agarrando": {
        const r = graph.rail(m.rail);
        const to = V(railPoint(r, m.t));
        up = to.clone().sub(p).lengthSq() > 0.04 ? to.clone().sub(p).normalize() : alongRail(r);
        front = V(r.normal).negate();
        fig.pose("reach");
        // The last part of the catch: hand on the bar.
        if (m.elapsed / m.duration > 0.6) grip = to;
        break;
      }
      case "pared": {
        front = V(m.normal).negate();
        up = look.clone();
        fig.pose("brace");
        break;
      }
      case "deriva": {
        up = this.bodyUp();
        front = WORLD_UP.clone().negate();
        fig.pose("float");
        break;
      }
    }
    fig.update(dt, m.kind === "impulso" || m.kind === "agarrando" ? 6 : 4);
    // Turn smoothly toward the new attitude (the body rotates; it does not snap).
    const want = frame(up, front, look);
    if (!this.placed) this.q.copy(want);
    else this.q.slerp(want, 1 - Math.exp(-5 * dt));
    this.rig.quaternion.copy(this.q);
    // Place it: a hand on the grip, or the body centre (0,9 m above the feet) at p.
    let target: THREE.Vector3;
    if (grip) {
      this.rig.position.set(0, 0, 0);
      this.rig.updateMatrixWorld(true);
      const h = hands === "both" ? fig.handWorld(0, this.tmp).add(fig.handWorld(1, this.tmp2)).multiplyScalar(0.5) : fig.handWorld(0, this.tmp);
      const parent = this.rig.parent;
      if (parent) parent.worldToLocal(h);
      target = grip.clone().sub(h);
    } else target = p.clone().sub(new THREE.Vector3(0, 0.9, 0).applyQuaternion(this.q));
    if (!this.placed) this.pos.copy(target);
    else this.pos.lerp(target, 1 - Math.exp(-10 * dt));
    this.rig.position.copy(this.pos);
    this.placed = true;
  }

  private lastHands = 0;
  private stillFor = 0;
  /** Whether the hands moved lately (to keep the hand-over-hand cycle going between steps). */
  private moving(hands: number): boolean {
    if (hands !== this.lastHands) {
      this.lastHands = hands;
      this.stillFor = 0;
      return true;
    }
    this.stillFor++;
    return this.stillFor < 20;
  }

  private bodyUp(): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.q);
  }

  /** Arms taking turns ahead along the bar: one reaches while the other pulls. */
  private handOverHand(hands: number) {
    const ph = (hands / 0.3) * Math.PI;
    const s = Math.sin(ph);
    return P({ torso: 0.1, headX: -0.3, shoulderX: [-2.1 - 0.45 * s, -2.1 + 0.45 * s], shoulderZ: [0.15, -0.15], elbow: [-0.3 - 0.3 * Math.max(0, -s), -0.3 - 0.3 * Math.max(0, s)], hip: [-0.3 + 0.15 * s, -0.3 - 0.15 * s], knee: [0.5, 0.5] });
  }
}
