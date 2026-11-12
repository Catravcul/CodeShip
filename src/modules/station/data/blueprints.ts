import { ALL_PARTS } from "@modules/ship/data/parts";
import { ELECTRIC_THRUSTERS } from "@modules/mothership/data/thrusters";
import type { ElectricThruster } from "@modules/mothership/domain/propulsion";
import type { MothershipEquipment } from "@modules/mothership/domain/equipment";
import { MOTHERSHIP_EQUIPMENT } from "@modules/mothership/data/equipment";
import { isEmptyPart, type Part } from "@modules/ship/domain/refit";
import type { Equipment } from "@modules/ship/domain/equipment";
import { STATION_TUNING, type Blueprint, type CraftSpec, type MachineId } from "../domain/blueprint";
import type { Amounts } from "../domain/materials";
import { SRC } from "./sources";

/** RCS thrusters are swapped as the whole set the hull carries (`buildRcsLayout`). */
export const RCS_SET_SIZE = 24;

const round = (v: number) => Math.round(v * 100) / 100;

/** Feedstock for a finished mass split by material shares (game recipe), scrap included, plus imported kits. */
export function feedstock(massKg: number, shares: Readonly<Record<string, number>>, kits: number): Amounts {
  const feed = massKg / STATION_TUNING.fabricationYield;
  const out: Record<string, number> = Object.fromEntries(Object.entries(shares).map(([id, s]) => [id, round(feed * s)]));
  if (kits) out.kit = kits;
  return out;
}

/** Game recipes: which refined materials make each kind of part (shares of the metal that goes in). */
export const RECIPES = {
  /** Bipropellant engine: nickel superalloy chamber and nozzle, iron structure, ceramic insulation. */
  bipropellant: { niquel: 0.5, hierro: 0.4, ceramica: 0.1 },
  /** Hydrazine thruster: steel body, nickel valve seats and nozzle, ceramic support for the catalyst bed. */
  monopropellant: { hierro: 0.6, niquel: 0.3, ceramica: 0.1 },
  /** Tank: thin metal liner wound with carbon fibre (a composite overwrapped pressure vessel). */
  tank: { hierro: 0.85, carbono: 0.15 },
  /** Probe: iron frame, carbon panels, nickel fittings and ceramic heat shield. */
  probe: { hierro: 0.6, carbono: 0.2, niquel: 0.1, ceramica: 0.1 },
  /** Hall thruster: iron magnetic circuit, ceramic discharge channel, nickel fittings. */
  hall: { hierro: 0.7, ceramica: 0.2, niquel: 0.1 },
  /** Gridded ion thruster: iron body and magnets, carbon grids, ceramic insulators, nickel fittings. */
  ionico: { hierro: 0.5, carbono: 0.3, ceramica: 0.1, niquel: 0.1 },
  /** Magnetoplasma engine: iron structure, nickel RF couplers, ceramic helicon tube, carbon supports. */
  vasimr: { hierro: 0.5, niquel: 0.2, ceramica: 0.2, carbono: 0.1 },
  /** Iron-nickel steel (like a maraging steel): pressure walls, bumpers, frames. */
  acero: { hierro: 0.8, niquel: 0.2 },
  /** Carbon fibre (the resin comes in kits). */
  fibra: { carbono: 1 },
} as const;

/** Imported kits per electric thruster (game values): power processing, cathode and xenon flow control; magnet and RF for VASIMR. */
const DRIVE_KITS: Readonly<Record<ElectricThruster["family"], number>> = { hall: 3, ionico: 3, vasimr: 10 };
/** The X3's 100 kW power unit is three times the electronics of a 12 kW one (game value). */
const kitsFor = (t: ElectricThruster) => DRIVE_KITS[t.family] + (t.family === "hall" && t.powerKw > 50 ? 3 : 0);

const DRIVE_STEPS: Readonly<Record<ElectricThruster["family"], readonly string[]>> = {
  hall: ["imprime el circuito magnético de hierro", "tornea el canal de cerámica", "monta las bobinas del kit", "monta el cátodo del kit", "prueba el encendido en la cámara de vacío"],
  ionico: ["imprime la carcasa y los imanes", "corta las rejillas de carbono", "alinea las rejillas", "monta el cátodo y el neutralizador del kit", "prueba el haz en la cámara de vacío"],
  vasimr: ["imprime la cámara del helicón", "monta el imán superconductor del kit", "monta las antenas de radiofrecuencia", "enfría el imán", "prueba el plasma en la cámara de vacío"],
};

