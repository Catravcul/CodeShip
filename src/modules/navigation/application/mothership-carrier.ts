import type { Quat } from "@core/math/quat";
import type { Vec3 } from "@core/math/vec3";
import { Mothership } from "@modules/mothership/domain/mothership";
import type { Docking } from "@modules/mothership/application/docking";
import type { CarrierPort } from "./carrier-trip";

/** The mothership and its docking port, seen as the carrier of a trip. */
export function mothershipCarrier(m: Mothership, docking: Docking): CarrierPort {
  const l = m.spec.layout;
  return {
    name: m.name,
    get position() {
      return m.position;
    },
    get orientation() {
      return m.orientation;
    },
    get thrustN() {
      return m.thrustN;
    },
    thrusterCount: m.spec.thrusterCount,
    get massKg() {
      return m.massKg;
    },
    get accelerationMs2() {
      return m.accelerationMs2;
    },
    deltaV: () => m.deltaV(),
    burnDays: (dv) => m.burnDays(dv),
    propellantFor: (dv) => m.propellantFor(dv),
    burn: (dv) => m.burn(dv),
    moveTo: (p: Vec3, q?: Quat) => m.moveTo(p, q),
    parkingPoint: (target, from) => Mothership.parkingPoint(m.spec, target, from),
    parkingM: m.spec.parkingDistanceM.value,
    // Rings and spine: the farthest part of the structure from its centre, plus a margin.
    clearanceM: Math.max(m.spec.ring.floorRadiusM, l.lengthM / 2) + 20,
    docked: () => docking.docked,
    undock: () => docking.undock(),
  };
}
