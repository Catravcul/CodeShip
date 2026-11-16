import type { Blueprint } from "../domain/blueprint";
import type { Amounts } from "../domain/materials";
import { StationOutfit, type EquipmentSpec, type ModuleSpec, type OutfitBase, type OutfitModule, type StationComponent } from "../domain/outfit";
import { SRC } from "./sources";
import { POLANA_BERTHS, POLANA_LAYOUT, STRUCTURE_SOURCES } from "./structure";
import { GROWTH_OPTIONS, ISS_SOURCES, issModule } from "./iss";
import { eclssMachine, rackSpec } from "@modules/life-support/data/eclss-machines";
import type { RackKind } from "@modules/life-support/domain/eclss";
import { BIO_EQUIPMENT, EQ_BIO_LAB, EQ_BIOMINING, EQ_LOOP, EQ_PHB, EQ_PROTEIN, EQ_SPIRULINA } from "./bio-equipment";

/**
 * How the station grows: the modules it can berth, the equipment that goes in their racks and the
 * station's own components, with what is built at the start (docs/design/estacion.md, «La estación
 * crece»). Checked 2026-11-13.
 */
export const GROWTH_SOURCES = {
  destiny: "Destiny (laboratorio de EE. UU. en la ISS): 8,53 × 4,27 m, 14 520 kg, 24 bastidores (seis por cara), hasta 13 de experimentos: https://en.wikipedia.org/wiki/Destiny_(ISS_module)",
  columbus: "Columbus (ESA): 6,871 m de largo, 4,477 m de diámetro, 10 300 kg, 10 bastidores ISPR activos: https://en.wikipedia.org/wiki/Columbus_(ISS_module)",
  b330: "B330 de Bigelow (módulo hinchable): 16,88 m de largo, 6,7 m de diámetro, 23 000 kg, 330 m³ presurizados: https://en.wikipedia.org/wiki/B330",
  ispr: "Bastidor ISPR: unos 1,571 m³ dentro, hasta 700 kg de equipo además de sus ~104 kg: https://en.wikipedia.org/wiki/International_Standard_Payload_Rack",
  esaPrinter: "Impresora de metal de la ESA (Airbus) en el bastidor European Draw Rack Mark II de Columbus: unos 180 kg; piezas de acero inoxidable de menos de 250 g, «más pequeñas que una lata»: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ESA_launches_first_metal_3D_printer_to_ISS",
  uri: "Herramienta universal URI del Instituto Paton: Savitskaya cortó y soldó titanio y acero inoxidable fuera de la Salyut 7 (25 de julio de 1984, 3 h 35 min): https://en.wikipedia.org/wiki/Svetlana_Savitskaya",
  ebw: "Soldadura por haz de electrones: se hace en vacío, que en el espacio es gratis; en Tierra suelda los tanques de titanio: https://en.wikipedia.org/wiki/Electron-beam_welding",
  ccm: "Composite Crew Module de la NASA: cabina de fibra de carbono curada en horno: https://compositesworld.com/articles/building-on-ccm-lessons-learned(2)",
  rosa: "ROSA de Redwire: mástiles de material compuesto que se desenrollan: https://rdw.com/product-archive/power/rosa/",
  irosa: "iROSA en la ISS: «más de 20 kW» cada ala, unos 120 kW las seis; unos 600 kg en la ficha: https://space.skyrocket.de/doc_sdat/irosa-1.htm",
  whipple: "Escudo Whipple y Whipple relleno de Nextel y Kevlar, como los de Destiny y Columbus: https://en.wikipedia.org/wiki/Whipple_shield",
  canadarm: "Canadarm2 y los CBM: así se atracan los módulos de la ISS: https://en.wikipedia.org/wiki/Mobile_Servicing_System",
  veggie: "Veggie y el Advanced Plant Habitat de la ISS: cultivos bajo LED en bastidores (0,13–0,2 m² cada uno): https://www.nasa.gov/missions/station/growing-plants-in-space/",
} as const;

const G = GROWTH_SOURCES;
const GAME = "Receta, horas y potencia: valores de juego";

// --- Station components ---------------------------------------------------------------

