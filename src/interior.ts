import * as THREE from "three";
import type { Habitat, HabitatEvent, ChoreSession } from "@modules/habitat/application/habitat";
import { CHORE_CATEGORY, type Chore, type ChoreCategory } from "@modules/chores/domain/chore";

const CATEGORY_ORDER: readonly ChoreCategory[] = ["comida", "plantas", "animales", "salud", "nave", "misiones"];
const CATEGORY_LABEL: Readonly<Record<ChoreCategory, string>> = {
  comida: "Comida",
  plantas: "Plantas",
  animales: "Animales",
  salud: "Salud",
  nave: "Nave",
  misiones: "Misiones",
};
import { shipCode } from "@modules/chores/application/catalog";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { PROCESSES } from "@modules/kitchen/data/processes";
import { ITEMS } from "@modules/kitchen/data/items";
import { ANIMAL_LESSONS } from "@modules/pets/data/family-lessons";
import { PROTOCOLS } from "@modules/medical/data/protocols";
import type { MachineId } from "@modules/life-support/domain/machine";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { WORKOUTS } from "@modules/wellness/data/exercise";
import { CAT_BOUNDS, COOP, COOP_BOUNDS, crewEndBlocks, MACHINE_STATION, ROOM, STATIONS, POT_SLOTS, buildRoom, drawScreen, type RoomHandles, type Station } from "./adapters/three/interior/room";
import { HenModel } from "./adapters/three/interior/hen-model";
import { DogModel } from "./adapters/three/interior/dog-model";
import { DOOR, FARM, FARM_ROAM, buildFarmDeck, farmModels, type FarmPlantModel } from "./adapters/three/interior/farm-deck";
import { DOMENICA_HAIR, portrait } from "./ui/portraits";
import { PlantModel } from "./adapters/three/interior/plant-model";
import { CatModel } from "./adapters/three/interior/cat-model";
import { CubeFigure } from "./adapters/three/interior/figure";
import { Walker } from "./adapters/input/walker";
import type { DuelView, SessionText } from "./ui/duel-view";
import type { SpinRing } from "@modules/gravity/domain/spin-gravity";
import { GravityZones } from "./adapters/three/interior/zones";
import { ICON } from "./ui/icons";
import { KITCHEN_FRAMES, StepShow, type StepFrame } from "./adapters/three/interior/step-show";
import { choreVisuals } from "@modules/chores/application/step-visuals";
import type { StepVisual } from "@modules/chores/domain/step-visual";
import { AmbientNotices } from "./adapters/three/interior/ambient-notices";
import { NoticeQueue, type NoticeLevel } from "@modules/notices/domain/notices";

const CAT_COLORS = [0xd9822b, 0x2b2b2b, 0xe8e2d6, 0x8a8f99];
const HEN_COLORS = [0xb5651d, 0xf2efe6, 0x2a2a2a, 0xc98a4a];
const DOG_COLORS = [0xd9a066, 0x2a2420, 0xf0e2c8];
const CONTEXT = { recipes: RECIPES, yoga: YOGA_SEQUENCES, processes: PROCESSES, lessons: ANIMAL_LESSONS, workouts: WORKOUTS };
/** What each solved step looks like (docs/design/vida-a-bordo.md, «Pasos visibles»). */
const STEP_VISUALS = choreVisuals(CONTEXT);
/** Game days per real second while walking around (a day every ~40 s). Paused during a chore. */
const DAYS_PER_SECOND = 1 / 40;

const stationFor = (c: Chore): Station["id"] => {
  switch (c.kind) {
    case "yoga":
      return "yoga";
    case "ejercicio":
      return "ejercicio";
    case "reparar-nave":
      return "panel";
    case "alimentar-gato":
    case "calmar-gato":
      return "gatos";
    case "alimentar-perro":
    case "jugar-perro":
      return "perros";
    case "programar-animal":
      return c.id.includes("-perro-") ? "perros" : c.id.includes("-gallina-") ? "gallinero" : "gatos";
    default:
      if (c.targetId?.startsWith("bancal")) return "terreno";
      return c.machine ? MACHINE_STATION[c.machine as MachineId] : "huerto";
  }
};

const choreText = (c: Chore): SessionText => ({
  title: c.title,
  progress: c.kind === "yoga" ? "Posturas" : "Pasos",
  lives: "Intentos",
  order: c.kind === "programar-animal" ? "Ordena su programa" : "Ordena los pasos",
  submit: "Hacerlo",
  ok: c.kind === "yoga" ? "Entras en la postura" : c.kind === "cocinar" ? "Paso hecho" : "Bien hecho",
  bad: "Así no: inténtalo otra vez",
  sheet: true,
});

const EVENT_TEXT = (h: Habitat, e: HabitatEvent): string | undefined => {
  const who = (id: string) => h.patients.find((c) => c.id === id)?.name ?? id;
  switch (e.type) {
    case "plant-bitten":
      return `${who(e.catId)} ha mordisqueado una planta nueva`;
    case "cat-grass":
      return `${who(e.catId)} mordisquea su hierba en vez de las plantas`;
    case "cats-hissed":
      return `${who(e.a)} y ${who(e.b)} se han bufado`;
    case "cats-fought":
      return `¡${who(e.a)} y ${who(e.b)} se han peleado! Llévalos a la enfermería`;
    case "hens-stalked":
      return `${who(e.catId)} acecha a las gallinas`;
    case "injured":
      return `${who(e.patientId)} necesita la enfermería (${e.cause})`;
    case "machine-broken":
      return "Una máquina se ha averiado";
    case "culture-stage":
      return e.stage === "contaminado" || e.stage === "perdido" ? "¡El cultivo de carne se ha perdido!" : e.stage === "listo" ? "La carne cultivada está lista" : undefined;
    case "introduction-advanced":
      return `${who(e.newcomerId)} y ${who(e.residentId)}: ${e.stage.replace(/-/g, " ")}`;
    case "plant-died":
      return "Una planta se ha secado";
    case "jolt":
      return "¡Sacudida! Revisa plantas, animales, máquinas y nave";
    case "chore-done":
      return "Tarea hecha";
    case "hen-pecked-plant":
      return `${who(e.henId)} ha escarbado un plantón`;
    case "animal-hostile":
      return `${who(e.actorId)} ${e.action === "perseguir" ? "persigue" : e.action === "ladrar" ? "le ladra" : e.action === "picotear" ? "picotea" : "le bufa"} a ${who(e.targetId)}`;
    case "family-formed":
      return `¡${e.memberIds.map(who).join(" y ")} ya son familia!`;
    default:
      return undefined;
  }
};

