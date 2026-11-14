import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { Asteroid } from "@modules/celestial/domain/asteroid";
import type { FlightTarget } from "@modules/flight/application/flight-computer";
import type { DockingTarget } from "@modules/mothership/domain/docking";

/**
 * Something the ship can travel to: an asteroid (land on it by hand) or a structure with docking
 * ports (a station, the mothership), where the trip ends with an automatic docking.
 */
export type NavTarget = AsteroidTarget | DockTarget;

export interface AsteroidTarget {
  readonly kind: "asteroid";
  readonly id: string;
  readonly name: string;
  readonly body: Asteroid;
}

export interface DockTarget {
  readonly kind: "dock";
  readonly id: string;
  readonly name: string;
  /** What it is, for the map: «Estación», «Nave nodriza». */
  readonly what: string;
  /** Centre of the structure now, world frame, metres. */
  readonly position: Vec3;
  /** Keep-out sphere round the whole structure (routes go round it), metres. */
  readonly radiusM: number;
  /** The port the probe docks at. */
  readonly probePort: DockingTarget;
  /** The port the mothership docks at, if it can dock here. */
  readonly carrierPort?: DockingTarget;
}

export const asteroidTarget = (body: Asteroid): AsteroidTarget => ({ kind: "asteroid", id: body.data.id, name: body.data.name, body });

/** Centre of the target, world frame, metres. */
export const targetPosition = (t: NavTarget): Vec3 => (t.kind === "asteroid" ? t.body.position : t.position);

/** Size of the target for the map and distances: mean radius of an asteroid, keep-out radius of a structure. */
export const targetRadius = (t: NavTarget): number => (t.kind === "asteroid" ? t.body.meanRadiusM : t.radiusM);

/** Distance from a point to the target: to the surface of an asteroid, to the probe port of a structure. */
export function targetDistance(t: NavTarget, p: Vec3): number {
  return t.kind === "asteroid" ? p.sub(t.body.position).length() - t.body.meanRadiusM : p.sub(t.probePort.port.position).length();
}

/**
 * A point the trip autopilot can fly to: the docking port itself (a body of zero size), so it stops
 * `approachM` short of it along the line it comes in on.
 */
export function portFlightTarget(port: DockingTarget): FlightTarget {
  return {
    get position() {
      return port.port.position;
    },
    meanRadiusM: 0,
    surfaceDistance: (w) => w.sub(port.port.position).length(),
    surfaceVelocity: () => Vec3.ZERO,
    orientationAt: () => Quat.IDENTITY,
    toLocal: (w) => w.sub(port.port.position),
    toWorld: (l) => l.add(port.port.position),
  };
}
