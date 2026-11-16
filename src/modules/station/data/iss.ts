import type { Reality } from "@core/reality";
import type { AssemblyLimits } from "../domain/vehicle-catalogue";

/**
 * The station rebuilt as the ISS's US segment (docs/design/estacion-real.md, Berón 2026-11-16: «la
 * estación: el segmento estadounidense de la ISS»). Real sizes, masses and volumes with their source;
 * what the source does not give is derived (the hull as a cylinder, an upper bound) and says so.
 * Checked 2026-11-16.
 */
export const ISS_SOURCES = {
  facts: "NASA, datos de la ISS: 109 m de punta a punta, celosía de 94 m, 8 alas de 73 m por pareja, 75–90 kW, 1005 m³ presurizados y 388 m³ habitables, seis camarotes y dos baños: https://www.nasa.gov/international-space-station/space-station-facts-and-figures/",
  unity: "Unity (Nodo 1): 5,47 m de largo, 4,57 m de diámetro, 11 612 kg con sus dos PMA; seis puertos CBM: proa Destiny, popa PMA-1, babor Tranquility, estribor Quest, cenit Z1, nadir Cygnus: https://en.wikipedia.org/wiki/Unity_(ISS_module)",
  destiny: "Destiny: 8,5 m de largo, 4,3 m de diámetro, 14 515 kg, 104,77–106 m³ presurizados, 24 bastidores (seis por cara), ventana de 51 cm: https://en.wikipedia.org/wiki/Destiny_(ISS_module)",
  harmony: "Harmony (Nodo 2): 6,7 m de largo, 4,4 m de diámetro, 14 300 kg, 70 m³ presurizados, camarotes de cuatro astronautas; proa PMA-2 e IDA, cenit PMA-3 e IDA, nadir CBM para cargueros, babor Kibo, estribor Columbus: https://en.wikipedia.org/wiki/Harmony_(ISS_module)",
  tranquility: "Tranquility (Nodo 3): 6,706 m de largo, 4,48 m de diámetro, 19 000 kg; soporte vital, WHC y cinta de correr; nadir Cupola, babor Bishop, proa Leonardo (PMM), popa BEAM: https://en.wikipedia.org/wiki/Tranquility_(ISS_module)",
  node3Racks: "ESA, bastidores del Nodo 3: ARS, OGS, WRS1, WRS2, WHC, cinta T2 y ARED: https://www.esa.int/Our_Activities/Human_Spaceflight/Node-3_Cupola/Node-3_systems_and_internal_racks",
  cupola: "Cupola: 1,5 m de alto, 2,95 m de diámetro, 1880 kg, siete ventanas (la central de 80 cm) y un puesto robótico para Canadarm2: https://en.wikipedia.org/wiki/Cupola_(ISS_module)",
  columbus: "Columbus (ESA): 6,871 m de largo, 4,477 m de diámetro, 10 300 kg, diez bastidores ISPR activos; dentro el European Drawer Rack: https://en.wikipedia.org/wiki/Columbus_(ISS_module)",
  kibo: "Kibo (JAXA): módulo presurizado de 11,19 × 4,39 m y 15 900 kg con 23 bastidores; esclusa de experimentos; Exposed Facility de 4 × 5,6 × 5 m, 4000 kg y 12 puertos EFU; brazo JEMRMS de 10 m: https://en.wikipedia.org/wiki/Kibo_(ISS_module)",
  quest: "Quest: 5,5 m de largo, 4 m de diámetro, 6064 kg, 34 m³ presurizados; esclusa de equipo (trajes) y esclusa de tripulación con la escotilla EVA: https://en.wikipedia.org/wiki/Quest_Joint_Airlock",
  bishop: "Bishop (Nanoracks, 2020): 1059 kg, 1,80 m de alto y 2,014 m de diámetro, 3,99 m³ presurizados, sin escotillas propias; Canadarm2 la saca del puerto de babor de Tranquility, suelta la carga y la vuelve a atracar: https://en.wikipedia.org/wiki/Nanoracks_Bishop_Airlock",
  canadarm2: "Canadarm2 (SSRMS): 17,6 m, 1800 kg, siete articulaciones, dos efectores LEE, mueve hasta 116 000 kg; base móvil (MBS) sobre la celosía (~108 m de raíles); se maneja desde los puestos robóticos de Destiny y de la Cupola; captura y atraca Dragon, Cygnus y HTV: https://en.wikipedia.org/wiki/Mobile_Servicing_System",
  ida: "Adaptador de atraque internacional (IDA): 110 cm de alto, 240 cm de diámetro, norma IDSS: https://en.wikipedia.org/wiki/International_Docking_Adapter",
  cbm: "Mecanismo de atraque común (CBM): paso cuadrado de 1,27 m y 16 pernos: https://en.wikipedia.org/wiki/Common_Berthing_Mechanism",
  saw: "Alas solares de la ISS: 35 × 12 m cada una, casi 31 kW, giran con las juntas beta: https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station",
  eatcs: "EATCS de la ISS: radiadores de amoníaco en S1 y P1 que expulsan hasta 70 kW: https://en.wikipedia.org/wiki/External_Active_Thermal_Control_System",
  printing: "NASA, impresión 3D en la ISS: 3D Printing in Zero-G (2014), Additive Manufacturing Facility de Redwire (2015), Refabricator de Tethers Unlimited (2019, plástico reciclado), impresora de metal de la ESA (acero inoxidable): https://www.nasa.gov/missions/station/3d-printing-saving-weight-and-space-at-launch/",
  esaPrinter: "Impresora de metal de la ESA (Airbus), en Columbus: ~180 kg, primera pieza de acero inoxidable en agosto de 2024, piezas de menos de 250 g: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ESA_launches_first_metal_3D_printer_to_ISS",
  haven1: "Haven-1 (Vast): 10,1 × 4,4 m, 45 m³ habitables para cuatro: https://en.wikipedia.org/wiki/Haven-1",
  haven2: "Haven-2 (Vast): primer módulo 5 m más largo que Haven-1 y con casi el doble de volumen habitable, en órbita en 2028; brazo, esclusa de cargas y de EVA, laboratorio Haven-2 Lab: https://www.vastspace.com/updates/vast-announces-haven-2-its-proposed-space-station-designed-to-succeed-the-international-space-station-iss",
  axiom: "Axiom Station: PPTM en 2028 y Hab-1 en 2029, de 11 × 4,2 m: https://en.wikipedia.org/wiki/Axiom_Station",
  cubesat: "CubeSat: unidad (1U) de 10 × 10 × 10 cm y hasta 1,33 kg (norma original): https://en.wikipedia.org/wiki/CubeSat",
  juventas: "Juventas (ESA, Hera): cubesat de 6U-XL y 12 kg, 37 × 23 × 10 cm: https://www.heramission.space/hera-mission-juventas-cubesat",
  jemEfPort: "JEM-EF (eoPortal): 500 kg como máximo por puerto (2500 kg en el especial), carga estándar de 1,85 × 1,0 × 0,80 m, 3 kW a 120 V por puerto: https://www.eoportal.org/satellite-missions/iss-jemef",
} as const;

