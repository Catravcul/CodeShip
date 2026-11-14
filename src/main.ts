import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { PROPELLANT_NAME } from "@modules/ship/data/propellants";
import type { Propellant } from "@modules/ship/domain/components";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { FlightComputer, NO_INPUT } from "@modules/flight/application/flight-computer";
import { Expedition } from "@modules/expedition/application/expedition";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import { asteroidSurfaceFn } from "./content/asteroid-shape";
import { TouchPilot, mergeCommands } from "./adapters/input/touch";
import { DuelView, setStepByStep, stepByStep } from "./ui/duel-view";
import { LANDING_MODE_LABEL, landingMode, setLandingMode, type LandingMode } from "./ui/landing-readout";
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
import { MaterialStock, STOCK_PRIORITY } from "@modules/station/domain/materials";
import { Hangar } from "@modules/station/domain/hangar";
import { STATION_TUNING } from "@modules/station/domain/blueprint";
import { StationOps } from "@modules/station/application/station-ops";
import { BLUEPRINTS } from "@modules/station/data/blueprints";
import { REFINE_PROCESSES } from "@modules/station/data/processes";
import { PROPELLANT_PROCESSES, PROPELLANT_RESERVE } from "@modules/station/data/propellant-processes";
import { COMET_PROCESSES } from "@modules/station/data/comet-processes";
import { RefuelOps, mothershipRefuelTarget, shipRefuelTarget } from "@modules/station/application/refuel";
import { materialName } from "@modules/station/data/materials";
import { EXPLORER_CRAFT, MOTHERSHIP_CRAFT, POLANA_STATION, STARTING_STOCK } from "@modules/station/data/station";
import { STORE_STOWAGE, storeKgOf } from "@modules/station/data/store";
import { storeCapacityKg } from "@modules/station/domain/outfit";
import { StationModel } from "./adapters/three/station-model";
import { StationScreen } from "./station-screen";
import { StationStructure } from "@modules/station/domain/structure";
import { StationDock, dockNavTargets } from "./station-dock";
import { StationInteriorMode } from "./station-interior";
import { StationInterior } from "@modules/station/domain/interior";
import { stationInteriorPlan } from "@modules/station/data/interior";
import { startingOutfit } from "@modules/station/data/outfit";
import { BioOps } from "@modules/station/application/bio-ops";
import { BIO_KCAL_PER_KG, BIO_OUTPUT_USE, BIO_PROCESSES, CREW_NEEDS, LARDER_UNITS, STATION_CREW } from "@modules/station/data/bio";
import { BIO_STARTING_STOCK } from "@modules/station/data/bio-materials";
import { partById } from "@modules/ship/data/parts";
import { Mothership } from "@modules/mothership/domain/mothership";
import { IDSS_CONTACT_LIMITS, NODRIZA, NODRIZA_NOSE_PORT, UNDOCK_PUSH_MS } from "@modules/mothership/data/mothership";
import { ASSIST_RANGE_M, Docking } from "@modules/mothership/application/docking";
import { MothershipModel } from "./adapters/three/mothership-model";
import { Navigator } from "@modules/navigation/application/navigator";
import { asteroidTarget, targetPosition, targetRadius, type NavTarget } from "@modules/navigation/domain/nav-target";
import { NavigationMode, PHASE } from "./navigation";
import { TRAVEL_TIME, frameClocks } from "@modules/navigation/domain/travel-time";
import { duration, num } from "@modules/navigation/application/trip-chore";
import { ProbeTravel } from "./probe-travel";
import { LandingProgram } from "@modules/navigation/application/landing-program";
import { LandingUi } from "./landing";
import { PlanOverlay } from "./adapters/three/plan-overlay";
import { tripSketch } from "@modules/navigation/application/plan-sketch";
import { PROBE_TRIP, ProbeTrip } from "@modules/navigation/application/probe-trip";
import { TripChip, type TripChipData } from "./ui/trip-chip";
import { TripPreview, type PreviewSubject } from "./adapters/three/trip-preview";
import { mothershipCarrier } from "@modules/navigation/application/mothership-carrier";
import { FlightDeck } from "./flight-deck";
import { MissionLog } from "@modules/missions/domain/mission";
import { MissionControl } from "@modules/missions/application/mission-control";
import { MISSION_LETTERS, NEVAEH_MISSIONS, SIDE_MISSION_CREDITS, STARTING_CREDITS } from "@modules/missions/data/nevaeh-missions";
import { MissionLogPanel } from "./ui/mission-log";
import { SubjugationUi, stageDuelText, stageResultText } from "./subjugation";
import { BENNU_SAMPLES } from "@modules/eva/data/samples";
import { WrathMode } from "./wrath-mode";
import { LevelsUi } from "./subjugation-levels";
import { Wallet } from "@modules/imports/domain/wallet";
import { ImportOps } from "@modules/imports/application/import-ops";
import { LAUNCHERS, TRANSFER_STAGE, GAME_HOURS_PER_TRANSIT_DAY } from "@modules/imports/data/launchers";
import { MASS_DRIVER, TUG } from "@modules/imports/data/craft";
import { IMPORT_BLUEPRINTS } from "@modules/imports/data/blueprints";
import { importGood } from "@modules/imports/data/goods";
import { orderLetter } from "@modules/imports/data/letters";
import { cargoMaterial } from "@modules/station/data/materials";
import "./ui/acciones.css";
import { LanderCabin } from "./lander-cabin";
import { BridgeRoom } from "./bridge";
import { settings } from "./ui/settings-store";
import { SettingsPanel } from "./ui/settings-panel";
import { TaskBoard } from "./ui/task-board";
import { JourneyDriver } from "./journey";
import { ICON } from "./ui/icons";
import { mindConsoleHtml, mindScreenLines } from "./ui/rapport-view";
import { setSound } from "./adapters/audio/alarm";
import { collectTasks, routeTo, type Task, type TaskPlace, type Vehicle } from "@modules/tasks/application/task-list";
import type { CabinActionId, CabinState } from "@modules/lander-cabin/domain/cabin";
import { needingAttention } from "@modules/ship-bay/application/bay";
import { TASK_TRAVELS } from "@modules/settings/domain/settings";
import { G } from "@core/units";

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
// The station is a structure in space with two IDSS ports: the probe docks at one, the mothership at the other.
// What it is built of grows (docs/design/estacion.md, «La estación crece»): modules, equipment, wings and radiators.
const stationOutfit = startingOutfit();
const structure = new StationStructure(POLANA_STATION, stationOutfit.layout);
const docking = new Docking(flight, [mothership, ...structure.ports], IDSS_CONTACT_LIMITS, UNDOCK_PUSH_MS.value);
docking.dockNow(mothership);
docking.drainEvents();
const expedition = new Expedition(flight, bennu, EXERCISES, 500);
// The space station: refinery, foundry, metal printer and hangar (docs/design/estacion.md).
const stationOps = new StationOps(
  // The store's capacity grows with the modules (HC-02 in docs/qa, data/store.ts).
  new Station(POLANA_STATION, new MaterialStock(STARTING_STOCK, { capacityKg: () => storeCapacityKg(stationOutfit.modules, STORE_STOWAGE), kgOf: storeKgOf }), new Hangar({}, [
    { ...MOTHERSHIP_CRAFT, name: mothership.spec.name, massKg: mothership.massKg },
    { ...EXPLORER_CRAFT, name: ship.name, massKg: ship.massKg },
  ]), stationOutfit),
  // The station's own import sources (tug, mass driver) sit in the same blueprint tree.
  [...BLUEPRINTS, ...IMPORT_BLUEPRINTS],
  [...REFINE_PROCESSES, ...COMET_PROCESSES, ...PROPELLANT_PROCESSES],
  materialName,
);
// Propellant production keeps its ammonia first: the fertiliser only uses what is above it (HC-04).
stationOps.station.stock.reserve("propelente", PROPELLANT_RESERVE, STOCK_PRIORITY.propelente);

