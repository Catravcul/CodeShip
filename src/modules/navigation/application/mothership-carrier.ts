import type { Quat } from "@core/math/quat";
import type { Vec3 } from "@core/math/vec3";
import { Mothership } from "@modules/mothership/domain/mothership";
import type { Docking } from "@modules/mothership/application/docking";
import type { CraftPort, DockingLimits, DockingTarget } from "@modules/mothership/domain/docking";
import { Berthing, berthStandoff, BERTH_STANDOFF_M } from "@modules/mothership/application/berthing";
import type { CarrierPort } from "./carrier-trip";

/**
 * The mothership and its docking port, seen as the carrier of a trip. With `berthing` (its nose
 * port and the IDSS limits) it can also dock at the stations' ports.
 */
export function mothershipCarrier(
  m: Mothership,
  docking: Docking,
  berthing?: { readonly nosePort: CraftPort; readonly limits: DockingLimits; readonly ports: readonly DockingTarget[] },
): CarrierPort {
  const l = m.spec.layout;
  const portOf = (id: string | undefined) => berthing?.ports.find((p) => p.id === id);
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
    get thrusterCount() {
      return m.thrusterCount;
    },
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
    // The probe rides the mothership only when it is latched to the mothership's own port.
    docked: () => docking.dockedTo === m,
    undock: () => docking.undock(),
    ...(berthing
      ? {
          dockedTo: () => m.dockedTo,
          departure: () => {
            const p = portOf(m.dockedTo);
            return p ? m.position.add(p.port.normal.scale(BERTH_STANDOFF_M)) : undefined;
          },
          release: () => {
            m.dockedTo = undefined;
          },
          berthStandoff: (port: DockingTarget) => berthStandoff(port, berthing.nosePort),
          berth: (port: DockingTarget) => new Berthing(m, port, berthing.nosePort, berthing.limits),
        }
      : {}),
  };
}
