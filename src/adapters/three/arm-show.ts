import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { ArmMove, ArmProcedureId } from "@modules/robotics/data/procedures";
import { CAMERA_ORU, CAPTURE, CARGO_CBM, GRAPPLE_FIXTURES } from "@modules/robotics/data/robotics";
import { insideStation, segmentClear } from "@modules/robotics/domain/clearance";
import { ARM_BASE, BISHOP_BERTH, POLANA_LAYOUT } from "@modules/station/data/structure";
import { BISHOP } from "@modules/station/data/iss";
import { CanadarmModel } from "./canadarm-model";
import { CygnusModel, DextreModel, oruBox, sceneLabel } from "./robotics-models";

/**
 * The arm's procedures played outside the station, move by move (docs/design/brazo-robotico.md): each block of
 * an arm challenge placed right plays its real motion (approach, snares, berthing stages, walking, Dextre's
 * hands…) in the station's frame. The camera of the challenge looks at it from the Cupola's windows when they
 * see it, or from an outside camera, and keeps it in the strip above the sheet. `audit()` measures it live
 * (tools/experiencia/brazo-eva.mjs): the subject on screen and not hidden, and nothing through the station.
 */

const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const V = (p: THREE.Vector3) => new Vec3(p.x, p.y, p.z);
const ease = (t: number) => t * t * (3 - 2 * t);

/** Seconds a block's motion takes on screen (game value: on the ISS a capture to bolts takes hours, NG-19). */
export const MOVE_S = 3.2;

/** Where the camera looks from: the Cupola's windows or one of the outside cameras. */
export type ArmViewpoint = "cupola" | "camara";

interface Tween {
  readonly move: ArmMove;
  readonly dur: number;
  t: number;
  /** Tip path (station frame). */
  readonly path: THREE.Vector3[];
  /** MBS x at start and end. */
  readonly mbs: readonly [number, number];
  readonly caption: string;
  /** What the step is about (the audit's subject) and its name. */
  readonly subject: () => THREE.Object3D;
  readonly subjectName: string;
  readonly onStart?: () => void;
  readonly onTick?: (k: number) => void;
  readonly onEnd?: () => void;
  start?: THREE.Vector3;
  /** Where the subject's centre was when it started (station frame). */
  subjectStart?: THREE.Vector3;
  /** A change that shows without moving much (thrusters going out): the audit counts it as the step's act. */
  readonly shows?: string;
}

export interface ArmShowDeps {
  /** The lander as drawn outside, and its poses on its IDA or the CBM (station frame). */
  readonly lander: THREE.Object3D;
  landerAt(at: "ida" | "cbm"): { pos: THREE.Vector3; quat: THREE.Quaternion };
  /** The lander is on Unity's nadir CBM now: the Cygnus goes to Harmony's. */
  landerOnUnity(): boolean;
  readonly bishop: THREE.Object3D;
  bishopModule(): THREE.Object3D | undefined;
}

export interface ArmAudit {
  readonly procedure: string;
  readonly move: string;
  readonly playing: boolean;
  readonly t: number;
  readonly viewpoint: ArmViewpoint;
  readonly subject: string;
  readonly subjectPx: readonly [number, number];
  /** Fraction of the subject's sample points on screen above the sheet and not hidden. */
  readonly seen: number;
  /** What hides its centre, if anything. */
  readonly hiddenBy?: string;
  /** Points of the booms, the LEE or what it holds that are inside the station: «what · where». */
  readonly through: readonly string[];
  /** How far the tip or the subject moved in this block, m (0: nothing played). */
  readonly moved: number;
  /** What changed without moving (thrusters out), if the block's act is that. */
  readonly shows?: string;
}

const fixture = (id: string) => GRAPPLE_FIXTURES.find((f) => f.id === id)!;

export class ArmShow {
  readonly root = new THREE.Group();
  readonly arm: CanadarmModel;
  readonly dextre = new DextreModel();
  readonly cygnus = new CygnusModel();
  private readonly newCam = oruBox(0.6, 0xd9b24a, "Cámara nueva");
  private readonly oldCam = oruBox(0.6, 0x7d858f, "Cámara vieja de S1");
  private readonly stowage = oruBox(1.4, 0x9aa3ad, "Estante de repuestos (JEM-EF)");
  private readonly marks = new THREE.Group();
  private readonly labels: THREE.Sprite[] = [];
  private readonly queue: Tween[] = [];
  private current: Tween | null = null;
  private last: Tween | null = null;
  /** Base of the arm: an MBS PDGF or Destiny's. */
  private base: "mbs-1" | "lab" = "mbs-1";
  private mbsX = 0;
  private readonly tip = new THREE.Vector3();
  private hint = new THREE.Vector3(0, -1, 1);
  /** What the LEE holds, kept at its offset from the tip. */
  private held: { obj: THREE.Object3D; off: THREE.Vector3; quat?: THREE.Quaternion } | null = null;
  /** Dextre holds the old and new camera in its hands. */
  private inHand: [THREE.Object3D | null, THREE.Object3D | null] = [null, null];
  private dextreOnArm = false;
  private drifting: { obj: THREE.Object3D; v: THREE.Vector3; age: number }[] = [];
  private proc: ArmProcedureId | "" = "";
  /** The Cygnus is at the capture point or berthed (drawn), or not here. */
  private cygnusAt: "fuera" | "punto" | "atracado" = "fuera";
  private readonly vestibule: THREE.Mesh;
  /** Where the camera looks while a procedure plays (station frame). */
  readonly focus = new THREE.Vector3();
  /** Radius of what the camera frames (the subject's bounding sphere), m. */
  focusR = 2;
  viewpoint: ArmViewpoint = "camara";
  line = "";

