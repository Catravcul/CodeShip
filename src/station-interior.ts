import type { ExerciseMotionData } from "@modules/body/domain/exercise-motion";
import type { CrewGear } from "./adapters/three/interior/crew-gear";
import { DOMENICA_HAIR } from "./ui/portraits";
import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { RailGraph } from "@modules/gravity/domain/handrails";
import { IVA, ivaStep, type IvaEvent, type IvaState, type IvaWorld } from "@modules/gravity/domain/iva";
import { HopGraph } from "@modules/gravity/domain/hops";
import { stationHandrails, stationPortals } from "@modules/station/data/handrails";
import type { CraftSpec, MachineId } from "@modules/station/domain/blueprint";
import type { PortUser } from "@modules/station/domain/structure";
import { FACE_NORMAL, faceToward, type Fixture, type StationInterior, type StationPanel } from "@modules/station/domain/interior";
import { buildStationRooms, crateModel, landerModel, probeModel, type StationRooms } from "./adapters/three/interior/station-rooms";
import { CubeFigure } from "./adapters/three/interior/figure";
import { Walker } from "./adapters/input/walker";
import { HopControl } from "./adapters/three/interior/hop-control";
import { buildRails, FloatingBody, motionLabel } from "./adapters/three/interior/zero-g-body";
import { StepShow, type StepFrame } from "./adapters/three/interior/step-show";
import { HatchLeaf } from "./adapters/three/interior/hatch-leaf";
import { auditStep, clearOfScene, hitOfScene, sightOfScene, type StepAudit } from "./adapters/three/interior/step-audit";
import type { StepAct, StepVisual } from "@modules/chores/domain/step-visual";
import type { AsanaData } from "@modules/body/domain/asana";
import type { EclssRackModel, RackState } from "./adapters/three/eclss-racks";
import { RootMenu } from "./ui/root-menu";
import { ICON } from "./ui/icons";
import { settings } from "./ui/settings-store";
import "./ui/lander-cabin.css";
import "./ui/station-interior.css";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** One action on a fixture's card (the first enabled one is the main one), as in the walkable rooms. */
export interface StationAction {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly why?: string;
}

/** How long her sleep is shown with the quarter's door shut (s): the night itself is not played out. */
const SLEEP_SHOWN_S = 8;
/** A folding door takes this long to shut or fold open (s). */
const DOOR_MOVE_S = 1.2;
const PANEL_NAME: Readonly<Record<StationPanel, string>> = { materiales: "Materiales", planos: "Planos", fabricacion: "Fabricación", hangar: "Hangar", importar: "Importar", propelente: "Planta de propelente", vida: "Vida" };
const FACE_LABEL = { suelo: "el suelo", techo: "el techo", babor: "babor", estribor: "estribor", proa: "proa", popa: "popa" } as const;
/** Body margin from the walls while floating, m. */
const BODY = 0.3;
/** Game value: seconds to empty or fill the airlock (on the ISS it takes hours with the prebreathe). */
const CYCLE_S = 2.5;
/** Floating through a hatch's opening, s (game value: about a metre at a gentle push). */
const FLOAT_THROUGH_S = 0.9;
const CABIN_KPA = 101.3;
/** Game value: the cabin air drifts aft at 0,1 m/s (ventilation, within NASA-STD-3001 V2 6107's 0,08–0,61 m/s). */
const AIR = new Vec3(0, 0, 0.1);
const num = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
/** At a machine or the galley she holds herself by the foot loops this far below its front's centre (m): her hands at it… */
const WORK_DROP = 1.0;
/** …and this far out from its front (m, her feet). */
const WORK_OFF = 0.75;

export interface StationInteriorDeps {
  /** Machines working right now (their lamps glow). */
  busy(): ReadonlySet<MachineId>;
  /** Spare parts by id and the crafts kept in the hangar. */
  store(): { parts: readonly [string, number][]; crafts: readonly CraftSpec[] };
  partName(id: string): string;
  /** Open a tab of the station's task screen. */
  openPanel(panel: StationPanel): void;
  /** Open the ship bay (its console in node 2, or B). */
  openBay(): void;
  /** Leave through a docking hatch; returns why not, if she cannot. */
  leave(to: PortUser): string | void;
  /** Why she cannot leave through a docking hatch now (nothing docked there, the lander in the hangar…). */
  cannotLeave(to: PortUser): string | undefined;
  /** The whole game's task list (the same one as in the mothership and the lander). */
  openTasks(): void;
  /** Actions of the crew areas and the hangar's console (main.ts knows the larder, the arm and the settings). */
  actions(f: Fixture): StationAction[];
  act(f: Fixture, action: string): void;
  /** The lander is berthed in the hangar (drawn on its cradle). */
  landerInHangar(): boolean;
  /** Look out at the dry dock through the window of the mothership's docking hatch (docs/design/dique-seco.md). */
  lookOut?(): void;
  /**
   * Life support (docs/design/soporte-vital.md): the readout shown on a rack's card while she looks at it
   * (HTML, HUD style) and each rack's lamp. Its actions come through `actions`/`act` like the crew areas'.
   */
  readout?(f: Fixture): string | undefined;
  rackState?(f: Fixture): { state: RackState; broken?: string };
}

/** Icon of each kind of fixture on its card. */
const ICON_OF = (f: Fixture, locked: boolean): string => {
  const a = f.action;
  if (a.kind === "puerta" || a.kind === "salir") return locked ? ICON.locked : ICON.door;
  if (a.kind === "tripulacion") return { cocina: ICON.food, camarotes: ICON.bed, aseo: ICON.wash, ejercicio: ICON.exercise, esterilla: ICON.mat }[a.area];
  if (a.kind === "bahia" || a.kind === "bishop") return ICON.hangar;
  if (a.kind === "brazo") return ICON.eye;
  if (a.kind === "esclusa") return ICON.suit;
  if (a.kind === "panel" || a.kind === "consola") return ICON.machine;
  if (a.kind === "soporte-vital") return a.rack === "incendios" ? ICON.info : ICON.machine;
  return ICON.info;
};

/**
 * Inside the station: Doménica floats (the station does not spin) through the ISS's US segment: Harmony,
 * Destiny, Unity, Tranquility, Quest, Columbus and Kibo (docs/design/estacion-real.md). Same handrail
 * movement as the mothership's spine; machines open their tab of the station screen.
 */
