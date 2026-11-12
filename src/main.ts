import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { Expedition } from "@modules/expedition/application/expedition";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import { asteroidSurfaceFn } from "./content/asteroid-shape";
import { TouchPilot, mergeCommands } from "./adapters/input/touch";
import { DuelView, asteroidText } from "./ui/duel-view";
import { buildAsteroidMesh } from "./adapters/three/asteroid-mesh";
import { FlightView, WARP_MIN_DISTANCE_M, thrustText } from "./adapters/three/flight-view";
import { buildStarfield } from "./adapters/three/starfield";
import { KeyboardPilot } from "./adapters/input/keyboard";
import { Hud } from "./ui/hud";
import { Habitat } from "@modules/habitat/application/habitat";
import { Cat } from "@modules/pets/domain/cat";
import {
  CAT_GRASS,
  CHILE_ESPANOLA,
  FIG_TREE,
  LETTUCE_OUTREDGEOUS,
  PEANUT_GEORGIA_RED,
  POTATO_NORLAND,
  RADISH_CHERRY_BELLE,
  SOYBEAN_HOYT,
  STRAWBERRY_SEASCAPE,
  TOMATO_RED_ROBIN,
  WHEAT_APOGEE,
} from "@modules/garden/data/species";
import { MACHINES } from "@modules/life-support/data/machines";
import { LAUNCH_STOCK } from "@modules/kitchen/data/stores";
import { Hen } from "@modules/poultry/domain/hen";
import { Dog } from "@modules/pets/domain/dog";
import { Mailbox } from "@modules/story/domain/mailbox";
import { STORY } from "@modules/story/data/nevaeh";
import type { Plant } from "@modules/garden/domain/plant";
import { seededRandom } from "./content/random";
import { Interior } from "./interior";
import { ShipBay } from "./ship-bay";
import { NanoNet } from "@modules/nano-net/domain/network";
import { NanoNetOps } from "@modules/nano-net/application/operations";
import { faultWhat, type NanoSite } from "@modules/nano-net/application/challenges";
import { REMOTE_NETS } from "@modules/nano-net/data/networks";
import { faultLetter } from "@modules/story/data/nevaeh";
import { NanoNetView } from "./adapters/three/nano-net-view";
import { NanoNetPanel } from "./ui/nano-net-panel";
import { buildStartRegion } from "./content/start-region";
import { AsteroidField } from "./adapters/three/asteroid-field";
import { SkyBodies } from "./adapters/three/sky-bodies";
import { Eva } from "@modules/eva/application/eva";
import { EvaMode } from "./eva-mode";

// --- Domain setup -----------------------------------------------------------
const d = BENNU.dimensionsM.value;
// One set of shape parameters drives both the render mesh and the surface the ship lands on.
const shapeParams = { seed: 101955, size: { x: d.x, y: d.y, z: d.z }, detail: 6, ridge: 0.09, roughness: 0.06, craters: 60 };
const surface = asteroidSurfaceFn(shapeParams);
const bennu = new Asteroid(BENNU, Vec3.ZERO, (local) => surface(local));
const ship = Ship.create(explorerDesign());
const startPos = new Vec3(250, 120, 1600);
// The starting region: Bennu among real New Polana–family asteroids, inside a soft boundary.
const region = buildStartRegion(bennu, startPos);
const start = RigidBodyState.at(startPos).withOrientation(
  // Face the asteroid from the start position.
  Quat.fromAxisAngle(Vec3.Y, Math.atan2(250, 1600)).multiply(Quat.fromAxisAngle(Vec3.X, -Math.atan2(120, 1620))),
);
const flight = new FlightComputer(ship, start, { gravitySources: region.asteroids, target: bennu });
const expedition = new Expedition(flight, bennu, EXERCISES, 500);

