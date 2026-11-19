import { describe, expect, it } from "vitest";
import { BiomeLife, biomeGeo } from "./biome-life";

describe("s3 biome on screen", () => {
  it("every animal has a body where it lives; the land birds stay ashore; the labels say what it does", () => {
    const life = new BiomeLife(biomeGeo(1), 1);
    for (let t = 0; t < 60; t += 0.1) life.tick(0.1, t / 1440, t, 12, { x: 760, z: 230 }, true);
    const poses = life.poses();
    expect(poses.length).toBeGreaterThan(50);
    for (const p of poses) {
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
      expect(p.label).toMatch(/: ./);
      if (p.species === "bisbita" || p.species === "picovaina") expect(life.geo.isSea(p.x, p.z), p.label).toBe(false);
    }
    expect(poses.some((p) => p.species === "papua")).toBe(true);
  });

  it("over game days the chain lives under the scene: young are born and shown by their mothers", () => {
    const life = new BiomeLife(biomeGeo(1.5), 2);
    let t = 0;
    for (let day = 0; day < 4; day += 0.05) {
      t += 0.5;
      life.tick(0.5, day, t, 12, undefined, false);
    }
    const young = life.poses().filter((p) => p.stage === "cria");
    expect(young.length).toBeGreaterThan(0);
    expect(life.state.events.some((e) => e.kind === "nace")).toBe(true);
  });
});
