import type { CabinLayout } from "@modules/lander-cabin/domain/cabin";
import type { PanelId } from "../application/panels";

/**
 * The travel ship's bridge as a walkable room (docs/design/habitaculo.md §Puente, docs/design/puente.md): the
 * forward node, with one console per job instead of one overlay with every page. Each console opens only its own page.
 */
export type BridgeStationId = PanelId | "nano" | "sonda" | "mente" | "salida";

/** Which console shows each page of the old all-in-one deck. */
export const PANEL_CONSOLE: Readonly<Record<PanelId, BridgeStationId>> = { nav: "nav", prop: "prop", power: "power", life: "life", dock: "dock", comms: "comms" };

/** Where the layout and the look of the bridge come from (docs/design/puente.md §Investigación). */
export const BRIDGE_SOURCES = {
  harmony: "Nodo Harmony de la ISS: 4,4 m de diámetro y 7,2 m de largo, con puertos a proa, popa y los lados: https://en.wikipedia.org/wiki/Harmony_(ISS_module)",
  consoles: "En el control de la ISS cada sistema tiene su puesto (ECLSS, EPS, ETHOS, ADCO, PHALCON, CAPCOM…): https://en.wikipedia.org/wiki/Flight_controller",
  cupola: "La estación de robótica de la Cupola: un puesto aparte con sus mandos y ventanas para el brazo; 7 ventanas, la de arriba de 80 cm: https://en.wikipedia.org/wiki/Cupola_(ISS_module)",
  rws: "Robotic Work Station (Destiny o Cupola): un mando de rotación (RHC), uno de traslación (THC), panel de mando (DCP) y portátil (PCS), con vídeo de las cámaras del brazo: https://rdataspace.github.io/station_iss/tech/canadarm2-dextre.html",
  orion: "Orion: tres pantallas, un dispositivo de cursor, panel de interruptores al lado y un RHC por asiento (mano derecha); el THC a un lado de las pantallas: https://www.nasa.gov/missions/artemis/orion/how-to-fly-nasas-orion-spacecraft/",
  orionSwitches: "De los ~2 000 interruptores del transbordador, Orion deja 56 físicos; el resto, iconos en pantalla: https://www.designnews.com/aerospace/exclusive-closer-look-nasas-orion-glass-cockpit",
  dragon: "Crew Dragon: panel de tres pantallas táctiles con grupos de botones físicos debajo, casi todos tapados (Commands, Pyros, Displays, Power): https://www.engadget.com/2018-08-14-spacex-dragon-spacecraft-astronauts.html",
  toru: "TORU (segmento ruso): acoplar a mano una Progress desde la estación, con dos mandos (traslación y rotación) y vídeo de la cámara delantera: https://en.wikipedia.org/wiki/TORU",
  mcc: "Control de Houston: filas de consolas frente a una gran pantalla con el mapa y la traza en seno de la órbita (MOCR); FCR 1 de la ISS, filas al mismo nivel: https://en.wikipedia.org/wiki/Christopher_C._Kraft_Jr._Mission_Control_Center",
  submarine: "Sala de control de un submarino: periscopios en el centro, mesas de trazado, el puesto de gobierno con timonel y planista sentados con mandos de avión y consolas de sistemas a un lado: https://www.pbs.org/wgbh/nova/subsecrets/spriconhiright.html",
  uav: "Estación de tierra de un dron (Predator): piloto y operador de sensores sentados ante varias pantallas, con palanca y acelerador de avión: https://www.wikiwand.com/en/articles/Ground_control_station",
  rov: "Pilotos de ROV (Nautilus): sentados uno junto al otro ante pantallas táctiles, palancas y teclados en la sala de control: https://nautiluslive.org/career/rov-pilot",
  msis: "NASA-STD-3000 (MSIS) §9.2.3–9.2.4: puestos para la postura neutra en microgravedad, sujeciones de pies o cintura para vigilar mucho rato o usar las dos manos; pantalla a 330–710 mm (mejor ≥ 510 mm) y menos de 30° entre la mirada y su normal: https://msis.jsc.nasa.gov/sections/section09.htm",
  nbp: "Postura neutra (MSIS, medida en Skylab): cuello 24°, hombro 36°, codo 90°, cadera 50°, rodilla 50° de flexión; en el STS-57 varía mucho entre tripulantes: https://ntrs.nasa.gov/api/citations/20040200967/downloads/20040200967.pdf",
  workHeight: "Trabajo de pie: tareas ligeras 5–10 cm por debajo del codo; de precisión, 5–10 cm por encima con apoyo: https://www.msdprevention.com/resource-library/standing-workstation-height-manual-tasks",
} as const;

/**
 * Real measures of the bridge's workstations (adapters draw them; WORLD_SCALE enlarges sizes and the
 * floor plan, never the heights where her body meets the machine). Sources in BRIDGE_SOURCES.
 */
