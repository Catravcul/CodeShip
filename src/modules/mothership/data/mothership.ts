import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import { CODESHIP_RING } from "@modules/gravity/data/ring";
import type { CraftPort, DockingLimits } from "../domain/docking";
import type { MassItem, MothershipSpec } from "../domain/mothership";
import type { ThrusterMount } from "../domain/propulsion";
import { forwardSpanFor } from "../domain/thermal";
import { X3 } from "./thrusters";

// --- Sources -----------------------------------------------------------------
const IDSS_IDD = "International Docking System Standard (IDSS) Interface Definition Document, Rev. F (2022), tabla 3.3.1.1-2 «Initial Contact Conditions»: https://ntrs.nasa.gov/citations/20220011643";
const NEP_MW = "Harnack, C. et al. (2022), «Component-level Performance and Mass Sensitivity Analysis of NEP MW-class Power System», ASCEND 2022: https://ntrs.nasa.gov/api/citations/20220013600/downloads/ASCEND_22_Brayton_Performance_Mass_Sensitivity.pdf";
const B330 = "Bigelow B330 (módulo hinchable, unos 20 t y 330 m³): https://en.wikipedia.org/wiki/B330";
const UNITY = "Nodo Unity de la ISS (11 612 kg): https://en.wikipedia.org/wiki/Unity_(ISS_module)";
const QUEST = "Quest Joint Airlock de la ISS (5,5 m × 4 m; esclusa de equipos y esclusa de tripulación): https://en.wikipedia.org/wiki/Quest_Joint_Airlock";
const PMM = "Módulo permanente multipropósito Leonardo (PMM) de la ISS, almacén de 6,6 m × 4,57 m: https://en.wikipedia.org/wiki/Leonardo_(ISS_module)";
const DESTINY = "Laboratorio Destiny de la ISS (8,5 m × 4,3 m, bastidores con la guantera MSG): https://en.wikipedia.org/wiki/Destiny_(ISS_module)";
const HAYABUSA2 = "Hayabusa2 esperó en su «home position», a unos 20 km de Ryugu, y bajaba desde allí: https://en.wikipedia.org/wiki/Hayabusa2";

/** IDSS initial contact conditions (Rev. F, table 3.3.1.1-2). */
export const IDSS_CONTACT_LIMITS: DockingLimits = {
  closingMinMs: 0.05,
  closingMaxMs: 0.1,
  lateralRateMs: 0.04,
  angularRateDegS: 0.2,
  rollRateDegS: 0.2,
  lateralMisalignM: 0.1,
  angularMisalignDeg: 4,
  rollMisalignDeg: 4,
  sources: [IDSS_IDD],
};

/** Two pods of thrusters at the aft end, above and below the spine. Face size: game values (the 3D model's pods). */
export const THRUSTER_MOUNTS: readonly ThrusterMount[] = [
  { id: "dorsal", name: "Módulo de propulsores dorsal", faceWidthM: 7.5, faceHeightM: 3.4 },
  { id: "ventral", name: "Módulo de propulsores ventral", faceWidthM: 7.5, faceHeightM: 3.4 },
];

const est = (id: string, label: string, kg: number, basis: string, sources: string[] = []): MassItem => ({ id, label, kg, basis, sources });

// --- Habitat ring (the twin is sized from it) ----------------------------------
/** Pressurised volume: the habitat module (12 × 4 × 2.6 m) and the farm deck (18 × 18 × 7 m). */
const PRESSURISED_M3 = 12 * 4 * 2.6 + 18 * 18 * 7;
/** Bigelow B330: ~20 t for 330 m³, about 61 kg per m³ of pressurised volume. */
const SHELL_KG_PER_M3 = 20000 / 330;
/** Eleven 15 m² beds, 0.3 m of substrate at ~1.2 t/m³ wet (estimate), plus four fig planters. */
const SOIL_KG = 11 * 15 * 0.3 * 1200 + 4 * 1000;

const HAB_RING: MassItem[] = [
  est("casco-presurizado", "Módulo habitable y cubierta de cultivo (cascos presurizados)", Math.round(PRESSURISED_M3 * SHELL_KG_PER_M3), `${Math.round(PRESSURISED_M3)} m³ presurizados × 61 kg/m³ (la proporción del B330)`, [B330]),
  est("sustrato", "Sustrato de los bancales y macetas de las higueras", SOIL_KG, "165 m² × 0,3 m × 1,2 t/m³ (sustrato húmedo, estimación) + 4 macetas de 1 t"),
  est("agua-blindaje", "Agua (reserva y blindaje del módulo)", 60000, "Estimación: una capa de agua de ~20 cm alrededor del módulo y de las literas, más la reserva del soporte vital"),
  est("estructura-anillo", "Llanta de celosía y tres radios con ascensor", 50000, "Estimación: unos 110 kg por metro en 350 m de llanta más los radios; carga radial de ~3 MN a 1 g"),
];

