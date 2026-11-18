import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { STARSHIP } from "@modules/mothership/data/starship";
import { TRANSFER_TUNING } from "./transfer";
import { craftReach, nearby, nearbyTargets } from "./nearby";
import type { NavTarget } from "./nav-target";

const bennu = new Asteroid(BENNU, Vec3.ZERO);
const far = new Asteroid(POLANA_MEMBERS[1]!, new Vec3(9000, 0, 0));
const t = (a: Asteroid): NavTarget => ({ kind: "asteroid", id: a.data.id, name: a.data.name, body: a });
const radiusM = STARSHIP.parkingDistanceM.value + TRANSFER_TUNING.approachM;

describe("nearby destinations (the lander's and the probe's own trips)", () => {
  it("NAV-30 parked at Bennu, Bennu is nearby and a rock 9 km away is a mothership trip", () => {
    const n = { carrier: new Vec3(0, BENNU.meanRadiusM.value + STARSHIP.parkingDistanceM.value, 0), radiusM };
    expect(nearby(t(bennu), n).ok).toBe(true);
    const v = nearby(t(far), n);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.why).toMatch(/nodriza/);
    expect(nearbyTargets([t(far), t(bennu)], n).map((x) => x.id)).toEqual([BENNU.id]);
  });

  it("NAV-34 the navigation window's reach filter for the LM and the probe: out of reach is locked, with why", () => {
    const n = { carrier: new Vec3(0, BENNU.meanRadiusM.value + STARSHIP.parkingDistanceM.value, 0), radiusM };
    const ok = () => ({ ok: true });
    const station = { kind: "dock", id: "estacion", name: "Estación", probePort: { port: { position: n.carrier.add(new Vec3(200, 0, 0)) } } } as unknown as NavTarget;
    // Near and able: open, for both.
    expect(craftReach(t(bennu), "lander", n, ok)).toEqual({ ok: true });
    expect(craftReach(t(bennu), "probe", n, ok)).toEqual({ ok: true });
    // Too far: locked for both, the reason says the mothership flies it.
    const lf = craftReach(t(far), "lander", n, ok);
    expect(lf.ok).toBe(false);
    expect(lf.why).toMatch(/nodriza/);
    // A structure: the lander may dock at it, the probe never goes there.
    expect(craftReach(station, "lander", n, ok).ok).toBe(true);
    const ps = craftReach(station, "probe", n, ok);
    expect(ps.ok).toBe(false);
    expect(ps.why).toMatch(/asteroides/);
    // Near but the craft itself can't (its Δv): locked with the craft's own reason.
    const dv = craftReach(t(bennu), "lander", n, () => ({ ok: false, reason: "Sin Δv para ir y volver" }));
    expect(dv).toEqual({ ok: false, why: "Sin Δv para ir y volver" });
  });
});