// Life on board: a long leg is already under way, so the garden has some days behind it.
const habitat = new Habitat(seededRandom(2026), 3, ship, "Doménica", MACHINES);
// Nevaeh writes to Doménica through the ship's radio (story rescued from the 2023 draft).
habitat.mailbox = new Mailbox(STORY);
// The nano_net: a persuaded Bennu can become a core (docs/design/nano-net.md).
const nano = new NanoNetOps(new NanoNet(REMOTE_NETS), seededRandom(4242));
const bennuSite: NanoSite = { id: BENNU.id, name: BENNU.name, position: bennu.position, radiusM: bennu.meanRadiusM, massKg: bennu.massKg, muM3S2: bennu.mu };
/** The nano_net wears on the same clock as life on board (a game day every ~40 s). */
const NANO_DAYS_PER_SECOND = 1 / 40;
let faultLetters = 0;
const growFor = (p: Plant, days: number) => {
  for (let t = 0; t < days; t += 0.25) {
    p.tick(0.25, { lit: true });
    if (p.water < 0.5) p.waterIt();
  }
};
const garden: [string, Parameters<Habitat["plant"]>[1], number][] = [
  ["l1", LETTUCE_OUTREDGEOUS, 31],
  ["l2", LETTUCE_OUTREDGEOUS, 0],
  ["c1", CHILE_ESPANOLA, 51],
  ["t1", TOMATO_RED_ROBIN, 44],
  ["t2", TOMATO_RED_ROBIN, 0],
  ["r1", RADISH_CHERRY_BELLE, 27],
  ["r2", RADISH_CHERRY_BELLE, 10],
  ["p1", POTATO_NORLAND, 91],
  ["p2", POTATO_NORLAND, 40],
  ["s1", SOYBEAN_HOYT, 90],
  ["s2", SOYBEAN_HOYT, 30],
  ["w1", WHEAT_APOGEE, 77],
  ["w2", WHEAT_APOGEE, 77],
  ["w3", WHEAT_APOGEE, 35],
  ["g1", CAT_GRASS, 12],
];
for (const [id, sp, days] of garden) growFor(habitat.plant(id, sp), days);
// Stores the ship left with: potatoes, peanuts, flour, eggs, meat, animal food and culture medium.
habitat.stockAll(LAUNCH_STOCK);
habitat.adopt(new Cat("luna", "Luna", 4));
// Nube came aboard at the last stop: the two are still being introduced.
habitat.adopt(new Cat("nube", "Nube", 3.2))[0]!.startAt("contacto-visual");
// Yema is broody: she can adopt a puppy or a kitten if Doménica programs her to.
for (const [id, name] of [["clara", "Clara"], ["yema", "Yema"], ["pinta", "Pinta"]] as const) habitat.addHen(new Hen(id, name, id === "yema"));
// Two chihuahuas: Coco, an adult, and Pepa, a puppy a few weeks old.
habitat.addDog(new Dog("coco", "Coco", 2.4));
habitat.addDog(new Dog("pepa", "Pepa", 0.9, "cachorro"));
// The farm deck: eleven 15 m² beds of artificial soil, planted in turns so harvests keep coming,
// and four fig trees in planters.
const farm: [string, Parameters<Habitat["bed"]>[1], number][] = [
  ["bancal-trigo-1", WHEAT_APOGEE, 60],
  ["bancal-trigo-2", WHEAT_APOGEE, 20],
  ["bancal-papa-1", POTATO_NORLAND, 70],
  ["bancal-papa-2", POTATO_NORLAND, 25],
  ["bancal-soja", SOYBEAN_HOYT, 50],
  ["bancal-tomate", TOMATO_RED_ROBIN, 75],
  ["bancal-lechuga", LETTUCE_OUTREDGEOUS, 20],
  ["bancal-rabano", RADISH_CHERRY_BELLE, 2],
  ["bancal-cacahuete-1", PEANUT_GEORGIA_RED, 105],
  ["bancal-cacahuete-2", PEANUT_GEORGIA_RED, 40],
  ["bancal-fresa", STRAWBERRY_SEASCAPE, 40],
];
for (const [id, sp, days] of farm) growFor(habitat.bed(id, sp, 15), days);
for (const [i, days] of [120, 120, 90, 60].entries()) growFor(habitat.tree(`higuera-${i + 1}`, FIG_TREE), days);

