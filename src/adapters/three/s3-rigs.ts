import * as THREE from "three";
import type { RigCue } from "@modules/aerial-sanctuary/domain/station-beat";
import type { Stage } from "@modules/aerial-sanctuary/data/stages";
import type { ArmMove } from "@modules/robotics/data/procedures";
import type { SceneParts } from "./aerial-models";
import { BEAT_S } from "./s3-stage";
import { ArmShow } from "./arm-show";
import { ISS_OUTSIDE } from "@modules/station/data/iss";
import { ZERO_G } from "@modules/aerial-sanctuary/data/facts";

/**
 * The machines of sanctuary 3's phase-5 posts that move while a challenge is acted (docs/design/santuario3-puestos.md):
 * the centrifuge's arm with its gondola (18 m, like the TsF-18; the g it pulls sets its turn rate and how far the
 * gondola swings out), the Il-76MDK off the glacier's runway (takeoff, the pull-up, the arc, the pull-out and
 * the landing), the Dragon simulator's screen and the robotics workstation's three screens (the Canadarm2 capture of a
 * Cygnus, the same arm show as on the ISS). Her spots on a moving machine
 * are `mounts`: S3Stage carries her (and the trainer, `entrenador:<spot>`) there each frame.
 */

const G0 = 9.81;
/** The centrifuge's arm to the gondola, m (TsF-18). */
const ARM_M = 18;
/** How fast the shown g follows the profile, g/s: the real 0,1 g/s ramp would outlast a beat (the time is compressed). */
const SHOWN_RAMP_GS = 1.5;
/** Where the parabolas are shown, m over the ice (the real ones start at about 6 km: the view needs only the sky). */
/** Where the parabolas start: 6000 m (ZERO_G.floorM; the climb there is cut, like a film's). */
const CRUISE_M = ZERO_G.floorM.value;
type PlanePhase = Extract<RigCue, { kind: "avion" }>["phase"];

const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const box = (w: number, h: number, d: number, c: number) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
const mount = (parent: THREE.Object3D, x: number, y: number, z: number, face: number) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.rotation.y = face;
  parent.add(o);
  return o;
};

/** What the Dragon simulator's screen draws (the scene supplies it: the docking camera is the ui's). */
export type ScreenPainter = (g: CanvasRenderingContext2D, w: number, h: number, show: Extract<RigCue, { kind: "pantalla" }>["show"], t: number) => void;

