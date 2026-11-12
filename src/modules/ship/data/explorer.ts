import { Vec3 } from "@core/math/vec3";
import type { ShipDesign } from "../domain/ship";
import { buildRcsLayout } from "../domain/rcs-layout";
import { MR106L, R4D } from "./thrusters";

const HULL_SIZE = new Vec3(3, 2, 5);

/**
 * The probe (sonda): a light lander with legs that flies from the mothership to the asteroid and
 * back. Its cabin is only for short sorties; the rings, the garden and the cabins are on the
 * mothership (docs/design/nave-nodriza.md). Thrusters are real models (see thrusters.ts); the hull and tanks are
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
    // Dorsal docking port, like the Apollo LM's overhead hatch: the probe hangs under the
    // mothership's node and the pilot keeps the view forward. Behind the canopy.
    dockingPort: new Vec3(0, HULL_SIZE.y / 2 + 0.3, 0.6),
  };
}
