import { S3_SOURCES as S, fact, type Fact } from "./sources";
import type { LiftSpec } from "../domain/lift";
import type { CraftSpec } from "../domain/travel";
import type { SolarSpec, StopRule, TidalSpec, WindTurbineSpec } from "../domain/energy";
import type { HeightRule } from "../domain/launch-height";
import type { HandLimits } from "../domain/hand-flight";

/**
 * Every number of sanctuary 3 with its label and source (reglas.md §1.1). Cold Sanctuary's aerial sanctuary keeps
 * its magic (reglas.md §1.2): its sizes and game values are «ficción» or «licencia» and name the file they come
 * from; the rockets, the crew pad's model and the training island's facilities are real.
 */

// ── Cold Sanctuary's aerial sanctuary: where things are (its coordinates, m; plan x, z) ──
export const SITE = {
  launch: fact({ x: -560, z: 0 }, "ficcion", S.csBuilder, "LaunchSiteCenter: el casquete de la lanzadera"),
  launchCapHalf: fact(55, "ficcion", S.csBuilder, "LaunchCapHalf: 110 × 110 m"),
  energy: fact({ x: -470, z: 470 }, "ficcion", S.csBuilder, "EnergyRule.Center"),
  energyCapHalf: fact(120, "ficcion", S.csBuilder, "EnergyRule.CapHalf: 240 × 240 m"),
  dock: fact({ x: -230, z: 210 }, "ficcion", S.csBuilder, "AereoDock (el muelle de las alfombras, 32 × 24 m), movido por nosotros de (−300, 170) a fuera de los 300 m del Electron, también a escala 1,5"),
  dockSize: fact({ x: 32, z: 24 }, "ficcion", S.csBuilder),
  parapetM: fact(1.2, "ficcion", S.csBuilder, "Pretil_casquete"),
} as const;

/** The tree-buildings (HelixTower): magic water trunks with floors around them. */
export const TREE = {
  waterHalf: fact(10, "ficcion", S.csTree, "tronco de agua de 20 × 20 m"),
  wall: fact(1, "ficcion", S.csTree, "pared de acrílico de 1 m"),
  levelGap: fact(22, "ficcion", S.csTree),
  floorSize: fact(32, "ficcion", S.csTree),
  tipSize: fact(20, "ficcion", S.csTree, "campo de punta"),
  tipGap: fact(10, "ficcion", S.csTree, "TowerHelix: 10 m de hueco"),
  tipRise: fact(12, "ficcion", S.csTree),
  ringH: fact(4, "ficcion", S.csTree),
  tubeHalf: fact(5.3, "ficcion", S.csTree, "rama: tubo de agua de 10 × 10 m"),
  mouthX: fact(4.7, "ficcion", S.csTree),
  colHalf: fact(5.3, "ficcion", S.csTree, "columna de agua de la punta"),
  door: fact({ w: 7, h: 7, x: 5 }, "ficcion", S.csTree, "puertas de 7 × 7 m (campo magnético que retiene el agua)"),
  minFirstY: fact(64, "ficcion", S.csTree, "TreeSpec.Helix.firstY"),
  energyFirstY: fact(12, "ficcion", S.csEnergy, "EnergyRule.FirstFloorY"),
} as const;

/** The trunk lift (AereoLift): game values of Cold Sanctuary («la mitad de la línea de las cavernas»). */
export const LIFT: Fact<LiftSpec> = fact({ speedMs: 10, accelMs2: 1.5, doorS: 4 }, "licencia", S.csAereo, "valores del juego; un ascensor así es real, la cabina estanca dentro de un tronco de agua es ficción");

/** The launch height rule and the crown (LaunchHeightRule, FinishLaunchSite). */
export const HEIGHT_RULE: Fact<HeightRule> = fact({ birdBandM: 152, marginM: 30 }, "ficcion", `${S.csLaunch}; ${S.birdBand}`, "el dato de las aves es real; ninguna plataforma real está en alto");
export const CROWN = {
  padRiseM: fact(12, "ficcion", S.csLaunch, "la corona, 12 m sobre el techo del árbol"),
  slab: fact({ half: 12, thick: 2, hole: 2 }, "licencia", S.csLaunch, "losa de 24 × 24 × 2 m con hueco de llama de 4 × 4 m: piezas reales, medidas del juego"),
  pillars: fact({ at: 9, size: 3 }, "licencia", S.csLaunch),
  umbilicalM: fact(22, "licencia", S.csLaunch),
  shieldM: fact(10, "licencia", S.csLaunch, "escudo contra cascotes del lado del santuario"),
  delugeTank: fact({ x: 9, z: 9, w: 5, h: 8 }, "licencia", S.csLaunch),
  tanksApartM: fact(84, "real", S.csLaunch, "esferas de LOX y RP-1 a más de 80 m entre sí, al aire (separación real)"),
} as const;

