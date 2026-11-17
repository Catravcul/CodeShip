import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { Ship } from "@modules/ship/domain/ship";
import { lunarModuleDesign } from "@modules/ship/data/apollo-lm";
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
import { lmReading } from "./adapters/three/lm-instruments";
import { buildStarfield } from "./adapters/three/starfield";
import { KeyboardPilot } from "./adapters/input/keyboard";
import { Hud } from "./ui/hud";
import { Habitat } from "@modules/habitat/application/habitat";
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
import { ISS_FOOD, ISS_LAUNCH_STOCK } from "@modules/kitchen/data/iss-food";
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
import { VehicleYard } from "@modules/station/application/vehicle-yard";
import { ComponentImports } from "@modules/imports/application/component-imports";
import { CARRIERS, SUPPLY_ITEMS, supplyItem } from "@modules/station/data/component-supply";
import { catalogueMassOf, VEHICLE_CATALOGUE } from "@modules/station/data/vehicle-catalogue";
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
import { DryDockStage } from "./dry-dock";
import { POLANA_DRY_DOCK } from "@modules/station/data/dry-dock";
import { StationScreen } from "./station-screen";
import { StationStructure } from "@modules/station/domain/structure";
import { StationDock, dockNavTargets } from "./station-dock";
import { StationInteriorMode } from "./station-interior";
import { StationOutside } from "./station-outside";
import { CargoAirlock } from "@modules/station/domain/cargo-airlock";
import { ASSEMBLY_LIMITS, BISHOP, BISHOP_PAYLOADS } from "@modules/station/data/iss";
import { LANDER_CBM } from "@modules/station/data/structure";
import { offeredBlueprints } from "@modules/station/data/outfit";
import { facing } from "@modules/navigation/domain/attitude";
import { StationLife } from "./station-life";
import { stationStepVisuals } from "./station-steps";
import { areaVisuals as SUIT_UP_VISUALS } from "@modules/chores/application/step-visuals";
import { LifeSupportGame } from "./life-support-game";
import { STATION_LIFE_SUPPORT } from "@modules/life-support/data/hosts";
import { STATION_AREA_NAME, StationCrew, type Pantry } from "@modules/station/application/station-crew";
import { STATION_LARDER, TRIP_STORES_SHARE } from "@modules/station/data/galley";
import { LanderBerth } from "@modules/station/domain/hangar-berth";
import { scaleInteriorPlan } from "@modules/station/domain/interior";
import { MACHINE_SCALE } from "@core/machine-scale";
import { SPREAD_ON } from "@core/spacing";
import { stationPlayScale } from "@modules/station/data/presentation";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { WORKOUTS } from "@modules/wellness/data/exercise";
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
import { BOARD_DAYS_PER_REAL_S } from "@core/board-time";
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
import { wireRobotics } from "./robotics-wiring";
import { LanderEcs } from "./lander-ecs";
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
import { G } from "@core/units";
import { FICTION, REAL_ONLY, fiction } from "@core/realism";
import { STARSHIP, STARSHIP_LIFE_SUPPORT, STARSHIP_NOSE_PORT } from "@modules/mothership/data/starship";
import { StarshipModel } from "./adapters/three/starship-model";
import { StarshipInterior } from "./starship-interior";
import { wireSanctuaryLife } from "./sanctuary-life";

// --- Domain setup -----------------------------------------------------------
const d = BENNU.dimensionsM.value;
// One set of shape parameters drives both the render mesh and the surface the ship lands on.
const shapeParams = { seed: 101955, size: { x: d.x, y: d.y, z: d.z }, detail: 6, ridge: 0.09, roughness: 0.06, craters: 60 };
const surface = asteroidSurfaceFn(shapeParams);
const bennu = new Asteroid(BENNU, Vec3.ZERO, (local) => surface(local));
const ship = Ship.create(lunarModuleDesign());
const startPos = new Vec3(250, 120, 1600);
// The starting region: Bennu among real New Polana–family asteroids, inside a soft boundary.
const region = buildStartRegion(bennu, startPos, [{ centre: POLANA_STATION.position, radiusM: POLANA_STATION.radiusM * 3 }]);
// Face the asteroid from the start position.
const startAttitude = Quat.fromAxisAngle(Vec3.Y, Math.atan2(250, 1600)).multiply(Quat.fromAxisAngle(Vec3.X, -Math.atan2(120, 1620)));
const start = RigidBodyState.at(startPos).withOrientation(startAttitude);
// The mothership is parked near Bennu with the probe docked under it: a Starship (docs/design/nodriza-starship.md),
// or with ?ficcion the ring ship of docs/design/nave-nodriza.md, its rings turning at cruise rate (gravedad.md).
const mothership = Mothership.withProbeDockedAt(REAL_ONLY ? STARSHIP : NODRIZA, startPos, startAttitude, ship.design.dockingPort!);
const ring = fiction(() => new SpinRing(NODRIZA.ring));
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
  offeredBlueprints([...BLUEPRINTS, ...IMPORT_BLUEPRINTS], FICTION),
  [...REFINE_PROCESSES, ...COMET_PROCESSES, ...PROPELLANT_PROCESSES],
  materialName,
);
// Propellant production keeps its ammonia first: the fertiliser only uses what is above it (HC-04).
stationOps.station.stock.reserve("propelente", PROPELLANT_RESERVE, STOCK_PRIORITY.propelente);

