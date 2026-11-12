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
import { SpinRing } from "@modules/gravity/domain/spin-gravity";
import { Station } from "@modules/station/domain/station";
import { MaterialStock } from "@modules/station/domain/materials";
import { Hangar } from "@modules/station/domain/hangar";
import { STATION_TUNING } from "@modules/station/domain/blueprint";
import { StationOps } from "@modules/station/application/station-ops";
import { BLUEPRINTS } from "@modules/station/data/blueprints";
import { REFINE_PROCESSES } from "@modules/station/data/processes";
import { materialName } from "@modules/station/data/materials";
import { EXPLORER_CRAFT, MOTHERSHIP_CRAFT, POLANA_STATION, STARTING_STOCK } from "@modules/station/data/station";
import { StationModel } from "./adapters/three/station-model";
import { StationScreen } from "./station-screen";
import { Mothership } from "@modules/mothership/domain/mothership";
import { IDSS_CONTACT_LIMITS, NODRIZA, UNDOCK_PUSH_MS } from "@modules/mothership/data/mothership";
import { ASSIST_RANGE_M, Docking } from "@modules/mothership/application/docking";
import { MothershipModel } from "./adapters/three/mothership-model";
import { Navigator } from "@modules/navigation/application/navigator";
import { asteroidTarget } from "@modules/navigation/domain/nav-target";
import { NavigationMode } from "./navigation";
import { mothershipCarrier } from "@modules/navigation/application/mothership-carrier";
import { MissionLog } from "@modules/missions/domain/mission";
import { MissionControl } from "@modules/missions/application/mission-control";
import { MISSION_LETTERS, NEVAEH_MISSIONS } from "@modules/missions/data/nevaeh-missions";
import { MissionLogPanel } from "./ui/mission-log";

// --- Domain setup -----------------------------------------------------------
const d = BENNU.dimensionsM.value;
// One set of shape parameters drives both the render mesh and the surface the ship lands on.
const shapeParams = { seed: 101955, size: { x: d.x, y: d.y, z: d.z }, detail: 6, ridge: 0.09, roughness: 0.06, craters: 60 };
const surface = asteroidSurfaceFn(shapeParams);
const bennu = new Asteroid(BENNU, Vec3.ZERO, (local) => surface(local));
const ship = Ship.create(explorerDesign());
const startPos = new Vec3(250, 120, 1600);
// The starting region: Bennu among real New Polana–family asteroids, inside a soft boundary.
const region = buildStartRegion(bennu, startPos, [{ centre: POLANA_STATION.position, radiusM: POLANA_STATION.radiusM * 3 }]);
// Face the asteroid from the start position.
const startAttitude = Quat.fromAxisAngle(Vec3.Y, Math.atan2(250, 1600)).multiply(Quat.fromAxisAngle(Vec3.X, -Math.atan2(120, 1620)));
const start = RigidBodyState.at(startPos).withOrientation(startAttitude);
// The mothership is parked near Bennu with the probe docked under its forward node
// (docs/design/nave-nodriza.md). Its rings are already turning at cruise rate (gravedad.md).
const mothership = Mothership.withProbeDockedAt(NODRIZA, startPos, startAttitude, ship.design.dockingPort!);
const ring = new SpinRing(mothership.spec.ring);
const flight = new FlightComputer(ship, start, { gravitySources: region.asteroids, target: bennu });
const docking = new Docking(flight, mothership, IDSS_CONTACT_LIMITS, UNDOCK_PUSH_MS.value);
docking.dockNow();
docking.drainEvents();
const expedition = new Expedition(flight, bennu, EXERCISES, 500);
// The space station: refinery, foundry, metal printer and hangar (docs/design/estacion.md).
const stationOps = new StationOps(
  new Station(POLANA_STATION, new MaterialStock(STARTING_STOCK), new Hangar({}, [
    { ...MOTHERSHIP_CRAFT, name: mothership.spec.name, massKg: mothership.massKg },
    { ...EXPLORER_CRAFT, name: ship.name, massKg: ship.massKg },
  ])),
  BLUEPRINTS,
  REFINE_PROCESSES,
  materialName,
);

// Navigation: any catalogued asteroid of the region can be the target (docs/design/navegacion.md).
const navTargets = region.asteroids.map(asteroidTarget);
const nav = new Navigator(
  flight,
  {
    targets: navTargets,
    obstaclesFor: (t) => region.obstaclesExcept(t.body),
    retarget: (t) => expedition.retarget(t.body),
    isPersuaded: (t) => expedition.isPersuaded(t.id),
    // With the probe docked, the mothership flies the long part of a trip.
    carrier: mothershipCarrier(mothership, docking),
  },
  navTargets[0]!,
);