const S = ISS_SOURCES;
const url = (s: string) => s.split(": ").pop()!;

/** A pressurised module of the US segment, with what the sources say about it. */
export interface IssModule {
  readonly id: string;
  readonly name: string;
  /** Code for rack locations, like the ISS's own (LAB1, NOD2…). */
  readonly code: string;
  readonly lengthM: number;
  readonly diameterM: number;
  readonly massKg: number;
  /** Pressurised volume, m³. */
  readonly volumeM3: number;
  /** Whether the volume is copied from the source or derived (π r² L of the hull: an upper bound). */
  readonly volumeIs: "copiado" | "derivado";
  readonly role: string;
  readonly status: Reality;
  readonly source: string;
}

const hull = (lengthM: number, diameterM: number) => Math.round(Math.PI * (diameterM / 2) ** 2 * lengthM * 10) / 10;

/** The US segment's pressurised modules as rebuilt (sizes real; `volumeIs` says how the volume was got). */
export const ISS_MODULES: readonly IssModule[] = [
  { id: "nodo-1", name: "Unity (Nodo 1)", code: "NOD1", lengthM: 5.47, diameterM: 4.57, massKg: 11612, volumeM3: hull(5.47, 4.57), volumeIs: "derivado", role: "Nodo central: la cocina y la mesa de la tripulación; el nadir es el CBM donde el brazo atraca el módulo de aterrizaje", status: "real", source: url(S.unity) },
  { id: "destiny", name: "Destiny (laboratorio)", code: "LAB1", lengthM: 8.5, diameterM: 4.3, massKg: 14515, volumeM3: 106, volumeIs: "copiado", role: "Laboratorio: guantera MSG, Additive Manufacturing Facility y sus propios bastidores de aire y de lazos térmicos", status: "real", source: url(S.destiny) },
  { id: "nodo-2", name: "Harmony (Nodo 2)", code: "NOD2", lengthM: 6.7, diameterM: 4.4, massKg: 14300, volumeM3: 70, volumeIs: "copiado", role: "Los cuatro camarotes; IDA de proa (Starship) y de cenit (módulo de aterrizaje)", status: "real", source: url(S.harmony) },
  { id: "nodo-3", name: "Tranquility (Nodo 3)", code: "NOD3", lengthM: 6.706, diameterM: 4.48, massKg: 19000, volumeM3: hull(6.706, 4.48), volumeIs: "derivado", role: "Aseo (WHC), ejercicio (T2 y ARED), bastidores de soporte vital (WRS, OGS) y la Cupola; la Bishop en babor", status: "real", source: url(S.tranquility) },
  { id: "cupula", name: "Cupola", code: "CUP1", lengthM: 1.5, diameterM: 2.95, massKg: 1880, volumeM3: hull(1.5, 2.95), volumeIs: "derivado", role: "Siete ventanas y el puesto robótico de Canadarm2", status: "real", source: url(S.cupola) },
  { id: "columbus", name: "Columbus (fabricación)", code: "COL1", lengthM: 6.871, diameterM: 4.477, massKg: 10300, volumeM3: hull(6.871, 4.477), volumeIs: "derivado", role: "Fabricación: la impresora de metal de la ESA y, como licencia, la refinería, la fundición y la planta de propelente", status: "real", source: url(S.columbus) },
  { id: "kibo", name: "Kibo (ciencia)", code: "JPM1", lengthM: 11.19, diameterM: 4.39, massKg: 15900, volumeM3: hull(11.19, 4.39), volumeIs: "derivado", role: "Ciencia y el Refabricator (dónde iba en la ISS: distribución nuestra); su esclusa saca las piezas a la plataforma expuesta (JEM-EF)", status: "real", source: url(S.kibo) },
  { id: "quest", name: "Quest (esclusa de EVA)", code: "AL1", lengthM: 5.5, diameterM: 4, massKg: 6064, volumeM3: 34, volumeIs: "copiado", role: "Trajes y paseos espaciales", status: "real", source: url(S.quest) },
  { id: "bishop", name: "Bishop (esclusa de carga)", code: "BSH1", lengthM: 1.8, diameterM: 2.014, massKg: 1059, volumeM3: 3.99, volumeIs: "copiado", role: "Saca al vacío la sonda Juventas y los cubesats", status: "real", source: url(S.bishop) },
];

