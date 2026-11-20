import type { Sourced } from "@core/units";
import type { CraftSpec } from "./blueprint";
import type { Craft, Hangar } from "./hangar";

/**
 * The vehicle catalogue (docs/design/naves-reales.md): real ships, landers, probes and stations as
 * recipes of components. Each component is a part with its own blueprint at the station; the vehicle
 * is assembled from the parts waiting in the hangar.
 *
 * - `volado`: real and flown (or flying now).
 * - `en-desarrollo`: real programme with money and a launch date.
 * - `pausado`: hardware built, programme stopped (Gateway, March 2026).
 * - `concepto`: studies and roadmaps, no programme that pays for the vehicle.
 * - `inventado`: made up for the game (even if its parts are real).
 */
export type VehicleStatus = "volado" | "en-desarrollo" | "pausado" | "concepto" | "inventado";
export type VehicleKind = "nave" | "aterrizador" | "sonda" | "estacion";

export const STATUS_NAME: Readonly<Record<VehicleStatus, string>> = {
  volado: "Ha volado",
  "en-desarrollo": "En desarrollo",
  pausado: "En pausa",
  concepto: "Concepto",
  inventado: "Inventado",
};
export const VEHICLE_KIND_NAME: Readonly<Record<VehicleKind, string>> = { nave: "Nave", aterrizador: "Módulo de aterrizaje", sonda: "Sonda", estacion: "Estación" };

/** One line of a vehicle's recipe: so many of a part (its id, the same the hangar and the blueprints use). */
export interface VehicleLine {
  readonly partId: string;
  readonly count: number;
  /** What it does in the vehicle, in Spanish. */
  readonly role: string;
}

export interface VehicleSpecs {
  /** The mass the recipe is compared with; the note says whether it is dry or at launch. */
  readonly massKg?: Sourced<number>;
  /** Length × width × height, m (any order: only used to see if it fits). */
  readonly sizeM?: readonly [number, number, number];
  readonly crew: string;
  readonly gravity: string;
  readonly propulsion: string;
}

export interface VehicleEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: VehicleKind;
  readonly status: VehicleStatus;
  /** Why it has that status, with dates. */
  readonly statusNote: string;
  readonly programme: string;
  /** Launch date (flown) or target date (in development). */
  readonly launch: string;
  readonly specs: VehicleSpecs;
  /** Empty when no breakdown has been published: then it cannot be built. */
  readonly lines: readonly VehicleLine[];
  readonly sources: readonly string[];
  /** What the game would gain and lose with it. */
  readonly gameplay: { readonly gains: string; readonly losses: string };
  /** What it looks like outside and inside, and how it keeps its crew alive (the base for a rebuild). */
  readonly look?: VehicleLook;
  /** The game's craft whose role it could take. */
  readonly replaces?: "nodriza" | "modulo" | "sonda" | "estacion";
  /** One of the mothership options in docs/design/naves-reales.md. */
  readonly mothershipOption?: "A" | "B" | "C";
  /** It is the player's own craft (the Apollo LM is the lander, Juventas the probe). */
  readonly playerCraft?: "modulo" | "sonda";
  /** What the game keeps, adapts or licenses of it (shown on its card). */
  readonly adaptations?: readonly { readonly what: string; readonly reality: "real" | "en-desarrollo" | "licencia" | "ficcion"; readonly why: string }[];
}

export interface VehicleLook {
  /** Overall shape, dimensions and the big outside parts: arrays, radiators, ports, engines, trusses. */
  readonly exterior: string;
  /** Module by module: volumes, quarters, galley, hygiene, exercise, work, stowage, hatches. */
  readonly interior: string;
  /** Life support as flown or planned: O₂, CO₂, water, waste, food, heat, power, radiation shelter. */
  readonly lifeSupport: string;
  /** Reference pictures (pages with photos or renders). */
  readonly images: readonly string[];
}

/** What the station knows: parts waiting at the station and the blueprint for each part (with why it is locked). */
export interface CatalogueInventory {
  count(partId: string): number;
  blueprint(partId: string): { readonly id: string; readonly locked?: string } | undefined;
}

export interface LineStatus {
  readonly line: VehicleLine;
  readonly have: number;
  readonly missing: number;
  /** `sin-plano`: the station has no blueprint for it; `bloqueado`: it has one but lacks its machine. */
  readonly blueprint: "sin-plano" | "bloqueado" | "disponible";
  readonly blueprintId?: string;
  readonly locked?: string;
}

