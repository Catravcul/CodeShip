import { Vec3 } from "@core/math/vec3";
import type { ShipDesign } from "../domain/ship";
import { buildRcsLayout } from "../domain/rcs-layout";
import { HIPAT, MR106L } from "./thrusters";
import { N2H4_80274, PAIR_80433 } from "./tanks";
import { BATTERY_LI5, CABIN_AL2195, FIXED_SYSTEMS, POWER_RIGID, SHIELD_NONE } from "./equipment";

const HULL_SIZE = new Vec3(3, 2, 5);

/**
 * The probe (sonda): a light lander with legs that flies from the mothership to the asteroid and
 * back. Its cabin is only for short sorties; the rings, the garden and the cabins are on the
 * mothership (docs/design/nave-nodriza.md). The dry mass is the sum of real components (equipment.ts,
 * docs/design/componentes.md). Propulsion follows Cassini's split: an MMH/NTO main engine fed by
 * helium from a pair of titanium tanks (MESSENGER's), and hydrazine attitude thrusters on their own
 * blowdown tank (Dawn's). See «Recomendación» in componentes.md for the Δv working.
 */
export function explorerDesign(): ShipDesign {
  return {
    hull: { name: "Codeship Explorer", size: HULL_SIZE },
    tanks: [
      { spec: PAIR_80433, fillKg: PAIR_80433.capacityKg },
      { spec: N2H4_80274, fillKg: N2H4_80274.capacityKg },
    ],
    mainEngines: [{ model: HIPAT, position: new Vec3(0, 0, HULL_SIZE.z / 2), direction: new Vec3(0, 0, -1) }],
    rcs: buildRcsLayout(MR106L, HULL_SIZE),
    equipment: [CABIN_AL2195, POWER_RIGID, BATTERY_LI5, SHIELD_NONE, ...FIXED_SYSTEMS],
    // Dorsal docking port, like the Apollo LM's overhead hatch: the probe hangs under the
    // mothership's node and the pilot keeps the view forward. Behind the canopy.
    dockingPort: new Vec3(0, HULL_SIZE.y / 2 + 0.3, 0.6),
  };
}