export const issModule = (id: string): IssModule => {
  const m = ISS_MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`No ISS module ${id}`);
  return m;
};

/** Total pressurised volume of the modules as rebuilt, m³ (the real ISS has 1005 with the Russian segment). */
export const issVolumeM3 = (): number => ISS_MODULES.reduce((s, m) => s + m.volumeM3, 0);

/** The outside: real numbers that the structure draws (structure.ts). */
export const ISS_OUTSIDE = {
  /** Integrated truss, m. */
  trussLengthM: 94,
  /** End to end with the wings, m. */
  spanM: 109,
  /** Solar array wings: eight, each 35 × 12 m and about 31 kW. */
  wings: 8,
  wingLengthM: 35,
  wingWidthM: 12,
  /** Radiators: three per side on S1 and P1 (sizes: game value, see structure.ts). */
  radiatorsPerSide: 3,
  canadarm2: { lengthM: 17.6, massKg: 1800, joints: 7, maxPayloadKg: 116000 },
  jemrmsLengthM: 10,
  source: url(S.facts),
} as const;

/** The Kibo Exposed Facility: the parts racks outside (12 EFU ports). */
export const EXPOSED_FACILITY = { lengthM: 4, widthM: 5.6, heightM: 5, massKg: 4000, ports: 12, status: "real" as Reality, source: url(S.kibo) };

/** A standard JEM-EF payload site (EFU): what one port takes. */
export const JEM_EF_PORT = { massKg: 500, envelopeM: [1.85, 1.0, 0.8] as const, specialPortKg: 2500, powerKw: 3, status: "real" as Reality, source: url(S.jemEfPort) };

