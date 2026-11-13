import * as THREE from "three";
import { cabinActions, clampToFloor, floorPath, nearestStation, type CabinActionId, type CabinState, type CabinStationId, type FloorPoint } from "@modules/lander-cabin/domain/cabin";
import { LANDER_CABIN } from "@modules/lander-cabin/data/cabin";
import { buildCockpit } from "./adapters/three/cockpit";
import { CubeFigure } from "./adapters/three/interior/figure";
import { textSign } from "./adapters/three/interior/sign";
import { drawScreen } from "./adapters/three/interior/room";
import { Walker } from "./adapters/input/walker";
import { DOMENICA_HAIR } from "./ui/portraits";
import { RootMenu } from "./ui/root-menu";
import { ICON } from "./ui/icons";
import { settings } from "./ui/settings-store";
import "./ui/lander-cabin.css";

/** Height of the cockpit model's floor under the pilot's eye, m (adapters/three/cockpit.ts). */
const FLOOR_Y = -0.8;
/** She moves hand over hand in this tight cabin, m/s. Game value. */
const SPEED = 0.55;

export interface CabinDeps {
  state(): CabinState;
  act(id: CabinActionId): void;
  /** The asteroid's mind console: phase, trust and levels in a few lines (HTML) and for the 3D screen. */
  mind(): { html: string; screen: readonly string[] };
  openTasks(): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * The lander's crew cabin as a walkable place (docs/design/habitaculo.md): the same capsule the pilot
 * sees from the seat, with Doménica in it. Its machines replace HUD buttons: the pilot seat (fly), the
 * docking console under the roof hatch (undock, docking assist, into the vehicle it is docked to), the
 * asteroid's mind console (phase, trust, the duel), the EVA hatch (suit up and out) and a yoga mat
 * (sit in lotus: general settings).
 */
export class LanderCabin {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.02, 30);
  active = false;
  private readonly walker: Walker;
  private readonly avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
  private readonly rig = new THREE.Group();
  private readonly ui: HTMLElement;
  private readonly machine: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly menu: RootMenu;
  private readonly viewBtn: HTMLButtonElement;
  private readonly mindScreen: THREE.Mesh;
  private readonly hits: THREE.Object3D[] = [];
  private readonly markers = new Map<CabinStationId, THREE.Mesh>();
  private pos: FloorPoint = { ...LANDER_CABIN.stations[0]!.stand };
  private yaw = Math.PI;
  private pitch = 0;
  private stride = 0;
  private thirdPerson = true;
  private seated = false;
  private walkTo: { id: CabinStationId; path: FloorPoint[]; then?: () => void } | null = null;
  private machineKey = "";
  private mindKey = "";
  private toastUntil = 0;

