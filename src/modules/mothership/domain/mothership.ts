import { Vec3 } from "@core/math/vec3";
import type { Quat } from "@core/math/quat";
import { G0, type Sourced } from "@core/units";
import type { RingSpec } from "@modules/gravity/domain/spin-gravity";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";

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

/** A real electric thruster at one operating point. */
export interface ElectricThruster {
  readonly name: string;
  readonly thrustN: number;
  readonly ispS: number;
  readonly powerKw: number;
  readonly propellant: string;
  readonly sources: readonly string[];
  readonly note?: string;
}

/** A capsule (segment with a radius) or a ring tube in the body frame, used to keep the probe out. */
export type Obstacle =
  | { readonly kind: "capsule"; readonly a: Vec3; readonly b: Vec3; readonly radiusM: number }
  | { readonly kind: "ring"; readonly centreZ: number; readonly radiusM: number; readonly tubeM: number }
  | { readonly kind: "box"; readonly centre: Vec3; readonly half: Vec3 };

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
  readonly thruster: ElectricThruster;
  readonly thrusterCount: number;
  readonly propellantCapacityKg: number;
  /** Mass of the habitat ring alone; the twin is sized from it (same moment of inertia). */
  readonly habRingItems: readonly MassItem[];
  /** Everything else that is dry (spine, node, power, thrusters, bearings, crew). */
  readonly otherItems: readonly MassItem[];
  readonly layout: MothershipLayout;
  /** How far from the target's surface it parks (game value; see the doc for the real precedent). */
  readonly parkingDistanceM: Sourced<number>;
}

/** Margin the probe keeps from the structure (its own half-size plus a little), m. Game rule. */
const PROBE_MARGIN_M = 4;
/** Near the docking port the keep-out rule is off, so the probe can reach the port. */
const PORT_FREE_RADIUS_M = 14;

export class Mothership {
  private propellant: number;

  constructor(
    readonly spec: MothershipSpec,
    readonly position: Vec3,
    readonly orientation: Quat,
    propellantKg = spec.propellantCapacityKg,
  ) {
    this.propellant = Math.min(propellantKg, spec.propellantCapacityKg);
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

  get thrustN(): number {
    return this.spec.thruster.thrustN * this.spec.thrusterCount;
  }
  get thrusterPowerKw(): number {
    return this.spec.thruster.powerKw * this.spec.thrusterCount;
  }
  get accelerationMs2(): number {
    return this.thrustN / this.massKg;
  }
  private get exhaustMs(): number {
    return this.spec.thruster.ispS * G0;
  }
  /** Delta-v left with the propellant on board, m/s (Tsiolkovsky). */
  deltaV(): number {
    return this.exhaustMs * Math.log(this.massKg / this.dryMassKg);
  }
  /** Propellant a manoeuvre of `deltaVMs` burns, kg. */
  propellantFor(deltaVMs: number): number {
    return this.massKg * (1 - Math.exp(-deltaVMs / this.exhaustMs));
  }
  /** Days of continuous thrust a manoeuvre of `deltaVMs` takes. */
  burnDays(deltaVMs: number): number {
    const mdot = this.thrustN / this.exhaustMs;
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

  /** Distance from a body-frame point to an obstacle's surface and the outward direction there. */
  private static gap(o: Obstacle, p: Vec3): { d: number; n: Vec3 } {
    if (o.kind === "capsule") {
      const ab = o.b.sub(o.a);
      const t = Math.max(0, Math.min(1, p.sub(o.a).dot(ab) / ab.dot(ab)));
      const rel = p.sub(o.a.add(ab.scale(t)));
      const len = rel.length();
      return { d: len - o.radiusM, n: len < 1e-9 ? Vec3.Y : rel.scale(1 / len) };
    }
    if (o.kind === "ring") {
      const rho = Math.hypot(p.x, p.y);
      const radial = rho < 1e-9 ? Vec3.X : new Vec3(p.x / rho, p.y / rho, 0);
      const onCircle = radial.scale(o.radiusM).add(new Vec3(0, 0, o.centreZ));
      const rel = p.sub(onCircle);
      const len = rel.length();
      return { d: len - o.tubeM, n: len < 1e-9 ? radial : rel.scale(1 / len) };
    }
    const q = p.sub(o.centre);
    const ex = new Vec3(Math.abs(q.x) - o.half.x, Math.abs(q.y) - o.half.y, Math.abs(q.z) - o.half.z);
    const out = new Vec3(Math.max(ex.x, 0), Math.max(ex.y, 0), Math.max(ex.z, 0));
    const d = out.length() > 0 ? out.length() : Math.max(ex.x, ex.y, ex.z);
    const axis = ex.x >= ex.y && ex.x >= ex.z ? new Vec3(Math.sign(q.x) || 1, 0, 0) : ex.y >= ex.z ? new Vec3(0, Math.sign(q.y) || 1, 0) : new Vec3(0, 0, Math.sign(q.z) || 1);
    return { d, n: out.length() > 0 ? new Vec3(Math.sign(q.x) * out.x, Math.sign(q.y) * out.y, Math.sign(q.z) * out.z).normalize() : axis };
  }

  /** Shortest gap between a world point and the structure, m (negative inside). */
  clearance(world: Vec3): number {
    const p = this.toBody(world);
    return Math.min(...this.obstacles.map((o) => Mothership.gap(o, p).d));
  }

  /**
   * Game rule like the region's rocks: the probe cannot fly through the mothership. Returns the
   * change of velocity (world) that cancels any motion into the structure within the margin. Off
   * near the docking port, where the docking contact takes over.
   */
  keepOut(world: Vec3, velocity: Vec3): Vec3 {
    if (world.sub(this.port.position).length() < PORT_FREE_RADIUS_M) return Vec3.ZERO;
    const p = this.toBody(world);
    let v = this.orientation.conjugate().rotate(velocity);
    const v0 = v;
    for (const o of this.obstacles) {
      const { d, n } = Mothership.gap(o, p);
      if (d > PROBE_MARGIN_M) continue;
      const vIn = v.dot(n);
      // Moving in: cancel it; already inside the margin: also nudge out slowly.
      if (vIn < 0) v = v.sub(n.scale(vIn));
      if (d < PROBE_MARGIN_M * 0.5) v = v.add(n.scale(0.05));
    }
    return this.orientation.rotate(v.sub(v0));
  }
}
