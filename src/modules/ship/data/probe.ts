import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { Reality } from "@core/reality";
import type { ShipDesign } from "../domain/ship";
import type { Equipment } from "../domain/equipment";
import type { ThrusterModel } from "../domain/components";
import { buildRcsLayout } from "../domain/rcs-layout";

/**
 * The uncrewed probe ("sonda") is Juventas, the real 6U-XL cubesat of ESA's Hera mission (Berón,
 * 2026-11-16: «sonda: Juventas, 12 kg; el plano de 30 kg desaparece»). The mothership carries it, lets
 * it go near an asteroid and pilots it remotely to set it down for the first contact with the
 * asteroid's mind (docs/design/subyugacion.md). Real numbers with their source; estimates and licences
 * labelled (docs/design/modulo-lunar-juventas.md). Checked 2026-11-16.
 */
export const PROBE_SRC = {
  juventas: "https://www.heramission.space/hera-mission-juventas-cubesat",
  spaceOps: "https://publications.spaceops.org/2025/download_by_id.php?id=0005",
  landing: "https://smallsatnews.com/2024/03/29/esa-radar-journey-to-centre-of-heras-asteroid-with-juventas-cubesat/",
  epsc: "https://meetingorganizer.copernicus.org/EPSC2021/EPSC2021-750.html",
  nanoProp: "https://gomspace.com/UserFiles/Subsystems/flyer/Flyer_NanoProp_6DOF.pdf",
  heraCubesats: "https://phys.org/news/2023-11-esa-hera-mission-cubesats-theyll.amp",
  mascot: "https://www.dlr.de/en/research-and-transfer/projects-and-missions/hayabusa2/the-mascot-lander",
  canadarm2: "https://en.wikipedia.org/wiki/Mobile_Servicing_System",
} as const;

export interface ProbeFact extends Sourced<number> {
  readonly reality: Reality;
}
const fact = (value: number, source: string, note: string, reality: Reality = "real"): ProbeFact => ({ value, source, note, reality });

/** Juventas as published. */
export const JUVENTAS = {
  wetKg: fact(12, PROBE_SRC.juventas, "Masa húmeda en la web de Hera (10,95 kg en el artículo de SpaceOps 2025)"),
  sizeM: { value: [0.37, 0.23, 0.1] as const, source: PROBE_SRC.juventas, note: "6U-XL: 37 × 23 × 10 cm" },
  thrusters: fact(8, PROBE_SRC.spaceOps, "Ocho propulsores de gas frío"),
  thrustN: fact(0.001, PROBE_SRC.spaceOps, "1 mN cada uno"),
  ispS: fact(50, PROBE_SRC.spaceOps, "Impulso específico del gas frío"),
  propellantKg: fact(0.122, PROBE_SRC.nanoProp, "Estimación: la carga de butano de un módulo NanoProp de GomSpace (122 g); la ESA no publica la de Juventas", "licencia"),
  reactionWheels: fact(4, PROBE_SRC.spaceOps, "Cuatro ruedas de reacción para orientarse"),
  juraMhz: fact(60, PROBE_SRC.juventas, "Radar JuRa de baja frecuencia: portadora de 60 MHz, cuatro antenas de 1,5 m"),
  juraKg: fact(1.3, PROBE_SRC.juventas, "JuRa: menos de 1300 g"),
  juraBoomM: fact(1.5, PROBE_SRC.juventas, "Cuatro antenas desplegables de 1,5 m"),
  grassKg: fact(0.38, PROBE_SRC.juventas, "Gravímetro GRASS de tres ejes: menos de 380 g"),
  grassAccuracyMgal: fact(0.002, PROBE_SRC.juventas, "GRASS: precisión mejor que 0,002 mGal en la superficie"),
  landingMs: fact(0.02, PROBE_SRC.landing, "Toca el suelo a «centímetros por segundo»; tomamos 2 cm/s"),
  surfaceOrbits: fact(2, PROBE_SRC.epsc, "En la superficie mide con GRASS durante dos órbitas de Dimorfo (11,9 h cada una)"),
  maxRangeKm: fact(60, PROBE_SRC.spaceOps, "Debe quedarse a menos de 60 km de Hera para el enlace entre satélites"),
} as const;

