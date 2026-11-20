import { describe, expect, it } from "vitest";
import { AIR_BIOME, BIOME, type AnimalSpec, type BiomeDef, type PlantSpec } from "../data/bioma";
import { advance, census, createBiome, dateLabel, dormantIn, growthFactor, huntKill, monthOfDay, presentIn, stageOfIndividual, swarmKg, GAME_DAYS_PER_YEAR, REFUGE } from "./bioma";

const animals = BIOME.filter((s): s is AnimalSpec => s.kind === "animal");
const plant = (id: string) => BIOME.find((s) => s.id === id) as PlantSpec;
const animal = (id: string) => animals.find((s) => s.id === id)!;

describe("s3 biome: the living food chain of the air and the heights (Karakoram)", () => {
  it("starts on 20 November with every resident species; the summer swifts are away, the geese pass", () => {
    const st = createBiome(1);
    expect(dateLabel(0)).toBe("20 nov, año 1");
    for (const s of animals) {
      const n = st.animals.filter((a) => a.species === s.id).length;
      expect(n, s.name).toBe(s.visitor ? (presentIn(s, 11) ? s.visitor.count : 0) : s.start);
    }
    expect(st.animals.every((a) => stageOfIndividual(a) !== "cria")).toBe(true);
  });

  it("every species and number has a source and a label; the ours are named", () => {
    for (const s of BIOME) {
      expect(s.source.length).toBeGreaterThan(10);
      for (const k of Object.keys(s.ours ?? {})) expect(k in s, `${s.id}.${k}`).toBe(true);
    }
    for (const r of AIR_BIOME.remains) expect(r.source.length).toBeGreaterThan(10);
    expect(AIR_BIOME.climate.source.length).toBeGreaterThan(10);
  });

  it("plants grow in the summer and rest in the winter; higher plants start later and stop sooner (lapse rate)", () => {
    // 15 July and 15 January.
    expect(growthFactor(plant("pradera"), 195)).toBeGreaterThan(0.3);
    expect(growthFactor(plant("pradera"), 15)).toBe(0);
    expect(growthFactor(plant("artemisa"), 105)).toBeGreaterThan(growthFactor(plant("pradera"), 105));
    expect(growthFactor(plant("liquen"), 195)).toBeLessThan(growthFactor(plant("artemisa"), 195) + 1e-9);
  });

  it("the marmots sleep from September to April: none dies of hunger asleep", () => {
    const m = animal("marmota");
    expect(dormantIn(m, 11)).toBe(true);
    expect(dormantIn(m, 6)).toBe(false);
    const st = createBiome(3);
    advance(st, GAME_DAYS_PER_YEAR * 0.35);
    expect(st.deaths.marmota?.hambre ?? 0).toBe(0);
  });

  it("births come in each species' real month", () => {
    const st = createBiome(2);
    advance(st, GAME_DAYS_PER_YEAR * 0.7);
    const born = st.events.filter((e) => e.kind === "nace");
    expect(born.length).toBeGreaterThan(0);
    for (const e of born) expect(monthOfDay(e.day), e.species).toBe(animal(e.species).birthMonth);
  });

  it("births come from matings a gestation before: without a male, no young", () => {
    const st = createBiome(5);
    st.animals = st.animals.filter((a) => a.species !== "ibice" || a.female);
    for (const a of st.animals) if (a.species === "ibice") a.pregnant = undefined;
    advance(st, GAME_DAYS_PER_YEAR * 0.95);
    expect(st.events.some((e) => e.species === "ibice" && e.kind === "nace")).toBe(false);
    // The ibex rut is in December-January.
    const withMale = createBiome(5);
    advance(withMale, 3);
    const mated = withMale.events.filter((e) => e.species === "ibice" && e.kind === "aparea");
    expect(mated.length).toBeGreaterThan(0);
    expect([12, 1]).toContain(monthOfDay(mated[0]!.day));
  });

  it("a hunt kills the prey and pays the hunter; the bones it leaves feed the bearded vulture", () => {
    const st = createBiome(3);
    const leo = st.animals.find((a) => a.species === "leopardo")!;
    const prey = st.animals.find((a) => a.species === "bharal")!;
    leo.debt = { bharal: 40 };
    const bones = st.remains.huesos!;
    expect(huntKill(st, leo.id, prey.id)).toBe(true);
    expect(prey.dead).toBe("depredacion");
    expect(leo.debt.bharal).toBeLessThan(40);
    expect(st.remains.huesos!).toBeGreaterThan(bones);
    expect(st.events.at(-1)!.text).toContain("Leopardo de las nieves caza");
  });

  for (const seed of [4, 11, 23]) {
    it(`over ten years (seed ${seed}) the populations stay bounded, nothing collapses, and they are born and die of every cause`, () => {
      const st = createBiome(seed);
      const kinds = new Set<string>();
      for (let y = 0; y < 10; y++) {
        const thisYear: Record<string, number> = {};
        let geese = false;
        let swifts = false;
        for (let q = 0; q < 8; q++) {
          advance(st, GAME_DAYS_PER_YEAR / 8);
          for (const e of st.events) {
            if (e.cause) kinds.add(e.cause);
            if (e.species === "ansar" && e.kind === "llega") geese = true;
            if (e.species === "vencejo" && e.kind === "llega") swifts = true;
          }
          for (const r of census(st)) {
            const s = BIOME.find((x) => x.id === r.id)!;
            if (s.kind === "animal") {
              expect(r.count, `${r.name} año ${y}`).toBeLessThanOrEqual(s.cap * 1.5 + s.young * 2);
              thisYear[s.id] = Math.max(thisYear[s.id] ?? 0, r.count);
            } else {
              expect(r.cover!, `${r.name} año ${y}`).toBeGreaterThan(REFUGE * 0.5);
              expect(r.cover!, `${r.name} año ${y}`).toBeLessThan(3);
            }
          }
        }
        // Every species lives on the island every year (by its own births, or a few from another valley after a bad year).
        for (const s of animals) if (!s.visitor) expect((thisYear[s.id] ?? 0) + (st.away[s.id] ?? 0), `${s.name} año ${y}`).toBeGreaterThan(0);
        // The swifts come back every summer (in a bad year of flying insects they leave again soon); the geese pass every year.
        if (y > 0) expect(swifts, `vencejos año ${y}`).toBe(true);
        expect(geese, `ánsares año ${y}`).toBe(true);
      }
      for (const s of animals) if (!s.visitor && s.intervalMonths <= 12) expect(st.births[s.id], s.name).toBeGreaterThan(0);
      expect(kinds).toContain("depredacion");
      expect(kinds).toContain("vejez");
      for (const s of BIOME.filter((x) => x.kind === "banco")) expect(swarmKg(s, st.swarms[s.id]!), s.id).toBeGreaterThan(0);
    }, 60_000);
  }

  it("is deterministic: the same seed, the same island", () => {
    const a = createBiome(9);
    const b = createBiome(9);
    advance(a, 10);
    advance(b, 10);
    expect(census(a)).toEqual(census(b));
  });

  it("takes any set of species as data: a biome of one grass and one grazer lives too", () => {
    const grass = plant("pradera");
    const pika = { ...animal("pika"), diet: [{ food: "pradera" }] } as AnimalSpec;
    const def: BiomeDef = { ...AIR_BIOME, id: "prueba", species: [grass, pika], remains: [] };
    const st = createBiome(1, def);
    advance(st, GAME_DAYS_PER_YEAR * 2);
    expect(census(st).map((r) => r.id)).toEqual(["pradera", "pika"]);
    expect(st.animals.some((a) => a.species === "pika" && !a.dead)).toBe(true);
  });
});