export const WINGS_SAW: StationComponent = {
  id: "alas-saw-x4",
  name: "4 alas solares como las de la ISS",
  slot: "alas",
  massKg: 4 * 1100,
  powerKw: 124,
  heatKw: 0,
  effect: "124 kW (4 × 31 kW)",
  basis: { value: "Cuatro alas de 35 × 12 m, casi 31 kW cada una, como las de la ISS", source: STRUCTURE_SOURCES.saw.split(": ").pop()!, note: "Masa: valor de juego" },
};
export const WINGS_IROSA: StationComponent = {
  id: "alas-saw-irosa-x4",
  name: "4 alas de la ISS con 4 iROSA encima",
  slot: "alas",
  massKg: 4 * 1100 + 4 * 600,
  powerKw: 124 + 4 * 20,
  heatKw: 0,
  effect: "204 kW (124 + 4 × 20 kW)",
  basis: { value: "Como en la ISS desde 2021: un ala iROSA enrollable sobre cada ala vieja, «más de 20 kW» cada una", source: G.irosa.split(": ").pop()!, note: "600 kg por ala según la ficha, que no aclara si es por par" },
};
export const RADIATORS_EATCS: StationComponent = {
  id: "radiadores-eatcs",
  name: "2 radiadores como los de la ISS",
  slot: "radiadores",
  massKg: 2 * 1100,
  powerKw: 0,
  heatKw: 70,
  effect: "Expulsan 70 kW de calor",
  basis: { value: "El EATCS de la ISS expulsa hasta 70 kW", source: STRUCTURE_SOURCES.eatcs.split(": ").pop()!, note: "Masa: valor de juego" },
};
export const RADIATORS_DOUBLE: StationComponent = {
  id: "radiadores-eatcs-x4",
  name: "4 radiadores (el doble)",
  slot: "radiadores",
  massKg: 4 * 1100,
  powerKw: 0,
  heatKw: 140,
  effect: "Expulsan 140 kW de calor",
  basis: { value: "Dos paneles más como los del EATCS: el doble de superficie, el doble de calor", source: STRUCTURE_SOURCES.eatcs.split(": ").pop()!, note: "Proporcional al área (valor de juego)" },
};
export const SHIELD_WHIPPLE: StationComponent = {
  id: "escudo-whipple",
  name: "Escudo Whipple de aluminio",
  slot: "escudo",
  massKg: 2000,
  powerKw: 0,
  heatKw: 0,
  effect: "Una lámina separada del casco rompe los micrometeoritos",
  basis: { value: "Escudo Whipple: una lámina fina a unos centímetros del casco", source: G.whipple.split(": ").pop()!, note: "Masa: valor de juego" },
};
export const SHIELD_STUFFED: StationComponent = {
  id: "escudo-whipple-relleno",
  name: "Whipple relleno (Nextel y Kevlar)",
  slot: "escudo",
  massKg: 2600,
  powerKw: 0,
  heatKw: 0,
  effect: "Mantas de Nextel y Kevlar entre la lámina y el casco: para más por cada kilo",
  basis: { value: "Whipple relleno, como en los módulos Destiny y Columbus", source: G.whipple.split(": ").pop()!, note: "Masa: valor de juego" },
};

export const STATION_COMPONENTS: readonly StationComponent[] = [WINGS_SAW, WINGS_IROSA, RADIATORS_EATCS, RADIATORS_DOUBLE, SHIELD_WHIPPLE, SHIELD_STUFFED];
export const stationComponentById = (id: string): StationComponent | undefined => STATION_COMPONENTS.find((c) => c.id === id);

// --- Equipment ------------------------------------------------------------------------

const src = (s: string) => s.split(": ").pop()!;

/** The basic machines the station starts with, in the fabrication module's racks. */
export const EQ_REFINERY: EquipmentSpec = {
  id: "refineria",
  name: "Horno de la refinería",
  machine: "refineria",
  fitsIn: ["fabrica"],
  racks: 1,
  massKg: 700,
  powerKw: 12,
  panel: "propelente",
  status: "licencia",
  info: "Horno sellado de la refinería: saca el agua de la roca y funde el silicato para la electrólisis. Licencia: ninguna refinería de roca ha volado",
  basis: { value: "Horno de extracción térmica en un bastidor ISPR (700 kg como máximo)", source: SRC.thermalExtraction, note: GAME },
};
export const EQ_GLOVEBOX: EquipmentSpec = {
  id: "guantera",
  name: "Guantera",
  fitsIn: ["fabrica", "laboratorio"],
  racks: 1,
  massKg: 700,
  powerKw: 1,
  panel: "materiales",
  status: "real",
  info: "Guantera como la MSG (255 L, puertos de 40 cm): aquí se miran las muestras de roca sin que el polvo flote por el módulo",
  basis: { value: "Guantera de ciencia en microgravedad (MSG) de Destiny", source: "https://en.wikipedia.org/wiki/Microgravity_Science_Glovebox", note: "Masa y potencia: valores de juego" },
};
export const EQ_FOUNDRY: EquipmentSpec = {
  id: "fundicion",
  name: "Fundición",
  machine: "fundicion",
  fitsIn: ["fabrica"],
  racks: 1,
  massKg: 700,
  powerKw: 6,
  panel: "fabricacion",
  status: "licencia",
  info: "Fundición: funde y cuela el metal refinado; su cola de trabajos está en Fabricación. Licencia: no hay fundición en ninguna estación",
  basis: { value: "Horno de fusión en un bastidor ISPR", source: SRC.mre, note: GAME },
};
export const EQ_PRINTER: EquipmentSpec = {
  id: "impresora",
  name: "Impresora 3D de metal",
  machine: "impresora",
  fitsIn: ["fabrica", "laboratorio"],
  racks: 1,
  massKg: 180,
  powerKw: 1,
  panel: "planos",
  status: "licencia",
  info: "La impresora de metal de la ESA, en Columbus como en la ISS (acero, 2024). La máquina es real; imprimir piezas de hasta 40 kg es licencia (la real hace piezas de menos de 250 g)",
  basis: { value: "Como la impresora de metal de la ESA en la ISS: 180 kg, piezas de menos de 250 g", source: src(G.esaPrinter), note: "Aquí imprime piezas de hasta 40 kg (valor de juego). Potencia: valor de juego" },
};
export const EQ_PLANT: EquipmentSpec = {
  id: "planta",
  name: "Planta de propelente",
  machine: "planta",
  fitsIn: ["fabrica", "planta"],
  racks: 1,
  massKg: 600,
  powerKw: 10,
  panel: "propelente",
  status: "licencia",
  info: "Electrolizador de agua y un reactor de amoníaco pequeños: hacen hidrógeno, oxígeno, amoníaco, hidracina y NTO. La electrólisis es real (el OGA de la ISS); hacer propelente en órbita es licencia",
  basis: { value: "Electrolizador PEM de unos 10 kW, que gasta unos 55 kWh por kg de hidrógeno", source: SRC.pemElectrolysis, note: GAME },
};