const PRINT = {
  value: "Impresión 3D de metal capa a capa con láser, como la impresora de metal de la ESA en la ISS (primera pieza de acero en agosto de 2024)",
  source: SRC.metalPrinter,
  note: "Recetas de material, rendimiento y horas: valores de juego",
};
const COPV = {
  value: "Forro metálico fundido y torneado, envuelto con fibra de carbono: un tanque compuesto (COPV)",
  source: SRC.copv,
  note: "La fibra sale del carbono de la roca. Recetas y horas: valores de juego",
};

/** Imported plate or cells: one kit stands for this many kg of what the rock cannot give (game value). */
export const KG_PER_IMPORTED_KIT = 25;
const importKits = (kg: number) => Math.max(1, Math.ceil(kg / KG_PER_IMPORTED_KIT));
const merge = (a: Amounts, b: Amounts): Amounts => {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = round((out[k] ?? 0) + v);
  return out;
};
const WELD = {
  value: "Chapa cortada y soldada por fricción-agitación, como los recipientes de presión de aluminio-litio de Orion y los tanques del Falcon 9",
  source: "https://en.wikipedia.org/wiki/Friction_stir_welding",
  note: "Recetas, kits y horas: valores de juego",
};
const LAYUP = {
  value: "Fibra de carbono enrollada y curada en horno, como el Composite Crew Module de la NASA",
  source: "https://compositesworld.com/articles/building-on-ccm-lessons-learned(2)",
  note: "La fibra sale del carbono de la roca y la resina llega en kits. Recetas y horas: valores de juego",
};
const ASSEMBLY = {
  value: "Montaje de componentes importados (células, electrónica, combustible nuclear) sobre una estructura hecha aquí",
  source: SRC.bootstrapping,
  note: "Lo que la roca no puede dar llega en kits (Metzger et al.). Recetas, kits y horas: valores de juego",
};

/** How the station makes a piece of the probe's equipment: what is rock, what is imported. */
function equipmentRecipe(e: Equipment): Pick<Blueprint, "machine" | "inputs" | "hours" | "process" | "steps"> {
  const m = e.massKg;
  const hours = Math.round(8 + m / 5);
  if (e.kind === "cabina") {
    const shell = m - 120;
    const fittings = feedstock(120, RECIPES.acero, 1);
    if (e.wall?.material.startsWith("Acero")) return { machine: "impresora", inputs: feedstock(m, RECIPES.acero, 2), hours, process: PRINT, steps: ["imprime los paneles de acero", "suelda los paneles", "monta las escotillas y ventanas del kit", "prueba la presión con aire"] };
    if (e.wall?.material === "CFRP") return { machine: "fundicion", inputs: merge(feedstock(shell, RECIPES.fibra, 4), fittings), hours, process: LAYUP, steps: ["enrolla la fibra sobre el molde", "impregna la fibra con la resina del kit", "cura la cabina en el horno", "pega los anillos de las escotillas", "prueba la presión con aire"] };
    return { machine: "fundicion", inputs: merge({ kit: importKits(shell) }, fittings), hours, process: WELD, steps: ["corta la chapa importada", "curva los paneles", "suelda los paneles por fricción", "monta las escotillas y ventanas", "prueba la presión con aire"] };
  }
  if (e.kind === "escudo") {
    if (e.bumper?.material === "Acero") return { machine: "impresora", inputs: feedstock(m, { hierro: 1 }, 0), hours, process: PRINT, steps: ["lamina el hierro en hojas finas", "imprime los soportes", "taladra los anclajes", "comprueba la separación"] };
    return { machine: "fundicion", inputs: merge({ kit: importKits(m * 0.65) }, feedstock(m * 0.35, RECIPES.acero, 0)), hours, process: WELD, steps: ["corta las láminas importadas", "imprime los soportes de acero", "curva las láminas", "comprueba la separación"] };
  }
  if (e.kind === "energia") {
    if (!e.solar) return { machine: "impresora", inputs: merge({ kit: 20 }, feedstock(m * 0.3, RECIPES.acero, 0)), hours, process: { ...ASSEMBLY, value: `${ASSEMBLY.value}: el plutonio-238 solo puede llegar de fuera` }, steps: ["imprime las aletas del radiador", "recibe las fuentes de calor del kit", "monta los termopares", "comprueba la potencia"] };
    const kits = Math.ceil(e.powerW / 500);
    return { machine: "impresora", inputs: merge({ kit: kits }, feedstock(m * 0.6, RECIPES.fibra, 0)), hours, process: ASSEMBLY, steps: ["imprime los paneles de fibra", "pega las células del kit", "suelda las cadenas de células", "monta las bisagras", "comprueba la potencia al sol"] };
  }
  // Battery: the cells are imported; the boxes are printed here.
  const kits = Math.ceil((e.storageWh ?? 0) / 1000);
  return { machine: "impresora", inputs: merge({ kit: kits }, feedstock(m * 0.2, RECIPES.acero, 0)), hours, process: ASSEMBLY, steps: ["imprime las cajas", "coloca las células del kit", "suelda las conexiones", "monta la electrónica de carga", "comprueba la tensión"] };
}

