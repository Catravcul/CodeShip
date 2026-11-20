import { describe, expect, it } from "vitest";
import { BiomeLife, biomeGeo } from "./biome-life";

const tickFor = (life: BiomeLife, seconds: number, day: number, hour: number) => {
  for (let t = 0; t < seconds; t += 0.1) life.tick(0.1, day, t, hour, undefined, false);
};

describe("s3 biome on screen: the mountain alive", () => {
  it("every animal has a body on the mountain (never in the sea), at its ground or in the air; the labels say what it does", () => {
    const life = new BiomeLife(biomeGeo(1), 1);
    tickFor(life, 60, 0, 12);
    const poses = life.poses();
    expect(poses.length).toBeGreaterThan(80);
    for (const p of poses) {
      expect(Number.isFinite(p.x + p.y + p.z), p.label).toBe(true);
      expect(p.label).toMatch(/: ./);
      expect(life.geo.isSea(p.x, p.z), p.label).toBe(false);
      if (!p.flying) expect(Math.abs(p.y - life.geo.ground(p.x, p.z)), p.label).toBeLessThan(0.5);
    }
    // In November the marmots sleep in their burrows: hidden.
    expect(poses.filter((p) => p.species === "marmota").every((p) => p.hidden)).toBe(true);
    // The griffons soar in the thermals over the cliffs, high above their ground.
    const soaring = poses.filter((p) => p.species === "buitre" && p.flying);
    expect(soaring.length).toBeGreaterThan(0);
    for (const p of soaring) expect(p.y - life.geo.ground(p.x, p.z)).toBeGreaterThan(20);
  });

  it("the bearded vulture patrols along the gorge at the height of its rims and swings close past the lookout", () => {
    const life = new BiomeLife(biomeGeo(1), 5);
    const look = life.geo.zone("garganta")!;
    const rim = life.geo.ground(look.x, look.z);
    let seen = 0;
    let near = Infinity;
    for (let t = 0; t < 90; t += 0.5) {
      life.tick(0.5, 0, t, 12, undefined, false);
      if (t < 30) continue;
      for (const p of life.poses().filter((q) => q.species === "quebrantahuesos" && q.flying)) {
        seen++;
        expect(p.y).toBeLessThan(rim);
        expect(p.y - life.geo.ground(p.x, p.z)).toBeGreaterThan(10);
        const d = Math.hypot(p.x - look.x, p.z - look.z);
        expect(d).toBeLessThan(220);
        near = Math.min(near, d);
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(near).toBeLessThan(50);
  });

  it("the ibex keep to the cliffs: most of them stand on rock too steep to walk", () => {
    const life = new BiomeLife(biomeGeo(1), 3);
    tickFor(life, 30, 0, 12);
    const ibex = life.poses().filter((p) => p.species === "ibice" && p.stage !== "cria");
    const onRock = ibex.filter((p) => life.geo.steep(p.x, p.z) > 0.78).length;
    expect(onRock / ibex.length).toBeGreaterThan(0.5);
  });

  it("the flying squirrel sleeps by day and glides from tree to tree at dusk", () => {
    const life = new BiomeLife(biomeGeo(1), 4);
    tickFor(life, 5, 0, 12);
    const day = life.poses().filter((p) => p.species === "ardilla");
    expect(day.length).toBeGreaterThan(0);
    expect(day.every((p) => p.hidden)).toBe(true);
    let glided = false;
    for (let t = 0; t < 30; t += 0.1) {
      life.tick(0.1, 0.01, 100 + t, 19.5);
      if (life.poses().some((p) => p.species === "ardilla" && p.flying && /planea/.test(p.label))) glided = true;
    }
    expect(glided).toBe(true);
  });

  it("over game days the chain lives under the scene: young are born and shown by their mothers", () => {
    const life = new BiomeLife(biomeGeo(1.5), 2);
    let t = 0;
    for (let day = 0; day < 17; day += 0.1) {
      t += 0.5;
      life.tick(0.5, day, t, 12, undefined, false);
    }
    const young = life.poses().filter((p) => p.stage === "cria");
    expect(young.length).toBeGreaterThan(0);
    expect(life.state.events.some((e) => e.kind === "nace")).toBe(true);
  }, 30000);
});
