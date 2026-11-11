import * as THREE from "three";
import type { Habitat, HabitatEvent, ChoreSession } from "@modules/habitat/application/habitat";
import type { Chore } from "@modules/chores/domain/chore";
import { shipCode } from "@modules/chores/application/catalog";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { ROOM, STATIONS, POT_SLOTS, buildRoom, drawPanel, type Station } from "./adapters/three/interior/room";
import { PlantModel } from "./adapters/three/interior/plant-model";
import { CatModel } from "./adapters/three/interior/cat-model";
import { CubeFigure } from "./adapters/three/interior/figure";
import { Walker } from "./adapters/input/walker";
import type { DuelView, SessionText } from "./ui/duel-view";

const CAT_COLORS = [0xd9822b, 0x2b2b2b, 0xe8e2d6, 0x8a8f99];
/** Game days per real second while walking around (a day every ~40 s). Paused during a chore. */
const DAYS_PER_SECOND = 1 / 40;

const stationFor = (c: Chore): Station["id"] => {
  switch (c.kind) {
    case "cocinar":
      return "cocina";
    case "yoga":
      return "yoga";
    case "reparar-nave":
      return "panel";
    case "alimentar-gato":
    case "calmar-gato":
      return "gatos";
    default:
      return "huerto";
  }
};

const choreText = (c: Chore): SessionText => ({
  title: c.title,
  progress: c.kind === "yoga" ? "Posturas" : "Pasos",
  lives: "Intentos",
  order: c.kind === "cocinar" ? "Ordena los pasos de la receta" : "Ordena los pasos",
  submit: "Hacerlo",
  ok: c.kind === "yoga" ? "Entras en la postura" : "Bien hecho",
  bad: "Así no: inténtalo otra vez",
  sheet: true,
});

const EVENT_TEXT = (h: Habitat, e: HabitatEvent): string | undefined => {
  const cat = (id: string) => h.cats.find((c) => c.id === id)?.name ?? id;
  switch (e.type) {
    case "plant-bitten":
      return `${cat(e.catId)} ha mordisqueado una planta nueva`;
    case "cats-hissed":
      return `${cat(e.a)} y ${cat(e.b)} se han bufado`;
    case "introduction-advanced":
      return `${cat(e.newcomerId)} y ${cat(e.residentId)}: ${e.stage.replace(/-/g, " ")}`;
    case "plant-died":
      return "Una planta se ha secado";
    case "jolt":
      return "¡Sacudida! Revisa plantas, gatos y nave";
    case "chore-done":
      return "Tarea hecha";
    default:
      return undefined;
  }
};