const short = (n: string) => n.replace(/^Aerojet Rocketdyne /, "").replace(/\s*\(.*\)$/, "");

/** The blueprint for a ship part in the catalog. */
export function partBlueprint(p: Part): Blueprint {
  if (p.kind === "equipment") return { id: `plano-${p.id}`, name: p.name, product: { kind: "part", partId: p.id }, massKg: p.equipment.massKg, ...equipmentRecipe(p.equipment) };
  if (p.kind === "tank") {
    const m = p.spec.dryMassKg;
    return {
      id: `plano-${p.id}`,
      name: p.name,
      product: { kind: "part", partId: p.id },
      machine: "fundicion",
      massKg: m,
      inputs: feedstock(m, RECIPES.tank, 1),
      hours: Math.round(4 + m / 2),
      process: COPV,
      steps: ["funde el forro del tanque", "tornea el forro hasta su espesor", "enrolla la fibra de carbono", "cura la resina en el horno", "prueba la presión con agua"],
    };
  }
  const model = p.model;
  const rcs = model.thrustN < 200;
  const count = rcs ? RCS_SET_SIZE : 1;
  const m = round(model.dryMassKg * count);
  const mono = model.propellant === "Hydrazine";
  // Valves and electronics (and the S-405 catalyst for hydrazine); a whole RCS set needs two more.
  const kits = 2 + (rcs ? 2 : 0);
  const machine: MachineId = "impresora";
  return {
    id: `plano-${p.id}`,
    name: rcs ? `Juego de ${count} RCS ${short(p.name)}` : `Motor ${short(p.name)}`,
    product: { kind: "part", partId: p.id },
    machine,
    massKg: m,
    inputs: feedstock(m, mono ? RECIPES.monopropellant : RECIPES.bipropellant, kits),
    hours: Math.round(6 + 5 * m),
    process: mono ? { ...PRINT, value: `${PRINT.value}. El lecho catalizador S-405 (iridio sobre alúmina) llega en un kit importado` } : PRINT,
    steps: mono
      ? ["carga el polvo de hierro y níquel", "imprime la cámara capa a capa", "monta el lecho catalizador del kit", "suelda la válvula del kit", "prueba la estanqueidad con helio"]
      : ["carga el polvo de níquel y hierro", "imprime la cámara y la tobera", "recubre la tobera de cerámica", "monta las válvulas del kit", "prueba la estanqueidad con helio"],
  };
}

/**
 * The blueprint for one of the mothership's electric thrusters: the head is printed here, its power
 * processing unit (and cathode, xenon flow control, or VASIMR's magnet and RF) comes in imported kits.
 */
export function driveBlueprint(t: ElectricThruster): Blueprint {
  const m = t.thrusterMassKg;
  return {
    id: `plano-${t.id}`,
    name: `Propulsor ${t.shortName}${t.experimental ? " (experimental)" : ""} para la nodriza`,
    product: { kind: "part", partId: t.id },
    machine: "impresora",
    massKg: m,
    inputs: feedstock(m, RECIPES[t.family], kitsFor(t)),
    hours: Math.round(12 + m / 2),
    process: {
      ...PRINT,
      value: `${PRINT.value}. Solo el cabezal: la fuente de potencia (${t.ppuMassKg} kg) llega en kits importados`,
      note: `${PRINT.note}. Masa del cabezal: la de ${t.shortName} (ver la ficha en la bahía)`,
    },
    steps: DRIVE_STEPS[t.family],
  };
}