export class StationInteriorMode {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.03, 2500);
  private rooms: StationRooms;
  private readonly walker: Walker;
  private readonly avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
  private readonly suit = new CubeFigure(0xf2f2f2, 0xe9ecef);
  private readonly rig = new THREE.Group();
  private readonly ui: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly card: HTMLElement;
  private readonly menu: RootMenu;
  private readonly viewBtn: HTMLButtonElement;
  private readonly toast: HTMLElement;
  private cardKey = "";
  private readoutKey = "";
  private framing: { eye: THREE.Vector3; target: THREE.Vector3; above: number } | null = null;
  /** While she goes through a hatch: a camera a little off, that sees her and the leaf swing. */
  private hatchView: { eye: THREE.Vector3; target: THREE.Vector3 } | null = null;
  /** A hop to a fixture asked by the task list or a door, and what to do on arrival. */
  private arrival: { poi?: string; point?: string; then?: () => void } | null = null;
  /** Sitting in lotus on the mat (the settings are open). */
  lotus = false;
  /** The leaves of the hatches she opens to leave (docking hatches, Starship's hatch to the flight deck). */
  private readonly leaves = new Map<string, HatchLeaf>();
  /**
   * Going through a hatch (docs/design/reglas.md §3.1): the leaf swings open, she floats through the
   * opening, then `then` (out: the next room), or (in) she floats in from it and it shuts behind her.
   */
  private passing: { id: string; out: boolean; t: number; from: Vec3; stand?: Vec3; opening?: number; to: Vec3; then?: () => void } | null = null;
  /** Crew quarters' folding doors: how shut each is (0 open … 1 shut) and where it is going, by volume id. */
  private readonly doorShut = new Map<string, { at: number; to: number }>();
  /** The crew quarter she is asleep in (its door shut), when she wakes (performance.now, ms) and what then. */
  private sleeping: { volume: string; until: number; then?: () => void } | null = null;
  private readonly keys = new Set<string>();
  private p = Vec3.ZERO;
  /** How she moves about: holding rails, pushing off, gliding (docs/design/ingravidez.md). */
  private iva: IvaState = { position: Vec3.ZERO, velocity: Vec3.ZERO, motion: { kind: "deriva" } };
  private graph!: RailGraph;
  private hops!: HopGraph;
  private hopsSuited = false;
  private world!: IvaWorld;
  private railMesh: THREE.Group | null = null;
  private readonly body: FloatingBody;
  private readonly hop: HopControl;
  private yaw = 0;
  private pitch = 0;
  /** First person unless the settings say otherwise; the eye toggles it for the visit. */
  private thirdPerson = settings.value.walkView === "tercera";
  private toastUntil = 0;
  private storeKey = "";
  private hudKey = "";
  private near: Fixture | undefined;
  private tap: { id: number; x: number; y: number; t: number } | null = null;
  /** Airlock: emptied with her suited (outer hatch open) or at cabin pressure; `cycling` counts down. */
  suited = false;
  private cycling = 0;
  /** Which port she came in by (the hatch that takes her back). */
  from: PortUser = "sonda";
  active = false;
  /**
   * Solved steps acted out at a fixture (the galley, a machine): Doménica in its foot loops, a small prop
   * per step (step-show.ts), the camera over her shoulder in the strip above the sheet. Drawn at the
   * station's own scale: the rooms and machines are MACHINE_SCALE (1,5) times real, she is real size.
   */
  readonly steps = new StepShow();

  constructor(
    root: HTMLElement,
    public interior: StationInterior,
    private readonly deps: StationInteriorDeps,
    /**
     * Another 0 g interior on the same engine (Starship's decks): its own class prefix (so the station's
     * selectors keep finding one card), the name on the HUD and the line said on coming in.
     */
    private readonly look: {
      readonly prefix?: string;
      readonly place?: string;
      readonly entered?: (from: PortUser) => string;
      /** Fixtures besides the docking hatches («salir») that are hatches she opens to go through (Starship's to the flight deck). */
      readonly hatches?: readonly string[];
    } = {},
  ) {
    const P = look.prefix ?? "sti";
    this.scene.background = new THREE.Color(0x05070c);
    this.rooms = buildStationRooms(interior.plan);
    this.scene.add(this.rooms.group);
    this.hop = new HopControl(root, this.scene);
    this.buildRails();
    this.buildLeaves();
    this.avatar.pose("float");
    this.suit.pose("float");
    this.rig.add(this.avatar.root, this.suit.root);
    this.scene.add(this.rig);
    this.scene.add(this.steps.root);
    this.steps.clearOf = clearOfScene(this.scene, [this.steps.root, this.rig]);
    this.body = new FloatingBody(this.rig);
    this.walker = new Walker(root, { move: `${P}-move`, look: `${P}-look`, moveLabel: "Mover" });
    this.walker.arrowsLook = false;
    this.ui = document.createElement("div");
    this.ui.className = `room-ui ${P}-ui hidden`;
    this.ui.innerHTML = `<div class="cab-where ${P}-hud"></div><div class="cab-machine ${P}-card hidden" role="region" aria-label="Lo que tienes delante"></div><div class="cab-toast ${P}-toast"></div>`;
    root.appendChild(this.ui);
    this.hud = this.ui.querySelector(`.${P}-hud`)!;
    this.card = this.ui.querySelector(`.${P}-card`)!;
    this.toast = this.ui.querySelector(`.${P}-toast`)!;
    // The same root icons as the lander's cabin and the bridge: view and tasks pinned.
    this.menu = new RootMenu(this.ui, `cab-menu ${P}-menu`, "Más", ICON.root);
    this.viewBtn = this.menu.add({ className: `${P}-view`, icon: ICON.eye, label: "Vista: 1ª persona", key: "V", pinned: true }, () => {
      this.thirdPerson = !this.thirdPerson;
      this.syncView();
    });
    this.menu.add({ className: `${P}-tasks`, icon: ICON.tasks, label: "Tareas", key: "T", pinned: true }, () => this.deps.openTasks());
    this.syncView();
    this.card.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
      if (b && !b.disabled && this.near) this.run(this.near, b.dataset.act!);
    });
    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
      if (e.repeat || document.body.classList.contains("in-tasks") || document.body.classList.contains("in-settings")) return;
      if (e.code === "Enter" && this.near) this.use(this.near, true);
      if (e.code === "KeyV") this.viewBtn.click();
      if (e.code === "KeyT") this.deps.openTasks();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    // A short tap on a machine or rack uses it (dragging looks around).
    root.addEventListener("pointerdown", (e) => {
      // While the task list's travel moves her, a tap does not send her elsewhere (dragging still looks).
      if (!this.active || (e.target as HTMLElement).tagName !== "CANVAS" || document.body.classList.contains("in-journey")) return;
      this.tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    });
    window.addEventListener("pointerup", (e) => {
      const t = this.tap;
      this.tap = null;
      if (!this.active || !t || t.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 || performance.now() - t.t > 450) return;
      this.pick(e.clientX, e.clientY);
    });
  }

  /**
   * The station grew (a module berthed, equipment installed or swapped): build the rooms again from
   * the new interior. She stays where she is.
   */
  rebuild(interior: StationInterior): void {
    this.scene.remove(this.rooms.group);
    this.rooms.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.interior = interior;
    this.rooms = buildStationRooms(interior.plan);
    this.scene.add(this.rooms.group);
    this.storeKey = "";
    this.near = undefined;
    this.buildRails();
    this.buildLeaves();
    // Hold on to the nearest landing point of the new layout.
    this.iva = this.holdNearest(this.iva.position);
    this.p = this.iva.position;
  }

  /** Handrails of the current layout (every module corridor gets its rows; docs/design/ingravidez.md). */
  private buildRails(): void {
    if (this.railMesh) {
      this.scene.remove(this.railMesh);
      this.railMesh.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
    }
    const plan = this.interior.plan;
    this.graph = new RailGraph(stationHandrails(plan));
    this.railMesh = buildRails(this.graph.rails);
    this.scene.add(this.railMesh);
    this.world = {
      graph: this.graph,
      fits: (q) => this.interior.fits(q, BODY, this.suited),
      air: (q) => (this.interior.pressurisedAt(q, this.suited) ? AIR : Vec3.ZERO),
      portals: plan.volumes.filter((v) => v.kind === "escotilla" || v.kind === "esclusa").map((v) => v.centre),
    };
    this.buildHops();
  }

  /** Landing points and hops (docs/design/ingravidez.md, «Fase C: flechas»); what fits depends on the suit, so rebuilt with it. */
  private buildHops(): void {
    this.hops = new HopGraph(this.graph, (q) => this.interior.fits(q, BODY, this.suited), stationPortals(this.interior.plan));
    this.hopsSuited = this.suited;
    this.hop.setGraph(this.hops);
    this.hop.onArrive = (id) => {
      const f = this.hops.points.find((p) => p.id === id)?.poi;
      const a = this.arrival;
      if (a && (a.point === id || (a.poi && a.poi === f))) {
        this.arrival = null;
        return a.then?.();
      }
      if (f) this.say(`${this.interior.fixture(f)?.label ?? f}: ya estás aquí`);
    };
  }

  /** Hop by herself to a fixture's grab point, then `then` (the task list's «Ir», the experience suite). */
  goToFixture(id: string, then?: () => void): boolean {
    if (this.sleeping) this.wake();
    const at = this.hops.poiPoint(id);
    if (!at) return false;
    if (this.hop.holding(this.iva)?.id === at.id) {
      then?.();
      return true;
    }
    this.arrival = { poi: id, ...(then ? { then } : {}) };
    return this.hop.goTo(at.id);
  }

  /** A leaf for every hatch she opens to leave (the docking hatches and `look.hatches`). */
  private buildLeaves(): void {
    for (const l of this.leaves.values()) this.scene.remove(l.root);
    this.leaves.clear();
    for (const f of this.interior.plan.fixtures) {
      if (f.action.kind !== "salir" && !this.look.hatches?.includes(f.id)) continue;
      const n = FACE_NORMAL[f.face];
      const dims = [f.size.x, f.size.y, f.size.z].sort((a, b) => b - a);
      const leaf = new HatchLeaf(new THREE.Vector3(f.at.x, f.at.y, f.at.z), new THREE.Vector3(-n.x, -n.y, -n.z), Math.max(0.6, Math.min(1.6, dims[1]!)));
      this.leaves.set(f.id, leaf);
      this.scene.add(leaf.root);
    }
  }

  /** Whether a fixture is a hatch with a leaf (for the journey and checks). */
  hasLeaf(id: string): boolean {
    return this.leaves.has(id);
  }

  /** How open a hatch's leaf is, 0–1 (for checks). */
  leafOpen(id: string): number {
    return this.leaves.get(id)?.open ?? 0;
  }

  /** Going through a hatch now. */
  get throughHatch(): boolean {
    return this.passing !== null;
  }

  /**
   * Out through a hatch: she gets to its grab point if she is not there, opens the leaf, floats through
   * the opening and then `then` (the next room comes in). A fixture with no leaf: `then` at once.
   */
  passHatch(id: string, then: () => void): void {
    const f = this.interior.fixture(id);
    const leaf = this.leaves.get(id);
    if (!f || !leaf) return then();
    if (this.heldFixture() !== id && this.hops.poiPoint(id) && this.goToFixture(id, () => this.passHatch(id, then))) return;
    const n = FACE_NORMAL[f.face];
    this.hop.cancel();
    leaf.target = 1;
    // Back off a little from the hatch so its leaf is seen swinging (it fills the view from the grab point).
    const at = new Vec3(f.at.x, f.at.y, f.at.z);
    const stand = [1.4, 1.1, 0.8].map((d) => at.sub(n.scale(d))).find((q) => this.interior.fits(q, 0.2, this.suited)) ?? this.p;
    this.passing = { id, out: true, t: 0, from: this.p, stand, to: at.sub(n.scale(0.12)), then };
    this.hatchView = this.viewOfHatch(at, n);
    // Look at the hatch she opens (a roof hatch is overhead).
    this.lookAt(new Vec3(f.at.x, f.at.y, f.at.z));
    this.card.classList.add("hidden");
    this.cardKey = "";
    this.say(`Abres la escotilla: ${f.label}`);
  }

  /**
   * Where to watch a hatch from while she goes through: back from it into the room and to one side, the
   * first spot that is inside the room (never through a wall).
   */
  private viewOfHatch(at: Vec3, n: Vec3): { eye: THREE.Vector3; target: THREE.Vector3 } {
    const a = Math.abs(n.y) > 0.7 ? new Vec3(1, 0, 0) : new Vec3(0, 1, 0);
    const b = n.cross(a).normalize();
    const tries: Vec3[] = [];
    for (const d of [2.6, 2.0, 1.5])
      for (const [u, v] of [
        [0.9, 0.6],
        [-0.9, 0.6],
        [0.9, -0.6],
        [-0.9, -0.6],
        [0, 0],
      ] as const)
        tries.push(at.sub(n.scale(d)).add(a.scale(u)).add(b.scale(v)));
    const eye = tries.find((q) => this.interior.fits(q, 0.15, this.suited)) ?? at.sub(n.scale(1));
    const target = at.sub(n.scale(0.3));
    return { eye: new THREE.Vector3(eye.x, eye.y, eye.z), target: new THREE.Vector3(target.x, target.y, target.z) };
  }

  /** The middle of a hatch fixture. */
  private leafCentre(id: string): Vec3 {
    const f = this.interior.fixture(id)!;
    return new Vec3(f.at.x, f.at.y, f.at.z);
  }

  /** Turn the view towards a point. */
  private lookAt(q: Vec3): void {
    const d = q.sub(this.p);
    const len = d.length();
    if (len < 1e-6) return;
    if (Math.hypot(d.x, d.z) > 0.05 * len) this.yaw = Math.atan2(-d.x, -d.z);
    this.pitch = Math.max(-1.45, Math.min(1.45, Math.asin(d.y / len)));
  }

  /** In through a hatch: the leaf open behind her, she floats in from the opening, and it shuts. */
  arriveThrough(id: string): void {
    const f = this.interior.fixture(id);
    const leaf = this.leaves.get(id);
    if (!f || !leaf) return;
    for (const l of this.leaves.values()) l.set(0);
    leaf.set(1);
    const n = FACE_NORMAL[f.face];
    const to = this.iva.position;
    this.passing = { id, out: false, t: 0, from: new Vec3(f.at.x, f.at.y, f.at.z).sub(n.scale(0.12)), to };
    this.hatchView = this.viewOfHatch(new Vec3(f.at.x, f.at.y, f.at.z), n);
    this.p = this.passing.from;
  }

  /** One frame of going through a hatch; true while it lasts (input and hops wait). */
  private stepHatch(dt: number): boolean {
    for (const l of this.leaves.values()) l.update(dt);
    const g = this.passing;
    if (!g) return false;
    this.card.classList.add("hidden");
    const leaf = this.leaves.get(g.id);
    // Out: first the leaf opens, then she floats through. In: she floats in, then it shuts.
    if (g.out && leaf && leaf.open < 0.98) {
      // While it swings, she eases back to where it is seen whole.
      g.opening = (g.opening ?? 0) + dt;
      if (g.stand) {
        const k = Math.min(1, g.opening / 0.6);
        this.p = g.from.add(g.stand.sub(g.from).scale(k * k * (3 - 2 * k)));
        this.iva = { ...this.iva, position: this.p };
        this.lookAt(this.leafCentre(g.id));
      }
      this.placeCamera();
      return true;
    }
    if (g.out && g.stand && g.t === 0) g.from = this.p;
    g.t += dt;
    const k = Math.min(1, g.t / FLOAT_THROUGH_S);
    const e = k * k * (3 - 2 * k);
    this.p = g.from.add(g.to.sub(g.from).scale(e));
    this.iva = { ...this.iva, position: g.out || k < 1 ? this.p : this.iva.position };
    this.placeCamera();
    if (k < 1) return true;
    this.passing = null;
    this.hatchView = null;
    if (g.out) {
      // Shut behind her once she is through (the room is hidden by then; it is shut when she comes back).
      leaf?.set(0);
      g.then?.();
    } else if (leaf) leaf.target = 0;
    return false;
  }

  /**
   * Put her at a fixture's grab point at once (coming in from another vehicle through the task list,
   * as the cabin's `enter(spot)`; the experience suite's setup). In the hangar she arrives suited.
   */
  placeAt(id: string): boolean {
    if (this.sleeping) this.wake();
    const q = this.hops.poiPoint(id);
    if (!q) return false;
    const suited = this.interior.volumeAt(q.body)?.kind === "hangar";
    if (suited !== this.suited) {
      this.suited = suited;
      this.cycling = 0;
      this.buildHops();
      return this.placeAt(id);
    }
    this.hop.cancel();
    this.arrival = null;
    // Placed straight there (teleport, chosen by the player): a hatch she was coming in through shuts behind her.
    if (this.passing && !this.passing.out) {
      this.leaves.get(this.passing.id)?.set(0);
      this.passing = null;
      this.hatchView = null;
    }
    this.iva = { position: q.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: q.rail, t: q.t, hands: 0 } };
    this.p = q.body;
    this.body.reset();
    const f = this.interior.fixture(id);
    if (f) {
      const n = FACE_NORMAL[f.face];
      this.yaw = Math.abs(n.y) > 0.5 ? this.yaw : Math.atan2(-n.x, -n.z);
      this.pitch = n.y < -0.5 ? -0.9 : n.y > 0.5 ? 0.9 : -0.15;
    }
    return true;
  }

  /** The area she is in (a volume id). */
  where(): string | undefined {
    return this.interior.volumeAt(this.p)?.id;
  }

  /** The fixture whose grab point she holds, or the one within reach. */
  nearFixture(): string | undefined {
    return this.near?.id;
  }

  /** Through a door: hop to the nearest handhold on the other side. */
  private through(f: Fixture): void {
    if (f.action.kind !== "puerta") return;
    const to = this.interior.volume(f.action.to)!;
    const hatch = this.interior.volume(f.action.hatch)!;
    const inTo = this.hops.points.filter((p) => this.interior.volumeAt(p.body)?.id === to.id && !p.poi);
    const best = inTo.sort((a, b) => a.body.sub(hatch.centre).length() - b.body.sub(hatch.centre).length())[0];
    if (!best || !this.hop.goTo(best.id)) return this.say(`No llegas a ${to.label} desde aquí`);
    this.arrival = { point: best.id, then: () => this.say(`${to.code} · ${to.label}`) };
    this.say(`Pasas por la escotilla a ${to.label}`);
  }

  /** The fixture whose grab point she holds, if any. */
  heldFixture(): string | undefined {
    return this.hop.holding(this.iva)?.poi;
  }

  /** Whether she is hopping by herself to a chosen point. */
  get routing(): boolean {
    return this.hop.routing;
  }

  /** Stop a chain of hops where she is (she still catches the next hold). */
  stopHops(): void {
    this.hop.cancel();
  }

  /** The landing point she holds, or the nearest one (to plan a journey from where she is). */
  pointNow(): string | undefined {
    return (this.hop.holding(this.iva) ?? this.hops.nearest(this.iva.position))?.id;
  }

  /**
   * Out through a docking hatch (the task list's travel): she opens it and goes through, then the next
   * vehicle comes in and `through`; returns why not, if she cannot.
   */
  exitBy(to: PortUser, through?: () => void): string | void {
    if (this.suited) return "Primero vuelve a la esclusa y quítate el traje";
    const why = this.deps.cannotLeave(to);
    if (why) return why;
    const f = this.interior.plan.fixtures.find((x) => x.action.kind === "salir" && x.action.to === to);
    const go = () => {
      const no = this.deps.leave(to);
      if (no) this.say(no);
      else through?.();
    };
    if (f) this.passHatch(f.id, go);
    else go();
  }

  /** Holding the landing point nearest to p. */
  private holdNearest(p: Vec3): IvaState {
    const q = this.hops.nearest(p);
    if (!q) return { position: p, velocity: Vec3.ZERO, motion: { kind: "deriva" } };
    return { position: q.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: q.rail, t: q.t, hands: 0 } };
  }

  /** Come in through the hatch of the port the ship is docked at. */
  enter(from: PortUser): void {
    this.thirdPerson = settings.value.walkView === "tercera";
    this.syncView();
    const e = this.interior.plan.entries[from];
    this.from = from;
    this.iva = this.holdNearest(e.at);
    this.p = this.iva.position;
    this.body.reset();
    this.suited = false;
    this.cycling = 0;
    this.yaw = Math.atan2(-e.facing.x, -e.facing.z);
    this.pitch = from === "sonda" ? 0.05 : 0;
    this.resume();
    // In through the docking hatch of that side: open behind her, it shuts once she is in.
    const hatch = this.interior.plan.fixtures.find((f) => f.action.kind === "salir" && f.action.to === from);
    if (hatch) this.arriveThrough(hatch.id);
    if (this.look.entered) return this.say(this.look.entered(from));
    this.say(from === "sonda" ? "Entras desde el módulo de aterrizaje por el suelo del Nodo 2. Aquí no hay gravedad: el techo es «arriba» en toda la estación" : "Entras desde la nodriza por proa del Nodo 2. Aquí no hay gravedad: el techo es «arriba»");
  }

  /** Show it again after the station screen (same place). */
  resume(): void {
    this.active = true;
    this.walker.enabled = true;
    this.ui.classList.remove("hidden");
    document.body.classList.add("in-station-interior");
    // Its own class too: the station and Starship share the engine, and each look stick shows only with its own
    // interior (the station's, later in the page, sat on top of Starship's and took its drags).
    document.body.classList.add(`in-${this.look.prefix ?? "sti"}-interior`);
    this.resize();
  }

  /** Hide it (to open the station screen, or to leave). */
  suspend(): void {
    if (this.sleeping) this.wake();
    this.active = false;
    this.walker.enabled = false;
    this.ui.classList.add("hidden");
    this.hop.hide();
    document.body.classList.remove("in-station-interior", `in-${this.look.prefix ?? "sti"}-interior`);
  }

  resize(): void {
    this.frameForSheet(this.steps.framing);
  }

  /**
   * The step visual of a chore done at fixture `id` (the galley, a machine): she goes to its foot loops
   * and each solved step plays there; `acts(i)` are step i's acts. Undefined when the fixture is not on a
   * wall (nothing to stand at).
   */
  stepVisual(id: string, acts: (index: number) => readonly StepAct[]): StepVisual | undefined {
    const f = this.interior.fixture(id);
    const frame = f && this.stepFrame(f);
    if (!frame) return undefined;
    let picked = { index: -1, n: 0 };
    this.steps.begin(frame);
    this.frameForSheet(true);
    // Labels would cover her and the props in the small strip above the sheet (as in the ring).
    for (const sg of this.rooms.signs) sg.visible = false;
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
      clear: () => {
        this.steps.clear();
        this.frameForSheet(false);
        this.avatar.pose(this.lotus ? "lotus" : "float");
        this.body.reset();
      },
    };
  }

  /**
   * While a chore's steps play: place her and the camera (also with the interior suspended under the
   * station screen, whose sheet is open over this scene). True when the step stage was drawn.
   */
  stage(dt: number): boolean {
    if (!this.steps.framing) return false;
    this.rig.visible = true;
    this.avatar.root.visible = true;
    this.suit.root.visible = false;
    this.camera.up.set(0, 1, 0);
    this.steps.frame(dt, this.camera, this.rig, this.avatar);
    this.syncMachines(dt);
    for (const sg of this.rooms.signs) sg.visible = false;
    return true;
  }

  /** The animation audit of the step on stage (tools/experiencia/animaciones.mjs; test hook). */
  stepAudit(sheetTop: number): StepAudit | undefined {
    const c = document.querySelector("canvas");
    const r = c?.getBoundingClientRect();
    return auditStep(this.steps, this.camera, this.scene, sheetTop, { w: r?.width ?? window.innerWidth, h: r?.height ?? window.innerHeight }, this.rig);
  }

  /**
   * How a wall fixture is framed while its steps play: she floats in front of it with her feet in its
   * foot loops (in 0 g «down» is the deck, as everywhere in the station), its front at her hands; the
   * camera behind her right shoulder, inside the module (never through a wall).
   */
  private stepFrame(f: Fixture): StepFrame | undefined {
    const n = FACE_NORMAL[f.face];
    const vol = this.interior.volume(f.volume);
    if (!vol) return undefined;
    if (f.face === "suelo") return this.floorFrame(f, vol);
    if (f.face === "techo") return this.ceilingFrame(f, vol);
    if (Math.abs(n.y) > 0.5) return undefined;
    const d = new THREE.Vector3(n.x, 0, n.z).normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x);
    const target = new THREE.Vector3(f.at.x, f.at.y, f.at.z);
    const floor = vol.centre.y - vol.half.y + 0.05;
    // What she works at is what is drawn: a wall or panel standing proud of the fixture's plane is its front.
    const from = target.clone().addScaledVector(d, -1.4).setY(Math.max(floor, target.y - WORK_DROP) + 1.0);
    const front = hitOfScene(this.scene, [this.steps.root, this.rig])(from, d, 1.4);
    if (front !== undefined && front < 1.38) target.addScaledVector(d, front - 1.4);
    // Out from the front, but not across a narrow aisle into the racks on the other side.
    const across = Math.abs(d.x) > 0.5 ? vol.half.x : vol.half.z;
    const off = Math.min(WORK_OFF, 2 * across - 0.3);
    const stand = target.clone().addScaledVector(d, -off).setY(Math.max(floor, target.y - WORK_DROP));
    const look = target.clone().addScaledVector(d, -0.15).setY(stand.y + 0.95);
    // The camera along the aisle to her right, a little back from the wall: she does not hide her hands
    // and what is in them, in an aisle too narrow to stand behind her. Always inside the module.
    const cam = new THREE.Vector3();
    // Room for the camera, and a clear line from it to her hands and what is in them (no hatch rim in between).
    const sight = sightOfScene(this.scene, [this.steps.root, this.rig]);
    const hands = target.clone().addScaledVector(d, -Math.max(0.3, off - 0.4)).setY(stand.y + 1.0);
    const reach = [hands, hands.clone().addScaledVector(right, 0.5), hands.clone().addScaledVector(right, -0.3)];
    const fits = (v: THREE.Vector3) => this.interior.fits(new Vec3(v.x, v.y, v.z), 0.1, false) && reach.every((h) => sight(v, h));
    let found = false;
    // In a small room (a crew quarter) the camera looks in from its doorway, far enough to see all of her.
    const room = vol.kind === "compartimento";
    const sides = room ? [0, 0.25, -0.25, 0.5, -0.5] : [1.5, 1.3, 1.1, 0.9, 0.7, -0.7, -0.9, -1.1, -1.3, -1.5, 0];
    // Her left only when the right is a module's end wall (a machine next to a hatch).
    for (const side of sides) {
      for (let back = room ? 2 * across + 1.4 : Math.min(1.6, 2 * across - 0.15); back > 0.35 && !found; back -= 0.1) {
        cam.copy(look).addScaledVector(d, -back).addScaledVector(right, side).setY(stand.y + (room ? 1.35 : 1.65));
        found = fits(cam);
      }
      if (found) break;
    }
    if (!found) cam.copy(look).addScaledVector(d, -Math.max(0.4, off)).addScaledVector(right, 0.6).setY(stand.y + 1.6);
    return { stand, yaw: Math.atan2(d.x, d.z), camera: cam, look, target };
  }

  /**
   * A machine on the deck (the T2 treadmill): she stands on it, feet in its harness, facing along the module;
   * the camera beside it in the aisle, at chest height, looking at her (never through a wall).
   */
  private floorFrame(f: Fixture, vol: { centre: Vec3; half: Vec3 }): StepFrame {
    const floor = vol.centre.y - vol.half.y + 0.05;
    const alongX = vol.half.x >= vol.half.z;
    const d = alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const side = alongX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const stand = new THREE.Vector3(f.at.x, Math.max(floor, f.at.y + f.size.y / 2), f.at.z);
    const look = stand.clone().setY(stand.y + 0.95);
    const target = stand.clone().addScaledVector(d, 0.4).setY(stand.y + 0.9);
    const sight = sightOfScene(this.scene, [this.steps.root, this.rig]);
    const cam = new THREE.Vector3();
    let found = false;
    // Side on first; in a small node (Unity's CBM) from along the module too, so her head stays in the shot.
    for (const back of [2.2, 1.9, 1.6, 1.3, 1.0, 0.8])
      for (const [a, b] of [[side, d], [d, side]] as const)
        for (const s of [1, -1]) {
          if (found) break;
          cam.copy(look).addScaledVector(a, s * back).addScaledVector(b, 0.6).setY(stand.y + 1.45);
          found = this.interior.fits(new Vec3(cam.x, cam.y, cam.z), 0.1, false) && sight(cam, look);
        }
    // Nothing in clear sight (a handrail across every line in a small node): back along the module, inside it.
    for (const back of [1.6, 1.3, 1.0])
      for (const s of [1, -1]) {
        if (found) break;
        cam.copy(look).addScaledVector(d, s * back).addScaledVector(side, 0.4).setY(stand.y + 1.45);
        found = this.interior.fits(new Vec3(cam.x, cam.y, cam.z), 0.1, false);
      }
    if (!found) cam.copy(look).addScaledVector(side, 0.8).setY(stand.y + 1.4);
    return { stand, yaw: Math.atan2(d.x, d.z), camera: cam, look, target };
  }

  /**
   * A rack in the overhead (Tranquility's ARS, the fire post): in 0 g she floats up under it, head below the
   * ceiling and hands at its front, beside it along the module so she does not go into it; the camera from the side.
   */
  private ceilingFrame(f: Fixture, vol: { centre: Vec3; half: Vec3 }): StepFrame {
    const floor = vol.centre.y - vol.half.y + 0.05;
    const ceiling = vol.centre.y + vol.half.y;
    const alongX = vol.half.x >= vol.half.z;
    const d = alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const side = alongX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    // Its underside (a rack hangs a metre and more from the overhead): her hands at it, her head below it.
    const bottom = Math.min(ceiling - 0.05, f.at.y - f.size.y / 2);
    const target = new THREE.Vector3(f.at.x, bottom, f.at.z);
    // Faced along the module, a short step back from under its middle (its front is at her hands).
    const stand = target.clone().addScaledVector(d, -0.45).setY(Math.max(floor, bottom - 1.75));
    const look = target.clone().setY(target.y - 0.45);
    const sight = sightOfScene(this.scene, [this.steps.root, this.rig]);
    const cam = new THREE.Vector3();
    let found = false;
    for (const back of [2.0, 1.7, 1.4, 1.1, 0.9])
      for (const s of [1, -1]) {
        if (found) break;
        cam.copy(look).addScaledVector(side, s * Math.min(back, 2 * (alongX ? vol.half.z : vol.half.x) - 0.3)).addScaledVector(d, -back).setY(stand.y + 0.9);
        found = this.interior.fits(new Vec3(cam.x, cam.y, cam.z), 0.1, false) && sight(cam, look);
      }
    if (!found) cam.copy(look).addScaledVector(d, -1.2).setY(stand.y + 0.9);
    return { stand, yaw: Math.atan2(d.x, d.z), camera: cam, look, target };
  }

  /**
   * A fixture's frame with the camera stood back along the wall, low, so her whole body shows (yoga, the lotus of
   * the settings): a teacher's side view, as on the ring (interior.ts, yogaCamera).
   */
  private wholeBodyFrame(f: Fixture): StepFrame | undefined {
    const base = this.stepFrame(f);
    if (!base) return undefined;
    const n = FACE_NORMAL[f.face];
    const d = new THREE.Vector3(n.x, 0, n.z).normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x);
    const body = base.stand.clone().setY(base.stand.y + 0.6);
    const sight = sightOfScene(this.scene, [this.steps.root, this.rig]);
    const cam = new THREE.Vector3();
    for (const side of [2.0, -2.0, 2.4, -2.4, 1.6, -1.6, 2.8, -2.8])
      for (const back of [0.9, 0.6, 0.3]) {
        cam.copy(body).addScaledVector(right, side).addScaledVector(d, -back).setY(base.stand.y + 1.05);
        if (this.interior.fits(new Vec3(cam.x, cam.y, cam.z), 0.1, false) && sight(cam, body)) return { ...base, camera: cam.clone(), look: body };
      }
    return base;
  }

  /**
   * Yoga on a mat (reglas.md §4.2): she floats in front of it, feet in its straps, and each right answer takes
   * her into its posture (the asanas of the body module, as on the ring); seen from the aisle. `asanaOf(i)` is
   * step i's asana.
   */
  yogaVisual(id: string, asanaOf: (index: number) => AsanaData | undefined): StepVisual | undefined {
    const f = this.interior.fixture(id);
    const frame = f && (this.gearFrame(f) ?? this.wholeBodyFrame(f));
    if (!frame) return undefined;
    this.steps.begin(frame);
    this.steps.holdPose = true;
    const first = asanaOf(-1);
    if (first) this.avatar.asana(first);
    this.frameForSheet(true);
    for (const sg of this.rooms.signs) sg.visible = false;
    return {
      stepDone: (index) => {
        const a = asanaOf(index);
        if (a) this.avatar.asana(a);
        if (this.steps.framing) this.steps.play([{ action: "postura", place: "objetivo" }]);
      },
      finish: () => {},
      clear: () => {
        this.onGear = undefined;
        this.steps.clear();
        this.frameForSheet(false);
        this.avatar.pose(this.lotus ? "lotus" : "float");
        this.body.reset();
      },
    };
  }

  /** The equipment model of a fixture (crew-gear.ts, aqh-model.ts), if it has one. */
  gearOf(id: string): CrewGear | undefined {
    return this.rooms.gear.get(id);
  }

  /** The machine she is using now (its parts move with her). */
  private onGear: string | undefined;

  /**
   * On a piece of equipment (reglas.md §4.5): her feet where the machine puts them (the T2's belt, floating at the
   * CEVIS's pedals, the ARED's platform, the foot loops of a mat on its wall), turned as it is, «up» out of what she
   * stands on; the camera off to her side in the module, with that «up» (a wall mat reads as the floor on screen).
   */
  private gearFrame(f: Fixture): StepFrame | undefined {
    const g = this.rooms.gear.get(f.id);
    if (!g) return undefined;
    this.onGear = f.id;
    g.root.updateWorldMatrix(true, false);
    const stand = g.root.localToWorld(g.feet.clone());
    const orient = g.root.getWorldQuaternion(new THREE.Quaternion());
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(orient);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(orient);
    const side = new THREE.Vector3().crossVectors(up, fwd).normalize();
    // Lying on a mat the body runs along it: aim at its middle, a little out from it.
    const flat = g.kind === "esterilla";
    const body = stand.clone().addScaledVector(up, flat ? 0.65 : g.kind === "cevis" ? 0.75 : 0.7);
    const sight = sightOfScene(this.scene, [this.steps.root, this.rig, g.root]);
    const cam = new THREE.Vector3();
    const q = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().multiplyScalar(1 - k).addScaledVector(b, k).normalize();
    const back = fwd.clone().negate();
    const nside = side.clone().negate();
    // Side on for the treadmill, the cycle and the mat (the stride, the cranks, the body along it); three quarters
    // from the front for the ARED (the bar on her shoulders, not hidden by its arm).
    const dirs = g.kind === "ared" ? [q(side, fwd, 0.6), q(nside, fwd, 0.6), q(side, fwd, 0.3), q(nside, fwd, 0.3), fwd, side, nside] : [side, nside, q(side, fwd, 0.35), q(nside, fwd, 0.35), q(side, back, 0.35), q(nside, back, 0.35), fwd];
    for (const dist of [3.2, 2.8, 2.4, 2.0, 1.7, 1.4, 1.1])
      for (const d of dirs) {
        cam.copy(body).addScaledVector(d, dist).addScaledVector(up, flat ? 0.5 : 0.35);
        if (this.interior.fits(new Vec3(cam.x, cam.y, cam.z), 0.1, false) && sight(cam, body))
          return { stand, yaw: Math.atan2(fwd.x, fwd.z), orient, cameraUp: up, camera: cam.clone(), look: body, target: body.clone() };
      }
    cam.copy(body).addScaledVector(side, 1.2).addScaledVector(up, 0.4);
    return { stand, yaw: Math.atan2(fwd.x, fwd.z), orient, cameraUp: up, camera: cam, look: body, target: body.clone() };
  }

  /**
   * A workout at its machine (reglas.md §4.5): she gets on it and moves as it asks, round and round on the skeleton
   * (running in the T2's harness, pedalling the CEVIS, squatting under the ARED's bar), the machine moving with her;
   * each right step pushes the pace for a moment, like an interval.
   */
  exerciseVisual(id: string, motion: ExerciseMotionData): StepVisual | undefined {
    const f = this.interior.fixture(id);
    const frame = f && this.gearFrame(f);
    if (!frame) return undefined;
    this.steps.begin(frame);
    this.steps.holdPose = true;
    this.avatar.exercise(motion);
    this.frameForSheet(true);
    for (const sg of this.rooms.signs) sg.visible = false;
    let push: ReturnType<typeof setTimeout> | undefined;
    return {
      stepDone: () => {
        const ex = this.avatar.exercising;
        if (ex) ex.pace = 1.7;
        clearTimeout(push);
        push = setTimeout(() => {
          const e = this.avatar.exercising;
          if (e) e.pace = 1;
        }, 2500);
        if (this.steps.framing) this.steps.play([{ action: "entrenar", place: "objetivo", vessel: motion.device }]);
      },
      finish: () => {},
      clear: () => {
        clearTimeout(push);
        this.onGear = undefined;
        this.steps.clear();
        this.frameForSheet(false);
        this.avatar.pose(this.lotus ? "lotus" : "float");
        this.body.reset();
      },
    };
  }

  /**
   * While steps play under a sheet, render only part of a taller frustum so her and the fixture show in
   * the strip above it (portrait) or beside it (landscape); the same lens as the ring's (interior.ts).
   */
  private frameForSheet(on: boolean): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!on) {
      this.camera.aspect = w / h;
      this.camera.fov = 72;
      this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
      return;
    }
    const landscape = w > h;
    const fullW = landscape ? 1.44 * w : w;
    const fullH = landscape ? h : 1.6 * h;
    this.camera.aspect = fullW / fullH;
    const half = landscape ? 35 : 52;
    this.camera.fov = (2 * Math.atan(Math.tan((half * Math.PI) / 180) * (fullH / h)) * 180) / Math.PI;
    this.camera.setViewOffset(fullW, fullH, fullW - w, fullH - h, w, h);
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    if (!this.active) return;
    this.syncDoors(dt);
    if (this.sleeping && performance.now() >= this.sleeping.until) this.wake();
    if (this.stage(dt)) return;
    if (this.stepHatch(dt)) {
      // Going through a hatch: no signs in the way of the leaf.
      for (const sg of this.rooms.signs) sg.visible = false;
      this.renderHud();
      return;
    }
    const look = this.walker.look(dt);
    this.yaw += look.yaw;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + look.pitch));
    if (this.cycling > 0) {
      this.cycling = Math.max(0, this.cycling - dt);
      if (this.cycling === 0) this.say(this.suited ? "Quest vacía: la escotilla EVA da al vacío (el paseo por fuera de la estación está en pendientes)" : "Esclusa a presión: ya puedes quitarte el casco y volver al módulo");
    }
    this.moveAbout(dt);
    // Holding a thing's grab point shows its action; elsewhere, the nearest thing within reach.
    const held = this.hop.holding(this.iva)?.poi;
    this.near = this.cycling > 0 ? undefined : held ? this.interior.fixture(held) : this.interior.fixtureNear(this.p);
    this.renderCard();
    this.syncMachines(dt);
    this.syncStore();
    this.placeCamera();
    this.fadeSigns();
    this.renderHud();
    if (performance.now() > this.toastUntil) this.toast.classList.remove("on");
  }

  /** Rails only: the arrows hop from landing point to landing point (docs/design/ingravidez.md, «Fase C: flechas»). */
  private moveAbout(dt: number): void {
    if (this.hopsSuited !== this.suited) this.buildHops();
    const fwd = this.lookDir();
    const right = new Vec3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const intent = this.hop.update(this.iva, { forward: fwd, right }, this.active && this.cycling === 0 && !this.sleeping, dt, this.camera.position);
    const r = ivaStep(this.iva, intent, this.world, dt);
    this.iva = r.state;
    this.p = r.state.position;
    for (const e of r.events) this.tell(e);
  }

  private tell(e: IvaEvent): void {
    // Hops (the arrows) say their speed on the HUD line, not in a notice.
    if (e.kind === "pared") this.say("Te paras contra la pared con las manos: desde aquí también puedes impulsarte");
    else if (e.kind === "golpe") this.say(`¡Golpe contra la pared a ${num(e.speed, 1)} m/s! Rebotas`);
    else if (e.kind === "deriva") this.say("A la deriva: no llegas a nada. Solo te mueve el aire de la ventilación, muy despacio", 5);
    else if (e.kind === "sin-impulso")
      this.say(e.why === "en-vuelo" ? "En el aire no puedes cambiar de rumbo: espera al próximo asidero" : e.why === "contra-la-pared" ? "No puedes empujarte hacia la pared que sujetas" : "No hay nada en lo que apoyarse: el aire te llevará a una pared");
  }

  private lookDir(): Vec3 {
    return new Vec3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  /** What a fixture offers now: its card's buttons (a door says where it leads, or why it is shut). */
  actions(f: Fixture): StationAction[] {
    const a = f.action;
    switch (a.kind) {
      case "panel":
        return [{ id: "abrir", label: `Abrir ${PANEL_NAME[a.panel]}`, enabled: true }];
      case "puerta": {
        const why = this.interior.doorLock(f, this.suited) ?? (this.cycling > 0 ? "Espera: la esclusa está cambiando de presión" : undefined);
        return [{ id: "entrar", label: `Entrar en ${this.interior.volume(a.to)?.label ?? a.to}`, enabled: !why, ...(why ? { why } : {}) }];
      }
      case "salir": {
        const why = this.suited ? "Con el traje no: vuelve a la esclusa y quítatelo" : this.deps.cannotLeave(a.to);
        const leave: StationAction = { id: "salir", label: a.to === "sonda" ? "Volver al módulo de aterrizaje" : "Pasar a la nodriza", enabled: !why, ...(why ? { why } : {}) };
        // The hatch to the mothership looks out on the dry dock through its window (ISS hatches have one).
        return a.to === "nodriza" && this.deps.lookOut ? [leave, { id: "ventana", label: "Mirar el dique por la ventanilla", enabled: true }] : [leave];
      }
      case "bahia":
        return [{ id: "bahia", label: "Abrir la bahía de la nave", enabled: true }, ...(a.panels ?? []).map((p) => ({ id: `abrir:${p}`, label: `Abrir ${PANEL_NAME[p]}`, enabled: true }))];
      case "esclusa": {
        const inLock = this.interior.volumeAt(this.p)?.kind === "esclusa";
        const why = this.cycling > 0 ? "La esclusa está cambiando de presión" : !inLock ? "Entra en la esclusa para cambiarte" : undefined;
        return [{ id: "traje", label: this.suited ? "Llenar la esclusa y quitarse el traje" : "Ponerse el traje y vaciar la esclusa", enabled: !why, ...(why ? { why } : {}) }];
      }
      case "tripulacion":
      case "brazo":
      case "bishop":
      case "consola":
      case "soporte-vital":
        return this.deps.actions(f);
      case "info":
        return [];
    }
  }

  /** Do one of a fixture's actions. */
  run(f: Fixture, id: string): void {
    const a = f.action;
    if (a.kind === "tripulacion" || a.kind === "brazo" || a.kind === "bishop" || a.kind === "consola" || a.kind === "soporte-vital") return this.deps.act(f, id);
    if (id === "ventana") return this.deps.lookOut?.();
    if (id.startsWith("abrir:")) {
      this.say(`${f.label} · ${this.interior.locationCode(f)}`);
      return this.deps.openPanel(id.slice("abrir:".length) as StationPanel);
    }
    this.use(f, true);
  }

  /** The card of the thing in front of her: icon, name, one line, its actions (they replace HUD buttons). */
  private renderCard(): void {
    const f = this.near;
    if (!f || this.lotus || this.sleeping) {
      this.card.classList.add("hidden");
      this.cardKey = "";
      return;
    }
    const acts = this.actions(f);
    const locked = acts.length > 0 && acts.every((x) => !x.enabled);
    const main = acts.findIndex((x) => x.enabled);
    const kbd = settings.value.keyboardHelp;
    const P = this.look.prefix ?? "sti";
    const readout = this.deps.readout?.(f);
    const html = `<div class="cm-head ${P}-head"><span class="${P}-icon">${ICON_OF(f, locked)}</span><div><b>${esc(f.label)}</b><small>${esc(f.info)}</small></div></div>${readout !== undefined ? `<div class="sv-readout"></div>` : ""}${
      acts.length
        ? `<div class="cm-acts">${acts.map((x, i) => `<button data-act="${x.id}" ${x.enabled ? "" : "disabled"} class="${i === main ? "primary" : ""}">${esc(x.label)}${i === main && kbd ? " <kbd>Intro</kbd>" : ""}</button>`).join("")}</div>`
        : ""
    }${acts.filter((x) => !x.enabled && x.why).map((x) => `<p class="cm-why">${esc(x.why!)}</p>`).join("")}`;
    this.card.classList.remove("hidden");
    if (html !== this.cardKey) {
      this.card.innerHTML = html;
      this.cardKey = html;
      this.readoutKey = "";
    }
    // The readout changes on its own, without rebuilding the card's buttons under her finger.
    if (readout !== undefined && readout !== this.readoutKey) {
      const el = this.card.querySelector<HTMLElement>(".sv-readout");
      if (el) el.innerHTML = readout;
      this.readoutKey = readout;
    }
  }

  /** Use a fixture: its main action (Enter, a tap on it) or, far away, hop there. */
  use(f: Fixture, close: boolean): void {
    const a = f.action;
    if (a.kind === "panel") {
      this.say(`${f.label} · ${this.interior.locationCode(f)}`);
      return this.deps.openPanel(a.panel);
    }
    if (a.kind === "info") return this.say(`${f.label} (${this.interior.locationCode(f)}): ${f.info}`, 6);
    if (a.kind === "bahia") return this.deps.openBay();
    if (a.kind === "tripulacion" || a.kind === "brazo" || a.kind === "bishop" || a.kind === "consola" || a.kind === "soporte-vital") {
      const main = this.deps.actions(f).find((x) => x.enabled);
      return main ? this.deps.act(f, main.id) : this.say(f.info, 5);
    }
    if (!close) return this.say(`${f.label}: acércate para usarla`);
    if (a.kind === "puerta") {
      const why = this.actions(f)[0]?.why;
      return why ? this.say(why, 6) : this.through(f);
    }
    if (a.kind === "salir") {
      const why = this.actions(f)[0]?.why;
      if (why) return this.say(why, 6);
      return this.passHatch(f.id, () => {
        const no = this.deps.leave(a.to);
        if (no) this.say(no);
      });
    }
    // Airlock: only from inside it.
    if (this.interior.volumeAt(this.p)?.kind !== "esclusa") return this.say("Entra en la esclusa para cambiarte");
    if (this.cycling > 0) return;
    this.suited = !this.suited;
    this.cycling = CYCLE_S;
    this.say(this.suited ? "Traje puesto. Vaciando la esclusa… (en la ISS, el traje y la prerrespiración llevan horas)" : "Llenando la esclusa…", 4);
  }

  private pick(x: number, y: number): void {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), this.camera);
    const hit = ray.intersectObjects(this.rooms.pickables, false)[0];
    const id = hit?.object.userData.fixture as string | undefined;
    const f = id ? this.interior.fixture(id) : undefined;
    if (!f || !hit || hit.distance > 25) return;
    if (this.near?.id === f.id) return this.use(f, true);
    // Far away: she hops there by herself, hop after hop (docs/design/ingravidez.md, «Fase D»).
    const at = this.hops.poiPoint(f.id);
    if (at && this.cycling === 0 && this.hop.goTo(at.id)) return this.say(`Saltas hasta: ${f.label}`);
    if (hit.distance <= 12) this.use(f, false);
  }

  /**
   * While a repair is open (docs/design/soporte-vital.md, «Pasos visibles»): the camera stands back in the
   * aisle, `back` m from the point toward where she is, and frames it `above` rad over the screen's centre,
   * so the part and its step lamps show above the challenge sheet. `unframe` gives her view back.
   */
  frame(t: { x: number; y: number; z: number }, back = 3, above = 0.45): void {
    const target = new THREE.Vector3(t.x, t.y, t.z);
    const dir = new THREE.Vector3(this.p.x - t.x, 0, this.p.z - t.z);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    let eye = target.clone().addScaledVector(dir, back);
    for (let d = back; d > 0.4; d -= 0.1) {
      eye = target.clone().addScaledVector(dir, d);
      if (this.interior.fits(new Vec3(eye.x, eye.y, eye.z), 0.15, this.suited)) break;
    }
    this.framing = { eye, target, above };
  }

  unframe(): void {
    this.framing = null;
  }

  /** A life-support rack's 3D model (for its repair's step visual). */
  rack(fixtureId: string): EclssRackModel | undefined {
    return this.rooms.racks.get(fixtureId);
  }

  private syncMachines(dt: number): void {
    if (this.deps.rackState)
      for (const [id, model] of this.rooms.racks) {
        const f = this.interior.fixture(id);
        if (!f) continue;
        const st = this.deps.rackState(f);
        const key = `${st.state}:${st.broken ?? ""}`;
        if (model.group.userData.stateKey !== key) {
          model.setState(st.state, st.broken);
          model.group.userData.stateKey = key;
        }
      }
    for (const model of this.rooms.racks.values()) model.tick(dt);
    // The equipment moves with her while she uses it (the belt, the cranks, the bar, the harness).
    for (const [id, g] of this.rooms.gear) g.tick(dt, this.onGear === id && this.steps.framing ? this.avatar : undefined);
    const busy = this.deps.busy();
    const t = performance.now() / 1000;
    for (const [id, lamp] of this.rooms.lamps) {
      const m = lamp.material as THREE.MeshBasicMaterial;
      if (!m.userData.base) m.userData.base = m.color.getHex();
      const on = busy.has(id);
      // Idle: the window stays dimly lit; working: it glows and flickers.
      m.color.setHex(m.userData.base).multiplyScalar(on ? 0.7 + 0.3 * Math.sin(t * 6 + id.length) : 0.28);
    }
  }

  private syncStore(): void {
    const { parts, crafts } = this.deps.store();
    const lander = this.deps.landerInHangar();
    const key = JSON.stringify([parts, crafts.map((c) => c.id), lander]);
    if (key === this.storeKey) return;
    this.storeKey = key;
    const g = this.rooms.store;
    g.clear();
    const { crates, probes } = this.interior.stow(parts, crafts);
    const size = this.interior.plan.storage.crate;
    const seen = new Set<string>();
    for (const c of crates) {
      const m = crateModel(size, seen.has(c.partId) ? undefined : this.deps.partName(c.partId));
      seen.add(c.partId);
      m.position.set(c.at.x, c.at.y, c.at.z);
      m.traverse((o) => (o.userData.fixture = c.at.x < 0 ? "estante-babor" : "estante-estribor"));
      g.add(m);
    }
    for (const p of probes) {
      const m = probeModel(p.craft.name);
      m.position.set(p.at.x, p.at.y, p.at.z);
      m.traverse((o) => (o.userData.fixture = "cunas"));
      g.add(m);
    }
    // The lander, lifted in by the arm: on its cradle by the bay console (tapping it goes to the hangar console).
    const berth = this.interior.plan.landerBerth;
    if (lander && berth) {
      const m = landerModel(this.interior.plan.scale ?? 1);
      m.position.set(berth.x, berth.y, berth.z);
      g.add(m);
    }
    this.rooms.pickables.splice(0, this.rooms.pickables.length);
    this.rooms.signs.splice(0, this.rooms.signs.length);
    this.rooms.group.traverse((o) => {
      if (o.userData.fixture && !(o instanceof THREE.Sprite)) this.rooms.pickables.push(o);
      if (o instanceof THREE.Sprite) this.rooms.signs.push(o);
    });
  }

  private syncView(): void {
    this.menu.relabel(this.viewBtn, `Vista: ${this.thirdPerson ? "3ª" : "1ª"} persona`, "V");
  }

  /** True while she sleeps in a crew quarter with its door shut. */
  get asleep(): boolean {
    return this.sleeping !== null;
  }

  /**
   * She sleeps in the crew quarter of `fixtureId` (her bag): its folding door shuts, she stays put, and when
   * she wakes after `seconds` the door folds open again (docs/design/compartimentos.md).
   */
  sleep(fixtureId: string, seconds = SLEEP_SHOWN_S, then?: () => void): void {
    const f = this.interior.fixture(fixtureId);
    if (!f || this.interior.volume(f.volume)?.kind !== "compartimento") return;
    this.sleeping = { volume: f.volume, until: performance.now() + seconds * 1000, ...(then ? { then } : {}) };
    this.shutDoor(f.volume, true);
    // From her bag she looks out at the doorway: the door shutting, then folding open when she wakes.
    const door = this.interior.volume(`paso-${f.volume}`);
    if (door) {
      const d = door.centre.sub(this.p);
      this.yaw = Math.atan2(-d.x, -d.z);
      this.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(d.y, Math.hypot(d.x, d.z))));
    }
  }

  /** She wakes: the quarter's door folds open. */
  wake(): void {
    const s = this.sleeping;
    if (!s) return;
    this.sleeping = null;
    this.shutDoor(s.volume, false);
    s.then?.();
  }

  /** Shut or open a crew quarter's folding door (it moves over DOOR_MOVE_S). */
  shutDoor(volume: string, shut: boolean): void {
    const d = this.doorShut.get(volume) ?? { at: 0, to: 0 };
    d.to = shut ? 1 : 0;
    this.doorShut.set(volume, d);
  }

  /** How shut a crew quarter's door is now (0 open … 1 shut), for the experience suite. */
  doorAmount(volume: string): number {
    return this.doorShut.get(volume)?.at ?? 0;
  }

  private syncDoors(dt: number): void {
    for (const [id, d] of this.doorShut) {
      const step = dt / DOOR_MOVE_S;
      d.at = d.at < d.to ? Math.min(d.to, d.at + step) : Math.max(d.to, d.at - step);
      this.rooms.doors.get(id)?.shut(d.at);
    }
  }

  /** Sit in lotus on the mat (the settings open) or float up again. */
  sitLotus(on: boolean): void {
    this.lotus = on;
    // On the mat, seen from the aisle over the settings sheet (in first person she would see nothing of it).
    const mat = this.interior.plan.fixtures.find((f) => f.action.kind === "tripulacion" && f.action.area === "esterilla");
    const frame = on && mat ? (this.gearFrame(mat) ?? this.wholeBodyFrame(mat)) : undefined;
    if (frame) {
      this.steps.begin(frame);
      this.steps.holdPose = true;
      this.frameForSheet(true);
      for (const sg of this.rooms.signs) sg.visible = false;
    } else if (!on && this.steps.framing && this.steps.holdPose) {
      this.onGear = undefined;
      this.steps.clear();
      this.frameForSheet(false);
      this.body.reset();
    }
    this.avatar.pose(on ? "lotus" : "float");
  }

  /** Where a fixture is on screen, for the experience suite (undefined when behind her). */
  screenPoint(id: string): { x: number; y: number } | undefined {
    const f = this.interior.fixture(id);
    if (!f) return undefined;
    const v = new THREE.Vector3(f.at.x, f.at.y, f.at.z).project(this.camera);
    if (v.z > 1) return undefined;
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  }

  private placeCamera(): void {
    if (this.hatchView) {
      this.rig.visible = true;
      this.avatar.root.visible = !this.suited;
      this.suit.root.visible = this.suited;
      const dir = this.lookDir();
      this.body.update(this.suited ? this.suit : this.avatar, this.iva, this.graph, new THREE.Vector3(dir.x, dir.y, dir.z), 1 / 60);
      this.camera.up.set(0, 1, 0);
      this.camera.position.copy(this.hatchView.eye);
      this.camera.lookAt(this.hatchView.target);
      return;
    }
    if (this.framing) {
      this.camera.up.set(0, 1, 0);
      this.camera.position.copy(this.framing.eye);
      this.camera.lookAt(this.framing.target);
      this.camera.rotateX(-this.framing.above);
      return;
    }
    const dir = this.lookDir();
    const p = new THREE.Vector3(this.p.x, this.p.y, this.p.z);
    const third = this.thirdPerson;
    this.rig.visible = third;
    this.avatar.root.visible = !this.suited;
    this.suit.root.visible = this.suited;
    this.body.update(this.suited ? this.suit : this.avatar, this.iva, this.graph, new THREE.Vector3(dir.x, dir.y, dir.z), 1 / 60);
    this.camera.up.set(0, 1, 0);
    // Third person: follow her body as drawn (when it fits), so a hand on a rail does not push her off screen.
    if (third) {
      const c = this.body.centre();
      if (this.interior.fits(new Vec3(c.x, c.y, c.z), 0.1, this.suited)) p.copy(c);
    }
    if (!third) {
      this.camera.position.copy(p);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      return;
    }
    const d3 = new THREE.Vector3(dir.x, dir.y, dir.z);
    const cam = new THREE.Vector3();
    // In the hangar she can be seen from further back; in a narrow aisle the camera may not fit behind her.
    const far = this.interior.volumeAt(this.p)?.kind === "hangar" ? 4 : 2.4;
    // Pull the camera back from her head until it would leave the space she is in (never through a wall).
    // In flight, from a little higher, so her stretched-out body reads from the side.
    const mk = this.iva.motion.kind;
    const lift = mk === "planeo" || mk === "impulso" || mk === "agarrando" || mk === "salto" ? 0.6 : 0;
    // Back along the view and toward the middle of the aisle (the roomiest line, where the rails are
    // not): from a rail in a corner the camera still fits behind her (docs/design/ingravidez.md).
    const vol = this.interior.volumeAt(this.p);
    const toMid = new THREE.Vector3(0, 0.3, 0);
    if (vol && vol.kind !== "hangar") {
      const long = vol.half.x >= vol.half.y && vol.half.x >= vol.half.z ? "x" : vol.half.z >= vol.half.y ? "z" : "y";
      toMid.set(vol.centre.x - p.x, vol.centre.y - p.y, vol.centre.z - p.z);
      toMid[long] = 0;
      if (toMid.lengthSq() < 0.01) toMid.set(0, 0.3, 0);
      else toMid.multiplyScalar(0.8);
    }
    const at = (k: number) => new THREE.Vector3().copy(p).addScaledVector(d3, -k).addScaledVector(toMid, Math.min(1, k / 1.2)).add(new THREE.Vector3(0, (lift * k) / far, 0));
    let d = 0;
    for (let k = 0.1; k <= far + 1e-6; k += 0.1) {
      const q = at(k);
      if (!this.interior.fits(new Vec3(q.x, q.y, q.z), 0.08, this.suited)) break;
      d = k;
    }
    cam.copy(at(d));
    if (d < 1.1) {
      // Too tight to see her from behind: look through her eyes until there is room.
      this.rig.visible = false;
      this.camera.position.copy(p);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      return;
    }
    this.camera.position.copy(cam);
    this.camera.lookAt(p.clone().addScaledVector(d3, 1.2));
  }

  /** Labels too close to the camera would fill the screen: hide them until there is some distance. */
  private fadeSigns(): void {
    const cam = this.camera.position;
    const w = new THREE.Vector3();
    for (const s of this.rooms.signs) {
      s.getWorldPosition(w);
      const d = w.distanceTo(cam);
      s.visible = d > Math.max(1.0, 4 * s.scale.y) && d < 40 * s.scale.y;
    }
  }

  private renderHud(): void {
    const v = this.interior.volumeAt(this.p);
    const looking = FACE_LABEL[faceToward(this.lookDir())];
    const lock = v?.kind === "esclusa";
    const kpa = lock ? (this.suited ? (this.cycling / CYCLE_S) * CABIN_KPA : (1 - this.cycling / CYCLE_S) * CABIN_KPA) : this.interior.pressurisedAt(this.p, this.suited) ? CABIN_KPA : 0;
    const air = kpa > 1 ? `${Math.round(kpa)} kPa de aire` : "vacío";
    const suit = this.suited ? " · con traje" : "";
    const held = this.near && this.hop.holding(this.iva)?.poi === this.near.id ? { poi: this.near.label } : {};
    const P = this.look.prefix ?? "sti";
    const html = `<div class="${P}-title">${v ? `${v.code} · ${esc(v.label)}` : (this.look.place ?? "Estación")}</div><div class="${P}-grav">0 g · ${air}${suit} · mirando a ${looking}</div><div class="${P}-move-line">${esc(motionLabel(this.iva, held))}</div>`;
    if (html !== this.hudKey) {
      this.hudKey = html;
      this.hud.innerHTML = html;
    }
  }

  say(text: string, seconds = 3.5): void {
    this.toast.textContent = text;
    this.toast.classList.add("on");
    this.toastUntil = performance.now() + seconds * 1000;
  }
}