// Life on board: a long leg is already under way, so the garden has some days behind it.
const habitat = new Habitat(seededRandom(2026), 3, ship, "Doménica", MACHINES);
// Nevaeh writes to Doménica through the ship's radio (story rescued from the 2023 draft).
habitat.mailbox = new Mailbox(STORY);
// The nano_net: a persuaded Bennu can become a core (docs/design/nano-net.md).
// Nevaeh's main missions and the side missions (docs/design/misiones.md). Rewards go to the station.
const missions = new MissionControl(
  new MissionLog(NEVAEH_MISSIONS, navTargets.map((t) => ({ id: t.id, name: t.name }))),
  habitat.mailbox,
  MISSION_LETTERS,
  (a) => stationOps.station.stock.add(a),
);
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
const stationModel = new StationModel();
stationModel.root.position.set(POLANA_STATION.position.x, POLANA_STATION.position.y, POLANA_STATION.position.z);
scene.add(stationModel.root);

const reticle = document.createElement("div");
reticle.className = "reticle";
root.appendChild(reticle);

const hud = new Hud(root, {
  ship: ship.name,
  get target() {
    return expedition.asteroid.data.name;
  },
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
const mothershipModel = new MothershipModel(mothership.spec);
mothershipModel.root.position.set(mothership.position.x, mothership.position.y, mothership.position.z);
mothershipModel.root.quaternion.set(mothership.orientation.x, mothership.orientation.y, mothership.orientation.z, mothership.orientation.w);
scene.add(mothershipModel.root);
const view = new FlightView(scene, camera, root, () => ship.design, { position: mothershipModel.root.position, quaternion: mothershipModel.root.quaternion, sun: skyBodies.sunDirection });
const landBtn = view.addButton("land-btn", () => (flight.landingAssist = !flight.landingAssist));
// Docked: undock. Free: the docking assist (like the landing assist), near the mothership.
const dockBtn = view.addButton("dock-btn", () => (docking.docked ? docking.undock() : (docking.assist = !docking.assist)));
const namesBtn = view.addButton("names-btn", () => (skyBodies.labelsOn = !skyBodies.labelsOn));
const navMode = new NavigationMode(root, nav, duelView, {
  title: `Mapa · ${region.data.name}`,
  boundaryRadiusM: region.data.boundaryRadiusM,
  rocks: region.rocks,
  shipPosition: () => flight.state.position,
  shipNose: () => flight.state.toWorld(new Vec3(0, 0, -1)),
  carrierPosition: () => mothership.position,
});
view.addButton("map-btn", () => navMode.toggle()).textContent = "Mapa";
// The mission log, from the cockpit and from the map; the map marks Nevaeh's targets.
const missionLog = new MissionLogPanel(root, missions, habitat.mailbox);
navMode.map.missionMark = (id) => missionLog.mark(id);
navMode.map.onMissions = () => missionLog.open();
missionLog.onShowOnMap = (id) => navMode.map.show(id);
const missionsBtn = view.addButton("missions-btn", () => !duelView.visible && missionLog.open());
const regionTag = document.createElement("div");
regionTag.className = "region-tag";
root.appendChild(regionTag);
const regionTitle = `${region.data.name} · ${region.heliocentricAU().length().toFixed(2).replace(".", ",")} UA del Sol`;
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyG" && !e.repeat && !interior.active) flight.landingAssist = !flight.landingAssist;
  if (e.code === "KeyK" && !e.repeat && !interior.active && !bay.active && !duelView.visible) dockBtn.click();
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
const interior = new Interior(root, habitat, duelView, ring);
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
  // The rings, the garden and the chores are on the mothership: only reachable while docked.
  if (!interior.active && !docking.docked) return flash("El interior está en la nodriza: acopla la sonda para entrar");
  if (interior.active) interior.exit();
  else interior.enter();
  modeBtn.textContent = interior.active ? "Ir a la cabina" : "Ir al interior";
});
// The hatch at the end of the spine opens into the cockpit.
if (interior.zones)
  interior.zones.onCockpit = () => {
    interior.exit();
    view.setMode("cabina");
    modeBtn.textContent = "Ir al interior";
  };
let lastPhase = expedition.phase;