// Navigation: any catalogued asteroid of the region can be the target (docs/design/navegacion.md),
// and the station and the mothership, where the trip ends docked (docs/design/estacion.md).
const carrier = mothershipCarrier(mothership, docking, { nosePort: REAL_ONLY ? STARSHIP_NOSE_PORT : NODRIZA_NOSE_PORT, limits: IDSS_CONTACT_LIMITS, ports: structure.ports });
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
// Real only (src/core/realism.ts): no farm machines, plants, animals or farm deck aboard (docs/pendientes.md).
const habitat = new Habitat(seededRandom(2026), 3, ship, "Doménica", REAL_ONLY ? [] : MACHINES);
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
/** The nano_net wears on the same clock as life on board (src/core/board-time.ts). */
const NANO_DAYS_PER_SECOND = BOARD_DAYS_PER_REAL_S;
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
if (!REAL_ONLY) for (const [id, sp, days] of garden) growFor(habitat.plant(id, sp), days);
// Stores the ship left with: potatoes, peanuts, flour, eggs, meat, animal food and culture medium;
// real only, ISS-type packaged food (kitchen/data/iss-food.ts).
habitat.stockAll(REAL_ONLY ? ISS_LAUNCH_STOCK : LAUNCH_STOCK);
// No animals at the start (Berón, 2026-11-16): Doménica is alone and adopts them from the species catalogue
// (sanctuary-life.ts, docs/design/catalogo-especies.md). There are no saved games to keep them for (CV-16).
if (!REAL_ONLY) {
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
}

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
// The dry dock for the mothership (docs/design/dique-seco.md): an open cradle in front of node 2.
const dryDock = new DryDockStage(root, scene, stationModel.root, POLANA_DRY_DOCK, {
  shipName: "La nodriza",
  berthed: () => !!mothership.dockedTo,
  approaching: () => nav.status === "carrier" && nav.target.id === structure.site.id,
});
// The dry dock is backlog: the ISS's real precedent is the Shuttle docking straight to the forward IDA (docs/pendientes.md).
dryDock.model.root.visible = FICTION;

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
const mothershipModel = REAL_ONLY ? new StarshipModel(mothership.spec) : new MothershipModel(mothership.spec);
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
const standBtn = view.addButton("stand-btn", () => standUp(), { icon: ICON.standUp, label: "Dejar el puesto: habitáculo", key: "H", pinned: true });
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
  // From Starship's decks (the work laptops): up to the flight deck's navigation table the real way (docs/design/reglas.md §3).
  if (starship?.active) {
    missionLog.close();
    return goToTask({ id: `mapa:${id}`, group: "misiones", title: "Ver en el mapa", detail: "", place: { vehicle: "nodriza", spot: "puente", page: "nav", target: id } });
  }
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
// Starship's three 0 g decks (real-only), or the ring ship's spine and ring (?ficcion); the same calls drive both.
const starship = REAL_ONLY
  ? new StarshipInterior(root, {
      habitat,
      duel: duelView,
      openTasks: () => taskBoard.open(),
      openFlightDeck: () => {
        starship?.exit();
        bridge.enter("salida");
      },
      leave: (to) => (to === "sonda" ? cabin.enter("acople") : stationInside.enter("nodriza")),
      cannotLeave: (to) =>
        to === "sonda"
          ? docking.dockedTo === mothership
            ? undefined
            : "Cerrada: el módulo de aterrizaje no está acoplado a la Starship"
          : mothership.dockedTo
            ? undefined
            : "Cerrada: la Starship no está atracada en la estación",
    })
  : undefined;
