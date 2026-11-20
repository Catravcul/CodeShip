import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { segmentClear } from "@modules/robotics/domain/clearance";
import { POLANA_LAYOUT } from "@modules/station/data/structure";
import { EVA_JOBS, STARSHIP_SITES, landerRoute, starshipHatch, starshipRoute, type RailPoint } from "./station-eva";
import { SAFETY_TETHER_M } from "./suit";

/** Every leg after the first (out of the hatch, which is on the hull) stays outside the station. */
const legsClear = (r: readonly RailPoint[]) => r.slice(2).map((p, i) => segmentClear(r[i + 1]!.at, p.at, POLANA_LAYOUT, 0.25, 0)).filter(Boolean);
/** From each anchor (the hatch first) the way to the next anchor or the worksite stays within the tether. */
const withinTether = (r: readonly RailPoint[]) => {
  let from = 0;
  let run = 0;
  for (let i = 1; i < r.length; i++) {
    run += r[i]!.at.sub(r[i - 1]!.at).length();
    if (run > SAFETY_TETHER_M.value) return `${r[from]!.label} → ${r[i]!.label}: ${run.toFixed(1)} m`;
    if (r[i]!.anchor) {
      from = i;
      run = 0;
    }
  }
  return undefined;
};

describe("EVA-06 spacewalks to the vehicles' outside parts", () => {
  const sonda = POLANA_LAYOUT.ports.find((p) => p.user === "sonda")!;
  const nose = POLANA_LAYOUT.ports.find((p) => p.user === "nodriza")!.position;
  // An Apollo-sized lander on the zenith IDA (4,2 × 7 m) and one on Unity's nadir CBM.
  const ida = { centre: sonda.position.add(new Vec3(0, 3.5, 0)), half: new Vec3(2.1, 3.5, 2.1) };
  const cbm = { centre: new Vec3(0, -2.285 - 3.5, 0), half: new Vec3(2.1, 3.5, 2.1) };

  it("from Quest to the lander on its IDA or on the CBM: along the handrails, never through the station, within the tether", () => {
    for (const r of [landerRoute("ida", ida), landerRoute("cbm", cbm)]) {
      expect(legsClear(r)).toEqual([]);
      expect(withinTether(r)).toBeUndefined();
      expect(r[0]!.anchor).toBe(true);
      expect(r[r.length - 1]!.label).toMatch(/sitio de trabajo/);
    }
  });

  it("from the Starship's own airlock along its hull, berthed nose-on at the forward IDA", () => {
    for (const site of STARSHIP_SITES) {
      const r = starshipRoute(site as "nodriza-motores" | "nodriza-energia", nose);
      expect(r[0]!.at).toEqual(starshipHatch(nose));
      expect(legsClear(r)).toEqual([]);
      expect(withinTether(r)).toBeUndefined();
    }
  });

  it("what has never been done says so: a licence or «en desarrollo» on each vehicle job", () => {
    for (const s of ["modulo", "nodriza-motores", "nodriza-energia"] as const) expect(EVA_JOBS[s].licence).toMatch(/Licencia|En desarrollo/);
  });
});
