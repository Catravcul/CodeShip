import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { Reality } from "@core/reality";
import type { ShipDesign } from "../domain/ship";
import type { Equipment } from "../domain/equipment";
import type { ThrusterModel } from "../domain/components";
import { buildQuadRcsLayout } from "../domain/rcs-layout";
import { BATTERY_AGZN, EQ_SRC, POWER_NONE, SHIELD_NONE } from "./equipment";

/**
 * The player's lander is the Apollo Lunar Module (Berón, 2026-11-16: «módulo de aterrizaje: módulo lunar
 * Apolo, ~4,3 t en seco»). Real numbers with their source; what the game keeps, adapts or licenses is
 * labelled (docs/design/modulo-lunar-juventas.md). Checked 2026-11-16.
 */
export const LM_SRC = {
  lm: "https://en.wikipedia.org/wiki/Apollo_Lunar_Module",
  ecs: "https://ntrs.nasa.gov/api/citations/19720013195/downloads/19720013195.pdf",
  lioh: "https://dashboard.si.edu/object/cartridge-lithium-hydroxide-canister-lunar-module:nasm_A20020434000",
  nds: EQ_SRC.nds,
} as const;

/** One number of the LM with its source and how it is used in the game. */
export interface LmFact extends Sourced<number> {
  readonly reality: Reality;
}

const real = (value: number, source: string, note: string): LmFact => ({ value, source, note, reality: "real" });

/** The LM as flown (standard version, Apollo 9–14, unless the note says otherwise). */
export const LM = {
  dryKg: real(4280, LM_SRC.lm, "En seco, versión estándar (4920 kg la extendida de Apolo 15–17)"),
  launchKg: real(15200, LM_SRC.lm, "Al lanzar, versión estándar"),
  ascentDryKg: real(2150, LM_SRC.lm, "Etapa de ascenso en seco"),
  descentDryKg: real(4280 - 2150, LM_SRC.lm, "Derivado: 4280 − 2150 kg de la etapa de ascenso"),
  dpsPropellantKg: real(8200, LM_SRC.lm, "Propelente del motor de descenso (cuatro tanques)"),
  apsPropellantKg: real(2353, LM_SRC.lm, "Propelente del motor de ascenso (dos tanques)"),
  rcsPropellantKg: real(287, LM_SRC.lm, "Propelente del RCS"),
  heightM: real(7.04, LM_SRC.lm, "Alto total con las patas"),
  bodyWidthM: real(4.22, LM_SRC.lm, "Diámetro sin las patas"),
  gearSpanM: real(9.4, LM_SRC.lm, "Ancho con las patas desplegadas"),
  ascentHeightM: real(2.832, LM_SRC.lm, "Etapa de ascenso: alto"),
  ascentWidthM: real(4.29, LM_SRC.lm, "Etapa de ascenso: ancho"),
  ascentDepthM: real(4.04, LM_SRC.lm, "Etapa de ascenso: fondo"),
  descentHeightM: real(3.231, LM_SRC.lm, "Etapa de descenso: alto, sin las sondas de contacto de 1,707 m"),
  dpsThrustN: real(45040, LM_SRC.lm, "10 125 lbf a pleno empuje"),
  dpsMinThrottle: real(0.1, LM_SRC.lm, "Regulable del 10 % al 60 % (y fijo a pleno)"),
  dpsIspS: real(311, LM_SRC.lm, "Aerozine 50 y tetróxido de nitrógeno"),
  apsThrustN: real(16000, LM_SRC.lm, "3500 lbf, empuje fijo"),
  apsIspS: real(311, LM_SRC.lm, "Aerozine 50 y tetróxido de dinitrógeno"),
  rcsJets: real(16, LM_SRC.lm, "Dieciséis toberas en cuatro grupos (quads)"),
  rcsThrustN: real(440, LM_SRC.lm, "100 lbf cada tobera"),
  rcsIspS: real(290, LM_SRC.lm, "Aerozine 50 y tetróxido de dinitrógeno"),
  cabinM3: real(6.7, LM_SRC.lm, "Volumen de la cabina de la tripulación (235 ft³)"),
  habitableM3: real(4.5, LM_SRC.lm, "Volumen habitable (160 ft³)"),
  cabinHeightM: real(2.34, LM_SRC.lm, "Alto del compartimento (7 ft 8 in)"),
  cabinDepthM: real(1.07, LM_SRC.lm, "Fondo de la cabina delantera (3 ft 6 in)"),
  cabinKPa: real(33, LM_SRC.lm, "100 % oxígeno a 4,8 psi"),
  forwardHatchM: real(0.81, LM_SRC.lm, "Escotilla delantera de 32 × 32 in para salir a la superficie"),
} as const;

