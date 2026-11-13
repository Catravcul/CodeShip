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
import { DuelView } from "./ui/duel-view";
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
import { PROPELLANT_PROCESSES } from "@modules/station/data/propellant-processes";
import { COMET_PROCESSES } from "@modules/station/data/comet-processes";
import { RefuelOps, mothershipRefuelTarget, shipRefuelTarget } from "@modules/station/application/refuel";
import { materialName } from "@modules/station/data/materials";
import { EXPLORER_CRAFT, MOTHERSHIP_CRAFT, POLANA_STATION, STARTING_STOCK } from "@modules/station/data/station";
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
import { asteroidTarget, targetPosition, type NavTarget } from "@modules/navigation/domain/nav-target";
import { NavigationMode, PHASE } from "./navigation";
import { TRAVEL_TIME, frameClocks } from "@modules/navigation/domain/travel-time";
import { duration, num } from "@modules/navigation/application/trip-chore";
import { ProbeTravel } from "./probe-travel";
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
  new Station(POLANA_STATION, new MaterialStock(STARTING_STOCK), new Hangar({}, [
    { ...MOTHERSHIP_CRAFT, name: mothership.spec.name, massKg: mothership.massKg },
    { ...EXPLORER_CRAFT, name: ship.name, massKg: ship.massKg },
  ]), stationOutfit),
  // The station's own import sources (tug, mass driver) sit in the same blueprint tree.
  [...BLUEPRINTS, ...IMPORT_BLUEPRINTS],
  [...REFINE_PROCESSES, ...COMET_PROCESSES, ...PROPELLANT_PROCESSES],
  materialName,
);

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
const landBtn = view.addButton("land-btn", () => (flight.landingAssist = !flight.landingAssist));
// Docked: undock. Free: the docking assist (like the landing assist), near a port.
const dockBtn = view.addButton("dock-btn", () => (docking.docked ? docking.undock() : docking.toggleAssist()));
const namesBtn = view.addButton("names-btn", () => (skyBodies.labelsOn = !skyBodies.labelsOn));
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
missionLog.canOpen = () => deck.active || interior.active;
missionLog.onShowOnMap = (id) => {
  // From the radio on the ring: up to the deck's navigation page.
  if (!deck.active && interior.active) {
    interior.exit();
    deck.enter("interior");
  }
  if (deck.active) deck.showTarget(id);
};
const regionTag = document.createElement("div");
regionTag.className = "region-tag";
root.appendChild(regionTag);
const regionTitle = `${region.data.name} · ${region.heliocentricAU().length().toFixed(2).replace(".", ",")} UA del Sol`;
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyG" && !e.repeat && !interior.active) flight.landingAssist = !flight.landingAssist;
  if (e.code === "KeyK" && !e.repeat && !interior.active && !stationInside.active && !bay.active && !duelView.visible && !deck.active) dockBtn.click();
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
const evaBtn = view.addButton("eva-btn", () => !duelView.visible && !interior.active && evaMode.startSuitUp());
evaBtn.textContent = "Salir de la nave";
evaMode.onExit = () => view.center();

