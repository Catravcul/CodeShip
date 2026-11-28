import * as THREE from "three";
import { WORLD_SCALE } from "@core/scale";
import { moveJoystick } from "@core/realism";
import { advance as advanceEgg, stageAt as eggStage } from "@modules/sanctuary-one/domain/pulpo";
import { workOutfit } from "@modules/sanctuary-one/domain/ropa";
import { AQUARIUM_AREA, buildS1Layout, TREE_CURRENT, treeWater } from "@modules/sanctuary-one/data/layout";
import { globeDepth } from "@modules/sanctuary-one/data/globo";
import { carpetRoute, type CarpetStation } from "@modules/sanctuary-one/data/alfombras";
import { CarpetStationsView } from "./adapters/three/carpet-stations";
import { TRUNK_HALF } from "@modules/sanctuary-one/data/paso";
import { CarpetStations } from "./ui/carpet-stations";
import { personRule } from "@modules/sanctuary-one/data/overrides";
import { blocked, placeAt, waterAt, type Body } from "@modules/aerial-sanctuary/domain/walk";
import { FreeWalk } from "@modules/aerial-sanctuary/application/free-walk";
import { S1_DAY_REAL_S, S1_START_HOUR, activityAt, along, drift, flightSpeed, hash01, route, shuttle, wanderAt, type Activity, type Route } from "@modules/sanctuary-one/domain/motion";
import { Wildlife } from "@modules/sanctuary-one/application/wildlife";
import { staffPlaces, wayBetween, type Place } from "@modules/sanctuary-one/data/jornada";
import { WalkIndex } from "@modules/sanctuary-one/data/walk-index";
import { buildS1Scene, PULPO } from "./adapters/three/s1-models";
import { doneLoading } from "./ui/loading-screen";
import { CubeFigure } from "./adapters/three/interior/figure";
import { textSign } from "./adapters/three/interior/sign";
import { Walker } from "./adapters/input/walker";
import { DOMENICA_HAIR } from "./ui/portraits";
import { lookOf } from "@modules/sanctuary-one/data/looks";
/** The cube figure's own height (feet to the top of the head), to scale each person to theirs. */
const FIGURE_HEIGHT_M = 1.78;
import { RootMenu } from "./ui/root-menu";
import { SettingsPanel } from "./ui/settings-panel";
import { ICON } from "./ui/icons";
import { AreasWindow } from "./ui/areas-window";
import { settings } from "./ui/settings-store";
import { DayNight } from "./adapters/three/day-night";
import { woodGridMetres } from "@modules/settings/domain/settings";
import { offerVehicles } from "./ui/task-settings";
import type { AreaMap, AreaNode } from "@modules/tasks/application/areas";
import { CAP_NAME, LOBES, WATER_Y, capOf, isLand } from "@modules/sanctuary-one/data/site";
import { TREE } from "@modules/aerial-sanctuary/data/facts";
import { model } from "@modules/sanctuary-one/data/catalog";
import { areaCategory, capAt, CAPS } from "@modules/sanctuary-one/data/area-kinds";
import { MISSIONS, type Mission } from "@modules/sanctuary-one/data/misiones";
import { missionState } from "@modules/sanctuary-one/domain/workday-missions";
import { applyReward, procedureReto, retoTag, retosFor, type Reto } from "@modules/sanctuary-one/application/challenges";
import { retosWord } from "@modules/chores/domain/palabra";
import { nearest, type Reachable } from "@modules/sanctuary-one/domain/reach";
import { CrewMember } from "@modules/crew/domain/crew-member";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import { stepAnimation } from "@modules/sanctuary-one/application/animations";
import { STATIONS, stationWorld, type RetoAt } from "@modules/sanctuary-one/data/estaciones";
import type { StepAct } from "@modules/chores/domain/step-visual";
import { StepShow, gesture, motion, STEP_SECONDS } from "./adapters/three/interior/step-show";
import { SimTanks, STAR_POSE } from "./adapters/three/sim-tank";
import { MICROCOSMOS, SIM_RETOS, SIM_SPOTS, type SimMicrocosmos, type SimReto } from "@modules/sanctuary-one/data/simulacion";
import type { AcademiaMicro } from "./microcosmos-academia";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { DuelView, type SessionText } from "./ui/duel-view";
import { RetoPicker } from "./ui/reto-picker";
import { GamePad } from "./ui/game-pad";
import { chooseReto, offerReto } from "./ui/interaction";
import { focusReto, retoVisual, sheetLens as lens } from "./adapters/three/interior/reto-focus";
import { mapGestures } from "./ui/map-gestures";
import { sheetBand } from "./ui/sheet-band";
import { poseOnFoot, UnderwaterView } from "./adapters/three/walk-look";
import { CrownPlay } from "./s1-castillos";
import "./ui/lander-cabin.css";
import "./ui/acciones.css";
import "./ui/aerial.css";

/**
 * Sanctuary 1, Cold Sanctuary's ice sanctuary (docs/design/santuario1.md): the caps of ice, the land island, the
 * lagoon with its whales, orcas, seals and walruses, the tree-buildings with their floors (the gym's first floor
 * furnished as there), the wild families and the staff. She walks with gravity and swims in the sea and up the
 * trunks (core/realism.ts). The workday's missions come later; this is the place they will happen in.
 */
const root = document.getElementById("app")!;
// Sanctuary 3's gravity world styles (its «Moverse» and «Mirar» sticks) serve this one too.
document.body.classList.add("in-s3");
const L = buildS1Layout(WORLD_SCALE, undefined, undefined, { woodGrid: woodGridMetres(settings.value.woodGrid), animalsPerPerson: Number(settings.value.animalsPerPerson) });
// The walk world by cells (thousands of solids): each step looks only round her.
const walkIndex = new WalkIndex(L.world);
/** The drifting iceberg's solid, where it is now (moveIceberg); added to the world round her when it is near. */
let bergSolid: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number } | undefined;
/** Her height for the walk index (the solids of the floors far above and below are left out); set as she moves. */
let nearY: number | undefined;
const near = (x: number, z: number) => {
  const w = walkIndex.near(x, z, nearY);
  const b = bergSolid;
  if (!b || x < b.x0 - 64 || x > b.x1 + 64 || z < b.z0 - 64 || z > b.z1 + 64) return w;
  return { ...w, solids: [...w.solids, b] };
};

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
root.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const SKY = 0xbfd9ea;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 250, 1400);
const hemi = new THREE.HemisphereLight(0xeef6ff, 0x7c8a96, 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(-200, 300, 120);
scene.add(sun);
/** Under water: blue-green, the far side fading (adapters/three/walk-look.ts, shared with sanctuary 3). */
const underwater = new UnderwaterView(scene);
/** Day and night: the sun's arc, the sky, the stars and the moon (adapters/three/day-night.ts). */
const dayNight = new DayNight(scene, hemi, sun);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 5000);
const BASE_FOV = camera.fov;
camera.rotation.order = "YXZ";

const world = buildS1Scene(L);
scene.add(world.root);
/** The Residencia's crown at play: its slides and the pillow war (s1-castillos.ts). */
const crownPlay = new CrownPlay(L, world.root, (t, s) => say(t, s));

// The clock of sanctuary 1 (Cold Sanctuary's day: domain/motion.ts) and the workday it drives.
let hour = S1_START_HOUR;
const places = staffPlaces(L);
const areaById = new Map(L.areas.map((a) => [a.id, a]));

// The staff: one figure each, with the name over the head, following the workday along real routes.
interface Person {
  readonly f: CubeFigure;
  /** Where the figure stands (the figure's own root carries its pose's height). */
  readonly g: THREE.Group;
  readonly sign?: THREE.Object3D;
  readonly plan: Record<Activity, Place>;
  act: Activity;
  at: Place;
  way?: Route;
  s: number;
  stride: number;
  /** Seconds before setting off for the new block (each leaves at a different moment, not all at once). */
  wait: number;
  readonly carpet: THREE.Object3D;
  readonly name: string;
  /** Taking a part in an area's challenge in the simulation (data/simulacion.ts): there, doing that, till it ends. */
  role?: { x: number; y: number; z: number; yaw: number; motion: string };
  /** Dressed for the current block of the day. */
  dressed?: boolean;
}

/**
 * A flying carpet (Cold Sanctuary's CarpetPad network, «se va de un piso a otro y de un edificio a otro en
 * alfombra»): a woven rug of 1 × 1,8 m with its fringes, under whoever flies on it.
 */