/** What can be added, replaced or upgraded. */
export const EQ_CARBONYL: EquipmentSpec = {
  id: "reactor-carbonilo",
  name: "Reactor de carbonilo",
  machine: "refineria",
  fitsIn: ["fabrica", "planta"],
  racks: 2,
  massKg: 70,
  powerKw: 4,
  panel: "materiales",
  status: "licencia",
  info: "Reactor a presión con monóxido de carbono y una columna de destilación: saca hierro y níquel puros de la roca",
  basis: { value: "Proceso carbonilo para el metal de los asteroides (Ni(CO)₄ a 50–60 °C, vuelta a metal a 220–250 °C)", source: SRC.carbonylAsteroid, note: `Es el primer paso del arranque de Metzger et al.: una máquina pequeña que hace el material de las siguientes. ${GAME}` },
};
export const EQ_EBW: EquipmentSpec = {
  id: "soldadora-haz",
  name: "Soldadora por haz de electrones",
  machine: "soldadora",
  fitsIn: ["fabrica"],
  racks: 1,
  massKg: 60,
  powerKw: 3,
  panel: "planos",
  status: "licencia",
  info: "Cañón de electrones que suelda en el vacío, como la herramienta URI que Savitskaya usó fuera de la Salyut 7 en 1984",
  basis: { value: "Soldadura por haz de electrones (herramienta URI del Instituto Paton, Salyut 7, 1984)", source: src(G.uri), note: `Suelda los tanques de titanio y los anillos de los módulos. ${GAME}` },
};
export const EQ_COMPOSITES: EquipmentSpec = {
  id: "celda-compuestos",
  name: "Celda de laminado de compuestos",
  machine: "compuestos",
  fitsIn: ["fabrica"],
  racks: 2,
  massKg: 130,
  powerKw: 8,
  panel: "planos",
  status: "licencia",
  info: "Mesa de enrollado de fibra y un horno de curado: cabinas de fibra de carbono, mástiles de alas solares y tejidos",
  basis: { value: "Fibra de carbono enrollada y curada en horno, como el Composite Crew Module de la NASA", source: src(G.ccm), note: `La resina llega en kits. ${GAME}` },
};
export const EQ_BIG_PRINTER: EquipmentSpec = {
  id: "impresora-grande",
  name: "Impresora de metal grande",
  machine: "impresora",
  fitsIn: ["fabrica"],
  racks: 2,
  massKg: 330,
  powerKw: 6,
  rate: 2,
  upgrades: "impresora",
  panel: "planos",
  status: "licencia",
  info: "Impresora de polvo de hierro carbonilo en dos bastidores: piezas grandes y el doble de rápida",
  basis: { value: "Sustituye a la impresora como la de la ESA, que solo hace piezas de menos de 250 g: aquí, cabezales de propulsor y paneles", source: src(G.esaPrinter), note: `Ninguna impresora de metal de este tamaño ha volado todavía. ${GAME}` },
};
export const EQ_BIG_PLANT: EquipmentSpec = {
  id: "planta-grande",
  name: "Planta de propelente grande",
  machine: "planta",
  fitsIn: ["planta", "fabrica"],
  racks: 4,
  massKg: 1200,
  powerKw: 30,
  rate: 3,
  upgrades: "planta",
  panel: "propelente",
  status: "licencia",
  info: "Tres pilas de electrolizadores y un reactor de amoníaco mayor: la planta trabaja tres veces más rápido",
  basis: { value: "Electrolizadores PEM de unos 30 kW, que gastan unos 55 kWh por kg de hidrógeno", source: SRC.pemElectrolysis, note: GAME },
};
export const EQ_CROPS: EquipmentSpec = {
  id: "campos-cultivo",
  name: "Campos de cultivo",
  fitsIn: ["agricola"],
  racks: 8,
  massKg: 1300,
  powerKw: 18,
  cropAreaM2: 60,
  panel: "materiales",
  status: "ficcion",
  info: "Una pared entera de bandejas de cultivo con luz LED, como un Veggie gigante: 60 m² de cosecha",
  basis: { value: "Bandejas bajo LED como Veggie y el APH de la ISS (0,13–0,2 m² cada uno), aquí en una pared entera", source: src(G.veggie), note: `Área y potencia (unos 300 W/m² de luz): valores de juego` },
};