// --- Rendering adapter ------------------------------------------------------
const root = document.getElementById("app")!;
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
root.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2e6);
scene.add(camera);

scene.add(buildStarfield(1e6));
// Sun and planets seen from the region (JPL elements at the game date); the light comes from the Sun disc.
const skyBodies = new SkyBodies(region.sky(), root);
scene.add(skyBodies.group);
const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
sun.position.copy(skyBodies.sunDirection).multiplyScalar(1e4);
scene.add(sun, new THREE.AmbientLight(0x223344, 0.25));
const field = new AsteroidField(region, skyBodies.sunDirection, root);
scene.add(field.group);

const asteroidMesh = buildAsteroidMesh(shapeParams, 0x3b3835); // Bennu is very dark; tone mapping lifts it a little.
scene.add(asteroidMesh);

const reticle = document.createElement("div");
reticle.className = "reticle";
root.appendChild(reticle);

const hud = new Hud(root, {
  ship: ship.name,
  target: BENNU.name,
  propellants: [
    // Getters: a tank swap in the ship bay changes the capacity.
    { label: "MMH/NTO (motor principal)", get capacity() { return ship.propellantCapacityKg("MMH/NTO"); } },
    { label: "Hidracina (RCS)", get capacity() { return ship.propellantCapacityKg("Hydrazine"); } },
  ],
});

const pilot = new KeyboardPilot(window);
pilot.onToggleAssist = () => (flight.rotationAssist = !flight.rotationAssist);
const touch = new TouchPilot(root);

const duelView = new DuelView(root);
const view = new FlightView(scene, camera, root, () => ship.design);
const landBtn = view.addButton("land-btn", () => (flight.landingAssist = !flight.landingAssist));
const namesBtn = view.addButton("names-btn", () => (skyBodies.labelsOn = !skyBodies.labelsOn));
const regionTag = document.createElement("div");
regionTag.className = "region-tag";
root.appendChild(regionTag);
const regionTitle = `${region.data.name} · ${region.heliocentricAU().length().toFixed(2).replace(".", ",")} UA del Sol`;
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyG" && !e.repeat && !interior.active) flight.landingAssist = !flight.landingAssist;
});
const duelSession = () => {
  const d = expedition.duel!;
  return {
    get current() {
      return d.current;
    },
    get progress() {
      return d.persuasion;
    },
    goal: d.profile.persuasionGoal,
    get lives() {
      return d.patience;
    },
    maxLives: d.profile.patience,
  };
};
const interior = new Interior(root, habitat, duelView);
const nanoView = new NanoNetView(scene, nano.net);
const nanoPanel = new NanoNetPanel(root, duelView, view.addButton("nano-btn", () => {}), nano, bennuSite);
// Walks outside on Bennu (EVA): only with the ship anchored.
const eva = new Eva(flight, bennu, (local) => surface(local), habitat.crew.body.massKg);
const evaMode = new EvaMode(root, scene, camera, eva, bennu, duelView);
const evaBtn = view.addButton("eva-btn", () => !duelView.visible && !interior.active && evaMode.startSuitUp());
evaBtn.textContent = "Salir de la nave";
evaMode.onExit = () => view.center();
const modeBtn = document.createElement("button");
modeBtn.className = "mode-btn";
modeBtn.textContent = "Ir al interior";
root.appendChild(modeBtn);
modeBtn.addEventListener("click", () => {
  if (duelView.visible || evaMode.active) return;
  if (interior.active) interior.exit();
  else interior.enter();
  modeBtn.textContent = interior.active ? "Ir a la cabina" : "Ir al interior";
});
let lastPhase = expedition.phase;

