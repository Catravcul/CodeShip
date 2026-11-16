import { Vec3 } from "@core/math/vec3";
import type { Quat } from "@core/math/quat";
import { G0, type Sourced } from "@core/units";
import type { RingSpec } from "@modules/gravity/domain/spin-gravity";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { clearanceTo, keepOutDelta, type Obstacle } from "@modules/flight/domain/keep-out";
import type { DockingTarget } from "./docking";
import { radiatorTemperatureK, shadowRadiusAt, wingPlanformM2, type RadiatorWing, type ShadowCone } from "./thermal";
import { auxPowerKw, relativeDose, type MothershipEquipment, type MothershipSlot } from "./equipment";
import { drivePlan, fitProblem, PROPELLANT_NAME, unitMassKg, type DrivePlan, type ElectricPropellant, type ElectricThruster, type MountFit, type ThrusterMount } from "./propulsion";

export type { Obstacle } from "@modules/flight/domain/keep-out";

/**
 * The mothership ("nave nodriza"): the big carrier with the counter-rotating 1 g rings, the farm
 * deck and the cabins, pushed between asteroids by electric thrusters fed by a fission reactor.
 * It parks a little away from the target and the light probe (the Explorer) flies the last leg.
 * See docs/design/nave-nodriza.md.
 *
 * Body frame like the probe's: x right, y up, z aft (forward is −z). The spine runs along z.
 */

/** One line of the mass budget. Most are estimates: `basis` says how each number was reached. */
export interface MassItem {
  readonly id: string;
  readonly label: string;
  readonly kg: number;
  readonly basis: string;
  readonly sources: readonly string[];
}

export type { ElectricThruster } from "./propulsion";

/** The mothership's electric propulsion: the propellant on board, the mounts and what is fitted. */
export interface PropulsionSpec {
  /** Electric propellant, or methane and oxygen for a chemical drive (then the mounts stay empty). */
  readonly propellant: ElectricPropellant;
  readonly mounts: readonly ThrusterMount[];
  /** What is fitted when the game starts. */
  readonly fitted: readonly MountFit[];
  /** Electric power the rest of the ship uses (rings, farm lights, life support): not for thrusters. */
  readonly hotelLoadKw: Sourced<number>;
}

export interface MothershipLayout {
  readonly lengthM: number;
  /** Docking port on the underside of the forward node: where its face is and which way it looks. */
  readonly port: { readonly position: Vec3; readonly normal: Vec3 };
  readonly nodeZ: number;
  readonly nodeRadiusM: number;
  readonly spine: { readonly fromZ: number; readonly toZ: number; readonly radiusM: number };
  /** Centre of the habitat ring and of its counter-rotating twin along the spine (ring ship only, fiction). */
  readonly habRingZ?: number;
  readonly twinRingZ?: number;
  /** Each of the two radiator wings (mirrored in x), in the plane y = 0 (nuclear-electric ring ship only). */
  readonly radiator?: RadiatorWing;
  readonly reactorZ?: number;
  /** Shadow shield between the reactor and the rest: the cone it casts and where the shield sits. */
  readonly shield?: { readonly halfAngleDeg: number; readonly nearZ: number; readonly farZ: number };
  readonly thrusterZ: number;
  /** Flaps along the hull (Starship): two forward and two aft, mirrored in x, how far out they reach. */
  readonly flaps?: readonly { readonly fromZ: number; readonly toZ: number; readonly spanM: number }[];
  /** Pressurised modules on the non-rotating spine, forward of the rings (see docs/design/interiores.md). */
  readonly spineModules: readonly SpineModule[];
}

/** A pressurised can on the spine: what it holds, where it is along z and how big. */
export interface SpineModule {
  readonly id: string;
  readonly name: string;
  readonly fromZ: number;
  readonly toZ: number;
  readonly radiusM: number;
  /** Real module it is modelled on. */
  readonly reference: string;
}

/**
 * Chemical propulsion (Starship): engines that burn methane and oxygen. In cruise only the vacuum engines
 * fire (the sea-level ones are for landing); the trip planner and the Δv use them.
 */
export interface ChemicalEngine {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly count: number;
  /** Thrust of one engine in vacuum, N. */
  readonly thrustN: number;
  /** Specific impulse in vacuum, s. */
  readonly ispS: number;
  readonly massKg: number;
  /** Fires in the cruise burns between asteroids. */
  readonly cruise: boolean;
  readonly sources: readonly string[];
  readonly note?: string;
}