/** Juventas: 6U-XL, 37 × 23 × 10 cm (x = 23 cm wide, y = 10 cm tall, z = 37 cm long). */
export const PROBE_HULL = new Vec3(JUVENTAS.sizeM.value[1], JUVENTAS.sizeM.value[2], JUVENTAS.sizeM.value[0]);

/** Its butane, kg (estimate: one GomSpace module's load). */
export const PROBE_PROPELLANT_KG: Sourced<number> = JUVENTAS.propellantKg;

/** One of Juventas's eight cold-gas thrusters (1 mN, 50 s). */
export const JUVENTAS_THRUSTER: ThrusterModel = {
  id: "juventas-gas-frio",
  name: "Propulsor de gas frío de Juventas (1 mN)",
  thrustN: JUVENTAS.thrustN.value,
  ispS: JUVENTAS.ispS.value,
  dryMassKg: 0,
  propellant: "Butano",
  sources: [PROBE_SRC.spaceOps, PROBE_SRC.nanoProp],
};

/**
 * Juventas turns with four reaction wheels, not with gas. The game draws them as the rotation couples of
 * its RCS layout with a model that spends nothing: about 2 mN·m per axis (a couple of 6 mN at ±0,18 m),
 * the order of a cubesat wheel. Estimate.
 */
export const JUVENTAS_WHEELS: ThrusterModel = {
  id: "juventas-ruedas",
  name: "Ruedas de reacción de Juventas (≈2 mN·m)",
  thrustN: 0.006,
  ispS: Number.POSITIVE_INFINITY,
  dryMassKg: 0,
  propellant: "Butano",
  sources: [PROBE_SRC.spaceOps],
};

const DRY_KG = JUVENTAS.wetKg.value - JUVENTAS.propellantKg.value;
const PROP_MODULE_KG = 0.682;
const BATTERY_KG = 1;

/** Juventas's parts. Masses add up to its 12 kg less the butane (`Ship.dryMassKg`). */
export const PROBE_EQUIPMENT: readonly Equipment[] = [
  {
    id: "juventas-bus",
    name: "Bus 6U-XL de Juventas (estructura, ordenador, radio entre satélites, IMU con acelerómetros, ruedas, cámara, altímetro láser)",
    kind: "estructura",
    massKg: Math.round((DRY_KG - JUVENTAS.juraKg.value - JUVENTAS.grassKg.value - PROP_MODULE_KG - BATTERY_KG) * 1000) / 1000,
    powerW: -12,
    materials: "Aluminio, placas de circuito, paneles solares desplegables",
    size: "37 × 23 × 10 cm",
    flight: "Juventas viaja en Hera (lanzada el 7-10-2024); intentará posarse en Dimorfo al final de su misión",
    basis: "Derivado: 12 kg − el butano − JuRa − GRASS − el módulo de gas frío − la batería. El consumo medio de 12 W es una estimación (MASCOT: 200 Wh en unas 16 h)",
    sources: [PROBE_SRC.juventas, PROBE_SRC.spaceOps, PROBE_SRC.mascot],
  },
  {
    id: "jura",
    name: "Radar JuRa (60 MHz, cuatro antenas de 1,5 m)",
    kind: "avionica",
    massKg: JUVENTAS.juraKg.value,
    powerW: 0,
    materials: "Electrónica de radio y antenas de cinta desplegables",
    size: "Menos de 1U de electrónica",
    flight: "En Hera, rumbo a Didymos",
    basis: "Copiado: menos de 1300 g; secuencias de 45 min con 15 m de resolución",
    sources: [PROBE_SRC.juventas],
  },
  {
    id: "grass",
    name: "Gravímetro GRASS (tres ejes)",
    kind: "avionica",
    massKg: JUVENTAS.grassKg.value,
    powerW: 0,
    materials: "Acelerómetros de precisión en un bloque de menos de 0,2U",
    flight: "El primer gravímetro que medirá en la superficie de un asteroide",
    basis: "Copiado: menos de 380 g, 50 mGal de rango, precisión mejor que 0,002 mGal",
    sources: [PROBE_SRC.juventas],
  },
  {
    id: "juventas-gas-frio",
    name: "Módulo de gas frío (8 propulsores de 1 mN)",
    kind: "avionica",
    massKg: PROP_MODULE_KG,
    powerW: 0,
    materials: "Toberas MEMS de silicio, depósito de butano",
    flight: "GomSpace NanoProp: voló en GOMX-4B (2018)",
    basis: "Estimación: la masa en seco de un módulo NanoProp de GomSpace (682 g). Juventas lleva 8 propulsores de 1 mN e Isp de 50 s (copiado)",
    sources: [PROBE_SRC.nanoProp, PROBE_SRC.spaceOps],
  },
  {
    id: "bateria-juventas",
    name: "Batería de ion-litio (200 Wh)",
    kind: "bateria",
    massKg: BATTERY_KG,
    powerW: 0,
    storageWh: 200,
    rechargeable: true,
    materials: "Células de ion-litio",
    flight: "MASCOT (Hayabusa2) trabajó 17 h 7 min en Ryugu con 200 Wh",
    basis: "Estimación: la ESA no publica la batería de Juventas; se toman los 200 Wh de MASCOT a unos 200 Wh/kg",
    sources: [PROBE_SRC.mascot],
  },
];