/** Real ISS fabrication in Destiny's racks (data/iss.ts, «ISS_FABRICATION»): plastic printing and recycling. */
export const EQ_AMF: EquipmentSpec = {
  id: "amf",
  name: "Additive Manufacturing Facility",
  fitsIn: ["laboratorio", "fabrica"],
  racks: 1,
  massKg: 90,
  powerKw: 0.5,
  panel: "planos",
  status: "real",
  info: "Impresora de plástico de Redwire (antes Made In Space), en la ISS desde 2015: herramientas y piezas de plástico",
  basis: { value: "Additive Manufacturing Facility de Redwire, en la ISS desde 2015", source: src(ISS_SOURCES.printing), note: "Masa y potencia: valores de juego (la fuente no las da)" },
};
export const EQ_REFABRICATOR: EquipmentSpec = {
  id: "refabricator",
  name: "Refabricator",
  fitsIn: ["laboratorio", "fabrica"],
  racks: 1,
  massKg: 90,
  powerKw: 0.5,
  panel: "planos",
  status: "real",
  info: "Recicla plástico (piezas impresas, bolsas, espuma de embalaje) en filamento y vuelve a imprimir, como el de Tethers Unlimited (ISS, 2019)",
  basis: { value: "Refabricator de Tethers Unlimited, instalado en la ISS en febrero de 2019", source: src(ISS_SOURCES.printing), note: "Masa y potencia: valores de juego (la fuente no las da)" },
};

/** A life-support rack of eclss-real as equipment (power and mass: the sum of its machines, with their sources). */
const eclssRack = (kind: RackKind): EquipmentSpec => {
  const r = rackSpec(kind);
  const ms = r.machines.map(eclssMachine);
  return {
    id: `eclss-${kind}-bastidor`,
    name: r.name,
    fitsIn: ["laboratorio", "fabrica"],
    racks: Math.max(1, r.bays),
    massKg: Math.round(ms.reduce((a, m) => a + m.massKg.value, 0)),
    powerKw: ms.reduce((a, m) => a + m.powerW.value, 0) / 1000,
    panel: "materiales",
    status: "real",
    rack: kind,
    info: r.info,
    basis: { value: r.name, source: r.source.split(": ").pop()!, note: "Datos y kit 3D de la rama eclss-real (modules/life-support)" },
  };
};
/** Destiny's own life-support racks on the ISS: air (CDRA) and the thermal loops. */
export const EQ_ECLSS_AR = eclssRack("ar");
export const EQ_ECLSS_ITCS = eclssRack("itcs");

export const BASE_EQUIPMENT: readonly EquipmentSpec[] = [EQ_ECLSS_AR, EQ_ECLSS_ITCS, EQ_REFINERY, EQ_GLOVEBOX, EQ_FOUNDRY, EQ_PRINTER, EQ_PLANT, EQ_AMF, EQ_REFABRICATOR];
export const EQUIPMENT: readonly EquipmentSpec[] = [...BASE_EQUIPMENT, EQ_CARBONYL, EQ_EBW, EQ_COMPOSITES, EQ_BIG_PRINTER, EQ_BIG_PLANT, EQ_CROPS, ...BIO_EQUIPMENT];
export const equipmentById = (id: string): EquipmentSpec | undefined => EQUIPMENT.find((e) => e.id === id);

/** The basic printer only makes small parts (game value: the ESA printer's are under 250 g). */
export const SMALL_PRINTER_MAX_KG = 40;

// --- Modules ----------------------------------------------------------------------------

