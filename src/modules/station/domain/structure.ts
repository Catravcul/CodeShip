import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { clearanceTo, keepOutDelta, type KeepOutBody, type Obstacle } from "@modules/flight/domain/keep-out";
import type { DockingTarget, PortPose } from "@modules/mothership/domain/docking";
import { facing } from "@modules/navigation/domain/attitude";
import type { StationSite } from "./station";

/** A pressurised module: a cylinder between two points of the station's body frame. */
export interface PressurisedModule {
  readonly id: string;
  readonly label: string;
  readonly kind: "nodo" | "habitat" | "fabrica" | "adaptador" | "agricola" | "planta";
  readonly from: Vec3;
  readonly to: Vec3;
  readonly radiusM: number;
  /** How the size was chosen (a real module, or a game value). */
  readonly basis: string;
  readonly source?: string;
}

/** A flat or boxy part outside the pressure hull: truss, solar wings, radiators, the hangar. */
export interface StructurePart {
  readonly id: string;
  readonly label: string;
  readonly kind: "celosia" | "solar" | "radiador" | "hangar";
  readonly centre: Vec3;
  readonly half: Vec3;
  readonly basis: string;
  readonly source?: string;
}

/** Who docks at a port: the probe (any small craft) or the mothership. */
export type PortUser = "sonda" | "nodriza";

export interface StationPortSpec {
  readonly id: string;
  readonly name: string;
  readonly user: PortUser;
  /** Face of the port, body frame. */
  readonly position: Vec3;
  /** Outward axis, body frame. */
  readonly normal: Vec3;
  /**
   * Direction the docked craft's docking frame looks along (its −z), body frame, across the axis.
   * Fixes the roll of whatever docks there.
   */
  readonly forward: Vec3;
}

export interface StationLayout {
  readonly modules: readonly PressurisedModule[];
  readonly parts: readonly StructurePart[];
  readonly ports: readonly StationPortSpec[];
}

/** A port of the station seen as a docking target. */
export interface StationPort extends DockingTarget {
  readonly spec: StationPortSpec;
}

/**
 * The station as a structure in space: modules, truss, solar wings, radiators, hangar and its
 * docking ports (IDSS, like the mothership's). A small craft cannot fly through it (same keep-out
 * rule as the mothership, off near the ports) and docks at its ports with the same assist and
 * limits. Body frame: x along the truss, y up (zenith), z aft; the station holds its attitude.
 */
export class StationStructure {
  readonly ports: readonly StationPort[];
  private current: StationLayout;

  constructor(
    readonly site: StationSite,
    layout: StationLayout,
    readonly orientation: Quat = Quat.IDENTITY,
  ) {
    this.current = layout;
    this.ports = layout.ports.map((p) => this.makePort(p));
  }

  get layout(): StationLayout {
    return this.current;
  }

  /**
   * The station grew (a module berthed, the hangar extended): new modules and parts. The docking
   * ports stay where they are, so craft docked to them stay docked.
   */
  setLayout(layout: StationLayout): void {
    if (layout.ports.length !== this.current.ports.length || layout.ports.some((p, i) => p.id !== this.current.ports[i]!.id)) throw new Error("The docking ports cannot change");
    this.current = layout;
  }

  get position(): Vec3 {
    return this.site.position;
  }

  toWorld(body: Vec3): Vec3 {
    return this.position.add(this.orientation.rotate(body));
  }

  /** The port a craft of this kind docks at. */
  portFor(user: PortUser): StationPort | undefined {
    return this.ports.find((p) => p.spec.user === user);
  }

  get obstacles(): Obstacle[] {
    return [
      ...this.layout.modules.map((m): Obstacle => ({ kind: "capsule", a: m.from, b: m.to, radiusM: m.radiusM })),
      ...this.layout.parts.map((p): Obstacle => ({ kind: "box", centre: p.centre, half: p.half })),
    ];
  }

  /** Radius of a sphere round the centre that holds the whole structure, m (routes keep out of it). */
  get boundingRadiusM(): number {
    const ends = [
      ...this.layout.modules.flatMap((m) => [m.from.length() + m.radiusM, m.to.length() + m.radiusM]),
      ...this.layout.parts.map((p) => p.centre.length() + p.half.length()),
    ];
    return Math.max(...ends);
  }

  private get keepOutBody(): KeepOutBody {
    return { position: this.position, orientation: this.orientation, obstacles: this.obstacles, freePorts: this.ports.map((p) => p.port.position) };
  }

  /** Shortest gap between a world point and the structure, m (negative inside). */
  clearance(world: Vec3): number {
    return clearanceTo(this.keepOutBody, world);
  }

  /** Same game rule as the mothership: cancels motion into the structure, off near the ports. */
  keepOut(world: Vec3, velocity: Vec3): Vec3 {
    return keepOutDelta(this.keepOutBody, world, velocity);
  }

  private makePort(spec: StationPortSpec): StationPort {
    // Docked craft: its docking axis (+y) against the port, its −z along `forward`.
    const frame = facing(spec.forward, spec.normal.scale(-1));
    const pose = (): PortPose => ({
      position: this.toWorld(spec.position),
      normal: this.orientation.rotate(spec.normal),
      orientation: this.orientation.multiply(frame).normalize(),
    });
    return {
      id: spec.id,
      name: spec.name,
      spec,
      get port() {
        return pose();
      },
      dockedPose(craftPortBody: Vec3): RigidBodyState {
        const p = pose();
        return RigidBodyState.at(p.position.sub(p.orientation.rotate(craftPortBody))).withOrientation(p.orientation);
      },
    };
  }
}