/**
 * What the game keeps, adapts or licenses of the LM (docs/design/modulo-lunar-juventas.md, «Qué se
 * adapta»). Each line is shown on the catalogue card and in the docs.
 */
export const LM_ADAPTATIONS: readonly { readonly what: string; readonly reality: Reality; readonly why: string }[] = [
  { what: "Las dos etapas no se separan", reality: "real", why: "En un asteroide la gravedad es millonésimas de la lunar: el motor de descenso basta para volver y la etapa de descenso vuelve con la de ascenso. El LM podía volar entero (Apolo 13 usó el de descenso como motor de vuelta)" },
  { what: "El motor de ascenso (APS) no se enciende", reality: "real", why: "Va a bordo con su masa; sin separar las etapas no hace falta. Queda como motor de aborto en la ficha" },
  { what: "Un solo depósito de propelente", reality: "licencia", why: "El LM tenía tanques de descenso (8200 kg), de ascenso (2353 kg) y del RCS (287 kg); el juego los junta en uno" },
  { what: "MMH en vez de Aerozine 50", reality: "licencia", why: "La estación produce MMH/NTO; la Aerozine 50 (50 % UDMH y 50 % hidracina) rinde casi igual (311 s)" },
  { what: "Adaptador de acople IDSS en el techo", reality: "licencia", why: "El LM se acoplaba con sonda y cono (drogue) al módulo de mando; Starship y la ISS usan la norma IDSS. Añade la masa del NDS (340 kg)" },
  { what: "Toberas del RCS a la altura del centro de masas", reality: "licencia", why: "En el LM real los quads están algo por encima: así trasladar no lo hace girar" },
  { what: "Se posa con el RCS", reality: "real", why: "Con el 10 % mínimo del motor de descenso empuja 4,5 kN: 0,3 m/s² contra los ~6 µm/s² de Bennu. Para tocar suelo basta el RCS (0,06–0,12 m/s²)" },
];

/** Aerozine 50/NTO in the LM; the game burns the station's MMH/NTO (LM_ADAPTATIONS). */
const LM_PROPELLANT = "MMH/NTO" as const;

/** Descent engine (DPS), the main engine: throttleable down to 10 %, pointing down through the belly. */
export const LM_DPS: ThrusterModel = {
  id: "lm-dps",
  name: "Motor de descenso del LM (DPS, 45 kN regulable)",
  thrustN: LM.dpsThrustN.value,
  ispS: LM.dpsIspS.value,
  dryMassKg: 0, // in the descent stage's mass
  propellant: LM_PROPELLANT,
  minThrottle: LM.dpsMinThrottle.value,
  sources: [LM_SRC.lm],
};

/** One of the 16 RCS jets (Marquardt R-4D, 100 lbf). Its mass is in the ascent stage's. */
export const LM_RCS_JET: ThrusterModel = {
  id: "lm-rcs",
  name: "Tobera del RCS del LM (R-4D, 440 N)",
  thrustN: LM.rcsThrustN.value,
  ispS: LM.rcsIspS.value,
  dryMassKg: 0,
  propellant: LM_PROPELLANT,
  sources: [LM_SRC.lm],
};

/**
 * Game box of the LM: the body width (4,22 m) and the height without the leg strokes (the contact
 * code adds GEAR_LEG_M = 0,5 m of legs under the belly, so it stands 7,04 m tall). Used for inertia and contact.
 */
