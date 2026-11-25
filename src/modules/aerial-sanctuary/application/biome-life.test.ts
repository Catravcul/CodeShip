import { describe, expect, it } from "vitest";
import { BiomeLife, biomeGeo } from "./biome-life";
import { GAME_DAYS_PER_YEAR } from "../domain/bioma";

const tickFor = (life: BiomeLife, seconds: number, day: number, hour: number, from = 0) => {
  for (let t = 0; t < seconds; t += 0.1) life.tick(0.1, day, from + t, hour, undefined, false);
};
/** Game day of the middle of month `m` (day 0 is 20 November). */
const dayOf = (m: number) => (((m - 11.65 + 12) % 12) / 12) * GAME_DAYS_PER_YEAR;

describe("s3 biome on screen: the mountain alive with giant insects", () => {
  it("every insect has a body on the mountain (never in the sea), at its ground or in the air; the labels say what it does", () => {
    const life = new BiomeLife(biomeGeo(1), 1);
    tickFor(life, 30, 0, 12);
    const poses = life.poses();
    expect(poses.length).toBe(life.state.animals.filter((a) => !a.dead).length);
    for (const p of poses) {
      expect(Number.isFinite(p.x + p.y + p.z), p.label).toBe(true);
      expect(p.label).toMatch(/: ./);
      expect(life.geo.isSea(p.x, p.z), p.label).toBe(false);
      if (!p.flying) expect(Math.abs(p.y - life.geo.ground(p.x, p.z)), p.label).toBeLessThan(0.5);
    }
    // In November the bumblebee queens overwinter, the Apollo is an egg: out of sight. The bees still fly on warm days.
    expect(poses.filter((p) => p.species === "abejorro").every((p) => p.hidden)).toBe(true);
    expect(poses.filter((p) => p.species === "mariposa").every((p) => p.hidden && p.life === "huevo")).toBe(true);
    expect(poses.some((p) => p.species === "abeja" && !p.hidden)).toBe(true);
  });

  it("in July they fly their own ways: bees from flower to flower, the hoverfly hanging still, the dragonfly over the river", () => {
    const life = new BiomeLife(biomeGeo(1), 2);
    const d = dayOf(7);
    life.tick(0.1, d, 0, 12);
    const verbs = new Set<string>();
    for (let t = 0; t < 40; t += 0.25) {
      life.tick(0.25, d, t, 12);
      for (const p of life.poses()) if (!p.hidden && p.flying) verbs.add(`${p.species}:${p.label.split(": ")[1]}`);
    }
    expect([...verbs].some((v) => v.startsWith("abeja:"))).toBe(true);
    expect([...verbs].some((v) => v.startsWith("sirfido:") && /cierne/.test(v))).toBe(true);
    expect([...verbs].some((v) => v.startsWith("libelula:"))).toBe(true);
    // Flying low, a few body lengths over its ground (not hundreds of metres up).
    for (const p of life.poses().filter((q) => q.flying)) expect(p.y - life.geo.ground(p.x, p.z), p.label).toBeLessThan(10 * life.lengthOf(p.species) + 10);
  });

  it("the hornet hovers before the hives", () => {
    const life = new BiomeLife(biomeGeo(1), 3);
    const hive = life.geo.zone("estepa");
    life.hives = [hive];
    const d = dayOf(9);
    let near = 0;
    for (let t = 0; t < 30; t += 0.25) {
      life.tick(0.25, d, t, 12);
      for (const p of life.poses().filter((q) => q.species === "avispon" && !q.hidden && /colmena/.test(q.label))) if (Math.hypot(p.x - hive.x, p.z - hive.z) < 20) near++;
    }
    expect(near).toBeGreaterThan(0);
  });

  it("over game days the chain lives under the scene: eggs are laid and larvae and nymphs show", () => {
    const life = new BiomeLife(biomeGeo(1), 2);
    let t = 0;
    for (let day = 0; day < 20; day += 0.1) {
      t += 0.5;
      life.tick(0.5, day, t, 12, undefined, false);
    }
    expect(life.state.events.some((e) => e.kind === "nace")).toBe(true);
    expect(life.poses().some((p) => (p.life === "larva" || p.life === "ninfa") && !p.hidden)).toBe(true);
  }, 30000);
});
