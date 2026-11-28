import { WORLD_SCALE } from "@core/scale";
import { INTERACTABLE_SPACING, SPREAD_ON, spreadFactor } from "@core/spacing";
import { LM } from "@modules/ship/data/apollo-lm";
import { spreadLayout, type CabinLayout } from "../domain/cabin";
import { CREW_STATION } from "./crew-station";

/**
 * The lander's crew cabin is the Apollo LM's (docs/design/modulo-lunar-juventas.md, «Cabina»): 6,7 m³
 * pressurised and 4,5 m³ habitable, two astronauts standing at their stations (no seats: restraints and
 * armrests), the forward hatch low between them to go out to the surface, the overhead docking hatch in
 * the midsection behind, over the ascent engine cover, and the ECS panel on the left of the midsection.
 */
export const CABIN_SOURCES = {
  apolloLm: "Módulo lunar Apolo: 6,7 m³ de cabina, 4,5 m³ habitables; dos astronautas de pie; escotilla de acople en el techo y escotilla delantera para salir: https://en.wikipedia.org/wiki/Apollo_Lunar_Module",
  ecs: "ECS del LM (NASA TN D-6724): cartuchos de LiOH, O₂ y agua en la cabina: https://ntrs.nasa.gov/api/citations/19720013195/downloads/19720013195.pdf",
} as const;

/** The floor of the real cabin, m: forward cabin (1,07 m deep) plus the midsection behind it. */
export const LM_CABIN_FLOOR = {
  widthM: { value: 1.6, source: CABIN_SOURCES.apolloLm, note: "Estimación: el suelo entre las consolas laterales de un compartimento de 2,34 m" },
  forwardDepthM: LM.cabinDepthM,
  depthM: { value: 1.79, source: CABIN_SOURCES.apolloLm, note: "Derivado: 6,7 m³ / (2,34 m de alto × 1,6 m de ancho); la cabina delantera mide 1,07 m y la sección media el resto" },
} as const;

const FRONT_Z = -0.35;
const MID_Z = FRONT_Z + LM.cabinDepthM.value;
const BACK_Z = FRONT_Z + LM_CABIN_FLOOR.depthM.value;
const HALF_W = LM_CABIN_FLOOR.widthM.value / 2;
/** The commander's and the pilot's stations, 44 in apart (crew-station.ts). */
const STATION_X = CREW_STATION.stationsApartM.value / 2;

/** The LM's cabin at true size (x to starboard, z aft; the commander's eye is over x = −0,56). */
export const LANDER_CABIN_REAL: CabinLayout = {
  floor: {
    minX: -HALF_W,
    maxX: HALF_W,
    minZ: FRONT_Z,
    maxZ: BACK_Z,
    blocked: [
      { minX: -0.35, maxX: 0.35, minZ: MID_Z + 0.13, maxZ: BACK_Z }, // the ascent engine cover in the midsection
    ],
  },
  stations: [
    { id: "asiento", label: "Puesto del comandante", stand: { x: -STATION_X, z: 0.2 }, look: { x: -STATION_X, y: 1.4, z: -0.3 }, what: "De pie, sujeto por los arneses: pilotar, vista por la ventana triangular y cámaras" },
    { id: "mente", label: "Mente del asteroide", stand: { x: STATION_X, z: 0.2 }, look: { x: STATION_X, y: 1.4, z: -0.3 }, what: "En el puesto del piloto del LM: fase, confianza y niveles del asteroide; el duelo cuando se puede" },
    { id: "escotilla", label: "Escotilla delantera", stand: { x: 0, z: -0.2 }, look: { x: 0, y: 0.45, z: -0.35 }, what: "Ponerse el traje, despresurizar la cabina y salir a gatas (solo anclado)" },
    { id: "acople", label: "Escotilla de acople", stand: { x: 0, z: 0.7 }, look: { x: 0, y: 2.2, z: 1.1 }, what: "Desacoplar, asistente de acople y la escotilla del techo (adaptador IDSS)" },
    { id: "ecs", label: "Panel del ECS", stand: { x: -0.6, z: 1.2 }, look: { x: -0.8, y: 1.0, z: 1.2 }, what: "O₂, agua, cartuchos de LiOH y CO₂: el soporte vital propio del módulo" },
    { id: "esterilla", label: "Esterilla", stand: { x: 0.6, z: 1.2 }, look: { x: 0.6, y: 0, z: 1.2 }, what: "Sentarse en loto: ajustes generales" },
  ],
  reachM: 0.25,
  heightM: LM.cabinHeightM.value,
  aisles: [0.45, MID_Z + 0.05],
  habitableM3: LM.habitableM3.value,
};

/**
 * The cabin as played (src/core/presentation.ts): with «Separación: Amplia» the presentation layer spreads
 * the floor plan until the machines are 2 m apart at the drawing scale; with «Real» it is the LM's.
 */
const presented = SPREAD_ON ? spreadLayout(LANDER_CABIN_REAL, WORLD_SCALE, INTERACTABLE_SPACING.minM, (items) => spreadFactor(items)) : { factor: 1, layout: LANDER_CABIN_REAL };

/** How much the floor plan is spread (1 with «Separación: Real»). */
export const CABIN_SPREAD: number = presented.factor;

export const LANDER_CABIN: CabinLayout = presented.layout;