export interface ChemicalDrive {
  readonly engines: readonly ChemicalEngine[];
  /** Oxidiser to fuel mass ratio the engines burn (O/F). */
  readonly mixtureRatio: Sourced<number>;
  /** Tank capacities, kg: what refuelling fills. */
  readonly oxygenKg: Sourced<number>;
  readonly methaneKg: Sourced<number>;
  /** Top speed of a hop between asteroids: burn to it, coast, brake (a game value). */
  readonly cruiseMS: Sourced<number>;
}

export interface MothershipSpec {
  readonly name: string;
  /** What the ship is (shown on the bay and the deck): real («real»), in development, or fiction. */
  readonly label?: "real" | "en-desarrollo" | "licencia" | "ficción";
  /** Each of the two counter-rotating rings (same radius and spin). Fiction: absent on a real ship. */
  readonly ring?: RingSpec;
  /** Methane-oxygen engines (Starship). When set, they drive the ship instead of the electric mounts. */
  readonly chemical?: ChemicalDrive;
  /** The reactor and its radiators (nuclear-electric ring ship only). */
  readonly power?: {
    readonly electricKw: Sourced<number>;
    readonly specificMassKgPerKw: Sourced<number>;
    readonly conversionEfficiency: Sourced<number>;
    /** Total radiating area (both faces of the two-sided panels). */
    readonly radiatorAreaM2: Sourced<number>;
    readonly radiatorEmissivity: Sourced<number>;
    /** Coldest point of the Brayton loop (compressor inlet): the radiator cannot run colder, K. */
    readonly coldEndK: Sourced<number>;
    /** Radiative sink temperature (deep space with margin), K. */
    readonly sinkK: Sourced<number>;
  };
  readonly propulsion: PropulsionSpec;
  /** Swappable equipment fitted at the start: auxiliary power and the habitat's radiation shield. */
  readonly equipment: readonly MothershipEquipment[];
  /** Distance from the Sun where it works (solar wings give 1/r² of their 1 AU power), AU. */
  readonly sunDistanceAu: Sourced<number>;
  readonly radiation: {
    /** Cosmic-ray dose with no shield, solar minimum, mSv per year. */
    readonly freeSpaceMSvPerYear: Sourced<number>;
    /** Career limit of effective dose, mSv. */
    readonly careerLimitMSv: Sourced<number>;
  };
  readonly propellantCapacityKg: number;
  /** Mass of the habitat ring alone; the twin is sized from it (same moment of inertia). */
  readonly habRingItems: readonly MassItem[];
  /** Everything else that is dry (spine, node, power, thrusters, bearings, crew). */
  readonly otherItems: readonly MassItem[];
  readonly layout: MothershipLayout;
  /** How far from the target's surface it parks (game value; see the doc for the real precedent). */
  readonly parkingDistanceM: Sourced<number>;
}

/** The ring ship (fiction, docs/pendientes.md): rings, reactor, radiators and shield all present. */
export type RingShipSpec = MothershipSpec & {
  readonly ring: RingSpec;
  readonly power: NonNullable<MothershipSpec["power"]>;
  readonly layout: MothershipLayout & Required<Pick<MothershipLayout, "habRingZ" | "twinRingZ" | "radiator" | "reactorZ" | "shield">>;
};

/** A piece of equipment as a line of the mass budget. */
const equipmentItem = (e: MothershipEquipment): MassItem => ({ id: e.slot, label: e.name, kg: e.massKg, basis: e.basis, sources: e.sources });

export class Mothership implements DockingTarget {
  readonly id = "nodriza";
  /** Id of the port the mothership itself is docked to (a station's), if any. */
  dockedTo: string | undefined;
  private propellant: number;
  private _position: Vec3;
  private _orientation: Quat;
  private fits: MountFit[];
  private equip: Map<MothershipSlot, MothershipEquipment>;

  constructor(
    readonly spec: MothershipSpec,
    position: Vec3,
    orientation: Quat,
    propellantKg = spec.propellantCapacityKg,
  ) {
    this.propellant = Math.min(propellantKg, spec.propellantCapacityKg);
    this._position = position;
    this._orientation = orientation;
    this.fits = spec.propulsion.mounts.map((m) => spec.propulsion.fitted.find((f) => f.mountId === m.id)).filter((f): f is MountFit => !!f);
    this.equip = new Map(spec.equipment.map((e) => [e.slot, e]));
  }

