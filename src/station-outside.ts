import * as THREE from "three";
import type { Quat } from "@core/math/quat";
import type { Vec3 } from "@core/math/vec3";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { AirlockItem } from "@modules/station/domain/cargo-airlock";
import { BISHOP_BERTH, LANDER_CBM, POLANA_LAYOUT } from "@modules/station/data/structure";
import type { AssemblySite } from "@modules/station/domain/vehicle-catalogue";
import { lunarModuleDesign } from "@modules/ship/data/apollo-lm";
import { PROBE_HULL } from "@modules/ship/data/probe";
import { ProbeModel } from "./adapters/three/probe-model";
import { BISHOP, ISS_OUTSIDE } from "@modules/station/data/iss";
import { ArmShow, type ArmAudit } from "./adapters/three/arm-show";
import type { ArmMove, ArmProcedureId } from "@modules/robotics/data/procedures";
import { DockView } from "./adapters/three/dock-view";
import { ShipModel } from "./adapters/three/ship-model";

/** A pose in the station's frame. */
export interface StationPose {
  readonly position: Vec3;
  readonly orientation: Quat;
}

export interface StationOutsideDeps {
  /** The lander's pose on its IDA or berthed on Unity's nadir CBM (station frame). */
  landerPose(at: "ida" | "cbm"): StationPose;
  /** The lander's current design (the proxy the arm carries looks the same). */
  design(): ShipDesign;
  /** Canadarm2 holds it on the CBM now. */
  berthed(): boolean;
  /** Catalogue vehicles built and still at their assembly site (vehicle-yard.ts). */
  waiting?(): readonly YardCraft[];
  /** The Cygnus: not here, waiting at the capture point, or berthed (robotics-game.ts). */
  cygnus?(): "fuera" | "punto" | "atracado";
}

/** A catalogue vehicle at its assembly site, as the view draws it. */
export interface YardCraft {
  readonly id: string;
  readonly name: string;
  readonly site: AssemblySite;
  /** The player's craft it is (drawn as the LM or Juventas), or a box of its size. */
  readonly craft: "modulo" | "sonda" | null;
  readonly sizeM: readonly [number, number, number];
}

type Show = { kind: "atraque" | "desatraque" } | { kind: "bishop"; released: readonly AirlockItem[] } | { kind: "botar"; craft: YardCraft };

/** Where each assembly site holds what it put together (station frame): Bishop, JEM-EF, Unity's nadir CBM, the dry dock. */
function siteHome(site: AssemblySite, sizeM: readonly [number, number, number]): THREE.Vector3 {
  const r = Math.max(...sizeM) / 2;
  if (site === "bishop") return v3(BISHOP_BERTH.position).addScaledVector(v3(BISHOP_BERTH.normal), BISHOP.heightM / 2);
  if (site === "jem-ef") {
    const ef = POLANA_LAYOUT.parts.find((p) => p.id === "jem-ef");
    return ef ? v3(ef.centre).add(new THREE.Vector3(0, ef.half.y + r, 0)) : new THREE.Vector3(20, 3, 0);
  }
  if (site === "brazo-cbm") return v3(LANDER_CBM.position).addScaledVector(v3(LANDER_CBM.normal), r + 0.5);
  // The dry dock (licence): an open truss off the station's end.
  return new THREE.Vector3(-40, -12, 14 + r);
}

/** A built vehicle's model: the LM, Juventas, or a gold box of its size (small ones drawn 1,2 m across to be seen). */
function yardModel(c: YardCraft): THREE.Object3D {
  if (c.craft === "modulo") return new ShipModel(lunarModuleDesign()).root;
  const g = new THREE.Group();
  if (c.craft === "sonda") g.add(new ProbeModel(PROBE_HULL).root);
  else g.add(new THREE.Mesh(new THREE.BoxGeometry(c.sizeM[0], c.sizeM[1], c.sizeM[2]), new THREE.MeshStandardMaterial({ color: 0xd9b24a, roughness: 0.4, metalness: 0.7, emissive: 0x2a1c00 })));
  const big = Math.max(...c.sizeM);
  if (big < 1.2) g.scale.setScalar(1.2 / big);
  return g;
}

/** Game value: seconds an arm move takes on screen (on the ISS a berthing takes hours). */
const MOVE_S = 9;

const v3 = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const q4 = (q: { x: number; y: number; z: number; w: number }) => new THREE.Quaternion(q.x, q.y, q.z, q.w);

