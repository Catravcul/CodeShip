import type { Sourced } from "@core/units";
import { MAIN_ENGINES, RCS_THRUSTERS } from "@modules/ship/data/thrusters";
import { TANK_PARTS } from "@modules/ship/data/parts";
import { BATTERY_AGZN, BATTERY_LI10, BATTERY_LI5, CABIN_AL2195, EQ_SRC, POWER_MMRTG, POWER_NONE, POWER_RIGID, POWER_ROSA, SHIELD_NONE, SHIELD_WHIPPLE, SHIELD_WHIPPLE_NODE, SHIELD_WHIPPLE_STEEL } from "@modules/ship/data/equipment";
import { LM, LM_DPS, LM_EQUIPMENT, LM_RCS_JET, LM_SRC } from "@modules/ship/data/apollo-lm";
import { JUVENTAS_THRUSTER, PROBE_SRC } from "@modules/ship/data/probe";
import type { ThrusterModel } from "@modules/ship/domain/components";
import type { Equipment } from "@modules/ship/domain/equipment";
import { criticalDiameterCm } from "@modules/ship/domain/mmod";
import type { CategoryInfo, Carrier, SupplyCategory, SupplyItem } from "../domain/component-supply";
import { catalogueComponentById, VEHICLE_SRC } from "./catalogue-components";

/**
 * The real components by capability tier (docs/design/componentes.md §7) and the cargo vehicles that
 * bring them (docs/design/importacion.md §5). Numbers copied from the sources (or from the game's own
 * sourced data, which keeps its notes). Checked 2026-11-17.
 */
export const SUPPLY_SRC = {
  dragon: "https://en.wikipedia.org/wiki/Dragon_2",
  crs21: "https://www.nasa.gov/wp-content/uploads/2020/12/spacex_crs-21_mision_overview_high_res_0.pdf",
  cygnus: "https://en.wikipedia.org/wiki/Cygnus_(spacecraft)",
  falconHeavy: "https://en.wikipedia.org/wiki/Falcon_Heavy",
  raptor: "https://en.wikipedia.org/wiki/SpaceX_Raptor",
  bit3: "https://www.busek.com/s/BIT3_v10.pdf",
  lunarIceCube: "https://en.wikipedia.org/wiki/Lunar_IceCube",
  agc: "https://en.wikipedia.org/wiki/Apollo_Guidance_Computer",
  rad750Board: "https://www.baesystems.com/en-us/dam/jcr:e2c04c2e-8dea-425c-8460-96a509a95111/16-f76-RAD750-3U-CompactPCI-datasheet-2025-web.2025-06-25-21-58-21.pdf",
  rad750: EQ_SRC.rad750,
  ida: "https://en.wikipedia.org/wiki/International_Docking_Adapter",
  docking: "https://en.wikipedia.org/wiki/Docking_and_berthing_of_spacecraft",
  haven1: "https://en.wikipedia.org/wiki/Haven-1",
  cdra4eu: "https://ntrs.nasa.gov/api/citations/20150016500/downloads/20150016500.pdf",
  lioh: "https://dashboard.si.edu/object/cartridge-lithium-hydroxide-canister-lunar-module:nasm_A20020434000",
  issWrench: "https://spaceflightnow.com/?p=2381",
  esaMetalPrinter: "https://esa.int/ESA_Multimedia/Images/2024/06/First_metal_3D_printing_on_Space_Station",
} as const;
const S = SUPPLY_SRC;

