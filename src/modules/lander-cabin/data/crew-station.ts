import type { Sourced } from "@core/units";
import type { Reality } from "@core/reality";

/**
 * The LM's crew stations as flown (docs/design/cabina-lm.md): the commander flies standing at the left,
 * held by restraint cables and armrests, looking out of the left triangular window, with the attitude
 * controller (ACA) in the right hand and the thrust/translation controller (TTCA) in the left; the
 * docking (overhead rendezvous) window is above him, with the COAS on its frame. The panels are numbered
 * as in the LM: 1 and 2 at eye level inboard of each station, 3 and 4 in the middle (4 holds the DSKY),
 * 5 and 6 at the waist in front of each station, 8, 11 on the commander's left and 12, 14, 16 on the
 * pilot's right. Positions are in the cabin's frame (x to starboard, z aft, y up from the floor), real
 * metres; what the sources do not give is an estimate from the photographs and says so.
 */
export const CREW_STATION_SOURCES = {
  newsReference:
    "Grumman, LM News Reference (1969), «Crew compartment»: cabina de 92 in de diámetro y 42 in de fondo, puestos a 44 in entre ejes, suelo de 36 × 55 in, dos ventanas triangulares de ~2 ft² inclinadas hacia abajo y a los lados, ventana de acople de ~80 in² sobre el comandante, paneles a la altura de los ojos, en medio y a la cintura, controladores y reposabrazos por puesto, sujeciones y velcro en las botas: https://www.nasa.gov/wp-content/uploads/static/history/alsj//LM04_Lunar_Module_ppLV1-17.pdf",
  panels:
    "Apollo 11 Flight Plan / LM controls: qué lleva cada panel (1: FDAI, X-pointer, ALT/ALT RATE, temporizadores, empuje, T/W, propelente y avisos rojos; 2: lo mismo del piloto, RCS, ECS y avisos ámbar; 3: radar, estabilización y temporizador de eventos; 4: DSKY; 5: temporizador de misión y arranque/parada del motor; 6: AGS (DEDA); 8: pirotecnia, audio e interruptor del COAS): https://apollo11guide.com/Apollo11ManualFree/LunarLander/Lunar_Module_Control_Panel_1.htm",
  displays: "NASA TN D-6722, LM displays and controls: matrices de avisos rojas en el panel 1 y ámbar en el panel 2; cintas de altitud y distancia: https://www.nasa.gov/wp-content/uploads/static/history/alsj/tnD6722LMDisplayControl.pdf",
} as const;

const IN = 0.0254;
const FT2 = 0.0929;
const SRC = CREW_STATION_SOURCES.newsReference;

export interface StationFact extends Sourced<number> {
  readonly reality: Reality;
}
const real = (value: number, note: string, source: string = SRC): StationFact => ({ value, source, note, reality: "real" });
const estimate = (value: number, note: string, source: string = SRC): StationFact => ({ value, source, note: `Estimación: ${note}`, reality: "real" });

/** The numbers of the crew station. */
export const CREW_STATION = {
  stationsApartM: real(44 * IN, "Ejes de los puestos del comandante y del piloto: 44 in"),
  compartmentDiameterM: real(92 * IN, "Cabina cilíndrica de 92 in de diámetro"),
  compartmentDepthM: real(42 * IN, "y 42 in de fondo"),
  floorWidthM: real(55 * IN, "Suelo de los puestos: 36 × 55 in"),
  floorDepthM: real(36 * IN, "Suelo de los puestos: 36 × 55 in"),
  forwardWindowM2: real(2 * FT2, "Cada ventana triangular: unos 2 ft² de vista"),
  dockingWindowM2: real(80 * IN * IN, "Ventana de acople sobre el comandante: unos 80 in²"),
  /** The window's legs (a right triangle of the real area, 0,186 m²): wide at the top, its point down and outboard. */
  forwardWindowWidthM: estimate(0.66, "catetos del triángulo de 2 ft² sacados de las fotos (ancho arriba)"),
  forwardWindowHeightM: estimate(0.56, "catetos del triángulo de 2 ft² sacados de las fotos (alto por fuera)"),
  forwardWindowBottomM: estimate(1.1, "punta baja de la ventana: el ojo (1,45 m) queda dentro y ve hacia abajo, como en las fotos del puesto"),
  dockingWindowWidthM: estimate(0.32, "rectángulo de 80 in²; la fuente no da la forma"),
  dockingWindowDepthM: estimate(0.16, "rectángulo de 80 in²; la fuente no da la forma"),
  /** The docking window is a little forward of the commander's head. */
  dockingWindowForwardM: estimate(0.12, "sobre la cabeza del comandante, algo delante"),
  forwardHatchM: real(32 * IN, "Escotilla delantera de unos 32 in de lado"),
} as const;

export type PanelId = "1" | "2" | "3" | "4" | "5" | "6" | "8" | "11" | "12" | "14" | "16";

