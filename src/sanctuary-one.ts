import * as THREE from "three";
import { WORLD_SCALE } from "@core/scale";
import { moveJoystick } from "@core/realism";
import { buildS1Layout } from "@modules/sanctuary-one/data/layout";
import { personRule } from "@modules/sanctuary-one/data/overrides";
import { placeAt, step, type Body } from "@modules/aerial-sanctuary/domain/walk";
import { S1_DAY_REAL_S, S1_START_HOUR, activityAt, along, route, wanderAt, type Activity, type Route } from "@modules/sanctuary-one/domain/motion";
import { staffPlaces, wayBetween, type Place } from "@modules/sanctuary-one/data/jornada";
import { WalkIndex } from "@modules/sanctuary-one/data/walk-index";
import { buildS1Scene } from "./adapters/three/s1-models";
import { CubeFigure } from "./adapters/three/interior/figure";
import { textSign } from "./adapters/three/interior/sign";
import { Walker } from "./adapters/input/walker";
import { DOMENICA_HAIR } from "./ui/portraits";
import { RootMenu } from "./ui/root-menu";
import { ICON } from "./ui/icons";
import { AreasWindow } from "./ui/areas-window";
import { settings } from "./ui/settings-store";
import { offerVehicles } from "./ui/task-settings";
import type { AreaMap, AreaNode } from "@modules/tasks/application/areas";
import { LOBES, capOf } from "@modules/sanctuary-one/data/site";
import { model } from "@modules/sanctuary-one/data/catalog";
import { applyReward, retosFor, type Reto } from "@modules/sanctuary-one/application/challenges";
import { nearest, type Reachable } from "@modules/sanctuary-one/domain/reach";
import { CrewMember } from "@modules/crew/domain/crew-member";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { DuelView, type SessionText } from "./ui/duel-view";
import { RetoPicker } from "./ui/reto-picker";
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
const L = buildS1Layout(WORLD_SCALE);
// The walk world by cells (thousands of solids): each step looks only round her.
const walkIndex = new WalkIndex(L.world);
const near = (x: number, z: number) => walkIndex.near(x, z);

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
root.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const SKY = 0xbfd9ea;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 250, 1400);
scene.add(new THREE.HemisphereLight(0xeef6ff, 0x7c8a96, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(-200, 300, 120);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 5000);
camera.rotation.order = "YXZ";

const world = buildS1Scene(L);
scene.add(world.root);

// The clock of sanctuary 1 (Cold Sanctuary's day: domain/motion.ts) and the workday it drives.
let hour = S1_START_HOUR;
const places = staffPlaces(L);

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
}
const people: Person[] = [];
for (const i of L.instances) {
  if (i.model !== "persona" || !i.name) continue;
  // Bulk rules for the people (overrides.ts «personas»): hidden, height, skin and clothes, for all or by name.
  const r = personRule(i.name);
  if (r.oculto) continue;
  const plan = places.get(i.name);
  if (!plan) continue;
  const f = new CubeFigure(r.piel ?? i.tint ?? 0xe0b48c, r.ropa ?? 0x3d6fa8);
  const g = new THREE.Group();
  g.scale.setScalar((r.altura ?? 1) * (i.scale ?? 1));
  g.add(f.root);
  scene.add(g);
  const s = textSign(i.name);
  s.scale.multiplyScalar(0.5);
  scene.add(s);
  const act = activityAt(hour);
  const p: Person = { f, g, sign: s, plan, act, at: plan[act], s: 0, stride: 0 };
  settle(p);
  people.push(p);
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
function movePeople(dt: number): void {
  const act = activityAt(hour);
  for (const p of people) {
    if (act !== p.act) {
      p.act = act;
      const to = p.plan[act];
      const pos = p.g.position;
      p.way = route(wayBetween(L, { ...p.at, x: pos.x, y: pos.y, z: pos.z }, to));
      p.at = to;
      p.s = 0;
    }
    if (!p.way) {
      p.f.update(dt);
      continue;
    }
    const here = along(p.way, p.s);
    p.s += (here.swim ? PEOPLE_SWIM_MS : PEOPLE_WALK_MS) * dt;
    const q = along(p.way, p.s);
    if (q.done) {
      p.way = undefined;
      settle(p);
    } else {
      p.g.position.set(q.x, q.y, q.z);
      if (!Number.isNaN(q.yaw)) p.g.rotation.y = q.yaw;
      p.sign?.position.set(q.x, q.y + 2.1, q.z);
      if (q.swim) p.f.pose("glide");
      else p.f.walk((p.stride += PEOPLE_WALK_MS * dt * 3), 1);
    }
    p.f.update(dt);
  }
}

// The animals wander in their territories (domain/motion.ts wanderAt).
const m4 = new THREE.Matrix4();
const qy = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
let wildT = 0;
function moveAnimals(dt: number): void {
  wildT += dt;
  const touched = new Set<THREE.InstancedMesh>();
  for (const { mesh, index, it } of world.movers) {
    const w = it.wander!;
    const p = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, wildT + w.seed, w.speed);
    qy.setFromAxisAngle(UP, p.yaw);
    const sc = it.scale ?? 1;
    m4.compose(new THREE.Vector3(p.x, it.y, p.z), qy, new THREE.Vector3(sc, sc, sc));
    mesh.setMatrixAt(index, m4);
    touched.add(mesh);
  }
  for (const mesh of touched) mesh.instanceMatrix.needsUpdate = true;
}