// Ship bay: the ship from outside, its parts' state and swaps. Reached from the cockpit and the habitat.
const bay = new ShipBay(root, ship, habitat, duelView);
const openBay = (from: "cabina" | "interior") => {
  if (duelView.visible || bay.active) return;
  if (from === "interior") interior.exit();
  bay.enter(from);
};
bay.onExit = (from) => {
  if (from === "interior") interior.enter();
  modeBtn.textContent = interior.active ? "Ir a la cabina" : "Ir al interior";
};
interior.openBay = () => openBay("interior");
view.addButton("bay-btn", () => openBay("cabina")).textContent = "Bahía de la nave";
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyB" && !e.repeat && !interior.active && !duelView.visible) bay.active ? bay.exit() : openBay("cabina");
});

const action = document.createElement("button");
action.className = "action hidden";
root.appendChild(action);
action.addEventListener("click", () => {
  if (expedition.canStartDuel) {
    expedition.startDuel();
    duelView.show(duelSession(), asteroidText(BENNU.name), (answer) => {
      const events = expedition.answer(answer);
      return { ok: events.some((e) => e.type === "idea-accepted") };
    });
  } else if (expedition.phase === "persuaded" || expedition.phase === "aggressive") {
    duelView.hide();
  }
});
const banner = document.createElement("div");
banner.className = "banner";
root.appendChild(banner);

function renderPhase(): void {
  const p = expedition.phase;
  const t = flight.telemetry();
  action.classList.toggle("hidden", nanoPanel.busy || !((p === "landed" && !duelView.visible) || ((p === "persuaded" || p === "aggressive") && duelView.visible)));
  action.textContent = p === "landed" ? "Entrar en su mente" : "Volver a la cabina";
  if (p === "persuaded") {
    banner.textContent = `${BENNU.name} obedece: ${expedition.cargo.map((c) => `${c.kg.toFixed(0)} kg de ${c.material}`).join(", ")} en la bodega`;
  } else if (p === "aggressive") {
    const left = Math.max(0, expedition.safeDistanceM! - t.distanceToSurface);
    banner.textContent = left > 0 ? `¡${BENNU.name} está furioso! Huye: faltan ${left.toFixed(0)} m hasta la distancia segura` : "A salvo. Espera a que se calme";
  } else if (p === "landed") {
    banner.textContent = "Nave anclada · puedes salir a Bennu con el traje";
  } else {
    banner.textContent =
      t.clearance < 60
        ? t.tiltDeg > 30
          ? `Gira la panza hacia el suelo (${t.tiltDeg.toFixed(0)}°, máx. 30°): asistente de aterrizaje con G`
          : "Posa el tren a menos de 0,10 m/s para anclarte"
        : "";
  }
  banner.className = `banner ${p}`;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  interior.resize();
  bay.resize();
});

