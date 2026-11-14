import * as THREE from "three";
import { clampToFloor, floorPath, nearestStation, type CabinLayout, type CabinStation, type FloorPoint } from "@modules/lander-cabin/domain/cabin";
import { CubeFigure } from "./adapters/three/interior/figure";
import { textSign } from "./adapters/three/interior/sign";
import { Walker } from "./adapters/input/walker";
import { DOMENICA_HAIR } from "./ui/portraits";
import { RootMenu } from "./ui/root-menu";
import { ICON } from "./ui/icons";
import { settings } from "./ui/settings-store";
import "./ui/lander-cabin.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** One action of a machine, as the machine's card shows it (the first enabled one is the main one). */
export interface RoomAction {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly why?: string;
}

export interface WalkRoomOptions<Id extends string> {
  readonly layout: CabinLayout<Id>;
  /** CSS class of the room's overlay and prefix of its sticks. */
  readonly cls: string;
  /** Shown at the top left. */
  readonly title: string;
  /** The room's meshes: walls the dollhouse camera hides when they stand in the way. */
  readonly geometry: THREE.Object3D;
  /** She moves hand over hand, m/s. Game value. */
  readonly speedMs: number;
  /** Machines that get a sign over them. */
  readonly signs?: readonly Id[];
  readonly background?: number;
  /** Where the camera stands outside the room, beyond its ends, m from them. */
  readonly cameraBackM?: number;
  /**
   * Drawing scale of the room (src/core/scale.ts): the layout stays in real metres and is drawn `scale`
   * times bigger on the floor plan; `geometry` comes already drawn at that scale. Heights are not
   * scaled here (her eye, seats and work surfaces stay at body height). Default 1.
   */
  readonly scale?: number;
  /** Height of a machine's sign, drawn m (default: a little over what she looks at). */
  signY?(s: CabinStation<Id>): number;
}

/** Eye heights of the first-person camera, m: standing, and belted to a seat (data/bridge.ts BRIDGE_ERGONOMICS). */
const EYE_STANDING_M = 1.45;
const EYE_SEATED_M = 1.2;
/** Seated, her eye is this far behind the seat's centre (back against the backrest), m. */
const SEATED_EYE_BACK_M = 0.12;
/** The machine's card covers the bottom of a phone: she looks this much under what she faces, rad (≈ 9°). */
const CARD_BIAS_RAD = 0.16;
/** Signs: their drawn size over textSign's 0,32 m plate, and the least they show on the phone, px tall (text ≈ 12 px). */
const SIGN_SCALE = 0.5;
export const SIGN_MIN_PX = 28;

/**
 * A small walkable room whose machines replace HUD buttons (docs/design/habitaculo.md): Doménica in
 * third person under a dollhouse camera (outside the room, the walls in the way hidden) or in first
 * person; walking with the sticks or WASD, or a tap on a machine; at a machine its card shows what it
 * does and its actions. The lander's cabin and the travel ship's bridge are rooms like this.
 */
