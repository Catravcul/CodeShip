import * as THREE from "three";
import { WORLD_SCALE } from "@core/scale";
import { ACTION_REACH_M } from "@core/spacing";
import { moveJoystick } from "@core/realism";
import { BOARD_DAYS_PER_REAL_S } from "@core/board-time";
import { buildLayout, islandOf, type IslandDef, type IslandId, type LiftDef, type MachineDef } from "@modules/aerial-sanctuary/data/layout";
import { placeAt, step, type Body } from "@modules/aerial-sanctuary/domain/walk";
import { nearestPoint, shortestWay, type WayPoint } from "@modules/aerial-sanctuary/domain/route";
import { cabHeight, liftPhase, liftSeconds } from "@modules/aerial-sanctuary/domain/lift";
import { legPose, planTrip, tripSeconds, type Craft, type CraftSpec, type Leg } from "@modules/aerial-sanctuary/domain/travel";
import { RUNNING, scan, type StopState } from "@modules/aerial-sanctuary/domain/energy";
import { AIR_BIRDS, BIRD_HOME, BIRD_STOP, CRAFT, LIFT, TURBINE } from "@modules/aerial-sanctuary/data/facts";
import { IN_CONSTRUCTION, READY_POSTS, initiationTasks } from "@modules/aerial-sanctuary/application/initiation";
import { stationFor } from "@modules/aerial-sanctuary/application/stations";
import { flightChore } from "@modules/aerial-sanctuary/application/flight-program";
import { stageFor, STAGED_POSTS, type Stage } from "@modules/aerial-sanctuary/data/stages";
import { TRAINERS, trainerById } from "@modules/aerial-sanctuary/data/trainers";
import { boardHour, clockText, nextShift, trainerFor } from "@modules/aerial-sanctuary/domain/roster";
import { beatsFor } from "@modules/aerial-sanctuary/domain/station-beat";
import { handHover, handStart, handStep, handTap, type HandControl, type HandState } from "@modules/aerial-sanctuary/domain/hand-flight";
import { HAND } from "@modules/aerial-sanctuary/data/facts";
import { SEA_Y } from "@modules/aerial-sanctuary/data/layout";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import type { AreaMap, AreaNode } from "@modules/tasks/application/areas";
import type { Task, Vehicle } from "@modules/tasks/application/task-list";
import { ISLAND_TASK_VEHICLES } from "@modules/settings/domain/settings";
import { AutoSave } from "@modules/saves/application/auto-save";
import { boardDayOf } from "@modules/saves/domain/space-state";
import { AERIAL_LEVEL, ISLAND_NAME, type AerialState } from "@modules/saves/domain/aerial-state";
import { playSession, savedGames } from "./adapters/storage/saved-games";
import { bird, buildBlocks, buildFloors, buildProps, buildSea, buildWater, carpet, helicopter } from "./adapters/three/aerial-models";
import { buildFixtures } from "./adapters/three/s3-fixtures";
import { CubeFigure } from "./adapters/three/interior/figure";
import { Walker } from "./adapters/input/walker";
import { DOMENICA_HAIR } from "./ui/portraits";
import { RootMenu } from "./ui/root-menu";
import { ICON } from "./ui/icons";
import { MachinePanel } from "./ui/machine-panel";
import { TaskBoard } from "./ui/task-board";
import { AreasWindow } from "./ui/areas-window";
import { SettingsPanel } from "./ui/settings-panel";
import { settings } from "./ui/settings-store";
import { offerVehicles } from "./ui/task-settings";
import { IslandNavWindow, flightMode, type IslandChoice } from "./ui/island-nav";
import { DuelView, type SessionText } from "./ui/duel-view";
import { RcsPad } from "./ui/rcs-pad";
import { S3Stage } from "./adapters/three/s3-stage";
import { TrainerCrowd } from "./adapters/three/s3-trainers";
import { S3Rigs } from "./adapters/three/s3-rigs";
import { S3Simulators, paintSimScreen, type SimKind } from "./s3-simulators";
import { armMoves } from "@modules/robotics/application/arm-chores";
import "./ui/lander-cabin.css";
import "./ui/journey.css";
import "./ui/acciones.css";
import "./ui/aerial.css";

/**
 * Sanctuary 3, the aerial sanctuary (Berón, 2026-11-18; docs/design/santuario3-escena.md): Cold Sanctuary's aerial
 * islands with all their magic (the water tree-buildings and their lift, the carpet dock, the Electron's crown, the
 * energy park) and a real training island, where Doménica starts her initiation. She walks with gravity and swims in
 * the water (the stick moves her: core/realism.ts), «Ir» walks the whole way, the lift is ridden, and the islands are
 * joined by flights chosen at each island's navigation machine and seen from take-off to landing.
 */
const root = document.getElementById("app")!;
document.body.classList.add("in-s3", "in-room");
const L = buildLayout(WORLD_SCALE);
const byPoint = new Map(L.graph.points.map((p) => [p.id, p]));
const islandById = new Map(L.islands.map((i) => [i.id, i]));
const crafts: Readonly<Record<Craft, CraftSpec>> = { helicoptero: CRAFT.helicoptero.value, alfombra: CRAFT.alfombra.value };
const pads = L.islands.map((i) => i.pad);