/** Position along a polyline of waypoints, t from 0 to 1 (equal time per leg). */
function along(points: readonly THREE.Vector3[], t: number): THREE.Vector3 {
  const legs = points.length - 1;
  const x = Math.min(legs - 1e-9, Math.max(0, t * legs));
  const i = Math.floor(x);
  const f = x - i;
  const e = f * f * (3 - 2 * f);
  return points[i]!.clone().lerp(points[i + 1]!, e);
}

/**
 * The view out of the Cupola (docs/design/estacion-real.md): the station from outside, full screen,
 * with Canadarm2 on its base on the truss. It plays the arm's moves in 3D: berthing the lander from its
 * IDA on Unity's nadir CBM (as it berths a Cygnus), putting it back, and taking the Bishop out to let
 * its payload go and berthing it again (as on the ISS since 2020).
 */
export class StationOutside {
  readonly root = new THREE.Group();
  readonly view: DockView;
  /** Canadarm2, Dextre and the Cygnus, and the arm's procedures played move by move (arm-show.ts). */
  readonly armShow: ArmShow;
  private readonly lander: ShipModel;
  private readonly bishop: THREE.Mesh;
  private readonly drifting: { mesh: THREE.Mesh; v: THREE.Vector3; age: number }[] = [];
  private play: { show: Show; t: number; path: THREE.Vector3[]; from?: THREE.Quaternion; to?: THREE.Quaternion; released?: boolean; model?: THREE.Object3D } | null = null;
  private readonly parked = new Map<string, THREE.Object3D>();
  private line = "";

  constructor(
    root: HTMLElement,
    scene: THREE.Scene,
    private readonly station: THREE.Object3D,
    private readonly modules: () => Map<string, THREE.Object3D>,
    private readonly deps: StationOutsideDeps,
  ) {
    scene.add(this.root);
    this.lander = new ShipModel(deps.design());
    this.lander.root.visible = false;
    this.bishop = new THREE.Mesh(new THREE.CylinderGeometry(BISHOP.diameterM / 2, BISHOP.diameterM / 2, BISHOP.heightM, 20), new THREE.MeshStandardMaterial({ color: 0xe8e2cf, roughness: 0.9 }));
    this.bishop.rotation.z = Math.PI / 2;
    this.bishop.visible = false;
    this.armShow = new ArmShow(ISS_OUTSIDE.canadarm2.lengthM, {
      lander: this.lander.root,
      landerAt: (at) => this.landerAt(at),
      landerOnUnity: () => deps.berthed(),
      bishop: this.bishop,
      bishopModule: () => this.modules().get("bishop"),
    });
    this.root.add(this.armShow.root, this.lander.root, this.bishop);
    this.view = new DockView(root, station, new THREE.Vector3(-3, -2, -6), 62, "Vista desde la Cupola");
    this.view.onClose = () => undefined;
    this.rest();
  }

  /** Open the view, and play an arm move in it if asked. */
  open(show?: Show): void {
    this.view.show(show?.kind === "bishop" ? "Bishop · Canadarm2 la saca y suelta la carga" : show?.kind === "botar" ? `${show.craft.name} · se suelta` : show ? "Canadarm2 · atraque en el CBM" : "Vista desde la Cupola");
    if (show) this.start(show);
  }

  get viewing(): boolean {
    return this.view.open;
  }

  /** An arm move is playing (the lander is drawn by this view, not the flight scene, meanwhile). */
  get busy(): boolean {
    return !!this.play || this.armShow.holdsLander;
  }

  /** The lander is drawn here (on the CBM or on the arm). */
  get holdsLander(): boolean {
    return this.lander.root.visible;
  }

  /** An arm procedure starts at the RWS: the view opens on it (the challenge's sheet hides its frame). */
  beginProcedure(proc: ArmProcedureId): void {
    this.play = null;
    this.armShow.begin(proc);
    this.view.show("Canadarm2 · puesto robótico de la Cupola");
    this.framing = true;
  }
  /** The moves of the blocks just placed. */
  playMoves(moves: readonly ArmMove[]): void {
    this.armShow.play(moves);
  }
  /** The challenge closed: the scene stays as it ended, the view goes back to the windows. */
  endProcedure(ok: boolean): void {
    this.armShow.end(ok);
    this.framing = false;
    this.view.camera.clearViewOffset();
    this.view.close();
    this.rest();
  }
  /** The arm's live audit (tools/experiencia/brazo-eva.mjs). */
  armAudit(sheetTop: number): ArmAudit | undefined {
    const c = document.querySelector("canvas")?.getBoundingClientRect();
    return this.armShow.audit(this.view.camera, this.root.parent ?? this.root, sheetTop, { w: c?.width ?? innerWidth, h: c?.height ?? innerHeight });
  }

