import type { Blueprint } from "../domain/blueprint";
import type { Amounts } from "../domain/materials";
import { StationOutfit, type EquipmentSpec, type ModuleSpec, type OutfitBase, type OutfitModule, type StationComponent } from "../domain/outfit";
import { SRC } from "./sources";
import { POLANA_BERTHS, POLANA_LAYOUT, STRUCTURE_SOURCES } from "./structure";

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
  info: "Horno sellado de la refinería: saca el agua de la roca y funde el silicato para la electrólisis",
  basis: { value: "Horno de extracción térmica en un bastidor ISPR (700 kg como máximo)", source: SRC.thermalExtraction, note: GAME },
};
export const EQ_GLOVEBOX: EquipmentSpec = {
  id: "guantera",
  name: "Guantera",
  fitsIn: ["fabrica"],
  racks: 1,
  massKg: 700,
  powerKw: 1,
  panel: "materiales",
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
  info: "Fundición: funde y cuela el metal refinado; su cola de trabajos está en Fabricación",
  basis: { value: "Horno de fusión en un bastidor ISPR", source: SRC.mre, note: GAME },
};
export const EQ_PRINTER: EquipmentSpec = {
  id: "impresora",
  name: "Impresora 3D de metal",
  machine: "impresora",
  fitsIn: ["fabrica"],
  racks: 1,
  massKg: 180,
  powerKw: 1,
  panel: "planos",
  info: "Impresora de metal como la de la ESA en la ISS (acero, 2024): solo piezas pequeñas",
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
  info: "Electrolizador de agua y un reactor de amoníaco pequeños: hacen hidrógeno, oxígeno, amoníaco, hidracina y NTO",
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
  info: "Impresora de polvo de hierro carbonilo en dos bastidores: piezas grandes y el doble de rápida",
  basis: { value: "Sustituye a la impresora como la de la ESA, que solo hace piezas de menos de 250 g: aquí, cabezales de propulsor y paneles", source: src(G.esaPrinter), note: `Ninguna impresora de metal de este tamaño ha volado todavía. ${GAME}` },
};
export const EQ_BIG_PLANT: EquipmentSpec = {
  id: "planta-grande",
  name: "Planta de propelente grande",
  machine: "planta",
  fitsIn: ["planta"],
  racks: 4,
  massKg: 1200,
  powerKw: 30,
  rate: 3,
  upgrades: "planta",
  panel: "propelente",
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
  info: "Una pared entera de bandejas de cultivo con luz LED, como un Veggie gigante: 60 m² de cosecha",
  basis: { value: "Bandejas bajo LED como Veggie y el APH de la ISS (0,13–0,2 m² cada uno), aquí en una pared entera", source: src(G.veggie), note: `Área y potencia (unos 300 W/m² de luz): valores de juego` },
};

export const BASE_EQUIPMENT: readonly EquipmentSpec[] = [EQ_REFINERY, EQ_GLOVEBOX, EQ_FOUNDRY, EQ_PRINTER, EQ_PLANT];
export const EQUIPMENT: readonly EquipmentSpec[] = [...BASE_EQUIPMENT, EQ_CARBONYL, EQ_EBW, EQ_COMPOSITES, EQ_BIG_PRINTER, EQ_BIG_PLANT, EQ_CROPS];
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
  basis: { value: "10 m más de hangar hacia popa, sin presión como la bodega del transbordador", source: "https://en.wikipedia.org/wiki/Space_Shuttle_orbiter", note: "Tamaño y masa: valores de juego" },
};

export const MODULES: readonly ModuleSpec[] = [MOD_FAB2, MOD_PLANT, MOD_FARM, MOD_HANGAR];

// --- What the station is at the start ---------------------------------------------------

const BASE_MODULES: readonly OutfitModule[] = [
  { id: "nodo-1", code: "NOD1", label: "Nodo 1", kind: "nodo", racksPerSide: 0, massKg: 11612, powerKw: 0.5 },
  { id: "habitat", code: "HAB1", label: "Módulo habitable", kind: "habitat", racksPerSide: 0, massKg: 7500, powerKw: 3 },
  { id: "nodo-2", code: "NOD2", label: "Nodo 2 (atraque)", kind: "nodo", racksPerSide: 0, massKg: 11612, powerKw: 0.5 },
  { id: "fabrica", code: "FAB1", label: "Módulo de fabricación", kind: "fabrica", racksPerSide: 6, massKg: 14520, powerKw: 2 },
];

export const STARTING_OUTFIT: OutfitBase = {
  layout: POLANA_LAYOUT,
  berths: POLANA_BERTHS,
  modules: BASE_MODULES,
  // Side 0 is port, side 1 starboard (bays from node 1 aft): as the racks were before the station grew.
  equipment: [
    { spec: EQ_REFINERY, moduleId: "fabrica", place: { side: 0, first: 1, count: 1 } },
    { spec: EQ_GLOVEBOX, moduleId: "fabrica", place: { side: 1, first: 1, count: 1 } },
    { spec: EQ_FOUNDRY, moduleId: "fabrica", place: { side: 0, first: 3, count: 1 } },
    { spec: EQ_PRINTER, moduleId: "fabrica", place: { side: 1, first: 3, count: 1 } },
    { spec: EQ_PLANT, moduleId: "fabrica", place: { side: 0, first: 2, count: 1 } },
  ],
  components: [WINGS_SAW, RADIATORS_EATCS, SHIELD_WHIPPLE],
  // Truss, adapters, airlock and hangar (game value).
  structureMassKg: 45000,
};

/** A fresh outfit as the station starts. */
export const startingOutfit = (): StationOutfit => new StationOutfit(STARTING_OUTFIT, EQUIPMENT);

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

/** Modules: big jobs for the outside assembly. */
export const MODULE_BLUEPRINTS: readonly Blueprint[] = [
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

/** The station's own components: built here, fitted in the «Estación» tab. */
export const STATION_COMPONENT_BLUEPRINTS: readonly Blueprint[] = [
  comp(WINGS_IROSA, "compuestos", EQ_COMPOSITES.id, { carbono: 400, kit: 80 }, 120, ["lamina los mástiles enrollables", "extiende las mantas de células del kit", "suelda las cadenas de células", "enrolla las alas"]),
  comp(RADIATORS_DOUBLE, "impresora", EQ_BIG_PRINTER.id, { hierro: 1500, niquel: 100, kit: 10 }, 150, ["imprime los paneles con sus tubos", "suelda los colectores", "llena el circuito de amoníaco", "prueba las fugas"]),
  comp(SHIELD_STUFFED, "compuestos", EQ_COMPOSITES.id, { hierro: 800, carbono: 300, kit: 20 }, 100, ["imprime las láminas exteriores", "cose las mantas de Nextel y Kevlar del kit", "monta los separadores", "comprueba la separación"]),
];

export const GROWTH_BLUEPRINTS: readonly Blueprint[] = [...MODULE_BLUEPRINTS, ...EQUIPMENT_BLUEPRINTS, ...STATION_COMPONENT_BLUEPRINTS];