const RUGS = [0x9a3b3b, 0x3b5f9a, 0x7a5a2a, 0x2f7a5a, 0x6a3b8a, 0xa0663a];
function carpetMesh(color: number): THREE.Object3D {
  const g = new THREE.Group();
  const rug = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.8), new THREE.MeshLambertMaterial({ color }));
  g.add(rug);
  const border = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.045, 1.6), new THREE.MeshLambertMaterial({ color: 0xe8c66a }));
  border.position.y = 0.002;
  g.add(border);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 1.5), new THREE.MeshLambertMaterial({ color }));
  g.add(inner);
  for (const z of [-0.93, 0.93]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.08), new THREE.MeshLambertMaterial({ color: 0xf2ead8 }));
    f.position.z = z;
    g.add(f);
  }
  g.visible = false;
  return g;
}
const people: Person[] = [];
for (const i of L.instances) {
  if (i.model !== "persona" || !i.name) continue;
  // Bulk rules for the people (overrides.ts «personas»): hidden, height, skin and clothes, for all or by name.
  const r = personRule(i.name);
  if (r.oculto) continue;
  const plan = places.get(i.name);
  if (!plan) continue;
  // Each one dressed as themself (looks.ts, from Cold Sanctuary's photos and sheets); bulk rules still win.
  const look = lookOf(i.name);
  const f = new CubeFigure(r.piel ?? look.skin, r.ropa ?? look.top, look.hair);
  f.dress({ ...look, ...(r.piel !== undefined ? { skin: r.piel } : {}), ...(r.ropa !== undefined ? { top: r.ropa } : {}) });
  const g = new THREE.Group();
  g.scale.setScalar((r.altura ?? 1) * (i.scale ?? 1) * (look.height / FIGURE_HEIGHT_M));
  g.add(f.root);
  scene.add(g);
  const s = textSign(i.name);
  s.scale.multiplyScalar(0.5);
  scene.add(s);
  const act = activityAt(hour);
  const carpet = carpetMesh(RUGS[people.length % RUGS.length]!);
  g.add(carpet);
  const p: Person = { f, g, sign: s, plan, act, at: plan[act], s: 0, stride: 0, wait: 0, carpet, name: i.name };
  settle(p);
  people.push(p);
}

/** What each solved step of a challenge looks like (the ships' «Pasos visibles», chores/application/step-visuals.ts). */
/** The steps a person is seen doing at a thing (its first challenge's), cached by model. */
const workActs = new Map<string, StepAct[]>();
function workOf(modelId: string | undefined): StepAct[] {
  if (!modelId) return [];
  let a = workActs.get(modelId);
  // On a machine's station only its exercise (adjusting and cleaning are done standing beside it).
  const all = () => retosFor(model(modelId), 0).slice(0, 1).flatMap((r) => r.chore.exercises.flatMap((_, i) => stepAnimation(r, modelId, i).acts));
  if (!a) workActs.set(modelId, (a = STATIONS[modelId] ? all().filter((v) => v.vessel?.startsWith("mov:")) : all()));
  return a;
}

/** A person stands (sits, lies) at their place. */
function settle(p: Person): void {
  p.g.position.set(p.at.x, p.at.y, p.at.z);
  p.g.rotation.y = p.at.yaw;
  p.f.pose(p.at.pose);
  p.sign?.position.set(p.at.x, p.at.y + 2.1, p.at.z);
}

const PEOPLE_WALK_MS = 1.4;
const PEOPLE_SWIM_MS = 1.8;
/** Up to this many real seconds before a person sets off (about 25 minutes of the sanctuary's day). */
const LEAVE_SPREAD_S = 60;
/** The clock of the people's work gestures (s). */
let workClock = 0;
function movePeople(dt: number): void {
  workClock += dt;
  const act = activityAt(hour);
  people.forEach((p, i) => {
    if (p.role) {
      // Playing their part in the simulation: at their station, the part's motion over and over.
      p.g.visible = true;
      p.carpet.visible = false;
      p.g.position.set(p.role.x, p.role.y, p.role.z);
      p.g.rotation.y = p.role.yaw;
      if (p.role.motion === "estrella") p.f.poseAngles(STAR_POSE);
      else p.f.poseAngles(motion(p.role.motion, workClock + i));
      // (The pose is only reached through update: without it the parts stood still, Berón 2026-11-24.)
      p.f.update(dt, 10);
      p.sign?.position.set(p.role.x, p.role.y + 2.1, p.role.z);
      return;
    }
    const inShot = !!stageStand && steps.framing && Math.hypot(p.g.position.x - stageStand.x, p.g.position.z - stageStand.z) < 1.3 && Math.abs(p.g.position.y - stageStand.y) < 1.5;
    p.g.visible = !inShot;
    if (p.sign) p.sign.visible = !inShot;
    if (act !== p.act || !p.dressed) {
      p.dressed = true;
      // The clothes of their schedule: their trade's at work and training, their own otherwise (Berón 2026-11-24).
      p.f.wear(act === "tareas" || act === "entrenamiento" ? workOutfit(areaById.get(p.plan[act].area)?.furnish) : undefined);
    }
    if (act !== p.act) {
      p.act = act;
      // Each one finishes what they were doing and leaves at their own moment.
      p.wait = hash01(i + 1, Math.floor(hour * 10) + 7) * LEAVE_SPREAD_S;
      p.way = undefined;
    }
    if (p.wait > 0 && (p.wait -= dt) <= 0) {
      const to = p.plan[act];
      const pos = p.g.position;
      p.way = route(wayBetween(L, { ...p.at, x: pos.x, y: pos.y, z: pos.z }, to));
      p.at = to;
      p.s = 0;
    }
    if (!p.way) {
      // At their place, they do its work: its challenge's steps one after another, each gesture its 2 s and a breath.
      const acts = p.at.pose === "stand" && p.wait <= 0 ? workOf(p.at.work) : [];
      if (acts.length && Math.hypot(p.g.position.x - camera.position.x, p.g.position.y - camera.position.y, p.g.position.z - camera.position.z) < 60) {
        const cyc = STEP_SECONDS + 0.8;
        const k = (workClock + i * 1.37) / cyc;
        const v = acts[Math.floor(k) % acts.length]!;
        const t = Math.min(1, (k % 1) * (cyc / STEP_SECONDS));
        p.f.poseAngles(gesture(v, t, workClock, false));
      }
      p.f.update(dt);
      return;
    }
    const here = along(p.way, p.s);
    // On a carpet: like a car, speeding up and slowing down (domain/motion.ts flightSpeed, 12 m/s cruise).
    p.s += (here.fly ? flightSpeed(p.way, p.s) : here.swim ? PEOPLE_SWIM_MS : PEOPLE_WALK_MS) * dt;
    const q = along(p.way, p.s);
    p.carpet.visible = q.fly && !q.done;
    p.f.wearMask(q.swim && !q.done);
    if (q.done) {
      p.way = undefined;
      settle(p);
    } else {
      p.g.position.set(q.x, q.y, q.z);
      if (!Number.isNaN(q.yaw)) p.g.rotation.y = q.yaw;
      p.sign?.position.set(q.x, q.y + 2.1, q.z);
      if (q.fly) p.f.pose("lotus");
      else if (q.swim) p.f.pose("glide");
      else p.f.walk((p.stride += PEOPLE_WALK_MS * dt * 3), 1);
    }
    p.f.update(dt);
  });
}

