import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { MachineId } from "./blueprint";
import type { StationPanel } from "./interior";
import type { PressurisedModule, StationLayout, StructurePart } from "./structure";

/**
 * How the station grows (docs/design/estacion.md, «La estación crece»): new pressurised modules
 * berthed at free ports, equipment added, replaced or upgraded inside the modules' rack bays, and the
 * station's own components (solar wings, radiators, shields). Components need equipment, equipment
 * needs rack space in the right kind of module, and everything needs electric power that the wings
 * give and the radiators get rid of.
 */

/** Kinds of module a blueprint can add. The hangar extension is not pressurised and has no port. */
export type ModuleKind = "fabrica" | "agricola" | "planta" | "hangar";

/** A module the station can build and berth. */
export interface ModuleSpec {
  readonly id: string;
  readonly name: string;
  readonly kind: ModuleKind;
  /** Location code prefix (FAB, AGR, PLA) for the module's rack codes, like the ISS's LAB1. */
  readonly code: string;
  readonly lengthM: number;
  readonly diameterM: number;
  /** Real mass of the module it copies, kg. */
  readonly massKg: number;
  /** Power it draws empty (air, lights, thermal loop), kW. */
  readonly powerKw: number;
  /** ISPR rack bays on each long wall for equipment. */
  readonly racksPerSide: number;
  /** A free berthing port at its far end, so the station can keep growing outward. */
  readonly endPort: boolean;
  /** Hangar extension only: metres added aft. */
  readonly hangarExtraM?: number;
  readonly basis: Sourced<string>;
}

/** A machine or rack of equipment that goes inside a module. */
export interface EquipmentSpec {
  readonly id: string;
  readonly name: string;
  /** The machine queue it works (none for a glovebox or crop racks). */
  readonly machine?: MachineId;
  /** Kinds of module it fits in. */
  readonly fitsIn: readonly ModuleKind[];
  /** ISPR rack bays it takes, side by side on one wall. */
  readonly racks: number;
  readonly massKg: number;
  readonly powerKw: number;
  /** How much faster its machine works than the basic one (1 = same). */
  readonly rate?: number;
  /** The equipment it replaces in place (an upgrade). */
  readonly upgrades?: string;
  /** Tab of the station screen it opens when tapped inside the station. */
  readonly panel: StationPanel;
  /** Crop area it gives, m² (crop racks). */
  readonly cropAreaM2?: number;
  /** One line shown when tapped inside the station. */
  readonly info: string;
  readonly basis: Sourced<string>;
}

/** The station's own swappable components, configured in the «Estación» tab. */
export type StationSlot = "alas" | "radiadores" | "escudo";
export const STATION_SLOTS: readonly StationSlot[] = ["alas", "radiadores", "escudo"];

export interface StationComponent {
  readonly id: string;
  readonly name: string;
  readonly slot: StationSlot;
  readonly massKg: number;
  /** Electric power it gives (wings), kW. */
  readonly powerKw: number;
  /** Heat it rejects (radiators), kW. */
  readonly heatKw: number;
  /** What it does, in one line. */
  readonly effect: string;
  readonly basis: Sourced<string>;
}

/** A free spot where a new module can be berthed (a capped CBM port). */
export interface BerthSpec {
  readonly id: string;
  readonly label: string;
  /** Face of the port, body frame. */
  readonly position: Vec3;
  /** Outward axis: the new module grows along it. */
  readonly normal: Vec3;
}

/** A module of the station as the outfit sees it: where equipment can go. */
export interface OutfitModule {
  readonly id: string;
  readonly code: string;
  readonly label: string;
  readonly kind: ModuleKind | "nodo" | "habitat";
  readonly racksPerSide: number;
  readonly massKg: number;
  readonly powerKw: number;
  readonly spec?: ModuleSpec;
  /** The berth it was built at (built modules). */
  readonly berth?: string;
}

/** Rack bays on one long wall of a module: side 0 (port, or forward) or 1 (starboard, or aft). */
export interface RackPlace {
  readonly side: 0 | 1;
  readonly first: number;
  readonly count: number;
}

export interface InstalledEquipment {
  readonly spec: EquipmentSpec;
  readonly moduleId: string;
  readonly place: RackPlace;
  /** Ids it replaced (upgrades count as what they upgrade). */
  readonly supersedes: readonly string[];
}