// Ship bay: the ship from outside, its parts' state and swaps. Reached from the cockpit and the habitat.
// Part swaps take the part from the station's hangar; the old one goes back there.
const bay = new ShipBay(root, ship, habitat, duelView, mothership.spec, stationOps.station.hangar);
bay.docked = () => docking.docked;
// The mothership's thruster mounts are refitted in the bay's Nodriza tab (docs/design/nave-nodriza.md).
bay.nodriza = mothership;
bay.onDriveRefit = () => mothershipModel.setThrusters(mothership.fitted);
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
// Space station screen. For now it opens from anywhere in the cockpit (remote/test access); alongside it counts as docked.
const stationScreen = new StationScreen(root, stationOps, ship, expedition, duelView, () => flight.state.position, (id) =>
  id === MOTHERSHIP_CRAFT.id ? mothership.position : id === EXPLORER_CRAFT.id ? flight.state.position : undefined,
);
stationScreen.onExit = () => view.center();
const stationBtn = view.addButton("estacion-btn", () => !duelView.visible && !bay.active && !interior.active && !evaMode.active && stationScreen.enter());
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyB" && !e.repeat && !interior.active && !duelView.visible) bay.active ? bay.exit() : openBay("cabina");
});

const action = document.createElement("button");
action.className = "action hidden";
root.appendChild(action);
action.addEventListener("click", () => {
  if (expedition.canStartDuel) {
    expedition.startDuel();
    duelView.show(duelSession(), asteroidText(expedition.asteroid.data.name), (answer) => {
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
/** A docking message that stays on the banner for a few seconds. */
let flashText = "";
let flashUntil = 0;
function flash(text: string, seconds = 5): void {
  flashText = text;
  flashUntil = performance.now() + seconds * 1000;
}
const n2 = (v: number) => v.toFixed(2).replace(".", ",");
/** Docking line for the banner, or "" when the mothership is far. */
function dockingText(): string {
  if (performance.now() < flashUntil) return flashText;
  if (docking.docked) return "Acoplada a la nodriza · K desacopla · M abre el mapa";
  // While the trip autopilot flies away from the port, the docking read-out is noise.
  if (nav.status === "autopilot") return "";
  const a = docking.alignment();
  const range = flight.state.position.sub(mothership.port.position).length();
  if (range > 400) return "";
  const lim = IDSS_CONTACT_LIMITS;
  const ok = (good: boolean) => (good ? "✓" : "✗");
  return `Puerto de la nodriza a ${range < 10 ? n2(Math.max(0, a.axialM)) : range.toFixed(0)} m · cierre ${n2(a.closingMs)} m/s ${ok(a.closingMs >= lim.closingMinMs && a.closingMs <= lim.closingMaxMs)} · lateral ${n2(a.lateralM)} m ${ok(a.lateralM <= lim.lateralMisalignM)} · inclinación ${a.misalignDeg.toFixed(1).replace(".", ",")}° ${ok(a.misalignDeg <= lim.angularMisalignDeg)}${docking.assist ? " · asistente de acople" : " · asistente: K"}`;
}

function renderPhase(): void {
  const p = expedition.phase;
  const t = flight.telemetry();
  action.classList.toggle("hidden", nanoPanel.busy || !((p === "landed" && !duelView.visible) || ((p === "persuaded" || p === "aggressive") && duelView.visible)));
  action.textContent = p === "landed" ? "Entrar en su mente" : "Volver a la cabina";
  if (p === "persuaded") {
    banner.textContent = `${expedition.asteroid.data.name} obedece: ${expedition.cargo.map((c) => `${c.kg.toFixed(0)} kg de ${c.material}`).join(", ")} en la bodega`;
  } else if (p === "aggressive") {
    const left = Math.max(0, expedition.safeDistanceM! - t.distanceToSurface);
    banner.textContent = left > 0 ? `¡${expedition.asteroid.data.name} está furioso! Huye: faltan ${left.toFixed(0)} m hasta la distancia segura` : "A salvo. Espera a que se calme";
  } else if (p === "landed") {
    banner.textContent = expedition.asteroid === bennu ? "Nave anclada · puedes salir a Bennu con el traje" : `Nave anclada en ${expedition.asteroid.data.name} · entra en su mente`;
  } else if (dockingText()) {
    banner.textContent = dockingText();
  } else {
    banner.textContent =
      t.clearance < 60
        ? t.tiltDeg > 30
          ? `Gira la panza hacia el suelo (${t.tiltDeg.toFixed(0)}°, máx. 30°): asistente de aterrizaje con G`
          : "Posa el tren a menos de 0,10 m/s para anclarte"
        : "";
  }
  banner.className = `banner ${p}${p === "flight" && dockingText() ? " docking" : ""}`;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  interior.resize();
  bay.resize();
  stationScreen.resize();
});

// --- Loop -------------------------------------------------------------------
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const cmd = interior.active || bay.active || evaMode.active || stationScreen.active || navMode.blocksInput || missionLog.visible ? NO_INPUT : mergeCommands(pilot.command(), touch.command());
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
  ring.tick(dt);
  // Region rules: soft boundary push back and no flying through the other rocks or the mothership (game rules).
  if (!flight.landed && !flight.docked) {
    const st = flight.state;
    flight.applyImpulse(region.boundaryPush(st.position, st.velocity, dt * warp).add(region.avoidObstacles(st.position, st.velocity, expedition.asteroid)).add(mothership.keepOut(st.position, st.velocity)));
  }
  for (const e of docking.drainEvents()) {
    if (e.type === "docked") flash("Acoplada: ganchos cerrados. Ya puedes ir al interior de la nodriza");
    if (e.type === "undocked") flash("Desacoplada: los muelles te separan a 0,08 m/s");
    if (e.type === "rebound") flash(`No engancha: ${e.failures.join(" · ")}${e.damage > 0 ? " · golpe en el casco" : ""}`, 7);
  }
  // Shield nodes absorb part of the jolt.
  if (expedition.phase === "aggressive" && lastPhase !== "aggressive") habitat.jolt(0.8 * (1 - fx.safety), `${expedition.asteroid.data.name}, furioso, sacudió la nave`);
  // The nano_net core site is Bennu for now (docs/design/nano-net.md).
  if (expedition.phase === "persuaded" && lastPhase !== "persuaded" && expedition.asteroid === bennu) nano.subjugate(bennuSite.id);
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
  const notices = missions.update((id) => expedition.isPersuaded(id));
  if (notices.length) {
    missionLog.notify(notices.map((n) => n.text).join("\n"), notices[0]!.kind);
    missionLog.render();
    navMode.map.refresh();
  }
  const missionsText = `Misiones${missionLog.unread ? `<b>•</b>` : ""}`;
  if (missionsBtn.innerHTML !== missionsText) missionsBtn.innerHTML = missionsText;
  // The station's machines run on the same clock as life on board.
  stationOps.station.tick(dt * warp * STATION_TUNING.hoursPerSecond);
  interior.update(dt);
  view.enabled = !interior.active && !bay.active && !duelView.visible && !evaMode.active && !stationScreen.active && !navMode.mapOpen && !missionLog.visible;
  navMode.canOpen = () => !interior.active && !bay.active && !duelView.visible && !evaMode.active && !stationScreen.active;
  navMode.update(dt, view.warpRequested);
  // The mothership moves on trips: keep its model where the domain has it.
  mothershipModel.root.position.set(mothership.position.x, mothership.position.y, mothership.position.z);
  mothershipModel.root.quaternion.set(mothership.orientation.x, mothership.orientation.y, mothership.orientation.z, mothership.orientation.w);
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
  if (stationScreen.active) {
    stationScreen.update(dt);
    renderer.render(stationScreen.scene, stationScreen.camera);
    return;
  }
  // The suit walk is modelled on Bennu's surface and gravity only.
  evaBtn.classList.toggle("hidden", !eva.canLeave || expedition.phase !== "landed" || expedition.asteroid !== bennu);
  if (evaMode.active) {
    view.rig.visible = false;
    evaMode.update(dt, flight.simTimeS);
    asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;
    renderer.render(scene, camera);
    return;
  }
  view.rig.visible = true;
  renderPhase();
  nanoPanel.update(flight.landed && expedition.asteroid === bennu, fx, !duelView.visible);
  nanoView.update(flight.simTimeS);
  landBtn.textContent = `Aterrizaje: ${flight.landingAssist ? "auto" : "manual"}`;
  landBtn.classList.toggle("on", flight.landingAssist);
  const dockText = docking.docked ? "Desacoplar" : `Acople: ${docking.assist ? "auto" : "manual"}`;
  if (dockBtn.textContent !== dockText) dockBtn.textContent = dockText;
  dockBtn.classList.toggle("on", docking.assist && !docking.docked);
  dockBtn.classList.toggle("hidden", !docking.docked && !docking.inRange());
  modeBtn.classList.toggle("off", !docking.docked && !interior.active);
  mothershipModel.update(dt, ring.omegaRadS, now / 1000);

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
  stationModel.update(flight.simTimeS);
  const stationText = `Estación · ${(stationOps.station.distanceTo(flight.state.position) / 1000).toFixed(1).replace(".", ",")} km`;
  if (stationBtn.textContent !== stationText) stationBtn.textContent = stationText;
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
(window as unknown as { codeship: unknown }).codeship = { flight, ship, expedition, habitat, interior, view, bay, nano, region, field, skyBodies, eva, evaMode, ring, mothership, docking, station: stationScreen, stationOps, nav, navMode, missions, missionLog };
