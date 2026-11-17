import type { CabinLayout, CabinStation } from "@modules/lander-cabin/domain/cabin";
import type { BridgeStationId } from "./bridge";

/**
 * What is public about a crewed Starship's flight deck (docs/design/puente.md §La cubierta de vuelo de la
 * Starship). SpaceX and NASA have shown the hull's windows, renders of the crew seated by a bay of windows and
 * a «command and control area» in the cabin, and have said the crew displays are being worked out with NASA;
 * no layout of the controls is published. Crew Dragon's (same company, flown since 2020) is the real base we
 * use for the displays and the hand flying: touchscreens with physical buttons under them.
 */
export const STARSHIP_DECK_SOURCES = {
  windows: "Starship HLS: ventanas en el casco para la tripulación y, en los renders de SpaceX (2025), cuatro tripulantes sentados junto a una fila de ventanas: https://futurism.com/space/spacex-renders-inside-lunar-lander-starship",
  windowTests: "SpaceX, hitos del HLS (2025-10-30): ensayos de micrometeoritos con paneles de ventana; cabina de tamaño real habitada para el soporte vital: https://www.teslarati.com/spacex-checks-off-49-lunar-lander-milestones-in-push-toward-artemis-iii/",
  commandArea: "Unos 600 m³ con camas, suministros y una zona de mando y control (command and control area); dos esclusas y ascensor: https://www.nasaspaceflight.com/2025/11/starship-block-3-path-moon/",
  displays: "NASA (jefa del programa HLS): las pantallas de la tripulación se están decidiendo con SpaceX; sin publicar: https://www.americaspace.com/2023/12/01/spacexs-new-design-for-lunar-starship-unveiled/",
  cabin1: "NASA, 2026-10: primeras fotos de la Cabina 1 del HLS en la Starfactory (paredes acolchadas blancas, aberturas de ventana en el acero): https://teslanorth.com/2026/10/23/starship-moon-lander-cabin-nasa/",
  dragonDisplays: "Crew Dragon: tres pantallas táctiles con grupos de botones físicos debajo, casi todos tapados: https://www.engadget.com/2018-08-14-spacex-dragon-spacecraft-astronauts.html",
  dragonManual: "Crew Dragon: modo manual para acoplar, aterrizar o abortar, desde la pantalla táctil (Demo-2, 2020): https://www.space.com/spacex-crew-dragon-touchscreen-astronaut-thoughts.html",
  dragonDemo2: "Demo-2 (2020-05-30/31): Hurley pilotó a mano desde la pantalla, con el vídeo del objetivo de acople en la misma pantalla, cerca de la ISS: https://spaceflightnow.com/2020/05/30/dragon-astronauts-name-their-spacecraft-endeavour-complete-first-manual-flight-test/",
} as const;

/** Labels of what each piece of the deck is based on (reglas.md §1.1). */
export const STARSHIP_DECK_BASIS: Readonly<Partial<Record<BridgeStationId, { readonly tag: "real" | "en desarrollo" | "nuestra" | "ficción"; readonly note: string }>>> = {
  prop: { tag: "en desarrollo", note: "pantallas táctiles y botones como los de la Crew Dragon" },
  dock: { tag: "en desarrollo", note: "acople manual con cámara como en la Crew Dragon" },
  sonda: { tag: "nuestra", note: "como la estación de robótica de la ISS" },
  nav: { tag: "nuestra", note: "mesa de trazado de trayectorias" },
  comms: { tag: "nuestra", note: "portátil de radio, como los de la ISS" },
  mente: { tag: "ficción", note: "la mente del asteroide" },
  nano: { tag: "ficción", note: "la nano_net de los asteroides" },
};

/** The deck: a 2,5 m cone frustum under the header tanks, from the hull's 4,2 m inner radius to 2,5 m (starship-interior.ts). */
export const STARSHIP_DECK_SHAPE = {
  floorRadiusM: 4.2,
  ceilingRadiusM: 2.5,
  heightM: 2.5,
  /** The three windows of the flight deck, as on the exterior model (starship-model.ts): angles round the axis, deg. */
  windowsDeg: [-20, 0, 20],
  /** A window's size, m (en desarrollo: the HLS's window size is not published; ours, about Crew Dragon's side window). */
  windowM: { w: 0.7, h: 0.5 },
  /** Centre height of the windows above the deck, m (ours: the pilot's seated eye looks out of them). */
  windowY: 1.25,
  /** The floor hatch down to deck 1 (the CBM-size hatch in its ceiling), m from the centre, aft. */
  hatchZ: 3.3,
} as const;

/** Radius of the ring of places she stands at, m, and of the machines, m: 45° apart they are over 2 m apart. */
const STAND_R = 2.7;
const LOOK_R = 3.3;
const ring = (id: BridgeStationId, deg: number, label: string, what: string, y: number, seated?: boolean): CabinStation<BridgeStationId> => {
  const a = (deg * Math.PI) / 180;
  const p = (r: number) => ({ x: +(r * Math.sin(a)).toFixed(3), z: +(-r * Math.cos(a)).toFixed(3) });
  return { id, label, stand: p(STAND_R), look: { ...p(LOOK_R), y }, what, ...(seated ? { seated } : {}) };
};

/**
 * Starship's flight deck (distribución nuestra on what is public, docs/design/puente.md): a round deck in the
 * nose under the header tanks, its stations in a ring along the wall. Forward, under the three windows, the
 * pilot's seat with Dragon-style touchscreens (fly by hand or by challenges, to any destination), the docking
 * seat beside it (the nose port's camera: dock by hand or by challenges, and undock) and the probe's seat on the
 * other side; the navigation table, radio and the two consoles of the asteroid's mind and nano_net (fiction)
 * round the rest; aft, the floor hatch down to deck 1. No console only shows numbers: each one does what its
 * real counterpart does, and the systems pages are on the pilot's screens, as on Dragon's.
 */
export const STARSHIP_DECK: CabinLayout<BridgeStationId> = {
  floor: { minX: -2.75, maxX: 2.75, minZ: -2.75, maxZ: 2.75, blocked: [] },
  stations: [
    ring("salida", 180, "Escotilla de bajada", "Bajar a la cubierta 1 por la escotilla del suelo", 0.25),
    ring("prop", 0, "Puesto de pilotaje", "Pilotar la Starship a cualquier destino: a mano (RCS y motores) o automático (retos)", 1.05, true),
    ring("dock", 45, "Puesto de acople", "Acoplar a la estación con la cámara del puerto de proa, a mano o por retos, y desacoplar", 1.05, true),
    ring("sonda", -45, "Mando de la sonda", "Lanzar, pilotar, posar y recuperar la sonda; sus viajes", 1.05, true),
    ring("nano", 90, "nano_net", "Núcleos, nodos y averías de la red", 1.2),
    ring("mente", -90, "Mente del asteroide", "Fase, confianza y niveles; el duelo a través de la sonda posada", 1.2),
    ring("nav", 135, "Mesa de navegación", "Mapa de trayectorias y destinos: planificar viajes y «Ver trayecto»", 0.95),
    ring("comms", -135, "Radio y misiones", "Cartas, llamadas y el registro de misiones (COMM)", 1.2),
  ],
  reachM: 0.25,
  heightM: STARSHIP_DECK_SHAPE.heightM,
  // The frustum's volume (starship-interior.ts counts it among the 614 m³).
  habitableM3: Math.round((Math.PI * 2.5 * (4.2 ** 2 + 4.2 * 2.5 + 2.5 ** 2)) / 3),
};
