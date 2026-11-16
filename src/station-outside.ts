import * as THREE from "three";
import type { Quat } from "@core/math/quat";
import type { Vec3 } from "@core/math/vec3";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { AirlockItem } from "@modules/station/domain/cargo-airlock";
import { ARM_BASE, BISHOP_BERTH } from "@modules/station/data/structure";
import { BISHOP, ISS_OUTSIDE } from "@modules/station/data/iss";
import { CanadarmModel } from "./adapters/three/canadarm-model";
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
}

type Show = { kind: "atraque" | "desatraque" } | { kind: "bishop"; released: readonly AirlockItem[] };

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
  private readonly arm = new CanadarmModel(ISS_OUTSIDE.canadarm2.lengthM);
  private readonly lander: ShipModel;
  private readonly bishop: THREE.Mesh;
  private readonly drifting: { mesh: THREE.Mesh; v: THREE.Vector3; age: number }[] = [];
  private play: { show: Show; t: number; path: THREE.Vector3[]; from?: THREE.Quaternion; to?: THREE.Quaternion; released?: boolean } | null = null;
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
    this.root.add(this.arm.root, this.lander.root, this.bishop);
    this.view = new DockView(root, station, new THREE.Vector3(-3, -2, -6), 62, "Vista desde la Cupola");
    this.view.onClose = () => undefined;
    this.rest();
  }

  /** Open the view, and play an arm move in it if asked. */
  open(show?: Show): void {
    this.view.show(show?.kind === "bishop" ? "Bishop · Canadarm2 la saca y suelta la carga" : show ? "Canadarm2 · atraque en el CBM" : "Vista desde la Cupola");
    if (show) this.start(show);
  }

  get viewing(): boolean {
    return this.view.open;
  }

  /** An arm move is playing (the lander is drawn by this view, not the flight scene, meanwhile). */
  get busy(): boolean {
    return !!this.play;
  }

  /** The lander is drawn here (on the CBM or on the arm). */
  get holdsLander(): boolean {
    return this.lander.root.visible;
  }

  private landerAt(at: "ida" | "cbm") {
    const p = this.deps.landerPose(at);
    return { pos: v3(p.position), quat: q4(p.orientation) };
  }

  private start(show: Show): void {
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

  /** Arm at rest: folded over the truss near Destiny. */
  private rest(): void {
    const base = v3(ARM_BASE);
    this.arm.reach(base, base.clone().add(new THREE.Vector3(6, -1, 6)), base.clone().add(new THREE.Vector3(0, 8, 0)));
  }

  private reachTo(target: THREE.Vector3): void {
    const base = v3(ARM_BASE);
    // The Mobile Base System slides along the truss rails toward the work (game value: how far).
    base.x = Math.max(-40, Math.min(40, target.x * 0.9));
    this.arm.reach(base, target, base.clone().add(new THREE.Vector3(0, 9, 0)));
  }

  /** Each frame: follow the station, play the move, keep the lander and the Bishop where they are. */
  update(dt: number): void {
    this.root.position.copy(this.station.position);
    this.root.quaternion.copy(this.station.quaternion);
    this.lander.setDesign(this.deps.design());
    const bishopModule = this.modules().get("bishop");
    const p = this.play;
    if (p) {
      p.t = Math.min(1, p.t + dt / MOVE_S);
      const at = along(p.path, p.t);
      this.reachTo(at);
      if (p.show.kind === "bishop") {
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