  /** The Cygnus as robotics-game.ts has it (set by main.ts after both exist). */
  cygnusOf?: () => "fuera" | "punto" | "atracado";

  /** Capturing by hand (robotics-game.ts): the camera follows the LEE from the Cupola's window. */
  manualOn = false;

  /** While an arm challenge plays: the camera from the Cupola or an outside camera, in the strip above the sheet. */
  private framing = false;
  private readonly eyeNow = new THREE.Vector3();
  private readonly atNow = new THREE.Vector3();
  private frameProcedure(): void {
    const canvas = document.querySelector("canvas")?.getBoundingClientRect();
    const sheet = [...document.querySelectorAll<HTMLElement>(".duel.sheet")].find((x) => !x.classList.contains("hidden"))?.getBoundingClientRect();
    const W = canvas?.width ?? innerWidth;
    const H = canvas?.height ?? innerHeight;
    const top = sheet && sheet.top > 60 ? sheet.top : H;
    const cam = this.view.camera;
    const e = this.armShow.eye(cam.fov, top / H, W / H);
    this.armShow.viewpoint = e.viewpoint;
    const first = this.eyeNow.lengthSq() === 0;
    this.eyeNow.lerp(e.eye, first ? 1 : 0.08);
    this.atNow.lerp(e.at, first ? 1 : 0.15);
    this.root.updateMatrixWorld(true);
    cam.position.copy(this.root.localToWorld(this.eyeNow.clone()));
    cam.up.set(0, 1, 0).applyQuaternion(this.root.quaternion);
    cam.lookAt(this.root.localToWorld(this.atNow.clone()));
    // The strip above the sheet: the view's centre moves up to its middle.
    cam.aspect = W / H;
    if (top < H) cam.setViewOffset(W, H, 0, (H - top) / 2, W, H);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    this.view.say(`${e.viewpoint === "cupola" ? "Ventana de la Cupola" : "Cámara exterior"} · ${this.armShow.line}`);
  }

  private landerAt(at: "ida" | "cbm") {
    const p = this.deps.landerPose(at);
    return { pos: v3(p.position), quat: q4(p.orientation) };
  }

  private start(show: Show): void {
    if (show.kind === "botar") {
      const c = show.craft;
      const home = siteHome(c.site, c.sizeM);
      const model = this.parked.get(c.id) ?? yardModel(c);
      this.parked.delete(c.id);
      model.position.copy(home);
      this.root.add(model);
      // The real way out of each site (vehicle-yard.ts RELEASE_STEPS): the arm takes it away (Bishop,
      // JEM-EF, CBM: to 10 m below the station) and opens; from the dry dock it pushes off on its RCS.
      const away = c.site === "dique" ? home.clone().add(new THREE.Vector3(-6, -4, 6)) : c.site === "bishop" ? new THREE.Vector3(home.x - 4, -5, 6) : home.clone().add(new THREE.Vector3(0, -10, 0));
      this.play = { show, t: 0, path: [home, home.clone().lerp(away, 0.5), away], model };
      return;
    }
    if (show.kind === "bishop") {
      const home = v3(BISHOP_BERTH.position).addScaledVector(v3(BISHOP_BERTH.normal), BISHOP.heightM / 2);
      const out = home.clone().addScaledVector(v3(BISHOP_BERTH.normal), 3);
      const release = new THREE.Vector3(home.x - 4, -5, 6);
      this.play = { show, t: 0, path: [home, out, release, release.clone(), out, home] };
      return;
    }
    const ida = this.landerAt("ida");
    const cbm = this.landerAt("cbm");
    // Up off Harmony, aft over the truss, down behind Unity and in to its nadir (clear of every module).
    const high = 10.5;
    const way = [ida.pos, new THREE.Vector3(ida.pos.x, high, ida.pos.z), new THREE.Vector3(0, high, 7), new THREE.Vector3(0, cbm.pos.y - 2, 7), new THREE.Vector3(cbm.pos.x, cbm.pos.y - 2, cbm.pos.z), cbm.pos];
    const fwd = show.kind === "atraque";
    this.play = { show, t: 0, path: fwd ? way : [...way].reverse(), from: fwd ? ida.quat : cbm.quat, to: fwd ? cbm.quat : ida.quat };
  }