  get position(): Vec3 {
    return this._position;
  }
  get orientation(): Quat {
    return this._orientation;
  }

  /** Move the whole ship (a trip between parking points; docs/design/navegacion.md). A docked probe rides along. */
  moveTo(position: Vec3, orientation: Quat = this._orientation): void {
    this._position = position;
    this._orientation = orientation;
  }

  /**
   * Park the mothership so that a probe docked at its port (probe port at `probePortBody` in the
   * probe's frame) sits at `probeCentre`, both facing `orientation`.
   */
  static withProbeDockedAt(spec: MothershipSpec, probeCentre: Vec3, orientation: Quat, probePortBody: Vec3): Mothership {
    const portWorldOffset = orientation.rotate(probePortBody.sub(spec.layout.port.position));
    return new Mothership(spec, probeCentre.add(portWorldOffset), orientation);
  }

  /** Where to park for a target: `parkingDistanceM` above its surface, on the side of `from`. */
  static parkingPoint(spec: MothershipSpec, target: { position: Vec3; meanRadiusM: number }, from: Vec3): Vec3 {
    const dir = from.sub(target.position);
    const n = dir.length() < 1e-9 ? Vec3.Z : dir.normalize();
    return target.position.add(n.scale(target.meanRadiusM + spec.parkingDistanceM.value));
  }

  get name(): string {
    return this.spec.name;
  }

  // --- Mass -----------------------------------------------------------------

  /** The habitat ring's lines: the fixed ones and the radiation shield fitted around the module. */
  get habRingLines(): MassItem[] {
    const shield = this.equipment("blindaje");
    return shield ? [...this.spec.habRingItems, equipmentItem(shield)] : [...this.spec.habRingItems];
  }
  get habRingMassKg(): number {
    return this.habRingLines.reduce((m, i) => m + i.kg, 0);
  }
  /**
   * The twin turns the other way at the same radius and rate, so it must have the same moment of
   * inertia (≈ mass × R²) for the total angular momentum to be zero: it weighs as much.
   */
  get twinRingMassKg(): number {
    return this.habRingMassKg;
  }
  /** Every dry line of the budget, the twin ring included. */
  get massBudget(): MassItem[] {
    const aux = this.equipment("energia-auxiliar");
    const drive = this.drive;
    return [
      ...(this.spec.ring ? this.habRingLines : []),
      ...(this.spec.ring ? [{
        id: "anillo-gemelo",
        label: "Anillo gemelo (camarotes, almacenes, agua)",
        kg: this.twinRingMassKg,
        basis: "Gira al revés con el mismo radio: necesita el mismo momento de inercia, así que pesa lo mismo que el anillo habitable",
        sources: [],
      }] : []),
      ...this.spec.otherItems,
      ...(aux && aux.massKg ? [equipmentItem(aux)] : []),
      this.spec.chemical ? {
        id: "propulsores",
        label: `Motores (${this.spec.chemical.engines.map((e) => `${e.count} ${e.shortName}`).join(" + ")})`,
        kg: drive.massKg,
        basis: this.spec.chemical.engines.map((e) => `${e.count} × ${e.massKg} kg`).join(" + "),
        sources: [...new Set(this.spec.chemical.engines.flatMap((e) => e.sources))],
      } : {
        id: "propulsores",
        label: `Propulsores (${this.fits.filter((f) => f.count).map((f) => `${f.count} ${f.thruster.shortName}`).join(" + ") || "ninguno"}) con sus fuentes de potencia`,
        kg: this.drive.massKg,
        basis: this.fits
          .filter((f) => f.count)
          .map((f) => `${f.count} × (${unitMassKg(f.thruster)} kg: ${f.thruster.thrusterMassKg} kg el propulsor + ${f.thruster.ppuMassKg} kg la fuente)`)
          .join(" + ") || "Sin propulsores montados",
        sources: [...new Set(this.fits.flatMap((f) => f.thruster.sources))],
      },
    ];
  }
  get dryMassKg(): number {
    return this.massBudget.reduce((m, i) => m + i.kg, 0);
  }
  get propellantKg(): number {
    return this.propellant;
  }
  get massKg(): number {
    return this.dryMassKg + this.propellant;
  }

