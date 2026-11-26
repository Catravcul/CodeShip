import { describe, expect, it } from "vitest";
import { airBiome, carbonBiome, type AnimalSpec } from "./bioma";
import { CARBON_ANIMALS, CARBON_O2, CARBON_SCALE, CARBON_SPECIES } from "./carbonifero";
import { advance, census, createBiome, GAME_DAYS_PER_YEAR, REFUGE } from "../domain/bioma";

const def = carbonBiome(4);
const animal = (id: string) => def.species.find((s) => s.id === id) as AnimalSpec;

describe("el bosque del Carbonífero al pie de la pirámide (carbonifero.md)", () => {
  it("caben por las cuevas: el mayor dibujado (×1) es mucho menor que el mayor insecto de Gilgit ×400 y que ~38 m", () => {
    const drawn = (d: { species: readonly unknown[]; drawScale?: number }) =>
      Math.max(...(d.species as AnimalSpec[]).filter((s) => s.kind === "animal" && s.size).map((s) => Math.max(s.size.x, s.size.z) * (d.drawScale ?? 1)));
    const carbon = drawn(def);
    expect(carbon).toBeLessThan(3);
    expect(carbon).toBeLessThan(drawn(airBiome(4)));
    expect(carbon).toBeLessThan(38);
  });

  it("sus gigantes van a su tamaño fósil real: Meganeura ~70 cm, Meganeuropsis ~71 cm, Arthropleura ~2,6 m", () => {
    expect(CARBON_SCALE.value).toBe(1);
    expect(def.drawScale).toBe(1);
    expect(animal("meganeura").size.x).toBeGreaterThan(0.6);
    expect(animal("meganeuropsis").size.x).toBeGreaterThan(animal("meganeura").size.x);
    expect(animal("arthropleura").size.z).toBeCloseTo(2.6, 1);
    expect(animal("mazothairos").size.x).toBeGreaterThan(0.5);
    expect(CARBON_O2.value).toBeGreaterThan(0.3);
  });

  it("cada especie lleva su fuente, y lo que no dice el fósil va nombrado como nuestro", () => {
    for (const s of CARBON_SPECIES) {
      expect(s.source.length, s.id).toBeGreaterThan(40);
      if (s.kind === "animal") for (const k of ["childDays", "adultDays", "young", "cap"]) expect(s.ours?.[k], `${s.id}.${k}`).toBeDefined();
    }
    // The nymphs of the griffenflies are not known: said as fiction.
    for (const id of ["meganeura", "meganeuropsis"]) expect(animal(id).ours!.hiddenYoung).toMatch(/ficción/);
  });

  it("la cadena se cierra: cada uno come lo que hay en su bosque, y alguien caza a cada herbívoro volador", () => {
    const ids = new Set(def.species.map((s) => s.id));
    for (const s of def.species) if (s.kind !== "planta") for (const f of s.diet) expect(ids.has(f.food), `${s.id} come ${f.food}`).toBe(true);
    const eaten = new Set(def.species.flatMap((s) => (s.kind === "planta" ? [] : s.diet.map((f) => f.food))));
    for (const id of ["mazothairos", "cucaracha", "insectos-carbonifero", "hojarasca"]) expect(eaten.has(id), id).toBe(true);
    expect(CARBON_ANIMALS.every((s) => s.habitat === "bosque-carbonifero")).toBe(true);
  });

  for (const seed of [4, 11]) {
    it(`diez años (semilla ${seed}): nadie se extingue, nacen y mueren, las plantas no se agotan`, () => {
      const st = createBiome(seed, def);
      for (let y = 0; y < 10; y++) {
        const seen: Record<string, number> = {};
        for (let q = 0; q < 8; q++) {
          advance(st, GAME_DAYS_PER_YEAR / 8);
          for (const r of census(st)) {
            const s = def.species.find((x) => x.id === r.id)!;
            if (s.kind === "animal") {
              expect(r.count, `${r.name} año ${y}`).toBeLessThanOrEqual(s.cap * 1.5 + s.young * 2);
              seen[s.id] = Math.max(seen[s.id] ?? 0, r.count);
            } else if (s.kind === "planta") expect(r.cover!, `${r.name} año ${y}`).toBeGreaterThan(REFUGE * 0.5);
          }
        }
        for (const s of CARBON_ANIMALS) expect((seen[s.id] ?? 0) + (st.away[s.id] ?? 0), `${s.name} año ${y}`).toBeGreaterThan(0);
      }
      for (const s of CARBON_ANIMALS) expect(st.births[s.id], s.name).toBeGreaterThan(0);
    }, 60_000);
  }
});
