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
import { buildCockpit } from "./adapters/three/cockpit";
import { buildStarfield } from "./adapters/three/starfield";
import { KeyboardPilot } from "./adapters/input/keyboard";
import { Hud } from "./ui/hud";
import { Habitat } from "@modules/habitat/application/habitat";
import { Cat } from "@modules/pets/domain/cat";
import {
  CAT_GRASS,
  CHILE_ESPANOLA,
  LETTUCE_OUTREDGEOUS,
  POTATO_NORLAND,
  RADISH_CHERRY_BELLE,
  SOYBEAN_HOYT,
  TOMATO_RED_ROBIN,
  WHEAT_APOGEE,
} from "@modules/garden/data/species";
import { MACHINES } from "@modules/life-support/data/machines";
import { Hen } from "@modules/poultry/domain/hen";
import { Dog } from "@modules/pets/domain/dog";
import { Mailbox } from "@modules/story/domain/mailbox";
import { STORY } from "@modules/story/data/nevaeh";
import type { Plant } from "@modules/garden/domain/plant";
import { seededRandom } from "./content/random";
import { Interior } from "./interior";

// --- Domain setup -----------------------------------------------------------
const d = BENNU.dimensionsM.value;
// One set of shape parameters drives both the render mesh and the surface the ship lands on.
const shapeParams = { seed: 101955, size: { x: d.x, y: d.y, z: d.z }, detail: 6, ridge: 0.09, roughness: 0.06, craters: 60 };
const surface = asteroidSurfaceFn(shapeParams);
const bennu = new Asteroid(BENNU, Vec3.ZERO, (local) => surface(local));
const ship = Ship.create(explorerDesign());
const start = RigidBodyState.at(new Vec3(250, 120, 1600)).withOrientation(
  // Face the asteroid from the start position.
  Quat.fromAxisAngle(Vec3.Y, Math.atan2(250, 1600)).multiply(Quat.fromAxisAngle(Vec3.X, -Math.atan2(120, 1620))),
);
const flight = new FlightComputer(ship, start, { gravitySources: [bennu], target: bennu });
const expedition = new Expedition(flight, bennu, EXERCISES, 500);

// Life on board: a long leg is already under way, so the garden has some days behind it.
const habitat = new Habitat(seededRandom(2026), 3, ship, "Doménica", MACHINES);
// Nevaeh writes to Doménica through the ship's radio (story rescued from the 2023 draft).
habitat.mailbox = new Mailbox(STORY);
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
// Stores the ship left with: cat food, hen feed and culture medium for the bioreactor.
habitat.stock("pienso-gatos", 1500);
habitat.stock("pienso-gallinas", 4);
habitat.stock("medio-cultivo", 12);
habitat.adopt(new Cat("luna", "Luna", 4));
// Nube came aboard at the last stop: the two are still being introduced.
habitat.adopt(new Cat("nube", "Nube", 3.2))[0]!.startAt("contacto-visual");
// Yema is broody: she can adopt a puppy or a kitten if Doménica programs her to.
for (const [id, name] of [["clara", "Clara"], ["yema", "Yema"], ["pinta", "Pinta"]] as const) habitat.addHen(new Hen(id, name, id === "yema"));
// Two chihuahuas: Coco, an adult, and Pepa, a puppy a few weeks old.
habitat.addDog(new Dog("coco", "Coco", 2.4));
habitat.addDog(new Dog("pepa", "Pepa", 0.9, "cachorro"));
// The farm deck: eight 15 m² beds of artificial soil, planted in turns so harvests keep coming.
const farm: [string, Parameters<Habitat["bed"]>[1], number][] = [
  ["bancal-trigo-1", WHEAT_APOGEE, 60],
  ["bancal-trigo-2", WHEAT_APOGEE, 20],
  ["bancal-papa-1", POTATO_NORLAND, 70],
  ["bancal-papa-2", POTATO_NORLAND, 25],
  ["bancal-soja", SOYBEAN_HOYT, 50],
  ["bancal-tomate", TOMATO_RED_ROBIN, 75],
  ["bancal-lechuga", LETTUCE_OUTREDGEOUS, 20],
  ["bancal-rabano", RADISH_CHERRY_BELLE, 2],
];
for (const [id, sp, days] of farm) growFor(habitat.bed(id, sp, 15), days);

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
camera.add(buildCockpit());
const cabinLight = new THREE.PointLight(0x9fdcff, 0.6, 3);
cabinLight.position.set(0, 0.3, -0.3);
camera.add(cabinLight);