export const MOD_FAB2: ModuleSpec = {
  id: "modulo-fabricacion-2",
  name: "Segundo módulo de fabricación",
  kind: "fabrica",
  code: "FAB",
  lengthM: 8.53,
  diameterM: 4.27,
  massKg: 14520,
  powerKw: 2,
  racksPerSide: 6,
  endPort: true,
  status: "ficcion",
  basis: { value: "Como Destiny: 8,53 × 4,27 m, 14 520 kg, seis bastidores por cara", source: src(G.destiny), note: "Puerto CBM en el extremo para seguir creciendo" },
};
export const MOD_PLANT: ModuleSpec = {
  id: "modulo-planta",
  name: "Módulo de la planta de propelente",
  kind: "planta",
  code: "PLA",
  lengthM: 6.871,
  diameterM: 4.477,
  massKg: 10300,
  powerKw: 1.5,
  racksPerSide: 5,
  endPort: true,
  status: "ficcion",
  basis: { value: "Como Columbus: 6,871 × 4,477 m, 10 300 kg, 10 bastidores ISPR", source: src(G.columbus), note: "Puerto CBM en el extremo" },
};
export const MOD_FARM: ModuleSpec = {
  id: "modulo-agricola",
  name: "Módulo agrícola",
  kind: "agricola",
  code: "AGR",
  lengthM: 16.88,
  diameterM: 6.7,
  massKg: 23000,
  powerKw: 3,
  racksPerSide: 8,
  endPort: false,
  status: "ficcion",
  basis: { value: "Hinchable como el B330 de Bigelow: 16,88 × 6,7 m, 330 m³, 23 t", source: src(G.b330), note: "Ocho bastidores por cara para los campos de cultivo (valor de juego)" },
};
export const MOD_HANGAR: ModuleSpec = {
  id: "hangar-ampliado",
  name: "Ampliación del hangar",
  kind: "hangar",
  code: "HNG",
  lengthM: 10,
  diameterM: 0,
  massKg: 8000,
  powerKw: 0.5,
  racksPerSide: 0,
  endPort: false,
  hangarExtraM: 10,
  status: "ficcion",
  basis: { value: "10 m más de hangar hacia popa, sin presión como la bodega del transbordador", source: "https://en.wikipedia.org/wiki/Space_Shuttle_orbiter", note: "Tamaño y masa: valores de juego" },
};

/** Haven-2-type module (Vast, in development): a laboratory with racks, berthed by the arm. */
export const MOD_HAVEN2: ModuleSpec = {
  id: "modulo-haven-2",
  name: "Módulo tipo Haven-2",
  kind: "laboratorio",
  code: "HVN",
  lengthM: GROWTH_OPTIONS.haven2.lengthM,
  diameterM: GROWTH_OPTIONS.haven2.diameterM,
  massKg: 14000,
  powerKw: 2,
  racksPerSide: 6,
  endPort: true,
  status: "en-desarrollo",
  basis: { value: "Primer módulo de Haven-2 (Vast, 2028): 15,1 m de largo, casi el doble de volumen que Haven-1, con laboratorio", source: GROWTH_OPTIONS.haven2.source, note: `${GROWTH_OPTIONS.haven2.note}. Masa: la de Haven-1 (14 t), estimación; bastidores: valor de juego` },
};
/** Axiom Hab-1-type module (Axiom Station, in development): crew room. */
export const MOD_AXIOM_HAB: ModuleSpec = {
  id: "modulo-axiom-hab",
  name: "Módulo habitable tipo Axiom Hab-1",
  kind: "habitat",
  code: "AXH",
  lengthM: GROWTH_OPTIONS.axiomHab1.lengthM,
  diameterM: GROWTH_OPTIONS.axiomHab1.diameterM,
  massKg: 15000,
  powerKw: 2,
  racksPerSide: 2,
  endPort: false,
  status: "en-desarrollo",
  basis: { value: "Hab-1 de Axiom Station (2029): 11 × 4,2 m, camarotes", source: GROWTH_OPTIONS.axiomHab1.source, note: "Masa y bastidores: valores de juego (la fuente no los da)" },
};

/** Modules the station can grow by: real modules in development (docs/design/estacion-real.md). */
export const MODULES: readonly ModuleSpec[] = [MOD_HAVEN2, MOD_AXIOM_HAB, MOD_FAB2, MOD_PLANT, MOD_FARM, MOD_HANGAR];

// --- What the station is at the start ---------------------------------------------------

const iss = (id: string, kind: OutfitModule["kind"], racksPerSide: number, powerKw: number): OutfitModule => {
  const m = issModule(id);
  return { id, code: m.code, label: m.name, kind, racksPerSide, massKg: m.massKg, powerKw };
};

/**
 * The ISS's US segment (data/iss.ts). Rack bays per side for equipment: Destiny has six per side (real);
 * Columbus 5 + 5 = its ten ISPR (real); Kibo 5 per side of its 23 (game value). Power empty: game values.
 */
