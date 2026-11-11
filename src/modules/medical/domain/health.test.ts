import { describe, expect, it } from "vitest";
import { Health, MEDICAL_TUNING } from "./health";

describe("health", () => {
  it("untreated wounds get worse; treated ones heal and disappear", () => {
    const h = new Health("x");
    const c = h.add("herida", 0.4, "golpe");
    h.tick(1);
    expect(h.burden).toBeCloseTo(0.4 + MEDICAL_TUNING.worsenPerDayUntreated);
    h.treat(c.id);
    for (let d = 0; d < 3; d++) h.tick(1);
    expect(h.conditions).toHaveLength(0);
    expect(h.burden).toBe(0);
  });

  it("an untreated bite becomes an abscess after a few days", () => {
    const h = new Health("gato");
    h.add("herida", 0.4, "pelea", true);
    const born = [];
    for (let d = 0; d < MEDICAL_TUNING.abscessAfterDays + 0.5; d += 0.5) born.push(...h.tick(0.5));
    expect(born.map((c) => c.kind)).toEqual(["absceso"]);
    expect(h.untreated).toHaveLength(2);
  });

  it("serious conditions need the sickbay bed", () => {
    const h = new Health("x");
    h.add("contusion", 0.7, "sacudida");
    expect(h.needsBed).toBe(true);
  });
});