scene.add(buildStarfield(1e6));
const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
sun.position.set(-1, 0.4, 0.6).multiplyScalar(1e4);
scene.add(sun, new THREE.AmbientLight(0x223344, 0.25));

const asteroidMesh = buildAsteroidMesh(shapeParams, 0x3b3835); // Bennu is very dark; tone mapping lifts it a little.
scene.add(asteroidMesh);

const reticle = document.createElement("div");
reticle.className = "reticle";
root.appendChild(reticle);

const hud = new Hud(root, {
  ship: ship.name,
  target: BENNU.name,
  propellants: [
    { label: "MMH/NTO (motor principal)", capacity: ship.propellantCapacityKg("MMH/NTO") },
    { label: "Hidracina (RCS)", capacity: ship.propellantCapacityKg("Hydrazine") },
  ],
});

const pilot = new KeyboardPilot(window);
pilot.onToggleAssist = () => (flight.rotationAssist = !flight.rotationAssist);
const touch = new TouchPilot(root);

const duelView = new DuelView(root);
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
const modeBtn = document.createElement("button");
modeBtn.className = "mode-btn";
modeBtn.textContent = "Ir al interior";
root.appendChild(modeBtn);
modeBtn.addEventListener("click", () => {
  if (duelView.visible) return;
  if (interior.active) interior.exit();
  else interior.enter();
  modeBtn.textContent = interior.active ? "Ir a la cabina" : "Ir al interior";
});
let lastPhase = expedition.phase;

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
  action.classList.toggle("hidden", !(p === "landed" || ((p === "persuaded" || p === "aggressive") && duelView.visible)));
  action.textContent = p === "landed" ? "Entrar en su mente" : "Volver a la cabina";
  if (p === "persuaded") {
    banner.textContent = `${BENNU.name} obedece: ${expedition.cargo.map((c) => `${c.kg.toFixed(0)} kg de ${c.material}`).join(", ")} en la bodega`;
  } else if (p === "aggressive") {
    const left = Math.max(0, expedition.safeDistanceM! - t.distanceToSurface);
    banner.textContent = left > 0 ? `¡${BENNU.name} está furioso! Huye: faltan ${left.toFixed(0)} m hasta la distancia segura` : "A salvo. Espera a que se calme";
  } else if (p === "landed") {
    banner.textContent = "Nave anclada";
  } else {
    banner.textContent = t.distanceToSurface < 60 ? "Aterriza a menos de 0,10 m/s para anclarte" : "";
  }
  banner.className = `banner ${p}`;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  interior.resize();
});

// --- Loop -------------------------------------------------------------------
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  expedition.update(dt, interior.active ? NO_INPUT : mergeCommands(pilot.command(), touch.command()));
  if (expedition.phase === "aggressive" && lastPhase !== "aggressive") habitat.jolt(0.8, `${BENNU.name}, furioso, sacudió la nave`);
  lastPhase = expedition.phase;
  interior.update(dt);
  if (interior.active) {
    renderer.render(interior.scene, interior.camera);
    return;
  }
  renderPhase();

  const s = flight.state;
  camera.position.set(s.position.x, s.position.y, s.position.z);
  camera.quaternion.set(s.orientation.x, s.orientation.y, s.orientation.z, s.orientation.w);
  asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;

  hud.render(flight.telemetry(), flight.rotationAssist, [ship.propellantKg("MMH/NTO"), ship.propellantKg("Hydrazine")]);
  renderer.render(scene, camera);
});

// Exposed for automated checks and debugging.
(window as unknown as { codeship: unknown }).codeship = { flight, ship, expedition, habitat, interior };
