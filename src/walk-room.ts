import * as THREE from "three";
import { clampToFloor, floorPath, nearestStation, type CabinLayout, type FloorPoint } from "@modules/lander-cabin/domain/cabin";
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
}

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
  protected pos: FloorPoint;
  protected yaw = Math.PI;
  private pitch = 0;
  private stride = 0;
  private thirdPerson = true;
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
      ring.position.set(s.stand.x, 0.015, s.stand.z);
      this.scene.add(ring);
      this.markers.set(s.id, ring);
      if (opts.signs?.includes(s.id)) {
        const sign = textSign(s.label);
        sign.scale.multiplyScalar(0.2);
        sign.position.set(s.look.x * 0.8 + s.stand.x * 0.2, Math.min(L.heightM - 0.2, s.look.y + 0.28), s.look.z * 0.8 + s.stand.z * 0.2);
        (sign.material as THREE.SpriteMaterial).depthTest = false;
        sign.renderOrder = 10;
        this.scene.add(sign);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.4, 0.42), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set((s.stand.x + s.look.x) / 2, 0.7, (s.stand.z + s.look.z) / 2);
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
    this.viewBtn = this.menu.add({ className: "cab-view", icon: ICON.eye, label: "Vista: 3ª persona", key: "V", pinned: true }, () => {
      this.thirdPerson = !this.thirdPerson;
      this.menu.relabel(this.viewBtn, `Vista: ${this.thirdPerson ? "3ª" : "1ª"} persona`, "V");
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

  /** Go in at a machine. */
  enter(at: Id = this.opts.layout.stations[0]!.id): void {
    const s = this.opts.layout.stations.find((x) => x.id === at)!;
    this.pos = { ...s.stand };
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
    if (this.seated) this.avatar.pose("lotus");
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

  private place(): void {
    this.rig.position.set(this.pos.x, 0, this.pos.z);
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
      this.camera.position.set(this.pos.x * 0.4, this.opts.layout.heightM + 0.85, rear ? f.maxZ + back : f.minZ - back);
      // Seated in lotus under the settings sheet: aim low so she shows in the top of the screen.
      this.camera.lookAt(this.pos.x * 0.85, this.seated ? -0.2 : 0.55, this.pos.z + (rear ? -0.2 : 0.2));
      this.cutaway();
    } else {
      this.cutaway(true);
      this.lens(72, 0.02);
      this.camera.position.set(this.pos.x, 1.45, this.pos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    }
    const near = this.near();
    for (const [id, m] of this.markers) (m.material as THREE.MeshBasicMaterial).opacity = id === near ? 0.9 : 0.35;
  }

  /** Hide the walls between the dollhouse camera and her (rays to her head, chest and feet). */
  private cutaway(none = false): void {
    for (const m of this.hidden) m.visible = true;
    this.hidden.length = 0;
    if (none) return;
    this.scene.updateMatrixWorld();
    const from = this.camera.position;
    for (const y of [1.45, 0.9, 0.2]) {
      const to = new THREE.Vector3(this.pos.x, this.seated ? y * 0.45 : y, this.pos.z);
      const dir = to.clone().sub(from);
      const len = dir.length();
      this.ray.set(from, dir.normalize());
      this.ray.far = len - 0.2;
      for (const h of this.ray.intersectObjects(this.walls, false)) {
        if (h.object.visible) {
          h.object.visible = false;
          this.hidden.push(h.object);
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

  protected face(p: { x: number; y: number; z: number }): void {
    this.yaw = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z));
    this.pitch = Math.atan2(p.y - 1.45, Math.hypot(p.x - this.pos.x, p.z - this.pos.z));
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

/** Hand over hand along the rails (the cube rig's «hold»), for moving about in microgravity. */
const POSE_HOLD = { rootY: 0.98, rootX: 0, torso: 0.1, headX: -0.1, headY: 0, headZ: 0, shoulderX: [-2.2, -0.9] as [number, number], shoulderZ: [0.05, -0.35] as [number, number], elbow: [-0.25, -0.7] as [number, number], hip: [-0.3, -0.3] as [number, number], knee: [0.4, 0.3] as [number, number] };