export class S3Rigs {
  readonly root = new THREE.Group();
  readonly mounts = new Map<string, THREE.Object3D>();
  private post: number | undefined;
  // The centrifuge.
  private readonly arm: THREE.Group | undefined;
  /** At the arm's end, true size again (the arm is drawn k times longer); the gondola swings inside it. */
  private readonly hanger = new THREE.Group();
  private readonly swing = new THREE.Group();
  private readonly armEye = new THREE.Object3D();
  private g = 1;
  private gTarget = 1;
  private angle = 0;
  private seated = false;
  // The Il-76MDK.
  private readonly plane: SceneParts["il76"];
  private readonly rest = { pos: new THREE.Vector3(), yaw: 0 };
  private phase: PlanePhase | undefined;
  private phaseT = 0;
  private speed = 0;
  private pitch = 0;
  private planeG = 1;
  private readonly floaters: THREE.Object3D[] = [];
  // The Dragon simulator's screen.
  private readonly screen: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; mesh: THREE.Mesh } | undefined;
  private show: Extract<RigCue, { kind: "pantalla" }>["show"] | undefined;
  private showT = 0;
  painter: ScreenPainter | undefined;
  /** Where the simulator's screen is (the camera looks over her shoulder at it). */
  private simShot: THREE.Vector3 | undefined;
  private armShot: THREE.Vector3 | undefined;
  // The robotics trainer.
  private readonly armShow: ArmShow;
  private readonly armScene = new THREE.Scene();
  private readonly armCam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 400);
  private readonly target = new THREE.WebGLRenderTarget(640, 360);
  private readonly armScreens: THREE.Mesh[] = [];

  constructor(parts: SceneParts, stages: ReadonlyMap<number, Stage>, k: number) {
    // The gondola hangs from the arm's end on a pivot, true size (the arm is drawn k times longer on the plan).
    this.arm = parts.centrifugeArm;
    if (this.arm) {
      this.hanger.position.set(ARM_M, 0, 0);
      this.hanger.scale.set(1 / k, 1, 1 / k);
      this.hanger.add(this.swing);
      const shell = new THREE.Group();
      const blue = 0x2f6f9f;
      shell.add(box(2.4, 0.12, 2.4, blue).translateY(-2.74), box(0.12, 2.4, 2.4, blue).translateX(1.14).translateY(-1.6), box(2.4, 0.12, 2.4, blue).translateY(-0.46));
      for (const z of [-1.14, 1.14]) shell.add(box(2.4, 2.4, 0.12, blue).translateY(-1.6).translateZ(z));
      // The couch, reclined, its back to the outside: she faces the hub.
      const couch = box(0.6, 0.45, 0.7, 0x30343a);
      couch.position.set(0.4, -2.45, 0);
      const back = box(0.12, 0.9, 0.7, 0x30343a);
      back.position.set(0.85, -2.0, 0);
      back.rotation.z = -0.6;
      shell.add(couch, back);
      // The arm's link down to the gondola's roof.
      shell.add(box(0.3, 0.5, 0.3, 0x9aa6ae).translateY(-0.2));
      this.swing.add(shell);
      this.arm.add(this.hanger);
      this.mounts.set("gondola", mount(this.swing, 0.35, -2.68, 0, -Math.PI / 2));
      // The gondola's camera, at its open side looking in at her face (as the TsF-18's cameras watch the subject):
      // it swings out with it, so the hall behind tilts and turns.
      this.armEye.position.set(-2.4, -1.5, 0.8);
      this.swing.add(this.armEye);
    }
    // The plane and its cabin's places (the seats aft, the padded floor, the middle where they float).
    this.plane = parts.il76;
    if (this.plane) {
      this.rest.pos.copy(this.plane.group.position);
      this.rest.yaw = this.plane.group.rotation.y;
      this.plane.group.rotation.order = "YZX";
      const c = this.plane.cabin;
      const E = Math.PI / 2;
      this.mounts.set("avion-asiento", mount(c, -9.4, 0, 0.5, E));
      this.mounts.set("entrenador:avion-asiento", mount(c, -9.4, 0, -0.5, E));
      this.mounts.set("avion-suelo", mount(c, -2, 0, 0.9, E));
      this.mounts.set("entrenador:avion-suelo", mount(c, -2, 0, -0.9, E));
      const f1 = mount(c, 0, 0.35, 0.7, E);
      const f2 = mount(c, 0.8, 0.45, -0.9, E - 0.6);
      this.mounts.set("avion-flotando", f1);
      this.mounts.set("entrenador:avion-flotando", f2);
      this.floaters.push(f1, f2);
    }
    // The simulator's screen in the Dragon mock-up, before her seat.
    const sim = stages.get(8)?.anchors.pantalla;
    if (sim) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 224;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.61), new THREE.MeshBasicMaterial({ map: tex }));
      mesh.position.set(sim.x, sim.y, sim.z);
      mesh.rotation.y = -Math.PI / 2;
      mesh.name = "pantalla-simulador-dragon";
      this.root.add(mesh);
      this.screen = { canvas, tex, mesh };
      this.simShot = new THREE.Vector3(sim.x, sim.y, sim.z);
    }
    // The robotics trainer: the arm show in its own scene, on the big screen and the desk's monitor.
    const empty = new THREE.Object3D();
    this.armShow = new ArmShow(ISS_OUTSIDE.canadarm2.lengthM, { lander: empty, landerAt: () => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() }), landerOnUnity: () => false, bishop: empty, bishopModule: () => undefined });
    this.armScene.background = new THREE.Color(0x02040a);
    this.armScene.add(this.armShow.root, new THREE.HemisphereLight(0xffffff, 0x223344, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(30, 40, 20);
    this.armScene.add(sun);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshStandardMaterial({ color: 0x2a5fa0, roughness: 1 }));
    earth.position.set(0, -175, 0);
    this.armScene.add(earth);
    const st9 = stages.get(9);
    // The ISS's robotics workstation (CSA): three screens side by side over the desk, each with the arm's cameras
    // (here the three show the same camera: three views would cost a phone three renders a frame).
    const mid = st9?.anchors.pantalla;
    const screenMat = new THREE.MeshBasicMaterial({ map: this.target.texture });
    if (mid) {
      this.armShot = new THREE.Vector3(mid.x, mid.y, mid.z);
      for (const dx of [-0.62, 0, 0.62]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.36), screenMat);
        m.position.set(mid.x + dx, mid.y, mid.z);
        m.rotation.y = Math.PI - dx * 0.5;
        m.name = "pantalla-robotica";
        this.armScreens.push(m);
      }
    }
    for (const m of this.armScreens) {
      m.visible = false;
      this.root.add(m);
    }
    if (this.screen) this.paint();
  }

  /** A post's challenge opens: its machine at rest. */
  begin(post: number): void {
    this.post = post;
    this.reset();
    if (post === 9) {
      this.armShow.begin("captura");
      for (const m of this.armScreens) m.visible = true;
    }
  }

  /** The challenge is over: everything back at rest. */
  end(ok = true): void {
    if (this.post === 9) this.armShow.end(ok);
    this.post = undefined;
    this.reset();
  }

  private reset(): void {
    this.g = this.gTarget = 1;
    this.angle = 0;
    this.seated = false;
    if (this.arm) this.arm.rotation.y = 0;
    this.swing.rotation.z = 0;
    this.phase = undefined;
    this.speed = 0;
    this.pitch = 0;
    this.planeG = 1;
    if (this.plane) {
      this.plane.group.position.copy(this.rest.pos);
      this.plane.group.rotation.set(0, this.rest.yaw, 0);
    }
    this.show = undefined;
    if (this.screen) this.paint();
    if (this.post !== 9) for (const m of this.armScreens) m.visible = false;
  }

  /** A beat begins: what the machine does in it. */
  cue(c: RigCue | undefined): void {
    if (!c) return;
    if (c.kind === "centrifuga") {
      this.gTarget = c.g;
      this.seated = true;
    } else if (c.kind === "avion") {
      if (c.phase !== this.phase) {
        this.phase = c.phase;
        this.phaseT = 0;
        if (c.phase === "aterrizaje") this.approach();
        // The parabolas are flown at altitude: from the climb-out the scene cuts to it (as the films of the flights do).
        if ((c.phase === "subida" || c.phase === "tiron") && this.plane && this.plane.group.position.y < this.rest.pos.y + CRUISE_M) this.plane.group.position.y = this.rest.pos.y + CRUISE_M;
      } else this.phaseT = 0;
      this.planeG = c.g;
    } else if (c.kind === "pantalla") {
      this.show = c.show;
      this.showT = 0;
    }
  }

  /** Robotics: the arm moves of the blocks just placed. */
  armPlay(moves: readonly ArmMove[]): void {
    this.armShow.play(moves);
  }

  /** What the machine reads now (the caption adds it): the g in the gondola and in the plane. */
  get readout(): string {
    const f = (g: number) => `${g.toFixed(1).replace(".", ",")} g`;
    if (this.post === 5 && this.seated) return f(this.g);
    if (this.post === 6 && this.phase && this.phase !== "parado") return f(this.phase === "ingravidez" ? 0 : this.planeG);
    return "";
  }

  update(dt: number, renderer: THREE.WebGLRenderer): void {
    if (this.post === 5 && this.arm) {
      const step = SHOWN_RAMP_GS * dt;
      this.g += Math.max(-step, Math.min(step, this.gTarget - this.g));
      // The g she feels is the arm's pull and the Earth's together: the arm's part is √(g² − 1).
      const radial = Math.sqrt(Math.max(0, this.g * this.g - 1));
      const omega = Math.sqrt((radial * G0) / ARM_M);
      this.angle += omega * dt;
      this.arm.rotation.y = this.angle;
      // The gondola swings out on its pivot until the pull is through her back.
      this.swing.rotation.z = Math.atan(radial);
    }
    if (this.post === 6 && this.plane && this.phase) this.fly(dt);
    if (this.post === 8 && this.screen && this.show) {
      this.showT += dt;
      this.paint();
    }
    if (this.post === 9) {
      this.armShow.update(dt);
      const e = this.armShow.eye(55, 1, 16 / 9);
      this.armCam.position.copy(e.eye);
      this.armCam.lookAt(e.at);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(this.target);
      renderer.render(this.armScene, this.armCam);
      renderer.setRenderTarget(prev);
    }
  }

  private paint(): void {
    const s = this.screen!;
    const g = s.canvas.getContext("2d")!;
    const w = s.canvas.width;
    const h = s.canvas.height;
    g.fillStyle = "#04080c";
    g.fillRect(0, 0, w, h);
    if (this.show && this.painter) this.painter(g, w, h, this.show, this.showT);
    else {
      g.fillStyle = "#9fd8ff";
      g.font = "bold 28px sans-serif";
      g.fillText("Crew Dragon · simulador", 24, 60);
    }
    s.tex.needsUpdate = true;
  }

  /** The landing: in on a short final over the runway's end, down to the apron (a cut, like the film's). */
  private approach(): void {
    const fwd = new THREE.Vector3(Math.cos(this.rest.yaw), 0, -Math.sin(this.rest.yaw));
    this.plane!.group.position.copy(this.rest.pos).addScaledVector(fwd, -66).add(new THREE.Vector3(0, 6, 0));
    this.speed = 60;
    this.pitch = -0.05;
  }

  private fly(dt: number): void {
    const p = this.plane!.group;
    this.phaseT += dt;
    const t = this.phaseT;
    const fwd = new THREE.Vector3(Math.cos(this.rest.yaw), 0, -Math.sin(this.rest.yaw));
    const toward = (v: number, to: number, rate: number) => v + Math.max(-rate * dt, Math.min(rate * dt, to - v));
    switch (this.phase) {
      case "parado":
        return;
      case "despegue":
        this.speed = Math.min(80, this.speed + 32 * dt);
        if (this.speed > 55) this.pitch = toward(this.pitch, 0.22, 0.4);
        break;
      case "subida":
        this.speed = toward(this.speed, 140, 30);
        this.pitch = toward(this.pitch, 0.08, 0.3);
        break;
      case "tiron":
        this.speed = toward(this.speed, 140, 30);
        this.pitch = toward(this.pitch, 0.87, 0.7);
        break;
      case "ingravidez":
        // Over the top of the parabola, from the nose up to as much down; a repeated beat goes round again.
        this.speed = toward(this.speed, 140, 30);
        this.pitch = 0.87 * Math.cos((Math.PI * t) / BEAT_S);
        break;
      case "salida":
        this.pitch = toward(this.pitch, 0, 0.6);
        break;
      case "aterrizaje": {
        this.speed = Math.max(0, this.speed - 27 * dt);
        this.pitch = toward(this.pitch, 0, 0.2);
        const y = Math.max(this.rest.pos.y, p.position.y - 5 * dt);
        p.position.addScaledVector(fwd, this.speed * dt);
        p.position.y = y;
        p.rotation.set(0, this.rest.yaw, this.pitch);
        return;
      }
    }
    p.position.addScaledVector(fwd, this.speed * Math.cos(this.pitch) * dt);
    p.position.y = Math.max(this.rest.pos.y + (this.phase === "despegue" ? 0 : CRUISE_M - 200), p.position.y + this.speed * Math.sin(this.pitch) * dt);
    p.rotation.set(0, this.rest.yaw, this.pitch);
    // Weightless, she and the coach drift in the middle of the padded zone.
    const bob = this.phase === "ingravidez" ? Math.sin(t * 1.7) * 0.25 : 0;
    this.floaters[0]!.position.y = 0.35 + bob;
    this.floaters[1]!.position.y = 0.45 - bob * 0.7;
  }

  /**
   * The camera on a moving machine: on the centrifuge's arm looking at her in the gondola; in the Il-76MDK's cabin while
   * she floats or lies on its floor, or chasing the plane while it takes off, pulls up and lands. `turn` (rad) is the
   * camera stick's turn round what it looks at. False: the scene's own camera.
   */
  eye(pos: THREE.Vector3, at: THREE.Vector3, turn: number, up?: THREE.Vector3, her?: THREE.Vector3): boolean {
    up?.set(0, 1, 0);
    if (this.post === 5 && this.seated && this.arm) {
      // On the gondola, upright with it.
      this.armEye.getWorldPosition(pos);
      this.mounts.get("gondola")!.getWorldPosition(at);
      if (up) up.set(0, 1, 0).applyQuaternion(this.swing.getWorldQuaternion(new THREE.Quaternion()));
      at.addScaledVector(up ?? new THREE.Vector3(0, 1, 0), 0.7);
      return true;
    } else if ((this.post === 8 || this.post === 9) && her) {
      // Over her shoulder to the screens she works at: the simulator's, or the robotics workstation's three. At the
      // simulator (2026-11-28) from her side, so her head never covers the screen the steps play on.
      const P = this.post === 8 ? this.simShot : this.armShot;
      if (!P) return false;
      if (this.post === 8) {
        // From her side, between her and the screen: she and the screen (where each step plays) side by side.
        const fwd = new THREE.Vector3(P.x - her.x, 0, P.z - her.z).normalize();
        at.set(her.x, her.y + 1.1, her.z).lerp(P, 0.5);
        pos.copy(at).add(new THREE.Vector3(-fwd.z, 0.35, fwd.x).multiplyScalar(2.4)).addScaledVector(fwd, -0.4);
        return true;
      }
      const [backM, upM, sideM, toward] = [0.9, 1.5, 0.35, 0.7];
      const back = new THREE.Vector3(her.x - P.x, 0, her.z - P.z).normalize();
      pos.set(her.x, her.y + upM, her.z).addScaledVector(back, backM).add(new THREE.Vector3(-back.z, 0, back.x).multiplyScalar(sideM));
      at.set(her.x, her.y + 1.1, her.z).lerp(P, toward);
      return true;
    } else if (this.post === 6 && this.plane && this.phase) {
      const inside = this.phase === "parado" || this.phase === "ingravidez" || this.phase === "salida";
      if (inside && her) {
        // Inside, upright with the cabin: only how they float or are pressed down says where the plane points.
        const c = this.plane.cabin;
        if (up) up.set(0, 1, 0).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()));
        const local = c.worldToLocal(her.clone());
        // From the padded zone towards the seats, from above to her on the floor, or across to them floating.
        if (local.x < -7) pos.set(-5, 1.6, 1.4);
        else if (local.y < 0.2) pos.set(2.5, 2.6, 1.3);
        else pos.set(7.5, 1.6, 1.4);
        c.localToWorld(pos);
        at.copy(her).addScaledVector(up ?? new THREE.Vector3(0, 1, 0), local.y < 0.2 && local.x > -7 ? 0.1 : 0.5);
        return true;
      }
      const p = this.plane.group.position;
      at.set(p.x, p.y + 4, p.z);
      pos.set(p.x - 30, p.y + 12, p.z - 58);
    } else return false;
    if (turn) {
      const dx = pos.x - at.x;
      const dz = pos.z - at.z;
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      pos.x = at.x + dx * c + dz * s;
      pos.z = at.z - dx * s + dz * c;
    }
    return true;
  }
}
