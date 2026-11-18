import * as THREE from "three";
import { WORLD_SCALE } from "@core/scale";
import { moveJoystick } from "@core/realism";
import { buildS1Layout } from "@modules/sanctuary-one/data/layout";
import { personRule } from "@modules/sanctuary-one/data/overrides";
import { placeAt, step, type Body } from "@modules/aerial-sanctuary/domain/walk";
import { S1_DAY_REAL_S, S1_START_HOUR, activityAt, along, route, wanderAt, type Activity, type Route } from "@modules/sanctuary-one/domain/motion";
import { staffPlaces, wayBetween, type Place } from "@modules/sanctuary-one/data/jornada";
import { buildS1Scene } from "./adapters/three/s1-models";
import { CubeFigure } from "./adapters/three/interior/figure";
import { textSign } from "./adapters/three/interior/sign";
import { Walker } from "./adapters/input/walker";
import { DOMENICA_HAIR } from "./ui/portraits";
import { RootMenu } from "./ui/root-menu";
import { ICON } from "./ui/icons";
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
let body: Body = placeAt(L.world, L.start.x, L.start.y + 0.01, L.start.z)!;
let yaw = L.start.yaw;
let pitch = 0;
let stride = 0;
let thirdPerson = false;
/** Third-person camera distance (the test hook sets it for overviews). */
let camDist = 3.6;

const ui = document.createElement("div");
ui.className = "cab-ui";
ui.innerHTML = `<div class="cab-where"></div>`;
root.appendChild(ui);
const whereEl = ui.querySelector<HTMLElement>(".cab-where")!;

const walker = new Walker(root, { move: "s3-move room-move", look: "s3-look room-look", moveLabel: "Moverse" }, moveJoystick("santuario-terrestre"));
walker.camera = camera;
walker.enabled = true;
const menu = new RootMenu(ui, "cab-menu", "Menú");
const viewBtn = menu.add({ className: "s1-view", icon: ICON.eye, label: "Vista: 1ª persona", key: "V", order: 0 }, () => toggleView());
function toggleView(): void {
  thirdPerson = !thirdPerson;
  menu.relabel(viewBtn, `Vista: ${thirdPerson ? "3ª" : "1ª"} persona`, "V");
}

function frameFree(dt: number): void {
  const mv = walker.move();
  if (!mv.forward && !mv.right) return;
  const speed = (body.motion === "agua" ? SWIM_MS : WALK_MS) * dt;
  const dx = (-Math.sin(yaw) * mv.forward + Math.cos(yaw) * mv.right) * speed;
  const dz = (-Math.cos(yaw) * mv.forward - Math.sin(yaw) * mv.right) * speed;
  const dy = body.motion === "agua" ? Math.sin(pitch) * mv.forward * speed : 0;
  const before = body;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.2));
  for (let i = 0; i < n; i++) body = step(L.world, body, { dx: dx / n, dy: dy / n, dz: dz / n });
  // Swimming straight up or down a trunk (looking up or down with nothing ahead): the vertical part alone.
  if (body === before && body.motion === "agua" && Math.abs(dy) > 0.01) body = step(L.world, body, { dx: 0, dy, dz: 0 });
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
  const moving = walker.move().forward !== 0 || walker.move().right !== 0;
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
  (window as unknown as { codeshipS1: unknown }).codeshipS1 = { L, world, get body() { return body; }, set body(b: Body) { body = b; }, setHour: (h: number) => { hour = h; }, get hour() { return hour; }, people, setView: (y: number, p: number, third: boolean, dist = 3.6) => { yaw = y; pitch = p; camDist = dist; if (third !== thirdPerson) toggleView(); } };
requestAnimationFrame(frame);