export const SUPPLY_CATEGORIES: readonly CategoryInfo[] = [
  { id: "motor-bipropelente", name: "Motor principal (MMH/NTO)", metric: { label: "Isp", unit: "s", why: "En un asteroide el empuje sobra (el LM se posa con el RCS): lo que cuenta es el Δv por kilo de propelente" } },
  { id: "motor-monopropelente", name: "Motor principal (hidracina)", metric: { label: "Isp", unit: "s", why: "Igual que el bipropelente: el Δv por kilo" } },
  { id: "motor-metano", name: "Motor de metano y oxígeno (Starship)", metric: { label: "Empuje al nivel del mar", unit: "MN", why: "Raptor 3 empuja más y pesa menos; el Isp apenas cambia" } },
  { id: "rcs-bipropelente", name: "RCS (MMH/NTO)", metric: { label: "Isp", unit: "s", why: "El Δv de las maniobras finas" } },
  { id: "rcs-monopropelente", name: "RCS (hidracina y LMP-103S)", metric: { label: "Isp", unit: "s", why: "El LMP-103S «verde» rinde más que la hidracina" } },
  { id: "propulsion-cubesat", name: "Propulsión de cubesat", metric: { label: "Isp", unit: "s", why: "Con 1–1,5 kg de propelente, el Isp decide hasta dónde llega la sonda" } },
  { id: "tanque-par", name: "Tanques en par (MMH/NTO)", metric: { label: "Capacidad", unit: "kg", why: "El propelente que lleva" } },
  { id: "tanque-mono", name: "Tanques de monopropelente", metric: { label: "Capacidad", unit: "kg", why: "El propelente que lleva" } },
  { id: "cabina", name: "Cabinas y módulos presurizados", metric: { label: "Volumen habitable", unit: "m³", why: "El sitio para vivir y trabajar" } },
  { id: "energia", name: "Fuente de energía", metric: { label: "Potencia", unit: "W", why: "Al principio de vida, a 1 UA las solares" } },
  { id: "bateria", name: "Batería", metric: { label: "Energía recargable", unit: "kWh", why: "Una batería primaria (la del LM) no se recarga: cuenta 0" } },
  { id: "escudo", name: "Escudo contra micrometeoritos", metric: { label: "Diámetro crítico", unit: "mm", why: "La partícula de aluminio a 7 km/s que para, con la cabina de serie (manual de la NASA)" } },
  { id: "soporte-vital", name: "Soporte vital: quitar el CO₂", metric: { label: "CO₂ quitado sin gastar cartuchos", unit: "kg/día", why: "Un cartucho de LiOH se gasta; un CDRA se regenera" } },
  { id: "avionica", name: "Aviónica (ordenador de vuelo)", metric: { label: "Reloj", unit: "MHz", why: "La velocidad del ordenador" } },
  { id: "acople", name: "Sistemas de acople", metric: { label: "Paso libre", unit: "mm", why: "Todos los de la norma IDSS tienen el mismo: no hay escala, cada uno sirve para lo suyo" } },
];

export const categoryInfo = (id: SupplyCategory): CategoryInfo => SUPPLY_CATEGORIES.find((c) => c.id === id)!;

/**
 * Cargo vehicles, in the order they are tried. Cygnus carries pressurised cargo and is berthed on a CBM
 * by Canadarm2; Dragon also has an unpressurised trunk (the Bishop airlock came in one, CRS-21) and the
 * arm takes trunk cargo out. Their own mass and the transfer stages are not charged: only the cargo's
 * kg, as every import (docs/design/importacion.md).
 */
export const CARRIERS: readonly Carrier[] = [
  {
    id: "cygnus",
    name: "Cygnus mejorada",
    maxKg: { value: 3500, source: S.cygnus, note: "3500 kg de carga y 27 m³ presurizados (versión mejorada)" },
    holds: ["presurizada"],
    arrival: "Canadarm2 la atrapa y la atraca en un CBM",
    source: S.cygnus,
  },
  {
    id: "dragon",
    name: "Dragon de carga",
    maxKg: { value: 3307, source: S.dragon, note: "3307 kg a la ISS: 9,3 m³ presurizados y 37 m³ sin presión en el maletero" },
    holds: ["presurizada", "exterior"],
    arrival: "Se acopla sola a un puerto IDSS; el brazo saca la carga del maletero (como la Bishop en CRS-21)",
    source: S.dragon,
  },
];

const isp = (m: ThrusterModel, note: string): Sourced<number> => ({ value: m.ispS, source: m.sources[0] ?? EQ_SRC.lm, note });
const kgOf = (value: number, source: string, note: string): Sourced<number> => ({ value, source, note });

function engine(m: ThrusterModel, category: SupplyCategory, tier: number, deSerie?: string): SupplyItem {
  return {
    partId: m.id,
    name: m.name,
    category,
    tier,
    capacity: isp(m, "Isp en vacío (ficha del fabricante)"),
    massKg: kgOf(m.dryMassKg, m.sources[0] ?? EQ_SRC.lm, deSerie ? "Va dentro de la masa de su vehículo" : "Masa en seco con válvulas"),
    reality: "real",
    stowage: "exterior",
    ...(deSerie ? { deSerie } : {}),
    sources: m.sources,
  };
}
const byId = (list: readonly ThrusterModel[], id: string) => list.find((m) => m.id === id)!;
const me = (id: string) => byId(MAIN_ENGINES, id);
const rcs = (id: string) => byId(RCS_THRUSTERS, id);