/** What the station is at the start. */
export interface OutfitBase {
  readonly layout: StationLayout;
  readonly berths: readonly BerthSpec[];
  readonly modules: readonly OutfitModule[];
  readonly equipment: readonly { readonly spec: EquipmentSpec; readonly moduleId: string; readonly place: RackPlace }[];
  readonly components: readonly StationComponent[];
  /** Mass of everything not listed as a module, equipment or component (truss, adapters, hangar), kg. */
  readonly structureMassKg: number;
}

const overlap = (a: { min: Vec3; max: Vec3 }, b: { min: Vec3; max: Vec3 }, eps = 0.05) =>
  a.min.x < b.max.x - eps && a.max.x > b.min.x + eps && a.min.y < b.max.y - eps && a.max.y > b.min.y + eps && a.min.z < b.max.z - eps && a.max.z > b.min.z + eps;
/** Box round a module's cylinder (modules lie along x, y or z). */
const boxOfModule = (m: PressurisedModule) => {
  const r = m.radiusM;
  const pad = (k: "x" | "y" | "z") => (Math.abs(m.from[k] - m.to[k]) > 1e-6 ? 0 : r);
  const p = new Vec3(pad("x"), pad("y"), pad("z"));
  const lo = new Vec3(Math.min(m.from.x, m.to.x), Math.min(m.from.y, m.to.y), Math.min(m.from.z, m.to.z));
  const hi = new Vec3(Math.max(m.from.x, m.to.x), Math.max(m.from.y, m.to.y), Math.max(m.from.z, m.to.z));
  return { min: lo.sub(p), max: hi.add(p) };
};
const boxOfPart = (p: StructurePart) => ({ min: p.centre.sub(p.half), max: p.centre.add(p.half) });

/** A new module laid along a berth's axis. */
export function moduleAt(spec: ModuleSpec, berth: BerthSpec): PressurisedModule {
  return {
    id: spec.id,
    label: spec.name,
    kind: spec.kind === "hangar" ? "fabrica" : spec.kind,
    from: berth.position,
    to: berth.position.add(berth.normal.scale(spec.lengthM)),
    radiusM: spec.diameterM / 2,
    basis: spec.basis.value,
    source: spec.basis.source,
  };
}

const endBerth = (spec: ModuleSpec, berth: BerthSpec): BerthSpec => ({ id: `${spec.id}-extremo`, label: `Extremo del ${spec.name.charAt(0).toLowerCase()}${spec.name.slice(1)}`, position: berth.position.add(berth.normal.scale(spec.lengthM)), normal: berth.normal });

/**
 * The station's outfit: which modules are built and where, what equipment is in their racks, which
 * wings, radiators and shields it carries, and what is being built (so two jobs cannot claim the same
 * port or rack bays). `version` goes up each time the structure or the equipment changes.
 */
export class StationOutfit {
  readonly modules: OutfitModule[];
  readonly equipment: InstalledEquipment[];
  private readonly fitted = new Map<StationSlot, StationComponent>();
  private readonly pendingModules = new Map<string, string | undefined>();
  private readonly pendingEquipment = new Map<string, { spec: EquipmentSpec; moduleId: string; place: RackPlace }>();
  version = 0;
  private cache?: { version: number; layout: StationLayout; berths: BerthSpec[] };

  constructor(
    readonly base: OutfitBase,
    /** Every equipment spec, to name what a blueprint needs. */
    private readonly catalog: readonly EquipmentSpec[] = [],
  ) {
    this.modules = [...base.modules];
    this.equipment = base.equipment.map((e) => ({ ...e, supersedes: [] }));
    for (const c of base.components) this.fitted.set(c.slot, c);
  }

  // --- What is there ---------------------------------------------------------------------

  /** Whether a piece of equipment (or something that upgrades it) is installed. */
  has(equipmentId: string): boolean {
    return this.equipment.some((e) => e.spec.id === equipmentId || e.supersedes.includes(equipmentId));
  }

  hasModule(specId: string): boolean {
    return this.modules.some((m) => m.spec?.id === specId);
  }

  component(slot: StationSlot): StationComponent | undefined {
    return this.fitted.get(slot);
  }

  module(id: string): OutfitModule | undefined {
    return this.modules.find((m) => m.id === id);
  }

