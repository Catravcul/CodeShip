import { Vec3 } from "@core/math/vec3";
import type { FlightComputer, FlightTarget } from "@modules/flight/application/flight-computer";
import { planRoute, pathLength, type Obstacle } from "../domain/route";
import { planTransfer, TRANSFER_TUNING, type TransferPlan, type TransferTuning } from "../domain/transfer";

/** A burn–coast–brake hop of a craft with its own engine (the lander or the probe) to a body. */
export interface Hop {
  /** Waypoints before the final leg straight at the body (may be empty). */
  readonly waypoints: readonly Vec3[];
  /** Distance to the body's surface now, metres. */
  readonly heightM: number;
  readonly plan: TransferPlan;
  /** Main engine thrust, N. */
  readonly thrustN: number;
  readonly massKg: number;
  readonly deltaVAvailableMS: number;
}

/**
 * Plans the hop from where `flight`'s craft is (or from `from`, e.g. a stowed probe's bay) to
 * `approachM` above the body, round the keep-out spheres, with the craft's real thrust and mass.
 * `lead`: points to fly through first (e.g. climbing out of the bay above the mothership);
 * `via`: a point to reach round the obstacles before the last straight leg (e.g. above the bay).
 */
export function planHop(
  flight: FlightComputer,
  body: FlightTarget,
  obstacles: readonly Obstacle[],
  approachM: number,
  opts: { readonly from?: Vec3; readonly lead?: readonly Vec3[]; readonly via?: Vec3; readonly tuning?: TransferTuning } = {},
): Hop {
  const ship = flight.ship;
  const start = opts.from ?? flight.state.position;
  const lead = opts.lead ?? [];
  const p0 = lead[lead.length - 1] ?? start;
  const pre = opts.via ? planRoute(p0, opts.via, obstacles) : [];
  const p = pre[pre.length - 1] ?? p0;
  const centre = body.position;
  const height = body.surfaceDistance(p, flight.simTimeS);
  const toCentre = centre.sub(p);
  const surfaceR = toCentre.length() - height;
  const u = toCentre.length() > 0 ? toCentre.normalize() : Vec3.Z;
  const arrival = p.add(u.scale(Math.max(0, height - approachM)));
  const route = planRoute(p, arrival, obstacles);
  const waypoints = [...lead, ...pre, ...route.slice(0, -1)];
  const last = waypoints[waypoints.length - 1];
  const distanceM = last ? pathLength(start, waypoints) + Math.max(0, centre.sub(last).length() - surfaceR - approachM) : Math.max(0, height - approachM);
  const thrustN = ship.mainEngines.reduce((f, e) => f + e.model.thrustN, 0);
  const accel = ship.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / ship.massKg;
  const plan = planTransfer({ distanceM, accelMS2: accel, deltaVAvailableMS: ship.mainDeltaV() }, opts.tuning ?? TRANSFER_TUNING);
  return { waypoints, heightM: body.surfaceDistance(start, flight.simTimeS), plan, thrustN, massKg: ship.massKg, deltaVAvailableMS: ship.mainDeltaV() };
}