const BASE_MODULES: readonly OutfitModule[] = [
  iss("nodo-1", "nodo", 0, 0.5),
  iss("destiny", "laboratorio", 6, 2),
  iss("nodo-2", "nodo", 0, 0.5),
  iss("nodo-3", "nodo", 0, 1),
  iss("cupula", "cupula", 0, 0.2),
  iss("columbus", "fabrica", 5, 1.5),
  iss("kibo", "laboratorio", 5, 2),
  iss("quest", "esclusa", 0, 0.5),
  iss("bishop", "carga", 0, 0.1),
];

export const STARTING_OUTFIT: OutfitBase = {
  layout: POLANA_LAYOUT,
  berths: POLANA_BERTHS,
  modules: BASE_MODULES,
  // Side 0 is port (or forward, for modules along x), side 1 starboard (or aft); bays from the node.
  equipment: [
    { spec: EQ_GLOVEBOX, moduleId: "destiny", place: { side: 0, first: 1, count: 1 } },
    { spec: EQ_AMF, moduleId: "destiny", place: { side: 1, first: 2, count: 1 } },
    { spec: EQ_REFABRICATOR, moduleId: "destiny", place: { side: 0, first: 4, count: 1 } },
    { spec: EQ_ECLSS_AR, moduleId: "destiny", place: { side: 1, first: 5, count: 1 } },
    { spec: EQ_ECLSS_ITCS, moduleId: "destiny", place: { side: 0, first: 5, count: 1 } },
    { spec: EQ_PRINTER, moduleId: "columbus", place: { side: 0, first: 0, count: 1 } },
    { spec: EQ_REFINERY, moduleId: "columbus", place: { side: 0, first: 1, count: 1 } },
    { spec: EQ_FOUNDRY, moduleId: "columbus", place: { side: 1, first: 0, count: 1 } },
    { spec: EQ_PLANT, moduleId: "columbus", place: { side: 1, first: 1, count: 1 } },
  ],
  components: [WINGS_SAW, RADIATORS_EATCS, SHIELD_WHIPPLE],
  // Truss, wings' masts, PMAs and IDAs, the arm (game value; the ISS weighs 419 725 kg in all).
  structureMassKg: 45000,
};

/** A fresh outfit as the station starts. */
export const startingOutfit = (): StationOutfit => new StationOutfit(STARTING_OUTFIT, EQUIPMENT, MODULES);

// --- Blueprints -------------------------------------------------------------------------

const ASSEMBLY = {
  value: "El brazo de la estación lleva el módulo a un puerto CBM libre y lo atraca, como Canadarm2 en la ISS",
  source: src(G.canadarm),
  note: "Aquí se hace la estructura (anillos, vigas y bastidores) con metal de la roca; aviónica, juntas y ventanas llegan en kits. Receta y horas: valores de juego",
};

const growth = (id: string, product: Blueprint["product"], name: string, massKg: number, machine: Blueprint["machine"], requires: string | undefined, inputs: Amounts, hours: number, process: Blueprint["process"], steps: readonly string[]): Blueprint => ({
  id,
  name,
  product,
  machine,
  massKg,
  inputs,
  hours,
  process,
  steps,
  ...(requires ? { requires } : {}),
});
const mod = (m: ModuleSpec, requires: string, inputs: Amounts, hours: number, steps: readonly string[]) =>
  growth(`plano-modulo-${m.id}`, { kind: "module", module: m }, m.name, m.massKg, "montaje", requires, inputs, hours, m.kind === "hangar" ? { ...ASSEMBLY, value: "Vigas de acero impresas y montadas en el extremo del hangar" } : ASSEMBLY, steps);
const eq = (e: EquipmentSpec, machine: Blueprint["machine"], requires: string, inputs: Amounts, hours: number, steps: readonly string[]) =>
  growth(`plano-equipo-${e.id}`, { kind: "equipment", equipment: e }, e.name, e.massKg, machine, requires, inputs, hours, { value: e.basis.value, source: e.basis.source, note: e.basis.note ?? GAME }, steps);
const comp = (c: StationComponent, machine: Blueprint["machine"], requires: string, inputs: Amounts, hours: number, steps: readonly string[]) =>
  growth(`plano-${c.id}`, { kind: "part", partId: c.id }, c.name, c.massKg, machine, requires, inputs, hours, { value: c.basis.value, source: c.basis.source, note: `Se monta en la pestaña Estación. ${GAME}` }, steps);

const LAUNCHED = {
  value: "El módulo llega lanzado desde la Tierra y Canadarm2 lo atraca en un CBM libre, como en la ISS",
  source: src(G.canadarm),
  note: "Se paga con kits importados y se equipa con metal de la estación. Receta y horas: valores de juego",
};