export abstract class WalkRoom<Id extends string> {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.02, 4000);
  active = false;
  protected readonly ui: HTMLElement;
  protected readonly menu: RootMenu;
  protected readonly avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
  private readonly walker: Walker;
  private readonly rig = new THREE.Group();
  private readonly machine: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly viewBtn: HTMLButtonElement;
  private readonly hits: THREE.Object3D[] = [];
  private readonly markers = new Map<Id, THREE.Mesh>();
  private readonly signs = new Map<Id, THREE.Sprite>();
  /** Drawing scale of the floor plan (WalkRoomOptions.scale). */
  protected readonly k: number;
  /** Belted to the seat of the station she is at (pilot, probe): lower eye, seated pose. */
  protected chair = false;
  private eye = EYE_STANDING_M;
  protected pos: FloorPoint;
  protected yaw = Math.PI;
  private pitch = 0;
  private stride = 0;
  private thirdPerson = settings.value.walkView === "tercera";
  protected seated = false;
  private camAtRear = true;
  private readonly walls: THREE.Object3D[] = [];
  private readonly hidden: THREE.Object3D[] = [];
  private readonly ray = new THREE.Raycaster();
  private walkTo: { id: Id; path: FloorPoint[]; then?: () => void } | null = null;
  private machineKey = "";
  private toastUntil = 0;

  constructor(
    root: HTMLElement,
    protected readonly opts: WalkRoomOptions<Id>,
  ) {
    const L = opts.layout;
    const k = (this.k = opts.scale ?? 1);
    this.pos = { ...L.stations[0]!.stand };
    this.scene.background = new THREE.Color(opts.background ?? 0x05070a);
    this.scene.add(opts.geometry);
    opts.geometry.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) this.walls.push(o);
    });
    // Each machine: a faint ring on the floor where she stands, maybe a sign, and an invisible box to tap.
    for (const s of L.stations) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.14, 28), new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s.stand.x * k, 0.015, s.stand.z * k);
      ring.scale.setScalar(k);
      this.scene.add(ring);
      this.markers.set(s.id, ring);
      if (opts.signs?.includes(s.id)) {
        const sign = textSign(s.label);
        sign.scale.multiplyScalar(SIGN_SCALE * k);
        sign.userData.base = sign.scale.clone();
        const y = opts.signY ? opts.signY(s) : Math.min(L.heightM * k - 0.2, s.look.y + 0.28);
        sign.position.set((s.look.x * 0.8 + s.stand.x * 0.2) * k, y, (s.look.z * 0.8 + s.stand.z * 0.2) * k);
        (sign.material as THREE.SpriteMaterial).depthTest = false;
        sign.renderOrder = 10;
        this.scene.add(sign);
        this.signs.set(s.id, sign);
      }
      // The tap box: where she stands and the machine, as tall as a console.
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42 * k, 1.5, 0.42 * k), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(((s.stand.x + s.look.x) / 2) * k, 0.75, ((s.stand.z + s.look.z) / 2) * k);
      hit.userData.station = s.id;
      this.scene.add(hit);
      this.hits.push(hit);
    }
    this.avatar.root.scale.setScalar(0.92);
    this.rig.add(this.avatar.root);
    this.scene.add(this.rig);
    this.walker = new Walker(root, { move: `${opts.cls}-move room-move`, look: `${opts.cls}-look room-look`, moveLabel: "Moverse" });

    this.ui = document.createElement("div");
    this.ui.className = `room-ui ${opts.cls}-ui hidden`;
    this.ui.innerHTML = `<div class="cab-where">${esc(opts.title)}</div><div class="cab-machine hidden" role="region" aria-label="Máquina"></div><div class="cab-toast"></div><div class="cab-fade"></div>`;
    root.appendChild(this.ui);
    this.machine = this.ui.querySelector(".cab-machine")!;
    this.toast = this.ui.querySelector(".cab-toast")!;
    this.menu = new RootMenu(this.ui, "cab-menu", "Más", ICON.root);
    this.viewBtn = this.menu.add({ className: "cab-view", icon: ICON.eye, label: `Vista: ${this.thirdPerson ? "3ª" : "1ª"} persona`, key: "V", pinned: true }, () => {
      this.thirdPerson = !this.thirdPerson;
      this.syncView();
    });
    this.menu.add({ className: "cab-tasks", icon: ICON.tasks, label: "Tareas", key: "T", pinned: true }, () => this.openTasks());
    this.machine.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
      const id = this.near();
      if (b && !b.disabled && id) this.act(id, b.dataset.act!);
    });
    // A tap on a machine walks her there.
    root.addEventListener("click", (e) => {
      if (!this.active || this.busy() || (e.target as HTMLElement).closest("button, .board, .vstick, .cab-machine, .settings-sheet, .duel, .fd, .probe-ui, .mission-log")) return;
      const id = this.stationAt(e.clientX, e.clientY);
      if (id) this.goTo(id);
    });
    window.addEventListener("keydown", (e) => {
      if (!this.active || e.repeat || this.busy()) return;
      if (e.code === "KeyV") this.viewBtn.click();
      if (e.code === "KeyT") this.openTasks();
      if (e.code === "Enter") {
        const id = this.near();
        const a = id && this.actions(id).find((x) => x.enabled);
        if (id && a) this.act(id, a.id);
      }
      this.onKey(e);
    });
  }

  /** What a machine offers now. */
  protected abstract actions(id: Id): RoomAction[];
  /** Do one of a machine's actions. */
  protected abstract act(id: Id, action: string): void;
  protected abstract openTasks(): void;
  /** Extra HTML on a machine's card (the asteroid's mind). */
  protected extra(_id: Id): string {
    return "";
  }
  /** Room-specific keys. */
  protected onKey(_e: KeyboardEvent): void {}
  /** Each frame, before drawing (screens, lights). */
  protected tick(_dt: number): void {}

  /** Something else is on top (a challenge, the settings, the task list, a console's screen). */
  protected busy(): boolean {
    const b = document.body.classList;
    return b.contains("in-duel") || b.contains("in-settings") || b.contains("in-tasks") || b.contains("in-deck") || b.contains("in-probe") || b.contains("in-missions");
  }

  private syncView(): void {
    this.menu.relabel(this.viewBtn, `Vista: ${this.thirdPerson ? "3ª" : "1ª"} persona`, "V");
  }

  /** Go in at a machine. The view on foot starts as the settings say (first person unless chosen otherwise). */
  enter(at: Id = this.opts.layout.stations[0]!.id): void {
    const s = this.opts.layout.stations.find((x) => x.id === at)!;
    this.pos = { ...s.stand };
    this.thirdPerson = settings.value.walkView === "tercera";
    this.syncView();
    this.face(s.look);
    this.walkTo = null;
    this.seated = false;
    this.camAtRear = this.pos.z < this.midZ;
    this.resume();
    this.fade();
  }

  /** Show it again after a console's screen (same place). */
  resume(): void {
    this.active = true;
    this.walker.enabled = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-room", `in-${this.opts.cls}`);
    this.resize();
  }

  exit(): void {
    this.active = false;
    this.walker.enabled = false;
    this.seated = false;
    this.walkTo = null;
    this.ui.classList.add("hidden");
    this.machine.classList.add("hidden");
    this.machineKey = "";
    document.body.classList.remove("in-room", `in-${this.opts.cls}`);
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** Walk to a machine along the aisles, then `then`. */
  goTo(id: Id, then?: () => void): void {
    this.seated = false;
    const s = this.opts.layout.stations.find((x) => x.id === id)!;
    this.walkTo = { id, path: floorPath(this.opts.layout.floor, this.pos, s.stand, this.aisles()), ...(then ? { then } : {}) };
  }

  /** The machine she is standing at. */
  near(): Id | undefined {
    return nearestStation(this.opts.layout, this.pos)?.id;
  }

  /** Where a machine is on screen (its tap box), for the experience suite. */
  screenPoint(id: Id): { x: number; y: number } {
    const h = this.hits.find((x) => x.userData.station === id)!;
    const v = h.position.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  }

  say(text: string, seconds = 4): void {
    if (!this.active) return;
    this.toast.textContent = text;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + seconds * 1000;
  }

  /** A short fade at the cut into the room, so it does not jump on a phone. */
  fade(): void {
    const f = this.ui.querySelector<HTMLElement>(".cab-fade")!;
    f.classList.remove("go");
    void f.offsetWidth;
    f.classList.add("go");
  }

  update(dt: number): void {
    if (!this.active) return;
    const busy = this.busy();
    const look = this.walker.look(dt);
    if (!busy && !this.seated && !this.thirdPerson) {
      this.yaw += look.yaw;
      this.pitch = Math.max(-1.2, Math.min(1.3, this.pitch + look.pitch));
    }
    let moving = false;
    const speed = this.opts.speedMs;
    if (this.walkTo && !busy) {
      const s = this.opts.layout.stations.find((x) => x.id === this.walkTo!.id)!;
      const aim = this.walkTo.path[0] ?? s.stand;
      const dx = aim.x - this.pos.x;
      const dz = aim.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.02 && this.walkTo.path.length > 1) this.walkTo.path.shift();
      else if (d < 0.02) {
        const then = this.walkTo.then;
        this.walkTo = null;
        this.face(s.look);
        then?.();
      } else {
        const step = Math.min(d, speed * dt);
        this.pos = { x: this.pos.x + (dx / d) * step, z: this.pos.z + (dz / d) * step };
        this.yaw = Math.atan2(-dx, -dz);
        this.stride += step * 5;
        moving = true;
      }
    } else if (!busy && !this.seated) {
      const m = this.walker.move();
      if (m.forward || m.right) {
        // Third person: «up» on the stick goes away from the camera (it looks forward or aft, see place()).
        const away = this.camAtRear ? -1 : 1;
        const fwd = this.thirdPerson ? { x: 0, z: away } : { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
        const right = this.thirdPerson ? { x: -away, z: 0 } : { x: -fwd.z, z: fwd.x };
        const vx = fwd.x * m.forward + right.x * m.right;
        const vz = fwd.z * m.forward + right.z * m.right;
        const prev = this.pos;
        this.pos = clampToFloor(this.opts.layout.floor, { x: prev.x + vx * speed * dt, z: prev.z + vz * speed * dt }, prev);
        const step = Math.hypot(this.pos.x - prev.x, this.pos.z - prev.z);
        if (this.thirdPerson && step > 1e-4) this.yaw = Math.atan2(-vx, -vz);
        this.stride += step * 5;
        moving = step > 1e-4;
      }
    }
    // At a seated station (pilot, probe) she belts in as soon as she stops there.
    const at = !this.walkTo && !moving ? this.station(this.near()) : undefined;
    this.chair = !this.seated && !!at?.seated;
    const eye = this.chair ? EYE_SEATED_M : EYE_STANDING_M;
    this.eye += (eye - this.eye) * Math.min(1, dt * 6);
    if (this.seated) this.avatar.pose("lotus");
    else if (this.chair) this.avatar.poseAngles(POSE_SEAT);
    else if (moving) this.avatar.poseAngles({ ...POSE_HOLD, hip: [Math.sin(this.stride) * 0.25 - 0.3, -Math.sin(this.stride) * 0.25 - 0.3] });
    else this.avatar.pose("stand");
    this.avatar.update(dt, 8);
    this.tick(dt);
    this.place();
    this.renderMachine();
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  private get midZ(): number {
    const f = this.opts.layout.floor;
    return (f.minZ + f.maxZ) / 2;
  }

  /** Front and rear aisles for walking around furniture. */
  protected aisles(): number[] {
    const f = this.opts.layout.floor;
    return [f.minZ + 0.25, f.maxZ - 0.07];
  }

  private station(id: Id | undefined): CabinStation<Id> | undefined {
    return id === undefined ? undefined : this.opts.layout.stations.find((x) => x.id === id);
  }

  private place(): void {
    const k = this.k;
    this.rig.position.set(this.pos.x * k, 0, this.pos.z * k);
    this.rig.rotation.y = this.yaw + Math.PI;
    const third = this.thirdPerson || this.seated;
    this.rig.visible = third;
    const f = this.opts.layout.floor;
    if (third) {
      // Dollhouse camera: above and outside the room, beyond the end she is far from; the walls in between
      // are hidden. In two metres of cabin a camera behind her shoulders would be inside the wall.
      const span = f.maxZ - f.minZ;
      if (this.camAtRear && this.pos.z > this.midZ + span * 0.15) this.camAtRear = false;
      else if (!this.camAtRear && this.pos.z < this.midZ - span * 0.1) this.camAtRear = true;
      const rear = this.camAtRear;
      const back = this.opts.cameraBackM ?? 1.4;
      this.lens(55, 0.05);
      this.camera.position.set(this.pos.x * 0.4 * k, this.opts.layout.heightM * k + 0.85, rear ? f.maxZ * k + back : f.minZ * k - back);
      // Seated in lotus under the settings sheet: aim low so she shows in the top of the screen.
      this.camera.lookAt(this.pos.x * 0.85 * k, this.seated ? -0.2 : 0.55, (this.pos.z + (rear ? -0.2 : 0.2)) * k);
      this.cutaway();
    } else {
      this.cutaway(true);
      this.lens(72, 0.02);
      // Belted in, her head rests back toward the seat's headrest.
      const st = this.chair ? this.station(this.near()) : undefined;
      const back = st ? new THREE.Vector2(st.stand.x - st.look.x, st.stand.z - st.look.z).normalize().multiplyScalar(SEATED_EYE_BACK_M) : new THREE.Vector2();
      this.camera.position.set(this.pos.x * k + back.x, this.eye, this.pos.z * k + back.y);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    }
    const near = this.near();
    for (const [id, m] of this.markers) (m.material as THREE.MeshBasicMaterial).opacity = id === near ? 0.9 : 0.35;
    // In first person the sign of the machine she is at would sit in her face: its screen says what it is.
    for (const [id, sign] of this.signs) sign.visible = third || id !== near;
    this.declutter();
  }

  /**
   * Signs stay readable and apart on a phone: a far one grows to SIGN_MIN_PX tall, and where two would
   * overlap on screen only the nearer shows (the 2 m rule keeps them apart up close; across the room
   * one can stand behind another).
   */
  private declutter(): void {
    this.camera.updateMatrixWorld();
    const H = window.innerHeight;
    const f = H / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    const shown: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const list = [...this.signs.values()]
      .filter((s) => s.visible)
      .map((s) => ({ s, d: s.position.clone().sub(this.camera.position).dot(fwd) }))
      .sort((a, b) => a.d - b.d);
    for (const { s, d } of list) {
      const base = s.userData.base as THREE.Vector3;
      if (d <= 0.05) {
        s.scale.copy(base);
        continue;
      }
      const grow = Math.max(1, (SIGN_MIN_PX * d) / (f * base.y));
      s.scale.set(base.x * grow, base.y * grow, 1);
      const c = s.position.clone().project(this.camera);
      const x = ((c.x + 1) / 2) * window.innerWidth;
      const y = ((1 - c.y) / 2) * H;
      const hw = (f * s.scale.x) / d / 2;
      const hh = (f * s.scale.y) / d / 2;
      const r = { x0: x - hw, x1: x + hw, y0: y - hh, y1: y + hh };
      if (shown.some((q) => q.x0 < r.x1 && r.x0 < q.x1 && q.y0 < r.y1 && r.y0 < q.y1)) s.visible = false;
      else shown.push(r);
    }
  }

  /** Hide the walls between the dollhouse camera and her (rays to her head, chest and feet). */
  private cutaway(none = false): void {
    for (const m of this.hidden) m.visible = true;
    this.hidden.length = 0;
    if (none) return;
    this.scene.updateMatrixWorld();
    const from = this.camera.position;
    for (const y of [1.45, 0.9, 0.2]) {
      const to = new THREE.Vector3(this.pos.x * this.k, this.seated ? y * 0.45 : y, this.pos.z * this.k);
      const dir = to.clone().sub(from);
      const len = dir.length();
      this.ray.set(from, dir.normalize());
      this.ray.far = len - 0.2;
      for (const h of this.ray.intersectObjects(this.walls, false)) {
        // A piece of a wall that goes as a whole (the bridge's bow: strips and window) names it in `cutWith`.
        // Merged machinery (the bridge's consoles) stays: hiding it would hide every console at once.
        if (h.object.userData.noCut) continue;
        const o = (h.object.userData.cutWith as THREE.Object3D | undefined) ?? h.object;
        if (o.visible) {
          o.visible = false;
          this.hidden.push(o);
        }
      }
    }
  }

  private lens(fov: number, near: number): void {
    if (this.camera.fov === fov && this.camera.near === near) return;
    this.camera.fov = fov;
    this.camera.near = near;
    this.camera.updateProjectionMatrix();
  }

  /** Turn to a point of the layout (real x, z; y is a height, drawn m). */
  protected face(p: { x: number; y: number; z: number }): void {
    const k = this.k;
    const st = this.opts.layout.stations.find((s) => s.look === p);
    const eye = st?.seated && Math.hypot(st.stand.x - this.pos.x, st.stand.z - this.pos.z) < 0.05 ? EYE_SEATED_M : EYE_STANDING_M;
    const a = st ? this.aim(st) : { x: p.x * k, y: p.y, z: p.z * k };
    this.yaw = Math.atan2(-(a.x - this.pos.x * k), -(a.z - this.pos.z * k));
    // A little under it, so the machine sits in the upper half of the phone, above its card.
    this.pitch = Math.atan2(a.y - eye, Math.hypot(a.x - this.pos.x * k, a.z - this.pos.z * k)) - CARD_BIAS_RAD;
  }

  /** Where she looks at a machine, drawn m (a room puts it on the machine's screen). */
  protected aim(s: CabinStation<Id>): { x: number; y: number; z: number } {
    return { x: s.look.x * this.k, y: s.look.y, z: s.look.z * this.k };
  }

  /**
   * On-screen sizes, px, for the experience suite and the scale study (docs/design/escala.md): each
   * sign's height and width, each tap box, and what the room adds (its screens and controls).
   */
  measure(): { signs: Record<string, { w: number; h: number; x: number; y: number; onScreen: boolean }>; hits: Record<string, { w: number; h: number }>; extra: unknown } {
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const px = (v: THREE.Vector3) => {
      const q = v.clone().project(this.camera);
      return { x: ((q.x + 1) / 2) * W, y: ((1 - q.y) / 2) * H, z: q.z };
    };
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const signs: Record<string, { w: number; h: number; x: number; y: number; onScreen: boolean }> = {};
    for (const [id, s] of this.signs) {
      if (!s.visible) continue;
      const c = px(s.position);
      const t = px(s.position.clone().addScaledVector(up, s.scale.y / 2));
      const b = px(s.position.clone().addScaledVector(up, -s.scale.y / 2));
      const r = px(s.position.clone().addScaledVector(right, s.scale.x / 2));
      const l = px(s.position.clone().addScaledVector(right, -s.scale.x / 2));
      signs[id] = { w: Math.round(Math.abs(r.x - l.x)), h: Math.round(Math.abs(b.y - t.y)), x: Math.round(c.x), y: Math.round(c.y), onScreen: c.z < 1 && c.x > 0 && c.x < W && c.y > 0 && c.y < H };
    }
    const hits: Record<string, { w: number; h: number }> = {};
    for (const h of this.hits) {
      const box = new THREE.Box3().setFromObject(h);
      const pts = [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((m) => px(new THREE.Vector3(i ? box.max.x : box.min.x, j ? box.max.y : box.min.y, m ? box.max.z : box.min.z)))));
      if (pts.some((p) => p.z > 1)) continue;
      hits[h.userData.station as string] = { w: Math.round(Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x))), h: Math.round(Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))) };
    }
    return { signs, hits, extra: this.measureExtra(px) };
  }

  /** What a room adds to `measure()`. */
  protected measureExtra(_px: (v: THREE.Vector3) => { x: number; y: number; z: number }): unknown {
    return null;
  }

  private stationAt(x: number, y: number): Id | undefined {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), this.camera);
    const hit = ray.intersectObjects(this.hits, false)[0];
    return hit?.object.userData.station as Id | undefined;
  }

  /** The machine's card: what it is and its actions (they replace the HUD buttons). */
  private renderMachine(): void {
    const id = this.walkTo || this.seated ? undefined : this.near();
    const s = id && this.opts.layout.stations.find((x) => x.id === id);
    if (!s) {
      this.machine.classList.add("hidden");
      this.machineKey = "";
      return;
    }
    const acts = this.actions(s.id);
    const kbd = settings.value.keyboardHelp;
    const main = acts.findIndex((a) => a.enabled);
    const html = `<div class="cm-head"><b>${esc(s.label)}</b><small>${esc(s.what)}</small></div>${this.extra(s.id)}<div class="cm-acts">${acts
      .map((a, i) => `<button data-act="${a.id}" ${a.enabled ? "" : "disabled"} class="${i === main ? "primary" : ""}">${esc(a.label)}${i === main && kbd ? " <kbd>Intro</kbd>" : ""}</button>`)
      .join("")}</div>${acts.filter((a) => !a.enabled && a.why).map((a) => `<p class="cm-why">${esc(a.why!)}</p>`).join("")}`;
    this.machine.classList.remove("hidden");
    if (html !== this.machineKey) {
      this.machine.innerHTML = html;
      this.machineKey = html;
    }
  }
}

/** Belted to a restraint seat in neutral posture (MSIS: hips and knees ~50°), hands on the RHC and THC. */
const POSE_SEAT = { rootY: 0.55, rootX: 0, torso: 0.1, headX: 0.2, headY: 0, headZ: 0, shoulderX: [-0.75, -0.75] as [number, number], shoulderZ: [0.2, -0.2] as [number, number], elbow: [-0.9, -0.9] as [number, number], hip: [-1.25, -1.25] as [number, number], knee: [1.3, 1.3] as [number, number] };

/** Hand over hand along the rails (the cube rig's «hold»), for moving about in microgravity. */
const POSE_HOLD = { rootY: 0.98, rootX: 0, torso: 0.1, headX: -0.1, headY: 0, headZ: 0, shoulderX: [-2.2, -0.9] as [number, number], shoulderZ: [0.05, -0.35] as [number, number], elbow: [-0.25, -0.7] as [number, number], hip: [-0.3, -0.3] as [number, number], knee: [0.4, 0.3] as [number, number] };