// The animals: the wandering ones walk their territories (domain/motion.ts wanderAt), all move their jointed
// bodies (domain/animal-body.ts): legs, flippers, flukes and wings while they go, a slow sway at rest.
let wildT = 0;
const moving = new Set(world.movers.map((m) => m.it));
/** Their lives and activities (application/wildlife.ts), on the real calendar: game day 0 is today's date. */
const yearDay0 = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 86_400_000);
const wild = new Wildlife(L.instances, world.movers.map((m) => m.it).filter((it) => !it.wander!.climb), yearDay0);
// The work submarine (layout.ts submarineDive): five minutes in its bay, out down its trunk to the lagoon at 1,5 m/s
// (a Triton 3300/3 does up to 3 knots), two minutes there, and back.
const sub = L.submarine && (() => {
  const it = L.instances[L.submarine.index]!;
  const key = `${it.model}|${it.tint ?? ""}`;
  const n = L.instances.slice(0, L.submarine.index).filter((o) => o.model === it.model && (o.tint ?? "") === (it.tint ?? "")).length;
  return { it, mesh: world.meshes.get(key), n, route: route(L.submarine.route) };
})();
const subM = new THREE.Matrix4();
const subQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
function moveSubmarine(): void {
  if (!sub?.mesh) return;
  const p = shuttle(sub.route, wildT, 1.5, 300, 120);
  const sc = sub.it.scale ?? 1;
  subQ.setFromAxisAngle(UP, p.moving || p.y < sub.it.y - 0.1 ? p.yaw + Math.PI : sub.it.rot);
  subM.compose(new THREE.Vector3(p.x, p.y, p.z), subQ, new THREE.Vector3(sc, sc, sc));
  sub.mesh.setMatrixAt(sub.n, subM);
  sub.mesh.instanceMatrix.needsUpdate = true;
  sub.mesh.computeBoundingSphere();
}
// The drifting iceberg (Icebergs.cs: 0,2 m/s between its two points, about 38 min a way) and its visitors with it.
const berg = L.drift && (() => {
  const it = L.instances[L.drift.index]!;
  const key = `${it.model}|${it.tint ?? ""}`;
  const n = L.instances.slice(0, L.drift.index).filter((o) => o.model === it.model && (o.tint ?? "") === (it.tint ?? "")).length;
  return { it, mesh: world.meshes.get(key), n, visitors: new Set(L.drift.visitors.map((i) => L.instances[i]!)) };
})();
let bergDx = 0;
let bergDz = 0;
function moveIceberg(): void {
  if (!berg?.mesh || !L.drift) return;
  const p = drift(L.drift.a, L.drift.b, 0.2, wildT);
  bergDx = p.x - berg.it.x;
  bergDz = p.z - berg.it.z;
  const d = model(berg.it.model).size;
  bergSolid = { x0: p.x - d.x / 2, x1: p.x + d.x / 2, z0: p.z - d.z / 2, z1: p.z + d.z / 2, y0: -40, y1: berg.it.y + d.y };
  const sc = berg.it.scale ?? 1;
  subQ.setFromAxisAngle(UP, berg.it.rot);
  subM.compose(new THREE.Vector3(p.x, berg.it.y, p.z), subQ, new THREE.Vector3(sc, sc, sc));
  berg.mesh.setMatrixAt(berg.n, subM);
  berg.mesh.instanceMatrix.needsUpdate = true;
  berg.mesh.computeBoundingSphere();
}
function moveAnimals(dt: number): void {
  wildT += dt;
  wild.step(dt, wildT, day + hour / 24, { x: body.x, z: body.z });
  moveSubmarine();
  moveIceberg();
  for (const { herd, index, it } of world.animals) {
    const t = wildT + index * 0.37;
    const a = wild.get(it);
    if (a) herd.pose(index, a.x, a.y, a.z, a.yaw, t, a.moving, a.scale);
    else if (moving.has(it)) {
      const w = it.wander!;
      const p = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, wildT + w.seed, w.speed);
      // Up and down its trunk: a slow swim from the root under the ice to the top and back (~0,4 m/s vertically).
      const y = w.climb ? w.climb.y0 + (w.climb.y1 - w.climb.y0) * (0.5 - 0.5 * Math.cos(((wildT + w.seed) * 0.8) / (w.climb.y1 - w.climb.y0))) : it.y;
      herd.pose(index, p.x, y, p.z, p.yaw, t, p.moving || !!w.climb, it.scale ?? 1);
    } else if (berg?.visitors.has(it)) herd.pose(index, it.x + bergDx, it.y, it.z + bergDz, it.rot, t, false, it.scale ?? 1);
    else herd.pose(index, it.x, it.y, it.z, it.rot, t, false, it.scale ?? 1);
  }
  for (const h of world.herds) h.commit();
}

const avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
avatar.root.scale.setScalar(0.92);
const rig = new THREE.Group();
rig.add(avatar.root);
scene.add(rig);
const myCarpet = carpetMesh(0x2f7f8f);
rig.add(myCarpet);
/** Flying on a carpet now («Ir» between floors and buildings). */
let flying = false;

const EYE_M = 1.45;
/** Swimming at the surface, her eyes this far over the water (m). */
const EYE_OVER_WATER_M = 0.3;
const WALK_MS = 1.6;
const SWIM_MS = 2.2;
let body: Body = placeAt(near(L.start.x, L.start.z), L.start.x, L.start.y + 0.01, L.start.z)!;
let yaw = L.start.yaw;
/**
 * Walking, sprinting (Correr: domain/effort.ts), swimming, jumping, climbing and falling off edges: the same moves as
 * sanctuary 3 (aerial-sanctuary/application/free-walk.ts). It also keeps where her body faces and her gait's phase.
 */
const walk = new FreeWalk(near, { walk: WALK_MS, swim: SWIM_MS, current: (a) => (treeWater(a) ? TREE_CURRENT : 1) }, yaw);
let pitch = 0;
let thirdPerson = false;
/** Third-person camera distance (the test hook sets it for overviews). */
let camDist = 3.6;

const ui = document.createElement("div");
ui.className = "cab-ui";
ui.innerHTML = `<div class="cab-where"></div><div class="cab-toast" role="status"></div>`;
root.appendChild(ui);
const whereEl = ui.querySelector<HTMLElement>(".cab-where")!;
const toast = ui.querySelector<HTMLElement>(".cab-toast")!;
let toastFor = 0;
function say(text: string, seconds = 4): void {
  toast.textContent = text;
  toast.classList.add("on");
  toastFor = seconds;
}

const walker = new Walker(root, { move: "s3-move room-move", look: "s3-look room-look", moveLabel: "Moverse" }, moveJoystick("santuario-terrestre"));
walker.camera = camera;
walker.enabled = true;
const menu = new RootMenu(ui, "cab-menu", "Menú");
const viewBtn = menu.add({ className: "s1-view", icon: ICON.eye, label: "Vista: 1ª persona", key: "V", order: 0, pad: true }, () => toggleView());
function toggleView(): void {
  thirdPerson = !thirdPerson;
  menu.relabel(viewBtn, `Vista: ${thirdPerson ? "3ª" : "1ª"} persona`, "V");
}