// Navigation: any catalogued asteroid of the region can be the target (docs/design/navegacion.md),
// and the station and the mothership, where the trip ends docked (docs/design/estacion.md).
const carrier = mothershipCarrier(mothership, docking, { nosePort: NODRIZA_NOSE_PORT, limits: IDSS_CONTACT_LIMITS, ports: structure.ports });
const navTargets: NavTarget[] = [...region.asteroids.map(asteroidTarget), ...dockNavTargets(structure, mothership, carrier.clearanceM)];
// A getter: the station can move under its own engines (survival mode).
const stationKeepOut = {
  get centre() {
    return structure.position;
  },
  radiusM: structure.boundingRadiusM,
};
const nav = new Navigator(
  flight,
  {
    targets: navTargets,
    obstaclesFor: (t) => [...region.obstaclesExcept(t.kind === "asteroid" ? t.body : undefined), ...(t.id === structure.site.id ? [] : [stationKeepOut])],
    retarget: (t) => t.kind !== "asteroid" || expedition.retarget(t.body),
    isPersuaded: (t) => expedition.isPersuaded(t.id),
    // With the probe docked, the mothership flies the long part of a trip (and docks at the station).
    carrier,
    docking,
    // One compressed trip at a time; the mothership doesn't leave its probe behind (docs/design/viajes.md).
    busy: (carrierTrip) => navBusy(carrierTrip),
  },
  navTargets[0]!,
);

// Life on board: a long leg is already under way, so the garden has some days behind it.
const habitat = new Habitat(seededRandom(2026), 3, ship, "Doménica", MACHINES);
// Nevaeh writes to Doménica through the ship's radio (story rescued from the 2023 draft).
habitat.mailbox = new Mailbox(STORY);
// The nano_net: a persuaded Bennu can become a core (docs/design/nano-net.md).
// Nevaeh's main missions and the side missions (docs/design/misiones.md). Rewards go to the station.
// Nevaeh's credits: a first stipend, then what each mission pays (spent on imports).
const wallet = new Wallet(STARTING_CREDITS);
const missions = new MissionControl(
  new MissionLog(NEVAEH_MISSIONS, navTargets.map((t) => ({ id: t.id, name: t.name }))),
  habitat.mailbox,
  MISSION_LETTERS,
  (a) => stationOps.station.stock.add(a),
  (credits, why) => wallet.earn(credits, why),
  SIDE_MISSION_CREDITS,
);
// Imports (docs/design/importacion.md): orders to the Sanctuary paid in credits, the tug and the mass driver.
let orderLetters = 0;
const importOps = new ImportOps(stationOps.station, wallet, {
  regionAU: () => region.heliocentricAU().length(),
  bodies: () =>
    region.asteroids.map((a) => ({
      id: a.data.id,
      name: a.data.name,
      position: a.position,
      meanRadiusM: a.meanRadiusM,
      densityKgM3: a.data.densityKgM3.value,
      escapeSpeedMs: Math.sqrt((2 * G * a.massKg) / a.meanRadiusM),
      composition: a.data.composition,
      comet: a.data.kind === "cometa",
    })),
  toMaterial: cargoMaterial,
  launchers: LAUNCHERS,
  stage: { ispS: TRANSFER_STAGE.ispS.value, tankage: TRANSFER_STAGE.tankage.value },
  gameHoursPerTransitDay: GAME_HOURS_PER_TRANSIT_DAY,
  kgPerUnit: (id) => importGood(id)?.kgPerUnit ?? 1,
  tug: TUG,
  driver: MASS_DRIVER,
  onOrder: (q, goods, l) =>
    habitat.mailbox!.post(
      orderLetter(
        ++orderLetters,
        Object.entries(goods)
          .map(([id, n]) => `${importGood(id)?.kgPerUnit === 1 ? `${n} kg de` : `${n}`} ${materialName(id).toLowerCase()}`)
          .join(", "),
        q,
        l.name,
      ),
    ),
});
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
const stationModel = new StationModel(stationOutfit.layout, structure.orientation);
stationModel.root.position.set(POLANA_STATION.position.x, POLANA_STATION.position.y, POLANA_STATION.position.z);
scene.add(stationModel.root);

// The asteroids' wrath after a failed duel (docs/design/poderes-ira.md): attacks, survival mode, anger card.
const wrathMode = new WrathMode({
  root,
  scene,
  asteroids: region.asteroids,
  flight,
  ship,
  expedition,
  mothership,
  docking,
  structure,
  station: stationOps.station,
  placeStation: (p) => stationModel.root.position.set(p.x, p.y, p.z),
});