  constructor(
    root: HTMLElement,
    private readonly deps: CabinDeps,
  ) {
    this.scene.background = new THREE.Color(0x05070a);
    const cabin = buildCockpit();
    cabin.position.y = -FLOOR_Y;
    this.scene.add(cabin);
    this.scene.add(new THREE.AmbientLight(0xb8c8d8, 1.1));
    const lamp = new THREE.PointLight(0xdfefff, 6, 5, 1);
    lamp.position.set(0, 1.55, 0.3);
    this.scene.add(lamp);
    const fill = new THREE.PointLight(0x9fd8ff, 2.5, 4, 1);
    fill.position.set(0, 1.2, -0.4);
    this.scene.add(fill);

    // The asteroid's mind console: a screen on the starboard end of the console, with its own sign.
    this.mindScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.mindScreen.position.set(0.86, 0.72, -0.7);
    this.mindScreen.rotation.set(-0.5, -0.35, 0);
    this.scene.add(this.mindScreen);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.03), new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.5, roughness: 0.6 }));
    frame.position.copy(this.mindScreen.position).add(new THREE.Vector3(0.006, -0.005, -0.017));
    frame.rotation.copy(this.mindScreen.rotation);
    this.scene.add(frame);
    drawScreen(this.mindScreen, "Mente", ["sin asteroide cerca"], { w: 512, h: 330 });

    // The yoga mat, rolled half open behind the crew seat (the floor is tight).
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.3), new THREE.MeshStandardMaterial({ color: 0x7a4fb0, roughness: 0.95 }));
    mat.position.set(0.45, 0.006, 0.84);
    this.scene.add(mat);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x7a4fb0, roughness: 0.95 }));
    roll.rotation.x = Math.PI / 2;
    roll.position.set(0.7, 0.045, 0.84);
    this.scene.add(roll);

    // Each machine: a faint ring on the floor where she stands, a sign, and an invisible hit box to tap.
    for (const s of LANDER_CABIN.stations) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.14, 28), new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s.stand.x, 0.015, s.stand.z);
      this.scene.add(ring);
      this.markers.set(s.id, ring);
      if (s.id === "asiento" || s.id === "mente" || s.id === "esterilla" || s.id === "acople") {
        const sign = textSign(s.label);
        sign.scale.multiplyScalar(0.2);
        sign.position.set(s.look.x * 0.8 + s.stand.x * 0.2, Math.min(1.5, s.look.y + 0.28), s.look.z * 0.8 + s.stand.z * 0.2);
        (sign.material as THREE.SpriteMaterial).depthTest = false;
        sign.renderOrder = 10;
        this.scene.add(sign);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set((s.stand.x + s.look.x) / 2, 0.7, (s.stand.z + s.look.z) / 2);
      hit.userData.station = s.id;
      this.scene.add(hit);
      this.hits.push(hit);
    }

    this.avatar.root.scale.setScalar(0.95);
    this.rig.add(this.avatar.root);
    this.scene.add(this.rig);
    this.walker = new Walker(root, { move: "cab-move", look: "cab-look", moveLabel: "Moverse" });

    this.ui = document.createElement("div");
    this.ui.className = "cab-ui hidden";
    this.ui.innerHTML = `<div class="cab-where">Habitáculo del módulo</div><div class="cab-machine hidden" role="region" aria-label="Máquina"></div><div class="cab-toast"></div><div class="cab-fade"></div>`;
    root.appendChild(this.ui);
    this.machine = this.ui.querySelector(".cab-machine")!;
    this.toast = this.ui.querySelector(".cab-toast")!;
    this.menu = new RootMenu(this.ui, "cab-menu", "Más", ICON.root);
    this.viewBtn = this.menu.add({ className: "cab-view", icon: ICON.eye, label: "Vista: 3ª persona", key: "V", pinned: true }, () => {
      this.thirdPerson = !this.thirdPerson;
      this.menu.relabel(this.viewBtn, `Vista: ${this.thirdPerson ? "3ª" : "1ª"} persona`, "V");
    });
    this.menu.add({ className: "cab-tasks", icon: ICON.tasks, label: "Tareas", key: "T", pinned: true }, () => this.deps.openTasks());
    this.machine.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
      if (b && !b.disabled) this.deps.act(b.dataset.act as CabinActionId);
    });
    // A tap on a machine (or its floor ring) walks her there.
    root.addEventListener("click", (e) => {
      if (!this.active || (e.target as HTMLElement).closest("button, .board, .vstick, .cab-machine, .settings-sheet, .duel")) return;
      const id = this.stationAt(e.clientX, e.clientY);
      if (id) this.goTo(id);
    });
    window.addEventListener("keydown", (e) => {
      if (!this.active || e.repeat || document.body.classList.contains("in-settings") || document.body.classList.contains("in-duel") || document.body.classList.contains("in-tasks")) return;
      if (e.code === "KeyV") this.viewBtn.click();
      if (e.code === "KeyT") this.deps.openTasks();
      if (e.code === "KeyH") this.goTo("asiento", () => this.deps.act("pilotar"));
      if (e.code === "Enter") {
        const near = this.near();
        const a = near && cabinActions(near, this.deps.state()).find((x) => x.enabled);
        if (a) this.deps.act(a.id);
      }
    });
    this.place();
  }

  /** Go in; `at` is the machine she arrives at (the seat from the cockpit, the hatches from outside). */
  enter(at: CabinStationId = "asiento"): void {
    const s = LANDER_CABIN.stations.find((x) => x.id === at)!;
    this.pos = { ...s.stand };
    this.face(s.look);
    this.walkTo = null;
    this.seated = false;
    this.active = true;
    this.walker.enabled = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-cabin");
    this.fade();
    this.resize();
  }

  exit(): void {
    this.active = false;
    this.walker.enabled = false;
    this.seated = false;
    this.ui.classList.add("hidden");
    this.machine.classList.add("hidden");
    this.machineKey = "";
    document.body.classList.remove("in-cabin");
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** Walk to a machine, then `then` (e.g. sit down to fly). */
  goTo(id: CabinStationId, then?: () => void): void {
    this.seated = false;
    const s = LANDER_CABIN.stations.find((x) => x.id === id)!;
    this.walkTo = { id, path: floorPath(LANDER_CABIN.floor, this.pos, s.stand), ...(then ? { then } : {}) };
  }

  /** At the mat: sit in lotus (the settings open over her). */
  sitLotus(): void {
    const mat = LANDER_CABIN.stations.find((s) => s.id === "esterilla")!;
    this.pos = { ...mat.stand };
    // Facing the console, so the camera at the front sees her.
    this.yaw = 0;
    this.seated = true;
  }

  standUp(): void {
    this.seated = false;
  }

  /** The machine she is standing at. */
  near(): CabinStationId | undefined {
    return nearestStation(LANDER_CABIN, this.pos)?.id;
  }

  /** Where a machine is on screen (for taps in the experience suite and hints). */
  screenPoint(id: CabinStationId): { x: number; y: number } {
    const s = LANDER_CABIN.stations.find((x) => x.id === id)!;
    const v = new THREE.Vector3(s.stand.x, 0.02, s.stand.z).project(this.camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  }

  say(text: string, seconds = 4): void {
    if (!this.active) return;
    this.toast.textContent = text;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + seconds * 1000;
  }

  /** A short fade between the cockpit and the cabin, so the cut does not jump on a phone. */
  fade(): void {
    const f = this.ui.querySelector(".cab-fade")!;
    f.classList.remove("go");
    void (f as HTMLElement).offsetWidth;
    f.classList.add("go");
  }

  update(dt: number): void {
    if (!this.active) return;
    const busy = document.body.classList.contains("in-duel") || document.body.classList.contains("in-settings");
    const look = this.walker.look(dt);
    if (!busy && !this.seated) {
      this.yaw += this.thirdPerson ? 0 : look.yaw;
      this.pitch = Math.max(-1.2, Math.min(1.3, this.pitch + look.pitch));
    }
    let moving = false;
    if (this.walkTo && !busy) {
      const s = LANDER_CABIN.stations.find((x) => x.id === this.walkTo!.id)!;
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
        const step = Math.min(d, SPEED * dt);
        // Along the aisles, around the seats (floorPath).
        this.pos = { x: this.pos.x + (dx / d) * step, z: this.pos.z + (dz / d) * step };
        this.yaw = Math.atan2(-dx, -dz);
        this.stride += step * 5;
        moving = true;
      }
    } else if (!busy && !this.seated) {
      const m = this.walker.move();
      if (m.forward || m.right) {
        // Third person: the camera looks aft from the console, so «up» on the stick goes aft.
        const fwd = this.thirdPerson ? { x: 0, z: 1 } : { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
        const right = this.thirdPerson ? { x: -1, z: 0 } : { x: -fwd.z, z: fwd.x };
        const vx = fwd.x * m.forward + right.x * m.right;
        const vz = fwd.z * m.forward + right.z * m.right;
        const prev = this.pos;
        this.pos = clampToFloor(LANDER_CABIN.floor, { x: prev.x + vx * SPEED * dt, z: prev.z + vz * SPEED * dt }, prev);
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
    this.place();
    this.renderMachine();
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  private place(): void {
    // Microgravity: she floats a hand's width over the floor while moving, feet on it when still.
    this.rig.position.set(this.pos.x, 0, this.pos.z);
    this.rig.rotation.y = this.yaw + Math.PI;
    const third = this.thirdPerson || this.seated;
    this.rig.visible = third;
    if (third) {
      // From the top of the console, looking aft over the cabin: the whole capsule fits in view.
      this.camera.position.set(this.pos.x * 0.35, 1.5, -0.52);
      this.camera.lookAt(this.pos.x * 0.8, this.seated ? 0.35 : 0.75, this.pos.z);
    } else {
      this.camera.position.set(this.pos.x, 1.45, this.pos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    }
    for (const [id, m] of this.markers) (m.material as THREE.MeshBasicMaterial).opacity = id === this.near() ? 0.9 : 0.35;
  }

  private face(p: { x: number; y: number; z: number }): void {
    this.yaw = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z));
    this.pitch = Math.atan2(p.y - 1.45, Math.hypot(p.x - this.pos.x, p.z - this.pos.z));
  }

  private stationAt(x: number, y: number): CabinStationId | undefined {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), this.camera);
    const hit = ray.intersectObjects(this.hits, false)[0];
    return hit?.object.userData.station as CabinStationId | undefined;
  }

  /** The machine's panel: what it is and its actions (they replace the HUD buttons). */
  private renderMachine(): void {
    const id = this.walkTo || this.seated ? undefined : this.near();
    const s = id && LANDER_CABIN.stations.find((x) => x.id === id);
    const mind = this.deps.mind();
    const mindKey = mind.screen.join("|");
    if (mindKey !== this.mindKey) {
      this.mindKey = mindKey;
      drawScreen(this.mindScreen, "Mente del asteroide", mind.screen, { w: 512, h: 330 });
    }
    if (!s) {
      this.machine.classList.add("hidden");
      this.machineKey = "";
      return;
    }
    const acts = cabinActions(s.id, this.deps.state());
    const kbd = settings.value.keyboardHelp;
    const html = `<div class="cm-head"><b>${esc(s.label)}</b><small>${esc(s.what)}</small></div>${s.id === "mente" ? `<div class="cm-mind">${mind.html}</div>` : ""}<div class="cm-acts">${acts
      .map((a, i) => `<button data-act="${a.id}" ${a.enabled ? "" : "disabled"} class="${i === 0 ? "primary" : ""}">${esc(a.label)}${i === 0 && a.enabled && kbd ? " <kbd>Intro</kbd>" : ""}</button>`)
      .join("")}</div>${acts.filter((a) => !a.enabled && a.why).map((a) => `<p class="cm-why">${esc(a.why!)}</p>`).join("")}`;
    this.machine.classList.remove("hidden");
    if (html !== this.machineKey) {
      this.machine.innerHTML = html;
      this.machineKey = html;
    }
  }
}

/** Hand over hand along the roof rails (the cube rig's «hold»), for moving about the cabin. */
const POSE_HOLD = { rootY: 0.98, rootX: 0, torso: 0.1, headX: -0.1, headY: 0, headZ: 0, shoulderX: [-2.2, -0.9] as [number, number], shoulderZ: [0.05, -0.35] as [number, number], elbow: [-0.25, -0.7] as [number, number], hip: [-0.3, -0.3] as [number, number], knee: [0.4, 0.3] as [number, number] };