/** One panel: where it is (centre), its face (w × h) and the wall it hangs on. */
export interface LmPanel {
  readonly id: PanelId;
  readonly name: string;
  readonly holds: string;
  /** "front": on the front wall, facing aft; "left"/"right": on a side wall, facing inboard. */
  readonly wall: "front" | "left" | "right";
  /** Centre: x across (front) or z along (sides), y up, m. */
  readonly at: { readonly x: number; readonly y: number; readonly z: number };
  readonly wM: number;
  readonly hM: number;
  /** Turned toward its station about the vertical, rad (front panels only). */
  readonly yawRad?: number;
  /** What it holds and where: real (the sources); its size and exact place: estimated from the photographs. */
  readonly reality: Reality;
  readonly source: string;
  readonly note: string;
}

const HALF = CREW_STATION.stationsApartM.value / 2;

/** The LM's panels, real sizes estimated from the photographs (the sources give what each holds and where, not their size). */
const PANEL_BASIS = { reality: "real", source: CREW_STATION_SOURCES.panels, note: "Qué lleva y dónde va: real (fuentes). Tamaño y sitio exacto: estimación de las fotos" } as const;

export const LM_PANELS: readonly LmPanel[] = (<Omit<LmPanel, "reality" | "source" | "note">[]>[
  { id: "1", name: "Panel 1 (comandante)", holds: "FDAI, X-pointer, cintas ALT/ALT RATE, temporizadores de misión y de eventos, empuje, T/W, propelente del motor principal y avisos rojos", wall: "front", at: { x: -0.3, y: 1.36, z: 0 }, wM: 0.36, hM: 0.44, yawRad: 0.3 },
  { id: "2", name: "Panel 2 (piloto)", holds: "FDAI, X-pointer, RCS (temperatura, presión y cantidad), ECS y avisos ámbar", wall: "front", at: { x: 0.3, y: 1.36, z: 0 }, wM: 0.36, hM: 0.44, yawRad: -0.3 },
  { id: "3", name: "Panel 3", holds: "Radar de encuentro, estabilización y control, temporizador de eventos", wall: "front", at: { x: 0, y: 1.12, z: 0 }, wM: 0.36, hM: 0.14 },
  { id: "4", name: "Panel 4 (DSKY)", holds: "DSKY del ordenador de guiado: PROG, VERB, NOUN y tres registros", wall: "front", at: { x: 0, y: 0.93, z: 0 }, wM: 0.24, hM: 0.22 },
  { id: "5", name: "Panel 5 (comandante, cintura)", holds: "Temporizador de misión, arranque y parada del motor, +X y luces", wall: "front", at: { x: -HALF - 0.06, y: 1.0, z: 0 }, wM: 0.36, hM: 0.16 },
  { id: "6", name: "Panel 6 (piloto, cintura)", holds: "AGS: DEDA con su teclado y la parada del motor", wall: "front", at: { x: HALF + 0.06, y: 0.9, z: 0 }, wM: 0.36, hM: 0.16 },
  { id: "8", name: "Panel 8", holds: "Pirotecnia, tren de aterrizaje, audio e interruptor del COAS", wall: "left", at: { x: 0, y: 1.15, z: 0.15 }, wM: 0.4, hM: 0.32 },
  { id: "11", name: "Panel 11 (disyuntores)", holds: "Cinco filas de disyuntores", wall: "left", at: { x: 0, y: 1.75, z: 0.15 }, wM: 0.4, hM: 0.36 },
  { id: "12", name: "Panel 12", holds: "Comunicaciones", wall: "right", at: { x: 0, y: 0.75, z: 0.15 }, wM: 0.4, hM: 0.24 },
  { id: "14", name: "Panel 14", holds: "Potencia eléctrica (EPS)", wall: "right", at: { x: 0, y: 1.15, z: 0.15 }, wM: 0.4, hM: 0.3 },
  { id: "16", name: "Panel 16 (disyuntores)", holds: "Cuatro filas de disyuntores", wall: "right", at: { x: 0, y: 1.75, z: 0.15 }, wM: 0.4, hM: 0.36 },
]).map((p) => ({ ...p, ...PANEL_BASIS }));

/**
 * Where her body meets the station (relative to where she stands, real size: they are not scaled): the
 * armrests at the hips, the ACA in the right hand, the TTCA in the left, and the restraint cables from
 * the floor to the hips.
 */
export const STATION_BODY = {
  armrestY: 0.95,
  armrestSideM: 0.26,
  controllerY: 1.0,
  controllerForwardM: 0.24,
  controllerSideM: 0.26,
  restraintY: 0.95,
  reality: "real" as Reality,
  note: "Estimación: alturas y distancias sacadas de las fotos",
  source: "Estimación a partir de las fotos del puesto (reposabrazos a la cadera, ACA a la derecha, TTCA a la izquierda): " + SRC,
} as const;