  equipmentIn(moduleId: string): InstalledEquipment[] {
    return this.equipment.filter((e) => e.moduleId === moduleId);
  }

  /** How much faster a machine works with the best equipment installed for it (1 by default). */
  rate(machine: MachineId): number {
    return Math.max(1, ...this.equipment.filter((e) => e.spec.machine === machine).map((e) => e.spec.rate ?? 1));
  }

  name(equipmentId: string): string {
    return this.catalog.find((e) => e.id === equipmentId)?.name ?? this.equipment.find((e) => e.spec.id === equipmentId)?.spec.name ?? equipmentId;
  }

  // --- Mass and power ---------------------------------------------------------------------

  get massKg(): number {
    const comp = [...this.fitted.values()].reduce((s, c) => s + c.massKg, 0);
    return this.base.structureMassKg + this.modules.reduce((s, m) => s + m.massKg, 0) + this.equipment.reduce((s, e) => s + e.spec.massKg, 0) + comp;
  }

  /** Electric power the wings give, kW. */
  get supplyKw(): number {
    return this.fitted.get("alas")?.powerKw ?? 0;
  }

  /** Heat the radiators can reject, kW: all the electric power ends up as heat. */
  get rejectKw(): number {
    return this.fitted.get("radiadores")?.heatKw ?? 0;
  }

  /** What the station can run: the smaller of the wings' power and the radiators' rejection, kW. */
  get capacityKw(): number {
    return Math.min(this.supplyKw, this.rejectKw);
  }

  /** What the modules and equipment draw, counting what is being built, kW. */
  get drawKw(): number {
    const pend = [...this.pendingEquipment.values()].reduce((s, p) => s + p.spec.powerKw - this.replacedPower(p.spec), 0);
    return this.modules.reduce((s, m) => s + m.powerKw, 0) + this.equipment.reduce((s, e) => s + e.spec.powerKw, 0) + pend;
  }

  private replacedPower(spec: EquipmentSpec): number {
    return spec.upgrades ? (this.equipment.find((e) => e.spec.id === spec.upgrades)?.spec.powerKw ?? 0) : 0;
  }

  // --- Structure ---------------------------------------------------------------------------

  /** The structure as it is now: the base modules plus the built ones, and the hangar as extended. */
  get layout(): StationLayout {
    return this.grown().layout;
  }

  /** Every berth: the base ones and the far end of each built module that has one. */
  get berths(): readonly BerthSpec[] {
    return this.grown().berths;
  }

  /** Berths with a module on them. */
  usedBerths(): Set<string> {
    return new Set(this.modules.flatMap((m) => (m.berth ? [m.berth] : [])));
  }

  private grown(): { layout: StationLayout; berths: BerthSpec[] } {
    if (this.cache?.version === this.version) return this.cache;
    const berths = [...this.base.berths];
    const modules = [...this.base.layout.modules];
    let parts = [...this.base.layout.parts];
    for (const m of this.modules) {
      if (!m.spec) continue;
      if (m.spec.kind === "hangar") {
        const extra = m.spec.hangarExtraM ?? 0;
        const d = new Vec3(0, 0, extra / 2);
        parts = parts.map((p) => (p.kind === "hangar" ? { ...p, centre: p.centre.add(d), half: p.half.add(d), basis: `${p.basis}. Ampliado ${extra} m hacia popa` } : p));
        continue;
      }
      const b = berths.find((x) => x.id === m.berth);
      if (!b) continue;
      modules.push(moduleAt(m.spec, b));
      if (m.spec.endPort) berths.push(endBerth(m.spec, b));
    }
    this.cache = { version: this.version, layout: { ...this.base.layout, modules, parts }, berths };
    return this.cache;
  }

  /** Whether a module fits at a berth without running into anything already built. */
  fitsAt(spec: ModuleSpec, berth: BerthSpec): boolean {
    const box = boxOfModule(moduleAt(spec, berth));
    const l = this.layout;
    return !l.modules.some((m) => overlap(box, boxOfModule(m))) && !l.parts.some((p) => overlap(box, boxOfPart(p)));
  }