const avatar = new CubeFigure(0xe8b48f, 0x2f7f8f, DOMENICA_HAIR, true);
avatar.root.scale.setScalar(0.92);
const rig = new THREE.Group();
rig.add(avatar.root);
scene.add(rig);

const EYE_M = 1.45;
const WALK_MS = 1.6;
const SWIM_MS = 2.2;
let body: Body = placeAt(near(L.start.x, L.start.z), L.start.x, L.start.y + 0.01, L.start.z)!;
let yaw = L.start.yaw;
let pitch = 0;
let stride = 0;
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
const viewBtn = menu.add({ className: "s1-view", icon: ICON.eye, label: "Vista: 1ª persona", key: "V", order: 0 }, () => toggleView());
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
  nodes: goable.map((a) => ({ id: a.id, label: a.building && !a.label.includes(a.building) ? `${a.label} (${a.building})` : a.label, desc: a.desc, goal: a.id, fixture: a.id, ...areaBox(a) })),
  links: [],
};
/** Where «Ir» takes her in an area: past its door on a floor or ring, the middle of a cap, the lagoon's water. */
function arrival(a: (typeof L.areas)[number]): Place {
  if (a.entry) return { area: a.id, x: a.entry.x, y: a.y, z: a.entry.z, yaw: a.entry.yaw, pose: "stand" };
  return { area: a.id, x: a.x, y: a.y, z: a.z, yaw: 0, pose: "stand" };
}
/** The route she is being walked along («Ir» by the real way); any touch of the sticks hands her back. */
let auto: { way: Route; s: number; to: Place } | undefined;
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
    auto = undefined;
    body = placeAt(near(body.x, body.z), body.x, body.y + 0.3, body.z) ?? body;
    return false;
  }
  const here = along(auto.way, auto.s);
  auto.s += (here.swim ? SWIM_MS : WALK_MS) * dt;
  const q = along(auto.way, auto.s);
  if (q.done) {
    body = placeAt(near(auto.to.x, auto.to.z), auto.to.x, auto.to.y + 0.01, auto.to.z) ?? body;
    yaw = auto.to.yaw;
    auto = undefined;
    return true;
  }
  stride += Math.hypot(q.x - body.x, q.z - body.z) * 3;
  if (!Number.isNaN(q.yaw)) yaw = q.yaw + Math.PI;
  body = { x: q.x, y: q.y, z: q.z, motion: q.swim ? "agua" : "gravedad", area: "" };
  return true;
}
const areasWindow = new AreasWindow(root, {
  here: () => "santuario-1",
  map: () => s1Map,
  at: () => (areaById.has(body.area) ? body.area : undefined),
  go: (n) => goTo(n.id),
});
RootMenu.global({ className: "areas-btn", icon: ICON.areas, label: "Áreas", window: "areas", order: 2 }, () => areasWindow.open()).show(true);

// --- What she can do here: the orange button under the menu (reglas.md §5.8) and the challenges -------------------
/** Doménica's needs: the challenges' rewards (Berón: no pasar hambre, compañía, fuerza, salud). */
const domenica = new CrewMember("Doménica", "domenica");
interface Thing extends Reachable {
  readonly i: number;
  readonly label: string;
  readonly modelId: string;
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
  const t: Thing = { i, label: d.label, modelId: d.id, x: it.x, y: it.y, z: it.z, rot: it.rot, sx: d.size.x * sc * (it.plan ?? 1), sz: d.size.z * sc * (it.plan ?? 1), sy: d.size.y * sc, mover: moversByIt.get(it) };
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
  const moving = movingThings.map((t) => {
    const w = t.mover!.it.wander!;
    const p = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, wildT + w.seed, w.speed);
    return { ...t, x: p.x, z: p.z, rot: p.yaw };
  });
  return nearest(body.x, body.y, body.z, [...here, ...moving], REACH_M + (moving.length ? 0 : 0));
}
function updateAtHand(dt: number): void {
  reachT -= dt;
  if (reachT > 0) return;
  reachT = 0.2;
  const t = challenge || picker.isOpen ? undefined : findAtHand();
  if (t?.i === atHand?.i && (t === undefined) === (atHand === undefined)) return;
  atHand = t;
  RootMenu.interact(t ? { icon: ICON.tasks, label: `Reto: ${shortLabel(t.label)}`, onClick: () => offerRetos(t) } : undefined);
}
const shortLabel = (l: string) => l.replace(/\s*\(.*\)\s*/g, " ").trim();