// ── Rockets and pads ──
export interface RocketData {
  readonly name: string;
  readonly heightM: Fact;
  readonly diameterM: Fact;
  readonly massKg: Fact;
  readonly propellantKg: Fact;
  readonly crewed: boolean;
}

export const ELECTRON: RocketData = {
  name: "Electron",
  heightM: fact(18, "real", S.electron),
  diameterM: fact(1.2, "real", S.electron),
  massKg: fact(13_000, "real", S.electron),
  propellantKg: fact(10_200, "real", `${S.csLaunch}; ${S.electron}`, "~10 t de LOX y RP-1 de un cohete de la clase Electron (LaunchHeightRule.PropellantKg)"),
  crewed: false,
};

export const FALCON9_CREW: RocketData = {
  name: "Falcon 9 con Crew Dragon",
  heightM: fact(70, "real", S.falcon9),
  diameterM: fact(3.7, "real", S.falcon9),
  massKg: fact(549_000, "real", S.falcon9),
  propellantKg: fact(395_700 + 92_670, "real", S.falcon9, "las dos etapas"),
  crewed: true,
};

export const DRAGON = {
  heightM: fact(8.1, "real", S.dragon, "con el maletero"),
  diameterM: fact(4, "real", S.dragon),
  massKg: fact(12_500, "real", S.dragon),
  crew: fact(4, "real", S.dragon),
} as const;

/** Electron's payload (the cargo launcher of puesto 10). */
export const ELECTRON_PAYLOAD_KG = fact(300, "real", S.electron);

/** The crew pad on the sea: a semi-submersible like Sea Launch's Odyssey (real); a Falcon 9 from it is licence. */
export const CREW_PAD = {
  at: fact({ x: 150, z: -1300 }, "licencia", S.ours, "a más de la distancia de seguridad de un Falcon 9 tripulado de todo lo habitado"),
  size: fact({ x: 132.9, z: 67 }, "real", S.odyssey),
  deckM: fact(22, "real", S.odyssey, "cubierta sobre el agua con la plataforma lastrada (calado de 34,5 m): altura nuestra"),
  launches: fact(36, "real", S.odyssey),
  crewAwayM: fact(5000, "real", S.odyssey, "la gente, en el barco de mando a 5 km al lanzar"),
} as const;

// ── Getting about ──
export const CRAFT: Readonly<Record<"helicoptero" | "alfombra", Fact<CraftSpec>>> = {
  helicoptero: fact({ cruiseMs: 280 / 3.6, climbS: 20, cruiseAboveM: 60 }, "real", S.s92, "S-92 a 280 km/h; despegue y aterrizaje de 20 s cada uno y 60 m de altura de crucero: estimación nuestra"),
  alfombra: fact({ cruiseMs: 26, climbS: 6, cruiseAboveM: 40, fixedS: 30 }, "ficcion", `${S.csAereo}; ${S.csCarpet}`, "AereoRule.FlightSeconds: 30 s de vuelo"),
};
export const S92 = { lengthM: fact(20.88, "real", S.s92), rotorM: fact(17.17, "real", S.s92), heightM: fact(4.7, "real", S.s92) } as const;
/**
 * Hand flight (reglas.md §3.6, «Manual»): the S-92's envelope as the pad uses it. Cruise 280 km/h and the rotor are
 * Sikorsky's; 35 kt sideways and backwards is the usual limit of a transport helicopter; the climb, the lag and the
 * steps of each tap are ours. The carpet mirrors it with Cold Sanctuary's speed.
 */
export const HAND: Readonly<Record<"helicoptero" | "alfombra", Fact<HandLimits>>> = {
  helicoptero: fact({ fwdMs: 280 / 3.6, backMs: 18, sideMs: 18, climbMs: 7.5, yawDegS: 30, fwdStepMs: 280 / 3.6 / 8, climbStepMs: 1.5, yawStepDegS: 10, lagS: 3, radiusM: 17.17 / 2, heightM: 4.7, touchdownMs: 1.5, padRadiusM: 10, seaHoverM: 5 }, "real", S.s92, "velocidad y rotor del S-92; 35 kt de lado y atrás, el ascenso de 7,5 m/s, el retardo y los pasos: estimación nuestra"),
  alfombra: fact({ fwdMs: 26, backMs: 8, sideMs: 8, climbMs: 4, yawDegS: 45, fwdStepMs: 26 / 4, climbStepMs: 1, yawStepDegS: 15, lagS: 1, radiusM: 1.6, heightM: 1.8, touchdownMs: 1.5, padRadiusM: 4, seaHoverM: 3 }, "ficcion", `${S.csAereo}; ${S.csCarpet}`, "la alfombra imita los mandos del helicóptero (nuestro), a su velocidad"),
};