/** Modules: big jobs for the outside assembly. The real ones (in development) first; the rest is backlog. */
export const MODULE_BLUEPRINTS: readonly Blueprint[] = [
  growth(`plano-modulo-${MOD_HAVEN2.id}`, { kind: "module", module: MOD_HAVEN2 }, MOD_HAVEN2.name, MOD_HAVEN2.massKg, "montaje", undefined, { kit: 40, hierro: 200 }, 200, { ...LAUNCHED, source: MOD_HAVEN2.basis.source }, ["recibe el módulo lanzado", "captúralo con Canadarm2", "atrácalo en el CBM y aprieta los 16 pernos", "prueba la presión del vestíbulo", "monta los bastidores del laboratorio"]),
  growth(`plano-modulo-${MOD_AXIOM_HAB.id}`, { kind: "module", module: MOD_AXIOM_HAB }, MOD_AXIOM_HAB.name, MOD_AXIOM_HAB.massKg, "montaje", undefined, { kit: 40, hierro: 150 }, 200, { ...LAUNCHED, source: MOD_AXIOM_HAB.basis.source }, ["recibe el módulo lanzado", "captúralo con Canadarm2", "atrácalo en el CBM y aprieta los 16 pernos", "prueba la presión del vestíbulo", "monta los camarotes"]),
  mod(MOD_FAB2, EQ_EBW.id, { hierro: 2400, niquel: 300, ceramica: 200, kit: 40 }, 400, ["imprime los anillos y las vigas", "suelda los anillos por haz de electrones", "monta los bastidores y el kit de aviónica", "prueba la presión con aire", "atraca el módulo en un puerto libre con el brazo"]),
  mod(MOD_PLANT, EQ_EBW.id, { hierro: 1800, niquel: 200, ceramica: 150, kit: 30 }, 300, ["imprime los anillos y las vigas", "suelda los anillos por haz de electrones", "monta las tuberías y los bastidores", "prueba la presión con aire", "atraca el módulo en un puerto libre con el brazo"]),
  mod(MOD_FARM, EQ_COMPOSITES.id, { carbono: 600, hierro: 900, agua: 500, kit: 60 }, 360, ["teje la capa de retención de fibra", "monta el núcleo rígido y los bastidores", "pliega el módulo", "atraca el módulo en un puerto libre con el brazo", "hínchalo despacio con aire"]),
  mod(MOD_HANGAR, EQ_BIG_PRINTER.id, { hierro: 3000, kit: 4 }, 240, ["imprime las vigas de acero", "monta las vigas en el extremo del hangar", "mueve la puerta a popa", "tiende las luces y los estantes"]),
];

/** Equipment: made by the machines the station already has (Metzger's bootstrapping). */
export const EQUIPMENT_BLUEPRINTS: readonly Blueprint[] = [
  eq(EQ_CARBONYL, "fundicion", EQ_FOUNDRY.id, { hierro: 20, niquel: 2, ceramica: 2, kit: 2 }, 30, ["cuela el cuerpo del reactor", "monta las válvulas y el sensor de CO del kit", "monta la columna de destilación", "prueba la presión con helio"]),
  eq(EQ_EBW, "impresora", EQ_PRINTER.id, { hierro: 10, niquel: 1, ceramica: 1, kit: 3 }, 24, ["imprime la carcasa del cañón", "monta el cátodo y la fuente de alta tensión del kit", "alinea las bobinas de enfoque", "suelda una probeta de prueba"]),
  eq(EQ_COMPOSITES, "fundicion", EQ_FOUNDRY.id, { hierro: 60, carbono: 10, ceramica: 6, kit: 3 }, 48, ["cuela la mesa y el mandril", "monta el horno de curado", "monta el cabezal de enrollado del kit", "cura una probeta de prueba"]),
  eq(EQ_BIG_PRINTER, "impresora", EQ_CARBONYL.id, { hierro: 150, niquel: 20, ceramica: 10, kit: 6 }, 96, ["imprime el bastidor por piezas con la impresora pequeña", "monta el láser y los espejos del kit", "carga el polvo de hierro carbonilo", "desmonta la impresora pequeña", "imprime una pieza de prueba"]),
  eq(EQ_BIG_PLANT, "soldadora", EQ_EBW.id, { hierro: 300, niquel: 30, ceramica: 40, kit: 10 }, 120, ["suelda los depósitos a presión", "monta las pilas de electrolizadores del kit", "monta el reactor de amoníaco", "conecta las tuberías", "prueba la estanqueidad con helio"]),
  eq(EQ_CROPS, "compuestos", EQ_COMPOSITES.id, { carbono: 40, hierro: 60, agua: 200, kit: 8 }, 72, ["lamina las bandejas de fibra", "monta los paneles de LED del kit", "tiende el riego", "siembra las semillas", "enciende la luz"]),
];

/**
 * The biology lab and its reactors (docs/design/autosustento.md): the lab needs the agricultural
 * module, every reactor needs the lab. Steel and slag glass from the rock, pumps, sensors and the
 * starter cultures in kits. Recipes and hours: game values.
 */