const reticle = document.createElement("div");
reticle.className = "reticle";
root.appendChild(reticle);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** «Hidracina (RCS)»: the propellant and which thrusters drink it. */
function propellantLabel(p: Propellant): string {
  const main = ship.mainEngines.some((e) => e.model.propellant === p);
  const rcs = ship.design.rcs.some((t) => t.model.propellant === p);
  return `${cap(PROPELLANT_NAME[p])} (${main && rcs ? "motor y RCS" : main ? "motor principal" : rcs ? "RCS" : "sin uso"})`;
}
const hud = new Hud(root, {
  ship: ship.name,
  get target() {
    return expedition.asteroid.data.name;
  },
  // A getter: a tank or thruster swap in the ship bay changes what is carried and what drinks it.
  get propellants() {
    return ship.propellants.map((p) => ({ label: propellantLabel(p), capacity: ship.propellantCapacityKg(p) }));
  },
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
// The lander's cockpit keeps only what its pilot needs (docs/design/accesos.md): landing and docking
// assists, sky labels, camera, time warp when it makes sense, the suit-up on Bennu and, docked, the
// hatch into the vehicle it is docked to. The map, the missions and the nano_net are on the travel
// ship; the bay, the blueprints and the fabrication at the station.
// Icons that sprout from the cockpit's root (docs/design/ux-acciones.md §Iconos). Undocking, the hatches,
// the suit and the asteroid's mind moved to machines in the lander's cabin (docs/design/habitaculo.md);
// the sky names to the general settings.
const landBtn = view.addButton("land-btn", () => (flight.landingAssist = !flight.landingAssist), { icon: ICON.land, label: "Aterrizaje: manual", key: "G" });
// Free near a port: the docking assist (like the landing assist). Docked, K still undocks on a keyboard.
const dockBtn = view.addButton("dock-btn", () => (docking.docked ? docking.undock() : docking.toggleAssist()), { icon: ICON.dock, label: "Acople: manual", key: "K" });
// Stand up from the pilot seat into the cabin.
const standBtn = view.addButton("stand-btn", () => standUp(), { icon: ICON.standUp, label: "Levantarse: habitáculo", key: "H", pinned: true });
settings.onChange((s) => {
  skyBodies.labelsOn = s.names;
  setSound(s.sound);
});
const navMode = new NavigationMode(root, nav, duelView, {
  title: `Mapa · ${region.data.name}`,
  boundaryRadiusM: region.data.boundaryRadiusM,
  rocks: region.rocks,
  shipPosition: () => flight.state.position,
  shipNose: () => flight.state.toWorld(new Vec3(0, 0, -1)),
  carrierPosition: () => mothership.position,
});
// The map only lives on the deck's navigation page: no overlay anywhere else.
navMode.canOpen = () => false;
// The mission log, on the travel ship: deck COMM page, the map and the radio. The map marks Nevaeh's targets.
const missionLog = new MissionLogPanel(root, missions, habitat.mailbox);
navMode.map.missionMark = (id) => missionLog.mark(id);
navMode.map.onMissions = () => missionLog.open();
missionLog.canOpen = () => deck.active || interior.active || bridge.active;
missionLog.onShowOnMap = (id) => {
  // From the radio on the ring or the bridge's radio console: to the bridge's navigation console.
  if (!deck.active && (interior.active || bridge.active)) {
    if (interior.active) interior.exit();
    if (missionLog.visible) missionLog.close();
    deck.enter(bridge.active ? "puente" : "interior", "nav");
  }
  if (deck.active) deck.showTarget(id);
};
const regionTag = document.createElement("div");
regionTag.className = "region-tag";
root.appendChild(regionTag);
const regionTitle = `${region.data.name} · ${region.heliocentricAU().length().toFixed(2).replace(".", ",")} UA del Sol`;
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyG" && !e.repeat && !interior.active) flight.landingAssist = !flight.landingAssist;
  if (e.code === "KeyK" && !e.repeat && view.enabled) dockBtn.click();
  if (e.code === "KeyH" && !e.repeat && view.enabled) standBtn.click();
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
// Walks outside on Bennu (EVA): only with the lander anchored.
const eva = new Eva(flight, bennu, (local) => surface(local), habitat.crew.body.massKg);
const evaMode = new EvaMode(root, scene, camera, eva, duelView);
// Back from the walk, she comes in through the EVA hatch of the cabin.
evaMode.onExit = () => cabin.enter("escotilla");

// The lander's hatch: docked, it leads into the vehicle it is docked to, and only there.
const atStationPort = () => structure.ports.some((p) => p === docking.dockedTo);
const hatchInto = (): "nave" | "estacion" | null => (docking.dockedTo === mothership ? "nave" : atStationPort() ? "estacion" : null);
/** Through the docking hatch in the cabin's roof, into the vehicle the lander is docked to. */
function throughHatch(): void {
  if (duelView.visible || evaMode.active || interior.active || stationInside.active || deck.active || bay.active || bridge.active) return;
  const to = hatchInto();
  if (!to) return;
  cabin.exit();
  if (to === "nave") interior.enter("escotilla");
  else stationInside.enter("sonda");
}
// The docking hatches at the end of the spine: down to the lander, or across to the station.
if (interior.zones)
  interior.zones.endHatches = () => [
    ...(docking.dockedTo === mothership
      ? [
          {
            label: "Bajar al módulo de aterrizaje",
            go: () => {
              interior.exit();
              cabin.enter("acople");
            },
          },
        ]
      : []),
    ...(mothership.dockedTo
      ? [
          {
            label: "Pasar a la estación",
            go: () => {
              interior.exit();
              stationInside.enter("nodriza");
            },
          },
        ]
      : []),
  ];
// The travel ship's flight deck: from the spine's side hatch or the ring's navigation console (docs/design/cabina-nodriza.md).
const deck = new FlightDeck(root, {
  mothership,
  ring,
  habitat,
  docking,
  nav,
  map: navMode.map,
  missions: missions.log,
  openMissions: () => missionLog.open(),
  probeRangeM: () => flight.state.position.sub(docking.current().port.position).length(),
  probe: () => ({
    name: ship.name,
    hullIntegrity: ship.hullIntegrity,
    propellants: ship.propellants.map((p) => ({ label: cap(PROPELLANT_NAME[p]), kg: ship.propellantKg(p), capacityKg: ship.propellantCapacityKg(p) })),
  }),
});
if (interior.zones)
  interior.zones.onFlightDeck = () => {
    interior.exit();
    bridge.enter("salida");
  };
interior.openNavConsole = () => {
  interior.exit();
  deck.enter("interior", "nav");
};
interior.openMissions = () => missionLog.open();
deck.onExit = (to, why) => {
  // From a bridge console, she is still standing at it (the bridge stays open under the page).
  if (to === "interior") interior.enter();
  else if (to === "cabina") view.setMode("cabina");
  if (why) (bridge.active ? bridge.say(why, 8) : flash(why, 8));
};
// M on the deck opens its navigation page; in the lander's cockpit it only says where the map is.
navMode.toggleOverride = () => deck.active && (deck.toggleNav(), true);
navMode.onBlocked = () => view.enabled && flash("El mapa está en el puente de la nave de viaje: acopla el módulo y entra", 5);
// nano_net: its status card opens from the deck; the core action stays in the lander, anchored on the core.
const nanoPanel = new NanoNetPanel(root, duelView, deck.nanoBtn, nano, bennuSite);
let lastPhase = expedition.phase;
// Subjugation in three stages: the uncrewed probe from the deck, the lander, the suit (docs/design/subyugacion.md).
const subj = new SubjugationUi({
  root,
  scene,
  expedition,
  region,
  mothership,
  deck,
  duelView,
  eva,
  evaMode,
  map: navMode.map,
  keyboard: () => pilot.command(),
  atStation: () => atStationPort() || (docking.dockedTo === mothership && !!mothership.dockedTo),
  wrath: wrathMode.wrath,
  // The EMU suit is about 145 kg (NASA); her body mass comes from the crew model.
  crewMassKg: habitat.crew.body.massKg + 145,
});
// Subjugation levels after the three stages (docs/design/subyugacion.md §«Niveles»): nano_net, packages to
// the travel ship and to the station, the final trip; and every asteroid's gravity drive (chase after a failed duel).
const levels = new LevelsUi({
  root,
  asteroids: region.asteroids,
  expedition,
  mothership,
  station: stationOps.station,
  inbox: importOps.inbox,
  storeRoomKg: () => stationOps.station.stock.roomKg - importOps.deliveries.pending.filter((d) => d.hoursLeft <= 1e-9).reduce((s, d) => s + stationOps.station.stock.massKg(d.goods), 0),
  stationPosition: () => structure.position,
  stationRadiusM: () => structure.boundingRadiusM,
  wrath: wrathMode.wrath,
  nano,
  anchoredOn: (id) => (flight.landed && expedition.asteroid.data.id === id) || subj.probe.parkedOn === id,
  secondsPerDay: 1 / NANO_DAYS_PER_SECOND,
  stationHoursPerSecond: STATION_TUNING.hoursPerSecond,
});
// A level-4 asteroid trip obeys the same travel cap as the ship and the probe (docs/design/viajes.md).
levels.travelTimeScale = (etaGameS) => Math.max(1, etaGameS / TRAVEL_TIME.capS);
subj.activityOf = (id) => levels.activity(id);
navMode.map.levelMark = (id) => levels.mark(id);

// The travel ship's bridge: a room of consoles, one machine per page (docs/design/habitaculo.md §Puente).
const probeMind = () => {
  const ex = expedition;
  const can = ex.canStartStage("sonda") || ex.canStartLevel("sonda");
  const label = ex.bond.subjugated && ex.bond.nextLevel ? `Convencer · nivel ${ex.bond.nextLevel}` : "Entrar en su mente por la sonda";
  const why = subj.probe.parkedOn ? ex.bond.levelBlock() || "Ahora su mente no escucha por la sonda" : "Aparca la sonda sobre el asteroide desde la consola de la sonda";
  return can ? { label, enabled: true } : { label, enabled: false, why };
};
const bridge = new BridgeRoom(
  root,
  {
    openPanel: (id) => deck.enter("puente", id),
    openMissions: () => missionLog.open(),
    openNano: () => deck.nanoBtn.click(),
    openProbe: () => subj.probeMode.enter(),
    mind: () => {
      const a = expedition.asteroid;
      const r = expedition.rapport.peek(a.data.id);
      const angry = expedition.phase === "aggressive";
      return { html: mindConsoleHtml(a.data.name, r, angry, levels.activity(a.data.id)), screen: mindScreenLines(a.data.name, r, angry), action: probeMind() };
    },
    startMind: () => {
      if (duelView.visible) return;
      if (expedition.canStartLevel("sonda")) subj.startLevelDuel("sonda");
      else subj.startDuel("sonda");
    },
    leave: () => {
      bridge.exit();
      interior.enter();
    },
    alerts: () => deck.alertsNow(),
    openTasks: () => taskBoard.open(),
  },
  mothership.name,
);
subj.onSay = (text) => (bridge.active ? bridge.say(text, 7) : flash(text, 7));

// Long trips of the probe: programmed with challenges, flown in time-lapse, parked by hand (docs/design/viajes.md).
const probeTravel = new ProbeTravel({
  probe: subj.probe,
  probeMode: subj.probeMode,
  expedition,
  region,
  mothership,
  duel: duelView,
  mothershipClearanceM: carrier.clearanceM,
  bayPose: () => subj.bayPose(),
  stepVisual: (g) =>
    planOverlay.visual(() => {
      const trip = probeTravel.trip;
      const h = trip.hop(g);
      const probe = subj.probe;
      const bay = subj.bayPose();
      const from = probe.status === "estibada" ? bay.position : probe.flight.state.position;
      const last = h.waypoints[h.waypoints.length - 1] ?? from;
      const up = mothership.orientation.rotate(Vec3.Y);
      const arrival =
        g.kind === "bay" ? bay.position.add(up.scale(PROBE_TRIP.bayHandoverM)) : g.body.position.sub(g.body.position.sub(last).normalize().scale(g.body.meanRadiusM + PROBE_TRIP.approachM));
      return tripSketch({ from, waypoints: h.waypoints, arrival, brakeM: h.plan.burnDistanceM, cruiseMS: h.plan.cruiseMS, deltaVMS: h.plan.deltaVMS, totalS: h.plan.totalS, targetName: ProbeTrip.goalName(g) });
    }),
  busy: () => (nav.status === "carrier" || nav.status === "autopilot" || nav.status === "docking" ? "La nave ya está de viaje: espera a que llegue" : landingBusy()),
});
function navBusy(carrierTrip: boolean): string | undefined {
  if (probeTravel.trip.active) return "La sonda está de viaje: espera a que llegue o toma su mando";
  if (landingBusy()) return landingBusy();
  if (carrierTrip && subj.probe.out) return "La sonda está fuera: recógela antes de mover la nodriza";
  return undefined;
}
// Each programming step answered right draws what it does (route, burn, arrival, braking point; site,
// drift, descent curve, flare, anchors) before the autopilot flies it.
const planOverlay = new PlanOverlay(scene, root);
navMode.stepVisual = () =>
  planOverlay.visual(() => {
    const t = nav.trip();
    const from = t.carrier?.from ?? flight.state.position;
    const way = [...(t.carrier ? [...t.carrier.path, t.carrier.parking] : []), ...t.waypoints];
    const last = way[way.length - 1] ?? from;
    const centre = targetPosition(nav.target);
    const arrival = t.dock ? t.dock.entry : centre.sub(centre.sub(last).normalize().scale(targetRadius(nav.target) + t.facts.approachM));
    return tripSketch({ from, waypoints: way, arrival, brakeM: t.plan.burnDistanceM, cruiseMS: t.plan.cruiseMS, deltaVMS: t.plan.deltaVMS, totalS: t.travel?.gameS ?? t.plan.totalS, targetName: nav.target.name });
  });
// Landing (docs/design/aterrizaje.md): by hand with the landing readout, or by program with a chain of
// challenges; the lander's and the probe's share the same use case. One compressed thing at a time.
const describeBody = (t: unknown) => {
  const a = region.asteroids.find((x) => x === t);
  return a ? { id: a.data.id, name: a.data.name } : undefined;
};
const tripsFlying = () => (nav.status === "carrier" || nav.status === "autopilot" || nav.status === "docking" ? "La nave ya está de viaje: espera a que llegue" : probeTravel.trip.active ? "La sonda está de viaje: espera a que llegue o toma su mando" : undefined);
const landerLanding = new LandingProgram({ craft: "modulo", flight: () => flight, describe: describeBody, busy: () => tripsFlying() ?? (probeLanding.active ? "La sonda está aterrizando con su programa" : undefined) });
const probeLanding = new LandingProgram({ craft: "sonda", flight: () => subj.probe.flight, describe: describeBody, busy: () => tripsFlying() ?? (landerLanding.active ? "El módulo está aterrizando con su programa" : undefined) });
function landingBusy(): string | undefined {
  return landerLanding.active || probeLanding.active ? "Un aterrizaje por programa está en marcha: espera a que se pose" : undefined;
}
const landerLandingUi = new LandingUi({
  program: landerLanding,
  host: root,
  kind: "lander",
  duel: duelView,
  active: () => view.enabled && !subj.piloting,
  camera: () => camera,
  say: (t) => flash(t, 7),
  targetName: () => expedition.asteroid.data.name,
  overlay: planOverlay,
});
const probeLandingUi = new LandingUi({
  program: probeLanding,
  host: root,
  kind: "probe",
  duel: duelView,
  active: () => subj.piloting,
  camera: () => subj.probeMode.camera,
  say: (t) => subj.probeMode.say(t, 7),
  overlay: planOverlay,
  targetName: () => describeBody(subj.probe.flight.target)?.name ?? expedition.asteroid.data.name,
});
// The trip chip and the live preview, on screen wherever she is while a vehicle flies itself.
const tripChip = new TripChip(root);
const tripPreview = new TripPreview(root);
tripChip.onView = () => (tripPreview.open = !tripPreview.open);
tripChip.onTake = () => (probeTravel.trip.active ? probeTravel.trip.cancel() : probeLanding.active ? probeLanding.cancel() : landerLanding.active ? landerLanding.cancel() : nav.cancel());
const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);
/** A wrath threat holds the trip at ×1 (HC-03): set each frame by the loop. */
let tripHeld = false;
const lapseText = (l: number) => (tripHeld && l > 1 ? " · ×1 por amenaza" : l > 1 ? ` · ×${num(l)}` : "");
/** What the chip shows and what the preview follows, for the trip flying now. */
function tripNow(): { chip: TripChipData; subject: PreviewSubject } | undefined {
  const pp = probeTravel.trip.progress();
  if (pp) {
    const f = () => subj.probe.flight;
    return {
      chip: { who: "Sonda", goal: pp.goalName, etaRealS: pp.etaRealS, fraction: pp.fraction, detail: `${PHASE[pp.phase]} · ${num(pp.speedMS, 1)} m/s · faltan ${km(pp.remainingM)} · ${duration(pp.etaS)} de vuelo${lapseText(pp.lapse)}` },
      subject: { label: "Sonda · en directo", sizeM: 1.2, pose: () => f().state, goal: () => (probeTravel.trip.goal?.kind === "asteroid" ? probeTravel.trip.goal.body.position : subj.bayPose().position) },
    };
  }
  const probeChip = probeLandingUi.chip("Sonda");
  if (probeChip) return { chip: probeChip, subject: { label: "Sonda · aterrizando", sizeM: 1.2, pose: () => subj.probe.flight.state, goal: () => probeLanding.siteWorld() ?? subj.probe.flight.state.position } };
  const landerChip = landerLandingUi.chip("Módulo");
  if (landerChip) return { chip: landerChip, subject: { label: "Módulo · aterrizando", sizeM: 14, pose: () => flight.state, goal: () => landerLanding.siteWorld() ?? flight.state.position } };
  const p = nav.progress();
  if (!p) return undefined;
  const carrierLeg = p.vehicle === "carrier";
  return {
    chip: { who: carrierLeg ? "Nodriza" : "Módulo", goal: nav.target.name, etaRealS: p.etaRealS, fraction: p.fraction, detail: `${PHASE[p.phase]} · ${num(p.speedMS, p.speedMS < 1 ? 2 : 1)} m/s · faltan ${km(p.remainingM)} · ${duration(p.etaS)} de vuelo${lapseText(p.lapse)}` },
    subject: carrierLeg
      ? { label: "Nodriza · en directo", sizeM: 170, pose: () => ({ position: mothership.position, orientation: mothership.orientation }), goal: () => targetPosition(nav.target) }
      : { label: "Módulo · en directo", sizeM: 14, pose: () => flight.state, goal: () => targetPosition(nav.target) },
  };
}

// Ship bay: only at the station (docs/design/accesos.md): its console in node 2, B inside, or the
// hangar tab of the station screen. Part swaps take the part from the station's hangar; the old one goes back there.
const bay = new ShipBay(root, ship, habitat, duelView, mothership.spec, stationOps.station.hangar);
// The mothership's systems are worked on while it is berthed at the station.
bay.docked = () => !!mothership.dockedTo;
// The mothership's thruster mounts are refitted in the bay's Nodriza tab (docs/design/nave-nodriza.md).
bay.nodriza = mothership;
bay.onDriveRefit = () => mothershipModel.setThrusters(mothership.fitted);
// The station's own wings, radiators and shield in the bay's «Estación» tab.
bay.setStation(stationOutfit, new StationModel(stationOutfit.layout));
// Refuelling (docs/design/estacion.md, «Repostar»): the lander at the station's port or on the mothership
// berthed there, and the mothership's xenon while she is berthed.
const mothershipAtStation = () => !!mothership.dockedTo;
const refuelOps = new RefuelOps(stationOps.station, [
  shipRefuelTarget(ship, EXPLORER_CRAFT.id, () => atStationPort() || (docking.dockedTo === mothership && mothershipAtStation())),
  mothershipRefuelTarget(mothership, mothershipAtStation),
]);
// Space station screen: its machines and the «Tareas» button inside the station open its tabs.
// The station's living machines (docs/design/autosustento.md): crop fields and the biology lab's reactors.
const bioOps = new BioOps(stationOutfit, stationOps.station.stock, BIO_PROCESSES, {
  needs: CREW_NEEDS,
  kcalPerKg: BIO_KCAL_PER_KG,
  uses: BIO_OUTPUT_USE,
  larderUnits: LARDER_UNITS,
  crew: () => STATION_CREW,
  eatersKcalPerDay: () => habitat.sustainability.kcalPerDay,
  resinImportedKg: BIO_STARTING_STOCK.resina,
  materialName,
});
const stationScreen = new StationScreen(
  root,
  stationOps,
  ship,
  expedition,
  duelView,
  () => flight.state.position,
  (id) => (id === MOTHERSHIP_CRAFT.id ? mothership.position : id === EXPLORER_CRAFT.id ? flight.state.position : undefined),
  refuelOps,
  importOps,
  bioOps,
  // Food from the crops goes to the mothership's larder while she is berthed here.
  () => (mothership.dockedTo ? habitat : undefined),
);
// Inside the station (docs/design/interiores.md §5): zero-g modules and the hangar; its machines open the screen's tabs.
const stationInside = new StationInteriorMode(root, new StationInterior(stationInteriorPlan(stationOutfit.layout, stationOutfit)), {
  busy: () => new Set(stationOps.station.queue().map((j) => j.machine)),
  store: () => ({ parts: stationOps.station.hangar.partList(), crafts: stationOps.station.hangar.crafts.filter((c) => c.docked) }),
  partName: (id) => (partById(id)?.name ?? id).replace(/^Aerojet Rocketdyne /, "").replace(/\s*\(.*\)$/, ""),
  openPanel: (tab) => {
    stationInside.suspend();
    screenFromInside = true;
    stationScreen.enter(tab);
  },
  openBay: () => {
    if (duelView.visible || bay.active) return;
    stationInside.suspend();
    bay.enter("estacion");
  },
  leave: (to) => {
    if (to === "nodriza" && !mothership.dockedTo) return "La nodriza no está atracada en este puerto";
    if (to === "sonda" && !atStationPort()) return "El módulo de aterrizaje no está en este puerto";
    stationInside.suspend();
    // Through the mothership's port she comes aboard at its spine hatch; otherwise back to the lander's cockpit.
    if (to === "nodriza") interior.enter("escotilla");
    else cabin.enter("acople");
  },
});
let stationGrownAt = stationOutfit.version;
/** The station grew: new modules in the structure (keep-out), the model outside and the rooms inside. */
const regrowStation = () => {
  stationGrownAt = stationOutfit.version;
  structure.setLayout(stationOutfit.layout);
  stationModel.rebuild(stationOutfit.layout);
  stationInside.rebuild(new StationInterior(stationInteriorPlan(stationOutfit.layout, stationOutfit)));
};
let screenFromInside = false;
let screenToBay = false;
stationScreen.onExit = () => {
  if (screenToBay) return;
  if (!screenFromInside) return view.center();
  screenFromInside = false;
  stationInside.resume();
};
stationScreen.onBay = () => {
  if (duelView.visible || bay.active) return;
  screenToBay = true;
  stationScreen.exit();
  screenToBay = false;
  bay.enter("pantalla");
};
const bayBack = (from: "pantalla" | "estacion") => (from === "pantalla" ? stationScreen.enter("hangar") : stationInside.resume());
bay.onExit = bayBack;
const stationDock = new StationDock((c, f) => view.addButton(c, f), {
  open: () => !duelView.visible && !bay.active && !interior.active && !evaMode.active && stationScreen.enter(),
  distanceM: () => stationOps.station.distanceTo(flight.state.position),
});

// --- The lander's cabin, the general settings and the task list (docs/design/habitaculo.md) --------
const settingsPanel = new SettingsPanel(root);
let settingsFrom: "cabina" | "nodriza" | null = null;
settingsPanel.onClose = () => {
  if (settingsFrom === "cabina") cabin.standUp();
  else interior.standUp();
  settingsFrom = null;
};
// The answer mode of order challenges, kept by duel-view.ts next to the challenge view.
settingsPanel.addRow({
  id: "ordenar",
  label: "Retos de ordenar",
  help: "«Ordenar todo y enviar» o «Paso a paso» (cada paso se comprueba al momento)",
  value: () => (stepByStep() ? "Paso a paso" : "Ordenar todo"),
  next: () => setStepByStep(!stepByStep()),
});
// How to land: ask each time, by hand or by program (landing-readout.ts keeps it).
const LANDING_MODES: readonly LandingMode[] = ["preguntar", "manual", "programa"];
settingsPanel.addRow({
  id: "aterrizaje",
  label: "Aterrizaje",
  help: "Al acercarte: preguntar cada vez, a mano con los indicadores o con un programa de retos",
  value: () => LANDING_MODE_LABEL[landingMode()],
  next: () => setLandingMode(LANDING_MODES[(LANDING_MODES.indexOf(landingMode()) + 1) % LANDING_MODES.length]!),
});
interior.openSettings = () => {
  settingsFrom = "nodriza";
  settingsPanel.open("Doménica en loto en la esterilla del rincón de ejercicio (nodriza)");
};
const fadeEl = document.createElement("div");
fadeEl.className = "cab-fade seat-fade";
root.appendChild(fadeEl);
/** A short fade between the seat and the cabin, so the cut does not jump on a phone. */
function fade(): void {
  fadeEl.classList.remove("go");
  void fadeEl.offsetWidth;
  fadeEl.classList.add("go");
}
/** Sit at the controls: the flight view with the camera of the settings. */
function sitDown(): void {
  cabin.exit();
  view.setMode(settings.value.camera);
  fade();
}
/** From the pilot seat into the cabin. */
function standUp(): void {
  if (duelView.visible || !view.enabled) return;
  cabin.enter("asiento");
}
const mindNow = (): { label: string; enabled: boolean; why?: string } | null => {
  if (!flight.landed) return null;
  const can = (expedition.canStartLevel("nave") || expedition.canStartDuel) && !nanoPanel.busy;
  const label = expedition.bond.subjugated && expedition.bond.nextLevel ? `Convencer · nivel ${expedition.bond.nextLevel}` : "Entrar en su mente";
  return can ? { label, enabled: true } : { label, enabled: false, why: subj.landedText() };
};
const cabinState = (): CabinState => ({
  dockedTo: docking.dockedTo === mothership ? "nodriza" : atStationPort() ? "estacion" : null,
  dockInRange: !docking.docked && docking.inRange(),
  dockAssist: docking.assist,
  landed: flight.landed,
  canLeaveEva: eva.canLeave && expedition.phase === "landed",
  mind: mindNow(),
});
const cabin = new LanderCabin(root, {
  state: cabinState,
  act: (id: CabinActionId) => {
    switch (id) {
      case "pilotar":
        return sitDown();
      case "desacoplar":
        docking.undock();
        return cabin.say("Desacoplada: los muelles te separan. Siéntate a pilotar en el asiento", 6);
      case "asistente-acople":
        docking.toggleAssist();
        return cabin.say(docking.assist ? "Asistente de acople: el módulo se acerca solo al puerto" : "Asistente de acople apagado", 5);
      case "entrar-nodriza":
      case "entrar-estacion":
        return throughHatch();
      case "salir-eva":
        // The suit-up challenge shows over the cabin; out on the surface, the cabin closes (loop).
        return evaMode.startSuitUp();
      case "mente":
        return enterMind();
      case "ajustes":
        cabin.sitLotus();
        settingsFrom = "cabina";
        return settingsPanel.open("Doménica en loto en la esterilla del habitáculo del módulo");
    }
  },
  mind: () => {
    const a = expedition.asteroid;
    const r = expedition.rapport.peek(a.data.id);
    const angry = expedition.phase === "aggressive";
    return { html: mindConsoleHtml(a.data.name, r, angry, levels.activity(a.data.id)), screen: mindScreenLines(a.data.name, r, angry) };
  },
  openTasks: () => taskBoard.open(),
});

/** Which vehicle she is in now, and which hatches are open between them. */
const crewIn = (): Vehicle => (interior.active || bridge.active || deck.active || subj.piloting ? "nodriza" : stationInside.active || stationScreen.active || bay.active ? "estacion" : "modulo");
const vehicleLinks = () => ({ moduloNodriza: docking.dockedTo === mothership, moduloEstacion: atStationPort(), nodrizaEstacion: !!mothership.dockedTo });
/** Every task of the game, from every module (docs/design/habitaculo.md §Tareas). */
function allTasks(): Task[] {
  const landedOn = flight.landed ? expedition.asteroid.data.id : null;
  const active = missions.log.active;
  return collectTasks({
    chores: interior.choreFacts(),
    asteroids: region.asteroids.map((a) => {
      const r = expedition.rapport.peek(a.data.id);
      return { id: a.data.id, name: a.data.name, persuaded: expedition.isPersuaded(a.data.id), next: r ? r.next : "sonda", subjugated: !!r?.subjugated, level: r?.level ?? 0, nextLevel: r?.nextLevel };
    }),
    expeditionTarget: expedition.asteroid.data.id,
    landedOn,
    probeParkedOn: subj.probe.parkedOn ?? null,
    mission: active ? { title: active.title, targetId: active.target.id, targetName: active.target.name } : null,
    nanoFaults: nano.net.faults().map((f) => {
      const core = nano.net.core(f.coreId)!;
      return { id: f.id, what: faultWhat(core, f), coreName: core.name };
    }),
    nanoActions: landedOn === bennuSite.id ? nano.actionsAt(bennuSite, true).map((c) => ({ id: c.id, title: c.title })) : [],
    fabricable: stationOps.plans().filter((p) => p.canBuild && !p.built).map((p) => ({ id: p.blueprint.id, name: p.blueprint.name })),
    refinable: stationOps.refining().filter((r) => r.canRun).map((r) => ({ id: r.process.id, name: r.process.name })),
    bioToTune: bioOps.status().filter((b) => b.installed && b.state === "desajustado").map((b) => ({ id: b.process.id, name: b.process.name })),
    credits: wallet.balance,
    refuel: ship.propellants.some((p) => ship.propellantKg(p) < 0.5 * ship.propellantCapacityKg(p)),
    repairs: needingAttention(bay.status()).map((c) => ({ id: c.id, name: c.name, critical: c.attention === "critico" })),
  });
}
const taskBoard = new TaskBoard(root, allTasks);
taskBoard.onGo = (t) => goToTask(t);
interior.openAllTasks = () => taskBoard.open();

/** Leave whatever screen she is on (without the modes' own way back), to arrive somewhere else. */
function leaveEverything(): void {
  if (cabin.active) cabin.exit();
  if (interior.active) interior.exit();
  if (deck.active) deck.exit();
  if (subj.piloting) subj.probeMode.exit();
  if (bridge.active) bridge.exit();
  if (missionLog.visible) missionLog.close();
  if (bay.active) {
    bay.onExit = () => undefined;
    bay.exit();
    bay.onExit = bayBack;
  }
  if (stationScreen.active) {
    screenToBay = true;
    stationScreen.exit();
    screenToBay = false;
  }
  if (stationInside.active) stationInside.suspend();
}
/** Arrive at a task's place: the machine, the console or the screen where it is done. */
function arriveAt(place: TaskPlace, t?: Task): void {
  // Already on the travel ship's ring or spine: she walks to the machine from where she is.
  if (place.vehicle === "nodriza" && place.spot === "anillo" && interior.active) {
    if (t?.chore) interior.doChore(t.chore);
    return;
  }
  leaveEverything();
  switch (place.vehicle) {
    case "modulo":
      if (place.spot === "asiento") return sitDown();
      return cabin.enter(place.spot);
    case "nodriza":
      if (place.spot === "anillo") {
        interior.enter();
        if (t?.chore) interior.doChore(t.chore);
        return;
      }
      // On the bridge, at the console of the task: it opens as she gets there.
      bridge.enter("salida");
      return useBridgeConsole(place);
    case "estacion":
      stationInside.enter(atStationPort() ? "sonda" : "nodriza");
      stationInside.suspend();
      if (place.spot === "bahia") return bay.enter("estacion");
      screenFromInside = true;
      return stationScreen.enter(place.tab);
  }
}
/** Walk to the bridge console of a task and use it (it opens as she gets there). */
function useBridgeConsole(place: Extract<TaskPlace, { spot: "puente" }>): void {
  if (place.page === "nav")
    return bridge.useConsole("nav", "abrir", () => {
      if (place.target) deck.showTarget(place.target);
    });
  if (place.page === "sonda") return bridge.useConsole("sonda");
  if (place.page === "mente") return bridge.goTo("mente");
  return bridge.useConsole("comms", "misiones");
}
// «Ir a una tarea» (docs/design/viaje-a-una-tarea.md): the whole real way (default) or teleport, at the yoga mat.
const journey = new JourneyDriver(root, {
  interior,
  cabin,
  bridge,
  station: stationInside,
  nav,
  ringRadiusM: ring.spec.floorRadiusM,
  stationTarget: structure.site.id,
  mothershipTarget: mothership.id,
  joins: () => ({ lander: docking.dockedTo === mothership ? "nodriza" : atStationPort() ? "estacion" : null, mothershipAtStation: !!mothership.dockedTo }),
  seated: () => view.enabled,
  sitDown,
  landerAccelMs2: () => ship.preview({ mainThrottle: 0, translation: new Vec3(0, 0, -1), rotation: Vec3.ZERO }).forceBody.length() / ship.massKg,
  settle: () => {
    if (missionLog.visible) missionLog.close();
    if (deck.active && bridge.active) deck.exit();
    if (stationScreen.active && screenFromInside) stationScreen.exit();
    if (bay.active) bay.exit();
  },
  finish: (place, t) => {
    if (place.vehicle === "nodriza") return place.spot === "anillo" ? void (t.chore && interior.doChore(t.chore)) : useBridgeConsole(place);
    if (place.vehicle === "modulo") return place.spot === "asiento" && !view.enabled ? sitDown() : undefined;
    stationInside.suspend();
    if (place.spot === "bahia") return bay.enter("estacion");
    screenFromInside = true;
    stationScreen.enter(place.tab);
  },
});
settingsPanel.addRow({
  id: "ir-a-tarea",
  label: "Ir a una tarea",
  help: "«Viaje»: va andando, en ascensor, saltando y volando por el camino real (con «Parar»); «Teletransporte»: aparece allí",
  value: () => (settings.value.taskTravel === "viaje" ? "Viaje" : "Teletransporte"),
  next: () => settings.set("taskTravel", TASK_TRAVELS[(TASK_TRAVELS.indexOf(settings.value.taskTravel) + 1) % TASK_TRAVELS.length]!),
});
/** The task list's «Ir»: the real journey there, or (teleport, a setting) straight there through open hatches, or to what joins the vehicles, saying why. */
function goToTask(t: Task): void {
  if (settings.value.taskTravel === "viaje") return void journey.start(t);
  fade();
  journey.say("Teletransporte (ajustes)");
  const r = routeTo(t.place, { crew: crewIn(), links: vehicleLinks() });
  if (r.kind === "ir") return arriveAt(t.place, t);
  arriveAt(r.via);
  if (cabin.active) cabin.say(r.why, 7);
  else if (bridge.active) bridge.say(r.why, 7);
  else flash(r.why, 7);
}

/** The asteroid's mind, from the cabin's console: the stage duel or the next level. */
function enterMind(): void {
  if (duelView.visible) return;
  if (expedition.canStartLevel("nave")) {
    subj.startLevelDuel("nave");
  } else if (expedition.canStartDuel) {
    expedition.startDuel("nave");
    duelView.show(duelSession(), stageDuelText(expedition.asteroid.data.name, "nave"), (answer) => {
      const events = expedition.answer(answer);
      return { ok: events.some((e) => e.type === "idea-accepted") };
    });
  }
}
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
  // During a mothership trip the autopilot strip says where it is going.
  if (nav.status === "carrier") return "";
  const on = docking.dockedTo;
  if (on) return `${on === mothership && mothership.dockedTo ? "Nodriza atracada en la estación" : `Módulo acoplado a ${on === mothership ? "la nodriza" : "la estación"}`} · levántate a la consola de acople${settings.key(" (H) · K desacopla")}`;
  // While the trip autopilot flies away from the port, the docking read-out is noise.
  // The autopilot strip already shows the automatic docking's progress.
  if (nav.status === "autopilot" || nav.status === "docking") return "";
  const port = docking.current();
  const a = docking.alignment(port);
  const range = flight.state.position.sub(port.port.position).length();
  if (range > 400) return "";
  const lim = IDSS_CONTACT_LIMITS;
  const ok = (good: boolean) => (good ? "✓" : "✗");
  return `Puerto de ${port === mothership ? "la nodriza" : "la estación"} a ${range < 10 ? n2(Math.max(0, a.axialM)) : range.toFixed(0)} m · cierre ${n2(a.closingMs)} m/s ${ok(a.closingMs >= lim.closingMinMs && a.closingMs <= lim.closingMaxMs)} · lateral ${n2(a.lateralM)} m ${ok(a.lateralM <= lim.lateralMisalignM)} · inclinación ${a.misalignDeg.toFixed(1).replace(".", ",")}° ${ok(a.misalignDeg <= lim.angularMisalignDeg)}${docking.assist ? " · asistente de acople" : settings.key(" · asistente: K")}`;
}