  /** Built vehicles still at their assembly sites, each where it was put together. */
  private drawParked(): void {
    const now = this.deps.waiting?.() ?? [];
    for (const [id, m] of this.parked)
      if (!now.some((c) => c.id === id)) {
        this.root.remove(m);
        this.parked.delete(id);
      }
    for (const c of now)
      if (!this.parked.has(c.id)) {
        const m = yardModel(c);
        m.position.copy(siteHome(c.site, c.sizeM));
        this.root.add(m);
        this.parked.set(c.id, m);
      }
  }

  /** Arm at rest: on its MBS, folded in front of the truss. */
  private rest(): void {
    this.armShow.rest();
  }

  private reachTo(target: THREE.Vector3): void {
    // The Mobile Base System slides along the truss rails toward the work (game value: how far).
    this.armShow.reachTo(target);
  }

  /** Each frame: follow the station, play the move, keep the lander and the Bishop where they are. */
  update(dt: number): void {
    this.root.position.copy(this.station.position);
    this.root.quaternion.copy(this.station.quaternion);
    this.lander.setDesign(this.deps.design());
    const bishopModule = this.modules().get("bishop");
    if (this.armShow.procedure) {
      this.armShow.update(dt);
      if (this.view.open) this.frameProcedure();
      return;
    }
    if (this.manualOn) {
      this.armShow.update(dt);
      if (this.view.open) this.frameProcedure();
      return;
    }
    this.armShow.setCygnus(this.cygnusOf?.() ?? this.deps.cygnus?.() ?? "fuera");
    this.armShow.update(dt);
    const p = this.play;
    if (p) {
      p.t = Math.min(1, p.t + dt / MOVE_S);
      const at = along(p.path, p.t);
      this.reachTo(at);
      if (p.show.kind === "botar") {
        const c = p.show.craft;
        if (c.site !== "dique") this.reachTo(at);
        else this.rest();
        p.model!.position.copy(at);
        if (p.t >= 1) this.drifting.push({ mesh: p.model as THREE.Mesh, v: new THREE.Vector3(-0.3, -0.25, 0.3), age: 0 });
        this.line = p.t < 1 ? (c.site === "dique" ? `${c.name} sale del dique con su RCS (licencia: el dique no existe en la ISS)` : `Canadarm2 lleva ${c.name} lejos de la estación y abre el efector`) : `${c.name} queda libre y se aleja`;
      } else if (p.show.kind === "bishop") {
        this.bishop.visible = true;
        this.bishop.position.copy(at);
        if (bishopModule) bishopModule.visible = false;
        if (!p.released && p.t >= 0.5) {
          p.released = true;
          p.show.released.forEach((item, i) => {
            const s = Math.cbrt(item.volumeM3) * 3;
            const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ color: 0xd9a441, emissive: 0x3a2a08 }));
            m.position.copy(at);
            this.root.add(m);
            this.drifting.push({ mesh: m, v: new THREE.Vector3(-0.6 - 0.2 * i, -0.4, 0.5 + 0.2 * i), age: 0 });
          });
        }
        this.line = p.released ? `Suelta: ${p.show.released.map((i) => i.name).join(" y ")} se alejan solos. La Bishop vuelve a su puerto de Tranquility` : "Canadarm2 saca la Bishop del puerto de babor de Tranquility";
      } else {
        this.lander.root.visible = true;
        this.lander.root.position.copy(at);
        this.lander.root.quaternion.copy(p.from!.clone().slerp(p.to!, p.t));
        this.line = p.show.kind === "atraque" ? "Canadarm2 lleva el módulo de su IDA de cenit al CBM de nadir de Unity (17,6 m de brazo, hasta 116 t)" : "Canadarm2 devuelve el módulo a su IDA de cenit";
      }
      if (p.t >= 1) {
        this.play = null;
        this.bishop.visible = false;
        if (bishopModule) bishopModule.visible = true;
        this.rest();
      }
    }
    if (!this.play) {
      this.drawParked();
      // At rest: the lander is drawn here only while berthed on the CBM.
      const held = this.deps.berthed();
      this.lander.root.visible = held;
      if (held) {
        const cbm = this.landerAt("cbm");
        this.lander.root.position.copy(cbm.pos);
        this.lander.root.quaternion.copy(cbm.quat);
      }
      this.line = held ? "El módulo está atracado en el CBM de nadir de Unity, como un Cygnus" : "Canadarm2 en reposo sobre la celosía. Arrastra para mirar alrededor";
    }
    for (const d of this.drifting) {
      d.age += dt;
      d.mesh.position.addScaledVector(d.v, dt);
    }
    while (this.drifting.length && this.drifting[0]!.age > 40) this.root.remove(this.drifting.shift()!.mesh);
    if (this.view.open) {
      this.view.say(this.line);
      this.view.aim();
    }
  }
}