/**
 * The blueprint for the mothership's auxiliary power or radiation shield. Solar wings: cells in kits,
 * carbon booms from the rock. Kilopower: the uranium core only comes from outside. Shields: water,
 * polyethylene (carbon and the hydrogen of water) or slag, all from the rock.
 */
export function mothershipEquipmentBlueprint(e: MothershipEquipment): Blueprint {
  const m = e.massKg;
  const base = { id: `plano-${e.id}`, name: `${e.name} para la nodriza`, product: { kind: "part" as const, partId: e.id }, massKg: m };
  if (e.slot === "energia-auxiliar") {
    if (!e.solar)
      return { ...base, machine: "impresora", inputs: merge({ kit: 40 }, feedstock(m * 0.5, RECIPES.acero, 0)), hours: Math.round(48 + m / 50), process: { ...ASSEMBLY, value: `${ASSEMBLY.value}: el núcleo de uranio solo puede llegar de fuera` }, steps: ["imprime el blindaje de sombra", "imprime las carcasas de los Stirling", "recibe los núcleos del kit", "monta los tubos de calor", "prueba los Stirling en caliente"] };
    return { ...base, machine: "impresora", inputs: merge({ kit: Math.ceil(e.powerKw / 10) }, feedstock(m * 0.5, RECIPES.fibra, 0)), hours: Math.round(24 + m / 20), process: ASSEMBLY, steps: ["imprime los mástiles de fibra", "extiende las mantas de células del kit", "suelda las cadenas de células", "enrolla las alas", "prueba el despliegue"] };
  }
  const material = e.shield!.material;
  const shares: Readonly<Record<string, number>> = material === "agua" ? { agua: 1 } : material === "polietileno" ? { carbono: 0.86, agua: 1.29 } : { ceramica: 1 };
  const steps = material === "agua" ? ["condensa el agua de la roca", "llena las bolsas", "cose las bolsas a las redes", "pesa cada bolsa"] : material === "polietileno" ? ["haz gas de síntesis con carbono y agua", "conviértelo en etileno", "polimeriza el etileno", "prensa los paneles"] : ["muele la escoria", "funde los bloques", "corta los bloques a medida", "pesa cada bloque"];
  const process =
    material === "polietileno"
      ? { value: "Gas de síntesis (CO e H₂) del carbono y el agua de la roca, Fischer–Tropsch hasta etileno y polimerización", source: "https://en.wikipedia.org/wiki/Fischer%E2%80%93Tropsch_process", note: "Recetas y horas: valores de juego" }
      : { value: material === "agua" ? "Agua de la roca en bolsas, como las bolsas de agua de los camarotes de la ISS" : "Escoria de la electrólisis colada en bloques", source: SRC.mre, note: "Recetas y horas: valores de juego" };
  return { ...base, machine: material === "agua" ? "refineria" : "fundicion", inputs: feedstock(m, shares, 2), hours: Math.round(48 + m / 500), process, steps };
}

/** A small prospecting probe to send ahead to asteroids (game values). */
export const PROBE: CraftSpec = {
  id: "sonda",
  name: "Sonda de prospección",
  kind: "sonda",
  massKg: 30,
  note: "Valor de juego: una sonda pequeña que se adelanta a los asteroides",
};

export const PROBE_BLUEPRINT: Blueprint = {
  id: "plano-sonda",
  name: PROBE.name,
  product: { kind: "craft", craft: PROBE },
  machine: "impresora",
  massKg: PROBE.massKg,
  inputs: feedstock(PROBE.massKg, RECIPES.probe, 3),
  hours: 36,
  process: PRINT,
  steps: ["imprime el armazón", "pega los paneles de carbono", "monta la electrónica del kit", "carga el programa de vuelo", "prueba la radio"],
};

/** Every blueprint the station knows: each part of the ship's catalog, the mothership's thrusters, and the probe. */
export const BLUEPRINTS: readonly Blueprint[] = [...ALL_PARTS.filter((p) => !isEmptyPart(p)).map(partBlueprint), ...ELECTRIC_THRUSTERS.map(driveBlueprint), ...MOTHERSHIP_EQUIPMENT.filter((e) => e.massKg > 0).map(mothershipEquipmentBlueprint), PROBE_BLUEPRINT];

export const blueprintById = (id: string): Blueprint | undefined => BLUEPRINTS.find((b) => b.id === id);
export const blueprintForPart = (partId: string): Blueprint | undefined => BLUEPRINTS.find((b) => b.product.kind === "part" && b.product.partId === partId);