export const BRIDGE_ERGONOMICS = {
  /** Her eye standing (the walk rooms' first-person camera) and belted to a seat in neutral posture, m. */
  eyeStandingM: 1.45,
  eyeSeatedM: 1.2,
  /** Standing console: light work, a few cm under the elbow (≈ 1,02 m for a 1,65 m woman, estimate). */
  workSurfaceM: 0.95,
  /** Seat pan of a restraint seat (neutral posture: hips and knees bent ~50°), and the hand-controller grips. */
  seatPanM: 0.5,
  gripM: 0.78,
  /** MSIS §9.2.4: eye to screen, m. */
  viewing: { minM: 0.33, preferredM: 0.51, maxM: 0.71 },
  /** MSIS §9.2.3: the line of sight never more than this off the screen's normal, degrees. */
  maxOffNormalDeg: 30,
  /** MSIS neutral body posture: the head bends forward this much, so screens sit a little under the eye, degrees. */
  neckFlexionDeg: 24,
  /** A console's main screen, m (a 24-inch 16:10 panel: between the ISS laptops and an FCR monitor; estimate). */
  displayM: { w: 0.52, h: 0.32 },
  /** The pilot station's three display units (Orion has three), m each (estimate). */
  pilotDisplayM: { w: 0.34, h: 0.26 },
  /** The plot table's horizontal display, m (estimate: a submarine's plotting table). */
  plotTableM: { w: 1.2, d: 0.8 },
  /** Console body: width and depth, m (estimate). */
  consoleM: { w: 0.9, d: 0.5 },
} as const;

/** The plot table in the middle of the deck: she walks round it. */
export const PLOT_TABLE = { x: 0, z: -0.45 } as const;

/**
 * The mothership's bridge deck: 6,4 × 8 m of floor (game value, enlarged from the 3,2 × 3,3 m of the forward
 * node so that every console and the place where she stands at it are 2 m from the next: HAB-08).
 *
 * Laid out from the research (docs/design/puente.md): like a submarine's control room or Houston's FCR, the
 * pilot's station faces the bow window (seated, Orion-style: three screens, RHC right, THC left), with the
 * probe's station beside it (seated with hand controllers, like the ISS robotics station, a drone's ground
 * station or an ROV pilot) and docking on the other side (TORU-style); the plot table with the trajectory
 * display stands in the middle; the systems consoles line the side walls; radio and the hatch are aft.
 */
export const BRIDGE: CabinLayout<BridgeStationId> = {
  floor: {
    minX: -2.9,
    maxX: 2.9,
    minZ: -3.6,
    maxZ: 3.6,
    blocked: [{ minX: PLOT_TABLE.x - 0.62, maxX: PLOT_TABLE.x + 0.62, minZ: PLOT_TABLE.z - 0.42, maxZ: PLOT_TABLE.z + 0.42 }],
  },
  stations: [
    { id: "salida", label: "Escotilla a la espina", stand: { x: 0, z: 3.35 }, look: { x: 0, y: 1.1, z: 4.0 }, what: "Volver a la espina de la nodriza" },
    { id: "prop", label: "Pilotaje y propulsión", stand: { x: 0, z: -2.95 }, look: { x: 0, y: 1.05, z: -3.55 }, what: "Encendidos, actitud y Δv: los 18 propulsores X3 y el xenón (PROP)", seated: true },
    { id: "sonda", label: "Mando de la sonda", stand: { x: -2.2, z: -2.95 }, look: { x: -2.2, y: 1.05, z: -3.55 }, what: "Lanzar, pilotar, posar y recuperar la sonda; sus viajes", seated: true },
    { id: "dock", label: "Acople", stand: { x: 2.2, z: -2.95 }, look: { x: 2.2, y: 1.1, z: -3.5 }, what: "Puertos, el módulo de aterrizaje y la estación (DOCK)" },
    { id: "nav", label: "Mesa de navegación", stand: { x: 0, z: 0.1 }, look: { x: PLOT_TABLE.x, y: 0.95, z: PLOT_TABLE.z }, what: "Mapa de trayectorias, destinos y programar viajes (NAV)" },
    { id: "life", label: "Vida y hábitat", stand: { x: -2.5, z: -0.75 }, look: { x: -3.0, y: 1.2, z: -0.75 }, what: "Aire, agua, gravedad del anillo y despensa (ECLSS)" },
    { id: "power", label: "Energía y calor", stand: { x: 2.5, z: -0.75 }, look: { x: 3.0, y: 1.2, z: -0.75 }, what: "Reactor, baterías y radiadores (EPS/TCS)" },
    { id: "mente", label: "Mente del asteroide", stand: { x: -2.5, z: 1.35 }, look: { x: -3.0, y: 1.2, z: 1.35 }, what: "Fase, confianza y niveles; el duelo a través de la sonda posada" },
    { id: "nano", label: "nano_net", stand: { x: 2.5, z: 1.35 }, look: { x: 3.0, y: 1.2, z: 1.35 }, what: "Núcleos, nodos y averías de la red" },
    { id: "comms", label: "Radio y misiones", stand: { x: -2.0, z: 3.35 }, look: { x: -2.0, y: 1.2, z: 3.85 }, what: "Cartas, llamadas y el registro de misiones (COMM)" },
  ],
  reachM: 0.25,
  heightM: 2.4,
  habitableM3: 120,
};
