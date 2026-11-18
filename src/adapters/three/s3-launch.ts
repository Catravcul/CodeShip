import * as THREE from "three";
import type { RigCue } from "@modules/aerial-sanctuary/domain/station-beat";
import type { Stage } from "@modules/aerial-sanctuary/data/stages";
import { WHITE_ROOM_M } from "@modules/aerial-sanctuary/data/stages";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import { ELECTRON } from "@modules/aerial-sanctuary/data/facts";
import { safetyDistanceM } from "@modules/aerial-sanctuary/domain/safety";
import type { SceneParts } from "./aerial-models";

/**
 * The launches of phase 6 (docs/design/santuario3-lanzamiento.md): post 10's Electron rising off the launch tree's
 * crown, seen on mission control's front screen through a camera at the safety distance (300 m), and her own Falcon 9
 * on the crew pad: the crew access arm with its white room (it swings away before fuelling), the liftoff, the stages
 * parting and Dragon alone in orbit; then, for the rendezvous, Dragon's display in front of her seat with the docking
 * camera at each waypoint. Her seat in the Dragon is a mount («dragon-real»): S3Stage carries her with the rocket.
 * The accelerations shown are ours (only the look: the real timeline is in the captions).
 */
type FalconCue = Extract<RigCue, { kind: "falcon" }>;
type ElectronPhase = Extract<RigCue, { kind: "electron" }>["phase"];
/** What paints Dragon's display (the scene supplies it: ui/dragon-display.ts). */
export type DisplayPainter = (g: CanvasRenderingContext2D, w: number, h: number, cue: Extract<FalconCue, { phase: "cita" }>) => void;

/** Shown climb rates, m/s² (ours: a believable climb in the seconds of a beat). */
const ELECTRON_A = 3;
const FALCON_A = 4;
/** How far the arm swings away, rad (ours). */
const ARM_OUT = Math.PI / 2;

const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const box = (w: number, h: number, d: number, c: number) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
const flame = (r: number, h: number) => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85, depthWrite: false }));
  m.rotation.x = Math.PI;
  m.position.y = -h / 2;
  m.visible = false;
  return m;
};