export const LM_HULL = new Vec3(LM.bodyWidthM.value, LM.heightM.value - 0.5, LM.bodyWidthM.value);

/** RCS quads off the thrust axis, m: on outriggers at the corners of the ascent stage (4,29 m wide). Estimate. */
export const LM_QUAD_RADIUS_M: Sourced<number> = { value: 2.2, source: LM_SRC.lm, note: "Estimación: la mitad del ancho de la etapa de ascenso (4,29 m) más el brazo del quad" };

/** The LM's own parts: its two stages (dry), the ascent batteries and the IDSS adapter. */
export const LM_EQUIPMENT: readonly Equipment[] = [
  {
    id: "lm-etapa-ascenso",
    name: "Etapa de ascenso del LM (cabina, APS, RCS, aviónica y ECS)",
    kind: "cabina",
    massKg: LM.ascentDryKg.value - BATTERY_AGZN.massKg,
    powerW: -1200,
    materials: "Aluminio fresado químicamente, mantas térmicas de Kapton y Mylar",
    size: "2,83 × 4,29 × 4,04 m",
    flight: "Seis alunizajes (1969–1972)",
    basis: `Derivado: 2150 kg en seco de la etapa de ascenso − sus dos baterías (${BATTERY_AGZN.massKg} kg, aparte). El consumo medio de 1,2 kW es una estimación: 75 h con las baterías de descenso y ascenso`,
    sources: [LM_SRC.lm],
  },
  {
    id: "lm-etapa-descenso",
    name: "Etapa de descenso del LM (DPS, tanques, patas, baterías y agua)",
    kind: "estructura",
    massKg: LM.descentDryKg.value,
    powerW: 0,
    materials: "Aluminio, patas de panal de aluminio aplastable, mantas doradas",
    size: "3,23 m de alto, 4,22 m sin patas, 9,4 m con ellas",
    flight: "Seis alunizajes; se quedaba en la Luna como plataforma de lanzamiento",
    basis: "Derivado: 4280 − 2150 kg (la fuente no da su masa en seco por separado)",
    sources: [LM_SRC.lm],
  },
  BATTERY_AGZN,
  POWER_NONE,
  SHIELD_NONE,
  {
    id: "adaptador-idss-lm",
    name: "Adaptador de acople IDSS en la escotilla del techo (licencia: el LM usaba sonda y cono)",
    kind: "acople",
    massKg: 340,
    powerW: 0,
    materials: "Anillo de acople andrógino, pestillos y amortiguadores",
    flight: "El NDS de la NASA (norma IDSS) vuela en Starliner; nunca en un LM",
    basis: "Copiado: el NDS pesa unos 340 kg. Es nuestra adaptación para acoplar a Starship y a la ISS",
    sources: [LM_SRC.nds],
  },
];

export const LM_PROPELLANT_KG = LM.dpsPropellantKg.value + LM.apsPropellantKg.value + LM.rcsPropellantKg.value;

/** The player's lander: the Apollo LM as one vehicle (no staging), docking through an IDSS adapter on top. */
export function lunarModuleDesign(): ShipDesign {
  const half = LM_HULL.scale(0.5);
  return {
    hull: { name: "Módulo lunar", size: LM_HULL },
    tanks: [{ spec: { propellant: LM_PROPELLANT, capacityKg: LM_PROPELLANT_KG, dryMassKg: 0 }, fillKg: LM_PROPELLANT_KG }],
    // The DPS bell under the descent stage, pushing up through the belly.
    mainEngines: [{ model: LM_DPS, position: new Vec3(0, -half.y + 0.8, 0), direction: Vec3.Y }],
    rcs: buildQuadRcsLayout(LM_RCS_JET, LM_QUAD_RADIUS_M.value),
    equipment: LM_EQUIPMENT,
    // The overhead hatch with the IDSS adapter: the LM hangs under Starship's port or the ISS's zenith IDA.
    dockingPort: new Vec3(0, half.y + 0.3, 0.2),
    look: "apollo-lm",
    anchors: true,
  };
}