  /** Net spin angular momentum of the two rings (kg·m²/s): zero when they balance. */
  get ringAngularMomentum(): number {
    if (!this.spec.ring) return 0;
    const R = this.spec.ring.floorRadiusM;
    const w = (this.spec.ring.rpm * 2 * Math.PI) / 60;
    return this.habRingMassKg * R * R * w - this.twinRingMassKg * R * R * w;
  }

  // --- Propulsion -------------------------------------------------------------

  /** What each mount holds now. */
  get fitted(): readonly MountFit[] {
    return this.fits;
  }
  mount(id: string): ThrusterMount | undefined {
    return this.spec.propulsion.mounts.find((m) => m.id === id);
  }
  fitOf(mountId: string): MountFit | undefined {
    return this.fits.find((f) => f.mountId === mountId);
  }
  /** Power the reactor and the auxiliary source give the thrusters: their output less what the rest of the ship uses, kW. */
  get availableThrusterKw(): number {
    const p = this.spec.propulsion;
    return Math.max(0, (this.spec.power?.electricKw.value ?? 0) + this.auxiliaryKw - p.hotelLoadKw.value);
  }

  // --- Equipment (auxiliary power, radiation shield) ---------------------------------

  /** What is fitted in a slot. */
  equipment(slot: MothershipSlot): MothershipEquipment | undefined {
    return this.equip.get(slot);
  }
  get fittedEquipment(): MothershipEquipment[] {
    return [...this.equip.values()];
  }
  /** Fit a piece of equipment in its slot; returns what was there. */
  fitEquipment(e: MothershipEquipment): MothershipEquipment | undefined {
    const before = this.equip.get(e.slot);
    this.equip.set(e.slot, e);
    return before;
  }
  /** A copy with full propellant and one piece of equipment swapped: to see a change before making it. */
  withEquipment(e: MothershipEquipment, propellantKg = this.spec.propellantCapacityKg): Mothership {
    const copy = new Mothership({ ...this.spec, propulsion: { ...this.spec.propulsion, fitted: this.fits }, equipment: this.fittedEquipment }, this._position, this._orientation, propellantKg);
    copy.fitEquipment(e);
    return copy;
  }
  /** Power the auxiliary source adds where the ship is, kW. */
  get auxiliaryKw(): number {
    const e = this.equipment("energia-auxiliar");
    return e ? auxPowerKw(e, this.spec.sunDistanceAu.value) : 0;
  }
  /** Cosmic-ray dose inside the habitat with the shield fitted, mSv per year (the module's own wall not counted). */
  get crewDoseMSvPerYear(): number {
    const s = this.equipment("blindaje")?.shield;
    const k = s ? relativeDose(s.material, s.arealDensityGcm2) : 1;
    return this.spec.radiation.freeSpaceMSvPerYear.value * k;
  }
  /** Years aboard until the career limit is reached. */
  get yearsToCareerLimit(): number {
    return this.spec.radiation.careerLimitMSv.value / this.crewDoseMSvPerYear;
  }
  /** What the fitted thrusters can do with the power on hand. */
  get drive(): DrivePlan {
    const c = this.spec.chemical;
    const p = this.spec.propulsion.propellant;
    return c || p === "metano-oxigeno" ? chemicalPlan(c ?? { engines: [], mixtureRatio: { value: 0, source: "" }, oxygenKg: { value: 0, source: "" }, methaneKg: { value: 0, source: "" }, cruiseMS: { value: 0, source: "" } }) : drivePlan(this.fits, this.availableThrusterKw, p);
  }
  /** «metano y oxígeno» or the electric propellant's name: what the tanks hold. */
  get propellantName(): string {
    return PROPELLANT_NAME[this.spec.propulsion.propellant];
  }
  /** Oxygen and methane on board, split as the tanks are (chemical drive only). */
  get tanks(): { oxygenKg: number; methaneKg: number } | undefined {
    const c = this.spec.chemical;
    if (!c) return undefined;
    const ox = c.oxygenKg.value / (c.oxygenKg.value + c.methaneKg.value);
    return { oxygenKg: this.propellant * ox, methaneKg: this.propellant * (1 - ox) };
  }
  /**
   * Fit `count` units of `thruster` on a mount (0 empties it). Returns what was there before.
   * Throws if the mount does not exist, the units do not fit or cannot use the propellant on board.
   */
  refit(mountId: string, thruster: ElectricThruster, count: number): MountFit | undefined {
    const m = this.mount(mountId);
    if (!m) throw new Error(`Unknown mount ${mountId}`);
    const problem = fitProblem(m, thruster, count, this.spec.propulsion.propellant);
    if (problem) throw new Error(`${count} × ${thruster.id} do not fit on ${mountId}: ${problem.kind}`);
    const before = this.fitOf(mountId);
    const next: MountFit = { mountId, thruster, count };
    this.fits = this.spec.propulsion.mounts.map((x) => (x.id === mountId ? next : this.fitOf(x.id))).filter((f): f is MountFit => !!f);
    return before;
  }

