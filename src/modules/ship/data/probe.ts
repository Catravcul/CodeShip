import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { ShipDesign } from "../domain/ship";
import type { Equipment } from "../domain/equipment";
import type { ThrusterModel } from "../domain/components";
import { buildRcsLayout } from "../domain/rcs-layout";

/**
 * The uncrewed probe ("sonda"): a cubesat-class craft the travel ship carries, launches and pilots
 * remotely to park it on an asteroid for the first, most dangerous contact with its mind
 * (docs/design/subyugacion.md). Built from real small-spacecraft hardware; numbers copied from a
 * source say so, derived ones show the working, estimates and game values are labelled.
 * An OSIRIS-REx-class spacecraft (2 t) is far too big to ride on the travel ship; ESA's Hera carries
 * two 6U-XL cubesats (Juventas and Milani) to the Didymos system and Juventas will try to land on
 * Dimorphos: that is the model. Checked 2026-11-13.
 */
export const PROBE_SRC = {
  juventas: "https://www.heramission.space/hera-mission-juventas-cubesat",
  heraCubesats: "https://phys.org/news/2023-11-esa-hera-mission-cubesats-theyll.amp",
  mps120xw: "https://www.environmental-expert.com/products/model-mps-120xw-cubesat-high-impulse-adaptable-528975",
  mps120Engines: "https://www.aerospacemanufacturinganddesign.com/news/aerojet-rocketdyne-3d-printed-rocket-121814",
  mps120Satcatalog: "https://www.satcatalog.com/component/mps-120-2u",
  hydrazineIsp: "https://core.ac.uk/download/334990715.pdf",
  mascot: "https://www.dlr.de/en/research-and-transfer/projects-and-missions/hayabusa2/the-mascot-lander",
  lunarFlashlight: "https://ssdl1.gatech.edu/sites/default/files/ssdl-files/papers/conferencePapers/SSC22-II-06.pdf",
  canadarm2: "https://en.wikipedia.org/wiki/Mobile_Servicing_System",
} as const;

/** Juventas: 6U-XL, 37 × 23 × 10 cm, 12 kg (Hera mission site). The MPS-120 sits under it. */
const BUS_M = { x: 0.23, z: 0.37, y: 0.1 };
/** MPS-120XW: 20 × 10 × 11,35 cm. Bolted under the bus, it makes the box 0,21 m tall. */
const PROP_M = { y: 0.1135 };
export const PROBE_HULL = new Vec3(BUS_M.x, BUS_M.y + PROP_M.y, BUS_M.z);

/** MPS-120XW: «<3.2 kg wet, <2.4 kg dry»: the difference is its hydrazine load. Derived. */
export const PROBE_HYDRAZINE_KG: Sourced<number> = { value: 0.8, source: PROBE_SRC.mps120xw, note: "3,2 kg húmedo − 2,4 kg seco (cotas máximas de la hoja)" };

/**
 * One of the MPS-120's four hydrazine thrusters. The sheet gives 2.79 N at the start of blowdown and
 * 0.26 N at its end; the game uses the low end so the probe always has the thrust it promises.
 * Hydrazine Isp of small thrusters: 190 s (LFPS paper, table 1). Their mass is in the module's.
 */
export const MPS120_THRUSTER: ThrusterModel = {
  id: "aerojet-mps-120-thruster",
  name: "Propulsor de hidracina del MPS-120 (0,26–2,79 N)",
  thrustN: 0.26,
  ispS: 190,
  dryMassKg: 0,
  propellant: "Hydrazine",
  sources: [PROBE_SRC.mps120xw, PROBE_SRC.mps120Engines, PROBE_SRC.hydrazineIsp],
};

/** The probe's parts. Masses add up to its dry mass (`Ship.dryMassKg`). */
export const PROBE_EQUIPMENT: readonly Equipment[] = [
  {
    id: "bus-6u-xl",
    name: "Bus 6U-XL tipo Juventas (estructura, ordenador, radio entre naves, cámaras)",
    kind: "estructura",
    massKg: 12,
    powerW: -12,
    materials: "Aluminio, placas de circuito, paneles solares plegados",
    size: "37 × 23 × 10 cm",
    flight: "Juventas viaja en Hera (lanzada en 2024) y tratará de posarse en Dimorphos",
    basis: "Copiado: 12 kg y 6U-XL de Juventas. Se toma entero (incluye su propio gas frío) como margen. El consumo medio de 12 W es una estimación a partir de MASCOT (200 Wh en unas 16 h)",
    sources: [PROBE_SRC.juventas, PROBE_SRC.heraCubesats, PROBE_SRC.mascot],
  },
  {
    id: "mps-120xw",
    name: "Módulo de propulsión Aerojet MPS-120XW (4 propulsores de hidracina)",
    kind: "avionica",
    massKg: 2.4,
    powerW: -1,
    materials: "Titanio impreso en 3D, hidracina",
    size: "20 × 10 × 11,35 cm",
    flight: "CHAMPS: módulo para cubesats, en producción",
    basis: "Copiado: «<2.4 kg dry», «<1 W» en operación, cuatro motores. El reparto en 24 toberas de traslación y giro es la simplificación de juego de todas las naves",
    sources: [PROBE_SRC.mps120xw, PROBE_SRC.mps120Engines, PROBE_SRC.mps120Satcatalog],
  },
  {
    id: "bateria-200wh",
    name: "Batería de 200 Wh (como la de MASCOT)",
    kind: "bateria",
    massKg: 1.3,
    powerW: 0,
    storageWh: 200,
    rechargeable: true,
    materials: "Células de ion-litio",
    flight: "MASCOT (Hayabusa2) trabajó 17 h 7 min en Ryugu con 200 Wh",
    basis: "Copiado: 200 Wh y unas 16 h de MASCOT. Masa: estimación con unos 150 Wh/kg",
    sources: [PROBE_SRC.mascot],
  },
  {
    id: "anclas",
    name: "Tres patas cortas con anclas de rosca",
    kind: "tren",
    massKg: 0.3,
    powerW: 0,
    materials: "Titanio",
    flight: "Idea de Philae (tornillos en las patas); sin vuelo en cubesats",
    basis: "Estimación: valor de juego para que la sonda se quede posada",
    sources: [],
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

/** Mothership carries two probes, like Hera carries Juventas and Milani. Game value. */
export const PROBES_ON_BOARD = 2;

export function probeDesign(serial = 1): ShipDesign {
  return {
    hull: { name: `Sonda Centinela ${serial}`, size: PROBE_HULL },
    tanks: [{ spec: { propellant: "Hydrazine", capacityKg: PROBE_HYDRAZINE_KG.value, dryMassKg: 0 }, fillKg: PROBE_HYDRAZINE_KG.value }],
    // The four thrusters fire together aft for the "main engine"; the RCS uses the same model.
    mainEngines: [-1, 1].flatMap((sx) =>
      [-1, 1].map((sy) => ({ model: MPS120_THRUSTER, position: new Vec3((sx * PROBE_HULL.x) / 4, (sy * PROBE_HULL.y) / 4, PROBE_HULL.z / 2), direction: new Vec3(0, 0, -1) })),
    ),
    rcs: buildRcsLayout(MPS120_THRUSTER, PROBE_HULL),
    equipment: PROBE_EQUIPMENT,
  };
}