// The lander's hatch: docked, it leads into the vehicle it is docked to, and only there.
const atStationPort = () => structure.ports.some((p) => p === docking.dockedTo);
const hatchInto = (): "nave" | "estacion" | null => (docking.dockedTo === mothership ? "nave" : atStationPort() ? "estacion" : null);
const modeBtn = document.createElement("button");
modeBtn.className = "mode-btn hidden";
root.appendChild(modeBtn);
modeBtn.addEventListener("click", () => {
  if (duelView.visible || evaMode.active || interior.active || stationInside.active || deck.active || bay.active) return;
  const to = hatchInto();
  if (to === "nave") interior.enter("escotilla");
  else if (to === "estacion") stationInside.enter("sonda");
});
// The docking hatches at the end of the spine: down to the lander, or across to the station.
if (interior.zones)
  interior.zones.endHatches = () => [
    ...(docking.dockedTo === mothership
      ? [
          {
            label: "Bajar al módulo de aterrizaje",
            go: () => {
              interior.exit();
              view.setMode("cabina");
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
    deck.enter("interior");
  };
interior.openNavConsole = () => {
  interior.exit();
  deck.enter("interior");
  deck.maximize("nav");
};
interior.openMissions = () => missionLog.open();
deck.onExit = (to, why) => {
  if (to === "interior") interior.enter();
  else view.setMode("cabina");
  if (why) flash(why, 8);
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
  busy: () => (nav.status === "carrier" || nav.status === "autopilot" || nav.status === "docking" ? "La nave ya está de viaje: espera a que llegue" : undefined),
});
function navBusy(carrierTrip: boolean): string | undefined {
  if (probeTravel.trip.active) return "La sonda está de viaje: espera a que llegue o toma su mando";
  if (carrierTrip && subj.probe.out) return "La sonda está fuera: recógela antes de mover la nodriza";
  return undefined;
}
// The trip chip and the live preview, on screen wherever she is while a vehicle flies itself.
const tripChip = new TripChip(root);
const tripPreview = new TripPreview(root);
tripChip.onView = () => (tripPreview.open = !tripPreview.open);
tripChip.onTake = () => (probeTravel.trip.active ? probeTravel.trip.cancel() : nav.cancel());
const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);
const lapseText = (l: number) => (l > 1 ? ` · ×${num(l)}` : "");
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
    else view.center();
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
bay.onExit = (from) => (from === "pantalla" ? stationScreen.enter("hangar") : stationInside.resume());
const stationDock = new StationDock((c, f) => view.addButton(c, f), {
  open: () => !duelView.visible && !bay.active && !interior.active && !evaMode.active && stationScreen.enter(),
  distanceM: () => stationOps.station.distanceTo(flight.state.position),
});

const action = document.createElement("button");
action.className = "action hidden";
root.appendChild(action);
action.addEventListener("click", () => {
  if (expedition.canStartLevel("nave")) {
    subj.startLevelDuel("nave");
  } else if (expedition.canStartDuel) {
    expedition.startDuel("nave");
    duelView.show(duelSession(), stageDuelText(expedition.asteroid.data.name, "nave"), (answer) => {
      const events = expedition.answer(answer);
      return { ok: events.some((e) => e.type === "idea-accepted") };
    });
  } else if (expedition.phase === "persuaded" || expedition.phase === "aggressive") {
    duelView.hide();
    expedition.acknowledge();
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
  // During a mothership trip the autopilot strip says where it is going.
  if (nav.status === "carrier") return "";
  const on = docking.dockedTo;
  if (on) return `${on === mothership && mothership.dockedTo ? "Nodriza atracada en la estación" : `Módulo acoplado a ${on === mothership ? "la nodriza" : "la estación"}`} · K desacopla`;
  // While the trip autopilot flies away from the port, the docking read-out is noise.
  // The autopilot strip already shows the automatic docking's progress.
  if (nav.status === "autopilot" || nav.status === "docking") return "";
  const port = docking.current();
  const a = docking.alignment(port);
  const range = flight.state.position.sub(port.port.position).length();
  if (range > 400) return "";
  const lim = IDSS_CONTACT_LIMITS;
  const ok = (good: boolean) => (good ? "✓" : "✗");
  return `Puerto de ${port === mothership ? "la nodriza" : "la estación"} a ${range < 10 ? n2(Math.max(0, a.axialM)) : range.toFixed(0)} m · cierre ${n2(a.closingMs)} m/s ${ok(a.closingMs >= lim.closingMinMs && a.closingMs <= lim.closingMaxMs)} · lateral ${n2(a.lateralM)} m ${ok(a.lateralM <= lim.lateralMisalignM)} · inclinación ${a.misalignDeg.toFixed(1).replace(".", ",")}° ${ok(a.misalignDeg <= lim.angularMisalignDeg)}${docking.assist ? " · asistente de acople" : " · asistente: K"}`;
}

function renderPhase(): void {
  const p = expedition.phase;
  const t = flight.telemetry();
  action.classList.toggle("hidden", nanoPanel.busy || !((p === "landed" && (expedition.canStartDuel || expedition.canStartLevel("nave")) && !duelView.visible) || ((p === "persuaded" || p === "aggressive") && duelView.visible)));
  action.textContent = p === "landed" ? (expedition.canStartLevel("nave") ? `Convencer · nivel ${expedition.bond.nextLevel}` : "Entrar en su mente") : "Volver a la cabina";
  if (p === "persuaded") {
    banner.textContent = stageResultText(expedition);
  } else if (p === "aggressive") {
    banner.textContent = wrathMode.bannerText() || `${expedition.asteroid.data.name} se calma`;
  } else if (p === "landed") {
    banner.textContent = subj.landedText();
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
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const cmd = subj.piloting || interior.active || stationInside.active || deck.active || bay.active || evaMode.active || stationScreen.active || navMode.blocksInput || missionLog.visible ? NO_INPUT : mergeCommands(pilot.command(), touch.command());
  const flown = subj.piloting ? subj.probeMode.command() : cmd;
  const idle = flown.mainThrottle === 0 && flown.translation.length() === 0 && flown.rotation.length() === 0;
  // Time warp only on quiet cruise far from the surface, so landing stays real-time.
  const far = subj.pilotedDistanceM(flight.telemetry().distanceToSurface) >= WARP_MIN_DISTANCE_M;
  const warpAsk = subj.piloting ? subj.probeMode.warpRequested : view.warpRequested;
  const sp = flight.state.position;
  const fx = nano.net.effectsAt(sp);
  const asked = (expedition.phase === "flight" || expedition.phase === "persuaded" || (expedition.phase === "aggressive" && wrathMode.allowsWarp)) && (subj.piloting ? subj.probe.status === "en-vuelo" : !flight.landed) && idle && far ? warpAsk : 1;
  // A vehicle flying itself on a compressed trip sets the pace of the whole world (docs/design/viajes.md).
  const tripLapse = probeTravel.trip.active ? probeTravel.trip.lapse : nav.lapse;
  // Inside the nano_net its speed nodes let time run faster.
  // Every clock of the frame in one place, tested in src/qa/convivencia (docs/qa/entrelazamiento.md).
  const world = frameClocks(dt, tripLapse, asked > 1 ? Math.round(asked * fx.warpFactor) : 1, STATION_TUNING.hoursPerSecond);
  const warp = world.warp;
  const warpNote =
    tripLapse > 1
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
  probeTravel.update(dt);
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
  if (!nanoPanel.busy) nano.tick(tripLapse > 1 ? world.lifeDays : dt * NANO_DAYS_PER_SECOND);
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
              : "";
    if (!text) continue;
    stationScreen.notice(text);
    flash(text, 5);
  }
  // A module berthed or equipment installed: the structure, its model and the walkable interior follow.
  if (stationOutfit.version !== stationGrownAt) regrowStation();
  interior.update(dt, world.lifeDays);
  view.enabled = !interior.active && !stationInside.active && !deck.active && !bay.active && !duelView.visible && !evaMode.active && !stationScreen.active && !navMode.mapOpen && !missionLog.visible;
  navMode.update(dt);
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
  if (stationScreen.active) {
    stationScreen.update(dt);
    present(stationScreen.scene, stationScreen.camera);
    return;
  }
  // The suit walk works on any asteroid of the region: its own gravity, spin and surface. Samples only on Bennu.
  if (eva.phase === "dentro" && eva.asteroid !== expedition.asteroid) eva.retarget(expedition.asteroid, expedition.asteroid === bennu ? BENNU_SAMPLES : []);
  evaBtn.classList.toggle("hidden", !eva.canLeave || expedition.phase !== "landed");
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
  landBtn.textContent = `Aterrizaje: ${flight.landingAssist ? "auto" : "manual"}`;
  landBtn.classList.toggle("on", flight.landingAssist);
  const dockText = docking.docked ? "Desacoplar" : `Acople: ${docking.assist ? "auto" : "manual"}`;
  if (dockBtn.textContent !== dockText) dockBtn.textContent = dockText;
  dockBtn.classList.toggle("on", docking.assist && !docking.docked);
  dockBtn.classList.toggle("hidden", !docking.docked && !docking.inRange());
  // Landing assist only off a port; time warp only on free flight, far from the surface (or to switch it off).
  landBtn.classList.toggle("hidden", docking.docked);
  view.warpAvailable = !docking.docked && !flight.landed && (far || view.warpRequested > 1);
  const into = hatchInto();
  const hatchText = into === "nave" ? "Entrar en la nave de viaje" : into === "estacion" ? "Entrar en la estación" : "";
  if (modeBtn.textContent !== hatchText) modeBtn.textContent = hatchText;
  modeBtn.classList.toggle("hidden", !into);
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

  hud.render(flight.telemetry(), flight.rotationAssist, ship.propellants.map((p) => ship.propellantKg(p)), thrustText(cmd), missionLog.unread);
  present(scene, camera);
});

// Exposed for automated checks and debugging.
(window as unknown as { codeship: unknown }).codeship = { flight, ship, expedition, habitat, interior, view, bay, nano, region, field, skyBodies, eva, evaMode, ring, mothership, docking, structure, station: stationScreen, stationInside, stationOps, refuelOps, importOps, bioOps, wallet, nav, navMode, missions, missionLog, deck, wrathMode, subj, probe: subj.probe, probeTravel, tripPreview, tripChip, duelView, levels };