export function lineStatus(entry: VehicleEntry, inv: CatalogueInventory): LineStatus[] {
  return entry.lines.map((line) => {
    const have = inv.count(line.partId);
    const bp = inv.blueprint(line.partId);
    const base = { line, have, missing: Math.max(0, line.count - have) };
    if (!bp) return { ...base, blueprint: "sin-plano" as const };
    return bp.locked ? { ...base, blueprint: "bloqueado" as const, blueprintId: bp.id, locked: bp.locked } : { ...base, blueprint: "disponible" as const, blueprintId: bp.id };
  });
}

/** The lines that still lack parts in the hangar. */
export const missingParts = (entry: VehicleEntry, inv: CatalogueInventory): LineStatus[] => lineStatus(entry, inv).filter((l) => l.missing > 0);

/** Every part is in the hangar (and there is a recipe at all). */
export const canBuild = (entry: VehicleEntry, inv: CatalogueInventory): boolean => entry.lines.length > 0 && missingParts(entry, inv).length === 0;

/** Mass from the components, which parts have no known mass, and how much of the real mass the recipe covers. */
export function componentMass(entry: VehicleEntry, massOf: (partId: string) => number | undefined): { kg: number; unknown: string[]; coverage?: number } {
  let kg = 0;
  const unknown: string[] = [];
  for (const l of entry.lines) {
    const m = massOf(l.partId);
    if (m === undefined) unknown.push(l.partId);
    else kg += m * l.count;
  }
  const real = entry.specs.massKg?.value;
  return { kg, unknown, ...(real ? { coverage: kg / real } : {}) };
}

/**
 * Where a vehicle is put together and let go at the ISS-type station (docs/design/modulo-lunar-juventas.md,
 * «Montaje»). What exists on the ISS replaces the old hangar:
 * - `bishop`: a smallsat that fits inside the Bishop airlock (3,99 m³, a bell of 2,014 × 1,8 m) is built
 *   indoors and goes out through it (real since 2020);
 * - `jem-ef`: an unpressurised payload of up to 500 kg in 1,85 × 1,0 × 0,8 m waits on a JEM-EF port
 *   and the arm takes it off (real: the Exposed Facility's standard site);
 * - `brazo-cbm`: a vehicle the arm can hold (Canadarm2: up to 116 t) is berthed on a CBM while it is
 *   put together and let go by the arm (real: Cygnus, HTV, Dragon cargo). Our rule: no longer than the
 *   arm itself (17,6 m), or it cannot be swung clear;
 * - `dique`: anything else, on the open dry-dock truss: a licence (nobody has built one at that scale).
 */
export type AssemblySite = "bishop" | "jem-ef" | "brazo-cbm" | "dique";

export const ASSEMBLY_SITE_NAME: Readonly<Record<AssemblySite, string>> = {
  bishop: "la esclusa Bishop",
  "jem-ef": "la plataforma expuesta (JEM-EF)",
  "brazo-cbm": "el CBM, con el brazo",
  dique: "el dique seco (licencia)",
};

/** What «let it go» is called at each site: a smallsat or a payload is deployed, a vehicle is launched off the arm. */
export const RELEASE_VERB: Readonly<Record<AssemblySite, string>> = { bishop: "Desplegar", "jem-ef": "Desplegar", "brazo-cbm": "Botar", dique: "Botar" };

/** The real limits of each site (from the station's data, docs/design/estacion-real.md). */
export interface AssemblyLimits {
  readonly bishop: { readonly volumeM3: number; readonly diameterM: number; readonly heightM: number };
  readonly jemEf: { readonly massKg: number; readonly envelopeM: readonly [number, number, number] };
  readonly arm: { readonly maxPayloadKg: number; readonly lengthM: number };
}

export interface AssemblyPlan {
  readonly site: AssemblySite;
  /** Real (it is done this way on the ISS) or licence (the dry dock). */
  readonly reality: "real" | "licencia";
  /** Why there, in Spanish, with the numbers. */
  readonly why: string;
}