// --- The scene ------------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.className = "s3-canvas";
root.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const SKY = 0x9fd0f0;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 900, 5200);
scene.add(new THREE.HemisphereLight(0xdff2ff, 0x5d6b4f, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.position.set(-400, 900, 300);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 7000);
camera.rotation.order = "YXZ";
scene.add(buildSea(L.world.waters.filter((w) => w.id.endsWith("-piscina"))), buildFloors(L.world.floors), buildWater(L.world.waters), buildBlocks(L.blocks), buildFixtures(L.fixtures));
const parts = buildProps(L);
scene.add(parts.root);

const avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
avatar.root.scale.setScalar(0.92);
const rig = new THREE.Group();
rig.add(avatar.root);
scene.add(rig);
const EYE_M = 1.45;

// The flying craft: one of each, shown only while she flies.
const heli = helicopter();
const rug = carpet();
heli.group.visible = rug.group.visible = false;
scene.add(heli.group, rug.group);

// The birds of the air (Cold Sanctuary's ColdBirds: AirBudget), circling south of the launch cap; the albatrosses
// range as far as the energy park, where the turbines stop for them (EnergyRule's bird stop).
const park = islandById.get("parque")!.rect;
const parkC = { x: (park.x0 + park.x1) / 2, z: (park.z0 + park.z1) / 2 };
const home = { x: L.crown.x, z: L.crown.z + BIRD_HOME.value.dz };
interface Flier {
  readonly g: THREE.Group;
  readonly wings: THREE.Mesh[];
  readonly phase: number;
  readonly speed: number;
  readonly r: number;
  readonly y: number;
  readonly far: boolean;
}
const birds: Flier[] = [];
const COLORS: Record<string, number> = { PolarSkua: 0x6b5a48, CapePetrel: 0xf0f0f0, WanderingAlbatross: 0xfafafa, ArcticTern: 0xe6e9ec };
for (const s of AIR_BIRDS)
  for (let i = 0; i < s.count; i++) {
    const b = bird(s.wingspanM, COLORS[s.id] ?? 0xffffff);
    scene.add(b.group);
    const n = birds.length;
    birds.push({ g: b.group, wings: b.wings, phase: n * 1.7, speed: 9 + (n % 3), r: BIRD_HOME.value.radius * (0.6 + 0.1 * (n % 5)), y: 40 + 12 * n, far: s.id === "WanderingAlbatross" });
  }
const turbineStops: StopState[] = parts.turbines.map(() => RUNNING);
let scanAt = 0;

// --- Her ---------------------------------------------------------------------------------------------------------------
const startPoint = byPoint.get(L.start)!;
let body: Body = placeAt(L.world, startPoint.x, startPoint.y, startPoint.z)!;
let yaw = Math.PI;
let pitch = -0.08;
let stride = 0;
let thirdPerson = settings.value.walkView === "tercera";
let clock = 0;
let days = 0;

type Mode =
  | { kind: "libre" }
  | { kind: "ruta"; pts: WayPoint[]; i: number; label: string; then?: () => void; still: number }
  | { kind: "ascensor"; lift: LiftDef; from: number; to: number; t: number; calling: boolean; then?: () => void }
  | { kind: "vuelo"; legs: Leg[]; i: number; t: number; to: IslandId }
  /** A post's challenge or a flight's program on the sheet, acted out at its place. */
  | { kind: "reto"; what: string }
  /** Flying by hand (reglas.md §3.6, «Manual»). */
  | { kind: "mano"; s: HandState; to: IslandId; from: IslandId };
let mode: Mode = { kind: "libre" };
const cabAt = new Map(L.lifts.map((l) => [l.id, 0]));

const island = (): IslandId => islandOf(L, body.area) ?? "entrenamiento";

// --- The HUD -------------------------------------------------------------------------------------------------------------
const ui = document.createElement("div");
ui.className = "room-ui s3-ui";
ui.innerHTML = `<div class="cab-where" aria-live="polite"></div><div class="cab-machine hidden" role="region" aria-label="Máquina"></div><div class="cab-toast" role="status"></div><div class="cab-fade"></div>`;
root.appendChild(ui);
const whereEl = ui.querySelector<HTMLElement>(".cab-where")!;
const card = ui.querySelector<HTMLElement>(".cab-machine")!;
const toast = ui.querySelector<HTMLElement>(".cab-toast")!;
const fadeEl = ui.querySelector<HTMLElement>(".cab-fade")!;
let toastUntil = 0;
function say(text: string, seconds = 4): void {
  toast.textContent = text;
  toast.classList.add("on");
  toastUntil = clock + seconds;
}
function fade(): void {
  fadeEl.classList.remove("go");
  void fadeEl.offsetWidth;
  fadeEl.classList.add("go");
}

// The journey bar: what she is doing by herself, the time left and «Parar» (reglas.md §3.3).
const bar = document.createElement("div");
bar.className = "journey-bar s3-bar hidden";
bar.setAttribute("role", "status");
bar.innerHTML = `<span class="jb-text"></span><button class="jb-stop" aria-label="Parar el viaje">Parar</button>`;
root.appendChild(bar);
const barText = bar.querySelector<HTMLElement>(".jb-text")!;
const barStop = bar.querySelector<HTMLButtonElement>(".jb-stop")!;
barStop.addEventListener("click", () => stop("Parada aquí: los mandos son tuyos"));

const walker = new Walker(root, { move: "s3-move room-move", look: "s3-look room-look", moveLabel: "Moverse" }, moveJoystick("santuario-aereo"));
walker.camera = camera;
walker.enabled = true;

const menu = new RootMenu(ui, "cab-menu", "Menú");
const viewBtn = menu.add({ className: "s3-view", icon: ICON.eye, label: `Vista: ${thirdPerson ? "3ª" : "1ª"} persona`, key: "V", order: 0 }, () => {
  thirdPerson = !thirdPerson;
  menu.relabel(viewBtn, `Vista: ${thirdPerson ? "3ª" : "1ª"} persona`, "V");
});
offerVehicles(ISLAND_TASK_VEHICLES, "Isla");
if (!ISLAND_TASK_VEHICLES.includes(settings.value.taskVehicle)) settings.set("taskVehicle", "auto");
const tasks = initiationTasks(L);
const taskBoard = new TaskBoard(root, () => tasks, () => island());
menu.add({ className: "s3-tasks", icon: ICON.tasks, label: "Tareas", key: "T", window: "tareas", order: 1 }, () => taskBoard.open());
taskBoard.onGo = (t) => goToTask(t);

const areaMaps = new Map<IslandId, AreaMap>();
function areaMap(v: Vehicle): AreaMap | undefined {
  if (!islandById.has(v as IslandId)) return undefined;
  const id = v as IslandId;
  const hit = areaMaps.get(id);
  if (hit) return hit;
  const nodes: AreaNode[] = L.areas.filter((a) => a.island === id).map((a) => ({ id: a.id, label: a.label, desc: a.desc, goal: a.point, fixture: a.point, centre: a.centre, half: a.half }));
  const map: AreaMap = { vehicle: id, nodes, links: [] };
  areaMaps.set(id, map);
  return map;
}
const areasWindow = new AreasWindow(root, {
  here: () => island(),
  map: areaMap,
  at: () => L.areas.find((a) => a.id === body.area)?.id,
  go: (n, map) => goTo(n.goal, n.label, map.vehicle as IslandId, "Áreas"),
});
RootMenu.global({ className: "areas-btn", icon: ICON.areas, label: "Áreas", window: "areas", order: 2 }, () => areasWindow.open()).show(true);
const machinePanel = new MachinePanel();
const settingsPanel = new SettingsPanel(root);
const nav = new IslandNavWindow(root);
nav.onFly = (to) => fly(to as IslandId);

// The challenges' sheet (the same as on board), the posts' stages and the trainers.
const duel = new DuelView(root);
const SHEET: SessionText = { title: "", progress: "Pasos", lives: "Intentos", order: "Ordena los pasos", submit: "Hacerlo", ok: "Paso hecho", bad: "Así no: inténtalo otra vez", sheet: true };
const stages = new Map<number, Stage>(STAGED_POSTS.map((p) => [p, stageFor(L, p)!]));
const stage = new S3Stage([...stages.values()]);
scene.add(stage.root);
// The machines that move while a phase-5 post is acted (the centrifuge, the Il-76MDK, the simulators' screens).
const rigs = new S3Rigs(parts, stages, L.k);
scene.add(rigs.root);
stage.mounts = rigs.mounts;
stage.onCue = (c) => rigs.cue(c);
rigs.painter = paintSimScreen;
// Post 8's simulators flown by hand (Dragon's docking, the LM's landing).
const lmBlock = L.blocks.find((q) => q.look === "lm-maqueta")!;
const sims = new S3Simulators(root, scene, stages.get(8)!, { x: (lmBlock.x0 + lmBlock.x1) / 2, y: 0, z: (lmBlock.z0 + lmBlock.z1) / 2 });
/** The machine whose simulator she is flying (its sign comes back when she is done). */
let simAt = "";
sims.onSay = (t) => say(t, 6);
sims.onEnd = () => {
  signsOff(simAt, false);
  mode = { kind: "libre" };
  cardKey = "";
};
/** The camera stick's turn round a moving machine's view. */
let rigTurn = 0;
const caption = document.createElement("div");
caption.className = "s3-caption hidden";
caption.setAttribute("role", "status");
root.appendChild(caption);
/** The board hour now (a new game starts at 9:00; one hour is one real minute). */
const hour = () => boardHour(days);
const passed = new Set<number>();

// --- Going somewhere -------------------------------------------------------------------------------------------------
function stop(why?: string): void {
  if (mode.kind === "vuelo") return;
  if (mode.kind === "ascensor" && !mode.calling) return;
  mode = { kind: "libre" };
  if (why) say(why);
}

/** Put her at a point of the way graph at once (the teleport the player chose, or a landing). */
function placeAtPoint(id: string): boolean {
  const p = byPoint.get(id);
  const b = p && placeAt(L.world, p.x, p.y, p.z);
  if (!b) return false;
  body = b;
  return true;
}

/** Walk her by herself along the shortest way to a point of her island; `then` on arrival. */
function walkTo(target: string, label: string, then?: () => void): boolean {
  const from = nearestPoint(L.graph, body);
  const pts = from && shortestWay(L.graph, from.id, target);
  if (!pts) {
    say("Desde aquí no hay camino a pie");
    return false;
  }
  mode = { kind: "ruta", pts, i: 0, label, ...(then ? { then } : {}), still: 0 };
  return true;
}

/** «Ir» (tasks, Áreas): the whole way on foot by default; another island is flown to from its navigation machine. */
function goTo(point: string, label: string, to: IslandId, from: "Tareas" | "Áreas", then?: () => void): void {
  if (mode.kind === "vuelo") return say("Primero tiene que aterrizar");
  if (settings.value.taskTravel === "teletransporte") {
    mode = { kind: "libre" };
    fade();
    say(`Teletransporte (elegido en ${from})`);
    if (placeAtPoint(point)) then?.();
    return;
  }
  const here = island();
  if (to !== here) {
    // A task on another island never makes a craft fly by itself (reglas.md §3.5): she walks to the navigation machine.
    const name = islandById.get(to)!.name;
    walkTo(islandById.get(here)!.nav, `Hacia la máquina de navegación`, () => say(`${label} está en ${name}: primero hay que volar allí desde la máquina de navegación (Panel › Abrir navegación)`, 7));
    return;
  }
  walkTo(point, label, then);
}

function goToTask(t: Task): void {
  if (t.place.spot !== "isla") return;
  const post = Number(t.id.replace("s3-puesto-", ""));
  goTo(t.place.point, t.title, t.place.vehicle as IslandId, "Tareas", () => say(READY_POSTS.includes(post) ? `En: ${t.title}. Panel › «Empezar el reto»` : `En: ${t.title}. ${IN_CONSTRUCTION}`, 6));
}

/** Ride a tree's lift from the stop she is at to another (the cab comes first if it is elsewhere). */
function ride(lift: LiftDef, from: number, to: number, then?: () => void): void {
  if (from === to) return void then?.();
  const at = cabAt.get(lift.id) ?? 0;
  mode = { kind: "ascensor", lift, from: at, to: from, t: 0, calling: at !== from, then: () => startRide(lift, from, to, then) };
  if (at === from) startRide(lift, from, to, then);
}
function startRide(lift: LiftDef, from: number, to: number, then?: () => void): void {
  cabAt.set(lift.id, from);
  mode = { kind: "ascensor", lift, from, to, t: 0, calling: false, ...(then ? { then } : {}) };
}

/** Fly to another island: walk to her pad, board, and fly each leg in sight (no teleport). */
function fly(to: IslandId): void {
  const here = island();
  const legs = planTrip(here, to, pads, crafts);
  if (!legs?.length) return say("No hay vuelo de aquí a esa isla");
  const pad = islandById.get(here)!.arrival;
  walkTo(pad, "Hacia el helipuerto", () => {
    if (flightMode() === "manual") return takeControls(here, to, legs[0]!.craft);
    // «Por reto»: the flight is programmed on the sheet, then the autopilot flies it in sight.
    const name = (id: string) => islandById.get(id as IslandId)!.name;
    const chore = flightChore(legs, crafts, name);
    mode = { kind: "reto", what: chore.id };
    showCraftOnPad(legs[0]!);
    openChallenge(chore, (b) => {
      if (b === 0) heliSpin = 1;
    }, (ok) => {
      heliSpin = 0;
      if (ok) {
        mode = { kind: "vuelo", legs, i: 0, t: 0, to };
        say("Programa correcto: despega el piloto automático");
      } else {
        heli.group.visible = rug.group.visible = false;
        mode = { kind: "libre" };
        say("Vuelo sin programar: sigue en el helipuerto");
      }
    });
  });
}

/** The craft waits on her pad while she programs it, the rotor starting once it is started. */
let heliSpin = 0;
function showCraftOnPad(leg: Leg): void {
  const craft = leg.craft === "helicoptero" ? heli : rug;
  heli.group.visible = leg.craft === "helicoptero";
  rug.group.visible = leg.craft === "alfombra";
  craft.group.position.set(leg.a.x, leg.a.y, leg.a.z);
  craft.group.rotation.y = Math.atan2(leg.b.x - leg.a.x, leg.b.z - leg.a.z);
}

/**
 * A chore on the sheet: `beat(index, part)` when a step (or, step by step, one block of an order) is answered right;
 * `done(ok)` when it closes.
 */
function openChallenge(chore: Chore, beat: (index: number, part: number) => void, done: (ok: boolean) => void): void {
  const run = new ChoreRun(chore);
  const seen = new Map<number, number>();
  duel.onClose = () => {
    duel.onClose = undefined;
    duel.onRightPick = undefined;
    done(run.status === "done");
  };
  duel.show(
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
    { ...SHEET, title: chore.title },
    (ans: Answer) => {
      const index = run.step;
      const ok = run.submit(ans);
      if (ok) {
        // The parts of an order not yet seen step by step, then the rest.
        const ex = chore.exercises[index]!;
        const parts = ex.kind === "order" ? ex.solution.length : 1;
        for (let p = seen.get(index) ?? 0; p < parts; p++) beat(index, p);
        seen.set(index, parts);
      }
      return { ok };
    },
  );
  duel.onRightPick = (id, slot) => {
    const index = run.step;
    if (run.current?.id !== id) return;
    const from = seen.get(index) ?? 0;
    for (let p = from; p <= slot; p++) beat(index, p);
    seen.set(index, Math.max(from, slot + 1));
  };
}

// --- The training posts' challenges (application/stations.ts) --------------------------------------------------------
/** Who gives post `post`'s challenge now: the trainer on shift there, if any (else the post waits for the next shift). */
const trainerOf = (post: number) => trainerFor(TRAINERS, post, hour());
/** «Sin turno ahora: el siguiente empieza a las 12:00, con Julián». */
function pauseText(post: number): string {
  const next = nextShift(TRAINERS, post, hour());
  const when = next ? `el siguiente empieza a las ${clockText(next.at)}${next.at >= 24 ? " de mañana" : ""}, con ${trainerById(next.id).name}` : "nadie tiene turno aquí";
  return `Sin turno a las ${clockText(hour())}: ${when}. Mientras, puede comer, descansar o hacer otras tareas`;
}
let stageTrainer: string | undefined;

function startPost(m: MachineDef): void {
  const post = m.post!;
  const st = stationFor(post);
  const where = stages.get(post);
  if (!st || !where) return say(IN_CONSTRUCTION);
  const who = trainerOf(post);
  if (!who) return say(pauseText(post), 6);
  const t = trainerById(who);
  if (!crowd.atPost(who, post)) return say(`${t.name} está de turno aquí y viene de camino: llega en ${duration(crowd.etaS(who))}`, 5);
  mode = { kind: "reto", what: st.chore.id };
  stageTrainer = who;
  const actor = crowd.lend(who, true);
  stage.open(where, { rig, fig: avatar }, actor);
  rigs.begin(post);
  rigTurn = 0;
  // Side on to the line from her to the trainer (both in a phone's narrow view), from the side with more room; the
  // camera stick turns round them.
  const her0 = Object.values(where.her)[0] ?? where.lap?.from;
  const side = her0 && Math.hypot(where.trainer.x - her0.x, where.trainer.z - her0.z) > 0.5 ? Math.atan2(where.trainer.x - her0.x, where.trainer.z - her0.z) + Math.PI / 2 : stage.startFace + Math.PI / 2;
  yaw = roomiestYaw(where, side);
  pitch = 0;
  signsOff(m.id, true);
  rig.visible = true;
  say(`${t.name} te da el reto`, 3);
  openChallenge(
    st.chore,
    (index, part) => {
      stage.play(beatsFor(st.beats, index, part).slice(0, 1));
      // Robotics: the arm's move of the block just placed, on the simulator's screens.
      const move = post === 9 ? armMoves(st.chore, index)[part] : undefined;
      if (move) rigs.armPlay([move]);
    },
    (ok) => {
      stage.finish();
      if (ok) {
        passed.add(post);
        autoSave.mark("reto");
        say(`Puesto ${post} superado: ${st.chore.title}`, 5);
      } else say("Reto sin terminar: se puede repetir cuando quieras", 4);
      // The last beats play out, then she is back where she started it.
      endPost = () => {
        stage.clear();
        rigs.end(ok);
        signsOff(m.id, false);
        crowd.lend(stageTrainer ?? "", false);
        stageTrainer = undefined;
        mode = { kind: "libre" };
        cardKey = "";
      };
      if (!ok) endPost();
    },
  );
}
let endPost: (() => void) | undefined;
/** The side to look from with the most room before a wall (the camera never goes through one). */
function roomiestYaw(st: Stage, first: number): number {
  const a = L.areas.find((q) => q.id === st.room);
  const her = Object.values(st.her)[0] ?? st.lap!.from;
  const c = { x: (her.x + st.trainer.x) / 2, z: (her.z + st.trainer.z) / 2 };
  if (!a) return first;
  let best = { yaw: first, room: -1 };
  for (let i = 0; i < 8; i++) {
    const yw = first + (i * Math.PI) / 4;
    const room = Math.min(roomAlong(a, c, yw), 7) - (i % 2) * 0.01;
    if (room > best.room + 0.5) best = { yaw: yw, room };
  }
  return best.yaw;
}

/** How far from `c` along `yaw` before the area's walls. */
function roomAlong(a: { centre: { x: number; z: number }; half: { x: number; z: number } }, c: { x: number; z: number }, yaw: number): number {
  const dx = Math.sin(yaw);
  const dz = Math.cos(yaw);
  const tx = dx > 1e-6 ? (a.centre.x + a.half.x - c.x) / dx : dx < -1e-6 ? (a.centre.x - a.half.x - c.x) / dx : Infinity;
  const tz = dz > 1e-6 ? (a.centre.z + a.half.z - c.z) / dz : dz < -1e-6 ? (a.centre.z - a.half.z - c.z) / dz : Infinity;
  return Math.min(tx, tz) - 0.7;
}

/** The machine's and the room's signs hang over the post: hidden while its challenge is acted. */
function signsOff(machine: string, off: boolean): void {
  const m = parts.root.getObjectByName(`cartel-m:${machine}`);
  if (m) m.visible = !off;
}

// --- Flying by hand (reglas.md §3.6, «Manual») ------------------------------------------------------------------------
const TAP: Record<string, HandControl> = { "t:z:-1": "ciclico-adelante", "t:z:1": "ciclico-atras", "t:x:-1": "ciclico-izquierda", "t:x:1": "ciclico-derecha", "t:y:1": "colectivo-arriba", "t:y:-1": "colectivo-abajo", "r:y:1": "pedal-izquierdo", "r:y:-1": "pedal-derecho" };
const handPad = new RcsPad(root, {
  cls: "s3-hand-pad",
  helicopter: true,
  endLabel: "Dejar los mandos",
  note: "Mandos de un helicóptero (S-92): el cíclico inclina el rotor, el colectivo sube o baja y los pedales giran el morro; la alfombra los imita. Cada toque, un paso (nuestro)",
  translate: (a, sg) => handInput(TAP[`t:${a}:${sg}`]),
  rotate: (a, sg) => handInput(TAP[`r:${a}:${sg}`]),
  stop: () => {
    if (mode.kind === "mano") mode.s = handHover(mode.s);
  },
  end: () => leaveControls(),
});
function handInput(c: HandControl | undefined): void {
  if (mode.kind !== "mano" || !c) return;
  mode.s = handTap(mode.s, c, HAND[mode.s.craft].value);
}

function takeControls(from: IslandId, to: IslandId, craft: Craft): void {
  const pad = islandById.get(from)!.pad;
  const dest = islandById.get(to)!.pad;
  const s = handStart(craft, pad, Math.atan2(dest.at.x - pad.at.x, dest.at.z - pad.at.z));
  mode = { kind: "mano", s, to, from };
  handPad.show(true);
  yaw = s.heading + Math.PI;
  pitch = -0.15;
  say(`${craft === "helicoptero" ? "A los mandos del S-92" : "En la alfombra"}: colectivo + para despegar; aterriza despacio en ${islandById.get(to)!.name}`, 6);
}

function leaveControls(): void {
  if (mode.kind !== "mano") return;
  const s = mode.s;
  if (!s.onGround) return say("Primero hay que posarse: colectivo − despacio sobre un helipuerto o un andén");
  if (!s.landedOn) return say("Aquí no se puede bajar: posa en el círculo de un helipuerto o el andén de las alfombras");
  const from = mode.from;
  heli.group.visible = rug.group.visible = false;
  handPad.show(false);
  const dest = islandById.get(s.landedOn as IslandId)!;
  placeAtPoint(dest.arrival);
  yaw = Math.atan2(-((dest.rect.x0 + dest.rect.x1) / 2 - body.x), -((dest.rect.z0 + dest.rect.z1) / 2 - body.z));
  pitch = 0;
  mode = { kind: "libre" };
  avatar.pose("stand");
  say(s.landedOn === from ? "Fuera de los mandos, donde despegó" : `En ${dest.name}`);
}

function frameHand(dt: number, m: Extract<Mode, { kind: "mano" }>): void {
  const lim = HAND[m.s.craft].value;
  const world = { floors: L.world.floors, solids: L.world.solids, seaY: SEA_Y, pads };
  // Small steps, so a fast craft never jumps a wall.
  const n = Math.max(1, Math.ceil((Math.hypot(m.s.vFwd, m.s.vSide, m.s.vUp) * dt) / 2));
  for (let i = 0; i < n; i++) m.s = handStep(m.s, dt / n, world, lim);
  const craft = m.s.craft === "helicoptero" ? heli : rug;
  heli.group.visible = m.s.craft === "helicoptero";
  rug.group.visible = m.s.craft === "alfombra";
  craft.group.position.set(m.s.x, m.s.y, m.s.z);
  craft.group.rotation.y = m.s.heading;
  heli.rotor.rotation.y += dt * (m.s.onGround && m.s.ask.up <= 0 ? 8 : 20);
  craft.seat.getWorldPosition(tmp);
  body = { ...body, x: tmp.x, y: tmp.y - 0.45, z: tmp.z };
  const dest = islandById.get(m.to)!.pad.at;
  const dist = Math.hypot(dest.x - m.s.x, dest.z - m.s.z);
  const brg = ((Math.atan2(dest.x - m.s.x, dest.z - m.s.z) - m.s.heading) * 180) / Math.PI;
  const rel = Math.round(((brg % 360) + 540) % 360 - 180);
  const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString("es-ES");
  handPad.update({
    title: m.s.onGround ? (m.s.landedOn ? `Posada en ${islandById.get(m.s.landedOn as IslandId)!.name}` : "Posada (fuera de un helipuerto)") : `En vuelo hacia ${islandById.get(m.to)!.name}`,
    head: ["Ahora", "Pedido"],
    rows: [
      { label: "Adelante", cells: [{ text: `${Math.round(m.s.vFwd * 3.6)} km/h` }, { text: `${Math.round(m.s.ask.fwd * lim.fwdStepMs * 3.6)} km/h` }] },
      { label: "Lado", cells: [{ text: `${fmt(m.s.vSide)} m/s` }, { text: `${fmt(m.s.ask.side * lim.fwdStepMs)} m/s` }] },
      { label: "Vertical", cells: [{ text: `${fmt(m.s.vUp)} m/s`, ...(m.s.vUp < -lim.touchdownMs ? { ok: false } : {}) }, { text: `${fmt(m.s.ask.up * lim.climbStepMs)} m/s` }] },
    ],
    lines: [`Altura ${Math.round(m.s.y - SEA_Y)} m sobre el mar · destino a ${dist < 1000 ? `${Math.round(dist)} m` : `${fmt(dist / 1000)} km`}, ${rel === 0 ? "de frente" : rel > 0 ? `${rel}° a la izquierda` : `${-rel}° a la derecha`}`, m.s.bump === "rotor" ? "▲ El rotor toca algo: atrás o arriba" : m.s.bump === "mar" ? "Sobre el mar: estacionario más bajo (no se amara)" : m.s.bump === "dura" ? "▲ Demasiado deprisa para posarse: colectivo − de un paso" : m.s.onGround && m.s.landedOn ? "«Dejar los mandos» para bajar" : ""],
  });
}

function islandChoices(): IslandChoice[] {
  const here = island();
  return L.islands.map((i: IslandDef) => {
    const legs = i.id === here ? undefined : planTrip(here, i.id, pads, crafts);
    const how = legs && `${[...new Set(legs.map((l) => (l.craft === "helicoptero" ? "Helicóptero S-92" : "Alfombra")))].join(" y ")} · ${duration(tripSeconds(legs))}${legs.length > 1 ? ` · escala en ${islandById.get(legs[0]!.to as IslandId)!.name}` : ""}`;
    return {
      id: i.id,
      name: i.name,
      desc: i.desc,
      ...(how ? { how } : {}),
      ...(i.id === here ? { locked: "Estás aquí" } : legs ? {} : { locked: "Sin vuelo desde aquí" }),
      here: i.id === here,
      x0: i.rect.x0,
      x1: i.rect.x1,
      z0: i.rect.z0,
      z1: i.rect.z1,
      y: i.deckY,
      pad: i.pad.at,
    };
  });
}

const duration = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`);

// --- The machines ----------------------------------------------------------------------------------------------------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
let near: MachineDef | undefined;
let cardKey = "";
function nearestMachine(): MachineDef | undefined {
  if (mode.kind !== "libre" && mode.kind !== "ruta") return undefined;
  let best: { m: MachineDef; d: number } | undefined;
  const reach = Math.max(ACTION_REACH_M * L.k, 0.9);
  for (const m of L.machines) {
    if (Math.abs(m.y - body.y) > 1) continue;
    const d = Math.hypot(m.x - body.x, m.z - body.z);
    if (d <= reach && (!best || d < best.d)) best = { m, d };
  }
  return best?.m;
}
function renderCard(): void {
  const m = near;
  const ready = m?.post !== undefined && READY_POSTS.includes(m.post);
  const who = ready ? trainerOf(m!.post!) : undefined;
  const there = ready && !!who && crowd.atPost(who, m!.post!);
  // The pause's text changes with the clock only at a change of shift: the hour in the key is enough.
  const key = m ? `${m.id}|${mode.kind}|${who}|${there}|${ready && passed.has(m.post!)}|${ready && !who ? Math.floor(hour() * 60) : ""}` : "";
  if (key === cardKey) return;
  cardKey = key;
  card.classList.toggle("hidden", !m);
  if (!m) return;
  let acts = "";
  let why = "";
  if (m.kind === "navegacion") acts = `<button class="primary" data-act="nav">Abrir navegación</button>`;
  else if (m.kind === "ascensor" && m.lift) {
    const lift = L.lifts.find((l) => l.id === m.lift!.id)!;
    acts = lift.stops.map((s, i) => (i === m.lift!.stop ? "" : `<button data-act="stop:${i}" aria-label="Ascensor a ${esc(s.label)}">${esc(s.label)}</button>`)).join("");
  } else if (m.kind === "esterilla") acts = `<button class="primary" data-act="ajustes">Sentarse: ajustes</button>`;
  else if (m.kind === "simulador") acts = "";
  else if (ready && !who) {
    acts = `<button data-act="reto" disabled>Empezar el reto</button>`;
    why = `<p class="cm-why"><b aria-hidden="true">⏸</b> ${esc(pauseText(m.post!))}${passed.has(m.post!) ? ` · <b class="cm-ok">✓ Superado</b>` : ""}</p>`;
  } else if (ready && who) {
    const t = trainerById(who);
    acts = `<button class="primary" data-act="reto">${passed.has(m.post!) ? "Repetir el reto" : "Empezar el reto"}</button>`;
    why = `<p class="cm-who">Da el reto: <b>${esc(t.name)}</b>, de turno${there ? "" : " · viene de camino"}${passed.has(m.post!) ? ` · <b class="cm-ok">✓ Superado</b>` : ""}</p>`;
  } else {
    acts = `<button data-act="reto" disabled>Empezar el reto</button>`;
    why = `<p class="cm-why"><b aria-hidden="true">⊘</b> ${esc(IN_CONSTRUCTION)}</p>`;
  }
  // Post 8's simulators: practice by hand any time (it is the simulator: no trainer needed).
  if (m.id === "dragon-simulador") acts += `<button data-act="sim:acople">Practicar el acople</button>`;
  if (m.id === "lm-simulador") acts += `<button class="primary" data-act="sim:alunizaje">Practicar el alunizaje (LM)</button>`;
  card.innerHTML = `<div class="cm-head"><b>${esc(m.label)}</b><small>${esc(m.what)}</small></div>${why}<div class="cm-acts">${acts}</div>`;
}
card.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
  const m = near;
  if (!b || b.disabled || !m) return;
  const act = b.dataset.act!;
  if (act === "nav") return nav.open(islandChoices());
  if (act === "reto" && m.post !== undefined) return startPost(m);
  if (act.startsWith("sim:") && mode.kind === "libre") {
    mode = { kind: "reto", what: "simulador" };
    simAt = m.id;
    signsOff(m.id, true);
    rig.visible = true;
    return sims.start(act.slice(4) as SimKind, { rig, fig: avatar });
  }
  if (act === "ajustes") {
    avatar.pose("lotus");
    return settingsPanel.open("Esterilla del gimnasio, isla de entrenamiento");
  }
  if (act.startsWith("stop:") && m.lift) {
    const lift = L.lifts.find((l) => l.id === m.lift!.id)!;
    ride(lift, m.lift.stop, Number(act.slice(5)));
  }
});
settingsPanel.onClose = () => avatar.pose("stand");

// --- Saving (docs/design/partidas.md) ----------------------------------------------------------------------------------
const book = savedGames();
const autoSave = new AutoSave();
const session = playSession();
let slot = session.slotId;
let lastIsland = island();
if (session.resume) {
  const s = session.resume.state as AerialState;
  days = s.boardDays;
  const b = placeAt(L.world, s.at.x, s.at.y + 0.01, s.at.z);
  if (b) body = b;
  if (typeof s.yaw === "number") yaw = s.yaw;
  say(`Partida ${session.resume.id} recuperada: ${session.resume.summary.vehicle} · ${session.resume.summary.place}`, 5);
} else if (!slot) say("Las ranuras de partidas están llenas: esta partida no se guarda (borra una en el engranaje del inicio)", 6);
let lastSaved: { reason: string; ok: boolean; why?: string } | undefined;
if (session.resume) for (const n of (session.resume.state as AerialState).posts ?? []) passed.add(n);
const crowd = new TrainerCrowd(L, stages, TRAINERS, hour());
scene.add(crowd.root);
function saveNow(reason: string): boolean {
  autoSave.saved(clock);
  if (!slot) return false;
  // Mid-flight or mid-ride she is kept where it began: a pad or a lift stop is a place to come back to.
  const from = mode.kind === "vuelo" ? (mode.legs[0]!.from as IslandId) : mode.kind === "mano" ? mode.from : undefined;
  const at = from ? byPoint.get(islandById.get(from)!.arrival)! : body;
  const isl = from ?? island();
  const state: AerialState = { boardDays: days, at: { x: at.x, y: at.y, z: at.z, island: isl }, yaw, k: L.k, settings: { ajustes: settings.serialized() }, posts: [...passed].sort((a, b) => a - b) };
  const area = L.areas.find((a) => a.id === body.area)?.label ?? ISLAND_NAME[isl];
  const r = book.save(slot, { level: AERIAL_LEVEL, boardDay: boardDayOf(days), summary: { vehicle: ISLAND_NAME[isl], place: area }, state });
  lastSaved = { reason, ok: r.ok, ...(r.ok ? {} : { why: r.why }) };
  if (!r.ok) say(r.why);
  return r.ok;
}
document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && saveNow("ocultar"));
window.addEventListener("pagehide", () => saveNow("ocultar"));

// --- Each frame ------------------------------------------------------------------------------------------------------
const WALK_MS = 1.4;
const SWIM_MS = 0.9;
const tmp = new THREE.Vector3();
const focusAt = new THREE.Vector3();
const camPos = new THREE.Vector3();
const camAt = new THREE.Vector3();
const camUp = new THREE.Vector3(0, 1, 0);

/** Move her by up to `d` metres towards (x, y, z), in small steps; true when there. */
function moveToward(p: { x: number; y: number; z: number }, d: number): boolean {
  let left = d;
  while (left > 1e-6) {
    const dx = p.x - body.x;
    const dz = p.z - body.z;
    const dy = body.motion === "agua" ? p.y - body.y : 0;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.05) return true;
    const s = Math.min(0.25, left, dist) / dist;
    let next = step(L.world, body, { dx: dx * s, dy: dy * s, dz: dz * s });
    if (next === body && body.motion === "agua" && Math.abs(dy) > 0.05) next = step(L.world, body, { dx: 0, dy: Math.sign(dy) * Math.min(0.25, Math.abs(dy)), dz: 0 });
    if (next === body) return false;
    if (Math.hypot(dx, dz) > 0.05) yaw = Math.atan2(-dx, -dz);
    body = next;
    left -= 0.25;
  }
  const close = Math.hypot(p.x - body.x, p.z - body.z) < 0.08 && (body.motion !== "agua" || Math.abs(p.y - body.y) < 0.3);
  return close;
}

function frameRoute(dt: number, m: Extract<Mode, { kind: "ruta" }>): void {
  const target = m.pts[m.i]!;
  const before = { x: body.x, y: body.y, z: body.z };
  const there = moveToward(target, (body.motion === "agua" ? SWIM_MS : WALK_MS) * dt);
  stride += Math.hypot(body.x - before.x, body.z - before.z) * 3;
  m.still = Math.hypot(body.x - before.x, body.y - before.y, body.z - before.z) < 1e-4 ? m.still + dt : 0;
  if (!there && m.still > 1.5) {
    // Stuck on a corner (should not happen: layout.test.ts walks every link): stop and give her the controls.
    mode = { kind: "libre" };
    return say("Se ha quedado atascada: sigue tú con el joystick");
  }
  if (!there) return;
  // At a lift stop whose next point is a stop of the same lift: that edge is ridden, to the last stop in a row.
  const next = m.pts[m.i + 1];
  if (next && target.lift && next.lift && target.lift.id === next.lift.id) {
    const lift = L.lifts.find((l) => l.id === target.lift!.id)!;
    let j = m.i + 1;
    while (m.pts[j + 1]?.lift?.id === lift.id) j++;
    const rest = { ...m, i: j + 1, still: 0 };
    ride(lift, target.lift.stop, m.pts[j]!.lift!.stop, () => {
      if (rest.i < rest.pts.length) mode = rest;
      else {
        mode = { kind: "libre" };
        rest.then?.();
      }
    });
    return;
  }
  m.i++;
  if (m.i >= m.pts.length) {
    mode = { kind: "libre" };
    m.then?.();
  }
}

function frameLift(dt: number, m: Extract<Mode, { kind: "ascensor" }>): void {
  m.t += dt;
  const a = m.lift.stops[m.from]!.y;
  const b = m.lift.stops[m.to]!.y;
  const y = cabHeight(a, b, m.t, LIFT.value);
  parts.cabs.get(m.lift.id)?.position.setY(y);
  if (!m.calling) body = { ...body, x: m.lift.x, z: m.lift.z, y };
  if (m.t >= liftSeconds(Math.abs(b - a), LIFT.value)) {
    cabAt.set(m.lift.id, m.to);
    const then = m.then;
    if (!m.calling) {
      placeAtPoint(m.lift.stops[m.to]!.point);
      mode = { kind: "libre" };
    }
    then?.();
  }
}

function frameFlight(dt: number, m: Extract<Mode, { kind: "vuelo" }>): void {
  const leg = m.legs[m.i]!;
  const c = crafts[leg.craft];
  m.t += dt;
  const pose = legPose(leg, m.t, c);
  const craft = leg.craft === "helicoptero" ? heli : rug;
  heli.group.visible = leg.craft === "helicoptero";
  rug.group.visible = leg.craft === "alfombra";
  craft.group.position.set(pose.x, pose.y, pose.z);
  craft.group.rotation.y = pose.heading;
  heli.rotor.rotation.y += dt * 20;
  craft.seat.getWorldPosition(tmp);
  body = { ...body, x: tmp.x, y: tmp.y - 0.45, z: tmp.z };
  if (m.t >= leg.seconds) {
    m.i++;
    m.t = 0;
    if (m.i >= m.legs.length) {
      heli.group.visible = rug.group.visible = false;
      const dest = islandById.get(m.to)!;
      placeAtPoint(dest.arrival);
      // Out of the craft she faces the island (its middle: the tree on a cap, the deck on the sea pad).
      yaw = Math.atan2(-((dest.rect.x0 + dest.rect.x1) / 2 - body.x), -((dest.rect.z0 + dest.rect.z1) / 2 - body.z));
      pitch = 0;
      mode = { kind: "libre" };
      avatar.pose("stand");
      fade();
      say(`En ${islandById.get(m.to)!.name}`);
    }
  }
}

function frameFree(dt: number): void {
  const mv = walker.move();
  if (!mv.forward && !mv.right) return;
  const speed = (body.motion === "agua" ? SWIM_MS : WALK_MS) * dt;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const dx = (fx * mv.forward + Math.cos(yaw) * mv.right) * speed;
  const dz = (fz * mv.forward - Math.sin(yaw) * mv.right) * speed;
  const dy = body.motion === "agua" ? Math.sin(pitch) * mv.forward * speed : 0;
  const before = body;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.2));
  for (let i = 0; i < n; i++) body = step(L.world, body, { dx: dx / n, dy: dy / n, dz: dz / n });
  stride += Math.hypot(body.x - before.x, body.z - before.z) * 3;
}

function frameBirds(dt: number): void {
  for (const b of birds) {
    const a = (clock * b.speed) / b.r + b.phase;
    let x = home.x + Math.cos(a) * b.r;
    let z = home.z + Math.sin(a) * b.r;
    if (b.far) {
      // The albatross ranges between its home and the energy park, and back.
      const u = 0.5 - 0.5 * Math.cos(clock / 90 + b.phase);
      x = x + (parkC.x - home.x) * u;
      z = z + (parkC.z - home.z) * u;
    }
    const nx = home.x + Math.cos(a + 0.05) * b.r - (home.x + Math.cos(a) * b.r);
    const nz = home.z + Math.sin(a + 0.05) * b.r - (home.z + Math.sin(a) * b.r);
    b.g.position.set(x, b.y + Math.sin(clock * 0.3 + b.phase) * 6, z);
    b.g.rotation.y = Math.atan2(nx, nz);
    const flap = Math.sin(clock * 6 + b.phase) * 0.5;
    b.wings.forEach((w, i) => (w.rotation.z = i ? -flap : flap));
  }
  // Once a second, each turbine looks for birds (EnergySite.ScanNow): one within 200 m stops it.
  if (clock >= scanAt) {
    scanAt = clock + 1;
    parts.turbines.forEach((t, i) => {
      const hub = { x: t.x, y: t.group.position.y + TURBINE.value.hubM, z: t.z };
      const d = birds.map((b) => Math.hypot(b.g.position.x - hub.x, b.g.position.y - hub.y, b.g.position.z - hub.z));
      turbineStops[i] = scan(turbineStops[i]!, clock, d, BIRD_STOP.value);
    });
  }
  parts.turbines.forEach((t, i) => {
    if (!turbineStops[i]!.stopped) t.rotor.rotation.z += dt * 2.5;
  });
  for (const r of parts.rotors) r.rotation.y += dt * 1.2;
  void dt;
}

let sideMoves = -1;
let sideTurned = false;
function updateCamera(dt: number): void {
  const look = walker.look(dt);
  yaw += look.yaw;
  pitch = Math.max(-1.3, Math.min(1.3, pitch + look.pitch));
  // At a simulator, or on a moving machine (the gondola, the plane): its own view; the stick turns round it.
  if (mode.kind === "reto" && (sims.busy ? sims.eye(camPos, camAt) : stage.active && rigs.eye(camPos, camAt, (rigTurn += look.yaw), camUp, rig.position))) {
    if (sims.busy) camUp.set(0, 1, 0);
    camera.position.copy(camPos);
    // With the sheet open, what it looks at shows in the band above it.
    if (duel.visible) camAt.addScaledVector(camUp, -camPos.distanceTo(camAt) * Math.tan(0.36));
    camera.up.copy(camUp);
    camera.lookAt(camAt);
    camera.up.set(0, 1, 0);
    rig.visible = sims.kind !== "alunizaje";
    return;
  }
  if (mode.kind === "reto" && stage.active) {
    // Each beat that moves them, the camera eases side on to her and the trainer again, unless the stick turned it.
    if (stage.moves !== sideMoves) {
      sideMoves = stage.moves;
      sideTurned = false;
    }
    if (look.yaw !== 0) sideTurned = true;
    const side = stage.sideYaw();
    if (side !== undefined && !sideTurned) {
      const a = L.areas.find((q) => q.id === stage.room);
      stage.focus(focusAt);
      // Of the two sides, the nearer one with room for the shot.
      const near = (g: number) => Math.atan2(Math.sin(g - yaw), Math.cos(g - yaw));
      const opts = [side, side + Math.PI].map((g) => ({ g, turn: near(g), room: a ? roomAlong(a, focusAt, g) : 9 }));
      opts.sort((u, v) => (u.room >= 4 ? 0 : 1) - (v.room >= 4 ? 0 : 1) || Math.abs(u.turn) - Math.abs(v.turn));
      yaw += opts[0]!.turn * Math.min(1, dt * 2.5);
    }
    // The post's challenge: the camera frames her and the trainer over the sheet; the camera stick turns round them.
    const p = rig.position;
    const eye = stagesEye();
    const apart = stage.focus(focusAt);
    const c = focusAt;
    void p;
    // A low eye; with the sheet open, the view tilts down so they show in the band above it (a phone's top third).
    const camY = c.y + (duel.visible ? 0.55 : 1.5) + Math.max(0, -pitch) * 2;
    let x: number, y: number, z: number;
    if (eye) ({ x, y, z } = eye);
    else {
      const d = Math.max(5, apart * 1.2 + 2.5);
      // Inside the room: never through its walls or roof.
      const a = L.areas.find((q) => q.id === stage.room);
      const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      // She moves on (the scale, the couch, the chart): when a wall comes too close behind the camera and the stick is
      // idle, it eases round to the nearest side with room for the whole shot.
      if (a && look.yaw === 0 && roomAlong(a, c, yaw) < d * 0.85) {
        for (let i = 1; i <= 16; i++) {
          const yw = yaw + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.2;
          if (roomAlong(a, c, yw) >= d * 0.85) {
            yaw += (yw - yaw) * Math.min(1, dt * 3);
            break;
          }
        }
      }
      x = c.x + Math.sin(yaw) * d;
      z = c.z + Math.cos(yaw) * d;
      y = camY;
      if (a) {
        x = clampTo(x, a.centre.x - a.half.x + 0.7, a.centre.x + a.half.x - 0.7);
        z = clampTo(z, a.centre.z - a.half.z + 0.7, a.centre.z + a.half.z - 0.7);
        y = clampTo(y, c.y + 0.3, a.half.y * 2 - 0.4);
      }
    }
    camera.position.set(x, y, z);
    const D = Math.max(0.5, Math.hypot(x - c.x, z - c.z));
    const tilt = Math.atan2(c.y + 0.8 - y, D) - (duel.visible ? 0.42 : 0);
    camera.lookAt(c.x, y + D * Math.tan(tilt), c.z);
    rig.visible = true;
    return;
  }
  rig.position.set(body.x, body.y, body.z);
  rig.rotation.y = yaw + Math.PI;
  if (mode.kind === "vuelo" || mode.kind === "mano" || (mode.kind === "reto" && (heli.group.visible || rug.group.visible))) {
    // A chase view of the craft; the camera stick turns round it (reglas.md §3.8: the camera is never stuck).
    const isRug = rug.group.visible;
    const craft = isRug ? rug.group : heli.group;
    const dist = isRug ? 9 : 34;
    const c = craft.position;
    camera.position.set(c.x + Math.sin(yaw) * dist * Math.cos(pitch - 0.25), c.y + 4 + Math.sin(0.25 - pitch) * dist, c.z + Math.cos(yaw) * dist * Math.cos(pitch - 0.25));
    camera.lookAt(c.x, c.y + 2, c.z);
    rig.visible = isRug;
    return;
  }
  const swim = body.motion === "agua";
  const eye = body.y + EYE_M;
  if (thirdPerson) {
    const d = 3.6;
    camera.position.set(body.x + Math.sin(yaw) * d * Math.cos(pitch), eye + 0.4 - Math.sin(pitch) * d, body.z + Math.cos(yaw) * d * Math.cos(pitch));
    camera.lookAt(body.x, eye - 0.2, body.z);
    rig.visible = true;
  } else {
    camera.position.set(body.x, eye, body.z);
    camera.rotation.set(pitch, yaw, 0);
    rig.visible = false;
  }
  const moving = mode.kind === "ruta" || walker.move().forward !== 0 || walker.move().right !== 0;
  if (swim) avatar.pose("glide");
  else if (moving) avatar.walk(stride, 1);
  else if (!settingsPanel.visible) avatar.walk(stride, 0);
  avatar.update(dt);
}

/** The fixed eye of the open post's stage (inside the hypobaric chamber), if it has one. */
function stagesEye(): { x: number; y: number; z: number } | undefined {
  for (const st of stages.values()) if (mode.kind === "reto" && stationFor(st.post)?.chore.id === mode.what) return st.eye;
  return undefined;
}

function updateBar(): void {
  const busy = mode.kind === "ruta" || mode.kind === "ascensor" || mode.kind === "vuelo";
  bar.classList.toggle("hidden", !busy);
  document.body.classList.toggle("in-journey", busy);
  if (!busy) return;
  let text = "";
  if (mode.kind === "ruta") {
    const last = mode.pts[mode.pts.length - 1]!;
    const left = Math.hypot(last.x - body.x, last.y - body.y, last.z - body.z);
    text = `<b>${esc(mode.label)}</b><small>Andando · ${Math.round(left)} m</small>`;
  } else if (mode.kind === "ascensor") {
    const rise = Math.abs(mode.lift.stops[mode.to]!.y - mode.lift.stops[mode.from]!.y);
    const left = Math.max(0, liftSeconds(rise, LIFT.value) - mode.t);
    const phase = liftPhase(rise, mode.t, LIFT.value);
    text = mode.calling ? `<b>Llamando al ascensor</b><small>Baja a por ella · ${Math.ceil(left)} s</small>` : `<b>Ascensor a ${esc(mode.lift.stops[mode.to]!.label)}</b><small>${phase === "viajando" ? "Viajando" : phase === "cerrando" ? "Cerrando puertas" : "Abriendo puertas"} · ${Math.ceil(left)} s</small>`;
  } else if (mode.kind === "vuelo") {
    const leg = mode.legs[mode.i]!;
    const left = tripSeconds(mode.legs.slice(mode.i)) - mode.t;
    const ph = legPose(leg, mode.t, crafts[leg.craft]).phase;
    const last = mode.legs[mode.legs.length - 1]!.b;
    const far = Math.hypot(last.x - body.x, last.z - body.z);
    text = `<b>${leg.craft === "helicoptero" ? "Helicóptero" : "Alfombra"} a ${esc(islandById.get(leg.to as IslandId)!.name)}</b><small>${ph === "despegue" ? "Despegando" : ph === "aterrizaje" ? "Aterrizando" : "En vuelo"} · ${far < 1000 ? `${Math.round(far)} m` : `${(Math.round(far / 100) / 10).toLocaleString("es-ES")} km`} · ${duration(left)}</small>`;
  }
  if (barText.innerHTML !== text) barText.innerHTML = text;
  // Mid-air or in a moving cab there is nothing to stop: it lands or arrives first.
  barStop.hidden = mode.kind === "vuelo" || (mode.kind === "ascensor" && !mode.calling);
}

/** Test hook (dev builds or `?prueba`): the last frame's draw calls and triangles for tools/experiencia. */
const frameStats = import.meta.env.DEV || new URLSearchParams(location.search).has("prueba") ? { calls: 0, triangles: 0, frames: 0 } : null;
if (frameStats) {
  renderer.info.autoReset = false;
  (window as unknown as { __codeshipFrame: typeof frameStats }).__codeshipFrame = frameStats;
}
let firstFrame = true;
let last = performance.now();
function frame(now: number): void {
  // rAF can hand a time a little before the first `last`: never a negative step.
  const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
  last = now;
  clock += dt;
  days += dt * BOARD_DAYS_PER_REAL_S;
  const m = mode;
  // The moving machines first: she rides them where they are this frame.
  rigs.update(dt, renderer);
  if (m.kind === "ruta") frameRoute(dt, m);
  else if (m.kind === "ascensor") frameLift(dt, m);
  else if (m.kind === "vuelo") frameFlight(dt, m);
  else if (m.kind === "mano") frameHand(dt, m);
  else if (m.kind === "reto") {
    if (sims.busy) {
      sims.update(dt);
      avatar.update(dt);
    }
    stage.update(dt);
    if (heliSpin) heli.rotor.rotation.y += dt * 12;
    if (endPost && !stage.busy && !duel.visible) {
      const e = endPost;
      endPost = undefined;
      e();
    }
  } else if (!duel.visible && !nav.visible && !settingsPanel.visible && !taskBoard.visible && !areasWindow.visible) frameFree(dt);
  if (mode.kind === "vuelo" || mode.kind === "mano") avatar.pose("lotus");
  crowd.update(dt, hour());
  // While the sheet is open only it and the scene show (reglas.md §4.3): the caption only once it closes.
  const cap = mode.kind === "reto" && !duel.visible ? (stage.caption && rigs.readout ? `${stage.caption} · ${rigs.readout}` : stage.caption) : "";
  caption.classList.toggle("hidden", !cap);
  if (caption.textContent !== cap) caption.textContent = cap;
  frameBirds(dt);
  updateCamera(dt);
  updateBar();
  near = nearestMachine();
  renderCard();
  machinePanel.tick();
  const isl = island();
  sims.showLm(body.area === "entrenamiento:simulador-lm" || sims.kind === "alunizaje");
  const area = L.areas.find((a) => a.id === body.area)?.label;
  const flying = mode.kind === "vuelo" || (mode.kind === "mano" && !mode.s.onGround);
  const where = `${clockText(hour())} · ` + (flying ? "En vuelo" : mode.kind === "ascensor" && !mode.calling ? `${islandById.get(isl)!.name} · Ascensor del tronco` : `${islandById.get(isl)!.name}${area && area !== islandById.get(isl)!.name ? ` · ${area}` : ""}`);
  if (whereEl.textContent !== where) whereEl.textContent = where;
  if (toastUntil && clock > toastUntil) {
    toast.classList.remove("on");
    toastUntil = 0;
  }
  if (isl !== lastIsland && mode.kind === "libre") {
    lastIsland = isl;
    autoSave.mark("llegada");
  }
  const due = autoSave.due(clock);
  if (due) saveNow(due);
  renderer.render(scene, camera);
  if (frameStats) {
    frameStats.calls = renderer.info.render.calls;
    frameStats.triangles = renderer.info.render.triangles;
    frameStats.frames++;
    renderer.info.reset();
  }
  if (firstFrame) {
    firstFrame = false;
    performance.mark("codeship-primer-fotograma");
  }
  requestAnimationFrame(frame);
}
autoSave.saved(0);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyV" && !e.repeat && !(e.target as HTMLElement).closest("input, textarea")) {
    thirdPerson = !thirdPerson;
    menu.relabel(viewBtn, `Vista: ${thirdPerson ? "3ª" : "1ª"} persona`, "V");
  }
});
say("Isla de entrenamiento: empieza la iniciación. Muévete con el joystick; las tareas están en el menú", 6);
requestAnimationFrame(frame);

// Test hook for the experience suite (only in dev builds or with `?prueba`) (tools/experiencia/s3-recorrido.mjs) and the QA cases.
if (frameStats) (window as unknown as { codeshipS3: unknown }).codeshipS3 = {
  layout: L,
  renderer,
  camera,
  rig,
  tasks,
  taskBoard,
  areasWindow,
  nav,
  get body() {
    return body;
  },
  get yaw() {
    return yaw;
  },
  get mode() {
    return mode.kind;
  },
  get pitch() {
    return pitch;
  },
  get island() {
    return island();
  },
  get near() {
    return near?.id;
  },
  get thirdPerson() {
    return thirdPerson;
  },
  get turbines() {
    return turbineStops;
  },
  get lastSaved() {
    return lastSaved;
  },
  duel,
  stage,
  rigs,
  sims,
  crowd,
  handPad,
  get hour() {
    return hour();
  },
  /** Jump the board clock to hour `h` (later today or tomorrow). */
  setHour(h: number) {
    days += ((((h - hour()) % 24) + 24) % 24) / 24;
  },
  /** The exercise on the sheet now (the journeys' oracle). */
  get exercise() {
    return (duel as unknown as { duel?: { current?: unknown } }).duel?.current;
  },
  get hand() {
    return mode.kind === "mano" ? mode.s : undefined;
  },
  get passed() {
    return [...passed];
  },
  trainerOf,
  cabY: (id: string) => parts.cabs.get(id)?.position.y,
  craftY: () => (heli.group.visible ? heli.group.position.y : rug.group.visible ? rug.group.position.y : undefined),
  saveNow,
};