/** Average draw of the probe in flight or parked, W (bus + propulsion module). */
export const PROBE_LOAD_W = -PROBE_EQUIPMENT.reduce((s, e) => s + Math.min(0, e.powerW), 0);
export const PROBE_BATTERY_WH = PROBE_EQUIPMENT.find((e) => e.kind === "bateria")!.storageWh!;

/**
 * Remote piloting from the travel ship. Light needs 4.5 µs to cover 1.35 km: at these distances the
 * delay is negligible and the probe answers at once (Hera relays Juventas over an S-band link).
 */
export const PROBE_LINK_DELAY_S = 1350 / 299_792_458;

/**
 * Juventas's physics step, s: its forces are 10⁵ times smaller than the LM's, so 12 Hz is as exact as
 * 120 Hz and its hours-long legs on 1 mN cost ten times fewer steps. Game value.
 */
export const PROBE_STEP_S = 1 / 12;

/** Hera carries two cubesats (Juventas and Milani); the mothership carries two Juventas. Game value on a real pattern. */
export const PROBES_ON_BOARD = 2;

/**
 * Juventas as a craft. Its eight 1 mN cold-gas thrusters are drawn as the game's decoupled RCS layout
 * (buildRcsLayout, the simplification every craft uses) for translation, with its reaction wheels for
 * rotation, and two of them aft as its «main engine». No anchors: it bounces and settles.
 */
export function probeDesign(serial = 1): ShipDesign {
  return {
    hull: { name: `Juventas ${serial}`, size: PROBE_HULL },
    tanks: [{ spec: { propellant: "Butano", capacityKg: PROBE_PROPELLANT_KG.value, dryMassKg: 0 }, fillKg: PROBE_PROPELLANT_KG.value }],
    mainEngines: [-1, 1].map((sx) => ({ model: JUVENTAS_THRUSTER, position: new Vec3((sx * PROBE_HULL.x) / 4, 0, PROBE_HULL.z / 2), direction: new Vec3(0, 0, -1) })),
    // Translation on the cold-gas thrusters; rotation on the wheels (no gas).
    rcs: buildRcsLayout(JUVENTAS_THRUSTER, PROBE_HULL).map((t) => (t.role === "rotation" ? { ...t, model: JUVENTAS_WHEELS } : t)),
    equipment: PROBE_EQUIPMENT,
    look: "juventas",
    anchors: false,
  };
}
