import { Vec3 } from "@core/math/vec3";
import { rackSpec } from "@modules/life-support/data/eclss-machines";
import type { RackKind } from "@modules/life-support/domain/eclss";
import type { Face, Fixture, InteriorVolume } from "../domain/interior";

/**
 * Where a life-support rack goes on a module's wall: the face (port or starboard for a module along z,
 * forward or aft along x) and its centre's offset along the module from the module's middle, real m.
 */
export interface RackPlacement {
  readonly rack: RackKind;
  /** 0 port (or forward), 1 starboard (or aft), or the overhead. */
  readonly side: 0 | 1 | "techo";
  readonly along: number;
}

/** Fixture id of a rack: the same in every host. */
export const eclssFixtureId = (rack: RackKind): string => `sv-${rack}`;

/** The rack fixtures of a module's aisle, at real size, front flush with the aisle's wall. */
export function eclssFixtures(vol: InteriorVolume, placements: readonly RackPlacement[]): Fixture[] {
  const alongZ = vol.half.z >= vol.half.x;
  return placements.map((p) => {
    const r = rackSpec(p.rack);
    if (p.side === "techo") {
      const at = alongZ ? new Vec3(vol.centre.x, vol.centre.y + vol.half.y, vol.centre.z + p.along) : new Vec3(vol.centre.x + p.along, vol.centre.y + vol.half.y, vol.centre.z);
      const size = alongZ ? new Vec3(r.size.w, r.size.d, r.size.h) : new Vec3(r.size.h, r.size.d, r.size.w);
      return { id: eclssFixtureId(p.rack), label: r.name, volume: vol.id, face: "techo", at, size, action: { kind: "soporte-vital", rack: p.rack }, info: r.info, source: r.source };
    }
    const s = p.side === 0 ? -1 : 1;
    const face: Face = alongZ ? (p.side === 0 ? "babor" : "estribor") : p.side === 0 ? "proa" : "popa";
    // Racks stand on the deck side of the wall's middle; small things (laptop, fire post) at chest height.
    const y = vol.centre.y + (r.bays > 0 ? 0 : 0.2);
    const at = alongZ ? new Vec3(s * vol.half.x, y, vol.centre.z + p.along) : new Vec3(vol.centre.x + p.along, y, vol.centre.z + s * vol.half.z);
    const size = alongZ ? new Vec3(r.size.d, r.size.h, r.size.w) : new Vec3(r.size.w, r.size.h, r.size.d);
    return { id: eclssFixtureId(p.rack), label: r.name, volume: vol.id, face, at, size, action: { kind: "soporte-vital", rack: p.rack }, info: r.info, source: r.source };
  });
}