// --- Loop -------------------------------------------------------------------
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const cmd = interior.active || bay.active || evaMode.active ? NO_INPUT : mergeCommands(pilot.command(), touch.command());
  const idle = cmd.mainThrottle === 0 && cmd.translation.length() === 0 && cmd.rotation.length() === 0;
  // Time warp only on quiet cruise far from the surface, so landing stays real-time.
  const far = flight.telemetry().distanceToSurface >= WARP_MIN_DISTANCE_M;
  const sp = flight.state.position;
  const fx = nano.net.effectsAt(sp);
  const asked = (expedition.phase === "flight" || expedition.phase === "persuaded") && !flight.landed && idle && far ? view.warpRequested : 1;
  // Inside the nano_net its speed nodes let time run faster.
  const warp = asked > 1 ? Math.round(asked * fx.warpFactor) : 1;
  const warpNote =
    view.warpRequested > 1 && warp === 1 ? (far ? "tiempo ×1 mientras maniobras" : "tiempo ×1 cerca del asteroide") : warp > 1 ? `tiempo ×${warp}${fx.warpFactor > 1 ? " (nano_net)" : ""}` : "";
  expedition.update(dt * warp, cmd);
  // Region rules: soft boundary push back and no flying through the other rocks (game rules).
  if (!flight.landed) {
    const st = flight.state;
    flight.applyImpulse(region.boundaryPush(st.position, st.velocity, dt * warp).add(region.avoidObstacles(st.position, st.velocity)));
  }
  // Shield nodes absorb part of the jolt.
  if (expedition.phase === "aggressive" && lastPhase !== "aggressive") habitat.jolt(0.8 * (1 - fx.safety), `${BENNU.name}, furioso, sacudió la nave`);
  if (expedition.phase === "persuaded" && lastPhase !== "persuaded") nano.subjugate(bennuSite.id);
  if (!nanoPanel.busy) nano.tick(dt * NANO_DAYS_PER_SECOND);
  nano.powerShip(ship, fx, dt * warp);
  for (const e of nano.drainEvents()) {
    const box = habitat.mailbox!;
    if (e.type === "core-planted") box.achieve("nucleo");
    if (e.type === "stage-learned") box.achieve(e.stage);
    if (e.type === "repaired") box.achieve("reparar", e.fault.id);
    if (e.type === "fault") {
      const core = nano.net.core(e.fault.coreId)!;
      box.post(faultLetter({ faultId: e.fault.id, coreName: core.name, what: faultWhat(core, e.fault) }, ++faultLetters));
    }
  }
  lastPhase = expedition.phase;
  interior.update(dt);
  view.enabled = !interior.active && !bay.active && !duelView.visible && !evaMode.active;
  document.body.classList.toggle("in-cockpit", view.enabled);
  if (interior.active) {
    renderer.render(interior.scene, interior.camera);
    return;
  }
  if (bay.active) {
    bay.update(dt);
    renderer.render(bay.scene, bay.camera);
    return;
  }
  evaBtn.classList.toggle("hidden", !eva.canLeave || expedition.phase !== "landed");
  if (evaMode.active) {
    view.rig.visible = false;
    evaMode.update(dt, flight.simTimeS);
    asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;
    renderer.render(scene, camera);
    return;
  }
  view.rig.visible = true;
  renderPhase();
  nanoPanel.update(flight.landed, fx, !duelView.visible);
  nanoView.update(flight.simTimeS);
  landBtn.textContent = `Aterrizaje: ${flight.landingAssist ? "auto" : "manual"}`;
  landBtn.classList.toggle("on", flight.landingAssist);

  const s = flight.state;
  view.update(
    dt,
    new THREE.Vector3(s.position.x, s.position.y, s.position.z),
    new THREE.Quaternion(s.orientation.x, s.orientation.y, s.orientation.z, s.orientation.w),
    cmd,
    warp,
    warpNote,
  );
  asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;
  field.update(camera, window.innerHeight, flight.simTimeS, view.enabled && skyBodies.labelsOn);
  skyBodies.update(camera, renderer.getPixelRatio(), view.enabled);
  const namesText = `Nombres: ${skyBodies.labelsOn ? "sí" : "no"}`;
  if (namesBtn.textContent !== namesText) namesBtn.textContent = namesText;
  const edge = region.boundary(flight.state.position);
  const tagText =
    edge.zone === "outside"
      ? "Fuera de la zona de vuelo: el ordenador te devuelve dentro"
      : edge.zone === "warning"
        ? `Límite de la zona de vuelo a ${(edge.toEdgeM / 1000).toFixed(1).replace(".", ",")} km: el ordenador te frena`
        : now < 12000
          ? regionTitle
          : "";
  if (regionTag.textContent !== tagText) {
    regionTag.textContent = tagText;
    regionTag.className = `region-tag ${edge.zone}${tagText ? " on" : ""}`;
  }

  hud.render(flight.telemetry(), flight.rotationAssist, [ship.propellantKg("MMH/NTO"), ship.propellantKg("Hydrazine")], thrustText(cmd));
  renderer.render(scene, camera);
});

// Exposed for automated checks and debugging.
(window as unknown as { codeship: unknown }).codeship = { flight, ship, expedition, habitat, interior, view, bay, nano, region, field, skyBodies, eva, evaMode };