// --- Áreas: the map window with every place of the sanctuary and «Ir» (the real way, or teleport if she chose it) ---
offerVehicles(["auto"], "Santuario");
if (settings.value.taskVehicle !== "auto") settings.set("taskVehicle", "auto");
/** The box of an area on the map: a floor's slab, a ring's U, a cap's disc; the sea round the lagoon. */
function areaBox(a: (typeof L.areas)[number]): Pick<AreaNode, "centre" | "half"> {
  for (const t of L.towers) {
    const f = t.floors.find((q) => Math.abs(q.y - a.y) < 0.01 && a.x >= q.rect.x0 && a.x <= q.rect.x1 && a.z >= q.rect.z0 && a.z <= q.rect.z1);
    if (f) return { centre: { x: a.x, y: a.y, z: a.z }, half: { x: (f.rect.x1 - f.rect.x0) / 2, y: 2, z: (f.rect.z1 - f.rect.z0) / 2 } };
    const r = t.rings.find((q) => Math.abs(q.y - a.y) < 0.01);
    if (r && a.id.endsWith(":anillo")) {
      const x0 = Math.min(...r.rects.map((q) => q.x0)), x1 = Math.max(...r.rects.map((q) => q.x1)), z0 = Math.min(...r.rects.map((q) => q.z0)), z1 = Math.max(...r.rects.map((q) => q.z1));
      return { centre: { x: (x0 + x1) / 2, y: a.y, z: (z0 + z1) / 2 }, half: { x: (x1 - x0) / 2, y: 1, z: (z1 - z0) / 2 } };
    }
  }
  const cap = a.id.split(":")[1];
  const lobes = LOBES.filter((l) => l.r > 0 && capOf(l) === cap);
  if (lobes.length) {
    const x0 = Math.min(...lobes.map((l) => l.x - l.r)), x1 = Math.max(...lobes.map((l) => l.x + l.r)), z0 = Math.min(...lobes.map((l) => l.z - l.r)), z1 = Math.max(...lobes.map((l) => l.z + l.r));
    return { centre: { x: (x0 + x1) / 2, y: 0, z: (z0 + z1) / 2 }, half: { x: (x1 - x0) / 2, y: 0.5, z: (z1 - z0) / 2 } };
  }
  return { centre: { x: a.x, y: a.y, z: a.z }, half: { x: 20, y: 0.5, z: 20 } };
}
const goable = L.areas.filter((a) => !a.id.endsWith(":tronco") && !a.id.includes(":punta-") && a.id !== "paisaje");
const s1Map: AreaMap = {
  vehicle: "santuario-1",
  nodes: goable.map((a) => ({
    id: a.id,
    label: a.building && !a.label.includes(a.building) ? `${a.label} (${a.building})` : a.label,
    desc: a.desc,
    goal: a.id,
    fixture: a.id,
    ...areaBox(a),
    category: areaCategory(a),
    scope: { casquete: a.id.startsWith("hielo:") || a.id.startsWith("tierra:") ? a.id.split(":")[1]! : capAt(a.x, a.z), ...(a.link ? { edificio: a.link.tower } : {}) },
  })),
  links: [],
  // The buildings themselves (trunk, floor slabs, rings) and the caps, so a chosen building is seen as itself.
  structure: [
    ...L.towers.flatMap((t) => {
      const sc = { edificio: t.id, casquete: capAt(t.x, t.z) };
      const box = (r: { x0: number; x1: number; z0: number; z1: number }, y: number, hy: number) => ({ centre: { x: (r.x0 + r.x1) / 2, y, z: (r.z0 + r.z1) / 2 }, half: { x: (r.x1 - r.x0) / 2, y: hy, z: (r.z1 - r.z0) / 2 } });
      const TR = TRUNK_HALF + TREE.wall.value;
      return [
        { centre: { x: t.x, y: t.rootHeight / 2, z: t.z }, half: { x: TR, y: t.rootHeight / 2, z: TR }, scope: sc, kind: "tronco" as const },
        ...t.floors.map((f) => ({ ...box(f.rect, f.y, 0.25), scope: sc, kind: "piso" as const })),
        ...t.rings.flatMap((r) => r.rects.map((q) => ({ ...box(q, r.y, 0.15), scope: sc, kind: "anillo" as const }))),
      ];
    }),
    ...LOBES.filter((l) => l.r > 0).map((l) => ({ centre: { x: l.x, y: -0.2, z: l.z }, half: { x: l.r * 0.85, y: 0.2, z: l.r * 0.85 }, scope: { casquete: capOf(l) }, kind: isLand(l) ? ("tierra" as const) : ("hielo" as const) })),
  ],
};
/** Where «Ir» takes her in an area: past its door on a floor or ring, the middle of a cap, the lagoon's water. */
function arrival(a: (typeof L.areas)[number]): Place {
  if (a.entry) return { area: a.id, x: a.entry.x, y: a.y, z: a.entry.z, yaw: a.entry.yaw, pose: "stand" };
  return { area: a.id, x: a.x, y: a.y, z: a.z, yaw: 0, pose: "stand" };
}
/** The route she is being walked along («Ir» by the real way); any touch of the sticks hands her back. */
let auto: { way: Route; s: number; to: Place } | undefined;
/** The carpet's heading while flying (its own, not the camera's). */
let rideYaw = 0;
function goTo(id: string): void {
  const a = areaById.get(id);
  if (!a) return;
  const to = arrival(a);
  if (settings.value.taskTravel === "teletransporte") {
    body = placeAt(near(to.x, to.z), to.x, to.y + 0.01, to.z) ?? body;
    yaw = to.yaw;
    return;
  }
  auto = { way: route(wayBetween(L, { area: body.area, x: body.x, y: body.y, z: body.z, yaw, pose: "stand" }, to)), s: 0, to };
}
function frameAuto(dt: number): boolean {
  if (!auto) return false;
  const mv = walker.move();
  if (mv.forward || mv.right) {
    if (flying) return true;
    auto = undefined;
    missionGoing = undefined;
    body = placeAt(near(body.x, body.z), body.x, body.y + 0.3, body.z) ?? body;
    return false;
  }
  const here = along(auto.way, auto.s);
  auto.s += (here.fly ? flightSpeed(auto.way, auto.s) : here.swim ? SWIM_MS : WALK_MS) * dt;
  const q = along(auto.way, auto.s);
  if (q.done) {
    body = placeAt(near(auto.to.x, auto.to.z), auto.to.x, auto.to.y + 0.01, auto.to.z) ?? body;
    yaw = auto.to.yaw;
    auto = undefined;
    flying = false;
    arrived();
    return true;
  }
  if (!q.fly) walk.stride += Math.hypot(q.x - body.x, q.z - body.z) * 3;
  // On a carpet the flight keeps its own heading: the camera looks around freely and moves nothing (Berón 2026-11-20:
  // «el viaje en alfombra es automático y no debería verse afectado por los controles de movimiento ni cámara»).
  if (!Number.isNaN(q.yaw)) {
    if (q.fly) rideYaw = q.yaw + Math.PI;
    else yaw = q.yaw + Math.PI;
  }
  if (q.fly && !flying && Number.isNaN(q.yaw)) rideYaw = yaw;
  flying = q.fly;
  body = { x: q.x, y: q.y, z: q.z, motion: q.swim ? "agua" : "gravedad", area: "" };
  return true;
}
/** The gear's scope (Berón 2026-11-19): the whole sanctuary, a cap or a tree-building, like the carpets' choice. */
const s1Scopes = [
  { kind: "edificio", label: "Edificios", options: L.towers.map((t) => ({ id: t.id, label: t.building })) },
  { kind: "casquete", label: "Casquetes", options: CAPS.map((c) => ({ id: c, label: CAP_NAME[c] ?? c })) },
] as const;
/** «Automático»: the building she is in (its floors, rings or trunk), else the cap she stands on. */
function s1ScopeAt(): { kind: string; id: string } {
  const tower = areaById.get(body.area)?.link?.tower ?? L.towers.find((t) => body.area.startsWith(`${t.id}:`))?.id;
  return tower ? { kind: "edificio", id: tower } : { kind: "casquete", id: capAt(body.x, body.z) };
}
/** The map of Áreas with its hierarchy (buildings and caps), the shared scope of every level. */
const s1Scoped: AreaMap = { ...s1Map, scopes: s1Scopes };
/** Seen from the side: the tree-buildings stand, their floors one over the other (its «modo más visible»). */
const S1_MAP_VIEW = { yaw: 0.5, elevation: 0.18, zoom: 1 };
const areasWindow = new AreasWindow(root, {
  here: () => "santuario-1",
  map: () => s1Scoped,
  whole: "Todo el santuario",
  scopeAt: s1ScopeAt,
  view: S1_MAP_VIEW,
  at: () => (areaById.has(body.area) ? body.area : undefined),
  go: (n) => goTo(n.id),
});
RootMenu.global({ className: "areas-btn", icon: ICON.areas, label: "Áreas", window: "areas", order: 2, pad: true }, () => areasWindow.open()).show(true);

// --- Alfombras: a station on every floor and ring, each crown and each foot (data/alfombras.ts) -------------------
// The stations' view and window are shared with sanctuary 3's hollow mountain (adapters/three/carpet-stations.ts,
// ui/carpet-stations.ts).
const carpetsView = new CarpetStationsView(scene, L.carpets);
const CARPET_DESC: Record<CarpetStation["kind"], string> = { piso: "Su estación de alfombras", copa: "En la copa: alfombras del edificio y del santuario (a las otras copas y pies)", pie: "En el hielo, junto a la puerta del tronco" };
const carpets = new CarpetStations(root, {
  vehicle: "santuario-1",
  stations: L.carpets,
  // What a station's carpets reach: its building (from a crown, also the others' crowns and feet).
  node: (s, st) => ({ label: s.kind === "piso" ? s.label : `${s.label} (${s.building})`, desc: s.kind === "piso" ? (areaById.get(s.area)?.desc ?? CARPET_DESC.piso) : CARPET_DESC[s.kind], category: st.reach === "santuario" ? s.building : s.kind === "piso" ? "Pisos" : "Copa y pie" }),
  structure: (shown) => {
    const towers = new Set(shown.map((s) => s.tower));
    return (s1Map.structure ?? []).filter((b) => b.kind === "tronco" && towers.has(b.scope?.edificio ?? ""));
  },
  whole: "Todo el santuario",
  view: S1_MAP_VIEW,
  teleport: (to) => {
    body = placeAt(near(to.x, to.z), to.x, to.y + 0.01, to.z) ?? body;
    yaw = Math.atan2(to.out.x, to.out.z);
  },
  fly: (from, to) => {
    auto = { way: route(carpetRoute({ ...L.world, towers: L.towers }, from, to)), s: 0, to: { area: to.area, x: to.x, y: to.y, z: to.z, yaw: Math.atan2(to.out.x, to.out.z), pose: "stand" } };
  },
});
const carpetsWindow = carpets.window;
/** The station she stands on: the carpets' window is its own (where its carpets reach, its own travel setting). */
let station: CarpetStation | undefined;

