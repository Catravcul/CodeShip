import type { CabinLayout } from "@modules/lander-cabin/domain/cabin";
import type { PanelId } from "../application/panels";

/**
 * The travel ship's bridge as a walkable room (docs/design/habitaculo.md §Puente): the forward node, with
 * one console per job instead of one overlay with every page. Each console opens only its own page.
 */
export type BridgeStationId = PanelId | "nano" | "sonda" | "mente" | "salida";

/** Which console shows each page of the old all-in-one deck. */
export const PANEL_CONSOLE: Readonly<Record<PanelId, BridgeStationId>> = { nav: "nav", prop: "prop", power: "power", life: "life", dock: "dock", comms: "comms" };

export const BRIDGE_SOURCES = {
  harmony: "Nodo Harmony de la ISS: 4,4 m de diámetro y 7,2 m de largo, con puertos a proa, popa y los lados: https://en.wikipedia.org/wiki/Harmony_(ISS_module)",
  consoles: "En el control de la ISS cada sistema tiene su puesto (ECLSS, EPS, ETHOS, ADCO, PHALCON, CAPCOM…): https://en.wikipedia.org/wiki/Flight_controller",
  cupola: "La estación de robótica de la Cupola: un puesto aparte con sus mandos y ventanas para el brazo: https://en.wikipedia.org/wiki/Cupola_(ISS_module)",
} as const;

/**
 * The mothership's bridge deck: 6,4 × 8 m of floor with the consoles round the walls. Game value:
 * enlarged from the 3,2 × 3,3 m of the forward node (radius 2,2 m in data/mothership.ts) so that each
 * console, and the place where she stands at it, is 2 m from the next (HAB-08, the spacing rule taken
 * from Cold Sanctuary): ten consoles in the old node were 0,7–1,4 m apart.
 */
export const BRIDGE: CabinLayout<BridgeStationId> = {
  floor: { minX: -2.9, maxX: 2.9, minZ: -3.6, maxZ: 3.6, blocked: [] },
  stations: [
    { id: "salida", label: "Escotilla a la espina", stand: { x: 0, z: 3.35 }, look: { x: 0, y: 1.1, z: 4.0 }, what: "Volver a la espina de la nodriza" },
    { id: "nav", label: "Navegación", stand: { x: 0, z: -3.35 }, look: { x: 0, y: 1.1, z: -3.75 }, what: "Mapa, destinos y programar viajes (NAV)" },
    { id: "prop", label: "Propulsión", stand: { x: -2.0, z: -3.35 }, look: { x: -2.0, y: 1.0, z: -3.75 }, what: "Los 18 propulsores X3, xenón y Δv (PROP)" },
    { id: "power", label: "Energía y calor", stand: { x: 2.0, z: -3.35 }, look: { x: 2.0, y: 1.0, z: -3.75 }, what: "Reactor, baterías y radiadores (EPS/TCS)" },
    { id: "life", label: "Vida y hábitat", stand: { x: -2.55, z: -1.2 }, look: { x: -2.95, y: 1.0, z: -1.2 }, what: "Aire, agua, gravedad del anillo y despensa (ECLSS)" },
    { id: "dock", label: "Acople", stand: { x: 2.55, z: -1.2 }, look: { x: 2.95, y: 1.0, z: -1.2 }, what: "Puertos, el módulo de aterrizaje y la estación (DOCK)" },
    { id: "sonda", label: "Mando de la sonda", stand: { x: -2.55, z: 1.2 }, look: { x: -2.95, y: 1.0, z: 1.2 }, what: "Lanzar, pilotar, posar y recuperar la sonda; sus viajes" },
    { id: "mente", label: "Mente del asteroide", stand: { x: 2.55, z: 1.2 }, look: { x: 2.95, y: 1.0, z: 1.2 }, what: "Fase, confianza y niveles; el duelo a través de la sonda posada" },
    { id: "comms", label: "Radio y misiones", stand: { x: -2.0, z: 3.35 }, look: { x: -2.0, y: 1.0, z: 3.75 }, what: "Cartas, llamadas y el registro de misiones (COMM)" },
    { id: "nano", label: "nano_net", stand: { x: 2.0, z: 3.35 }, look: { x: 2.0, y: 1.0, z: 3.75 }, what: "Núcleos, nodos y averías de la red" },
  ],
  reachM: 0.25,
  heightM: 2.4,
  habitableM3: 120,
};