const duel = new DuelView(root);
const SHEET: SessionText = { title: "", progress: "Pasos", lives: "Intentos", order: "Ordena los pasos", submit: "Hacerlo", ok: "Paso hecho", bad: "Así no: inténtalo otra vez", sheet: true };
const picker = new RetoPicker(root);
let challenge: Reto | undefined;
const REWARD_LABEL = { comida: "no pasar hambre", compania: "compañía", fuerza: "fuerza", salud: "salud" } as const;

/** The thing's challenges: straight to the sheet if it offers one, else the choice. */
function offerRetos(t: Thing): void {
  const rs = retosFor(model(t.modelId), t.i);
  if (rs.length === 1) return openReto(rs[0]!);
  picker.open(shortLabel(t.label), rs.map((r) => ({ title: r.chore.title, detail: `${r.chore.exercises.length} pasos · da ${REWARD_LABEL[r.reward]}${r.reality === "ficción" ? " · magia del santuario" : ""}` })), (k) => openReto(rs[k]!));
}

/** A challenge on the sheet (the same sheet as sanctuary 3 and the ships); her reward when it is done. */
function openReto(r: Reto, done?: (ok: boolean) => void): void {
  const run = new ChoreRun(r.chore);
  challenge = r;
  RootMenu.interact(undefined);
  atHand = undefined;
  duel.onClose = () => {
    duel.onClose = undefined;
    challenge = undefined;
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
    (ans: Answer) => ({ ok: run.submit(ans) }),
  );
}

function frameFree(dt: number): void {
  if (challenge) return;
  if (frameAuto(dt)) return;
  const mv = walker.move();
  if (!mv.forward && !mv.right) return;
  const speed = (body.motion === "agua" ? SWIM_MS : WALK_MS) * dt;
  const dx = (-Math.sin(yaw) * mv.forward + Math.cos(yaw) * mv.right) * speed;
  const dz = (-Math.cos(yaw) * mv.forward - Math.sin(yaw) * mv.right) * speed;
  const dy = body.motion === "agua" ? Math.sin(pitch) * mv.forward * speed : 0;
  const before = body;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.2));
  for (let i = 0; i < n; i++) body = step(near(body.x, body.z), body, { dx: dx / n, dy: dy / n, dz: dz / n });
  // Swimming straight up or down a trunk (looking up or down with nothing ahead): the vertical part alone.
  if (body === before && body.motion === "agua" && Math.abs(dy) > 0.01) body = step(near(body.x, body.z), body, { dx: 0, dy, dz: 0 });
  stride += Math.hypot(body.x - before.x, body.z - before.z) * 3;
}

function updateCamera(dt: number): void {
  const look = walker.look(dt);
  yaw += look.yaw;
  pitch = Math.max(-1.3, Math.min(1.3, pitch + look.pitch));
  rig.position.set(body.x, body.y, body.z);
  rig.rotation.y = yaw + Math.PI;
  const eye = body.y + EYE_M;
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
  const moving = !!auto || walker.move().forward !== 0 || walker.move().right !== 0;
  if (body.motion === "agua") avatar.pose("glide");
  else avatar.walk(stride, moving ? 1 : 0);
  avatar.update(dt);
}

const areaById = new Map(L.areas.map((a) => [a.id, a]));
let last = performance.now();
function frame(now: number): void {
  const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
  last = now;
  frameFree(dt);
  updateCamera(dt);
  hour = (hour + (24 * dt) / S1_DAY_REAL_S) % 24;
  movePeople(dt);
  moveAnimals(dt);
  updateAtHand(dt);
  domenica.tick((24 * dt) / S1_DAY_REAL_S / 24, 0.5, 1);
  if (toastFor > 0 && (toastFor -= dt) <= 0) toast.classList.remove("on");
  const a = areaById.get(body.area);
  const hh = Math.floor(hour);
  const clock = `${hh}:${String(Math.floor((hour - hh) * 60)).padStart(2, "0")}`;
  const where = `Santuario 1 · ${clock} · ${a ? (a.building && !a.label.includes(a.building) ? `${a.building} · ${a.label}` : a.label) : body.motion === "agua" ? "En el agua" : "Hielo"}`;
  if (whereEl.textContent !== where) whereEl.textContent = where;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyV" && !e.repeat && !(e.target as HTMLElement).closest("input, textarea")) toggleView();
});
// Test hook (tools/experiencia and live checks): the layout, the body and the bulk style switch.
if (import.meta.env.DEV || new URLSearchParams(location.search).has("prueba"))
  (window as unknown as { codeshipS1: unknown }).codeshipS1 = { L, world, get body() { return body; }, set body(b: Body) { body = b; }, setHour: (h: number) => { hour = h; }, goTo, get auto() { return auto; }, areasWindow, get hour() { return hour; }, people, get atHand() { return atHand; }, openReto, domenica, setView: (y: number, p: number, third: boolean, dist = 3.6) => { yaw = y; pitch = p; camDist = dist; if (third !== thirdPerson) toggleView(); } };
requestAnimationFrame(frame);