  /** Berths a module could go to now (free, not claimed by a job, and it fits). */
  freeBerths(spec: ModuleSpec): BerthSpec[] {
    const used = this.usedBerths();
    const claimed = new Set([...this.pendingModules.values()].filter((x): x is string => !!x));
    return this.berths.filter((b) => !used.has(b.id) && !claimed.has(b.id) && this.fitsAt(spec, b));
  }

  // --- Rack bays ---------------------------------------------------------------------------

  /** Taken bays of a module, by side, counting jobs that claimed bays. */
  private taken(moduleId: string, except?: string): boolean[][] {
    const m = this.module(moduleId);
    const n = m?.racksPerSide ?? 0;
    const sides = [Array<boolean>(n).fill(false), Array<boolean>(n).fill(false)];
    const all = [...this.equipment.filter((e) => e.moduleId === moduleId), ...[...this.pendingEquipment.values()].filter((p) => p.moduleId === moduleId)];
    for (const e of all) {
      if (e.spec.id === except) continue;
      for (let i = 0; i < e.place.count; i++) sides[e.place.side]![e.place.first + i] = true;
    }
    return sides;
  }

  /** Free rack bays of a module. */
  freeRacks(moduleId: string): number {
    return this.taken(moduleId).flat().filter((t) => !t).length;
  }

  /**
   * Where a piece of equipment would go: in the module of what it upgrades (on its bays if it can),
   * otherwise the first module of the right kind with enough bays side by side on one wall.
   */
  placeFor(spec: EquipmentSpec): { moduleId: string; place: RackPlace } | undefined {
    const old = spec.upgrades ? this.equipment.find((e) => e.spec.id === spec.upgrades) : undefined;
    const kindOk = (m: OutfitModule) => (spec.fitsIn as readonly string[]).includes(m.kind);
    // An upgrade goes where the old one is if that module suits it, otherwise to a module that does.
    const home = old ? this.module(old.moduleId) : undefined;
    const candidates = [...(home && kindOk(home) ? [home] : []), ...this.modules.filter((m) => kindOk(m) && m !== home)];
    for (const m of candidates) {
      const sides = this.taken(m.id, old?.spec.id);
      const fits = (side: 0 | 1, first: number) => first >= 0 && first + spec.racks <= m.racksPerSide && sides[side]!.slice(first, first + spec.racks).every((t) => !t);
      if (old && m === home && fits(old.place.side, old.place.first)) return { moduleId: m.id, place: { side: old.place.side, first: old.place.first, count: spec.racks } };
      for (let first = 0; first + spec.racks <= m.racksPerSide; first++)
        for (const side of [0, 1] as const) if (fits(side, first)) return { moduleId: m.id, place: { side, first, count: spec.racks } };
    }
    return undefined;
  }

  // --- What blocks a blueprint ---------------------------------------------------------------

  /** Why something needing this equipment cannot be made now (undefined if it can). */
  missingEquipment(requires: string | undefined): string | undefined {
    return requires && !this.has(requires) ? `Necesita ${this.name(requires)} (Planos → Equipo)` : undefined;
  }

  private powerShort(addKw: number): string | undefined {
    const free = this.capacityKw - this.drawKw;
    return addKw > free + 1e-9 ? `Falta energía: pide ${num(addKw)} kW y quedan ${num(Math.max(0, free))} kW libres. Mejora las alas o los radiadores (pestaña Estación)` : undefined;
  }

  /** Why a module cannot be started now. */
  moduleBlocker(spec: ModuleSpec): string | undefined {
    if (this.hasModule(spec.id)) return "Ya está construido";
    if (this.pendingModules.has(spec.id)) return "En construcción";
    if (spec.kind !== "hangar" && !this.freeBerths(spec).length) return "No queda ningún puerto libre donde quepa";
    return this.powerShort(spec.powerKw);
  }

  /** Why a piece of equipment cannot be started now. */
  equipmentBlocker(spec: EquipmentSpec): string | undefined {
    if (this.equipment.some((e) => e.spec.id === spec.id)) return "Ya está montado";
    if (this.has(spec.id)) return "Ya hay uno mejor montado";
    if (this.pendingEquipment.has(spec.id)) return "En construcción";
    if (spec.upgrades && !this.has(spec.upgrades)) return `Mejora ${this.name(spec.upgrades)}: monta antes ese equipo`;
    if (!this.placeFor(spec)) {
      const where = spec.fitsIn.map((k) => MODULE_KIND_NAME[k]).join(" o ");
      return this.modules.some((m) => (spec.fitsIn as readonly string[]).includes(m.kind))
        ? `No cabe: pide ${spec.racks} ${spec.racks === 1 ? "bastidor libre" : "bastidores libres seguidos"} en un ${where}`
        : `Necesita un ${where} (Planos → Módulos)`;
    }
    return this.powerShort(spec.powerKw - this.replacedPower(spec));
  }