const OTHER: MassItem[] = [
  est("cojinetes", "Cojinetes y motores de giro de los dos anillos", 10000, "Estimación"),
  est("espina", "Espina (celosía de 152 m)", 23000, "Estimación: ~150 kg por metro"),
  est("nodo", "Nodo de acople delantero", 11612, "Como el nodo Unity de la ISS", [UNITY]),
  est("energia", "Reactor de fisión, conversión Brayton y radiadores (2 MWe)", 2000 * 19, "2000 kWe × 19 kg/kWe (estudio de NASA para NEP de clase MW)", [NEP_MW]),
  // The thrusters' line is worked out from what is fitted (Mothership.massBudget).
  est("tripulacion", "Doménica y los animales", 58 + 30, "58 kg de Doménica; gatos, perros y gallinas, unos 30 kg"),
];

export const NODRIZA: MothershipSpec = {
  name: "Codeship Nodriza",
  ring: CODESHIP_RING,
  power: {
    electricKw: { value: 2000, source: NEP_MW, note: "Sistema de referencia del estudio: un reactor, cuatro turbinas Brayton y un radiador" },
    specificMassKgPerKw: { value: 19, source: NEP_MW, note: "Intervalo de confianza del 90 %: 18–23 kg/kWe" },
    conversionEfficiency: { value: 0.337, source: NEP_MW },
    radiatorAreaM2: { value: 2760, source: NEP_MW, note: "Intervalo del 90 %: 2300–3500 m². Lo tomamos como área que radia (las dos caras de los paneles): leído como planta, la temperatura media saldría por debajo de la entrada del compresor (ver interiores.md)" },
    radiatorEmissivity: { value: 0.9, source: NEP_MW, note: "Valor nominal de la tabla de supuestos (mínimo 0,8)" },
    coldEndK: { value: 357, source: NEP_MW, note: "Temperatura de entrada al compresor con 1200 K a la entrada de la turbina" },
    sinkK: { value: 4, source: NEP_MW, note: "Espacio profundo con margen (nominal 4 K, máximo 10 K)" },
  },
  propulsion: {
    propellant: "xenon",
    mounts: THRUSTER_MOUNTS,
    // 18 × 99 kW = 1.78 MW to the thrusters; the rest of the 2 MWe runs the ship.
    fitted: [
      { mountId: "dorsal", thruster: X3, count: 9 },
      { mountId: "ventral", thruster: X3, count: 9 },
    ],
    hotelLoadKw: {
      value: 200,
      source: "https://www.nasa.gov/international-space-station/space-station-facts-and-figures/",
      note: "Valor de juego: luces del huerto (~165 m² a ~0,5 kW/m²), soporte vital, motores de los anillos y la vida a bordo. Los 8 paneles de la ISS dan 75–90 kW",
    },
  },
  /** Game value: 150 t of xenon (about two years of world production; see the doc). */
  propellantCapacityKg: 150000,
  habRingItems: HAB_RING,
  otherItems: OTHER,
  layout: {
    lengthM: 152,
    port: { position: new Vec3(0, -2.7, -70), normal: new Vec3(0, -1, 0) },
    nodeZ: -70,
    nodeRadiusM: 2.2,
    spine: { fromZ: -76, toZ: 76, radiusM: 1.5 },
    habRingZ: -42,
    twinRingZ: -20,
    // Two two-sided wings: their planform is half the radiating area, 690 m² each. Trapezoids, narrow
    // toward the reactor so they stay in the shield's shadow (game layout; the area is the study's).
    radiator: { fromZ: 4, toZ: 50, innerX: 3, spanAftM: 8, spanM: forwardSpanFor(2760 / 4, 46, 8) },
    reactorZ: 74,
    // Shadow cone half-angle: a game value, the smallest round number that covers both rings' rims.
    shield: { halfAngleDeg: 35, nearZ: 72, farZ: 70.5 },
    thrusterZ: 54,
    spineModules: [
      { id: "esclusa", name: "Esclusa", fromZ: -65.5, toZ: -60.5, radiusM: 1.9, reference: QUEST },
      { id: "almacen", name: "Almacén", fromZ: -60.5, toZ: -54, radiusM: 2.1, reference: PMM },
      { id: "taller", name: "Taller", fromZ: -54, toZ: -46, radiusM: 2.0, reference: DESTINY },
    ],
  },
  parkingDistanceM: {
    value: 1350,
    source: HAYABUSA2,
    note: "Valor de juego: la zona de vuelo está comprimida. Hayabusa2 esperaba a ~20 km de Ryugu",
  },
};

/** Push the docking springs give the probe when it undocks, m/s. Game value inside the IDSS window. */
export const UNDOCK_PUSH_MS: Sourced<number> = { value: 0.08, source: IDSS_IDD, note: "Valor de juego dentro de la ventana de 0,05–0,10 m/s del contacto" };

/**
 * The mothership's own IDSS port, on the tip of the forward node (axial, looking ahead), so it can
 * dock nose-first to a station like a visiting vehicle to the ISS. Game value for the position.
 */
export const NODRIZA_NOSE_PORT: CraftPort = { position: new Vec3(0, 0, -76.7), axis: new Vec3(0, 0, -1), forward: new Vec3(0, -1, 0) };