/** The walkable habitat module: 3D scene, walking, stations and chores as code challenges. */
export class Interior {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 50);
  private readonly walker: Walker;
  private readonly plants: PlantModel[] = [];
  private readonly cats = new Map<string, CatModel>();
  private readonly figure = new CubeFigure();
  private readonly panel: THREE.Mesh;
  private readonly ui: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly board: HTMLElement;
  private readonly stationBtn: HTMLButtonElement;
  private readonly toast: HTMLElement;
  private yaw = Math.PI;
  private pitch = -0.05;
  private pos = new THREE.Vector3(0, 0, -2.6);
  private walkTo: { pos: THREE.Vector3; look: THREE.Vector3; then: () => void } | null = null;
  private session: ChoreSession | null = null;
  private panelKey = "";
  private toastUntil = 0;
  private dayClock = 0;
  active = false;

  constructor(
    root: HTMLElement,
    private readonly habitat: Habitat,
    private readonly duel: DuelView,
  ) {
    const { group, panel } = buildRoom();
    this.scene.add(group);
    this.scene.background = new THREE.Color(0x10141a);
    this.panel = panel;
    habitat.plants.forEach((p, i) => {
      const m = new PlantModel(p);
      m.root.position.copy(POT_SLOTS[i % POT_SLOTS.length]!);
      this.plants.push(m);
      this.scene.add(m.root);
    });
    habitat.cats.forEach((c, i) => {
      const m = new CatModel(c.id, CAT_COLORS[i % CAT_COLORS.length]!, { minX: -1.2, maxX: 1.1, minZ: -3, maxZ: 3.4 });
      this.cats.set(c.id, m);
      this.scene.add(m.root);
    });
    const mat = new THREE.Group();
    mat.position.set(0.2, 0, 2.4);
    mat.rotation.y = -Math.PI / 2; // profile to the room, like a yoga teacher's side view
    mat.add(this.figure.root);
    this.scene.add(mat);

    this.walker = new Walker(root);
    this.ui = document.createElement("div");
    this.ui.className = "interior-ui hidden";
    this.ui.innerHTML = `<div class="ihud"></div><button class="tasks-btn">Tareas</button><div class="board hidden"></div><button class="station-btn hidden"></button><div class="toast"></div>`;
    root.appendChild(this.ui);
    this.hud = this.ui.querySelector(".ihud")!;
    this.board = this.ui.querySelector(".board")!;
    this.stationBtn = this.ui.querySelector(".station-btn")!;
    this.toast = this.ui.querySelector(".toast")!;
    this.ui.querySelector(".tasks-btn")!.addEventListener("click", () => this.openBoard());
    this.stationBtn.addEventListener("click", () => {
      const s = this.nearStation();
      if (s) this.openBoard(s.id);
    });
    this.board.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-chore]");
      if ((e.target as HTMLElement).closest("[data-close]")) this.board.classList.add("hidden");
      if (!t) return;
      const chore = this.currentChores().find((c) => c.id === t.dataset.chore);
      if (chore) this.goAndDo(chore);
    });
    this.duel.onClose = () => this.endChore();
    this.updateCamera();
  }

  enter(): void {
    this.active = true;
    this.walker.enabled = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-interior");
  }

  exit(): void {
    this.active = false;
    this.walker.enabled = false;
    this.ui.classList.add("hidden");
    this.board.classList.add("hidden");
    document.body.classList.remove("in-interior");
  }

  resize(): void {
    this.frameForSheet(this.session !== null);
  }

  /** Called every frame, also while in the cockpit (time on board keeps running). */
  update(dt: number): void {
    const busy = this.session !== null;
    if (!busy) {
      const days = dt * DAYS_PER_SECOND;
      this.habitat.tick(days);
      this.dayClock += days;
    }
    for (const e of this.habitat.drainEvents()) this.onEvent(e);
    if (!this.active) return;

    if (this.walkTo) {
      const to = this.walkTo.pos.clone().sub(this.pos);
      const d = to.length();
      if (d < 0.05) {
        const then = this.walkTo.then;
        this.faceTowards(this.walkTo.look);
        this.walkTo = null;
        then();
      } else this.pos.addScaledVector(to.normalize(), Math.min(d, 2.2 * dt));
    } else if (!busy) {
      const look = this.walker.look(dt);
      this.yaw += look.yaw;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + look.pitch));
      const m = this.walker.move();
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      this.pos.addScaledVector(fwd, m.forward * 1.6 * dt).addScaledVector(right, m.right * 1.6 * dt);
      this.pos.x = Math.max(-1.25, Math.min(1.25, this.pos.x));
      this.pos.z = Math.max(-ROOM.halfL + 0.4, Math.min(ROOM.halfL - 0.4, this.pos.z));
    }
    this.updateCamera();

    for (const p of this.plants) p.sync();
    for (const c of this.habitat.cats) {
      const m = this.cats.get(c.id);
      if (m) {
        m.stress = c.stress;
        m.update(dt);
      }
    }
    this.figure.update(dt);
    this.syncPanel();
    this.renderHud();
    const near = !busy && !this.walkTo ? this.nearStation() : undefined;
    const n = near ? this.currentChores().filter((c) => stationFor(c) === near.id).length : 0;
    this.stationBtn.classList.toggle("hidden", !near);
    if (near) this.stationBtn.textContent = `${near.label}: ${n} ${n === 1 ? "tarea" : "tareas"}`;
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  private updateCamera(): void {
    this.camera.position.set(this.pos.x, 1.6, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  private faceTowards(p: THREE.Vector3): void {
    const d = p.clone().sub(new THREE.Vector3(this.pos.x, 1.6, this.pos.z));
    this.yaw = Math.atan2(-d.x, -d.z);
    this.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  }

  private nearStation(): Station | undefined {
    return STATIONS.find((s) => s.stand.distanceTo(new THREE.Vector3(this.pos.x, 0, this.pos.z)) < 1.0);
  }

  private currentChores(): Chore[] {
    return this.habitat.chores(RECIPES, YOGA_SEQUENCES);
  }

  private openBoard(filter?: Station["id"]): void {
    const chores = this.currentChores().filter((c) => !filter || stationFor(c) === filter);
    const title = filter ? STATIONS.find((s) => s.id === filter)!.label : "Tareas a bordo";
    const items = chores
      .map(
        (c) => `<button class="chore" data-chore="${c.id}"><b>${c.title}</b><span>${c.scenario}</span><em>${c.exercises.length} retos</em></button>`,
      )
      .join("");
    this.board.innerHTML = `<div class="board-head"><b>${title}</b><button data-close>✕</button></div>${items || "<p>Nada pendiente aquí</p>"}`;
    this.board.classList.remove("hidden");
  }

  private goAndDo(chore: Chore): void {
    this.board.classList.add("hidden");
    const st = STATIONS.find((s) => s.id === stationFor(chore))!;
    let look = st.look.clone();
    let stand = st.stand.clone();
    if (chore.kind === "yoga") {
      stand = new THREE.Vector3(0, 0, -1.3);
      look = new THREE.Vector3(0, 0.8, 2.4);
    }
    const plantIdx = this.habitat.plants.findIndex((p) => p.id === chore.targetId);
    if (plantIdx >= 0) {
      const slot = POT_SLOTS[plantIdx % POT_SLOTS.length]!;
      stand = new THREE.Vector3(0.4, 0, slot.z);
      look = slot.clone().setY(1.05);
    }
    const cat = chore.targetId ? this.cats.get(chore.targetId) : undefined;
    if (cat) {
      cat.goTo(new THREE.Vector3(-1.1, 0, 2.9));
      look = new THREE.Vector3(-1.1, 0.2, 2.9);
    }
    this.walkTo = { pos: stand, look, then: () => this.startChore(chore) };
  }

  /**
   * While a chore is open, render only part of a larger frustum so the chore's target shows beside the
   * challenge sheet: above it in portrait (sheet at the bottom), left of it in landscape (sheet on the right).
   * Aspect and fov follow the full frustum so the scene keeps its normal scale.
   */
  private frameForSheet(on: boolean): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!on) {
      this.camera.aspect = w / h;
      this.camera.fov = 70;
      this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
      return;
    }
    const landscape = w > h;
    const fullW = landscape ? 1.44 * w : w;
    const fullH = landscape ? h : 1.6 * h;
    this.camera.aspect = fullW / fullH;
    this.camera.fov = (2 * Math.atan(Math.tan((35 * Math.PI) / 180) * (fullH / h)) * 180) / Math.PI;
    this.camera.setViewOffset(fullW, fullH, fullW - w, fullH - h, w, h);
    this.camera.updateProjectionMatrix();
  }

  private startChore(chore: Chore): void {
    this.frameForSheet(true);
    const session = this.habitat.start(chore, { recipes: RECIPES, yoga: YOGA_SEQUENCES });
    this.session = session;
    const run = session.run;
    if (chore.kind === "yoga") this.figure.pose("stand");
    this.duel.show(
      {
        get current() {
          return run.current;
        },
        get progress() {
          return run.step;
        },
        goal: run.steps,
        get lives() {
          return run.mistakesLeft;
        },
        maxLives: run.maxMistakes,
      },
      choreText(chore),
      (a) => ({ ok: session.answer(a) }),
    );
  }

  private endChore(): void {
    this.session = null;
    this.frameForSheet(false);
    this.figure.pose("stand");
  }

  private onEvent(e: HabitatEvent): void {
    if (e.type === "posture") {
      const seq = YOGA_SEQUENCES.find((s) => s.id === e.sequenceId);
      const p = seq?.postures.value[e.index];
      if (p) this.figure.pose(p.pose);
    }
    const text = EVENT_TEXT(this.habitat, e);
    if (text && this.active) {
      this.toast.textContent = text;
      this.toast.classList.add("on");
      this.toastUntil = performance.now() + 3000;
    }
  }

  private syncPanel(): void {
    const ship = this.habitat.ship;
    if (!ship) return;
    const key = ship.hullIntegrity.toFixed(3);
    if (key === this.panelKey) return;
    this.panelKey = key;
    drawPanel(this.panel, `class ${ship.design.hull.name.replace(/\s/g, "")}`, shipCode(ship.design).map((b) => b.pseudo), ship.hullIntegrity);
  }

  private renderHud(): void {
    const c = this.habitat.crew;
    const bar = (label: string, v: number, cls = "") => `<div class="bar ${cls}"><span>${label}</span><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div>`;
    const larder = ["lechuga-outredgeous", "chile-espanola"].map((k) => this.habitat.larder(k));
    this.hud.innerHTML = `
      <div class="ititle">Día ${Math.floor(this.dayClock) + 1} a bordo</div>
      ${bar("Saciedad", c.satiety)}${bar("Forma", c.fitness)}${bar("Calma", 1 - c.stress)}
      <div class="small">Despensa: ${larder[0]} lechuga · ${larder[1]} chile · ${this.habitat.meals} platos cocinados</div>`;
  }
}
