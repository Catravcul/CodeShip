import { describe, expect, it } from "vitest";
import { asteroidSurfaceFn, generateAsteroidShape } from "./asteroid-shape";

const params = { seed: 7, size: { x: 565, y: 508, z: 535 }, detail: 3, ridge: 0.08, roughness: 0.05, craters: 20 };

describe("generateAsteroidShape", () => {
  it("is deterministic for a seed", () => {
    expect(generateAsteroidShape(params).positions).toEqual(generateAsteroidShape(params).positions);
  });

  it("keeps the real extents within 15%", () => {
    const { positions } = generateAsteroidShape(params);
    let maxX = 0, maxY = 0;
    for (let i = 0; i < positions.length; i += 3) {
      maxX = Math.max(maxX, Math.abs(positions[i]!));
      maxY = Math.max(maxY, Math.abs(positions[i + 1]!));
    }
    expect(maxX * 2).toBeGreaterThan(565 * 0.85);
    expect(maxX * 2).toBeLessThan(565 * 1.15);
    expect(maxY * 2).toBeLessThan(508 * 1.15);
  });

  it("produces a closed triangle mesh (every edge shared by two faces)", () => {
    const { indices } = generateAsteroidShape(params);
    const edges = new Map<string, number>();
    for (let i = 0; i < indices.length; i += 3) {
      for (const [a, b] of [[0, 1], [1, 2], [2, 0]] as const) {
        const p = indices[i + a]!, q = indices[i + b]!;
        const k = p < q ? `${p}_${q}` : `${q}_${p}`;
        edges.set(k, (edges.get(k) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((n) => n === 2)).toBe(true);
  });
});

describe("asteroidSurfaceFn", () => {
  it("matches the mesh vertices it was generated from", () => {
    const { positions } = generateAsteroidShape(params);
    const surface = asteroidSurfaceFn(params);
    for (let i = 0; i < positions.length; i += 3 * 37) {
      const p = { x: positions[i]!, y: positions[i + 1]!, z: positions[i + 2]! };
      expect(surface(p)).toBeCloseTo(Math.hypot(p.x, p.y, p.z), 2);
    }
  });
});