/** A helideck of 1 D (CAP 437 / ICAO: the D-value is the helicopter's overall length). */
export const HELIDECK_M = fact(21, "real", S.s92, "1 D del S-92 (20,88 m)");

// ── Energy park (Ross Island's turbines; Cold Sanctuary's park) ──
export const TURBINE: Fact<WindTurbineSpec> = fact({ ratedKW: 330, rotorM: 33, hubM: 37, cutInMs: 3, ratedMs: 12, cutOutMs: 25 }, "real", `${S.rossIsland}; ${S.csEnergy}`, "Enercon E-33");
export const TURBINES = fact(3, "real", S.rossIsland);
export const MEAN_WIND_MS = fact(7.9, "real", S.rossIsland);
export const BIRD_STOP: Fact<StopRule> = fact({ radiusM: 200, resumeS: 30 }, "licencia", S.csEnergy, "20 s de vuelo a 10 m/s; IdentiFlight ve ~1 km; distancia del juego, razonada");
export const TIDAL: Fact<TidalSpec> = fact({ rotorM: 10, cp: 0.35, tipSpeedRatio: 4.5, maxTipMs: 5, seawaterKgM3: 1027 }, "licencia", `${S.csEnergy}; ${S.seals}`, "piloto de 2 rotores de Ø 10 m; la punta por debajo de 5,6 m/s");
export const TIDAL_UNITS = fact(2, "licencia", S.csEnergy);
export const TIDAL_PEAK_MS = fact(1, "real", S.csEnergy, "McMurdo: ERDC/CRREL TR-16-17");
export const MARINE_STOP: Fact<StopRule> = fact({ radiusM: 50, resumeS: 30 }, "real", S.csEnergy, "el radio final de SeaGen");
export const SOLAR: Fact<SolarSpec> = fact({ share: 0.2, yieldKWhPerKWp: 900, tableKWp: 36 * 0.4 }, "licencia", S.csEnergy, "mesas de 36 módulos de 400 W; el 20 % de la energía de cada piso");
export const TABLE = fact({ length: 24, height: 3, rowPitch: 8, gap: 2 }, "licencia", S.csEnergy);
export const FLOORS_KW = fact(50, "licencia", S.csAereo, "AereoRule.FloorsKW");
export const STORAGE = fact({ containers: 6, mwhEach: 5, sandMWh: 30 }, "real", S.csEnergy, "contenedores LFP de 5 MWh y silo de arena");

// ── Cold birds of the aerial sanctuary (ColdBirds.AirBudget) ──
export interface BirdSpecies {
  readonly id: string;
  readonly name: string;
  readonly latin: string;
  readonly count: number;
  readonly wingspanM: number;
  readonly massKg: number;
  readonly reality: "real";
  readonly source: string;
}
export const AIR_BIRDS: readonly BirdSpecies[] = [
  { id: "PolarSkua", name: "Págalo polar", latin: "Stercorarius maccormicki", count: 2, wingspanM: 1.35, massKg: 1.3, reality: "real", source: S.csBirds },
  { id: "CapePetrel", name: "Petrel damero", latin: "Daption capense", count: 4, wingspanM: 0.85, massKg: 0.45, reality: "real", source: S.csBirds },
  { id: "WanderingAlbatross", name: "Albatros viajero", latin: "Diomedea exulans", count: 2, wingspanM: 3, massKg: 9, reality: "real", source: S.csBirds },
  { id: "ArcticTern", name: "Charrán ártico", latin: "Sterna paradisaea", count: 2, wingspanM: 0.8, massKg: 0.1, reality: "real", source: S.csBirds },
];
/** Where the birds live: 220 m south of the launch cap (PlaceAirColdFauna), in a ring of 120 m. */
export const BIRD_HOME = fact({ dz: -220, radius: 120 }, "ficcion", S.csBuilder);