function renderPhase(): void {
  const p = expedition.phase;
  const t = flight.telemetry();
  if (p === "persuaded") {
    banner.textContent = stageResultText(expedition);
  } else if (p === "aggressive") {
    banner.textContent = wrathMode.bannerText() || `${expedition.asteroid.data.name} se calma`;
  } else if (p === "landed") {
    // The duel is at the mind console in the cabin (docs/design/habitaculo.md).
    banner.textContent = `${subj.landedText()}${expedition.canStartDuel || expedition.canStartLevel("nave") ? ` · levántate${settings.key(" (H)")} a la consola de la mente` : eva.canLeave && expedition.bond.next === "traje" ? ` · escotilla EVA del habitáculo` : ""}`;
  } else if (dockingText()) {
    banner.textContent = dockingText();
  } else {
    banner.textContent =
      t.clearance < 60
        ? t.tiltDeg > 30
          ? `Gira la panza hacia el suelo (${t.tiltDeg.toFixed(0)}°, máx. 30°): asistente de aterrizaje${settings.key(" con G")}`
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
  cabin.resize();
  bridge.resize();
  bay.resize();
  stationScreen.resize();
  stationInside.resize();
  deck.resize();
  subj.probeMode.resize();
});

// --- Loop -------------------------------------------------------------------
/** Draw the frame's view, then the live trip preview over a corner of it. */
function present(sc: THREE.Scene, cam: THREE.Camera): void {
  renderer.render(sc, cam);
  if (!tripPreview.visible) return;
  // The lander's model only follows the flight in the cockpit view: place it for the preview too.
  const st = flight.state;
  view.rig.position.set(st.position.x, st.position.y, st.position.z);
  view.rig.quaternion.set(st.orientation.x, st.orientation.y, st.orientation.z, st.orientation.w);
  tripPreview.render(renderer, scene);
}
let last = performance.now();
/**
 * Test hook, only in dev builds or with `?prueba` in the URL: the last frame's draw calls and
 * triangles for the player-experience suite (tools/experiencia, docs/testing.md).
 */
