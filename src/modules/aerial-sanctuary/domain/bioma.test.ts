import { describe, expect, it } from "vitest";
import { AIR_BIOME, BIOME, FRUIT_FLY_M, INSECT_SCALE, airBiome, s3People, s3Plan, type AnimalSpec, type BiomeDef, type PlantSpec } from "../data/bioma";
import { advance, census, createBiome, dateLabel, dormantIn, growthFactor, huntKill, lifeStageOf, monthOfDay, presentIn, quietNow, swarmKg, GAME_DAYS_PER_YEAR, REFUGE } from "./bioma";
import { LEVEL_SHARE } from "@modules/fauna/domain/population";

const animals = BIOME.filter((s): s is AnimalSpec => s.kind === "animal");
const plant = (id: string) => BIOME.find((s) => s.id === id) as PlantSpec;
const animal = (id: string) => animals.find((s) => s.id === id)!;

describe("s3 biome: the living food chain of the air and the heights (Karakoram), with giant insects", () => {
  it("only insects (and one arachnid bank) live on it: no mammal or bird left", () => {
    expect(animals.length).toBeGreaterThanOrEqual(12);
    for (const s of animals) expect(s.shape, s.id).toBe("insecto");
    for (const id of ["ibice", "leopardo", "marmota", "buitre", "ratones"]) expect(BIOME.some((s) => s.id === id), id).toBe(false);
  });

  it("the scale: the fruit fly (2,5 mm real) is drawn 1 m long, every insect by the same factor", () => {
    expect(INSECT_SCALE.value).toBeCloseTo(400, 6);
    expect(FRUIT_FLY_M.value * INSECT_SCALE.value).toBeCloseTo(1, 6);
    expect(animal("drosophila").size.z * INSECT_SCALE.value).toBeCloseTo(1, 1);
    // A bee some 4–5 m, the big dragonfly some 30 m across, the mantis under 30 m long.
    expect(animal("abeja").size.z * INSECT_SCALE.value).toBeGreaterThan(4);
    expect(animal("abeja").size.z * INSECT_SCALE.value).toBeLessThan(6);
    expect(animal("libelula").size.x * INSECT_SCALE.value).toBeGreaterThan(28);
    expect(animal("mantis").size.z * INSECT_SCALE.value).toBeLessThan(30);
    expect(AIR_BIOME.drawScale).toBe(INSECT_SCALE.value);
  });

  it("the rule of animals per person, as in sanctuary 1: people × setting, 70/22/8 by trophic level", () => {
    expect(s3People()).toBe(17);
    for (const k of [3, 4, 5, 6]) {
      const plan = s3Plan(k);
      const total = [...plan.values()].reduce((t, v) => t + v, 0);
      expect(total, `k=${k}`).toBe(k * s3People());
      const by = (t: number) => animals.filter((s) => s.trophic === t).reduce((n, s) => n + plan.get(s.id)!, 0);
      // The top predators keep two of each at least; the levels come near their shares.
      expect(by(2) / total).toBeGreaterThan(LEVEL_SHARE.presa - 0.1);
      expect(by(3) / total).toBeGreaterThan(LEVEL_SHARE.meso - 0.08);
      for (const s of animals) expect(plan.get(s.id)!, s.id).toBeGreaterThanOrEqual(2);
    }
    const four = airBiome(4).species.filter((s): s is AnimalSpec => s.kind === "animal");
    expect(four.reduce((t, s) => t + s.cap, 0)).toBe(4 * s3People());
  });

  it("starts on 20 November: each insect at its age of the year (Apollo eggs, ladybird adults), the dragonflies away", () => {
    const st = createBiome(1);
    expect(dateLabel(0)).toBe("20 nov, año 1");
    for (const s of animals) {
      const n = st.animals.filter((a) => a.species === s.id).length;
      expect(n, s.name).toBe(s.visitor ? (presentIn(s, 11) ? s.visitor.count : 0) : s.start);
    }
    const of = (id: string) => st.animals.filter((a) => a.species === id);
    expect(of("mariposa").every((a) => lifeStageOf(a) === "huevo" && quietNow(a))).toBe(true);
    expect(of("mariquita").every((a) => lifeStageOf(a) === "adulto")).toBe(true);
    expect(of("libelula").length).toBe(0);
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
    expect(growthFactor(plant("pradera"), 195)).toBeGreaterThan(0.3);
    expect(growthFactor(plant("pradera"), 15)).toBe(0);
    expect(growthFactor(plant("artemisa"), 105)).toBeGreaterThan(growthFactor(plant("pradera"), 105));
    expect(growthFactor(plant("flores"), 195)).toBeGreaterThan(0.2);
  });

  it("the bumblebee queens sleep from October to March: none dies of hunger asleep", () => {
    const b = animal("abejorro");
    expect(dormantIn(b, 11)).toBe(true);
    expect(dormantIn(b, 6)).toBe(false);
    const st = createBiome(3);
    advance(st, GAME_DAYS_PER_YEAR * 0.3);
    expect(st.deaths.abejorro?.hambre ?? 0).toBe(0);
  });

  it("layings come in each species' real month", () => {
    const st = createBiome(2);
    advance(st, GAME_DAYS_PER_YEAR * 0.9);
    const born = st.events.filter((e) => e.kind === "nace");
    expect(born.length).toBeGreaterThan(0);
    for (const e of born) expect(monthOfDay(e.day), e.species).toBe(animal(e.species).birthMonth);
  });

  it("layings come from matings a little before: without a male, no eggs", () => {
    const st = createBiome(5);
    st.animals = st.animals.filter((a) => a.species !== "abeja" || a.female);
    advance(st, GAME_DAYS_PER_YEAR * 0.6);
    expect(st.events.some((e) => e.species === "abeja" && e.kind === "nace")).toBe(false);
    const withMale = createBiome(5);
    advance(withMale, GAME_DAYS_PER_YEAR * 0.5);
    const mated = withMale.events.filter((e) => e.species === "abeja" && e.kind === "aparea");
    expect(mated.length).toBeGreaterThan(0);
    expect(monthOfDay(mated[0]!.day)).toBe(3);
  });

  it("a hunt kills the prey and pays the hunter; the body is carrion for the burying beetle", () => {
    const st = createBiome(3);
    const hornet = st.animals.find((a) => a.species === "avispon")!;
    const prey = st.animals.find((a) => a.species === "abeja")!;
    hornet.debt = { abeja: 1 };
    const carrion = st.remains.carrona!;
    expect(huntKill(st, hornet.id, prey.id)).toBe(true);
    expect(prey.dead).toBe("depredacion");
    expect(hornet.debt.abeja).toBeLessThan(1);
    expect(st.remains.carrona!).toBeGreaterThan(carrion);
    expect(st.events.at(-1)!.text).toContain("Avispón asiático caza");
  });

  for (const seed of [4, 11, 23]) {
    it(`over ten years (seed ${seed}) the populations stay bounded, nothing collapses, and they are born and die of every cause`, () => {
      const st = createBiome(seed);
      const kinds = new Set<string>();
      for (let y = 0; y < 10; y++) {
        const thisYear: Record<string, number> = {};
        let dragonflies = false;
        for (let q = 0; q < 8; q++) {
          advance(st, GAME_DAYS_PER_YEAR / 8);
          for (const e of st.events) {
            if (e.cause) kinds.add(e.cause);
            if (e.species === "libelula" && e.kind === "llega") dragonflies = true;
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
        for (const s of animals) if (!s.visitor) expect((thisYear[s.id] ?? 0) + (st.away[s.id] ?? 0), `${s.name} año ${y}`).toBeGreaterThan(0);
        if (y > 0) expect(dragonflies, `libélulas año ${y}`).toBe(true);
      }
      for (const s of animals) if (!s.visitor) expect(st.births[s.id], s.name).toBeGreaterThan(0);
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
    const locust = { ...animal("saltamontes"), diet: [{ food: "pradera" }] } as AnimalSpec;
    const def: BiomeDef = { ...AIR_BIOME, id: "prueba", species: [grass, locust], remains: [] };
    const st = createBiome(1, def);
    advance(st, GAME_DAYS_PER_YEAR * 2);
    expect(census(st).map((r) => r.id)).toEqual(["pradera", "saltamontes"]);
    expect(st.animals.some((a) => a.species === "saltamontes" && !a.dead)).toBe(true);
  });
});