// ── The training island (real facilities, docs/design/santuario3-iniciacion.md §1.2) ──
export const TRAINING = {
  island: fact({ x0: 20, x1: 300, z0: -125, z1: 115 }, "licencia", S.ours, "isla natural; las instalaciones juntas en una isla son nuestras, cada una copia una real"),
  nblPool: fact({ x: 62, z: 31, depth: 12 }, "real", S.nbl),
  nblVolumeM3: fact(23_000, "real", S.nbl),
  centrifugeArmM: fact(18, "real", S.tsf18, "TsF-18: brazo de 18 m"),
  swimLapM: fact(25, "real", S.training, "3 largos de 25 m sin parar"),
  destiny: fact({ length: 8.5, diameter: 4.3 }, "real", "Wikipedia, Destiny (módulo de la ISS): https://en.wikipedia.org/wiki/Destiny_(ISS_module)"),
  consoles: fact({ rows: 4, perRow: 4 }, "real", `${S.fcr1}; ${S.mocrRows}`, "16 consolas como la FCR-1 antes de 2006, en cuatro filas como la sala del Apolo; las dos de delante, más bajas; qué puesto va en cada consola es nuestro salvo FLIGHT (3.ª fila) y CAPCOM (2.ª)"),
} as const;

// ── Phase 5 (s3-iniciacion-2): the centrifuge, the parabolic flight, the glacier, the simulators ──
export const CENTRIFUGE = {
  testG: fact(4, "real", S.tsf18, "prueba estándar de la TsF-18"),
  rampGs: fact(0.1, "real", S.tsf18, "sube 0,1 g cada segundo"),
  testS: fact(60, "real", S.tsf18, "la prueba dura un minuto"),
  reentryG: fact({ min: 4, max: 5 }, "real", S.dragonReentry, "Crew Dragon, Demo-2"),
} as const;

export const ZERO_G = {
  parabolas: fact(31, "real", S.zeroG),
  weightlessS: fact(20, "real", S.zeroG),
  pullG: fact(1.8, "real", S.zeroG),
  pullS: fact(20, "real", S.zeroG),
  climbDeg: fact(50, "real", S.zeroG),
  cycleMin: fact(3, "real", S.zeroG, "1 min de parábola y 2 de descanso"),
  restAfterFiveMin: fact(8, "real", S.zeroG),
  testZone: fact({ x: 20, y: 2.3, z: 5 }, "real", S.zeroG, "largo, alto y ancho de la zona de ensayo acolchada"),
  plane: fact({ length: 46.4, span: 43.9, fuselage: 5.6 }, "real", S.zeroG),
} as const;

/** The glacier: an ice island off the map with a blue-ice runway like Union Glacier's, reached by helicopter. */
export const GLACIER = {
  at: fact({ x: 1600, z: 1700 }, "licencia", S.ours, "un glaciar en el mar del santuario 3, fuera de las islas: la pista de hielo azul no cabe en ellas"),
  runway: fact({ length: 3000, width: 50 }, "real", S.blueIce),
  half: fact({ x: 1650, z: 260 }, "licencia", S.ours, "el hielo alrededor de la pista y del campamento"),
} as const;

export const ANSMET = {
  spacingM: fact(30, "real", S.ansmet),
  team: fact({ min: 4, max: 10 }, "real", S.ansmet),
  minutesPerSample: fact(2, "real", S.ansmet, "sin contar el GPS, que tarda 4–5 min"),
} as const;

export const COLD = {
  days: fact(2, "real", S.happyCamper),
  antennaM: fact(10, "real", S.happyCamper),
  poleKm: fact(1360, "real", S.happyCamper),
} as const;

/** The LM's landing gear: the touchdown it was built for (the simulator's limits). */
export const LM_TOUCHDOWN = {
  verticalMs: fact(3.05, "real", S.lmGear, "10 ft/s"),
  horizontalMs: fact(1.22, "real", S.lmGear, "4 ft/s"),
  /** The Moon's surface gravity, m/s². */
  moonG: fact(1.62, "real", S.moonFacts, "Gravedad en la superficie de la Luna"),
  /** Where the practice takes over: the low gate, about 150 m up (Apollo 11 went to P66 at about 500 ft). */
  startAltM: fact(150, "real", S.apollo11Landing, "Unos 500 ft: Armstrong toma el mando a mano (P66)"),
  /** Descent propellant left at the low gate, kg (ours: about a minute and a half at hover, Apollo 11 landed with ~45 s). */
  propLeftKg: fact(400, "licencia", S.apollo11Landing, "Apolo 11 tocó con unos 45 s de propelente"),
} as const;