// --- Misiones: the workday's missions on the same map window (docs/design/misiones-y-jornada.md §3) ---------------
/** The day of the sanctuary (the clock wraps at midnight) and the missions done today. */
let day = 0;
let doneToday = new Set<string>();
/** Each mission's machine: the first copy of its model on its floor. */
const missionAt = new Map<string, { it: (typeof L.instances)[number]; i: number; area: (typeof L.areas)[number] }>();
for (const ms of MISSIONS) {
  const i = L.instances.findIndex((q) => q.model === ms.model && (areaById.get(q.area)?.furnish === ms.floor || q.area === ms.floor));
  const it = L.instances[i];
  const area = it && areaById.get(it.area);
  if (it && area) missionAt.set(ms.id, { it, i, area });
}
const REWARD_OF = (ms: Mission) => retosFor(model(ms.model), missionAt.get(ms.id)!.i)[ms.reto ?? 0]!;
const missionsMap: AreaMap = {
  vehicle: "santuario-1",
  scopes: s1Scopes,
  nodes: MISSIONS.filter((ms) => missionAt.has(ms.id)).map((ms) => {
    const { it, area } = missionAt.get(ms.id)!;
    return {
      id: ms.id,
      label: `${ms.title} (${area.label})`,
      desc: "",
      goal: area.id,
      fixture: area.id,
      centre: { x: it.x, y: it.y, z: it.z },
      half: { x: 1, y: 1, z: 1 },
      category: ms.category,
      scope: { casquete: capAt(area.x, area.z), ...(area.link ? { edificio: area.link.tower } : {}) },
    };
  }),
  links: [],
};
const hourText = (h: number) => `${Math.floor(h)}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;
/** The mission she is walking to: its challenge opens when she arrives. */
let missionGoing: Mission | undefined;
function doMission(ms: Mission): void {
  const at = missionAt.get(ms.id)!;
  const r = REWARD_OF(ms);
  if (body.area === at.area.id) {
    missionGoing = undefined;
    return openReto(r, (ok) => ok && doneToday.add(ms.id));
  }
  missionGoing = ms;
  goTo(at.area.id);
  if (settings.value.taskTravel === "teletransporte") arrived();
  else say(`De camino a «${ms.title}»: su reto se abre al llegar`, 5);
}
/** At the end of «Ir»: the mission she was going to opens. */
function arrived(): void {
  const ms = missionGoing;
  missionGoing = undefined;
  if (!ms) return;
  const it = missionAt.get(ms.id)!.it;
  openReto(REWARD_OF(ms), (ok) => ok && doneToday.add(ms.id), { x: it.x, y: it.y, z: it.z, sy: model(it.model).size.y, modelId: it.model, rot: it.rot, plan: it.plan });
}
const REWARD_TEXT = { comida: "no pasar hambre", compania: "compañía", fuerza: "fuerza", salud: "salud" } as const;
const missionsWindow = new AreasWindow(root, {
  kind: { title: "Misiones", window: "misiones", bodyClass: "in-missions", className: "missions-window" },
  here: () => "santuario-1",
  map: () => missionsMap,
  whole: "Todo el santuario",
  scopeAt: s1ScopeAt,
  view: S1_MAP_VIEW,
  empty: "Ninguna misión aquí",
  at: () => MISSIONS.find((ms) => missionState(ms.id, day, hour, MISSIONS, doneToday).open && (missionState(ms.id, day, hour, MISSIONS, doneToday) as { now: boolean }).now)?.id,
  row: (n) => {
    const ms = MISSIONS.find((q) => q.id === n.id)!;
    const st = missionState(ms.id, day, hour, MISSIONS, doneToday);
    const r = REWARD_OF(ms);
    const here = body.area === missionAt.get(ms.id)!.area.id;
    return {
      tag: st.open && st.now ? `Ahora (${hourText(hour)})` : doneToday.has(ms.id) ? "Hecha" : undefined,
      desc: `${r.chore.title} · ${r.chore.exercises.length} pasos · da ${REWARD_TEXT[r.reward]}`,
      locked: st.open ? undefined : st.why,
      action: here ? "Hacer" : "Ir",
      actionLabel: `${here ? "Hacer" : "Ir a hacer"} ${ms.title}`,
    };
  },
  go: (n) => doMission(MISSIONS.find((q) => q.id === n.id)!),
});
RootMenu.global({ className: "s1-missions-btn", icon: ICON.missions, label: "Misiones", window: "misiones", order: 1, pad: true }, () => missionsWindow.open()).show(true);

// --- What she can do here: the orange button under the menu (reglas.md §5.8) and the challenges -------------------
/** Doménica's needs: the challenges' rewards (Berón: no pasar hambre, compañía, fuerza, salud). */
const domenica = new CrewMember("Doménica", "domenica");
interface Thing extends Reachable {
  readonly i: number;
  readonly label: string;
  readonly modelId: string;
  readonly plan?: number;
  readonly mover?: (typeof world.movers)[number];
}
/** Does a model offer anything? (cached by model) */
const offers = new Map<string, boolean>();
const offersAny = (id: string) => offers.get(id) ?? (offers.set(id, retosFor(model(id)).length > 0), offers.get(id)!);
const CELL = 16;
const cellKey = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
const thingCells = new Map<string, Thing[]>();
const moversByIt = new Map(world.movers.map((m) => [m.it, m]));
const movingThings: Thing[] = [];
L.instances.forEach((it, i) => {
  if (it.model === "persona" || !offersAny(it.model)) return;
  const d = model(it.model);
  const sc = it.scale ?? 1;
  const t: Thing = { i, label: it.name ?? d.label, modelId: d.id, x: it.x, y: it.y, z: it.z, rot: it.rot, plan: it.plan, sx: d.size.x * sc * (it.plan ?? 1), sz: d.size.z * sc * (it.plan ?? 1), sy: d.size.y * sc, mover: moversByIt.get(it) };
  if (t.mover) return void movingThings.push(t);
  // A thing lies in every cell its footprint touches (floors span several).
  const r = Math.hypot(t.sx, t.sz) / 2;
  for (let cx = Math.floor((t.x - r) / CELL); cx <= Math.floor((t.x + r) / CELL); cx++)
    for (let cz = Math.floor((t.z - r) / CELL); cz <= Math.floor((t.z + r) / CELL); cz++) {
      const k = `${cx},${cz}`;
      const list = thingCells.get(k) ?? [];
      list.push(t);
      thingCells.set(k, list);
    }
});
/** How far her hand reaches to use a thing, m (a step and an arm). */
const REACH_M = 1.4;
let atHand: Thing | undefined;
let reachT = 0;
function findAtHand(): Thing | undefined {
  const here = thingCells.get(cellKey(body.x, body.z)) ?? [];
  // The animals wander: where each is now.
  const moving = movingThings.flatMap((t) => {
    const a = wild.get(t.mover!.it);
    if (a) return a.scale > 0 ? [{ ...t, x: a.x, y: a.y, z: a.z, rot: a.yaw, label: a.label }] : [];
    const w = t.mover!.it.wander!;
    const p = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, wildT + w.seed, w.speed);
    return [{ ...t, x: p.x, z: p.z, rot: p.yaw }];
  });
  return nearest(body.x, body.y, body.z, [...here, ...moving], REACH_M + (moving.length ? 0 : 0));
}
let warLabel: string | undefined;
function updateAtHand(dt: number): void {
  reachT -= dt;
  if (reachT > 0) return;
  reachT = 0.2;
  const t = challenge || picker.isOpen ? undefined : findAtHand();
  // On a carpet station with nothing else at hand: «Volar» opens its carpets (Berón 2026-11-20).
  const st = t || challenge || picker.isOpen || auto || flying ? undefined : carpets.at(body.x, body.y, body.z);
  // On the Residencia's crown: the pillow war's treasures (s1-castillos.ts).
  const war = t || st || challenge || picker.isOpen ? undefined : crownPlay.offer(body);
  if (t?.i === atHand?.i && (t === undefined) === (atHand === undefined) && st === station && war?.label === warLabel) return;
  atHand = t;
  warLabel = war?.label;
  station = st ?? (carpetsWindow.visible ? station : undefined);
  carpets.station = station;
  if (st) RootMenu.interact(carpets.button(st, () => stationChoices(st)));
  else if (war) RootMenu.interact({ icon: ICON.chest, label: war.label, onClick: () => ((reachT = 0), war.run()) });
  // Its button says in one word what its challenges are about (chores/domain/palabra.ts).
  else offerReto(t?.label, () => t && offerRetos(t), t && retosWord(retosFor(model(t.modelId), t.i).map(retoTag)));
}

const duel = new DuelView(root);
const SHEET: SessionText = { title: "", progress: "Pasos", lives: "Intentos", order: "Ordena los pasos", submit: "Hacerlo", ok: "Paso hecho", bad: "Así no: inténtalo otra vez", sheet: true };
const picker = new RetoPicker(root);
let challenge: Reto | undefined;
/** The open challenge's run (the debug hook answers it in the live checks). */
let retoRun: ChoreRun | undefined;
const REWARD_LABEL = { comida: "no pasar hambre", compania: "compañía", fuerza: "fuerza", salud: "salud" } as const;

/** The thing's challenges: straight to the sheet if it offers one, else the choice. */
function offerRetos(t: Thing): void {
  const rs = retosFor(model(t.modelId), t.i);
  const own = rs.map((r) => ({ title: r.chore.title, detail: `${r.chore.exercises.length} pasos · da ${REWARD_LABEL[r.reward]}${r.reality === "ficción" ? " · magia del santuario" : ""}`, run: () => openReto(r, undefined, t) }));
  // The simulation machine: the microcosms it takes her into (modules/microcosmos).
  const micros = (t.modelId === "simulador" ? MICROCOSMOS : []).map((mc) => ({ title: mc.title, detail: mc.detail, run: () => enterMicro(t, mc) }));
  chooseReto(picker, t.label, [...micros, ...own]);
}

/**
 * A carpet station: its flights, and the floor's team challenges (Berón 2026-11-24: «al quitar las máquinas de
 * simulación por piso podemos mover las tareas grupales a la estación de alfombras»).
 */
function stationChoices(st: CarpetStation): void {
  const area = areaById.get(st.area);
  const team = area?.furnish ? SIM_RETOS[area.furnish] ?? [] : [];
  if (!team.length) {
    carpetsWindow.open();
    return;
  }
  chooseReto(picker, `Estación de alfombras · ${area!.label}`, [
    { title: "Volar", detail: "Las alfombras de esta estación", run: () => carpetsWindow.open() },
    ...team.map((sr) => ({
      title: `En equipo: ${sr.procedure.title}`,
      detail: `${sr.procedure.steps.length} pasos · tú: ${sr.playerRole}; ${sr.roles.length} más en sus papeles · todos ganan ${REWARD_LABEL[sr.procedure.reward]}`,
      run: () => openTeamReto(st.area, sr),
    })),
  ]);
}

// --- The simulation machine (data/simulacion.ts; Berón 2026-11-23) ---------------------------------------------------
const simTanks = new SimTanks(scene, L.instances.filter((i) => i.model === "simulador"), root);
/** Everyone's needs after a team challenge: hers is Doménica's; the others' kept here by name. */
const teamCrew = new Map<string, CrewMember>();

// --- The microcosms (Berón 2026-11-23: «¿Podrías crear el de Platón?»): a chunk of its own, loaded on the way in and
// disposed of on the way out, so sanctuary 1 runs as before while she is not inside one. Only one is ever loaded.
let micro: AcademiaMicro | undefined;
let microTank: number | undefined;
/** Who went into the tank with her (they float in it while she is in the microcosm). */
let microCrew: Person[] = [];
function enterMicro(t: Thing, mc: SimMicrocosmos): void {
  const i = simTanks.nearest(t.x, t.z, 9, t.y);
  if (i === undefined || mc.id !== "academia-platon") return;
  RootMenu.interact(undefined);
  // The great tank holds many (Berón 2026-11-24): those on the plaza go in with her and float round her.
  const tank = simTanks.floatAt(i);
  microCrew = tank ? people.filter((p) => !p.role && Math.abs(p.g.position.y - tank.y) < 6 && Math.hypot(p.g.position.x - tank.x, p.g.position.z - tank.z) < 30).slice(0, SIM_SPOTS.length) : [];
  microCrew.forEach((p, k) => {
    const at = simTanks.floatAt(i, SIM_SPOTS[k])!;
    p.role = { ...at, yaw: at.yaw + Math.PI, motion: "estrella" };
  });
  // The chunk loads while she goes in (the entry takes ~9 s).
  const loading = import("./microcosmos-academia");
  simTanks.enter(i, body, () => {
    say("Entrando en el microcosmos…", 2);
    void loading.then(({ AcademiaMicro }) => {
      microTank = i;
      ui.style.display = "none";
      micro = new AcademiaMicro({ root, renderer, camera, walker, duel, sheet: SHEET, reward: (r) => applyReward(domenica, r), exit: leaveMicro, openSettings: () => (settingsPanel.visible ? settingsPanel.close() : settingsPanel.open("Microcosmos, botón de inicio del mando")) });
    });
  });
}
function leaveMicro(): void {
  if (!micro) return;
  micro.dispose();
  micro = undefined;
  ui.style.display = "";
  GamePad.use(root, "santuario-1", padSetup);
  const out = microTank !== undefined ? simTanks.frontOf(microTank) : undefined;
  if (out) body = { ...body, x: out.x, y: out.y, z: out.z, motion: "gravedad" };
  for (const p of microCrew) p.role = undefined;
  microCrew = [];
  say("De vuelta en el santuario, delante de la máquina", 3);
}

/** Where someone stands to work at a placed thing (its station, or in front of it facing it). */
function standAt(it: (typeof L.instances)[number]): { x: number; y: number; z: number; yaw: number } {
  const st = STATIONS[it.model];
  if (st) {
    const w = stationWorld(st, it);
    return { x: w.x, y: it.y + (st.y ?? 0), z: w.z, yaw: w.yaw };
  }
  const r = it.rot ?? 0;
  const d = Math.max(model(it.model).size.z * (it.plan ?? 1) * 0.5 + 0.5, 0.9);
  const x = it.x - Math.sin(r) * d;
  const z = it.z - Math.cos(r) * d;
  return { x, y: it.y, z, yaw: Math.atan2(it.x - x, it.z - z) };
}

function openTeamReto(areaId: string, sr: SimReto): void {
  const here = L.instances.map((it, j) => [it, j] as const).filter(([it]) => it.area === areaId);
  const mine = here.find(([it]) => it.model === sr.player);
  if (!mine) return;
  const [me] = mine;
  const meAt = standAt(me);
  // She goes to her place.
  body = { ...body, x: meAt.x, y: meAt.y, z: meAt.z, area: areaId, motion: "gravedad" };
  // The others: first those who work or train on this floor, then whoever is nearest (as many as the parts).
  const area = areaById.get(areaId);
  const ranked = [...people].sort((a, b) => Number(b.plan.tareas.area === areaId || b.plan.entrenamiento.area === areaId) - Number(a.plan.tareas.area === areaId || a.plan.entrenamiento.area === areaId) || Math.hypot(a.g.position.x - me.x, a.g.position.z - me.z) - Math.hypot(b.g.position.x - me.x, b.g.position.z - me.z));
  const taken = new Set<number>();
  const cast: Person[] = [];
  sr.roles.forEach((role, k) => {
    const p = ranked[k];
    if (!p) return;
    let at: { x: number; y: number; z: number; yaw: number };
    if (role.model) {
      const it = here.find(([q, j]) => q.model === role.model && !taken.has(j));
      if (!it) return;
      taken.add(it[1]);
      at = standAt(it[0]);
    } else {
      // In front of her, facing her (her frame: x to her right, z ahead).
      const f = role.front!;
      const fx = Math.sin(meAt.yaw), fz = Math.cos(meAt.yaw);
      const x = meAt.x + fz * f.x + fx * f.z;
      const z = meAt.z - fx * f.x + fz * f.z;
      at = { x, y: meAt.y, z, yaw: Math.atan2(meAt.x - x, meAt.z - z) };
    }
    p.role = { ...at, motion: role.motion };
    cast.push(p);
  });
  const r = procedureReto(sr.procedure);
  const at: RetoAt = { x: me.x, y: me.y, z: me.z, sy: model(me.model).size.y * (me.scale ?? 1), modelId: me.model, rot: me.rot, plan: me.plan };
  openReto(r, (ok) => {
    for (const p of cast) p.role = undefined;
    if (!ok) return;
    const names = cast.map((p) => p.name);
    for (const n of names) {
      let c = teamCrew.get(n);
      if (!c) teamCrew.set(n, (c = new CrewMember(n, n.toLowerCase())));
      applyReward(c, r.reward);
    }
    say(`${r.chore.title}: hecho en equipo. Ganan ${REWARD_LABEL[r.reward]}: Doménica, ${names.join(", ")}${area ? ` (${area.label})` : ""}.`, 7);
  }, at);
}

/**
 * The challenge's stage (Berón 2026-11-19: «los retos deberían enfocar para ver la animación»): she stands at the
 * thing facing it, the camera comes in past her right shoulder so she and the thing are in the strip above the
 * sheet, and each solved step is acted out (StepShow, the same as in the ships).
 */
const steps = new StepShow();
/** Where she stands for the open challenge: whoever works on that very spot steps out of the shot. */
let stageStand: THREE.Vector3 | undefined;
scene.add(steps.root);
/** The lens over the free strip (adapters/three/interior/reto-focus.ts, shared). */
let lensBand = "";
const sheetLens = (on: boolean) => {
  const band = on ? sheetBand() : undefined;
  lensBand = band ? `${Math.round(band.top)}-${Math.round(band.bottom)}` : "";
  lens(camera, on, band ? { band } : {});
};
// The player's look at a challenge's stage: a finger turns it, a pinch or the wheel zooms (as in the Áreas map).
{
  const el = renderer.domElement;
  mapGestures(el, {
    rotate: (dx, dy) => {
      if (micro) micro.gesture(dx, dy);
      else if (steps.framing) steps.orbit(-dx * 0.008, dy * 0.006);
    },
    zoom: (f) => {
      if (micro) micro.zoomBy(f);
      else if (steps.framing) steps.zoomBy(f);
    },
    tap: () => {},
  });
  el.addEventListener("wheel", (e) => {
    if (micro) micro.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
    else if (steps.framing) steps.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
  }, { passive: true });
}
/** The model of the open challenge (its machine's own motions and its station). */
let stagedModel: string | undefined;
function stageAt(at: RetoAt): void {
  stagedModel = at.modelId;
  const st = at.modelId ? STATIONS[at.modelId] : undefined;
  // At a machine she first stands where she gets on it (its station's side), not wherever she came from.
  const mount = st && at.rot !== undefined ? stationWorld(st, at) : undefined;
  const from = mount ? { ...body, x: mount.getOn.x, z: mount.getOn.z } : body;
  // …and the shot is on her station (a long barre's middle is metres away from where she works at it).
  const stand = focusReto(steps, camera, from, yaw, mount ? { ...at, x: mount.x, z: mount.z } : at, undefined, mount ? { feet: new THREE.Vector3(mount.x, at.y + (st!.y ?? 0), mount.z), yaw: mount.yaw, shot: st!.shot } : undefined);
  stageStand = stand;
  // On the machine's own floor (Berón 2026-11-20: «al terminar parece que ha atravesado el suelo y caído»): she came
  // from wherever the route or the teleport left her, so her height and area are the floor's at the stand, not hers.
  const w = near(stand.x, stand.z);
  const on = placeAt(w, stand.x, at.y + 0.01, stand.z);
  body = on && !blocked(w, on.x, on.y, on.z) ? on : { ...body, x: stand.x, y: at.y, z: stand.z, motion: "gravedad" };
}
/** Where she was before the challenge: if the stage left her nowhere to stand, she is put back there. */
let beforeReto: Body | undefined;
/** After the challenge: on a floor and clear of the machine, or back where she was. */
function offStage(): void {
  const w = near(body.x, body.z);
  const on = placeAt(w, body.x, body.y + 0.01, body.z);
  body = on && !blocked(w, on.x, on.y, on.z) ? on : (beforeReto ?? body);
  beforeReto = undefined;
}

/** A challenge on the sheet (the same sheet as sanctuary 3 and the ships); her reward when it is done. */
function openReto(r: Reto, done?: (ok: boolean) => void, at?: RetoAt): void {
  const run = new ChoreRun(r.chore);
  retoRun = run;
  challenge = r;
  RootMenu.interact(undefined);
  atHand = undefined;
  beforeReto = { ...body };
  if (at) stageAt(at);
  // Each step its own animation (data/animaciones.ts): the jalón machine pulls, the treadmill runs.
  const visual = retoVisual(steps, (i: number) => stepAnimation(r, at?.modelId, i).acts, () => {
    if (steps.framing) sheetLens(false);
    steps.clear();
  });
  duel.onRightPick = (id, slot) => {
    if (run.current?.id === id) visual.partDone?.(run.step, slot);
  };
  duel.onClose = () => {
    duel.onClose = undefined;
    duel.onRightPick = undefined;
    visual.clear();
    challenge = undefined;
    offStage();
    const ok = run.status === "done";
    if (ok) say(`${r.chore.title}: hecho. ${applyReward(domenica, r.reward)}`, 5);
    done?.(ok);
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
    { ...SHEET, title: r.chore.title },
    (ans: Answer) => {
      const index = run.step;
      const ok = run.submit(ans);
      // A right answer acts the step out (the blocks already acted out pick by pick are not played again).
      if (ok) visual.stepDone(index);
      else steps.rest();
      return { ok };
    },
  );
}

// --- The Switch controls (ui/game-pad.ts, the same in every level): Correr (B), Saltar (A), Trepar (X), zoom on the D-pad,
// + Misiones, − Áreas, capture Vista, home the general settings; the rest wait for a job ------------------------------
/** The general settings (ui/settings-panel.ts), with a way back to the start screen. */
const settingsPanel = new SettingsPanel(root);
settingsPanel.addRow({ id: "s1-inicio", label: "Pantalla de inicio", help: "Vuelve a la pantalla de inicio para elegir otro santuario o partida (el santuario 1 empieza de nuevo al volver)", value: () => "Ir", next: () => location.reload() });
settingsPanel.onClose = () => avatar.pose("stand");
const padSetup: Parameters<typeof GamePad.use>[2] = {
  // The left Joy-Con's D-pad: ↑ / ↓ zoom (Berón: «los de zoom podrían ser los de la izquierda»).
  zoom: (dir) => walker.holdZoom(dir),
  // The general buttons move onto the pad (Berón 2026-11-19: «los botones de config general pueden pasar a los nuevos
  // mandos»): + the day's missions, − the map of Áreas, capture the view (1.ª/3.ª persona), home the general settings
  // (Berón: «no debe abrir el menú árbol antiguo… enviar a la pantalla de inicio o abrir la modal de ajustes generales»).
  plus: { label: "Misiones", open: () => missionsWindow.open() },
  areas: () => areasWindow.open(),
  view: () => toggleView(),
  home: () => {
    // She sits in lotus while the settings are open (habitaculo.md §Ajustes), as on the ships' mats.
    if (settingsPanel.visible) return settingsPanel.close();
    settingsPanel.open("Santuario 1, botón de inicio del mando");
  },
  paused: () => !!challenge,
  moves: [
    { letter: "X", label: "Trepar", key: "KeyC", run: () => walk.startClimb(body, yaw) || say("Nada que trepar delante (hasta 2,6 m)", 2) },
    {
      letter: "A",
      label: "Saltar",
      key: "Space",
      run: () => {
        const mv = walker.move();
        walk.startJump(body, mv.forward !== 0 || mv.right !== 0, pad.isOn("B"));
      },
    },
    { letter: "B", label: "Correr", toggle: true, key: "ShiftLeft", run: () => undefined },
  ],
};
const pad = GamePad.use(root, "santuario-1", padSetup);
let climbCheck = 0;

function frameFree(dt: number): void {
  if (challenge || settingsPanel.visible) return;
  // Down a slide: gravity along its tube, nothing else moves her (s1-castillos.ts).
  const rode = crownPlay.rideFrame(dt, body);
  if (rode) {
    body = rode.body;
    walk.facing = rode.yaw;
    return;
  }
  const c = walk.carry(dt, body);
  body = c.body;
  if (c.busy) return;
  if ((climbCheck -= dt) <= 0) {
    climbCheck = 0.3;
    pad.enable("X", !!walk.climbAhead(body, yaw));
  }
  if (frameAuto(dt)) return;
  const mv = walker.move();
  body = walk.move(dt, body, { ...mv, yaw, pitch, run: pad.isOn("B") });
  if (crownPlay.tryEnter(body, mv.forward !== 0 || mv.right !== 0)) say("¡Al tobogán!", 1.5);
}

function updateCamera(dt: number): void {
  const look = walker.look(dt);
  yaw += look.yaw;
  pitch = Math.max(-1.3, Math.min(1.3, pitch + look.pitch));
  const jump = walk.jump;
  const moving = !!auto || walker.move().forward !== 0 || walker.move().right !== 0;
  const sprinting = !jump && moving && !auto && pad.isOn("B") && body.motion === "gravedad" && !flying;
  // Felt in first person too: the head drops in the crouch and the landing, bobs with each sprint stride, and the view widens at speed.
  const { hop, dip, fov: wide } = walk.feel(sprinting);
  const fov = BASE_FOV + wide;
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov += (fov - camera.fov) * Math.min(1, 6 * dt);
    camera.updateProjectionMatrix();
  }
  rig.position.set(body.x, body.y + hop, body.z);
  if (flying) walk.facing = rideYaw;
  else if ((auto || !thirdPerson) && !crownPlay.riding) walk.facing = yaw;
  rig.rotation.y = (thirdPerson || flying ? walk.facing : yaw) + Math.PI;
  let eye = body.y + hop + EYE_M + dip;
  // Swimming at the surface her eyes are just out of the water (Berón 2026-11-20: «en primera persona la cámara
  // muestra todo blanco… y oculta el agua»): at the surface's own height the water is seen edge on, so not at all.
  const sw = body.motion === "agua" ? waterAt(near(body.x, body.z), body.x, body.y, body.z) : undefined;
  if (sw && Math.abs(eye - sw.yTop) < EYE_OVER_WATER_M) eye = sw.yTop + EYE_OVER_WATER_M;
  if (thirdPerson) {
    const d = camDist;
    camera.position.set(body.x + Math.sin(yaw) * d * Math.cos(pitch), eye + 0.4 - Math.sin(pitch) * d, body.z + Math.cos(yaw) * d * Math.cos(pitch));
    camera.lookAt(body.x, eye - 0.2, body.z);
    rig.visible = true;
  } else {
    camera.position.set(body.x, eye, body.z);
    camera.rotation.set(pitch, yaw, 0);
    rig.visible = false;
  }
  myCarpet.visible = flying;
  const cw = waterAt(near(camera.position.x, camera.position.z), camera.position.x, camera.position.y, camera.position.z);
  // Under water: the trees' clear water; the globe's and the sea's darker with depth (walk-look.ts UnderwaterView).
  const under = !!cw && camera.position.y < cw.yTop && camera.position.y > cw.yBottom;
  const globe = under && cw!.area === AQUARIUM_AREA;
  const depth = globe ? globeDepth(camera.position.x, camera.position.y, camera.position.z) : WATER_Y - camera.position.y;
  underwater.set(under && (globe ? "globo" : treeWater(cw!.area) ? "claro" : "oceano"), depth);
  avatar.wearMask(body.motion === "agua");
  poseOnFoot(avatar, walk, { body, moving, sprinting, lotus: flying || settingsPanel.visible || crownPlay.riding, clock: wildT }, dt);
  // Her clothes: at work or training time, those of the floor she is on (Berón 2026-11-24: «la ropa específica para la
  // tarea laboral que indique su horario»); her own otherwise.
  const block = activityAt(hour);
  avatar.wear(block === "tareas" || block === "entrenamiento" ? workOutfit(areaById.get(body.area.split(":").slice(0, 2).join(":"))?.furnish ?? areaById.get(body.area)?.furnish) : undefined);
}

let last = performance.now();
let loaded = false;
function frame(now: number): void {
  const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
  last = now;
  // Inside a microcosm: only it moves and is drawn (sanctuary 1 waits as it was).
  if (micro) {
    micro.frame(dt);
    renderer.render(micro.scene, camera);
    requestAnimationFrame(frame);
    return;
  }
  nearY = body.y;
  if (!loaded) {
    loaded = true;
    // The first frame is about to be drawn: the loading screen goes (ui/loading-screen.ts).
    requestAnimationFrame(() => doneLoading());
  }
  // Going into the simulation machine: her way in and the orbiting camera, nothing else moves her.
  if (!simTanks.frame(dt, camera, rig, avatar)) {
    frameFree(dt);
    if (!steps.frame(dt, camera, rig, avatar)) updateCamera(dt);
  }
  const next = hour + (24 * dt) / S1_DAY_REAL_S;
  if (next >= 24) {
    day++;
    doneToday = new Set();
  }
  hour = next % 24;
  dayNight.update(hour, camera);
  underwater.setSky(dayNight.sky);
  movePeople(dt);
  moveAnimals(dt);
  updateAtHand(dt);
  carpetsView.update(dt, wildT, body.x, body.y, body.z);
  domenica.tick((24 * dt) / S1_DAY_REAL_S / 24, 0.5, 1);
  if (toastFor > 0 && (toastFor -= dt) <= 0) toast.classList.remove("on");
  const a = areaById.get(body.area);
  const hh = Math.floor(hour);
  const clock = `${hh}:${String(Math.floor((hour - hh) * 60)).padStart(2, "0")}`;
  PULPO.k = advanceEgg(PULPO.k, dt, Number(settings.value.pulpoMinutes));
  // In the globe, the octopus egg's stage (domain/pulpo.ts).
  const egg = (body.area === AQUARIUM_AREA ? ` · ${PULPO.k < 1 ? "Huevo de pulpo" : "Pulpo"}: ${eggStage(PULPO.k).label}` : "") + crownPlay.frame(dt, body);
  const where = `Santuario 1 · ${clock} · ${a ? (a.building && !a.label.includes(a.building) ? `${a.building} · ${a.label}` : a.label) : flying ? "Volando en alfombra" : body.motion === "agua" ? "En el agua" : "Hielo"}${egg}`;
  if (whereEl.textContent !== where) whereEl.textContent = where;
  // The sheet changes (HUD or panel view, a longer question): the stage follows the room it leaves.
  if (steps.framing && (frameNo++ & 15) === 0) {
    const b = sheetBand();
    const key = b ? `${Math.round(b.top)}-${Math.round(b.bottom)}` : "";
    if (key !== lensBand) sheetLens(true);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
let frameNo = 0;
window.addEventListener("resize", () => {
  sheetLens(steps.framing);
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyV" && !e.repeat && !(e.target as HTMLElement).closest("input, textarea")) toggleView();
});
// Test hook (tools/experiencia and live checks): the layout, the body and the bulk style switch.
if (import.meta.env.DEV || new URLSearchParams(location.search).has("prueba"))
  (window as unknown as { codeshipS1: unknown }).codeshipS1 = { crownPlay, pulpo: PULPO, get micro() { return micro; }, leaveMicro, microAt: () => { const j = L.instances.findIndex((q) => q.model === "simulador"); if (j < 0) return false; const it = L.instances[j]!; body = { ...body, x: it.x, y: it.y, z: it.z - 7, area: it.area, motion: "gravedad" }; enterMicro({ i: j, label: "Máquina de simulación", modelId: "simulador", x: it.x, y: it.y, z: it.z } as unknown as Thing, MICROCOSMOS[0]!); return true; }, L, world, steps, camera, renderer, wild, get wildT() { return wildT; }, set wildT(v: number) { wildT = v; }, get jumpT() { return walk.jumpClock; }, set jumpT(t: number) { walk.setJump(t); }, get body() { return body; }, set body(b: Body) { body = b; }, setHour: (h: number) => { hour = h; }, goTo, get auto() { return auto; }, areasWindow, carpetsWindow, get station() { return station; }, get hour() { return hour; }, people, get atHand() { return atHand; }, openReto, domenica, missionsWindow, get day() { return day; }, doMission: (id: string) => doMission(MISSIONS.find((q) => q.id === id)!), retoAt: (id: string, k = 0, n = 0, keep = false) => { const i = L.instances.map((it, j) => [it, j] as const).filter(([it]) => it.model === id)[n]?.[1]; if (i === undefined) return undefined; const it = L.instances[i]!; const r = retosFor(model(id), i)[k]; if (!r) return undefined; if (!keep) body = { ...body, x: it.x, y: it.y, z: it.z + 1.2 }; openReto(r, undefined, { x: it.x, y: it.y, z: it.z, sy: model(id).size.y * (it.scale ?? 1), modelId: id, rot: it.rot, plan: it.plan }); return { title: r.chore.title, steps: r.chore.exercises.length }; }, playStep: (i: number, dry = false) => { if (!challenge) return undefined; const a = stepAnimation(challenge, stagedModel, i); if (!dry) steps.play(a.acts); return a.id; }, get exercise() { return challenge ? retoRun?.current : undefined; }, closeReto: () => (document.querySelector('.duel [data-act="close"]') as HTMLElement | null)?.click(), teamAt: (furnish: string, k = 0) => { const a = L.areas.find((q) => q.furnish === furnish); const sr = SIM_RETOS[furnish]?.[k]; if (!a || !sr) return false; openTeamReto(a.id, sr); return true; }, get simActive() { return simTanks.active; }, setView: (y: number, p: number, third: boolean, dist = 3.6) => { yaw = y; pitch = p; camDist = dist; if (third !== thirdPerson) toggleView(); } };
requestAnimationFrame(frame);