/** The Bishop airlock (it has no hatches: the station's CBM hatch closes it). */
export const BISHOP = { massKg: 1059, heightM: 1.8, diameterM: 2.014, volumeM3: 3.99, status: "real" as Reality, source: url(S.bishop) };

/** Something that can go out through the Bishop. */
export interface BishopPayload {
  readonly id: string;
  readonly name: string;
  readonly massKg: number;
  /** Outer size, m³ (what it takes inside the Bishop). */
  readonly volumeM3: number;
  readonly status: Reality;
  readonly basis: string;
  readonly source: string;
}

/** Juventas and two cubesats, as kept in the station's stowage at the start (game value: what the station holds). */
export const BISHOP_PAYLOADS: readonly BishopPayload[] = [
  { id: "juventas", name: "Juventas", massKg: 12, volumeM3: 0.37 * 0.23 * 0.1, status: "real", basis: "Cubesat de 6U-XL de la misión Hera: 37 × 23 × 10 cm, 12 kg (ship/data/probe.ts)", source: url(S.juventas) },
  { id: "cubesat-3u", name: "Cubesat de 3U", massKg: 4, volumeM3: 0.1 * 0.1 * 0.34, status: "real", basis: "Tres unidades de 10 cm: 34 × 10 × 10 cm y hasta 4 kg (3 × 1,33 kg)", source: url(S.cubesat) },
  { id: "cubesat-1u", name: "Cubesat de 1U", massKg: 1.33, volumeM3: 0.001, status: "real", basis: "Una unidad: 10 × 10 × 10 cm y hasta 1,33 kg", source: url(S.cubesat) },
];

/** ISS fabrication, what has flown and what is a licence (docs/design/estacion-real.md, «Fabricación»). */
export interface Fabricator {
  readonly id: string;
  readonly name: string;
  readonly what: string;
  readonly since: string;
  readonly status: Reality;
  readonly source: string;
}

export const ISS_FABRICATION: readonly Fabricator[] = [
  { id: "zero-g-printer", name: "3D Printing in Zero-G (NASA y Made In Space)", what: "Plástico por extrusión: más de una docena de piezas, una llave de carraca", since: "2014", status: "real", source: url(S.printing) },
  { id: "amf", name: "Additive Manufacturing Facility (Redwire, antes Made In Space)", what: "Plástico, más resistente que el primer demostrador; servicio comercial", since: "2015", status: "real", source: url(S.printing) },
  { id: "refabricator", name: "Refabricator (Tethers Unlimited)", what: "Recicla plástico (piezas impresas, bolsas, espuma) en filamento e imprime", since: "2019", status: "real", source: url(S.printing) },
  { id: "impresora", name: "Impresora de metal de la ESA (Airbus)", what: "Acero inoxidable, piezas de menos de 250 g; primera en agosto de 2024", since: "2024", status: "real", source: url(S.esaPrinter) },
  { id: "regolith-print", name: "Redwire Regolith Print", what: "Imprime con regolito simulado", since: "en pruebas", status: "en-desarrollo", source: url(S.printing) },
];

/** Modules that are not ISS hardware but are being built for the stations that follow it. */
export const GROWTH_OPTIONS = {
  haven2: { lengthM: 10.1 + 5, diameterM: 4.4, livableM3: 2 * 45, firstModule: 2028, status: "en-desarrollo" as Reality, source: url(S.haven2), note: "Largo: Haven-1 (10,1 m) + 5 m, copiado de Vast; diámetro: el de Haven-1 (estimación, Vast no lo da); volumen: «casi el doble» de los 45 m³ de Haven-1 (derivado)" },
  axiomHab1: { lengthM: 11, diameterM: 4.2, year: 2029, status: "en-desarrollo" as Reality, source: url(S.axiom) },
} as const;

/**
 * Where the catalogue's vehicles can be put together (docs/design/modulo-lunar-juventas.md, «Montaje»):
 * the Bishop's volume, a JEM-EF port's payload and what Canadarm2 can hold. All real numbers.
 */
export const ASSEMBLY_LIMITS: AssemblyLimits = {
  bishop: { volumeM3: BISHOP.volumeM3, diameterM: BISHOP.diameterM, heightM: BISHOP.heightM },
  jemEf: { massKg: JEM_EF_PORT.massKg, envelopeM: JEM_EF_PORT.envelopeM },
  arm: { maxPayloadKg: ISS_OUTSIDE.canadarm2.maxPayloadKg, lengthM: ISS_OUTSIDE.canadarm2.lengthM },
};