/** Life on board that floats where it happens, only in view (docs/design/ingravidez.md, «Avisos»): who it happens to. */
const AMBIENT_WHO = (e: HabitatEvent): string | undefined => {
  switch (e.type) {
    case "plant-bitten":
    case "cat-grass":
    case "hens-stalked":
      return e.catId;
    case "cats-hissed":
      return e.a;
    case "hen-pecked-plant":
      return e.henId;
    case "animal-hostile":
      return e.actorId;
    case "introduction-advanced":
      return e.newcomerId;
    case "family-formed":
      return e.memberIds[0];
    default:
      return undefined;
  }
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The walkable habitat module: 3D scene, walking, stations and chores as code challenges. */
export class Interior {
  readonly scene = new THREE.Scene();
  // Far enough to see up the spoke to the axis (56 m).
  readonly camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 120);
  private readonly walker: Walker;
  private readonly plants: PlantModel[] = [];
  private readonly cats = new Map<string, CatModel>();
  private readonly hens = new Map<string, HenModel>();
  private readonly dogs = new Map<string, DogModel>();
  private readonly beds: FarmPlantModel[] = [];
  private hensOut = false;
  private readonly room: RoomHandles;
  private screensKey = "";
  private screensAt = 0;
  private cooking = false;
  private readonly radioBtn: HTMLButtonElement;
  private readonly figure = new CubeFigure();
  /** Doménica, seen from behind in third person. */
  private readonly avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
  private readonly avatarRig = new THREE.Group();
  /** Solved steps acted out at the station: Doménica's gesture and a small prop. */
  readonly steps = new StepShow();
  private stepTag = "";
  /** Floating labels hidden while a chore is framed (they are for finding your way, not for watching a step). */
  private hiddenLabels: THREE.Object3D[] = [];
  /** The open chore's step visual. */
  private visual: StepVisual | undefined;
  private thirdPerson = true;
  private stride = 0;
  private readonly viewBtn: HTMLButtonElement;
  private readonly panel: THREE.Mesh;
  private readonly ui: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly board: HTMLElement;
  private readonly stationBtn: HTMLButtonElement;
  private readonly toast: HTMLElement;
  private yaw = Math.PI;
  private pitch = -0.05;
  private pos = new THREE.Vector3(0, 0, -4.2);
  /** Spoke elevator, floating hub and spine, gravity readout (undefined without a ring). */
  readonly zones?: GravityZones;
  private walkTo: { pos: THREE.Vector3; look: THREE.Vector3; then: () => void } | null = null;
  private session: ChoreSession | null = null;
  private panelKey = "";
  /** The toast: the player's own notices first, alerts wait (H24). */
  private readonly notices = new NoticeQueue();
  private toastText = "";
  private readonly ambient: AmbientNotices;
  private dayClock = 0;
  active = false;
  /** Opens the flight deck's navigation page from the ring's navigation console (set by main.ts). */
  openNavConsole?: () => void;
  /** Opens the mission log from the radio (set by main.ts). */
  openMissions?: () => void;
  /** Opens the board with every task of the game (set by main.ts). */
  openAllTasks?: () => void;
  /** The general settings, opened sitting in lotus on the exercise corner's mat (set by main.ts). */
  openSettings?: () => void;
  private readonly matBtn: HTMLButtonElement;
  /** Sitting in lotus on the mat while the settings are open. */
  private lotus = false;

  constructor(
    root: HTMLElement,
    private readonly habitat: Habitat,
    private readonly duel: DuelView,
    ring?: SpinRing,
  ) {
    this.room = buildRoom();
    this.scene.add(this.room.group);
    this.scene.background = new THREE.Color(0x10141a);
    this.panel = this.room.panel;
    this.scene.add(buildFarmDeck());
    for (const m of farmModels(habitat.plants.filter((p) => p.isBed))) {
      this.beds.push(m);
      this.scene.add(m.root);
    }
    this.pots.forEach((p, i) => {
      const m = new PlantModel(p);
      m.root.position.copy(POT_SLOTS[i % POT_SLOTS.length]!);
      this.plants.push(m);
      this.scene.add(m.root);
    });
    habitat.cats.forEach((c, i) => {
      const m = new CatModel(c.id, CAT_COLORS[i % CAT_COLORS.length]!, CAT_BOUNDS);
      this.cats.set(c.id, m);
      this.scene.add(m.root);
    });
    habitat.hens.forEach((h, i) => {
      const m = new HenModel(h.id, HEN_COLORS[i % HEN_COLORS.length]!, COOP_BOUNDS);
      this.hens.set(h.id, m);
      this.scene.add(m.root);
    });
    habitat.dogs.forEach((d, i) => {
      const m = new DogModel(d.id, DOG_COLORS[i % DOG_COLORS.length]!, FARM_ROAM, d.young);
      this.dogs.set(d.id, m);
      this.scene.add(m.root);
    });
    const mat = new THREE.Group();
    mat.position.set(0.2, 0, 4.0);
    mat.rotation.y = -Math.PI / 2; // profile to the room, like a yoga teacher's side view
    mat.add(this.figure.root);
    // The demo figure only appears while a yoga session shows the postures.
    this.figure.root.visible = false;
    this.scene.add(mat);

    this.avatarRig.add(this.avatar.root);
    this.scene.add(this.avatarRig);
    this.scene.add(this.steps.root);
    this.walker = new Walker(root);
    this.ui = document.createElement("div");
    this.ui.className = "interior-ui hidden";
    this.ui.innerHTML = `<div class="ihud"></div><button class="tasks-btn">Tareas</button><button class="radio-btn">Radio<b></b></button><button class="view-btn">${ICON.eye}</button><div class="board hidden"></div><button class="station-btn hidden"></button><button class="mat-btn hidden">Sentarse en loto: ajustes</button><div class="toast"></div>`;
    root.appendChild(this.ui);
    this.hud = this.ui.querySelector(".ihud")!;
    // On phones the larder and self-sufficiency lines fold away: a tap on the status shows them (docs/design/ux-acciones.md).
    this.hud.addEventListener("click", () => this.hud.classList.toggle("open"));
    this.board = this.ui.querySelector(".board")!;
    this.stationBtn = this.ui.querySelector(".station-btn")!;
    this.toast = this.ui.querySelector(".toast")!;
    this.ambient = new AmbientNotices(this.ui);
    // «Tareas» lists every task of the game when main.ts wires the shared board (docs/design/habitaculo.md §Tareas).
    this.ui.querySelector(".tasks-btn")!.addEventListener("click", () => (this.openAllTasks ? this.openAllTasks() : this.openBoard()));
    this.matBtn = this.ui.querySelector(".mat-btn")!;
    this.matBtn.addEventListener("click", () => this.sitForSettings());
    this.radioBtn = this.ui.querySelector(".radio-btn")!;
    if (ring) this.zones = new GravityZones(this.ui, this.scene, ring, ROOM.halfL, ROOM.height, (t) => this.say(t));
    this.viewBtn = this.ui.querySelector(".view-btn")!;
    this.viewBtn.addEventListener("click", () => {
      this.thirdPerson = !this.thirdPerson;
      this.syncViewBtn();
    });
    this.syncViewBtn();
    this.radioBtn.addEventListener("click", () => this.openRadio());
    this.stationBtn.addEventListener("click", () => {
      const s = this.nearStation();
      if (s?.id === "navegacion" && this.openNavConsole) return this.openNavConsole();
      if (s?.id === "camarote") return this.openRadio();
      if (s) this.openBoard(s.id);
    });
    this.board.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-chore]");
      const letter = (e.target as HTMLElement).closest<HTMLElement>("[data-letter]");
      if (letter) return this.openLetter(letter.dataset.letter!);
      if ((e.target as HTMLElement).closest("[data-radio]")) return this.openRadio();
      if ((e.target as HTMLElement).closest("[data-missions]") && this.openMissions) {
        this.board.classList.add("hidden");
        return this.openMissions();
      }
      const cat = (e.target as HTMLElement).closest<HTMLElement>("[data-cat]");
      if (cat) {
        this.category = (cat.dataset.cat || null) as ChoreCategory | null;
        return this.openBoard(this.boardFilter);
      }
      if ((e.target as HTMLElement).closest("[data-close]")) this.board.classList.add("hidden");
      if (!t) return;
      const chore = this.currentChores().find((c) => c.id === t.dataset.chore);
      if (chore) this.goAndDo(chore);
    });
    this.duel.onClose = () => this.endChore();
    this.updateCamera();
  }

  /** Go inside; `at: "escotilla"` comes aboard through the docking hatch at the end of the spine. */
  enter(at?: "escotilla"): void {
    if (at === "escotilla" && this.zones) {
      this.zones.arriveAtHatch();
      // Facing back along the spine, towards the hub and the ring.
      this.yaw = Math.PI / 2;
      this.pitch = 0;
    }
    this.active = true;
    this.walker.enabled = true;
    if (this.zones) this.zones.enabled = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-interior");
  }

  exit(): void {
    this.active = false;
    this.walker.enabled = false;
    if (this.zones) this.zones.enabled = false;
    document.body.classList.remove("in-zero-g");
    this.ui.classList.add("hidden");
    this.board.classList.add("hidden");
    document.body.classList.remove("in-interior");
    // Leaving the module frees the step props (a chore can't be open out here).
    if (!this.session) this.steps.dispose();
  }

  resize(): void {
    this.frameForSheet(this.session !== null);
  }

  /** Called every frame, also while in the cockpit (time on board keeps running). */
  update(dt: number, days: number = dt * DAYS_PER_SECOND): void {
    const busy = this.session !== null;
    // In the cockpit she is weightless; inside, she feels the gravity of where she is.
    if (this.zones) this.habitat.crewGravityG = this.active ? this.zones.gravityG() : 0;
    if (!busy) {
      // `days`: life on board's pace, or the trip's if a compressed trip runs faster (docs/design/viajes.md).
      this.habitat.tick(days);
      this.dayClock += days;
    }
    for (const e of this.habitat.drainEvents()) this.onEvent(e);
    for (const l of this.habitat.mailbox?.drainNew() ?? []) this.say(l.channel === "llamada" ? `Llamada de ${l.from}` : `Carta de ${l.from}: ${l.subject}`, "alerta");
    if (!this.active) return;
    this.radioBtn.querySelector("b")!.textContent = this.habitat.mailbox?.unread ? String(this.habitat.mailbox.unread) : "";

    const zone = this.zones?.zone ?? "anillo";
    // In 0 g the arrow keys hop (arrow-pad.ts); on the ring they look around.
    this.walker.arrowsLook = zone !== "eje";
    if (zone !== "anillo") {
      // Off the ring: the zones move her (elevator or floating). A chore picked here takes her back down.
      if (this.walkTo) this.zones!.descend();
      const look = this.walker.look(dt);
      this.yaw += look.yaw;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch + look.pitch));
    } else if (this.walkTo) {
      // Between the module and the farm deck, walk through the doorway.
      let aim = this.walkTo.pos;
      const here = this.pos.z < ROOM.halfL;
      if (here !== aim.z < ROOM.halfL) {
        const near = new THREE.Vector3(0, 0, ROOM.halfL + (here ? -0.6 : 0.6));
        const inDoorway = Math.abs(this.pos.x) < 0.05 && Math.abs(this.pos.z - ROOM.halfL) <= 0.65;
        aim = inDoorway ? new THREE.Vector3(0, 0, ROOM.halfL + (here ? 0.65 : -0.65)) : near;
      }
      const to = aim.clone().sub(this.pos);
      const d = to.length();
      if (aim === this.walkTo.pos && d < 0.05) {
        const then = this.walkTo.then;
        this.faceTowards(this.walkTo.look);
        this.walkTo = null;
        then();
      } else if (d > 1e-6) {
        const step = Math.min(d, 2.2 * dt);
        this.pos.addScaledVector(to.normalize(), step);
        this.yaw = Math.atan2(-to.x, -to.z);
        this.stride += step * 4.2;
      }
    } else if (!busy) {
      const look = this.walker.look(dt);
      this.yaw += look.yaw;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + look.pitch));
      const m = this.walker.move();
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const prev = this.pos.clone();
      this.pos.addScaledVector(fwd, m.forward * 1.6 * dt).addScaledVector(right, m.right * 1.6 * dt);
      this.stride += prev.distanceTo(this.pos) * 4.2;
      this.clampWalk(prev);
    }
    this.zones?.update(dt, this.pos, this.yaw, this.pitch, this.walker.move(), busy || this.walkTo !== null);
    this.updateCamera(dt);
    this.syncStepTag();

    for (const p of this.plants) p.sync();
    for (const c of this.habitat.cats) {
      const m = this.cats.get(c.id);
      if (m) {
        m.stress = c.stress;
        m.update(dt);
      }
    }
    if (this.habitat.hensFree !== this.hensOut) {
      this.hensOut = this.habitat.hensFree;
      for (const m of this.hens.values()) {
        m.root.position.set(COOP.gateX, 0, COOP.z);
        m.setBounds(this.hensOut ? FARM_ROAM : COOP_BOUNDS);
      }
    }
    for (const h of this.habitat.hens) {
      const m = this.hens.get(h.id);
      if (m) {
        m.stress = h.stress;
        m.update(dt);
      }
    }
    for (const d of this.habitat.dogs) {
      const m = this.dogs.get(d.id);
      if (m) {
        m.stress = d.stress;
        m.update(dt);
      }
    }
    this.syncFamilies();
    for (const b of this.beds) b.sync();
    this.syncMachines();
    this.figure.update(dt);
    this.syncPanel();
    this.renderHud();
    const near = !busy && !this.walkTo && (this.zones?.zone ?? "anillo") === "anillo" ? this.nearStation() : undefined;
    const n = near ? this.currentChores().filter((c) => stationFor(c) === near.id).length : 0;
    this.stationBtn.classList.toggle("hidden", !near);
    this.matBtn.classList.toggle("hidden", near?.id !== "yoga" || !this.openSettings || this.lotus);
    if (near)
      this.stationBtn.textContent =
        near.id === "navegacion" ? "Consola de navegación: mapa, viajes y misiones" : near.id === "camarote" ? `Camarote: leer cartas${this.habitat.mailbox?.unread ? ` (${this.habitat.mailbox.unread})` : ""}` : `${near.label}: ${n} ${n === 1 ? "tarea" : "tareas"}`;
    this.syncNotices();
  }

  /** The toast from the queue, and the life-aboard labels where they happen (only on the ring, same side of the doorway). */
  private syncNotices(): void {
    const now = performance.now() / 1000;
    const n = this.notices.current(now);
    if (n && n.text !== this.toastText) this.toast.textContent = n.text;
    this.toastText = n?.text ?? "";
    this.toast.classList.toggle("on", !!n);
    const ring = (this.zones?.zone ?? "anillo") === "anillo";
    const camDeck = this.camera.position.z > ROOM.halfL;
    this.ambient.update(this.camera, (p) => ring && p.z > ROOM.halfL === camDeck, now);
  }

  private get pots() {
    return this.habitat.plants.filter((p) => !p.isBed);
  }

  private model(id: string): { root: THREE.Object3D; follow: THREE.Object3D | null } | undefined {
    return this.cats.get(id) ?? this.dogs.get(id) ?? this.hens.get(id);
  }

  /** The young follow whoever adopted them; other family members keep close to the first one. */
  private syncFamilies(): void {
    for (const f of this.habitat.families) {
      const lead = f.motherId ?? f.members[0]!.id;
      const leader = this.model(lead);
      if (!leader) continue;
      for (const m of f.members) {
        const mm = m.id === lead ? undefined : this.model(m.id);
        if (mm && !mm.follow) mm.follow = leader.root;
      }
    }
  }

  /** Inside the module, through the doorway, or on the farm deck; anything else is a wall. */
  private walkable(x: number, z: number): boolean {
    const room = z >= -ROOM.halfL + 0.4 && z <= ROOM.halfL - 0.4 && Math.abs(x) <= 1.25;
    const door = Math.abs(x) <= DOOR.halfW - 0.15 && z > 0 && z < ROOM.halfL + 0.6;
    const farm = z >= ROOM.halfL + 0.4 && z <= FARM.maxZ - 1.2 && x >= FARM.minX + 1.2 && x <= FARM.maxX - 1.2;
    const coop = Math.abs(x - COOP.x) < COOP.w / 2 + 0.2 && Math.abs(z - COOP.z) < COOP.d / 2 + 0.2;
    return (room || door || farm) && !coop && !crewEndBlocks(x, z) && !this.zones?.blocks(x, z);
  }

  private clampWalk(prev: THREE.Vector3): void {
    const p = this.pos;
    if (this.walkable(p.x, p.z)) return;
    if (this.walkable(p.x, prev.z)) p.z = prev.z;
    else if (this.walkable(prev.x, p.z)) p.x = prev.x;
    else p.copy(prev);
  }

  private syncViewBtn(): void {
    const label = this.thirdPerson ? "Vista: 3ª persona" : "Vista: 1ª persona";
    this.viewBtn.setAttribute("aria-label", label);
    this.viewBtn.title = label;
  }

  /** At the yoga mat: sit in lotus and open the general settings; standing up closes them. */
  sitForSettings(): void {
    if (!this.openSettings || this.session) return;
    const mat = STATIONS.find((x) => x.id === "yoga")!;
    const sit = () => {
      this.lotus = true;
      this.pos.set(0.2, 0, 3.9);
      this.yaw = 0;
      this.thirdPerson = true;
      this.syncViewBtn();
      this.openSettings?.();
    };
    this.walkTo = { pos: mat.stand.clone(), look: mat.look.clone(), then: sit };
  }

  /** The settings closed: she stands up from the mat. */
  standUp(): void {
    this.lotus = false;
  }

  /** The board's chores as plain facts for the shared task list (title, where, category). */
  choreFacts(): { id: string; title: string; detail: string; category: ChoreCategory; station: string }[] {
    return this.currentChores().map((c) => ({ id: c.id, title: c.title, detail: `${STATIONS.find((s) => s.id === stationFor(c))?.label ?? ""} · ${c.exercises.length} retos`, category: CHORE_CATEGORY[c.kind], station: stationFor(c) }));
  }

  /** Walk to a chore's machine and start it (from the shared task list's «Ir»). */
  doChore(id: string): boolean {
    const chore = this.currentChores().find((c) => c.id === id);
    if (!chore) return false;
    this.goAndDo(chore);
    return true;
  }

  /** Room, doorway or farm deck, with a margin from the walls (for the third-person camera). */
  private inside(x: number, z: number): boolean {
    const room = Math.abs(x) < ROOM.halfW - 0.15 && Math.abs(z) < ROOM.halfL - 0.15;
    const door = Math.abs(x) < DOOR.halfW - 0.1 && Math.abs(z - ROOM.halfL) < 0.3;
    const farm = x > FARM.minX + 0.3 && x < FARM.maxX - 0.3 && z > ROOM.halfL + 0.2 && z < FARM.maxZ - 0.3;
    return room || door || farm;
  }

  private updateCamera(dt = 1 / 60): void {
    if (this.session && this.steps.frame(dt, this.camera, this.avatarRig, this.avatar)) return;
    const third = this.thirdPerson && !this.session;
    this.avatarRig.visible = third;
    if (this.zones?.placeCamera(this.camera, this.avatarRig, this.avatar, this.yaw, this.pitch, third)) return;
    this.avatarRig.quaternion.identity();
    if (!third) {
      this.camera.position.set(this.pos.x, 1.6, this.pos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      return;
    }
    // Doménica walks where the player goes; the camera follows behind her shoulders.
    this.avatarRig.position.set(this.pos.x, 0, this.pos.z);
    this.avatarRig.rotation.y = this.yaw + Math.PI;
    const moving = this.walkTo !== null || this.walker.move().forward !== 0 || this.walker.move().right !== 0;
    if (this.lotus) this.avatar.pose("lotus");
    else if (moving) this.avatar.walk(this.stride, 1);
    else this.avatar.pose("stand");
    this.avatar.update(1 / 60, 10);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    const head = new THREE.Vector3(this.pos.x, 1.55, this.pos.z);
    let d = 2.0;
    const cam = new THREE.Vector3();
    for (; d > 0.35; d -= 0.1) {
      cam.copy(head).addScaledVector(dir, -d).add(new THREE.Vector3(0, 0.35, 0));
      const ceiling = cam.z > ROOM.halfL + 0.2 ? FARM.height - 0.3 : ROOM.height - 0.15;
      if (this.inside(cam.x, cam.z) && cam.y > 0.3 && cam.y < ceiling) break;
    }
    this.camera.position.copy(cam);
    this.camera.lookAt(head.clone().addScaledVector(dir, 1.2));
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
    return this.habitat.chores(RECIPES, YOGA_SEQUENCES, CONTEXT);
  }

  private boardFilter: Station["id"] | undefined;
  /** Category chosen in the task board's filter row (all when null). */
  private category: ChoreCategory | null = null;

  private openBoard(filter?: Station["id"]): void {
    const all = this.currentChores().filter((c) => !filter || stationFor(c) === filter);
    const counts = new Map<ChoreCategory, number>();
    for (const c of all) counts.set(CHORE_CATEGORY[c.kind], (counts.get(CHORE_CATEGORY[c.kind]) ?? 0) + 1);
    if (this.category && !counts.has(this.category)) this.category = null;
    const chores = all.filter((c) => !this.category || CHORE_CATEGORY[c.kind] === this.category);
    const title = filter ? STATIONS.find((s) => s.id === filter)!.label : "Tareas a bordo";
    const chip = (cat: ChoreCategory | null, label: string, n: number) =>
      `<button class="chip ${this.category === cat ? "on" : ""}" data-cat="${cat ?? ""}">${label} <small>${n}</small></button>`;
    const chips =
      counts.size > 1
        ? `<div class="chips">${chip(null, "Todas", all.length)}${CATEGORY_ORDER.filter((c) => counts.has(c))
            .map((c) => chip(c, CATEGORY_LABEL[c], counts.get(c)!))
            .join("")}</div>`
        : "";
    const items = chores
      .map(
        (c) => `<button class="chore" data-chore="${c.id}"><b>${c.title}</b><span>${c.scenario}</span><em>${c.exercises.length} retos</em></button>`,
      )
      .join("");
    this.boardFilter = filter;
    this.board.innerHTML = `<div class="board-head"><b>${title}</b><button data-close>✕</button>${chips}</div>${items || "<p>Nada pendiente aquí</p>"}`;
    this.board.classList.remove("hidden");
  }

  private goAndDo(chore: Chore): void {
    this.board.classList.add("hidden");
    // Picked from the hub or the spine: she has to go down the spoke first; say so, or the tap looks ignored.
    if ((this.zones?.zone ?? "anillo") !== "anillo") this.say(`Bajas al anillo para «${chore.title}»: el ascensor del radio tarda medio minuto`);
    const st = STATIONS.find((s) => s.id === stationFor(chore))!;
    let look = st.look.clone();
    let stand = st.stand.clone();
    if (chore.kind === "yoga") {
      stand = new THREE.Vector3(0, 0, 1.3);
      look = new THREE.Vector3(0, 0.8, 4.0);
    }
    const plantIdx = this.pots.findIndex((p) => p.id === chore.targetId);
    const bed = this.beds.find((b) => b.plant.id === chore.targetId);
    if (bed) {
      stand = bed.stand.clone();
      look = bed.root.position.clone().setY(0.5);
    } else if (plantIdx >= 0) {
      const slot = POT_SLOTS[plantIdx % POT_SLOTS.length]!;
      stand = new THREE.Vector3(0.3, 0, slot.z);
      look = slot.clone().setY(slot.y + 0.25);
    }
    const dog = chore.targetId ? this.dogs.get(chore.targetId) : undefined;
    if (dog && chore.kind === "atender-paciente") dog.goTo(new THREE.Vector3(-1.15, 0, 0.2));
    else if (dog) {
      dog.goTo(new THREE.Vector3(3.3, 0, 7.6));
      look = new THREE.Vector3(3.3, 0.15, 7.6);
    }
    // Free hens come over to the lawn by the doorway to be programmed or fed.
    const hen = chore.targetId ? this.hens.get(chore.targetId) : undefined;
    if (hen && this.habitat.hensFree && chore.kind !== "atender-paciente") {
      stand = new THREE.Vector3(0, 0, ROOM.halfL + 0.8);
      look = new THREE.Vector3(0.4, 0.15, ROOM.halfL + 1.6);
      hen.follow = null;
      hen.setBounds({ minX: 0.35, maxX: 0.45, minZ: ROOM.halfL + 1.55, maxZ: ROOM.halfL + 1.65 });
      setTimeout(() => hen.setBounds(FARM_ROAM), 15000);
    }
    const cat = chore.targetId ? this.cats.get(chore.targetId) : undefined;
    if (cat && chore.kind === "atender-paciente") {
      cat.goTo(new THREE.Vector3(-1.15, 0, 0.2));
    } else if (cat) {
      cat.goTo(new THREE.Vector3(-0.85, 0, 5.6));
      look = new THREE.Vector3(-0.85, 0.2, 5.6);
    }
    this.walkTo = { pos: stand, look, then: () => this.startChore(chore, stand, look) };
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
    // With Doménica acting the steps out, a phone's strip above the sheet takes a wider view (the whole counter).
    const half = !landscape && this.steps.framing ? 52 : 35;
    this.camera.fov = (2 * Math.atan(Math.tan((half * Math.PI) / 180) * (fullH / h)) * 180) / Math.PI;
    this.camera.setViewOffset(fullW, fullH, fullW - w, fullH - h, w, h);
    this.camera.updateProjectionMatrix();
  }

  private startChore(chore: Chore, stand?: THREE.Vector3, look?: THREE.Vector3): void {
    const frame = stand && look ? this.stepFrame(chore, stand, look) : undefined;
    if (frame) {
      this.steps.begin(frame);
      this.scene.traverse((o) => {
        if ((o as THREE.Sprite).isSprite && o.visible) this.hiddenLabels.push(o);
      });
      for (const l of this.hiddenLabels) l.visible = false;
    }
    this.frameForSheet(true);
    const session = this.habitat.start(chore, CONTEXT);
    this.cooking = chore.kind === "cocinar";
    this.session = session;
    const run = session.run;
    const visual = (this.visual = this.choreVisual(chore));
    if (chore.kind === "yoga") {
      this.figure.pose("stand");
      this.figure.root.visible = true;
    }
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
      (a) => {
        const index = run.step;
        const ok = session.answer(a);
        // A right answer acts the step out; the next one can be answered meanwhile (the queue speeds up).
        if (ok) visual.stepDone(index);
        return { ok };
      },
    );
    // «Paso a paso» in an order challenge: each right pick is a step done, acted out at once.
    this.duel.onRightPick = (id, slot) => {
      if (run.current?.id === id) visual.partDone?.(run.step, slot);
    };
  }

  /**
   * The chore's `StepVisual` (the port every challenge sheet uses): its solved steps acted out at the
   * station by Doménica (`StepShow`). Blocks already acted out pick by pick are not played again.
   */
  private choreVisual(chore: Chore): StepVisual {
    let picked = { index: -1, n: 0 };
    const acts = (i: number) => STEP_VISUALS.acts(chore, i) ?? [];
    return {
      stepDone: (index) => {
        if (this.steps.framing) this.steps.play(acts(index).slice(picked.index === index ? picked.n : 0));
        picked = { index: -1, n: 0 };
      },
      partDone: (index, part) => {
        const v = acts(index)[part];
        if (v && this.steps.framing) this.steps.play([v]);
        picked = { index, n: part + 1 };
      },
      finish: () => {},
      clear: () => this.steps.clear(),
    };
  }

  /**
   * How a chore's station is framed while its steps play: Doménica at the counter for the galley and the
   * mill (KITCHEN_FRAMES), otherwise beside her target with the camera over her shoulder. Yoga keeps its
   * demo figure on the mat (the posture is the step's visual), so it is not framed here.
   */
  private stepFrame(chore: Chore, stand: THREE.Vector3, look: THREE.Vector3): StepFrame | undefined {
    if (chore.kind === "yoga") return undefined;
    const st = stationFor(chore);
    if (st === "cocina" || st === "procesado") return { ...KITCHEN_FRAMES[st], target: look.clone() };
    const dir = new THREE.Vector3(look.x - stand.x, 0, look.z - stand.z);
    const d = dir.length();
    if (d < 1e-3) return undefined;
    dir.divideScalar(d);
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    // She stands just short of the target and a little to one side, so the camera sees both her and it.
    // On the farm deck the station's own stand is already at the bed's edge.
    const near = look.y < 0.5 ? 0.45 : 0.55;
    const feet = look.z > ROOM.halfL ? new THREE.Vector3(stand.x, 0, stand.z) : new THREE.Vector3(look.x, 0, look.z).addScaledVector(dir, -Math.min(d, near));
    const aside = feet.clone().addScaledVector(side, -0.3);
    if (this.inside(aside.x, aside.z)) feet.copy(aside);
    const cam = new THREE.Vector3();
    for (let back = 1.7; back > 0.4; back -= 0.1) {
      for (const k of [0.75, 0.4, 0]) {
        cam.set(look.x, 1.9, look.z).addScaledVector(dir, -back).addScaledVector(side, k * back);
        const ceiling = cam.z > ROOM.halfL + 0.2 ? FARM.height - 0.3 : ROOM.height - 0.15;
        if (this.inside(cam.x, cam.z) && cam.y < ceiling) break;
      }
      if (this.inside(cam.x, cam.z)) break;
    }
    const focus = new THREE.Vector3(look.x, look.y, look.z).lerp(new THREE.Vector3(feet.x, 0.9, feet.z), 0.3);
    return { stand: feet, yaw: Math.atan2(dir.x, dir.z), camera: cam, look: focus, target: look.clone() };
  }

  /** The step showing, on the UI root (`data-paso`, `data-pasos`): read by the experience suite. */
  private syncStepTag(): void {
    const tag = `${this.steps.current?.action ?? ""}|${this.steps.played}`;
    if (tag === this.stepTag) return;
    this.stepTag = tag;
    this.ui.dataset.paso = this.steps.current?.action ?? "";
    this.ui.dataset.pasos = String(this.steps.played);
  }

  private endChore(): void {
    this.session = null;
    this.duel.onRightPick = undefined;
    this.visual?.clear();
    this.visual = undefined;
    for (const l of this.hiddenLabels) l.visible = true;
    this.hiddenLabels.length = 0;
    this.cooking = false;
    this.frameForSheet(false);
    this.figure.pose("stand");
    this.figure.root.visible = false;
  }

  private onEvent(e: HabitatEvent): void {
    if (e.type === "posture") {
      const seq = YOGA_SEQUENCES.find((s) => s.id === e.sequenceId);
      const p = seq?.postures.value[e.index];
      if (p) this.figure.pose(p.pose);
    }
    const text = EVENT_TEXT(this.habitat, e);
    if (!text) return;
    const who = AMBIENT_WHO(e);
    const m = who ? this.model(who) : undefined;
    if (m) {
      if (this.active) this.ambient.add(text, () => m.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.55, 0)), performance.now() / 1000);
      return;
    }
    this.say(text, e.type === "chore-done" ? "jugador" : "alerta");
  }

  /** A notice in the toast: the player's own (default) come first; alerts wait their turn (H24). */
  private say(text: string, level: NoticeLevel = "jugador"): void {
    if (!this.active) return;
    this.notices.push(text, level, performance.now() / 1000);
  }

  /** The radio: Nevaeh's letters, newest first. */
  private openRadio(): void {
    const box = this.habitat.mailbox;
    const items = [...(box?.received ?? [])]
      .reverse()
      .map(
        (r) =>
          `<button class="chore ${r.read ? "" : "unread"}" data-letter="${r.letter.id}"><b>${esc(r.letter.subject)}</b><span>${r.letter.channel === "llamada" ? "Llamada de" : "De"} ${esc(r.letter.from)} · día ${Math.floor(r.day) + 1}</span>${
            r.letter.mission ? `<em>${r.missionDone ? "Misión hecha" : r.letter.mission.goal === "persuadir" ? "Misión de Nevaeh" : "Misión de la nano_net"}</em>` : ""
          }</button>`,
      )
      .join("");
    const log = this.openMissions ? `<button data-missions>Registro de misiones</button>` : "";
    this.board.innerHTML = `<div class="board-head"><b>Radio de la nave</b>${log}<button data-close>✕</button></div>${items || "<p>Sin cartas</p>"}`;
    this.board.classList.remove("hidden");
  }

  private openLetter(id: string): void {
    const box = this.habitat.mailbox;
    const r = box?.received.find((x) => x.letter.id === id);
    if (!box || !r) return;
    box.read(id);
    const l = r.letter;
    const example = l.example ? `<pre>${esc(l.example.pseudo)}\n<i>${esc(l.example.js)}</i></pre>` : "";
    // nano_net missions are flown: they are done landed on the core, from the cockpit.
    const action = l.mission ? (r.missionDone ? `<div class="done">✓ Misión hecha</div>` : `<div class="done mission"><b>${esc(l.mission.title)}</b><br>${esc(l.mission.where)}</div>`) : "";
    this.board.innerHTML = `<div class="board-head"><button data-radio>‹ Radio</button><button data-close>✕</button></div>
      <div class="letter">
        <div class="letter-head">${portrait(l.from)}<div><b>${esc(l.subject)}</b><small>${l.channel === "llamada" ? `Llamada de ${esc(l.from)} (transcripción)` : `De ${esc(l.from)} para ${esc(l.to)}`}</small></div></div>
        ${l.body.map((p) => `<p>${esc(p)}</p>`).join("")}${example}
        ${l.postscripts.map((p) => `<p class="ps">${l.channel === "llamada" ? "" : "P. D.: "}${esc(p)}</p>`).join("")}
        ${action}
      </div>`;
    this.board.classList.remove("hidden");
  }

  private syncPanel(): void {
    const ship = this.habitat.ship;
    if (!ship) return;
    const key = ship.hullIntegrity.toFixed(3);
    if (key === this.panelKey) return;
    this.panelKey = key;
    const hull = ship.hullIntegrity;
    drawScreen(this.panel, `class ${ship.design.hull.name.replace(/\s/g, "")}`, [
      ...shipCode(ship.design).map((b) => b.pseudo),
      `${hull < 0.999 ? "!" : "+"}casco = ${Math.round(hull * 100)} %`,
    ]);
  }

  /** Machine lamps, bioreactor tank and console, sickbay monitor, hob and nest eggs follow the domain. */
  private syncMachines(): void {
    const h = this.habitat;
    for (const m of h.machines) {
      const l = this.room.lamps.get(m.id);
      if (!l) continue;
      const mat = l.material as THREE.MeshStandardMaterial;
      const c = m.working ? 0x37e07a : performance.now() % 800 < 400 ? 0xff3030 : 0x401010;
      mat.color.setHex(c);
      mat.emissive.setHex(c);
    }
    const b = h.bioreactor;
    const med = this.room.medium;
    med.visible = b.stage !== "vacio";
    // Phenol red in the medium: pink at pH 7.4, orange and yellow as lactate acidifies it.
    const acid = Math.min(1, Math.max(0, (7.4 - b.ph) / 0.6));
    const mm = med.material as THREE.MeshStandardMaterial;
    mm.color.setHex(b.stage === "contaminado" || b.stage === "perdido" ? 0x8a7a50 : 0xff5a7a).lerp(new THREE.Color(0xf2c230), b.stage === "proliferando" ? acid : 0);
    med.scale.y = b.stage === "proliferando" ? 0.4 + 0.6 * Math.min(1, b.glucose + 0.3) : 1;
    med.position.y = 0.125 + 0.375 * med.scale.y;
    const hob = this.room.hob.material as THREE.MeshStandardMaterial;
    // Lit while cooking, brighter while a step heats the pan or the pot.
    hob.emissiveIntensity = this.cooking ? 0.6 + 1.2 * this.steps.heat + 0.3 * Math.sin(performance.now() / 120) : 0.15;
    const eggs = this.room.nestEggs;
    if (eggs.children.length !== Math.min(h.nestEggs, 8)) {
      eggs.clear();
      for (let i = 0; i < Math.min(h.nestEggs, 8); i++) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf3e3c8 }));
        e.scale.y = 1.3;
        const nestZ = COOP.z + (i < 4 ? -0.3 : 0.3);
        e.position.set(COOP.x + COOP.w / 2 - 0.22 + (i % 2) * 0.06, 0.53, nestZ + (i % 4 < 2 ? -0.05 : 0.05));
        eggs.add(e);
      }
    }
    const sci = (n: number) => (n > 0 ? n.toExponential(1).replace("e+", "·10^") : "0");
    const reactorLines = [
      `${b.stage === "contaminado" || b.stage === "perdido" ? "!" : "+"}fase: ${b.stage}`,
      `células: ${sci(b.cells)} (${b.doublings.toFixed(1)} duplicaciones)`,
      `${b.needsMedium ? "!" : ""}pH: ${b.ph.toFixed(2)}   glucosa: ${Math.round(b.glucose * 100)} %`,
      `temperatura: 37 °C   rinde: ${b.yieldG} g`,
      `medio: ${h.larder("medio-cultivo")} lotes   carne: ${h.larder("carne-cultivada")} g`,
    ];
    const patients = h.patients.flatMap((p) => p.health.conditions.map((c) => `${c.treated ? "+" : "!"}${p.name}: ${PROTOCOLS[c.kind].name.toLowerCase()} ${Math.round(c.severity * 100)} %${c.treated ? " (en recuperación)" : ""}`));
    const medLines = patients.length ? patients.slice(0, 7) : ["+Nadie en la enfermería", "Triaje: A·B·C·D·E", "Camilla, ecógrafo, desfibrilador", "Mesa veterinaria y botiquín"];
    const key = reactorLines.join("|") + medLines.join("|");
    if (key !== this.screensKey && performance.now() - this.screensAt > 400) {
      this.screensKey = key;
      this.screensAt = performance.now();
      drawScreen(this.room.reactorScreen, "Biorreactor", reactorLines);
      drawScreen(this.room.medScreen, "Enfermería", medLines);
    }
  }

  private renderHud(): void {
    const c = this.habitat.crew;
    const bar = (label: string, v: number, cls = "") => `<div class="bar ${cls}"><span>${label}</span><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div>`;
    const sus = this.habitat.sustainability;
    const name = (id: string) => this.habitat.patients.find((p) => p.id === id)?.name ?? id;
    const fam = this.habitat.families.map((f) => f.members.map((m) => name(m.id)).join(", ")).join(" · ");
    const larder = ITEMS.map((i) => [i, this.habitat.larder(i.id)] as const)
      .filter(([, n]) => n > 0)
      .map(([i, n]) => `${n}${i.unit === "g" ? " g" : ""} ${i.name}`)
      .join(" · ");
    this.hud.innerHTML = `
      <div class="ititle ihud-who">${portrait("Doménica")}<span>Doménica · día ${Math.floor(this.dayClock) + 1} a bordo</span></div>
      ${bar("Saciedad", c.satiety)}${bar("Forma", c.fitness)}${bar("Calma", 1 - c.stress)}${bar("Compañía", 1 - c.loneliness)}
      <div class="small more">Autosuficiencia: ${Math.round(sus.ratio * 100)} % (${Math.round(sus.areaM2)} de ${Math.round(sus.neededM2)} m² de cultivo)${fam ? ` · Familias: ${fam}` : ""}</div>
      <div class="small more">Despensa: ${larder || "vacía"} · ${this.habitat.meals} platos cocinados</div>${
        this.zones ? `<div class="small grav">${this.zones.hudLine()}${c.microgravityDays > 0.05 ? ` · ${c.microgravityDays.toFixed(1).replace(".", ",")} días en ingravidez` : ""}</div>` : ""
      }`;
  }
}