  /** A copy with the propellant given (full by default) and one mount refitted: to see a change before making it. */
  withFit(mountId: string, thruster: ElectricThruster, count: number, propellantKg = this.spec.propellantCapacityKg): Mothership {
    const copy = new Mothership({ ...this.spec, propulsion: { ...this.spec.propulsion, fitted: this.fits }, equipment: this.fittedEquipment }, this._position, this._orientation, propellantKg);
    copy.refit(mountId, thruster, count);
    return copy;
  }

  /** Units that fire with the reactor's power. */
  get thrusterCount(): number {
    return this.drive.firingUnits;
  }
  get thrustN(): number {
    return this.drive.thrustN;
  }
  get thrusterPowerKw(): number {
    return this.drive.powerKw;
  }
  get accelerationMs2(): number {
    return this.thrustN / this.massKg;
  }
  /** Effective exhaust speed of the units that fire, m/s (0 if none can). */
  private get exhaustMs(): number {
    return this.drive.ispS * G0;
  }
  /** Delta-v left with the propellant on board, m/s (Tsiolkovsky). */
  deltaV(): number {
    if (this.exhaustMs <= 0) return 0;
    return this.exhaustMs * Math.log(this.massKg / this.dryMassKg);
  }
  /** Propellant a manoeuvre of `deltaVMs` burns, kg. */
  propellantFor(deltaVMs: number): number {
    if (this.exhaustMs <= 0) return deltaVMs > 0 ? Infinity : 0;
    return this.massKg * (1 - Math.exp(-deltaVMs / this.exhaustMs));
  }
  /** Days of continuous thrust a manoeuvre of `deltaVMs` takes. */
  burnDays(deltaVMs: number): number {
    const mdot = this.drive.massFlowKgS;
    if (mdot <= 0) return deltaVMs > 0 ? Infinity : 0;
    return this.propellantFor(deltaVMs) / mdot / 86400;
  }
  /** Load xenon (docked at a station): never past the tanks' capacity. Returns the kg taken. */
  refuel(kg: number): number {
    const took = Math.max(0, Math.min(kg, this.spec.propellantCapacityKg - this.propellant));
    this.propellant += took;
    return took;
  }
  /** Spend propellant on a manoeuvre; false (and nothing spent) if there is not enough. */
  burn(deltaVMs: number): boolean {
    const kg = this.propellantFor(deltaVMs);
    if (kg > this.propellant) return false;
    this.propellant -= kg;
    return true;
  }
  /** Waste heat the radiators must reject, kW. */
  get wasteHeatKw(): number {
    const p = this.spec.power;
    return p ? p.electricKw.value * (1 / p.conversionEfficiency.value - 1) : 0;
  }

  /** Planform of the two wings: the panels radiate from both faces, so half the radiating area, m². */
  get radiatorPlanformM2(): number {
    return this.spec.layout.radiator ? 2 * wingPlanformM2(this.spec.layout.radiator) : 0;
  }

  /** Mean radiator temperature that rejects the waste heat over the radiating area (Stefan–Boltzmann), K. */
  get radiatorTemperatureK(): number {
    const p = this.spec.power;
    if (!p) return 0;
    return radiatorTemperatureK(this.wasteHeatKw * 1000, p.radiatorAreaM2.value, p.radiatorEmissivity.value, p.sinkK.value);
  }

  /** The shield's shadow cone (apex at the reactor). */
  get shadow(): ShadowCone {
    const l = this.spec.layout;
    return { reactorZ: l.reactorZ ?? 0, halfAngleDeg: l.shield?.halfAngleDeg ?? 0 };
  }

