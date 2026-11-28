import { describe, expect, it } from "vitest";
import { BiomeLife, hallGeo, carbonHallGeo } from "./biome-life";
import { airBiome } from "../data/bioma";
import { REAL_BIOME } from "../data/bioma-real";
import { BIOME_ZONES } from "../data/bioma-island";
import { onShore } from "../data/montana";

describe("los insectos gigantes dentro de la montaña, en la orilla de la nave (montana-hueca.md)", () => {
  it("cada casa de cada hábitat está en la orilla, y cada zona en la dirección de la suya en la isla", () => {
    const g = hallGeo();
    for (const z of BIOME_ZONES) {
      const c = g.zone(z.id);
      expect(onShore(c.x, c.z), z.id).toBe(true);
      for (let s = 0; s < 20; s++) {
        const h = g.home(z.id, s);
        expect(onShore(h.x, h.z), `${z.id} ${s}`).toBe(true);
      }
    }
    const f = carbonHallGeo().zone("bosque-carbonifero");
    expect(onShore(f.x, f.z)).toBe(true);
  });

  it("la cadena de los insectos vive y se mueve por la orilla", () => {
    const life = new BiomeLife(hallGeo(), 1, airBiome(4));
    for (let i = 0; i < 40; i++) life.tick(0.25, i * 0.01, i * 0.25, 12, { x: 0, y: 0, z: 0 }, false);
    const shown = life.poses().filter((p) => !p.hidden);
    expect(shown.length).toBeGreaterThan(10);
    for (const p of shown) if (!p.flying) expect(onShore(p.x, p.z), p.species).toBe(true);
  });
});

describe("fuera, la fauna real de la montaña (bioma-real.ts)", () => {
  it("son los animales de Khunjerab a tamaño real (sin ×400), cada uno con su fuente, y ningún insecto gigante", () => {
    expect(REAL_BIOME.drawScale ?? 1).toBe(1);
    const animals = REAL_BIOME.species.filter((s) => s.kind === "animal");
    expect(animals.map((s) => s.id)).toEqual(expect.arrayContaining(["ibice", "markhor", "leopardo", "quebrantahuesos", "marmota"]));
    for (const s of REAL_BIOME.species) expect(s.source.length, s.id).toBeGreaterThan(10);
    for (const s of animals) expect((s as { shape: string }).shape, s.id).not.toBe("insecto");
  });
});
