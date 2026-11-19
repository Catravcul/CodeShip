import { describe, expect, it } from "vitest";
import { BIOME, type AnimalSpec, type PlantSpec } from "../data/bioma";
import { advance, census, createBiome, dateLabel, growthFactor, huntKill, monthOfDay, stageOfIndividual, swarmKg, GAME_DAYS_PER_YEAR, REFUGE } from "./bioma";

const animals = BIOME.filter((s): s is AnimalSpec => s.kind === "animal");
const plant = (id: string) => BIOME.find((s) => s.id === id) as PlantSpec;

describe("s3 biome: a living food chain", () => {
  it("starts on 19 November with every resident species and the terns of the austral summer", () => {
    const st = createBiome(1);
    expect(dateLabel(0)).toBe("19 nov, año 1");
    for (const s of animals) expect(st.animals.filter((a) => a.species === s.id).length).toBe(s.visitor ? s.visitor.count : s.start);
    expect(st.animals.every((a) => stageOfIndividual(a) !== "cria")).toBe(true);
  });

  it("every species and number has a source; the ours are named", () => {
    for (const s of BIOME) {
      expect(s.source.length).toBeGreaterThan(10);
      for (const k of Object.keys(s.ours ?? {})) expect(k in s).toBe(true);
    }
  });

  it("plants grow in the summer light and rest in the winter (54°S)", () => {
    expect(growthFactor(plant("tussac"), 15)).toBeGreaterThan(0.3);
    expect(growthFactor(plant("tussac"), 190)).toBe(0);
    expect(growthFactor(plant("fitoplancton"), 15)).toBeGreaterThan(growthFactor(plant("fitoplancton"), 190));
  });

  it("births come in each species' real month", () => {
    const st = createBiome(2);
    advance(st, GAME_DAYS_PER_YEAR * 0.2);
    const born = st.events.filter((e) => e.kind === "nace");
    expect(born.length).toBeGreaterThan(0);
    for (const e of born) {
      const s = animals.find((x) => x.id === e.species)!;
      expect(monthOfDay(e.day)).toBe(s.birthMonth);
    }
  });

  it("a hunt kills the prey and pays the hunter", () => {
    const st = createBiome(3);
    const leo = st.animals.find((a) => a.species === "leopardo")!;
    const pen = st.animals.find((a) => a.species === "papua")!;
    leo.debt = { papua: 10 };
    expect(huntKill(st, leo.id, pen.id)).toBe(true);
    expect(pen.dead).toBe("depredacion");
    expect(leo.debt.papua).toBeLessThan(10);
    expect(st.events.at(-1)!.text).toContain("Foca leopardo caza");
  });

  it("over ten years the populations stay bounded, nothing collapses, and they are born and die of every cause", () => {
    const st = createBiome(4);
    const kinds = new Set<string>();
    const seen: Record<string, number> = {};
    for (let y = 0; y < 10; y++) {
      const thisYear: Record<string, number> = {};
      for (let q = 0; q < 4; q++) {
        advance(st, GAME_DAYS_PER_YEAR / 4);
        for (const e of st.events) if (e.cause) kinds.add(e.cause);
        for (const r of census(st)) {
          const s = BIOME.find((x) => x.id === r.id)!;
          if (s.kind === "animal") {
            expect(r.count, `${r.name} año ${y}`).toBeLessThanOrEqual(s.cap * 1.5 + s.young * 2);
            seen[s.id] = Math.max(seen[s.id] ?? 0, r.count);
            thisYear[s.id] = Math.max(thisYear[s.id] ?? 0, r.count);
          } else {
            expect(r.cover!, `${r.name} año ${y}`).toBeGreaterThan(REFUGE * 0.5);
            expect(r.cover!, `${r.name} año ${y}`).toBeLessThan(3);
          }
        }
      }
      // Every species lives on the island every year (by its own births, or a pair from another colony after a bad year).
      for (const s of animals) if (!s.visitor) expect((thisYear[s.id] ?? 0) + (st.away[s.id] ?? 0), `${s.name} año ${y}`).toBeGreaterThan(0);
      // The terns come back every austral summer.
      expect(st.events.some((e) => e.species === "charran" && e.kind === "llega"), `charrán año ${y}`).toBe(true);
    }
    for (const s of animals) if (!s.visitor && s.intervalMonths <= 12) expect(st.births[s.id], s.name).toBeGreaterThan(0);
    expect(kinds).toContain("depredacion");
    expect(kinds).toContain("vejez");
    expect(Object.values(st.deaths).some((d) => (d.hambre ?? 0) + (d["sin-madre"] ?? 0) > 0)).toBe(true);
    for (const s of BIOME.filter((x) => x.kind === "banco")) expect(swarmKg(s, st.swarms[s.id]!)).toBeGreaterThan(0);
  }, 30_000);

  it("is deterministic: the same seed, the same island", () => {
    const a = createBiome(9);
    const b = createBiome(9);
    advance(a, 10);
    advance(b, 10);
    expect(census(a)).toEqual(census(b));
  });
});
