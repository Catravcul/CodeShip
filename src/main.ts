import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { FlightComputer } from "@modules/flight/application/flight-computer";
import { buildAsteroidMesh } from "./adapters/three/asteroid-mesh";
import { buildCockpit } from "./adapters/three/cockpit";
import { buildStarfield } from "./adapters/three/starfield";
import { KeyboardPilot } from "./adapters/input/keyboard";
import { Hud } from "./ui/hud";

// --- Domain setup -----------------------------------------------------------
const bennu = new Asteroid(BENNU, Vec3.ZERO);
const ship = Ship.create(explorerDesign());
const start = RigidBodyState.at(new Vec3(250, 120, 1600)).withOrientation(
  // Face the asteroid from the start position.
  Quat.fromAxisAngle(Vec3.Y, Math.atan2(250, 1600)).multiply(Quat.fromAxisAngle(Vec3.X, -Math.atan2(120, 1620))),
);
const flight = new FlightComputer(ship, start, { gravitySources: [bennu], target: bennu });

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

const d = BENNU.dimensionsM.value;
const asteroidMesh = buildAsteroidMesh(
  { seed: 101955, size: { x: d.x, y: d.y, z: d.z }, detail: 6, ridge: 0.09, roughness: 0.06, craters: 60 },
  0x3b3835, // Bennu is very dark (albedo ~4%); tone mapping lifts it a little.
);
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

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Loop -------------------------------------------------------------------
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  flight.update(dt, pilot.command());

  const s = flight.state;
  camera.position.set(s.position.x, s.position.y, s.position.z);
  camera.quaternion.set(s.orientation.x, s.orientation.y, s.orientation.z, s.orientation.w);
  asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;

  hud.render(flight.telemetry(), flight.rotationAssist, [ship.propellantKg("MMH/NTO"), ship.propellantKg("Hydrazine")]);
  renderer.render(scene, camera);
});

// Exposed for automated checks and debugging.
(window as unknown as { codeship: unknown }).codeship = { flight, ship };