const desc = (v: readonly number[]) => [...v].sort((p, q) => q - p);
const fmt = (v: number) => v.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Whether a box fits in a cylinder (stood on any face): its base diagonal within the diameter, its height within the height. */
function fitsCylinder(size: readonly [number, number, number], diameterM: number, heightM: number): boolean {
  const [a, b, c] = size;
  const tries: [number, number, number][] = [[a, b, c], [a, c, b], [b, c, a]];
  return tries.some(([x, y, h]) => Math.hypot(x, y) <= diameterM + 1e-9 && h <= heightM + 1e-9);
}

/** Where `entry` is assembled and let go, given its built mass (from its parts). */
export function assemblyPlan(entry: VehicleEntry, builtKg: number, limits: AssemblyLimits): AssemblyPlan {
  const size = entry.specs.sizeM;
  const kg = builtKg > 0 ? builtKg : (entry.specs.massKg?.value ?? 0);
  const L = limits;
  if (size && entry.kind === "sonda" && fitsCylinder(size, L.bishop.diameterM, L.bishop.heightM) && size[0] * size[1] * size[2] <= L.bishop.volumeM3) {
    return { site: "bishop", reality: "real", why: `Cabe en la Bishop (${fmt(size[0] * size[1] * size[2])} de ${fmt(L.bishop.volumeM3)} m³): se monta dentro y sale por la esclusa` };
  }
  if (size && kg > 0 && kg <= L.jemEf.massKg && desc(size).every((v, i) => v <= desc(L.jemEf.envelopeM)[i]! + 1e-9)) {
    return { site: "jem-ef", reality: "real", why: `Carga expuesta de ${fmt(kg)} kg (hasta ${fmt(L.jemEf.massKg)} kg y ${L.jemEf.envelopeM.map(fmt).join(" × ")} m por puerto): espera en la JEM-EF` };
  }
  const longest = size ? desc(size)[0]! : 0;
  if (entry.kind !== "estacion" && kg > 0 && kg <= L.arm.maxPayloadKg && size && longest <= L.arm.lengthM) {
    return { site: "brazo-cbm", reality: "real", why: `Canadarm2 lo sujeta en el CBM: ${fmt(kg)} kg de hasta ${fmt(L.arm.maxPayloadKg)} y ${fmt(longest)} m, no más largo que el brazo (${fmt(L.arm.lengthM)} m)` };
  }
  const why = !size ? "Sin medidas publicadas" : kg > L.arm.maxPayloadKg ? `${fmt(kg)} kg: más de lo que mueve el brazo (${fmt(L.arm.maxPayloadKg)} kg)` : `${fmt(longest)} m: más largo que el brazo (${fmt(L.arm.lengthM)} m)`;
  return { site: "dique", reality: "licencia", why: `${why}: se monta en el dique seco, una celosía que nadie ha construido a esa escala` };
}

const CRAFT_KIND: Readonly<Record<VehicleKind, CraftSpec["kind"]>> = { nave: "nave", aterrizador: "aterrizador", sonda: "sonda", estacion: "estacion" };

/** Use the parts waiting at the station to put the vehicle together at its assembly site (`site`). */
export function assemble(entry: VehicleEntry, hangar: Hangar, inv: CatalogueInventory, massOf: (partId: string) => number | undefined, site?: AssemblySite): Craft {
  const short = missingParts(entry, inv);
  if (!entry.lines.length) throw new Error(`${entry.id}: no recipe`);
  if (short.length) throw new Error(`${entry.id}: missing ${short.map((l) => `${l.missing} × ${l.line.partId}`).join(", ")}`);
  for (const l of entry.lines) for (let i = 0; i < l.count; i++) hangar.take(l.partId);
  return hangar.addCraft({ id: entry.id, name: entry.name, kind: CRAFT_KIND[entry.kind], massKg: Math.round(componentMass(entry, massOf).kg), note: `Montada con las piezas del catálogo (${STATUS_NAME[entry.status].toLowerCase()})`, ...(site ? { site } : {}) });
}

/**
 * A component the ship catalogue did not have: a real engine, hull or body taken from the vehicle's
 * own data. When a source gives no breakdown, the «cuerpo» is what is left of the real mass once the
 * catalogue's parts are taken away (its note says so).
 */
export interface CatalogueComponent {
  readonly id: string;
  readonly name: string;
  readonly kind: "motor" | "habitat" | "estructura" | "energia" | "electronica";
  readonly massKg: Sourced<number>;
  readonly status: VehicleStatus;
  readonly sources: readonly string[];
}
