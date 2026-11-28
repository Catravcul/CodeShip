import { describe, expect, it } from "vitest";
import { apparentSizePx, chooseLod, impostorForMagnitude, pixelsPerRadian } from "./lod";

const ppr = pixelsPerRadian(70, 800);

describe("level of detail", () => {
  it("a 70° view 800 px tall packs about 571 px per radian", () => {
    expect(ppr).toBeCloseTo(571.3, 1);
  });

  it("Bennu (0,5 km) at 1,6 km fills a big part of the screen and gets a mesh", () => {
    expect(apparentSizePx(490, 1600, ppr)).toBeGreaterThan(150);
    expect(chooseLod(490, 1600, ppr)).toBe("mesh");
  });

  it("a 20 m boulder 10 km away is about a pixel: a point is enough", () => {
    expect(apparentSizePx(20, 10_000, ppr)).toBeCloseTo(1.14, 1);
    expect(chooseLod(20, 10_000, ppr)).toBe("point");
  });

  it("switches to a mesh as the ship comes close", () => {
    expect(chooseLod(20, 500, ppr)).toBe("mesh");
  });
});

describe("magnitude to impostor", () => {
  it("brighter bodies get bigger, more opaque points", () => {
    const jupiter = impostorForMagnitude(-2.5);
    const uranus = impostorForMagnitude(6);
    expect(jupiter.sizePx).toBeGreaterThan(uranus.sizePx);
    expect(jupiter.alpha).toBeGreaterThan(uranus.alpha);
  });

  it("stays within screen-friendly bounds", () => {
    for (const m of [-30, -5, 0, 5, 12]) {
      const i = impostorForMagnitude(m);
      expect(i.sizePx).toBeGreaterThanOrEqual(1.5);
      expect(i.sizePx).toBeLessThanOrEqual(6);
      expect(i.alpha).toBeGreaterThan(0);
      expect(i.alpha).toBeLessThanOrEqual(1);
    }
  });
});