const frameStats = import.meta.env.DEV || new URLSearchParams(location.search).has("prueba") ? { calls: 0, triangles: 0, frames: 0 } : null;
if (frameStats) {
  renderer.info.autoReset = false;
  (window as unknown as { __codeshipFrame: typeof frameStats }).__codeshipFrame = frameStats;
}
let firstFrame = true;
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (firstFrame) {
    // Load time to the first interactive frame (read by the experience suite).
    firstFrame = false;
    performance.mark("codeship-primer-fotograma");
  }
  if (frameStats) {
    frameStats.calls = renderer.info.render.calls;
    frameStats.triangles = renderer.info.render.triangles;
    frameStats.frames++;
    renderer.info.reset();
  }
  const cmd = subj.piloting || cabin.active || bridge.active || interior.active || stationInside.active || deck.active || bay.active || evaMode.active || stationScreen.active || navMode.blocksInput || missionLog.visible ? NO_INPUT : mergeCommands(pilot.command(), touch.command());
  const flown = subj.piloting ? subj.probeMode.command() : cmd;
  const idle = flown.mainThrottle === 0 && flown.translation.length() === 0 && flown.rotation.length() === 0;
  // Time warp only on quiet cruise far from the surface, so landing stays real-time.
  const far = subj.pilotedDistanceM(flight.telemetry().distanceToSurface) >= WARP_MIN_DISTANCE_M;
  const warpAsk = subj.piloting ? subj.probeMode.warpRequested : view.warpRequested;
  const sp = flight.state.position;
  const fx = nano.net.effectsAt(sp);
  const asked = (expedition.phase === "flight" || expedition.phase === "persuaded" || (expedition.phase === "aggressive" && wrathMode.allowsWarp)) && (subj.piloting ? subj.probe.status === "en-vuelo" : !flight.landed) && idle && far ? warpAsk : 1;
  // A vehicle flying itself on a compressed trip sets the pace of the whole world (docs/design/viajes.md).
  const tripLapse = probeTravel.trip.active ? probeTravel.trip.lapse : probeLanding.active ? probeLanding.lapse : landerLanding.active ? landerLanding.lapse : nav.lapse;
  // Inside the nano_net its speed nodes let time run faster.
  // Every clock of the frame in one place, tested in src/qa/convivencia (docs/qa/entrelazamiento.md).
  // A wrath threat to the craft that travels (projectile, ram, chase) drops the trip to ×1 until it ends (HC-03).
  const tripCraft = probeTravel.trip.active || probeLanding.active ? "sonda" : nav.status === "carrier" ? "nodriza" : nav.status === "autopilot" || landerLanding.active ? "aterrizador" : undefined;
  const threat = tripLapse > 1 && !!tripCraft && wrathMode.wrath.threatened(tripCraft);
  const world = frameClocks(dt, tripLapse, asked > 1 ? Math.round(asked * fx.warpFactor) : 1, STATION_TUNING.hoursPerSecond, threat);
  const warp = world.warp;
  if (world.held && !tripHeld) flash("⚠ Amenaza: el viaje baja a ×1 hasta que pase. Esquiva o espera", 6);
  tripHeld = world.held;
  const warpNote = world.held
    ? `⚠ Amenaza: viaje a ×1 hasta que pase${wrathMode.bannerText() ? ` · ${wrathMode.bannerText()}` : ""}`
    : tripLapse > 1
      ? `viaje en cámara rápida ×${num(tripLapse)}`
      : warpAsk > 1 && warp === 1
        ? far
          ? "tiempo ×1 mientras maniobras"
          : "tiempo ×1 cerca del asteroide"
        : warp > 1
          ? `tiempo ×${warp}${fx.warpFactor > 1 ? " (nano_net)" : ""}`
          : "";
  expedition.update(dt * warp, cmd);
  subj.update(dt, warp, warpNote, { visible: view.enabled, landerPosition: flight.state.position });
  // Asteroids that move themselves (level 4 trip, chase after a failed duel), packages and the hold.
  levels.update(dt * warp, world.stationHours);
  asteroidMesh.position.set(bennu.position.x, bennu.position.y, bennu.position.z);
  probeTravel.update(dt, world.held);
  landerLandingUi.update();
  probeLandingUi.update();
  wrathMode.update(dt * warp, dt, subj.piloting ? subj.probeMode.camera : camera, view.enabled || deck.active || subj.piloting);
  ring.tick(dt);
  // Region rules: soft boundary push back and no flying through the other rocks or the mothership (game rules).
  if (!flight.landed && !flight.docked) {
    const st = flight.state;
    flight.applyImpulse(region.boundaryPush(st.position, st.velocity, dt * warp).add(region.avoidObstacles(st.position, st.velocity, expedition.asteroid)).add(mothership.keepOut(st.position, st.velocity)).add(structure.keepOut(st.position, st.velocity)));
  }
  for (const e of docking.drainEvents()) {
    if (e.type === "docked") flash(e.target === mothership ? "Acoplado: ganchos cerrados. Ya puedes entrar en la nave de viaje" : "Acoplado a la estación: ganchos cerrados. Ya puedes entrar en ella");
    // Leaving the deck at a trip's handover already said why.
    if (e.type === "undocked" && !(nav.status === "autopilot" && performance.now() < flashUntil)) flash("Desacoplada: los muelles te separan a 0,08 m/s");
    if (e.type === "rebound") flash(`No engancha: ${e.failures.join(" · ")}${e.damage > 0 ? " · golpe en el casco" : ""}`, 7);
  }
  // Shield nodes absorb part of the jolt.
  if (expedition.phase === "aggressive" && lastPhase !== "aggressive") habitat.jolt(0.8 * (1 - fx.safety), `${expedition.asteroid.data.name}, furioso, sacudió la nave`);
  // The nano_net core site is Bennu for now (docs/design/nano-net.md).
  // Only a subjugated asteroid (all three stages) can become a core (docs/design/subyugacion.md).
  // Level 1 of the subjugation makes it eligible as a core: wired in `levels` (subjugation-levels.ts).
  // Life on board keeps its pace (one day every 40 s), or the trip's if that is faster.
  // Life on board (and the nano_net's wear) runs with the manual warp too (HC-01).
  if (!nanoPanel.busy) nano.tick(world.lifeDays);
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
  // The station's machines, its biosystems and the import inbox run on the same clock as life on
  // board; on a compressed trip they follow the world step (never slower than the voyage).
  const stationHours = world.stationHours;
  stationOps.station.tick(stationHours);
  bioOps.tick(stationHours);
  importOps.tick(stationHours);
  for (const e of importOps.drainEvents()) {
    const text =
      e.type === "llegada"
        ? `Llega a la estación: ${e.delivery.label}`
        : e.type === "remolque"
          ? `El remolcador sale hacia ${e.bodyName}`
          : e.type === "lanzador"
            ? `Lanzador de masas montado en ${e.bodyName}`
            : e.type === "pedido"
              ? `Pedido al Santuario: ${e.credits.toLocaleString("es-ES")} créditos`
              : e.type === "almacen-lleno"
                ? `Almacén lleno: ${e.delivery.label} espera en el buzón`
                : "";
    if (!text) continue;
    stationScreen.notice(text);
    flash(text, 5);
  }
  // A module berthed or equipment installed: the structure, its model and the walkable interior follow.
  if (stationOutfit.version !== stationGrownAt) regrowStation();
  interior.update(dt, world.lifeDays);
  journey.update(dt);
  view.enabled = !cabin.active && !bridge.active && !interior.active && !stationInside.active && !deck.active && !bay.active && !duelView.visible && !evaMode.active && !stationScreen.active && !navMode.mapOpen && !missionLog.visible;
  navMode.update(dt, world.held);
  const trip = tripNow();
  tripChip.update(trip?.chip, tripPreview.visible);
  tripPreview.follow(trip?.subject);
  // The mothership moves on trips: keep its model where the domain has it.
  mothershipModel.root.position.set(mothership.position.x, mothership.position.y, mothership.position.z);
  mothershipModel.root.quaternion.set(mothership.orientation.x, mothership.orientation.y, mothership.orientation.z, mothership.orientation.w);
  document.body.classList.toggle("in-cockpit", view.enabled);
  if (interior.active) {
    present(interior.scene, interior.camera);
    return;
  }
  // Suited up at the EVA hatch: out on the surface, the cabin closes behind her.
  if (cabin.active && evaMode.active) cabin.exit();
  if (cabin.active) {
    cabin.update(dt);
    mothershipModel.update(dt, ring.omegaRadS, now / 1000);
    present(cabin.scene, cabin.camera);
    return;
  }
  if (stationInside.active) {
    stationInside.update(dt);
    present(stationInside.scene, stationInside.camera);
    return;
  }
  if (bay.active) {
    bay.update(dt);
    present(bay.scene, bay.camera);
    return;
  }
  if (subj.piloting) {
    asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;
    field.update(subj.probeMode.camera, window.innerHeight, flight.simTimeS, false);
    present(scene, subj.probeMode.camera);
    return;
  }
  if (deck.active) {
    deck.update(dt);
    nanoPanel.update(flight.landed && expedition.asteroid === bennu, fx, { action: false, card: !duelView.visible });
    asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;
    present(scene, deck.camera);
    return;
  }
  if (bridge.active) {
    bridge.update(dt);
    nanoPanel.update(flight.landed && expedition.asteroid === bennu, fx, { action: false, card: !duelView.visible });
    present(bridge.scene, bridge.camera);
    return;
  }
  if (stationScreen.active) {
    stationScreen.update(dt);
    present(stationScreen.scene, stationScreen.camera);
    return;
  }
  // The suit walk works on any asteroid of the region: its own gravity, spin and surface. Samples only on Bennu.
  if (eva.phase === "dentro" && eva.asteroid !== expedition.asteroid) eva.retarget(expedition.asteroid, expedition.asteroid === bennu ? BENNU_SAMPLES : []);
  if (evaMode.active) {
    view.rig.visible = false;
    evaMode.update(dt, flight.simTimeS);
    asteroidMesh.rotation.y = bennu.spinRadS * flight.simTimeS;
    // The other asteroids' meshes turn with them too (she may be walking on one).
    field.update(camera, window.innerHeight, flight.simTimeS, false);
    present(scene, camera);
    return;
  }
  view.rig.visible = true;
  renderPhase();
  nanoPanel.update(flight.landed && expedition.asteroid === bennu, fx, { action: !duelView.visible, card: false });
  nanoView.update(flight.simTimeS);
  view.menu.relabel(landBtn, `Aterrizaje: ${flight.landingAssist ? "auto" : "manual"}`, "G");
  landBtn.classList.toggle("on", flight.landingAssist);
  view.menu.relabel(dockBtn, `Acople: ${docking.assist ? "auto" : "manual"}`, "K");
  dockBtn.classList.toggle("on", docking.assist && !docking.docked);
  // Only free and near a port: undocking is at the cabin's docking console now.
  const dockHidden = docking.docked || !docking.inRange();
  // Landing assist only off a port; time warp only on free flight, far from the surface (or to switch it off).
  if (dockBtn.classList.contains("hidden") !== dockHidden || landBtn.classList.contains("hidden") !== docking.docked) {
    dockBtn.classList.toggle("hidden", dockHidden);
    landBtn.classList.toggle("hidden", docking.docked);
    view.menu.sync();
  }
  view.warpAvailable = !docking.docked && !flight.landed && (far || view.warpRequested > 1);
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
  stationModel.update(flight.simTimeS, skyBodies.sunDirection);
  stationDock.update();
  field.update(camera, window.innerHeight, flight.simTimeS, view.enabled && skyBodies.labelsOn);
  skyBodies.update(camera, renderer.getPixelRatio(), view.enabled);
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

  hud.render(flight.telemetry(), flight.rotationAssist, ship.propellants.map((p) => ship.propellantKg(p)), thrustText(cmd), missionLog.unread);
  present(scene, camera);
});

