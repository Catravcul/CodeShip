import { Vec3 } from "@core/math/vec3";
import type { RemoteNet } from "../domain/core";

/**
 * Networks already built by others. The sanctuary's relay is Nevaeh's: the first one a core of
 * Doménica's can link to. Its position is a game value (50 km from Bennu in the scene), not a real place.
 */
export const REMOTE_NETS: readonly RemoteNet[] = [{ id: "relevo-santuario", name: "Relevo del santuario", position: new Vec3(30_000, 0, -40_000) }];