function equipment(e: Equipment, category: SupplyCategory, tier: number, capacity: Sourced<number>, stowage: SupplyItem["stowage"], deSerie?: string): SupplyItem {
  return { partId: e.id, name: e.name, category, tier, capacity, massKg: kgOf(e.massKg, e.sources[0] ?? EQ_SRC.lm, e.basis), reality: "real", stowage, ...(deSerie ? { deSerie } : {}), sources: e.sources };
}

/** Tanks of a feed system, tier = rank by capacity (equal capacities share a tier). */
function tanks(category: SupplyCategory, pick: (propellant: string) => boolean): SupplyItem[] {
  const list = TANK_PARTS.filter((t) => pick(t.spec.propellant));
  const caps = [...new Set(list.map((t) => t.spec.capacityKg))].sort((a, b) => a - b);
  return list.map((t) => {
    const src = t.spec.build?.tank.source ?? EQ_SRC.lm;
    return {
      partId: t.id,
      name: t.name,
      category,
      tier: caps.indexOf(t.spec.capacityKg) + 1,
      capacity: { value: t.spec.capacityKg, source: src, note: "Volumen de la ficha × densidad × llenado (ship/data/tanks.ts)" },
      massKg: { value: Math.round(t.spec.dryMassKg * 100) / 100, source: src, note: "En vacío, con el helio si es un par" },
      reality: "real",
      stowage: "exterior",
      sources: [src],
    };
  });
}

const dcMm = (shield: Equipment): Sourced<number> => ({ value: Math.round(criticalDiameterCm([CABIN_AL2195, shield]) * 100) / 10, source: EQ_SRC.mmodHandbook, note: "Ecuación de Whipple con la cabina de serie (docs/design/componentes.md §1.2)" });
const watts = (e: Equipment): Sourced<number> => ({ value: e.powerW, source: e.sources[0] ?? EQ_SRC.lm, note: e.basis });
const rechargeKwh = (e: Equipment): Sourced<number> => ({ value: e.rechargeable === false ? 0 : Math.round((e.storageWh ?? 0) / 10) / 100, source: e.sources[0] ?? EQ_SRC.lm, note: e.rechargeable === false ? "Primaria: no se recarga" : e.basis });
const lmPart = (id: string) => LM_EQUIPMENT.find((e) => e.id === id)!;
const cc = (id: string) => catalogueComponentById(id)!;

const LM_NAME = "el módulo lunar";
const JUVENTAS_NAME = "Juventas";
const STARSHIP_NAME = "la Starship";