// Exposed for automated checks and debugging.
// --- Action layout (docs/design/ux-acciones.md) -----------------------------
// One place for what the moment asks for: the context column. In the cockpit it sits over the right
// thumb (above the MOVER pad on phones, bottom-right on desktop); from the bottom up it holds the
// primary action (enter, go outside, convince…), the message that explains it, the asteroid's trust
// chip, the trip chip and where you are. Secondary flight toggles live in the Mandos menu.
const ctxDock = document.createElement("div");
ctxDock.className = "ctx-dock";
root.appendChild(ctxDock);
ctxDock.append(banner, regionTag);
for (const sel of [".nano-action", ".trip-chip", ".land-offer.lander", ".land-box.probe"]) {
  const el = root.querySelector(sel);
  if (el) ctxDock.appendChild(el);
}

(window as unknown as { codeship: unknown }).codeship = { journey, cabin, bridge, settings, settingsPanel, taskBoard, tasks: allTasks, goToTask, flight, ship, expedition, habitat, interior, view, bay, nano, region, field, skyBodies, eva, evaMode, ring, mothership, docking, structure, station: stationScreen, stationInside, stationOps, refuelOps, importOps, bioOps, wallet, nav, navMode, missions, missionLog, deck, wrathMode, subj, probe: subj.probe, probeTravel, landerLanding, probeLanding, planOverlay, tripPreview, tripChip, duelView, levels };