  constructor(
    lengthM: number,
    private readonly deps: ArmShowDeps,
  ) {
    this.arm = new CanadarmModel(lengthM);
    this.cygnus.root.visible = false;
    this.oldCam.position.copy(v(CAMERA_ORU.at)).add(new THREE.Vector3(0, -0.35, 0));
    this.stowage.position.copy(v(fixture("jem-ef").at)).add(new THREE.Vector3(0, 0.7, 0));
    this.newCam.position.copy(this.stowage.position).add(new THREE.Vector3(0, 1.0, 0));
    // The Bishop's vestibule: its light says the air (green: air, amber: closed, red: vacuum).
    this.vestibule = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 8, 24), new THREE.MeshBasicMaterial({ color: 0x5fd38a }));
    this.vestibule.rotation.y = Math.PI / 2;
    this.vestibule.position.copy(v(BISHOP_BERTH.position)).add(new THREE.Vector3(-0.1, 0, 0));
    this.vestibule.name = "Vestíbulo de la Bishop";
    this.root.add(this.arm.root, this.dextre.root, this.cygnus.root, this.newCam, this.oldCam, this.stowage, this.marks, this.vestibule);
    const label = (text: string, at: () => THREE.Vector3) => {
      const s = sceneLabel(text);
      s.userData.at = at;
      this.labels.push(s);
      this.root.add(s);
    };
    label("Canadarm2 · CSA", () => this.arm.joints.elbow.clone().add(new THREE.Vector3(0, 1.2, 0)));
    label("Dextre · CSA", () => this.dextre.root.position.clone().add(new THREE.Vector3(0, -2.4, 0)));
    label("Base móvil (MBS)", () => this.mbsPoint().add(new THREE.Vector3(0, 1.4, 0)));
    label("Cygnus · NASA", () => this.cygnus.root.position.clone().add(new THREE.Vector3(0, -4.2, 0)));
    this.parkDextre();
    this.rest();
  }

  /** The MBS's centre now (under the truss). */
  private mbsPoint(): THREE.Vector3 {
    return v(ARM_BASE).add(new THREE.Vector3(this.mbsX, -0.5, 0));
  }
  private pdgf(id: "mbs-1" | "mbs-3" | "lab"): { at: THREE.Vector3; out: THREE.Vector3 } {
    if (id === "lab") return { at: v(fixture("lab").at), out: new THREE.Vector3(0, -1, 0) };
    return { at: this.mbsPoint().add(new THREE.Vector3(id === "mbs-1" ? -2.5 : 2.5, -0.65, 0)), out: new THREE.Vector3(0, -1, 0) };
  }

  private parkDextre(): void {
    const p = this.pdgf("mbs-3");
    // Dextre's own LEE on the MBS's PDGF, its body hanging down, its head (PDGF) free for Canadarm2.
    this.dextre.root.quaternion.identity();
    this.dextre.root.position.copy(p.at).add(new THREE.Vector3(0, -2.1, 0));
    this.dextre.root.rotation.z = Math.PI;
    this.dextreOnArm = false;
  }

  get playing(): boolean {
    return !!this.current || this.queue.length > 0;
  }
  get procedure(): string {
    return this.proc;
  }

  /** At rest: on an MBS PDGF, folded down in front of the truss. */
  rest(): void {
    this.base = "mbs-1";
    const p = this.pdgf("mbs-1");
    this.tip.copy(p.at).add(new THREE.Vector3(4, -6, 5));
    this.hint.set(0, -1, 1);
    this.pose();
  }

  /** A plain reach from the MBS (the yard's releases): the base rides toward the work. */
  reachTo(target: THREE.Vector3): void {
    this.base = "mbs-1";
    this.mbsX = Math.max(-40, Math.min(40, target.x * 0.9));
    this.tip.copy(target);
    this.hint.set(0, 1, 0.3);
    this.pose();
  }

  /** The arm holds the lander now (its procedures draw it). */
  get holdsLander(): boolean {
    return this.held?.obj === this.deps.lander || ((this.proc === "atraque-modulo" || this.proc === "desatraque-modulo") && this.playing);
  }

  /** The Cygnus waiting at the capture point, or berthed, or not drawn. */
  setCygnus(at: "fuera" | "punto" | "atracado"): void {
    if (this.current?.move && this.proc === "captura") return;
    this.cygnusAt = at;
    this.cygnus.root.visible = at !== "fuera";
    if (at === "punto") this.cygnus.root.position.copy(this.capturePoint());
    if (at === "atracado") this.cygnus.root.position.copy(this.berthPoint());
    this.cygnus.thrusting = at === "punto";
  }

  private cbm(): { pos: THREE.Vector3 } {
    const c = this.deps.landerOnUnity() ? CARGO_CBM.harmony : CARGO_CBM.unity;
    return { pos: v(c.position) };
  }
  /** The Cygnus's centre with its CBM ring 10 m below the station's CBM (the capture point). */
  private capturePoint(): THREE.Vector3 {
    return this.cbm().pos.add(new THREE.Vector3(0, -CAPTURE.pointM.value - this.cygnus.lengthM / 2, 0));
  }
  /** Its centre berthed: the ring flush with the CBM. */
  private berthPoint(gap = 0): THREE.Vector3 {
    return this.cbm().pos.add(new THREE.Vector3(0, -this.cygnus.lengthM / 2 - 0.05 - gap, 0));
  }

  /**
   * A procedure begins: the arm is where Mission Control leaves it the day before (real: the ground positions
   * the arm before a capture), and the scene is set.
   */
  begin(proc: ArmProcedureId): void {
    this.queue.length = 0;
    this.current = null;
    this.last = null;
    this.proc = proc;
    this.held = null;
    this.arm.snare(0);
    if (proc === "captura") {
      this.base = "lab";
      this.setCygnus("fuera");
      this.cygnusAt = "fuera";
      const cap = this.capturePoint();
      this.tip.copy(cap).add(new THREE.Vector3(this.cygnus.radiusM + 3.5, 3, 0));
      this.hint.set(1, -0.3, 0.5);
    } else if (proc === "dextre-camara") {
      // The camera on S1 is the worn one; a spare waits on the shelf (whatever was swapped before).
      this.inHand = [null, null];
      this.oldCam.position.copy(v(CAMERA_ORU.at)).add(new THREE.Vector3(0, -0.35, 0));
      this.newCam.position.copy(this.stowage.position).add(new THREE.Vector3(0, 1.0, 0));
      this.base = "lab";
      this.tip.copy(this.pdgf("lab").at).add(new THREE.Vector3(3, -5, 4));
      this.hint.set(1, -1, 0);
    } else {
      this.base = "mbs-1";
      this.hint.set(0, 1, 0.3);
      if (proc === "bishop") this.mbsX = -9;
    }
    this.pose();
  }

  /** Play the blocks' moves, one after the other. */
  play(moves: readonly ArmMove[]): void {
    for (const m of moves) this.queue.push(this.tween(m));
  }

  /**
   * The challenge closed. Done: the scene stays as it ended and the arm lets go. Not done: what it moved goes
   * back where it was (the domain did not change).
   */
  end(ok: boolean): void {
    this.queue.length = 0;
    if (ok) while (this.current) this.finishCurrent();
    this.current = null;
    this.last = null;
    this.held = null;
    this.arm.snare(0);
    this.clearMarks();
    if (!ok) {
      this.deps.bishop.visible = false;
      const m = this.deps.bishopModule();
      if (m) m.visible = true;
      (this.vestibule.material as THREE.MeshBasicMaterial).color.setHex(0x5fd38a);
      this.inHand = [null, null];
      if (this.proc === "dextre-camara") {
        this.oldCam.position.copy(v(CAMERA_ORU.at)).add(new THREE.Vector3(0, -0.35, 0));
        this.newCam.position.copy(this.stowage.position).add(new THREE.Vector3(0, 1.0, 0));
      }
    } else if (this.proc === "dextre-camara") {
      // The swap is done: a new spare waits on the shelf for next time, the old one is Dextre's to stow.
      this.inHand = [null, null];
      this.oldCam.position.copy(this.stowage.position).add(new THREE.Vector3(0.6, 0.9, 0.4));
    }
    if ((this.proc === "bishop") && ok) (this.vestibule.material as THREE.MeshBasicMaterial).color.setHex(0x5fd38a);
    this.dextreOnArm = false;
    this.parkDextre();
    this.proc = "";
    this.rest();
  }

  /** Manual capture: the base on Destiny's PDGF and the tip where the hand controller puts it. */
  manual(tip: THREE.Vector3, cygnusAt: THREE.Vector3 | null): void {
    this.proc = "";
    this.base = "lab";
    this.hint.set(1, -0.3, 0.5);
    this.tip.copy(tip);
    if (cygnusAt) {
      this.cygnus.root.visible = true;
      this.cygnus.thrusting = false;
      this.cygnus.root.position.copy(cygnusAt);
    }
    this.pose();
  }
  /** The Cygnus's grapple fixture relative to its centre (station frame). */
  get grappleOffset(): THREE.Vector3 {
    return this.cygnus.grapple.clone();
  }
  /** Where the Cygnus waits now (its centre at the capture point). */
  get capturePointNow(): THREE.Vector3 {
    return this.capturePoint();
  }
  /** Destiny's PDGF (the base for captures). */
  get labBase(): THREE.Vector3 {
    return this.pdgf("lab").at;
  }

  private finishCurrent(): void {
    if (!this.current) {
      const n = this.queue.shift();
      if (!n) return;
      this.startTween(n);
    }
    const c = this.current!;
    c.t = c.dur;
    this.apply(c, 1);
    c.onEnd?.();
    this.current = null;
  }

  private startTween(t: Tween): void {
    this.current = t;
    t.t = 0;
    t.onStart?.();
    // The path starts where the tip is now.
    if (t.path.length) t.path[0] = this.tip.clone();
    t.start = this.tip.clone();
    t.subjectStart = this.centreOf(t.subject());
    this.line = t.caption;
  }

  /** The centre of an object's box, station frame (the tip for the arm itself). */
  private centreOf(o: THREE.Object3D): THREE.Vector3 {
    if (o === this.arm.root) return this.arm.tip.clone();
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    return box.isEmpty() ? this.arm.tip.clone() : this.local(box.getCenter(new THREE.Vector3()));
  }

  /** The tip's path from here to `to` (through `via`). */
  private path(to: THREE.Vector3, ...via: THREE.Vector3[]): THREE.Vector3[] {
    return [this.tip.clone(), ...via, to];
  }

  private tween(move: ArmMove): Tween {
    // Paths are built when they start (the state before is known then): `lazy` fills them.
    const T = (caption: string, subjectName: string, subject: () => THREE.Object3D, build: (t: Tween) => Partial<Tween>, dur = MOVE_S): Tween => {
      const base: Tween = { move, dur, t: 0, path: [], mbs: [this.mbsX, this.mbsX], caption, subject, subjectName };
      return Object.assign(base, { onStart: () => Object.assign(base, build(base)) });
    };
    const arm = () => this.arm.root;
    const cyg = () => this.cygnus.root;
    const grapple = () => this.local(this.cygnus.root.localToWorld(this.cygnus.grapple.clone()));
    const stay = (): Partial<Tween> => ({ path: [this.tip.clone(), this.tip.clone()], mbs: [this.mbsX, this.mbsX] });
    const ride = (x: number) => [this.mbsX, this.base === "mbs-1" ? Math.max(-40, Math.min(40, x)) : this.mbsX] as const;
    const hold = (obj: THREE.Object3D) => (this.held = { obj, off: obj.position.clone().sub(this.tip), quat: obj.quaternion.clone() });
    switch (move) {
      case "punto-captura":
        return T("El Cygnus sube por debajo y se para en el punto de captura, a 10 m", "Cygnus", cyg, () => {
          const to = this.capturePoint();
          const from = to.clone().add(new THREE.Vector3(0, -22, 6));
          this.cygnus.root.visible = true;
          this.cygnus.thrusting = true;
          return { ...stay(), onTick: (k) => this.cygnus.root.position.lerpVectors(from, to, ease(k)), onEnd: () => (this.cygnusAt = "punto") };
        });
      case "deriva-libre":
        return T("Deriva libre: el Cygnus apaga sus propulsores y espera quieto", "Cygnus", cyg, () => {
          this.cygnus.thrusting = false;
          const p0 = this.cygnus.root.position.clone();
          return { ...stay(), shows: "propulsores apagados", onTick: (k) => this.cygnus.root.position.copy(p0).add(new THREE.Vector3(CAPTURE.freeDriftMs.value * k * MOVE_S, 0, 0)) };
        });
      case "acercar":
        return T("El LEE se acerca al accesorio de agarre del Cygnus", "LEE", arm, () => {
          const g = grapple();
          return { path: this.path(g.clone().add(new THREE.Vector3(0.7, 0, 0)), g.clone().add(new THREE.Vector3(2.2, 0.6, 0))) };
        });
      case "capturar":
        return T("Disparo: los tres cables del LEE atrapan el vástago. ¡Capturado!", "LEE", arm, () => ({ path: this.path(grapple()), onTick: (k) => this.arm.snare(k), onEnd: () => hold(this.cygnus.root) }), 2.4);
      case "llevar-cbm":
      case "llevar-modulo":
      case "volver-ida": {
        const what = move === "llevar-cbm" ? "el Cygnus" : "el módulo";
        const caption = move === "llevar-cbm" ? `El brazo lleva el Cygnus hasta el ${this.deps.landerOnUnity() ? "CBM de nadir de Harmony" : "CBM de nadir de Unity"}` : move === "llevar-modulo" ? "El brazo lleva el módulo por encima de la celosía hasta el nadir de Unity" : "El brazo devuelve el módulo por encima de la celosía a su IDA de cenit";
        return T(caption, what, () => this.held?.obj ?? arm(), () => {
          const h = this.held;
          if (!h) return stay();
          let to: THREE.Vector3;
          let via: THREE.Vector3[] = [];
          if (move === "llevar-cbm") {
            to = this.berthPoint(1.2).add(h.off.clone().negate());
            via = [this.tip.clone().add(new THREE.Vector3(1.5, 3, 0))];
          } else {
            const ida = this.deps.landerAt("ida").pos;
            const cbm = this.deps.landerAt("cbm").pos.add(new THREE.Vector3(0, -1.2, 0));
            const high = 10.5;
            const way = [new THREE.Vector3(ida.x, high, ida.z), new THREE.Vector3(0, high, 7), new THREE.Vector3(0, cbm.y - 2, 7), new THREE.Vector3(cbm.x, cbm.y - 2, cbm.z)];
            const pts = move === "llevar-modulo" ? [...way, cbm] : [...way.slice().reverse(), ida.clone().add(new THREE.Vector3(0, 2, 0)), ida];
            const off = h.off.clone().negate();
            via = pts.slice(0, -1).map((p) => p.clone().add(off));
            to = pts[pts.length - 1]!.clone().add(off);
          }
          return { path: this.path(to, ...via), mbs: ride(to.x * 0.9), dur: move === "llevar-cbm" ? MOVE_S * 1.4 : MOVE_S * 1.8 };
        });
      }
      case "primera-etapa":
      case "segunda-etapa": {
        const first = move === "primera-etapa";
        return T(first ? "Primera etapa: los 4 pestillos del CBM lo arriman" : "Segunda etapa: los 16 pernos motorizados", "CBM", () => this.held?.obj ?? this.marks, () => {
          const h = this.held;
          const ring = this.cbmMarks(first ? CAPTURE.latches.value : CAPTURE.bolts.value, first ? 0xffb347 : 0x7fdcff);
          if (!h) return { ...stay(), onEnd: () => this.clearMarks() };
          const isLander = h.obj === this.deps.lander;
          const flushAt = isLander ? this.deps.landerAt("cbm").pos : this.berthPoint();
          const nowAt = h.obj.position.clone();
          // Berthing pulls in; unberthing (the lander from the CBM) lets out.
          const out = nowAt.distanceTo(flushAt) < 0.05;
          const toObj = out ? flushAt.clone().add(new THREE.Vector3(0, first ? -1.2 : -0.3, 0)) : flushAt.clone().add(new THREE.Vector3(0, first ? -0.3 : 0, 0));
          ring.position.copy(isLander ? flushAt : this.cbm().pos);
          return { path: this.path(toObj.clone().sub(h.off)), dur: 2.4, onTick: (k) => ring.children.forEach((c, i) => ((c as THREE.Mesh).visible = i / ring.children.length <= k + 0.01)), onEnd: () => this.clearMarks() };
        });
      }
      case "soltar":
        return T(this.proc === "captura" ? "El LEE suelta el Cygnus, ya atracado, y el brazo se aparta" : "El LEE suelta y el brazo se aparta", "LEE", arm, () => {
          const h = this.held;
          this.held = null;
          this.arm.snare(0);
          if (h?.obj === this.cygnus.root) this.cygnusAt = "atracado";
          return { path: this.path(this.tip.clone().add(new THREE.Vector3(2.5, -2, 1.5))) };
        });
      case "apartar":
        return T("El brazo se aparta", "LEE", arm, () => ({ path: this.path(this.tip.clone().add(new THREE.Vector3(2, -2, 2))) }));
      case "rodar-mbs":
        return T("La base móvil rueda por los raíles de la celosía (1,5 m/min)", "Base móvil (MBS)", () => this.arm.mbs, () => {
          const ida = this.deps.landerAt(this.deps.landerOnUnity() ? "cbm" : "ida").pos;
          return { path: this.path(this.pdgf("mbs-1").at.add(new THREE.Vector3(0, 0, 0)).add(new THREE.Vector3(2, 5, -3))), mbs: ride(ida.x + 2) };
        });
      case "agarrar-modulo":
        return T("El LEE agarra el módulo por su accesorio (licencia)", "LEE", arm, () => {
          const at = this.deps.landerOnUnity() ? "cbm" : "ida";
          const l = this.deps.landerAt(at).pos;
          const g = l.clone().add(new THREE.Vector3(2.4, at === "ida" ? 1.4 : -1.4, 0));
          this.deps.lander.visible = true;
          this.deps.lander.position.copy(l);
          this.deps.lander.quaternion.copy(this.deps.landerAt(at).quat);
          return { path: this.path(g, g.clone().add(new THREE.Vector3(2.5, at === "ida" ? 2 : -2, 0))), onTick: (k) => this.arm.snare(k), onEnd: () => hold(this.deps.lander) };
        });
      case "sacar-modulo":
        return T("Se abren los ganchos del IDA y el brazo saca el módulo despacio", "Módulo lunar", () => this.deps.lander, () => ({ path: this.path(this.tip.clone().add(new THREE.Vector3(0, 2.2, 0))) }));
      case "agarrar-bishop":
        return T("El LEE agarra la Bishop por su accesorio", "LEE", arm, () => {
          const home = v(BISHOP_BERTH.position).add(new THREE.Vector3(-BISHOP.heightM / 2, 0, 0));
          const b = this.deps.bishop;
          b.visible = true;
          b.position.copy(home);
          const m = this.deps.bishopModule();
          if (m) m.visible = false;
          const g = v(fixture("bishop").at);
          return { path: this.path(g, g.clone().add(new THREE.Vector3(-2.5, 1.5, 0))), mbs: ride(-9), onTick: (k) => this.arm.snare(k), onEnd: () => hold(b) };
        });
      case "sacar-bishop":
        return T("Se sueltan los pernos y Canadarm2 saca la Bishop a la posición de suelta", "Bishop", () => this.deps.bishop, () => ({ path: this.path(this.tip.clone().add(new THREE.Vector3(-4.5, -4, 5)), this.tip.clone().add(new THREE.Vector3(-3, 0, 0))), dur: MOVE_S * 1.3 }));
      case "soltar-carga":
        return T("Se abre el lanzador: la carga se aleja sola", "Carga", () => this.marks, () => {
          const box = oruBox(0.5, 0xd9a441, "Carga soltada");
          box.position.copy(this.deps.bishop.position).add(new THREE.Vector3(-1.4, 0, 0));
          this.root.add(box);
          this.drifting.push({ obj: box, v: new THREE.Vector3(-0.5, -0.25, 0.35), age: 0 });
          this.marks.add(box.clone());
          return { ...stay(), subject: () => box, subjectName: "Carga soltada" };
        });
      case "atracar-bishop":
        return T("El brazo vuelve a atracar la Bishop y se aprietan los pernos", "Bishop", () => this.deps.bishop, () => {
          const home = v(BISHOP_BERTH.position).add(new THREE.Vector3(-BISHOP.heightM / 2, 0, 0));
          const off = this.held?.off ?? new THREE.Vector3();
          return {
            path: this.path(home.clone().sub(off), this.tip.clone().add(new THREE.Vector3(1.5, 2, -2))),
            dur: MOVE_S * 1.3,
            onEnd: () => {
              this.held = null;
              this.arm.snare(0);
              this.deps.bishop.visible = false;
              const m = this.deps.bishopModule();
              if (m) m.visible = true;
              this.clearMarks();
            },
          };
        });
      case "andar-mbs":
        return T("Canadarm2 anda de punta a punta: su LEE libre agarra un PDGF de la MBS y suelta el de Destiny", "LEE", arm, () => {
          const p = this.pdgf("mbs-1");
          const target = p.at.clone();
          return {
            path: this.path(target, this.tip.clone().add(new THREE.Vector3(0, 4, 0)), target.clone().add(new THREE.Vector3(0, -2.5, 0))),
            dur: MOVE_S * 1.4,
            onTick: (k) => this.arm.snare(k > 0.8 ? (k - 0.8) * 5 : 0),
            onEnd: () => {
              // The two ends swap roles: the old base is now the free end.
              const old = this.pdgf("lab").at;
              this.base = "mbs-1";
              this.tip.copy(old).add(new THREE.Vector3(0, -1.5, 0));
              this.hint.set(0, -1, 1);
              this.arm.snare(0);
            },
          };
        });
      case "agarrar-dextre":
        return T("El LEE agarra a Dextre por el PDGF de su cabeza", "Dextre", () => this.dextre.root, () => {
          const head = this.local(this.dextre.root.localToWorld(this.dextre.head.clone()));
          return {
            path: this.path(head, head.clone().add(new THREE.Vector3(-1, -3, 2))),
            onTick: (k) => this.arm.snare(k),
            onEnd: () => {
              this.dextreOnArm = true;
            },
          };
        });
      case "llevar-dextre-ef":
      case "llevar-dextre-camara": {
        const ef = move === "llevar-dextre-ef";
        return T(ef ? "La MBS rueda y el brazo lleva a Dextre al estante de repuestos de la JEM-EF" : "El brazo lleva a Dextre hasta la cámara de S1, bajo la celosía", "Dextre", () => this.dextre.root, () => {
          const at = ef ? this.stowage.position.clone().add(new THREE.Vector3(2.4, 3.2, 2.6)) : v(CAMERA_ORU.at).add(new THREE.Vector3(-0.5, -3.2, 2.8));
          return { path: this.path(at, this.tip.clone().add(new THREE.Vector3(0, -2, 3)), at.clone().add(new THREE.Vector3(0, -2, 2))), mbs: ride(at.x), dur: MOVE_S * 1.5 };
        });
      }
      case "tomar-oru":
        return T("Dextre toma la cámara nueva del estante con su OTCM", "Cámara nueva", () => this.newCam, () => {
          const p0 = this.newCam.position.clone();
          return {
            ...stay(),
            onTick: (k) => {
              this.dextre.reach(1, this.worldOf(k < 0.5 ? p0 : p0.clone().lerp(this.handRest(1), (k - 0.5) * 2)));
              if (k >= 0.5) this.inHand[1] = this.newCam;
            },
          };
        });
      case "sacar-oru":
        return T("Dextre desenrosca la cámara vieja y la sujeta con la otra mano", "Cámara vieja de S1", () => this.oldCam, () => {
          const p0 = this.oldCam.position.clone();
          return {
            ...stay(),
            onTick: (k) => {
              this.dextre.reach(0, this.worldOf(k < 0.5 ? p0 : p0.clone().lerp(this.handRest(0), (k - 0.5) * 2)));
              if (k >= 0.5) this.inHand[0] = this.oldCam;
            },
          };
        });
      case "montar-oru":
        return T("Dextre monta la cámara nueva y aprieta su perno con la llave de la OTCM", "Cámara nueva", () => this.newCam, () => {
          const mount = v(CAMERA_ORU.at).add(new THREE.Vector3(0, -0.35, 0));
          const from = this.newCam.position.clone();
          return {
            ...stay(),
            onTick: (k) => {
              this.dextre.reach(1, this.worldOf(from.clone().lerp(mount, ease(Math.min(1, k * 1.3)))));
              if (k >= 0.8) {
                this.inHand[1] = null;
                this.newCam.position.copy(mount);
              }
            },
          };
        });
      case "devolver-dextre":
        return T("El brazo devuelve a Dextre a su PDGF de la MBS, con la cámara vieja en la mano", "Dextre", () => this.dextre.root, () => {
          const head = this.pdgf("mbs-3").at.add(new THREE.Vector3(0, -4.2, 0));
          return {
            path: this.path(head, this.tip.clone().add(new THREE.Vector3(0, -2, 3))),
            mbs: ride(0),
            dur: MOVE_S * 1.4,
            onEnd: () => {
              this.parkDextre();
              this.arm.snare(0);
              this.tip.add(new THREE.Vector3(2, -2, 2));
            },
          };
        });
      case "comprobar":
        return T(this.proc === "bishop" ? "El vestíbulo de la Bishop cambia de presión" : "Comprobación en la pantalla del puesto robótico", this.proc === "bishop" ? "Vestíbulo de la Bishop" : "LEE", () => (this.proc === "bishop" ? this.vestibule : arm()), () => {
          if (this.proc === "bishop") {
            const m = this.vestibule.material as THREE.MeshBasicMaterial;
            const to = m.color.getHex() === 0x5fd38a ? 0xffb347 : 0xe0303a;
            return { ...stay(), onEnd: () => m.color.setHex(to), onTick: (k) => m.color.setHex(k > 0.5 ? to : m.color.getHex()) };
          }
          return { path: this.path(this.tip.clone().add(new THREE.Vector3(0, 0.6, 0))), dur: 1.6 };
        });
    }
  }

  /** Dextre's hand `i` held in front of its body (station frame). */
  private handRest(i: number): THREE.Vector3 {
    return this.local(this.dextre.root.localToWorld(new THREE.Vector3(i === 0 ? -1.1 : 1.1, 0.4, 1.4)));
  }
  /** World to the station's frame. */
  private local(p: THREE.Vector3): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    return this.root.worldToLocal(p.clone());
  }
  private worldOf(p: THREE.Vector3): THREE.Vector3 {
    return this.root.localToWorld(p.clone());
  }

  /** A ring of `n` markers (latches or bolts) round the CBM. */
  private cbmMarks(n: number, color: number): THREE.Group {
    this.clearMarks();
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color }));
      m.position.set(Math.cos(a) * 0.9, -0.1, Math.sin(a) * 0.9);
      m.visible = false;
      g.add(m);
    }
    g.name = n === 4 ? "Pestillos del CBM" : "Pernos del CBM";
    this.marks.add(g);
    return g;
  }
  private clearMarks(): void {
    for (const c of [...this.marks.children]) this.marks.remove(c);
  }

  private apply(c: Tween, k: number): void {
    const e = ease(k);
    if (c.path.length >= 2) this.tip.copy(along(c.path, e));
    this.mbsX = c.mbs[0] + (c.mbs[1] - c.mbs[0]) * e;
    c.onTick?.(k);
    this.pose();
  }

  /** Each frame. */
  update(dt: number): void {
    if (!this.current && this.queue.length) this.startTween(this.queue.shift()!);
    const c = this.current;
    if (c) {
      c.t = Math.min(c.dur, c.t + dt);
      this.apply(c, c.t / c.dur);
      if (c.t >= c.dur) {
        c.onEnd?.();
        this.last = c;
        this.current = null;
        this.pose();
      }
    }
    for (const d of this.drifting) {
      d.age += dt;
      d.obj.position.addScaledVector(d.v, dt);
    }
    while (this.drifting.length && this.drifting[0]!.age > 30) this.root.remove(this.drifting.shift()!.obj);
    this.focusOn();
  }

  /** Arm, Dextre and what they hold, where the state says. */
  private pose(): void {
    this.arm.setMbs(this.mbsPoint());
    const b = this.base === "lab" ? this.pdgf("lab") : this.pdgf("mbs-1");
    this.arm.reach(b.at, this.tip, b.at.clone().add(this.hint.clone().multiplyScalar(8)), b.out);
    if (this.held) this.held.obj.position.copy(this.arm.tip).add(this.held.off);
    if (this.dextreOnArm) {
      const d = this.arm.tipDir.clone();
      this.dextre.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate());
      this.dextre.root.position.copy(this.arm.tip).addScaledVector(d, this.dextre.head.y);
    } else if (!this.current || (this.current.move !== "agarrar-dextre" && this.current.move !== "devolver-dextre")) this.parkDextreAt();
    this.root.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const o = this.inHand[i as 0 | 1];
      if (o) o.position.copy(this.local(this.dextre.hand(i)));
    }
    for (const s of this.labels) s.position.copy((s.userData.at as () => THREE.Vector3)());
    const lbl = (name: string) => this.labels.find((s) => s.name.includes(name));
    const cyg = lbl("Cygnus");
    if (cyg) cyg.visible = this.cygnus.root.visible;
  }

  private parkDextreAt(): void {
    const p = this.pdgf("mbs-3");
    this.dextre.root.position.copy(p.at).add(new THREE.Vector3(0, -2.1, 0));
  }

  /** What the camera looks at now: the tip and what the step is about. */
  private focusOn(): void {
    const c = this.current ?? this.last;
    const subj = c ? c.subject() : this.arm.root;
    const p = subj === this.arm.root || subj === this.marks ? this.arm.tip.clone() : subj.position.clone();
    if (subj === this.marks && this.held) p.copy(this.held.obj.position);
    this.focus.lerp(p, this.focus.lengthSq() === 0 ? 1 : 0.15);
    const box = subj === this.arm.root || subj === this.marks ? null : new THREE.Box3().setFromObject(subj);
    const r = box && !box.isEmpty() ? box.getSize(new THREE.Vector3()).length() / 2 : 1.2;
    this.focusR += (Math.min(12, r) - this.focusR) * 0.15;
  }

  /**
   * The camera for the challenge: the Cupola's windows when they see the focus (nothing of the station in
   * between and within 30 m), otherwise the nearest outside camera with a clear line. Station frame.
   */
  eye(fovDeg = 55, strip = 1, aspect = 1): { eye: THREE.Vector3; at: THREE.Vector3; viewpoint: ArmViewpoint } {
    const at = this.focus.clone();
    // How far the camera stands for the subject to fill about two thirds of the strip above the sheet.
    const tanV = Math.tan((fovDeg * Math.PI) / 360) * strip;
    const tan = Math.min(tanV, Math.tan((fovDeg * Math.PI) / 360) * aspect);
    const need = Math.max(6, (this.focusR * 1.5) / tan);
    const cup = POLANA_LAYOUT.modules.find((m) => m.id === "cupula")!;
    const window = v(cup.to).add(new THREE.Vector3(0, -0.6, 0));
    const fromWindow = at.distanceTo(window);
    if (fromWindow > need * 0.8 && fromWindow < Math.max(30, need * 1.6) && !segmentClear(V(window), V(at), POLANA_LAYOUT, 0.5, 0.0)) return { eye: window, at, viewpoint: "cupola" };
    const dirs = [new THREE.Vector3(0.5, -0.5, 0.7), new THREE.Vector3(-0.6, -0.4, 0.7), new THREE.Vector3(0.6, 0.5, 0.6), new THREE.Vector3(-0.5, 0.6, 0.6), new THREE.Vector3(0.2, -0.8, -0.5), new THREE.Vector3(0, -0.9, 0.4), new THREE.Vector3(0, 0.3, 1)];
    for (const d of dirs) {
      const e = at.clone().addScaledVector(d.normalize(), need);
      if (!insideStation(V(e), POLANA_LAYOUT, -0.6) && !segmentClear(V(e), V(at), POLANA_LAYOUT, 0.5, 0.0)) return { eye: e, at, viewpoint: "camara" };
    }
    return { eye: at.clone().add(new THREE.Vector3(0.5, -0.5, 0.7).normalize().multiplyScalar(need)), at, viewpoint: "camara" };
  }

  /** Points of the booms, the LEE and what it holds (station frame), for the through-check. */
  private samples(): { what: string; p: THREE.Vector3 }[] {
    const j = this.arm.joints;
    const out: { what: string; p: THREE.Vector3 }[] = [];
    const seg = (what: string, a: THREE.Vector3, b: THREE.Vector3, n = 12) => {
      for (let i = 0; i <= n; i++) out.push({ what, p: a.clone().lerp(b, i / n) });
    };
    seg("brazo", j.shoulder, j.elbow);
    seg("brazo", j.elbow, j.wrist);
    seg("LEE", j.wrist, this.arm.tip, 3);
    const h = this.held?.obj;
    if (h) {
      const box = new THREE.Box3().setFromObject(h);
      const inv = this.root.matrixWorld.clone().invert();
      box.applyMatrix4(inv);
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3()).multiplyScalar(0.4);
      for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) out.push({ what: h.name || "carga", p: c.clone().add(new THREE.Vector3(dx * s.x, dy * s.y, dz * s.z)) });
    }
    return out;
  }

  /** The live audit of the block on stage (and the last one, once it ended). */
  audit(camera: THREE.PerspectiveCamera, scene: THREE.Object3D, sheetTop: number, size: { readonly w: number; readonly h: number }): ArmAudit | undefined {
    const c = this.current ?? this.last;
    if (!c) return undefined;
    this.root.updateMatrixWorld(true);
    const subj = c.subject();
    const world = (p: THREE.Vector3) => this.root.localToWorld(p.clone());
    const box = new THREE.Box3().setFromObject(subj === this.arm.root ? this.tipObject() : subj);
    const pts: THREE.Vector3[] = [];
    if (box.isEmpty()) pts.push(world(this.arm.tip));
    else {
      const cc = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3()).multiplyScalar(0.35);
      pts.push(cc);
      for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) pts.push(cc.clone().add(new THREE.Vector3(d[0] * s.x, d[1] * s.y, d[2] * s.z)));
    }
    const ray = new THREE.Raycaster();
    const own = new Set<THREE.Object3D>();
    subj.traverse((o) => own.add(o));
    // The arm, Dextre and what they hold are the act itself, not what hides it.
    for (const o of [this.arm.root, this.dextre.root, this.held?.obj]) o?.traverse((x) => own.add(x));
    for (const s of this.labels) own.add(s);
    const solids: THREE.Object3D[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !own.has(m) && visible(m) && !(m.material as THREE.Material).transparent) solids.push(m);
    });
    let seenN = 0;
    let hiddenBy: string | undefined;
    const px = (p: THREE.Vector3) => {
      const q = p.clone().project(camera);
      return [((q.x + 1) / 2) * size.w, ((1 - q.y) / 2) * size.h, q.z] as const;
    };
    pts.forEach((p, i) => {
      const [x, y, z] = px(p);
      if (z > 1 || x < 0 || x > size.w || y < 0 || y > sheetTop) return;
      const d = camera.position.distanceTo(p);
      ray.set(camera.position, p.clone().sub(camera.position).normalize());
      ray.far = d - 0.1;
      const hit = ray.intersectObjects(solids, false)[0];
      if (hit) {
        if (i === 0) hiddenBy = nameOf(hit.object);
        return;
      }
      seenN++;
    });
    const through = this.samples()
      .map((s) => {
        const where = insideStation(V(s.p), POLANA_LAYOUT, 0.15);
        return where ? `${s.what} · ${where}` : "";
      })
      .filter((s) => s);
    const [sx, sy] = px(pts[0]!);
    const moved = Math.max(c.start ? c.start.distanceTo(this.tip) : 0, c.subjectStart ? c.subjectStart.distanceTo(this.centreOf(subj)) : 0);
    return {
      procedure: this.proc,
      move: c.move,
      playing: !!this.current,
      t: Math.round((c.t / c.dur) * 100) / 100,
      viewpoint: this.viewpoint,
      subject: c.subjectName,
      subjectPx: [Math.round(sx), Math.round(sy)],
      seen: Math.round((seenN / pts.length) * 100) / 100,
      ...(hiddenBy ? { hiddenBy } : {}),
      through: [...new Set(through)],
      moved: Math.round(moved * 100) / 100,
      ...(c.shows ? { shows: c.shows } : {}),
    };
  }

  private tipObject(): THREE.Object3D {
    return this.arm.root.children.find((o) => o.children.some((c) => c.name === "LEE")) ?? this.arm.root;
  }
}

function visible(o: THREE.Object3D | null): boolean {
  for (let x = o; x; x = x.parent) if (!x.visible) return false;
  return true;
}
function nameOf(o: THREE.Object3D): string {
  for (let x: THREE.Object3D | null = o; x; x = x.parent) if (x.name) return x.name;
  return (o as THREE.Mesh).geometry?.type ?? "algo";
}

/** Position along a polyline of waypoints, t from 0 to 1 (by length). */
function along(points: readonly THREE.Vector3[], t: number): THREE.Vector3 {
  const lens = points.slice(1).map((p, i) => p.distanceTo(points[i]!));
  const total = lens.reduce((a, b) => a + b, 0);
  if (total < 1e-9) return points[points.length - 1]!.clone();
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]! || i === lens.length - 1) return points[i]!.clone().lerp(points[i + 1]!, lens[i]! > 0 ? Math.min(1, d / lens[i]!) : 1);
    d -= lens[i]!;
  }
  return points[points.length - 1]!.clone();
}
