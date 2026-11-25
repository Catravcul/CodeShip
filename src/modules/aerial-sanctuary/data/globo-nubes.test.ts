import { describe, expect, it } from "vitest";
import { placeAt, step, type WalkWorld } from "../domain/walk";
import { CLOUD_AREA, CLOUD_ENTRY, CLOUD_GLOBE, BEE_LENGTH_M, cloudGlobeWorld, combSolid } from "./globo-nubes";
import { buildLayout } from "./layout";

const G = CLOUD_GLOBE.value;
const world = (): WalkWorld => {
  const g = cloudGlobeWorld();
  return { floors: g.floors, waters: g.waters, solids: g.solids };
};

describe("el globo de nubes", () => {
  it("está sobre el mar, al sur de la isla, sin tocar ninguna otra isla", () => {
    const L = buildLayout(1.5);
    for (const i of L.islands) {
      const dx = Math.max(i.rect.x0 - G.x, 0, G.x - i.rect.x1);
      const dz = Math.max(i.rect.z0 - G.z, 0, G.z - i.rect.z1);
      expect(Math.hypot(dx, dz), i.id).toBeGreaterThan(G.r);
    }
    expect(G.y - G.r).toBeGreaterThan(50);
  });

  it("se entra por su rellano del borde de abajo y se nada dentro, hasta cerca del centro", () => {
    const w = world();
    let b = placeAt(w, CLOUD_ENTRY.x, CLOUD_ENTRY.y, CLOUD_ENTRY.z)!;
    expect(b.motion).toBe("gravedad");
    expect(b.area).toBe(CLOUD_AREA);
    // Off the landing's edge, into the cloud.
    for (let i = 0; i < 30; i++) b = step(w, b, { dx: 0.5, dz: 0 });
    expect(b.motion).toBe("agua");
    // Up through its layers: under the comb she stops at it (a solid); beside it, up to its middle.
    for (let i = 0; i < 400; i++) b = step(w, b, { dx: 0, dy: 0.5, dz: 0 });
    expect(b.y).toBeLessThan(combSolid().y0);
    for (let i = 0; i < 300; i++) b = step(w, b, { dx: 0.5, dy: -0.1, dz: 0 });
    for (let i = 0; i < 400; i++) b = step(w, b, { dx: 0, dy: 0.5, dz: 0 });
    expect(b.y).toBeGreaterThan(G.y - 40);
    // Not out of its top.
    for (let i = 0; i < 400; i++) b = step(w, b, { dx: 0, dy: 1, dz: 0 });
    expect(b.y).toBeLessThan(G.y + G.r);
  });

  it("la abeja adulta mide un tercio del globo y su panal es sólido", () => {
    expect(BEE_LENGTH_M).toBeCloseTo((2 * G.r) / 3, 5);
    const s = combSolid();
    expect(s.x1 - s.x0).toBeLessThan(2 * G.r);
    expect(s.z1 - s.z0).toBeLessThan(2 * G.r);
  });
});
