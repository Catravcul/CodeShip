import { describe, expect, it } from "vitest";
import { ETHOGRAMS } from "./etograma";
import { SPECIES_MODEL } from "./site";

describe("the ethograms of sanctuary 1's species", () => {
  it("has one for every species, each activity with its source", () => {
    for (const s of Object.keys(SPECIES_MODEL)) {
      const e = ETHOGRAMS[s];
      expect(e, s).toBeDefined();
      for (const x of [...e!.acts, e!.young]) {
        expect(x.source.length, `${s}: ${x.verb}`).toBeGreaterThan(3);
        expect(x.seconds).toBeGreaterThan(0);
      }
    }
  });
});
