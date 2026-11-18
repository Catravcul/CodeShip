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
import { IN_CONSTRUCTION, initiationTasks } from "@modules/aerial-sanctuary/application/initiation";
import type { AreaMap, AreaNode } from "@modules/tasks/application/areas";
import type { Task, Vehicle } from "@modules/tasks/application/task-list";
import { ISLAND_TASK_VEHICLES } from "@modules/settings/domain/settings";
import { AutoSave } from "@modules/saves/application/auto-save";
import { boardDayOf } from "@modules/saves/domain/space-state";
import { AERIAL_LEVEL, ISLAND_NAME, type AerialState } from "@modules/saves/domain/aerial-state";
import { playSession, savedGames } from "./adapters/storage/saved-games";
import { bird, buildBlocks, buildFloors, buildProps, buildSea, buildWater, carpet, helicopter } from "./adapters/three/aerial-models";
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
import { IslandNavWindow, type IslandChoice } from "./ui/island-nav";
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
scene.add(buildSea(), buildFloors(L.world.floors), buildWater(L.world.waters), buildBlocks(L.blocks));
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

type Mode = { kind: "libre" } | { kind: "ruta"; pts: WayPoint[]; i: number; label: string; then?: () => void; still: number } | { kind: "ascensor"; lift: LiftDef; from: number; to: number; t: number; calling: boolean; then?: () => void } | { kind: "vuelo"; legs: Leg[]; i: number; t: number; to: IslandId };
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
  goTo(t.place.point, t.title, t.place.vehicle as IslandId, "Tareas", () => say(`En: ${t.title}. ${IN_CONSTRUCTION}`, 6));
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
    mode = { kind: "vuelo", legs, i: 0, t: 0, to };
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
  const key = m ? `${m.id}|${mode.kind}` : "";
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
  else {
    acts = `<button data-act="reto" disabled>Empezar el reto</button>`;
    why = `<p class="cm-why"><b aria-hidden="true">⊘</b> ${esc(IN_CONSTRUCTION)}</p>`;
  }
  card.innerHTML = `<div class="cm-head"><b>${esc(m.label)}</b><small>${esc(m.what)}</small></div>${why}<div class="cm-acts">${acts}</div>`;
}
card.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
  const m = near;
  if (!b || b.disabled || !m) return;
  const act = b.dataset.act!;
  if (act === "nav") return nav.open(islandChoices());
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
function saveNow(reason: string): boolean {
  autoSave.saved(clock);
  if (!slot) return false;
  // Mid-flight or mid-ride she is kept where it began: a pad or a lift stop is a place to come back to.
  const at = mode.kind === "vuelo" ? byPoint.get(islandById.get(mode.legs[0]!.from as IslandId)!.arrival)! : body;
  const isl = mode.kind === "vuelo" ? (mode.legs[0]!.from as IslandId) : island();
  const state: AerialState = { boardDays: days, at: { x: at.x, y: at.y, z: at.z, island: isl }, yaw, k: L.k, settings: { ajustes: settings.serialized() } };
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

function updateCamera(dt: number): void {
  const look = walker.look(dt);
  yaw += look.yaw;
  pitch = Math.max(-1.3, Math.min(1.3, pitch + look.pitch));
  rig.position.set(body.x, body.y, body.z);
  rig.rotation.y = yaw + Math.PI;
  if (mode.kind === "vuelo") {
    // A chase view of the craft; the camera stick turns round it (reglas.md §3.8: the camera is never stuck).
    const leg = mode.legs[mode.i];
    const craft = leg?.craft === "alfombra" ? rug.group : heli.group;
    const dist = leg?.craft === "alfombra" ? 9 : 34;
    const c = craft.position;
    camera.position.set(c.x + Math.sin(yaw) * dist * Math.cos(pitch - 0.25), c.y + 4 + Math.sin(0.25 - pitch) * dist, c.z + Math.cos(yaw) * dist * Math.cos(pitch - 0.25));
    camera.lookAt(c.x, c.y + 2, c.z);
    rig.visible = leg?.craft === "alfombra";
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

function updateBar(): void {
  const busy = mode.kind !== "libre";
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
    text = `<b>${leg.craft === "helicoptero" ? "Helicóptero" : "Alfombra"} a ${esc(islandById.get(leg.to as IslandId)!.name)}</b><small>${ph === "despegue" ? "Despegando" : ph === "aterrizaje" ? "Aterrizando" : "En vuelo"} · ${duration(left)}</small>`;
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
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  clock += dt;
  days += dt * BOARD_DAYS_PER_REAL_S;
  const m = mode;
  if (m.kind === "ruta") frameRoute(dt, m);
  else if (m.kind === "ascensor") frameLift(dt, m);
  else if (m.kind === "vuelo") frameFlight(dt, m);
  else if (!nav.visible && !settingsPanel.visible && !taskBoard.visible && !areasWindow.visible) frameFree(dt);
  if (mode.kind === "vuelo") avatar.pose("lotus");
  frameBirds(dt);
  updateCamera(dt);
  updateBar();
  near = nearestMachine();
  renderCard();
  machinePanel.tick();
  const isl = island();
  const area = L.areas.find((a) => a.id === body.area)?.label;
  const where = mode.kind === "vuelo" ? "En vuelo" : mode.kind === "ascensor" && !mode.calling ? `${islandById.get(isl)!.name} · Ascensor del tronco` : `${islandById.get(isl)!.name}${area && area !== islandById.get(isl)!.name ? ` · ${area}` : ""}`;
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
  cabY: (id: string) => parts.cabs.get(id)?.position.y,
  craftY: () => (heli.group.visible ? heli.group.position.y : rug.group.visible ? rug.group.position.y : undefined),
  saveNow,
};
