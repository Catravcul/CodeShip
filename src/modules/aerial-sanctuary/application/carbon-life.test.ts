import { describe, expect, it } from "vitest";
import { BiomeLife, carbonGeo } from "./biome-life";
import { carbonBiome } from "../data/bioma";
import { CARBON_ZONE } from "../data/carbonifero";
import { BIOME_ISLAND } from "../data/bioma-island";

describe("los gigantes del Carbonífero viven en su bosque al pie de la pirámide", () => {
  it("andan por el suelo de su bosque y las libélulas gigantes patrullan por encima, sin ir al mar", () => {
    const geo = carbonGeo();
    const life = new BiomeLife(geo, 3, carbonBiome(4));
    const Z = CARBON_ZONE.value;
    const C = BIOME_ISLAND.centre.value;
    let flew = 0;
    // A day of June on the island (game day ~16: day 0 is 20 November), a minute of real time: the adults fly.
    for (let i = 0; i < 240; i++) {
      life.tick(0.25, 16 + i / 2000, i * 0.25, 12);
      for (const p of life.poses()) {
        if (p.hidden) continue;
        expect(geo.isSea(p.x, p.z), `${p.species} en el mar`).toBe(false);
        expect(p.y, p.species).toBeGreaterThanOrEqual(geo.ground(p.x, p.z) - 0.01);
        expect(Math.hypot(p.x - (C.x + Z.point.x), p.z - (C.z + Z.point.z)), p.species).toBeLessThan(Z.r * 2);
        if (p.flying && p.species.startsWith("meganeur")) flew++;
      }
    }
    expect(flew).toBeGreaterThan(0);
    expect(life.drawScale).toBe(1);
  });
});