export const SUPPLY_ITEMS: readonly SupplyItem[] = [
  // Main engines, MMH/NTO: the LM's descent engine is tier 1 (311 s).
  engine(LM_DPS, "motor-bipropelente", 1, LM_NAME),
  engine(me("aerojet-r-42"), "motor-bipropelente", 1),
  engine(me("aerojet-r-4d"), "motor-bipropelente", 2),
  engine(me("aerojet-aj10-190"), "motor-bipropelente", 2),
  engine(me("arianegroup-s400"), "motor-bipropelente", 3),
  engine(me("aerojet-r-4d-15-hipat"), "motor-bipropelente", 3),
  // Main engines, hydrazine.
  engine(me("aerojet-mr-80b"), "motor-monopropelente", 1),
  engine(me("aerojet-mr-104h"), "motor-monopropelente", 2),
  engine(me("aerojet-mr-107s"), "motor-monopropelente", 2),
  // Starship's sea-level engine.
  {
    partId: "raptor-2",
    name: cc("raptor-2").name,
    category: "motor-metano",
    tier: 1,
    capacity: { value: 2.26, source: S.raptor, note: "230 tf al nivel del mar" },
    massKg: cc("raptor-2").massKg,
    reality: "real",
    stowage: "exterior",
    deSerie: STARSHIP_NAME,
    sources: [S.raptor],
  },
  {
    partId: "raptor-3",
    name: "Motor Raptor 3 (metano y oxígeno, 2,45 MN)",
    category: "motor-metano",
    tier: 2,
    capacity: { value: 2.45, source: S.raptor, note: "250 tf al nivel del mar, 350 s" },
    massKg: { value: 1525, source: S.raptor, note: "Copiado: 1525 kg en seco (Raptor 2: 1630 kg)" },
    reality: "en-desarrollo",
    stowage: "exterior",
    sources: [S.raptor],
  },
  // RCS, MMH/NTO: the LM's jets (290 s) are tier 1.
  engine(LM_RCS_JET, "rcs-bipropelente", 1, LM_NAME),
  engine(rcs("aerojet-r-1e"), "rcs-bipropelente", 1),
  engine(rcs("arianegroup-10n"), "rcs-bipropelente", 2),
  // RCS, monopropellant: hydrazine, then the «green» LMP-103S.
  engine(rcs("aerojet-mr-111g"), "rcs-monopropelente", 1),
  engine(rcs("aerojet-mr-107t"), "rcs-monopropelente", 1),
  engine(rcs("aerojet-mr-106l"), "rcs-monopropelente", 1),
  { ...engine(rcs("ecaps-hpgp-5n"), "rcs-monopropelente", 2), reality: "en-desarrollo" },
  engine(rcs("ecaps-hpgp-22n"), "rcs-monopropelente", 2),
  // Cubesat propulsion: Juventas's cold gas, then an iodine ion thruster.
  {
    partId: JUVENTAS_THRUSTER.id,
    name: JUVENTAS_THRUSTER.name,
    category: "propulsion-cubesat",
    tier: 1,
    capacity: { value: JUVENTAS_THRUSTER.ispS, source: PROBE_SRC.spaceOps, note: "Gas frío: 50 s" },
    massKg: cc("juventas-gas-frio").massKg,
    reality: "real",
    stowage: "presurizada",
    deSerie: JUVENTAS_NAME,
    sources: JUVENTAS_THRUSTER.sources,
  },
  {
    partId: "bit-3",
    name: "Motor iónico de yodo Busek BIT-3 (1,1 mN)",
    category: "propulsion-cubesat",
    tier: 2,
    capacity: { value: 2150, source: S.bit3, note: "Hasta 2150 s; hasta 1,1 mN con 56–75 W. Voló en Lunar IceCube (Artemis I, 2022), que se perdió por un fallo de la nave" },
    massKg: { value: 2.78, source: S.bit3, note: "Derivado: 1,28 kg en seco sin cardán + 1,5 kg de yodo como máximo" },
    reality: "real",
    stowage: "presurizada",
    sources: [S.bit3, S.lunarIceCube],
  },
  // Tanks.
  ...tanks("tanque-par", (p) => p === "MMH/NTO"),
  ...tanks("tanque-mono", (p) => p === "Hydrazine" || p === "LMP-103S"),
  // Cabins and pressurised modules.
  equipment(lmPart("lm-etapa-ascenso"), "cabina", 1, { value: LM.habitableM3.value, source: LM.habitableM3.source, note: LM.habitableM3.note ?? "" }, "exterior", LM_NAME),
  {
    partId: "haven-1-modulo",
    name: cc("haven-1-modulo").name,
    category: "cabina",
    tier: 2,
    capacity: { value: 45, source: S.haven1, note: "45 m³ habitables" },
    massKg: cc("haven-1-modulo").massKg,
    reality: "en-desarrollo",
    stowage: "exterior",
    sources: [S.haven1, VEHICLE_SRC.haven1Delay],
  },
  // Power: the LM flew on batteries only.
  equipment(POWER_NONE, "energia", 1, watts(POWER_NONE), "exterior", LM_NAME),
  equipment(POWER_MMRTG, "energia", 2, watts(POWER_MMRTG), "exterior"),
  equipment(POWER_RIGID, "energia", 3, watts(POWER_RIGID), "exterior"),
  equipment(POWER_ROSA, "energia", 4, watts(POWER_ROSA), "exterior"),
  // Batteries.
  equipment(BATTERY_AGZN, "bateria", 1, rechargeKwh(BATTERY_AGZN), "presurizada", LM_NAME),
  equipment(BATTERY_LI5, "bateria", 2, rechargeKwh(BATTERY_LI5), "presurizada"),
  equipment(BATTERY_LI10, "bateria", 3, rechargeKwh(BATTERY_LI10), "presurizada"),
  // Shields: the LM had none.
  equipment(SHIELD_NONE, "escudo", 1, dcMm(SHIELD_NONE), "exterior", LM_NAME),
  equipment(SHIELD_WHIPPLE_STEEL, "escudo", 2, dcMm(SHIELD_WHIPPLE_STEEL), "exterior"),
  equipment(SHIELD_WHIPPLE, "escudo", 3, dcMm(SHIELD_WHIPPLE), "exterior"),
  equipment(SHIELD_WHIPPLE_NODE, "escudo", 4, dcMm(SHIELD_WHIPPLE_NODE), "exterior"),
  // Life support: CO₂ removal.
  {
    partId: "lioh-lm",
    name: "Cartuchos de hidróxido de litio del LM",
    category: "soporte-vital",
    tier: 1,
    capacity: { value: 0, source: S.lioh, note: "Se gastan: cada cartucho de 1,2 kg se tira lleno de CO₂" },
    massKg: { value: 1.2, source: S.lioh, note: "Un cartucho: 1,2 kg" },
    reality: "real",
    stowage: "presurizada",
    deSerie: LM_NAME,
    sources: [S.lioh, LM_SRC.ecs],
  },
  {
    partId: "cdra-4eu",
    name: "Eliminador de CO₂ regenerable CDRA-4EU (ISS)",
    category: "soporte-vital",
    tier: 2,
    capacity: { value: 4.8, source: S.cdra4eu, note: "4,8 kg de CO₂ al día a 3 mmHg (medido)" },
    massKg: { value: 200, source: S.cdra4eu, note: "Estimación nuestra (no encontramos la cifra publicada; docs/research/soporte-vital.md §6)" },
    reality: "real",
    stowage: "presurizada",
    sources: [S.cdra4eu],
  },
  // Avionics.
  {
    partId: "agc",
    name: "Ordenador de guiado Apolo (AGC)",
    category: "avionica",
    tier: 1,
    capacity: { value: 2.048, source: S.agc, note: "Reloj de cuarzo de 2,048 MHz; 2048 palabras de memoria borrable" },
    massKg: { value: 32, source: S.agc, note: "70 lb (32 kg)" },
    reality: "real",
    stowage: "presurizada",
    deSerie: LM_NAME,
    sources: [S.agc],
  },
  {
    partId: "rad750-132",
    name: "Placa RAD750 3U a 132 MHz",
    category: "avionica",
    tier: 2,
    capacity: { value: 132, source: S.rad750Board, note: "132 MHz, más de 260 MIPS, 11 W" },
    massKg: { value: 0.55, source: S.rad750Board, note: "Unos 550 g" },
    reality: "real",
    stowage: "presurizada",
    sources: [S.rad750Board, S.rad750],
  },
  {
    partId: "rad750-198",
    name: "Placa RAD750 3U a 198 MHz",
    category: "avionica",
    tier: 3,
    capacity: { value: 198, source: S.rad750Board, note: "198 MHz, 435 DMIPS, 12,2 W" },
    massKg: { value: 0.55, source: S.rad750Board, note: "Unos 550 g" },
    reality: "real",
    stowage: "presurizada",
    sources: [S.rad750Board, S.rad750],
  },
  // Docking.
  { ...equipment(lmPart("adaptador-idss-lm"), "acople", 1, { value: 800, source: S.docking, note: "Paso circular de 800 mm de la norma IDSS" }, "exterior", LM_NAME) },
  {
    partId: "ida",
    name: "Adaptador de acople internacional (IDA)",
    category: "acople",
    tier: 1,
    capacity: { value: 800, source: S.docking, note: "Norma IDSS: paso de 800 mm" },
    massKg: { value: 526, source: S.ida, note: "526 kg" },
    reality: "real",
    stowage: "exterior",
    sources: [S.ida],
  },
];

export const supplyItem = (partId: string): SupplyItem | undefined => SUPPLY_ITEMS.find((i) => i.partId === partId);

/** The arm's limit for a free-flyer it captures (Canadarm2, iss.ts). */
export { ASSEMBLY_LIMITS as SUPPLY_LIMITS } from "./iss";

/**
 * What the station's printer really can make (docs/design/componentes.md §7): small parts, like the
 * ratchet wrench printed on the ISS in 2014 (plastic, a few hours) and the first metal samples of ESA's
 * printer on the ISS (2024). Engines, tanks, cabins and wings are imported, not printed.
 */
export const REAL_PRINTING: Sourced<string> = {
  value: "Solo piezas pequeñas: la llave de carraca de ABS impresa en la ISS en unas cuatro horas (2014) y las primeras piezas de metal de la impresora de la ESA (2024)",
  source: S.issWrench,
  note: S.esaMetalPrinter,
};