export class S3Launch {
  readonly root = new THREE.Group();
  readonly mounts = new Map<string, THREE.Object3D>();
  painter: DisplayPainter | undefined;
  private active: "electron" | "falcon" | undefined;
  // The Electron and the camera that films it for mission control.
  private readonly electron: THREE.Group | undefined;
  private readonly eRest = new THREE.Vector3();
  private ePhase: ElectronPhase = "parado";
  private eT = 0;
  private readonly eFlame = flame(0.5, 6);
  private readonly eCam = new THREE.PerspectiveCamera(30, 2, 1, 6000);
  /** What mission control's camera sees: its own small scene (a copy of the rocket, the crown, the sea and the sky), not the whole world twice a frame. */
  private readonly eScene = new THREE.Scene();
  private eCopy: THREE.Object3D | undefined;
  private readonly target = new THREE.WebGLRenderTarget(512, 256);
  private readonly screen: THREE.Mesh | undefined;
  private readonly screenAt: THREE.Vector3 | undefined;
  // The Falcon 9, its stages, the arm and Dragon's display.
  private readonly falcon: THREE.Group | undefined;
  private readonly parts: { first?: THREE.Object3D; second?: THREE.Object3D; dragon?: THREE.Object3D } = {};
  private readonly fRest = new THREE.Vector3();
  private readonly fFlame = flame(1.8, 14);
  private fPhase: FalconCue["phase"] = "brazo";
  private flightT = 0;
  private sepT = -1;
  private orbitT = -1;
  private readonly pivot = new THREE.Group();
  private armAngle = 0;
  private armOut = false;
  private readonly display: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; mesh: THREE.Mesh } | undefined;
  private cita: Extract<FalconCue, { phase: "cita" }> | undefined;

  constructor(parts: SceneParts, L: S3Layout, control: Stage | undefined, pad: Stage | undefined) {
    const k = L.k;
    // ── The Electron on its crown, and its picture on mission control's front screen ──
    this.electron = parts.electron;
    if (this.electron) {
      this.eRest.copy(this.electron.position);
      this.electron.add(this.eFlame);
      const away = safetyDistanceM(ELECTRON.propellantKg.value);
      this.eCam.position.set(this.eRest.x + away * 0.8, this.eRest.y + 6, this.eRest.z + away * 0.6);
      this.eScene.background = new THREE.Color(0x9fd0f0);
      this.eScene.add(new THREE.HemisphereLight(0xdff2ff, 0x5d6b4f, 1.3));
      const sun = new THREE.DirectionalLight(0xffffff, 1.7);
      sun.position.set(-400, 900, 300);
      this.eScene.add(sun);
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), mat(0x1f5f80, { roughness: 0.35 }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.y = -0.6;
      const crown = box(24, 2, 24, 0x8a8f96);
      crown.position.set(this.eRest.x, this.eRest.y - 1, this.eRest.z);
      const trunk = box(14, this.eRest.y, 14, 0x6fa8c8);
      trunk.position.set(this.eRest.x, this.eRest.y / 2 - 2, this.eRest.z);
      this.eCopy = this.electron.clone(true);
      this.eScene.add(sea, crown, trunk, this.eCopy);
    }
    const P = control?.anchors.pantalla;
    if (P) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2 * k, 2.1 * k), new THREE.MeshBasicMaterial({ map: this.target.texture }));
      m.position.set(P.x, P.y, P.z);
      m.rotation.y = Math.PI;
      m.name = "pantalla-control-electron";
      m.visible = false;
      this.root.add(m);
      this.screen = m;
      this.screenAt = new THREE.Vector3(P.x, P.y, P.z);
    }
    // ── The Falcon 9 ──
    this.falcon = parts.falcon;
    const f9 = L.props.find((p) => p.kind === "falcon9");
    const tower = L.props.find((p) => p.kind === "crew-tower");
    if (this.falcon && f9 && tower && pad) {
      this.fRest.copy(this.falcon.position);
      this.parts.first = this.falcon.getObjectByName("f9-etapa1");
      this.parts.second = this.falcon.getObjectByName("f9-etapa2");
      this.parts.dragon = this.falcon.getObjectByName("f9-dragon");
      this.parts.first?.add(this.fFlame);
      const seat = pad.her["dragon-real"]!;
      const dragon = this.parts.dragon!;
      // Her seat in the capsule (in the falcon's frame), facing away from the tower, reclined by the stage's pose.
      const s = new THREE.Object3D();
      s.position.set(seat.x - f9.x, seat.y - f9.y, seat.z - f9.z);
      s.rotation.y = seat.face;
      dragon.add(s);
      this.mounts.set("dragon-real", s);
      // Dragon's display before her seat (its three touchscreens: one is drawn), for the rendezvous.
      const canvas = document.createElement("canvas");
      canvas.width = 448;
      canvas.height = 256;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const dm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.69), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      dm.position.set(0, 1.25, 0.9);
      dm.rotation.x = -0.35;
      dm.visible = false;
      s.add(dm);
      this.display = { canvas, tex, mesh: dm };
      // The crew access arm and the white room, from the tower's face to Dragon's hatch; it swings on the tower.
      const dir = Math.sign(tower.z - f9.z) || 1;
      const face = tower.z - dir * 3.3 * k;
      const side = f9.z + dir * 2;
      const len = Math.abs(face - (side + dir * WHITE_ROOM_M));
      const armY = pad.her["brazo-acceso"]!.y;
      this.pivot.position.set(f9.x, armY, face);
      const arm = new THREE.Group();
      arm.add(box(1.8, 0.15, len, 0x3d4247).translateY(-0.08), box(0.08, 1.1, len, 0x8a8f96).translateX(-0.9).translateY(0.55), box(0.08, 1.1, len, 0x8a8f96).translateX(0.9).translateY(0.55), box(1.8, 0.12, len, 0x5c6066).translateY(2.4));
      arm.position.z = -dir * (len / 2);
      const white = new THREE.Group();
      white.add(box(2.4, 0.15, WHITE_ROOM_M, 0xf2f2f2).translateY(-0.08), box(0.1, 2.5, WHITE_ROOM_M, 0xf7f7f7).translateX(-1.2).translateY(1.25), box(0.1, 2.5, WHITE_ROOM_M, 0xf7f7f7).translateX(1.2).translateY(1.25), box(2.4, 0.1, WHITE_ROOM_M, 0xf7f7f7).translateY(2.5));
      white.position.z = -dir * (len + WHITE_ROOM_M / 2);
      this.pivot.add(arm, white);
      this.pivot.name = "brazo-acceso-tripulacion";
      this.root.add(this.pivot);
    }
  }

  /** A challenge opens: post 10's Electron, or a step of her launch day (each starts where the day is at that step). */
  begin(what: "electron" | "torre" | "cuenta-atras" | "ascenso" | "acople"): void {
    this.reset();
    if (what === "electron") {
      this.active = "electron";
      if (this.screen) this.screen.visible = true;
      return;
    }
    this.active = "falcon";
    if (what === "ascenso") this.cue({ kind: "falcon", phase: "despegue" });
    if (what === "acople") {
      // In orbit: Dragon alone (the rocket's stages are gone).
      this.armOut = true;
      this.armAngle = ARM_OUT;
      this.flightT = 40;
      this.sepT = this.orbitT = 0;
      this.fPhase = "orbita";
      if (this.parts.first) this.parts.first.visible = false;
      if (this.parts.second) this.parts.second.visible = false;
    }
  }

  /** The challenge is over: everything back at rest (a scrub, or the day is done). */
  end(): void {
    this.active = undefined;
    this.reset();
  }

  private reset(): void {
    if (this.electron) this.electron.position.copy(this.eRest);
    this.eFlame.visible = false;
    this.ePhase = "parado";
    this.eT = 0;
    if (this.screen) this.screen.visible = false;
    if (this.falcon) this.falcon.position.copy(this.fRest);
    for (const p of [this.parts.first, this.parts.second, this.parts.dragon]) {
      if (!p) continue;
      p.position.set(0, 0, 0);
      p.rotation.set(0, 0, 0);
      p.visible = true;
    }
    this.fFlame.visible = false;
    this.fPhase = "brazo";
    this.flightT = 0;
    this.sepT = this.orbitT = -1;
    this.armAngle = 0;
    this.armOut = false;
    this.pivot.rotation.y = 0;
    this.cita = undefined;
    if (this.display) this.display.mesh.visible = false;
  }

  cue(c: RigCue | undefined): void {
    if (!c) return;
    if (c.kind === "electron") {
      if (c.phase === "despegue" && this.ePhase !== "despegue" && this.ePhase !== "vuelo") this.eT = 0;
      this.ePhase = c.phase;
      return;
    }
    if (c.kind !== "falcon") return;
    if (c.phase === "brazo-fuera") this.armOut = true;
    if ((c.phase === "despegue" || c.phase === "maxq") && this.fPhase !== "despegue" && this.fPhase !== "maxq") this.armOut = true;
    if (c.phase === "separacion" && this.sepT < 0) this.sepT = 0;
    if (c.phase === "orbita" && this.orbitT < 0) {
      if (this.sepT < 0) this.sepT = 0;
      this.orbitT = 0;
    }
    if (c.phase === "cita") {
      this.cita = c;
      this.paintDisplay();
    }
    this.fPhase = c.phase;
  }

  update(dt: number, renderer: THREE.WebGLRenderer): void {
    if (this.active === "electron" && this.electron) {
      if (this.ePhase === "despegue" || this.ePhase === "vuelo") {
        this.eT += dt;
        this.electron.position.y = this.eRest.y + 0.5 * ELECTRON_A * this.eT * this.eT;
        this.eFlame.visible = true;
      }
      const p = this.electron.position;
      if (this.eCopy) {
        this.eCopy.position.copy(p);
        const fl = this.eCopy.children[this.electron.children.indexOf(this.eFlame)];
        if (fl) fl.visible = this.eFlame.visible;
      }
      this.eCam.lookAt(p.x, p.y + ELECTRON.heightM.value / 2, p.z);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(this.target);
      renderer.render(this.eScene, this.eCam);
      renderer.setRenderTarget(prev);
    }
    if (this.active !== "falcon" || !this.falcon) return;
    // The arm swings away on its hinge at the tower.
    const to = this.armOut ? ARM_OUT : 0;
    this.armAngle += Math.max(-dt * 0.5, Math.min(dt * 0.5, to - this.armAngle));
    this.pivot.rotation.y = this.armAngle;
    const flying = this.fPhase === "despegue" || this.fPhase === "maxq" || this.fPhase === "separacion" || this.fPhase === "orbita";
    if (flying) {
      this.flightT += dt;
      this.falcon.position.y = this.fRest.y + 0.5 * FALCON_A * this.flightT * this.flightT;
      this.fFlame.visible = this.sepT < 0;
    }
    // The first stage falls back after separation; then the second leaves Dragon alone.
    if (this.sepT >= 0 && this.parts.first) {
      this.sepT += dt;
      this.parts.first.position.y = -0.5 * (FALCON_A + 6) * this.sepT * this.sepT;
      this.parts.first.rotation.z = Math.min(0.6, this.sepT * 0.15);
      if (this.sepT > 12) this.parts.first.visible = false;
    }
    if (this.orbitT >= 0 && this.parts.second) {
      this.orbitT += dt;
      this.parts.second.position.y = -0.5 * 3 * this.orbitT * this.orbitT;
      if (this.orbitT > 12) this.parts.second.visible = false;
    }
    if (this.display) this.display.mesh.visible = this.fPhase === "cita";
  }

  private paintDisplay(): void {
    const d = this.display;
    if (!d || !this.cita || !this.painter) return;
    const g = d.canvas.getContext("2d")!;
    this.painter(g, d.canvas.width, d.canvas.height, this.cita);
    d.tex.needsUpdate = true;
  }

  /**
   * The camera for these challenges: at mission control from behind her chair to the front screen; on the pad round her
   * on the arm; chasing the rocket in flight; in the capsule over her shoulder to Dragon's display. False: none of these.
   */
  eye(pos: THREE.Vector3, at: THREE.Vector3, turn: number, her: THREE.Vector3): boolean {
    if (this.active === "electron" && this.screenAt) {
      const back = new THREE.Vector3(her.x - this.screenAt.x, 0, her.z - this.screenAt.z).normalize();
      pos.set(her.x, her.y + 2.1, her.z).addScaledVector(back, 2.6).add(new THREE.Vector3(-back.z, 0, back.x).multiplyScalar(0.8));
      at.set(her.x, her.y + 1.2, her.z).lerp(this.screenAt, 0.6);
    } else if (this.active === "falcon" && this.falcon) {
      if (this.fPhase === "cita" && this.display) {
        const s = this.mounts.get("dragon-real")!;
        s.localToWorld(pos.set(0.55, 1.75, -0.9));
        this.display.mesh.getWorldPosition(at);
        return true;
      }
      const flying = this.flightT > 0;
      if (!flying) {
        at.set(her.x, her.y + 1, her.z);
        pos.set(her.x + 7, her.y + 2.5, her.z + 3);
      } else {
        const p = this.falcon.position;
        const d = 70 + Math.min(400, (p.y - this.fRest.y) * 0.15);
        at.set(p.x, p.y + 40, p.z);
        pos.set(p.x + d, p.y + 25, p.z - d * 0.6);
      }
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

  get busy(): boolean {
    return !!this.active;
  }
}