  /** Radius the shield must have at body z to cast that cone, m. */
  shieldRadiusAt(z: number): number {
    return shadowRadiusAt(this.shadow, z);
  }

  // --- Geometry ---------------------------------------------------------------

  toWorld(body: Vec3): Vec3 {
    return this.position.add(this.orientation.rotate(body));
  }
  toBody(world: Vec3): Vec3 {
    return this.orientation.conjugate().rotate(world.sub(this.position));
  }

  /** The docking port in world space: its face and the outward axis a probe comes in along. */
  get port(): { position: Vec3; normal: Vec3; orientation: Quat } {
    const p = this.spec.layout.port;
    return { position: this.toWorld(p.position), normal: this.orientation.rotate(p.normal), orientation: this.orientation };
  }

  /** Pose of a probe latched to the port (its port at `probePortBody`), at rest with the mothership. */
  dockedPose(probePortBody: Vec3): RigidBodyState {
    const centre = this.port.position.sub(this.orientation.rotate(probePortBody));
    return RigidBodyState.at(centre).withOrientation(this.orientation);
  }

  /** Obstacles of the structure in the body frame. */
  get obstacles(): Obstacle[] {
    const l = this.spec.layout;
    const r = this.spec.ring;
    const out: Obstacle[] = [{ kind: "capsule", a: new Vec3(0, 0, l.spine.fromZ), b: new Vec3(0, 0, l.spine.toZ), radiusM: Math.max(l.spine.radiusM, l.nodeRadiusM) }];
    if (r && l.habRingZ !== undefined && l.twinRingZ !== undefined) {
      const tube = Math.hypot(r.widthM / 2, (r.deckHeightM + 1) / 2);
      const radR = r.floorRadiusM - (r.deckHeightM + 1) / 2;
      out.push({ kind: "ring", centreZ: l.habRingZ, radiusM: radR, tubeM: tube }, { kind: "ring", centreZ: l.twinRingZ, radiusM: radR, tubeM: tube });
    }
    const w = l.radiator;
    if (w)
      for (const s of [-1, 1])
        out.push({ kind: "box", centre: new Vec3(s * (w.innerX + w.spanM / 2), 0, (w.fromZ + w.toZ) / 2), half: new Vec3(w.spanM / 2, 0.5, (w.toZ - w.fromZ) / 2) });
    // Starship's flaps: thin plates out to each side, in the plane y = 0.
    for (const f of l.flaps ?? [])
      for (const s of [-1, 1]) out.push({ kind: "box", centre: new Vec3(s * (l.spine.radiusM + f.spanM / 2), 0, (f.fromZ + f.toZ) / 2), half: new Vec3(f.spanM / 2, 0.3, (f.toZ - f.fromZ) / 2) });
    return out;
  }

  /** Shortest gap between a world point and the structure, m (negative inside). */
  clearance(world: Vec3): number {
    return clearanceTo(this.keepOutBody, world);
  }

  /**
   * Game rule like the region's rocks: the probe cannot fly through the mothership. Returns the
   * change of velocity (world) that cancels any motion into the structure within the margin. Off
   * near the docking port, where the docking contact takes over.
   */
  keepOut(world: Vec3, velocity: Vec3): Vec3 {
    return keepOutDelta(this.keepOutBody, world, velocity);
  }

  private get keepOutBody() {
    return { position: this.position, orientation: this.orientation, obstacles: this.obstacles, freePorts: [this.port.position] };
  }
}

/** What the cruise engines of a chemical drive do together (no power drawn; no mounts). */
export function chemicalPlan(c: ChemicalDrive): DrivePlan {
  const cruise = c.engines.filter((e) => e.cruise);
  const thrustN = cruise.reduce((s, e) => s + e.count * e.thrustN, 0);
  const massFlowKgS = cruise.reduce((s, e) => s + (e.count * e.thrustN) / (e.ispS * G0), 0);
  const units = cruise.reduce((s, e) => s + e.count, 0);
  return {
    mounts: [],
    fittedUnits: c.engines.reduce((s, e) => s + e.count, 0),
    firingUnits: units,
    thrustN,
    powerKw: 0,
    availableKw: 0,
    massFlowKgS,
    ispS: massFlowKgS > 0 ? thrustN / (G0 * massFlowKgS) : 0,
    massKg: c.engines.reduce((s, e) => s + e.count * e.massKg, 0),
  };
}