const interior = starship ? (starship as unknown as Interior) : new Interior(root, habitat, duelView, ring!);
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
  // She opens the roof hatch and goes up through it (docs/design/reglas.md §3.1).
  cabin.passHatch("acople", () => {
    cabin.exit();
    if (to === "nave") interior.enter("escotilla");
    else stationInside.enter("sonda");
  });
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
// The step line belongs to the challenge: it lives in its sheet (ux-acciones.md §7, no exceptions).
duelView.hold(planOverlay.captionElement);
// Over the ring's navigation console the map covers the scene: the map shows the plan instead (fitted above the sheet).
navMode.map.plan = () => planOverlay.sketch;
planOverlay.onChange = () => navMode.map.planChanged();
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
  frameSheet: (s) => view.landingSheet(s),
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
  frameSheet: (s) => subj.probeMode.landingSheet(s, () => probeLanding.siteWorld()),
  gravityMs2: () => region.asteroids.reduce((g, a) => g.add(a.gravityAt(subj.probe.flight.state.position)), Vec3.ZERO).length(),
});
// The trip chip and the live preview, on screen wherever she is while a vehicle flies itself.
const tripChip = new TripChip(root);
const tripPreview = new TripPreview(root);
/** «Ver trayecto» (trip chip and journey bar): the flying vehicle on its drawn path, the camera following it. */
const togglePath = () => (tripPreview.open = !tripPreview.open);
tripChip.onView = togglePath;
tripChip.onTake = () => (probeTravel.trip.active ? probeTravel.trip.cancel() : probeLanding.active ? probeLanding.cancel() : landerLanding.active ? landerLanding.cancel() : nav.cancel());
const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);
/** A wrath threat holds the trip at ×1 (HC-03): set each frame by the loop. */
let tripHeld = false;
const lapseText = (l: number) => (tripHeld && l > 1 ? " · ×1 por amenaza" : l > 1 ? ` · ×${num(l)}` : "");
/** The planned path of the trip flying now, kept from its first frame (`key` names the trip). */
let routeOf: { key: string; points: readonly Vec3[] } = { key: "", points: [] };
const keptRoute = (key: string, plan: () => readonly Vec3[]) => () => {
  if (routeOf.key !== key) routeOf = { key, points: plan() };
  return routeOf.points;
};
/** What the chip shows and what the preview follows, for the trip flying now. */
function tripNow(): { chip: TripChipData; subject: PreviewSubject } | undefined {
  const pp = probeTravel.trip.progress();
  if (pp) {
    const f = () => subj.probe.flight;
    const g = probeTravel.trip.goal;
    const goal = () => (g?.kind === "asteroid" ? g.body.position : subj.bayPose().position);
    const route = keptRoute(`sonda:${pp.goalName}`, () => {
      const h = g && probeTravel.trip.hop(g);
      const from = f().state.position;
      const end = g?.kind === "asteroid" ? g.body.position.sub(g.body.position.sub(h?.waypoints.at(-1) ?? from).normalize().scale(g.body.meanRadiusM + PROBE_TRIP.approachM)) : subj.bayPose().position;
      return [from, ...(h?.waypoints ?? []), end];
    });
    return {
      chip: { who: "Sonda", goal: pp.goalName, etaRealS: pp.etaRealS, fraction: pp.fraction, detail: `${PHASE[pp.phase]} · ${num(pp.speedMS, 1)} m/s · faltan ${km(pp.remainingM)} · ${duration(pp.etaS)} de vuelo${lapseText(pp.lapse)}` },
      subject: { label: "Sonda · trayecto", sizeM: 1.2, pose: () => f().state, goal, route },
    };
  }
  const probeChip = probeLandingUi.chip("Sonda");
  if (probeChip) return { chip: probeChip, subject: { label: "Sonda · aterrizando", sizeM: 1.2, pose: () => subj.probe.flight.state, goal: () => probeLanding.siteWorld() ?? subj.probe.flight.state.position, route: keptRoute("sonda:aterrizaje", () => [subj.probe.flight.state.position, probeLanding.siteWorld() ?? subj.probe.flight.state.position]) } };
  const landerChip = landerLandingUi.chip("Módulo");
  if (landerChip) return { chip: landerChip, subject: { label: "Módulo · aterrizando", sizeM: 14, pose: () => flight.state, goal: () => landerLanding.siteWorld() ?? flight.state.position, route: keptRoute("modulo:aterrizaje", () => [flight.state.position, landerLanding.siteWorld() ?? flight.state.position]) } };
  const p = nav.progress();
  if (!p) return undefined;
  const carrierLeg = p.vehicle === "carrier";
  return {
    chip: { who: carrierLeg ? "Nodriza" : "Módulo", goal: nav.target.name, etaRealS: p.etaRealS, fraction: p.fraction, detail: `${PHASE[p.phase]} · ${num(p.speedMS, p.speedMS < 1 ? 2 : 1)} m/s · faltan ${km(p.remainingM)} · ${duration(p.etaS)} de vuelo${lapseText(p.lapse)}` },
    subject: carrierLeg
      ? { label: "Nodriza · trayecto", sizeM: mothership.spec.layout.lengthM, pose: () => ({ position: mothership.position, orientation: mothership.orientation }), goal: () => targetPosition(nav.target), route: () => nav.route }
      : { label: "Módulo · trayecto", sizeM: 14, pose: () => flight.state, goal: () => targetPosition(nav.target), route: () => nav.route },
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
  // Food from the crops goes to the station's own larder (its galley); trip stores go aboard from the galley.
  () => stationCrew.habitat,
);
// Doménica's life at the station (docs/design/estacion-tripulacion.md): the same chores engine, the station's larder, her one body.
const stationHabitat = new Habitat(seededRandom(2027), 0, undefined, habitat.crew.name, [], habitat.crew);
stationHabitat.stockAll(STATION_LARDER);
// Real ships: the galley cooks the ISS's packaged food from the life support's pantry (docs/design/soporte-vital.md, «Despensa»).
let stationPantry: Pantry | undefined;
const stationCrew = new StationCrew(stationHabitat, { recipes: REAL_ONLY ? ISS_FOOD : RECIPES, yoga: YOGA_SEQUENCES, workouts: WORKOUTS, pantry: () => stationPantry });
/** The lander on its IDA or berthed by Canadarm2 on Unity's nadir CBM (docs/design/estacion-real.md). */
const landerBerth = new LanderBerth();
const landerOnCbm = () => {
  if (!atStationPort()) landerBerth.reset();
  return landerBerth.onCbm;
};
/** The Bishop cargo airlock on Tranquility, with Juventas and two cubesats in the stowage. */
const bishopAirlock = new CargoAirlock(BISHOP_PAYLOADS, BISHOP.volumeM3);
/** The lander's pose on its IDA or on the CBM, in the station's frame (same rule as a docked craft). */
const landerPose = (at: "ida" | "cbm") => {
  const spec = at === "ida" ? structure.portFor("sonda")!.spec : { ...LANDER_CBM, forward: new Vec3(0, 0, -1) };
  const o = facing(spec.forward, spec.normal.scale(-1));
  return { position: spec.position.sub(o.rotate(ship.design.dockingPort ?? Vec3.ZERO)), orientation: o };
};
// The view out of the Cupola: the station, Canadarm2 and its moves in 3D.
const stationOutside = new StationOutside(root, scene, stationModel.root, () => stationModel.modules, {
  landerPose,
  design: () => ship.design,
  berthed: landerOnCbm,
  waiting: () => stationScreen.yard?.parked() ?? [],
});
const stationLife = new StationLife({
  crew: stationCrew,
  berth: landerBerth,
  bishop: bishopAirlock,
  duel: duelView,
  atPort: atStationPort,
  landerMassKg: () => ship.massKg,
  mothershipLarder: () => (mothership.dockedTo ? habitat : undefined),
  openTasks: () => taskBoard.open(),
  sleepIn: (f, then) => stationInside.sleep(f, undefined, then),
  openInventory: () => {
    stationInside.suspend();
    screenFromInside = true;
    stationScreen.enter("hangar");
  },
  openSettings: () => {
    settingsFrom = "estacion";
    stationInside.sitLotus(true);
    settingsPanel.open("Doménica en loto en la esterilla de Destiny (estación)");
  },
  say: (t, sec) => stationInside.say(t, sec),
  lookOutside: (show) => stationOutside.open(show),
  openCatalog: () => sanctuary.catalog.open(),
  stepVisual: (chore, area) => stationSteps.crew(chore, area),
  otherChore: (id) => lifeSupport.startChore(id) || arm.startChore(id),
  ...(REAL_ONLY
    ? {
        cargoActions: () => lifeSupport.cargoActions(),
        cargoAct: (id: string) => lifeSupport.cargoAct(id),
        sendTripFood: () => {
          const ship = starship?.lifeSupport;
          if (!ship) return undefined;
          const kg = lifeSupport.system.takeFood(lifeSupport.system.readout().foodKg * TRIP_STORES_SHARE);
          ship.system.restock({ foodKg: kg });
          return kg > 0 ? `A la despensa de la nodriza: ${Math.round(kg).toLocaleString("es-ES")} kg de comida envasada (${Math.floor(ship.system.readout().foodDays)} días a bordo)` : "La despensa de la estación está vacía";
        },
      }
    : {}),
});
// Real life support (docs/design/soporte-vital.md): the station hosts the racks for now; Doménica weighs 58 kg.
const lifeSupport = new LifeSupportGame({ duel: duelView, say: (t, sec) => stationInside.say(t, sec), rack: (id) => stationInside.rack(id), frame: (at) => stationInside.frame(at), unframe: () => stationInside.unframe(), act: (id, acts) => stationInside.stepVisual(id, acts), openTasks: () => taskBoard.open(), crewAboard: () => (crewIn() === "estacion" ? 1 : 0) }, STATION_LIFE_SUPPORT, 58);
if (REAL_ONLY) stationPantry = lifeSupport.pantry;
// The Starship's own racks and supplies (docs/design/nodriza-starship.md), on the same clock. Each vehicle
// counts only the crew aboard it: Doménica is in one of them at a time, or in the lander (crewIn).
if (starship) starship.lifeSupport = new LifeSupportGame({ duel: duelView, say: (t, sec) => starship.say(t, sec ?? 4), rack: (id) => starship.mode.rack(id), frame: (at) => starship.mode.frame(at), unframe: () => starship.mode.unframe(), act: (id, acts) => starship.mode.stepVisual(id, acts), openTasks: () => taskBoard.open(), crewAboard: () => (crewIn() === "nodriza" ? 1 : 0) }, STARSHIP_LIFE_SUPPORT, 58);
/** The station's interior as it is drawn and walked: its real size at the presentation layer's scale (and spread). */
const playInterior = () => {
  const plan = stationInteriorPlan(stationOutfit.layout, stationOutfit);
  return new StationInterior(scaleInteriorPlan(plan, stationPlayScale(plan, MACHINE_SCALE, SPREAD_ON)));
};
// Inside the station (docs/design/interiores.md §5): zero-g modules and the hangar; its machines open the screen's tabs.
const stationInside = new StationInteriorMode(root, playInterior(), {
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
  cannotLeave: (to) =>
    to === "nodriza"
      ? mothership.dockedTo
        ? undefined
        : "Cerrada: la nodriza no está atracada en este puerto"
      : !atStationPort()
        ? "Cerrada: el módulo de aterrizaje no está en este puerto"
        : landerOnCbm()
          ? "Cerrada: el módulo está atracado en el CBM de Unity. Devuélvelo a su IDA desde la Cupola"
          : undefined,
  openTasks: () => taskBoard.open(),
  actions: (f) => (f.action.kind === "soporte-vital" ? lifeSupport.actions(f) : [...arm.robotics.actions(f), ...stationLife.actions(f)]),
  act: (f, a) => (f.action.kind === "soporte-vital" ? lifeSupport.act(f, a) : arm.robotics.act(f, a) || stationLife.act(f, a)),
  // Quest's suits and EVA hatch: the real spacewalk (station-eva.ts).
  airlock: { actions: (f) => arm.stationEva.actions(f), act: (f, a) => arm.stationEva.act(f, a) },
  readout: (f) => (REAL_ONLY || f.id !== "cocina" ? lifeSupport.readout(f) : undefined),
  rackState: (f) => lifeSupport.rackState(f),
  landerInHangar: () => false,
  lookOut: () => (FICTION ? dryDock.open("ventanilla") : stationOutside.open()),
  leave: (to) => {
    if (to === "nodriza" && !mothership.dockedTo) return "La nodriza no está atracada en este puerto";
    if (to === "sonda" && !atStationPort()) return "El módulo de aterrizaje no está en este puerto";
    stationInside.suspend();
    // Through the mothership's port she comes aboard at its spine hatch; otherwise back to the lander's cockpit.
    if (to === "nodriza") (starship ? starship.enterFromStation() : interior.enter("escotilla"));
    else cabin.enter("acople");
  },
});
// Station chores acted out by Doménica at their fixture (the galley, the machines): PX-20.
const stationSteps = stationStepVisuals(stationInside, () => screenFromInside || stationInside.active);
// Canadarm2 and Dextre from the Cupola, and spacewalks from Quest (docs/design/brazo-robotico.md, paseo-espacial.md).
const arm = wireRobotics({ root, scene, stationRoot: stationModel.root, duel: duelView, inside: stationInside, outside: stationOutside, cargo: lifeSupport.cargo, berth: landerBerth, bishop: bishopAirlock, atPort: atStationPort, landerMassKg: () => ship.massKg, outfit: stationOutfit, hangar: stationOps.station.hangar, say: (t, sec) => stationInside.say(t, sec) });
bay.planExterior = (o) => arm.planExterior(o);
stationScreen.stepVisual = (session, mode) => stationSteps.machine(session, mode);
let stationGrownAt = stationOutfit.version;
/** The station grew: new modules in the structure (keep-out), the model outside and the rooms inside. */
const regrowStation = () => {
  stationGrownAt = stationOutfit.version;
  structure.setLayout(stationOutfit.layout);
  stationModel.rebuild(stationOutfit.layout);
  stationInside.rebuild(playInterior());
};
let screenFromInside = false;
let screenToBay = false;
stationScreen.onExit = () => {
  if (screenToBay) return;
  if (!screenFromInside) return view.center();
  screenFromInside = false;
  stationInside.resume();
};
// Vehicle catalogue in the station's Hangar tab (docs/design/naves-reales.md).
stationScreen.yard = new VehicleYard(stationOps.station, stationOps.blueprints, VEHICLE_CATALOGUE, catalogueMassOf, ASSEMBLY_LIMITS);
// Components by tier, imported from Earth (docs/design/componentes.md §7): the yard's parts arrive this way.
const componentImports = new ComponentImports(importOps, SUPPLY_ITEMS, CARRIERS, LAUNCHERS, ASSEMBLY_LIMITS.arm.maxPayloadKg, (id) => supplyItem(id)?.massKg.value ?? catalogueMassOf(id));
stationScreen.supply = componentImports;
// «Botar» / «Desplegar»: the Cupola view plays it letting go from its site.
stationScreen.onRelease = (c) => {
  const shown = stationScreen.yard?.shown(c);
  if (!shown || !screenFromInside) return;
  stationScreen.exit();
  stationOutside.open({ kind: "botar", craft: shown });
};
// The bay opens only from its laptop in Unity (docs/design/reglas.md §2.3): the Hangar window has no way there.
const bayBack = (from: "pantalla" | "estacion") => (from === "pantalla" ? stationScreen.enter("hangar") : stationInside.resume());
bay.onExit = bayBack;
// The bay's chores acted out at the station, by the lander on its cradle at Unity's CBM (reglas.md §4.2).
bay.stepVisual = (chore) => (atStationPort() ? stationSteps.crew(chore, "consola-bahia") : undefined);
const stationDock = new StationDock((c, f) => view.addButton(c, f), {
  open: () => !duelView.visible && !bay.active && !interior.active && !evaMode.active && stationScreen.enter(),
  distanceM: () => stationOps.station.distanceTo(flight.state.position),
});

// --- The lander's cabin, the general settings and the task list (docs/design/habitaculo.md) --------
const settingsPanel = new SettingsPanel(root);
let settingsFrom: "cabina" | "nodriza" | "estacion" | null = null;
settingsPanel.onClose = () => {
  if (settingsFrom === "cabina") cabin.standUp();
  else if (settingsFrom === "estacion") stationInside.sitLotus(false);
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
// The suit-up acted out at the LM's forward hatch, where it is done (reglas.md §4.2; docs/qa/animaciones.md).
evaMode.suitUpVisual = (chore) => (cabin.active ? cabin.stepVisual("escotilla", (i) => SUIT_UP_VISUALS.acts(chore, i) ?? []) : undefined);
interior.openSettings = () => {
  settingsFrom = "nodriza";
  settingsPanel.open(starship ? "Doménica en loto en la esterilla de la cubierta 1 (Starship)" : "Doménica en loto en la esterilla del rincón de ejercicio (nodriza)");
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
// The LM's own life support, counting only the crew in the lander (docs/design/modulo-lunar-juventas.md).
const landerEcs = new LanderEcs({ crewAboard: () => (crewIn() === "modulo" ? 1 : 0), docked: () => docking.docked, say: (t, sec) => (cabin.active ? cabin.say(t, sec) : undefined) });
const cabinState = (): CabinState => ({
  dockedTo: docking.dockedTo === mothership ? "nodriza" : atStationPort() ? "estacion" : null,
  dockInRange: !docking.docked && docking.inRange(),
  dockAssist: docking.assist,
  landed: flight.landed,
  canLeaveEva: eva.canLeave && expedition.phase === "landed",
  mind: mindNow(),
  ecs: landerEcs.state(),
});
const cabin = new LanderCabin(root, {
  state: cabinState,
  act: (id: CabinActionId) => {
    switch (id) {
      case "pilotar":
        return sitDown();
      case "desacoplar":
        docking.undock();
        return cabin.say("Desacoplada: los muelles te separan. Ponte a pilotar en el puesto del comandante", 6);
      case "asistente-acople":
        docking.toggleAssist();
        return cabin.say(docking.assist ? "Asistente de acople: el módulo se acerca solo al puerto" : "Asistente de acople apagado", 5);
      case "entrar-nodriza":
      case "entrar-estacion":
        return throughHatch();
      case "salir-eva":
        // The suit-up challenge shows over the cabin; out on the surface, the cabin closes (loop).
        // The whole cabin is emptied, as in the LM: filling it again costs O₂.
        landerEcs.repressurise();
        return evaMode.startSuitUp();
      case "cambiar-lioh":
        return cabin.say(landerEcs.changeCartridge(), 5);
      case "reponer-ecs":
        return cabin.say(landerEcs.replenish(), 5);
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
  ecs: () => ({ html: landerEcs.html(), screen: landerEcs.screen() }),
  openTasks: () => taskBoard.open(),
});

/** Which vehicle she is in now, and which hatches are open between them. */
const crewIn = (): Vehicle => (interior.active || bridge.active || deck.active || subj.piloting ? "nodriza" : stationInside.active || stationScreen.active || bay.active || arm.stationEva.active ? "estacion" : "modulo");
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
    stationChores: [...stationLife.taskFacts(), ...lifeSupport.taskFacts(), ...arm.taskFacts()],
    landerEcs: landerEcs.facts(),
  });
}
const taskBoard = new TaskBoard(root, allTasks);
// The species catalogue: adopting animals for the ring and the station (docs/design/catalogo-especies.md).
const sanctuary = wireSanctuaryLife({ root, interior, habitat, importOps, wallet, taskBoard, goChore: (id) => {
  const t = allTasks().find((x) => x.chore === id);
  if (t) goToTask(t);
} });
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
  const wasInStation = stationInside.active || stationScreen.active || bay.active;
  // To the lander from the station: the arm puts it back on its port first.
  if (place.vehicle === "modulo" && landerBerth.onCbm) {
    landerBerth.unberth();
    flash("Canadarm2 devuelve el módulo del CBM a su IDA", 6);
  }
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
    case "estacion": {
      // Inside the station she hops from where she is; from outside, in through the hatch she has.
      if (!wasInStation) stationInside.enter(atStationPort() ? "sonda" : "nodriza");
      else stationInside.resume();
      if (place.spot === "tripulacion") {
        const chore = t?.chore;
        const start = () => {
          if (chore) stationLife.startChore(chore);
        };
        if (!wasInStation && stationInside.placeAt(place.area)) return start();
        if (stationInside.goToFixture(place.area, start)) return stationInside.say(`Vas a: ${STATION_AREA_NAME[place.area as keyof typeof STATION_AREA_NAME] ?? place.area}`);
        // Out of reach from here (suited in the hangar): the task takes her there.
        if (stationInside.placeAt(place.area)) start();
        return;
      }
      // The ship bay and each window: hop to its console, then open it (no window opens without one).
      const fixture = place.spot === "bahia" ? "consola-bahia" : stationInside.interior.fixturesFor(place.tab)[0]?.id;
      const open = () => {
        stationInside.suspend();
        if (place.spot === "bahia") return bay.enter("estacion");
        screenFromInside = true;
        stationScreen.enter(place.tab);
      };
      if (fixture) {
        if (!wasInStation && stationInside.placeAt(fixture)) return open();
        if (stationInside.goToFixture(fixture, open)) return;
      }
      return open();
    }
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
// «Ir a una tarea» (docs/design/viaje-a-una-tarea.md): the whole real way (default) or teleport, chosen in the task list.
const journey = new JourneyDriver(root, {
  interior,
  cabin,
  bridge,
  station: stationInside,
  ...(starship ? { ship: starship.mode } : {}),
  nav,
  ringRadiusM: ring?.spec.floorRadiusM ?? 0,
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
  togglePath,
  viewingPath: () => tripPreview.visible,
  finish: (place, t) => {
    if (place.vehicle === "nodriza") return place.spot === "anillo" ? void (t.chore && interior.doChore(t.chore)) : useBridgeConsole(place);
    if (place.vehicle === "modulo") return place.spot === "asiento" && !view.enabled ? sitDown() : undefined;
    if (place.spot === "tripulacion") return void (t.chore && stationLife.startChore(t.chore));
    stationInside.suspend();
    if (place.spot === "bahia") return bay.enter("estacion");
    screenFromInside = true;
    stationScreen.enter(place.tab);
  },
});
// How «Ir» gets there (viaje / teletransporte) is a switch at the top of the task list (TaskBoard), its only place.
/** The task list's «Ir»: the real journey there, or (teleport, a setting) straight there through open hatches, or to what joins the vehicles, saying why. */
function goToTask(t: Task): void {
  // Travel (the default) walks the whole real way, Starship's decks and hatches included (docs/design/reglas.md §3).
  if (settings.value.taskTravel === "viaje") return void journey.start(t);
  fade();
  journey.say("Teletransporte (elegido en Tareas)");
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
  if (on) return `${on === mothership && mothership.dockedTo ? "Nodriza atracada en la estación" : `Módulo acoplado a ${on === mothership ? "la nodriza" : "la estación"}`} · deja el puesto y ve a la escotilla de acople${settings.key(" (H) · K desacopla")}`;
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
    banner.textContent = `${subj.landedText()}${expedition.canStartDuel || expedition.canStartLevel("nave") ? ` · deja el puesto${settings.key(" (H)")} y ve a la consola de la mente` : eva.canLeave && expedition.bond.next === "traje" ? ` · escotilla EVA del habitáculo` : ""}`;
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
/** The view drawn last (the animation audit projects the trip and landing plans with it). */
const shownView: { scene: THREE.Scene; camera: THREE.Camera } = { scene, camera };
const planAudit = (sheetTop: number) => planOverlay.audit(shownView.scene, shownView.camera, sheetTop, { w: renderer.domElement.clientWidth, h: renderer.domElement.clientHeight });
const duelSheet = root.querySelector<HTMLElement>(".duel");
/**
 * Draw the frame's view, then the live trip view over it («Ver trayecto»: the whole screen, so the room is not drawn).
 * With a challenge that draws a plan open, the plan shows in the scene behind the sheet (PlanOverlay.view).
 */
function present(viewScene: THREE.Scene, viewCam: THREE.Camera): void {
  const size = { w: renderer.domElement.clientWidth, h: renderer.domElement.clientHeight };
  const sheet = duelView.visible && duelSheet ? duelSheet.getBoundingClientRect() : undefined;
  const open = sheet ? (sheet.left > 40 ? { w: sheet.left, h: size.h } : { w: size.w, h: Math.max(60, sheet.top) }) : size;
  const { scene: sc, camera: cam } = planOverlay.view(duelView.visible, viewScene, viewCam, open, size);
  if (!(tripPreview.visible && tripPreview.full)) renderer.render(sc, cam);
  shownView.scene = sc;
  shownView.camera = cam;
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
  // A critical alert ends an open challenge instead of hiding under it (docs/design/ux-acciones.md §7).
  if (wrathMode.critical(subj.piloting)) duelView.interrupt();
  tripPreview.held = duelView.visible;
  ring?.tick(dt);
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
  // Life on board keeps its pace (one day every 24 real minutes), or the trip's if that is faster.
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
  componentImports.tick();
  for (const e of componentImports.drainEvents()) {
    stationScreen.notice(`Llega al hangar: ${e.label}`);
  }
  lifeSupport.tick(stationHours);
  arm.tick(stationHours);
  landerEcs.tick(stationHours);
  starship?.lifeSupport?.tick(stationHours);
  for (const e of importOps.drainEvents()) {
    // Animals from the Sanctuary: they go to their area and say so themselves.
    if (e.type === "llegada" && sanctuary.delivered(e.delivery)) continue;
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
  sanctuary.update(world.lifeDays);
  journey.update(dt);
  view.enabled = !cabin.active && !bridge.active && !interior.active && !stationInside.active && !deck.active && !bay.active && !duelView.visible && !evaMode.active && !stationScreen.active && !navMode.mapOpen && !missionLog.visible;
  navMode.update(dt, world.held);
  const trip = tripNow();
  tripChip.update(trip?.chip, tripPreview.visible);
  tripPreview.follow(trip?.subject);
  // The mothership moves on trips: keep its model where the domain has it.
  mothershipModel.root.position.set(mothership.position.x, mothership.position.y, mothership.position.z);
  mothershipModel.root.quaternion.set(mothership.orientation.x, mothership.orientation.y, mothership.orientation.z, mothership.orientation.w);
  dryDock.update(dt);
  if (dryDock.viewing && !stationInside.active) dryDock.view.close();
  stationOutside.update(dt);
  if (stationOutside.viewing && !stationInside.active) stationOutside.view.close();
  // Berthed on the CBM (or on the arm), the lander is drawn by the Cupola's view, not on its IDA.
  view.rig.visible = !(landerOnCbm() || stationOutside.busy);
  stationModel.setPlatform(stationOps.station.hangar.partList());
  document.body.classList.toggle("in-cockpit", view.enabled);
  if (interior.active) {
    present(interior.scene, interior.camera);
    return;
  }
  // Suited up at the EVA hatch: out on the surface, the cabin closes behind her.
  if (cabin.active && evaMode.active) cabin.exit();
  if (cabin.active) {
    cabin.update(dt);
    mothershipModel.update(dt, ring?.omegaRadS ?? 0, now / 1000);
    present(cabin.scene, cabin.camera);
    return;
  }
  arm.robotics.update(dt);
  // On a spacewalk from Quest: the station from outside, behind her.
  if (arm.stationEva.active) {
    arm.stationEva.update(dt);
    stationModel.update(flight.simTimeS, skyBodies.sunDirection);
    present(scene, arm.stationEva.camera);
    return;
  }
  if (stationInside.active) {
    stationInside.update(dt);
    // An arm challenge: her hands on the RWS's controllers first, then the arm outside.
    if (arm.robotics.showingHands && stationInside.stage(dt)) {
      present(stationInside.scene, stationInside.camera);
      return;
    }
    // The dry dock's cameras: the space scene from beside the dock, over the station.
    if (dryDock.viewing || stationOutside.viewing) {
      mothershipModel.update(dt, ring?.omegaRadS ?? 0, now / 1000);
      stationModel.update(flight.simTimeS, skyBodies.sunDirection);
      present(scene, stationOutside.viewing ? stationOutside.view.camera : dryDock.view.camera);
    } else present(stationInside.scene, stationInside.camera);
    return;
  }
  if (bay.active) {
    bay.update(dt);
    // A part changed at the station: Doménica at the lander on its cradle shows above the sheet, not the bay's view.
    if (stationInside.stage(dt)) present(stationInside.scene, stationInside.camera);
    else present(bay.scene, bay.camera);
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
    // A machine's chore acted out at it: the station's interior shows above the sheet, not the hangar.
    if (stationInside.stage(dt)) present(stationInside.scene, stationInside.camera);
    else present(stationScreen.scene, stationScreen.camera);
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
  mothershipModel.update(dt, ring?.omegaRadS ?? 0, now / 1000);

  const s = flight.state;
  const tel = flight.telemetry();
  const fuel = ship.propellants.reduce((a, p) => a + ship.propellantKg(p), 0) / Math.max(1, ship.propellants.reduce((a, p) => a + ship.propellantCapacityKg(p), 0));
  view.instruments(lmReading(tel, { propellant: fuel, thrust: cmd.mainThrottle, missionS: flight.simTimeS, landingProgram: landerLanding.status === "flying" }));
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

  hud.render(tel, flight.rotationAssist, ship.propellants.map((p) => ship.propellantKg(p)), thrustText(cmd), missionLog.unread);
  present(scene, camera);
});

// Exposed for automated checks and debugging.
// --- Action layout (docs/design/ux-acciones.md) -----------------------------
// One place for what the moment asks for: the context column. In the cockpit it sits over the right
// thumb (above the MOVER pad on phones, bottom-right on desktop); from the bottom up it holds the
// primary action (enter, go outside, convince…), the message that explains it, the asteroid's trust
// chip, the trip chip, where you are and which camera is on (B-03). Secondary flight toggles live in the Mandos menu.
const ctxDock = document.createElement("div");
ctxDock.className = "ctx-dock";
root.appendChild(ctxDock);
ctxDock.append(banner, regionTag);
for (const sel of [".nano-action", ".trip-chip", ".land-offer.lander", ".land-box.probe", ".cam-tag"]) {
  const el = root.querySelector(sel);
  if (el) ctxDock.appendChild(el);
}

(window as unknown as { codeship: unknown }).codeship = { sanctuary, journey, cabin, bridge, settings, settingsPanel, taskBoard, tasks: allTasks, goToTask, flight, ship, expedition, habitat, interior, starship, view, bay, nano, region, field, skyBodies, eva, evaMode, ring, mothership, docking, structure, station: stationScreen, stationInside, stationLife, stationCrew, landerBerth, lifeSupport, bishop: bishopAirlock, stationOutside, stationModel, stationOps, refuelOps, importOps, componentImports, bioOps, wallet, nav, navMode, missions, missionLog, deck, wrathMode, subj, probe: subj.probe, probeTravel, landerLanding, probeLanding, planOverlay, planAudit, tripPreview, tripChip, duelView, levels, dryDock, robotics: arm.robotics, stationEva: arm.stationEva, exteriorWork: arm.work };