const bio = (e: EquipmentSpec, machine: Blueprint["machine"], requires: string | undefined, inputs: Amounts, hours: number, steps: readonly string[]): Blueprint => {
  const bp = growth(`plano-equipo-${e.id}`, { kind: "equipment", equipment: e }, e.name, e.massKg, machine, requires, inputs, hours, { value: e.basis.value, source: e.basis.source, note: e.basis.note ?? GAME }, steps);
  return e === EQ_BIO_LAB ? { ...bp, requiresModule: MOD_FARM.id } : bp;
};
export const BIO_BLUEPRINTS: readonly Blueprint[] = [
  bio(EQ_BIO_LAB, "fundicion", undefined, { hierro: 300, niquel: 20, ceramica: 40, kit: 4 }, 60, ["cuela el bastidor y la mesa", "monta la guantera y el banco del kit", "conecta el aire y la energía", "prueba la estanqueidad de la guantera"]),
  bio(EQ_SPIRULINA, "fundicion", EQ_BIO_LAB.id, { hierro: 500, ceramica: 300, kit: 3 }, 80, ["funde la escoria en tubos de vidrio", "monta los tubos en los bastidores", "tiende los LED del kit", "conecta el CO₂ y el oxígeno al aire de la estación"]),
  bio(EQ_LOOP, "fundicion", EQ_BIO_LAB.id, { hierro: 1100, niquel: 50, ceramica: 150, kit: 4 }, 120, ["cuela los tres depósitos", "monta las bombas y los sensores del kit", "une los depósitos en fila", "conecta la salida al riego de los cultivos"]),
  bio(EQ_PHB, "fundicion", EQ_BIO_LAB.id, { hierro: 180, niquel: 20, kit: 2 }, 48, ["cuela el depósito a presión", "monta la entrada de gases del kit", "conecta el hidrógeno, el oxígeno y el CO₂", "prueba las fugas con helio"]),
  bio(EQ_BIOMINING, "fundicion", EQ_BIO_LAB.id, { hierro: 700, ceramica: 200, kit: 2 }, 60, ["cuela los tanques", "reviste los tanques de cerámica", "monta los agitadores del kit", "conecta la salida a la fundición"]),
  bio(EQ_PROTEIN, "fundicion", EQ_BIO_LAB.id, { hierro: 180, niquel: 20, kit: 3 }, 48, ["cuela el depósito a presión", "monta la entrada de gases del kit", "conecta el hidrógeno y el CO₂", "monta el secador del polvo"]),
];

/** The station's own components: built here, fitted in the «Estación» tab. */
export const STATION_COMPONENT_BLUEPRINTS: readonly Blueprint[] = [
  comp(WINGS_IROSA, "compuestos", EQ_COMPOSITES.id, { carbono: 400, kit: 80 }, 120, ["lamina los mástiles enrollables", "extiende las mantas de células del kit", "suelda las cadenas de células", "enrolla las alas"]),
  comp(RADIATORS_DOUBLE, "impresora", EQ_BIG_PRINTER.id, { hierro: 1500, niquel: 100, kit: 10 }, 150, ["imprime los paneles con sus tubos", "suelda los colectores", "llena el circuito de amoníaco", "prueba las fugas"]),
  comp(SHIELD_STUFFED, "compuestos", EQ_COMPOSITES.id, { hierro: 800, carbono: 300, kit: 20 }, 100, ["imprime las láminas exteriores", "cose las mantas de Nextel y Kevlar del kit", "monta los separadores", "comprueba la separación"]),
];

export const GROWTH_BLUEPRINTS: readonly Blueprint[] = [...MODULE_BLUEPRINTS, ...EQUIPMENT_BLUEPRINTS, ...BIO_BLUEPRINTS, ...STATION_COMPONENT_BLUEPRINTS];

/**
 * What is not real goes to the backlog (docs/pendientes.md): kept in the code and the tests, but not
 * offered in the game unless the development switch is on (`?ficcion`, src/core/realism.ts). The
 * modules copied and built from rock, the hangar extension, the crop fields and the biology lab.
 */
export const BACKLOG_BLUEPRINT_IDS: ReadonlySet<string> = new Set([
  ...[MOD_FAB2, MOD_PLANT, MOD_FARM, MOD_HANGAR].map((m) => `plano-modulo-${m.id}`),
  `plano-equipo-${EQ_CROPS.id}`,
  ...BIO_BLUEPRINTS.map((b) => b.id),
]);

/** The blueprints the game offers: without the backlog unless the switch is on. */
export const offeredBlueprints = <B extends { readonly id: string }>(all: readonly B[], fiction: boolean): B[] => (fiction ? [...all] : all.filter((b) => !BACKLOG_BLUEPRINT_IDS.has(b.id)));