  /** Why a station component cannot replace the one fitted (power or heat would fall short). */
  componentBlocker(c: StationComponent): string | undefined {
    const supply = c.slot === "alas" ? c.powerKw : this.supplyKw;
    const reject = c.slot === "radiadores" ? c.heatKw : this.rejectKw;
    const draw = this.drawKw;
    if (draw > supply + 1e-9) return `Las máquinas gastan ${num(draw)} kW y estas alas dan ${num(supply)} kW`;
    if (draw > reject + 1e-9) return `Las máquinas gastan ${num(draw)} kW y estos radiadores expulsan ${num(reject)} kW`;
    return undefined;
  }

  // --- Building ---------------------------------------------------------------------------

  /** Claim a berth for a module about to be built. Returns the berth (undefined for the hangar). */
  claimModule(spec: ModuleSpec): string | undefined {
    const why = this.moduleBlocker(spec);
    if (why) throw new Error(`${spec.id}: ${why}`);
    const berth = spec.kind === "hangar" ? undefined : this.freeBerths(spec)[0]!.id;
    this.pendingModules.set(spec.id, berth);
    return berth;
  }

  /** Claim the rack bays for equipment about to be built. */
  claimEquipment(spec: EquipmentSpec): { moduleId: string; place: RackPlace } {
    const why = this.equipmentBlocker(spec);
    if (why) throw new Error(`${spec.id}: ${why}`);
    const at = this.placeFor(spec)!;
    this.pendingEquipment.set(spec.id, { spec, ...at });
    return at;
  }

  /** The module is berthed: it joins the structure. */
  completeModule(spec: ModuleSpec): OutfitModule {
    const berth = this.pendingModules.get(spec.id);
    this.pendingModules.delete(spec.id);
    const n = this.modules.filter((m) => m.code.startsWith(spec.code)).length + 1;
    const m: OutfitModule = { id: spec.id, code: `${spec.code}${n}`, label: spec.name, kind: spec.kind, racksPerSide: spec.racksPerSide, massKg: spec.massKg, powerKw: spec.powerKw, spec, ...(berth ? { berth } : {}) };
    this.modules.push(m);
    this.version++;
    return m;
  }

  /** The equipment is installed (replacing what it upgrades). */
  completeEquipment(spec: EquipmentSpec): InstalledEquipment {
    const at = this.pendingEquipment.get(spec.id) ?? { spec, ...this.placeFor(spec)! };
    this.pendingEquipment.delete(spec.id);
    const old = spec.upgrades ? this.equipment.findIndex((e) => e.spec.id === spec.upgrades) : -1;
    const supersedes = old >= 0 ? [this.equipment[old]!.spec.id, ...this.equipment[old]!.supersedes] : [];
    if (old >= 0) this.equipment.splice(old, 1);
    const e: InstalledEquipment = { spec, moduleId: at.moduleId, place: at.place, supersedes };
    this.equipment.push(e);
    this.version++;
    return e;
  }

  /** Fit a station component; returns the one it replaced. Throws if power or heat would fall short. */
  fitComponent(c: StationComponent): StationComponent | undefined {
    const why = this.componentBlocker(c);
    if (why) throw new Error(why);
    const before = this.fitted.get(c.slot);
    this.fitted.set(c.slot, c);
    this.version++;
    return before;
  }

  /** Crop area of all the crop racks, m². */
  get cropAreaM2(): number {
    return this.equipment.reduce((s, e) => s + (e.spec.cropAreaM2 ?? 0), 0);
  }
}

export const MODULE_KIND_NAME: Readonly<Record<ModuleKind, string>> = { fabrica: "módulo de fabricación", agricola: "módulo agrícola", planta: "módulo de la planta", hangar: "hangar" };

const num = (v: number) => (Math.round(v * 10) / 10).toLocaleString("es-ES", { maximumFractionDigits: 1 });
