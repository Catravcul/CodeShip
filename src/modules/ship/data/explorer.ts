import { Vec3 } from "@core/math/vec3";
import type { ShipDesign } from "../domain/ship";
import { buildRcsLayout } from "../domain/rcs-layout";
import { MR106L, R4D } from "./thrusters";
import { CODESHIP_RING } from "@modules/gravity/data/ring";

const HULL_SIZE = new Vec3(3, 2, 5);

/**
 * Starter ship. Thrusters are real models (see thrusters.ts); the hull and tanks are
 * game values sized like a small uncrewed-class craft until real parts replace them.
 */
export function explorerDesign(): ShipDesign {
  return {
    hull: { name: "Codeship Explorer", dryMassKg: 420, size: HULL_SIZE },
    tanks: [
      { spec: { propellant: "MMH/NTO", capacityKg: 180, dryMassKg: 18 }, fillKg: 180 },
      { spec: { propellant: "Hydrazine", capacityKg: 40, dryMassKg: 5 }, fillKg: 40 },
    ],
    mainEngines: [{ model: R4D, position: new Vec3(0, 0, HULL_SIZE.z / 2), direction: new Vec3(0, 0, -1) }],
    rcs: buildRcsLayout(MR106L, HULL_SIZE),
    // Twin counter-rotating rings on a mast over the hull (gravedad.md). HULL_SIZE stays the
    // contact body: the legs, the landing reach and the RCS lever arms use it, not the rings.
    ring: CODESHIP_RING,
  };
}
