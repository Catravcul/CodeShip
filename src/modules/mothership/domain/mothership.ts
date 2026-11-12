import { Vec3 } from "@core/math/vec3";
import type { Quat } from "@core/math/quat";
import { G0, type Sourced } from "@core/units";
import type { RingSpec } from "@modules/gravity/domain/spin-gravity";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { clearanceTo, keepOutDelta, type Obstacle } from "@modules/flight/domain/keep-out";
import type { DockingTarget } from "./docking";
import { drivePlan, fitProblem, unitMassKg, type DrivePlan, type ElectricPropellant, type ElectricThruster, type MountFit, type ThrusterMount } from "./propulsion";

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
  /** Centre of the habitat ring and of its counter-rotating twin along the spine. */
  readonly habRingZ: number;
  readonly twinRingZ: number;
  readonly radiator: { readonly fromZ: number; readonly toZ: number; readonly innerX: number; readonly spanM: number };
  readonly reactorZ: number;
  readonly thrusterZ: number;
}

export interface MothershipSpec {
  readonly name: string;
  /** Each of the two counter-rotating rings (same radius and spin). */
  readonly ring: RingSpec;
  readonly power: {
    readonly electricKw: Sourced<number>;
    readonly specificMassKgPerKw: Sourced<number>;
    readonly conversionEfficiency: Sourced<number>;
    readonly radiatorAreaM2: Sourced<number>;
  };
  readonly propulsion: PropulsionSpec;
  readonly propellantCapacityKg: number;
  /** Mass of the habitat ring alone; the twin is sized from it (same moment of inertia). */
  readonly habRingItems: readonly MassItem[];
  /** Everything else that is dry (spine, node, power, thrusters, bearings, crew). */
  readonly otherItems: readonly MassItem[];
  readonly layout: MothershipLayout;
  /** How far from the target's surface it parks (game value; see the doc for the real precedent). */
  readonly parkingDistanceM: Sourced<number>;
}

export class Mothership implements DockingTarget {
  readonly id = "nodriza";
  /** Id of the port the mothership itself is docked to (a station's), if any. */
  dockedTo: string | undefined;
  private propellant: number;
  private _position: Vec3;
  private _orientation: Quat;
  private fits: MountFit[];

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

  get habRingMassKg(): number {
    return this.spec.habRingItems.reduce((m, i) => m + i.kg, 0);
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
    return [
      ...this.spec.habRingItems,
      {
        id: "anillo-gemelo",
        label: "Anillo gemelo (camarotes, almacenes, agua)",
        kg: this.twinRingMassKg,
        basis: "Gira al revés con el mismo radio: necesita el mismo momento de inercia, así que pesa lo mismo que el anillo habitable",
        sources: [],
      },
      ...this.spec.otherItems,
      {
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
  /** Power the reactor can give the thrusters: its output less what the rest of the ship uses, kW. */
  get availableThrusterKw(): number {
    const p = this.spec.propulsion;
    return Math.max(0, this.spec.power.electricKw.value - p.hotelLoadKw.value);
  }
  /** What the fitted thrusters can do with the power on hand. */
  get drive(): DrivePlan {
    return drivePlan(this.fits, this.availableThrusterKw, this.spec.propulsion.propellant);
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
    const copy = new Mothership({ ...this.spec, propulsion: { ...this.spec.propulsion, fitted: this.fits } }, this._position, this._orientation, propellantKg);
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
    return p.electricKw.value * (1 / p.conversionEfficiency.value - 1);
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
    const tube = Math.hypot(r.widthM / 2, (r.deckHeightM + 1) / 2);
    const radR = r.floorRadiusM - (r.deckHeightM + 1) / 2;
    return [
      { kind: "capsule", a: new Vec3(0, 0, l.spine.fromZ), b: new Vec3(0, 0, l.spine.toZ), radiusM: Math.max(l.spine.radiusM, l.nodeRadiusM) },
      { kind: "ring", centreZ: l.habRingZ, radiusM: radR, tubeM: tube },
      { kind: "ring", centreZ: l.twinRingZ, radiusM: radR, tubeM: tube },
      ...[-1, 1].map(
        (s): Obstacle => ({
          kind: "box",
          centre: new Vec3(s * (l.radiator.innerX + l.radiator.spanM / 2), 0, (l.radiator.fromZ + l.radiator.toZ) / 2),
          half: new Vec3(l.radiator.spanM / 2, 0.5, (l.radiator.toZ - l.radiator.fromZ) / 2),
        }),
      ),
    ];
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
