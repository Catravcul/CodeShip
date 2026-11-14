import { describe, expect, it } from "vitest";
import { checkComfort, SpinRing } from "../domain/spin-gravity";
import { CODESHIP_RING, COMFORT_LIMITS } from "./ring";

describe("Codeship ring", () => {
  const ring = new SpinRing(CODESHIP_RING);

  it("gives 1 g on the floor and about 0.88 g under the farm deck's sky", () => {
    expect(ring.gravityG(CODESHIP_RING.floorRadiusM)).toBeCloseTo(1, 1);
    expect(ring.gravityAtHeight(CODESHIP_RING.deckHeightM) / ring.gravityAtHeight(0)).toBeCloseTo(0.875, 3);
  });

  it("meets the comfort limits of Hill & Schnitzer, Gordon & Gervais, Stone and Globus & Hall, not Cramer or SP-413", () => {
    const res = Object.fromEntries(checkComfort(CODESHIP_RING, COMFORT_LIMITS, 1.6).map((r) => [r.limit.id, r.ok]));
    expect(res).toMatchObject({ "hill-schnitzer": true, "gordon-gervais": true, stone: true, "globus-hall": true, cramer: false, "sp-413": false });
  });

  it("every limit cites a source", () => {
    for (const l of COMFORT_LIMITS) expect(l.source).toMatch(/https:\/\//);
  });
});
