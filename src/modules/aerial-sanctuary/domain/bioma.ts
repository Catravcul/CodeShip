import { ageInGroup, sizeAt, stageOf, STAGE_LABEL, type LifeCycle, type Stage } from "@modules/fauna/domain/life-cycle";
import { matingMonth } from "@modules/fauna/domain/mating";
import { daylightHours, eppley, grow, rateFor, seasonFactor, takeable, yearMean } from "@modules/fauna/domain/forage";
import { BIOME, CARRION, CLIMATE, nameOf, type AnimalSpec, type BiomeSpec, type Food, type PlantSpec, type SwarmSpec } from "../data/bioma";

/**
 * THE LIVING FOOD CHAIN of sanctuary 3's biome (docs/design/bioma-s3.md): Cold Sanctuary's FoodChain (each
 * sanctuary balanced on its own, `FoodChain.Isolated`; what each eats a day, `Intake`; a source gives at most
 * `Margin` of what it produces) made to live. Plants grow by the light and the warmth of each day at 54°S and are
 * grazed (fauna/domain/forage.ts); krill, fish, squid and the soil's invertebrates live as yearly cohorts that spawn in
 * their season, are eaten, starve when their food is short and die old; the birds and seals live one by one with
 * Cold Sanctuary's stages (fauna/domain/life-cycle.ts): born in their real month, fed by their mother, grown, and dead
 * of old age, of hunger or in a predator's mouth. Pure and deterministic (a seeded random): the same game day always
 * gives the same island, so nothing is saved but the clock.
 *
 * Time: Cold Sanctuary's year of the sanctuary, 28 game days (FoodChain.DaysPerYear). One game day (24 real minutes in
 * sanctuary 3) is 365/28 ≈ 13 days of biology, for everything alike (eating, growing, breeding, dying), so every rate
 * keeps its real ratio to the others.
 */
export const GAME_DAYS_PER_YEAR = 28;
export const BIO_DAYS_PER_GAME_DAY = 365 / GAME_DAYS_PER_YEAR;
/** Day 0 of the island is 19 November (0-based day of the year), the day Berón asked for it: spring, births ahead. */
export const START_DAY_OF_YEAR = 322;
/** One step of the chain: a game hour (one real minute), ≈ half a day of biology. */
export const STEP_GAME_DAYS = 1 / 24;
/** A source gives at most this share of what it produces (FoodChain.Margin). */
export const MARGIN = 0.8;
/** Of the animals that are prey (one by one), predators take at most this share of what they produce a year (ours: the order of skua predation on a penguin colony's eggs and chicks). */
export const PREY_MARGIN = 0.3;
/** What a plant or a bank keeps out of reach (ours: deep water, cracks, the bottom of the moss): it never vanishes. */
export const REFUGE = 0.04;

export type EventKind = "nace" | "muere" | "llega" | "se-va" | "puesta" | "aparea";
export type Cause = "vejez" | "hambre" | "depredacion" | "otras" | "sin-madre";

export interface BiomeEvent {
  /** Days of biology since day 0. */
  readonly day: number;
  readonly species: string;
  readonly kind: EventKind;
  readonly n: number;
  readonly cause?: Cause;
  readonly by?: string;
  readonly text: string;
}

export interface Individual {
  readonly id: number;
  readonly species: string;
  readonly female: boolean;
  /** Days of biology. */
  age: number;
  /** Days it can still go without food. */
  reserve: number;
  readonly mother?: number;
  lastBirthYear: number;
  /** Food it is owed from animal prey (kg): it hunts when this reaches a prey's worth. */
  debt: Record<string, number>;
  /** Pregnant (or with eggs on the way): the year of the birth season it is due in. */
  pregnant?: number;
  /** Whether it died this step (kept for one step so the scene can show it go). */
  dead?: Cause;
}

/**
 * A bank (krill, fish, squid, the soil's invertebrates): its biomass lives continuously (it grows by what it eats, up
 * to what the place holds, and is eaten); its age structure says how many there are of each age: the young of the
 * year join it at the end of the spawning, and the oldest die then of old age.
 */
interface Cohorts {
  /** Kg in all. */
  kg: number;
  /** Share of the individuals of each age in years, 0 … maxAge − 1 (adds up to 1). */
  share: number[];
  /** This season's spawn (kg, part of `kg`): the young of the year. */
  spawnKg: number;
}

export interface BiomeState {
  /** Days of biology since day 0. */
  day: number;
  rng: number;
  nextId: number;
  plants: Record<string, number>;
  swarms: Record<string, Cohorts>;
  animals: Individual[];
  carrion: number;
  /** The most each plant or bank holds, after the chain's balance. */
  readonly stock: Record<string, number>;
  /** Kg a year that each predator may take of each animal prey (PREY_MARGIN of its production). */
  readonly preyAllowance: Record<string, Record<string, number>>;
  /** Share of its food each species found in the last step (1 = fed). */
  fed: Record<string, number>;
  /** Triggers done this year (key → year). */
  done: Record<string, number>;
  events: BiomeEvent[];
  /** What the chain raised at the start (the FoodChain report). */
  readonly raised: readonly string[];
  /** Totals since day 0. */
  births: Record<string, number>;
  deaths: Record<string, Partial<Record<Cause, number>>>;
  /** This year's krill recruitment over the mean (good and bad years). */
  krillYear: number;
  /** Birds that flew off to feed elsewhere in a lean time, by species: they come back in the next birth season. */
  away: Record<string, number>;
}

const plants = BIOME.filter((s): s is PlantSpec => s.kind === "planta");
const swarms = BIOME.filter((s): s is SwarmSpec => s.kind === "banco");
const animals = BIOME.filter((s): s is AnimalSpec => s.kind === "animal");
const specOf = new Map<string, BiomeSpec>(BIOME.map((s) => [s.id, s]));
const animalSpec = (id: string) => specOf.get(id) as AnimalSpec;
const MAX_EVENTS = 60;

// ── Calendar ──────────────────────────────────────────────────────────────────────────────────────────────────────
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const dayOfYear = (day: number): number => (((Math.floor(day) + START_DAY_OF_YEAR) % 365) + 365) % 365;
export const yearOf = (day: number): number => Math.floor((Math.floor(day) + START_DAY_OF_YEAR) / 365);
export function monthOfDay(day: number): number {
  const d = dayOfYear(day);
  let m = 11;
  while (MONTH_START[m]! > d) m--;
  return m + 1;
}
const dayOfMonth = (day: number) => dayOfYear(day) - MONTH_START[monthOfDay(day) - 1]! + 1;
/** «12 dic, año 1». */
export const dateLabel = (day: number): string => `${dayOfMonth(day)} ${MONTHS[monthOfDay(day) - 1]}, año ${yearOf(day) - yearOf(0) + 1}`;
const inWindow = (m: number, from: number, months: number) => ((m - from + 12) % 12) < months;
/** Day (since day 0) the birth month `m` starts in calendar year `y`. */
const monthStart = (y: number, m: number) => y * 365 + MONTH_START[m - 1]! - START_DAY_OF_YEAR;
/** The birth season a mating on `day` is due in: the birth month nearest a gestation later (its calendar year). */
export function dueYear(day: number, s: AnimalSpec): number {
  const target = day + s.gestationMonths * 30.4;
  const y = yearOf(target);
  return [y - 1, y, y + 1].reduce((best, c) => (Math.abs(monthStart(c, s.birthMonth) + 15 - target) < Math.abs(monthStart(best, s.birthMonth) + 15 - target) ? c : best));
}

// ── Climate and plant growth ──────────────────────────────────────────────────────────────────────────────────────
/** Mean temperature of day-of-year `d`, between the monthly means. */
function tempAt(table: readonly number[], d: number): number {
  const x = (d / 365) * 12 - 0.5;
  const i = Math.floor(x);
  const f = x - i;
  const a = table[((i % 12) + 12) % 12]!;
  const b = table[(((i + 1) % 12) + 12) % 12]!;
  return a + (b - a) * f;
}
/** How much a plant can grow on day-of-year `d`, 0–1 (for the phytoplankton, Eppley's rate over its rate at 0 °C). */
export function growthFactor(p: PlantSpec, d: number): number {
  const light = daylightHours(CLIMATE.latitude, d);
  if (p.id === "fitoplancton") return seasonFactor(light, 99, 0) * (eppley(tempAt(CLIMATE.seaC, d)) / eppley(0)) * Math.min(1, Math.max(0, (light - 8) / 8));
  return seasonFactor(light, tempAt(p.sea ? CLIMATE.seaC : CLIMATE.airC, d), p.minTempC);
}
const rate = new Map(plants.map((p) => [p.id, rateFor(p.perYear, yearMean((d) => growthFactor(p, d)))]));

// ── Bodies ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const cycleOf = (s: AnimalSpec): LifeCycle => s;
export const lifespanOf = (s: AnimalSpec): number => s.childDays + s.teenDays + s.adultDays;
export const stageOfIndividual = (a: Individual): Stage => stageOf(a.age, animalSpec(a.species));
/** Size over the adult female's (length), with the male's size. */
export function scaleOf(a: Individual): number {
  const s = animalSpec(a.species);
  return sizeAt(a.age, s) * (a.female ? 1 : s.male);
}
export const massOf = (a: Individual): number => animalSpec(a.species).massKg * scaleOf(a) ** 3;
const intakeOf = (a: Individual): number => {
  const s = animalSpec(a.species);
  return s.intakeKgDay * Math.pow(massOf(a) / s.massKg, 0.75);
};

/** Cohort mass at age `a` years (ours: grows as the square of age to maturity, then a little more). */
function cohortMass(s: SwarmSpec, a: number): number {
  return s.adultMassKg * Math.min(1.3, ((a + 0.5) / (s.matureYears + 0.5)) ** 2);
}
const spawnMass = (s: SwarmSpec) => cohortMass(s, 0) * 0.05;
export const swarmKg = (_s: SwarmSpec, c: Cohorts): number => c.kg;
/** Individuals of each age (and the spawn), from the biomass and the age structure. */
export function swarmCounts(s: SwarmSpec, c: Cohorts): { ages: number[]; spawn: number } {
  const mean = c.share.reduce((t, x, a) => t + x * cohortMass(s, a), 0);
  const n = Math.max(0, c.kg - c.spawnKg) / Math.max(1e-12, mean);
  return { ages: c.share.map((x) => x * n), spawn: c.spawnKg / spawnMass(s) };
}
/** How busy a grazer of the plankton or the moss is: it slows down in the winter (krill's winter metabolic depression, Meyer 2012; ours for the soil). */
function activity(s: SwarmSpec, d: number): number {
  if (s.trophic !== 2) return 1;
  const food = plants.find((p) => p.id === s.diet[0]!.food)!;
  return 0.3 + 0.7 * Math.min(1, growthFactor(food, d) * 2);
}

// ── Random ────────────────────────────────────────────────────────────────────────────────────────────────────────
function rand(st: BiomeState): number {
  let t = (st.rng = (st.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const hashDay = (id: number, salt: number) => (((Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca77)) >>> 0) % 1000) / 1000;

// ── The balance at the start (Cold Sanctuary's FoodChain.Evaluate) ────────────────────────────────────────────────
const prefOf = (f: Food) => f.pref ?? 1;
const isAnimal = (id: string) => specOf.get(id)?.kind === "animal";
/** Kg a year of an animal species' stages that are eaten, produced at its cap (ours: half are females; the eaten young weigh a third of an adult). */
function preyProduction(s: AnimalSpec, stages: readonly Stage[] | undefined): number {
  const young = (s.cap / 2) * s.young * (12 / s.intervalMonths);
  const youngOnly = stages && stages.every((x) => x === "cria");
  return youngOnly ? young * s.massKg * 0.33 : young * s.massKg * 0.3;
}

function balance(): { stock: Record<string, number>; prey: Record<string, Record<string, number>>; raised: string[] } {
  const stock: Record<string, number> = {};
  for (const s of [...plants, ...swarms]) stock[s.id] = s.stockKg;
  const prey: Record<string, Record<string, number>> = {};
  // Predators on animal prey: each may take its share of PREY_MARGIN of what the prey produces.
  for (const p of animals)
    for (const f of p.diet) {
      if (!isAnimal(f.food)) continue;
      const q = animalSpec(f.food);
      const eaters = animals.filter((x) => x.diet.some((g) => g.food === f.food));
      const demand = (x: AnimalSpec) => {
        const g = x.diet.find((h) => h.food === f.food)!;
        return x.cap * x.intakeKgDay * 365 * (prefOf(g) / x.diet.reduce((t, h) => t + prefOf(h), 0));
      };
      const total = eaters.reduce((t, x) => t + demand(x), 0);
      const allowed = Math.min(1, (PREY_MARGIN * preyProduction(q, f.stages)) / Math.max(1e-9, total));
      (prey[p.id] ??= {})[f.food] = (demand(p) * allowed) / Math.max(1, p.cap);
    }
  // Demands on plants and banks, top down; raise a source until it gives what is asked with MARGIN to spare.
  const raised: string[] = [];
  for (let pass = 0; pass < 12; pass++) {
    const demand: Record<string, number> = {};
    const add = (food: string, kg: number) => (demand[food] = (demand[food] ?? 0) + kg);
    for (const p of animals) {
      const allowedAnimal = Object.values(prey[p.id] ?? {}).reduce((t, v) => t + v, 0);
      const need = p.cap * (p.intakeKgDay * 365 - allowedAnimal);
      const pools = p.diet.filter((f) => !isAnimal(f.food));
      const w = pools.reduce((t, f) => t + prefOf(f), 0);
      for (const f of pools) add(f.food, (need * prefOf(f)) / w);
    }
    for (const s of swarms) {
      const need = s.intakePerDay * 365 * stock[s.id]! * 0.6;
      const w = s.diet.reduce((t, f) => t + prefOf(f), 0);
      for (const f of s.diet) add(f.food, (need * prefOf(f)) / w);
    }
    let changed = false;
    for (const s of [...plants, ...swarms]) {
      const d = demand[s.id] ?? 0;
      // What it produces a year near its working stock (about half to 0.6 of the most).
      // Its working stock is about half the most; winters and bad years halve what it makes again (ours).
      const produce = s.perYear * stock[s.id]! * 0.25 * MARGIN;
      if (d > produce * 1.0001) {
        const k = d / produce;
        stock[s.id] = stock[s.id]! * k;
        raised.push(`${s.name}: ×${k.toFixed(2)}`);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { stock, prey, raised };
}
const BALANCE = balance();

// ── Start ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function createBiome(seed = 1): BiomeState {
  const st: BiomeState = {
    day: 0, rng: seed | 0, nextId: 1, plants: {}, swarms: {}, animals: [], carrion: 0,
    stock: { ...BALANCE.stock }, preyAllowance: BALANCE.prey, fed: {}, done: {}, events: [], raised: BALANCE.raised,
    births: {}, deaths: {}, krillYear: 1, away: {},
  };
  for (const p of plants) st.plants[p.id] = st.stock[p.id]! * 0.55;
  for (const s of swarms) {
    // An even age pyramid at the natural mortality; 60 % of the stock.
    const n = Array.from({ length: s.maxAgeYears }, (_, a) => Math.exp(-s.mortality * a));
    const sum = n.reduce((t, x) => t + x, 0);
    st.swarms[s.id] = { kg: st.stock[s.id]! * 0.6, share: n.map((x) => x / sum), spawnKg: 0 };
  }
  for (const s of animals) {
    const count = s.visitor ? (inWindow(monthOfDay(0), s.visitor.arrive, (s.visitor.leave - s.visitor.arrive + 12) % 12) ? s.visitor.count : 0) : s.start;
    for (let i = 0; i < count; i++) {
      // Adults of spread ages and last seasons' young (fauna's ageInGroup), never newborns: births come in season.
      const age = Math.max(s.childDays + 1, ageInGroup(i, count, s));
      const a: Individual = { id: st.nextId++, species: s.id, female: i % 2 === 0, age, reserve: s.fastDays, lastBirthYear: -99, debt: {} };
      // Mothers that mated before day 0 carry their young already (most do: ours, 85 %).
      const next = [yearOf(0), yearOf(0) + 1].map((y) => monthStart(y, s.birthMonth)).find((d) => d + 28 >= 0)!;
      if (a.female && !s.visitor && stageOf(age, s) !== "joven" && next < s.gestationMonths * 30.4 && hashDay(a.id, 5) < 0.85) a.pregnant = yearOf(next);
      st.animals.push(a);
    }
    st.births[s.id] = 0;
  }
  st.krillYear = krillYearFactor(seed, yearOf(0));
  return st;
}

/** Krill's recruitment this year over the mean: most years near it, one in four a bad one (Murphy et al. 2007: ~3–4-year cycles at South Georgia). */
function krillYearFactor(seed: number, year: number): number {
  const r = hashDay(seed * 31 + year, 99);
  return r < 0.25 ? 0.2 + r : 0.8 + r * 0.6;
}

// ── Events ────────────────────────────────────────────────────────────────────────────────────────────────────────
const YOUNG_NAME: Record<string, [string, string]> = {
  pinguino: ["pollo", "pollos"], ave: ["pollo", "pollos"], pajaro: ["pollo", "pollos"], pinnipedo: ["cría", "crías"],
};
function log(st: BiomeState, e: Omit<BiomeEvent, "day" | "text">, text: string): void {
  st.events.push({ ...e, day: st.day, text });
  if (st.events.length > MAX_EVENTS) st.events.splice(0, st.events.length - MAX_EVENTS);
}
const CAUSE_TEXT: Record<Cause, string> = { vejez: "de viejo", hambre: "de hambre", depredacion: "cazado", otras: "por otras causas (temporal, enfermedad)", "sin-madre": "de hambre: perdió a su madre" };
function kill(st: BiomeState, a: Individual, cause: Cause, by?: string): void {
  if (a.dead) return;
  a.dead = cause;
  const s = animalSpec(a.species);
  const stage = stageOfIndividual(a);
  const who = stage === "cria" ? `${YOUNG_NAME[s.shape]![0]} de ${s.name.toLowerCase()}` : `${s.name} (${STAGE_LABEL[stage]})`;
  (st.deaths[a.species] ??= {})[cause] = (st.deaths[a.species]![cause] ?? 0) + 1;
  // What is not eaten is carrion.
  st.carrion += massOf(a) * (cause === "depredacion" ? 0.3 : 0.8);
  const text = cause === "depredacion" && by ? `${nameOf(by)} caza: ${who}` : `Muere ${who}, ${CAUSE_TEXT[cause]}`;
  log(st, { species: a.species, kind: "muere", n: 1, cause, ...(by ? { by } : {}) }, text);
}

// ── One step ──────────────────────────────────────────────────────────────────────────────────────────────────────
export interface StepOptions {
  /** The scene shows the hunts (fauna's Ecosystem chases and reports kills with `huntKill`): the chain only settles hunts long overdue. */
  readonly onStage?: boolean;
}

/** Advances the biome `gameDays` (in steps of a game hour). */
export function advance(st: BiomeState, gameDays: number, o: StepOptions = {}): void {
  const steps = Math.round(gameDays / STEP_GAME_DAYS);
  for (let i = 0; i < steps; i++) step(st, STEP_GAME_DAYS * BIO_DAYS_PER_GAME_DAY, o);
}

export function step(st: BiomeState, dt: number, o: StepOptions = {}): void {
  st.animals = st.animals.filter((a) => !a.dead);
  const d = dayOfYear(st.day);
  const month = monthOfDay(st.day);
  const year = yearOf(st.day);
  if (st.done["krill-year"] !== year) {
    st.done["krill-year"] = year;
    st.krillYear = krillYearFactor(st.rng ^ 0x5bd1, year);
  }
  // 1. Plants grow by the day's light and warmth; the tussac more with the guano of the seals and birds near it.
  const vertebrates = st.animals.filter((a) => animalSpec(a.species).habitat !== "aire").length;
  const guano = 0.6 + 0.4 * Math.min(1, vertebrates / 60);
  for (const p of plants) st.plants[p.id] = grow(st.plants[p.id]!, st.stock[p.id]!, rate.get(p.id)!, growthFactor(p, d) * (p.guano ? guano : 1), dt);

  // 2. What each eater wants of each food.
  const want = new Map<string, number>();
  const asks: { who: string | Individual; food: string; kg: number }[] = [];
  const ask = (who: string | Individual, food: string, kg: number) => {
    if (kg <= 0) return;
    asks.push({ who, food, kg });
    want.set(food, (want.get(food) ?? 0) + kg);
  };
  const availOf = (food: string): number => {
    if (food === CARRION.id) return st.carrion;
    const sp = specOf.get(food);
    if (!sp) return 0;
    if (sp.kind === "planta") return st.plants[food]!;
    if (sp.kind === "banco") return swarmKg(sp, st.swarms[food]!);
    return 0;
  };
  // In a bad krill year they turn to fish (fur seals: Reid and Arnould 1996).
  const krillReach = () => Math.min(1, st.krillYear);
  for (const s of swarms) {
    const daily = s.intakePerDay * st.swarms[s.id]!.kg * activity(s, d);
    split(s.diet, daily * dt, (f, kg) => ask(s.id, f, kg), availOf, daily, st.stock, krillReach);
  }
  const byId = new Map(st.animals.map((a) => [a.id, a]));
  const kids = new Map<number, Individual[]>();
  for (const a of st.animals) if (a.mother !== undefined) kids.set(a.mother, [...(kids.get(a.mother) ?? []), a]);
  const bySpecies = new Map<string, Individual[]>();
  for (const a of st.animals) bySpecies.set(a.species, [...(bySpecies.get(a.species) ?? []), a]);
  INDEX.set(st, bySpecies);
  const motherOf = (a: Individual) => (a.mother !== undefined ? byId.get(a.mother) : undefined);
  for (const a of st.animals) {
    const s = animalSpec(a.species);
    if (stageOfIndividual(a) === "cria" && motherOf(a)) continue; // fed by its mother
    let need = intakeOf(a) * dt;
    // A mother feeds her young (both parents in birds: the mother here carries it).
    for (const y of kids.get(a.id) ?? []) if (!y.dead && stageOfIndividual(y) === "cria") need += intakeOf(y) * dt;
    // Animal prey: up to its allowance; the rest from the banks, plants and carrion.
    const allowance = st.preyAllowance[s.id] ?? {};
    let fromPrey = 0;
    for (const f of s.diet) {
      if (!isAnimal(f.food)) continue;
      const share = Math.min(need * (prefOf(f) / s.diet.reduce((t, g) => t + prefOf(g), 0)), ((allowance[f.food] ?? 0) / 365) * dt * (massOf(a) / s.massKg));
      if (share > 0 && victims(st, f).length) {
        a.debt[f.food] = (a.debt[f.food] ?? 0) + share;
        fromPrey += share;
      }
    }
    split(s.diet.filter((f) => !isAnimal(f.food)), need - fromPrey, (f, kg) => ask(a, f, kg), availOf, intakeOf(a), st.stock, krillReach);
  }

  // 3. Each plant, bank and the carrion share out what can be found.
  const ratio = new Map<string, number>();
  for (const [food, kg] of want) {
    const avail = availOf(food);
    const refuge = food === CARRION.id ? 0 : st.stock[food]! * REFUGE;
    const can = takeable(avail, refuge, dt);
    // Eaters find their food as it is dense: all they want above a third of what the place holds, less below (a
    // type II response; ours). In a bad krill year the swarms stay out of reach of the colonies (Murphy et al. 2007).
    const dense = food === CARRION.id ? 1 : Math.min(1, avail / st.stock[food]! / 0.33);
    const env = food === "kril" ? Math.min(1, st.krillYear) : 1;
    ratio.set(food, kg > 0 ? Math.min(1, can / kg) * dense * env : 1);
  }
  const eaten = new Map<string, Map<string, number>>();
  const got = new Map<string | Individual, number>();
  const asked = new Map<string | Individual, number>();
  for (const q of asks) {
    const r = ratio.get(q.food)!;
    got.set(q.who, (got.get(q.who) ?? 0) + q.kg * r);
    asked.set(q.who, (asked.get(q.who) ?? 0) + q.kg);
    const eater = typeof q.who === "string" ? q.who : q.who.species;
    const m = eaten.get(q.food) ?? new Map<string, number>();
    m.set(eater, (m.get(eater) ?? 0) + q.kg * r);
    eaten.set(q.food, m);
  }
  for (const [food, m] of eaten) {
    const kg = [...m.values()].reduce((t, v) => t + v, 0);
    if (food === CARRION.id) st.carrion = Math.max(0, st.carrion - kg);
    else if (specOf.get(food)!.kind === "planta") st.plants[food] = Math.max(0, st.plants[food]! - kg);
    else takeFromSwarm(st, specOf.get(food) as SwarmSpec, kg);
  }
  const fedSum: Record<string, [number, number]> = {};
  const note = (sp: string, g: number, w: number) => {
    const x = (fedSum[sp] ??= [0, 0]);
    x[0] += g;
    x[1] += w;
  };

  // 4. The banks: they grow by what they ate up to what the place holds (net of natural deaths), lose weight when
  // short of food, and spawn in their season; at its end the young join and the oldest die of old age.
  const kelp = st.plants["kelp"]! / st.stock["kelp"]!;
  for (const s of swarms) {
    const c = st.swarms[s.id]!;
    const fed = (asked.get(s.id) ?? 0) > 0 ? (got.get(s.id) ?? 0) / asked.get(s.id)! : 1;
    note(s.id, fed, 1);
    const K = st.stock[s.id]!;
    // The young fish of the kelp forest are eaten less: it lets more of them grow (ours, how much).
    const nursery = s.habitat === "mar" && s.trophic === 3 && s.id !== "calamar" ? 1 + 0.3 * Math.min(1, kelp) : 1;
    const env = s.variable ? st.krillYear : 1;
    const r = ((2 * s.perYear) / 365) * nursery * env;
    const before = c.kg;
    const growth = r * fed * activity(s, d) * c.kg * (1 - c.kg / K) * dt;
    const starve = ((0.5 * (1 - fed)) / 365) * c.kg * dt;
    c.kg = Math.max(K * REFUGE * 0.5, c.kg + growth - starve);
    if (before > 0 && c.kg < before) c.spawnKg *= c.kg / before;
    if (inWindow(month, s.spawnMonth, s.spawnMonths) && growth > 0) c.spawnKg = Math.min(c.kg * 0.6, c.spawnKg + growth);
    const end = (s.spawnMonth - 1 + s.spawnMonths) % 12 + 1;
    const key = `edad:${s.id}`;
    if (month === end && st.done[key] !== year) {
      st.done[key] = year;
      const { ages, spawn } = swarmCounts(s, c);
      const young = c.spawnKg / cohortMass(s, 0);
      const old = ages[ages.length - 1]!;
      const next = [young, ...ages.slice(0, -1)];
      const total = next.reduce((t, x) => t + x, 0);
      if (total > 0) c.share = next.map((x) => x / total);
      c.spawnKg = 0;
      void spawn;
      st.births[s.id] = (st.births[s.id] ?? 0) + young;
      (st.deaths[s.id] ??= {}).vejez = (st.deaths[s.id]!.vejez ?? 0) + old;
      log(st, { species: s.id, kind: "puesta", n: Math.round(young) }, `${s.name}: ${count(young)} crías nuevas este año${s.variable ? (st.krillYear < 0.6 ? " (año malo)" : st.krillYear > 1.1 ? " (año bueno)" : "") : ""}; mueren de viejos ${count(old)}`);
    }
  }

  // 5. The animals one by one.
  const present = (sp: string) => (bySpecies.get(sp) ?? []).filter((a) => !a.dead);
  for (const a of [...st.animals]) {
    if (a.dead) continue;
    const s = animalSpec(a.species);
    const before = a.age;
    a.age += dt;
    const stage = stageOfIndividual(a);
    const mother = motherOf(a);
    // Fed? The young by its mother; the rest by what it found (animal prey counts as found while its debt is not overdue).
    let fed: number;
    if (stage === "cria" && a.mother !== undefined) fed = mother && !mother.dead ? (st.fed[`#${mother.id}`] ?? 1) : 0;
    else {
      const w = asked.get(a) ?? 0;
      fed = w > 0 ? (got.get(a) ?? 0) / w : 1;
      // Prey it cannot catch is food it does not get.
      if (overdue(st, a, s)) fed *= 0.5;
    }
    st.fed[`#${a.id}`] = fed;
    note(a.species, fed, 1);
    // Fed enough (80 %), it keeps or rebuilds its reserve; short of food, it spends it.
    a.reserve = Math.min(s.fastDays, a.reserve + (fed >= 0.8 ? ((fed - 0.8) / 0.2) * dt : (-(0.8 - fed) / 0.8) * dt));
    if (a.reserve <= 0) {
      kill(st, a, stage === "cria" && (!mother || mother.dead) ? "sin-madre" : "hambre");
      continue;
    }
    // Short of food, a grown animal goes to feed elsewhere (seabirds and seals range far over the ocean; a sheathbill
    // moves to another colony), leaving any young it had to starve: it comes back in a later birth season.
    if (stage !== "cria" && fed < 0.8 && a.reserve < s.fastDays * 0.5) {
      a.dead = "otras";
      if (!s.visitor) st.away[s.id] = (st.away[s.id] ?? 0) + 1;
      log(st, { species: s.id, kind: "se-va", n: 1 }, `Falta comida: ${a.female ? "una" : "un"} ${s.name.toLowerCase()} se va a comer a otra parte`);
      continue;
    }
    // Hunting (off stage, or long overdue): one try a step when it is owed a prey's worth.
    huntIfOwed(st, a, s, !!o.onStage);
    // Old age and the other causes.
    const life = lifespanOf(s);
    if (a.age >= life) {
      kill(st, a, "vejez");
      continue;
    }
    if (stage === "anciano") {
      const old = s.childDays + s.teenDays + s.adultDays * 0.8;
      const hazard = 0.25 + (0.75 * (a.age - old)) / (life - old);
      if (rand(st) < 1 - Math.exp((-hazard / 365) * dt)) {
        kill(st, a, "vejez");
        continue;
      }
    }
    const other = (stage === "cria" ? 1.5 : 0.5) * -Math.log(s.survival);
    if (rand(st) < 1 - Math.exp((-other / 365) * dt)) {
      kill(st, a, "otras");
      continue;
    }
    // Come of age: the young of a full colony leave (natal dispersal).
    if (before < s.childDays && a.age >= s.childDays && present(s.id).length > s.cap) {
      a.dead = "otras";
      log(st, { species: s.id, kind: "se-va", n: 1 }, `Un joven de ${s.name.toLowerCase()} se va a otra colonia (la isla está llena)`);
      continue;
    }
    // Mating in its season (fauna's matingMonth: a gestation before the births), each female on her day of it, with
    // an adult male of hers on the island. On stage the scene's courtships mate them first (`mate`); the chain mates
    // the ones left at the end of the month.
    if (!s.visitor && a.female && a.pregnant === undefined && (stage === "adulto" || stage === "anciano") && month === matingMonth(s) && dayOfMonth(st.day) >= (o.onStage ? 25 : 1 + Math.floor(hashDay(a.id, year + 3) * 27))) {
      const male = present(s.id).find((m) => !m.female && !m.dead && (stageOfIndividual(m) === "adulto" || stageOfIndividual(m) === "anciano"));
      if (male) mate(st, a.id, male.id);
    }
    // Births in their month, each mother on her day of it.
    if (a.pregnant === year && monthOfDay(st.day) === s.birthMonth && dayOfMonth(st.day) >= 1 + Math.floor(hashDay(a.id, year) * 27)) {
      a.pregnant = undefined;
      a.lastBirthYear = year;
      if (a.reserve >= s.fastDays * 0.5 && present(s.id).length < s.cap * 1.5) {
        st.done[`cria:${a.id}`] = year;
        for (let i = 0; i < s.young; i++) st.animals.push({ id: st.nextId++, species: s.id, female: rand(st) < 0.5, age: 0, reserve: s.fastDays, mother: a.id, lastBirthYear: -99, debt: {} });
        st.births[s.id] = (st.births[s.id] ?? 0) + s.young;
        const [one, many] = YOUNG_NAME[s.shape]!;
        log(st, { species: s.id, kind: "nace", n: s.young }, s.young === 1 ? (one === "cría" ? `Nace una cría de ${s.name.toLowerCase()}` : `Nace un pollo de ${s.name.toLowerCase()}`) : `Nacen ${s.young} ${many} de ${s.name.toLowerCase()}`);
      } else log(st, { species: s.id, kind: "muere", n: s.young, cause: "hambre" }, `Una ${s.name.toLowerCase()} pierde la puesta: estaba sin reservas`);
    } else if (a.pregnant !== undefined && a.pregnant < year) a.pregnant = undefined;
  }
  // Visitors come and go; a species with no pair left gets one from another colony (open islands: the rescue effect).
  for (const s of animals) {
    const key = `${s.id}:${year}`;
    if (s.visitor) {
      if (month === s.visitor.arrive && st.done[`llega:${key}`] === undefined) {
        st.done[`llega:${key}`] = 1;
        const n = Math.min(s.visitor.count, s.cap - present(s.id).length);
        for (let i = 0; i < n; i++) st.animals.push({ id: st.nextId++, species: s.id, female: i % 2 === 0, age: s.childDays + s.teenDays + 365 * (1 + i), reserve: s.fastDays, lastBirthYear: -99, debt: {} });
        if (n > 0) log(st, { species: s.id, kind: "llega", n }, `Llegan ${n} ejemplares de ${s.name.toLowerCase()} del Ártico: pasan aquí el verano austral`);
      }
      if (month === s.visitor.leave && st.done[`va:${key}`] === undefined) {
        st.done[`va:${key}`] = 1;
        const here = present(s.id);
        for (const a of here) a.dead = "otras";
        if (here.length) log(st, { species: s.id, kind: "se-va", n: here.length }, `Los ${here.length} ejemplares de ${s.name.toLowerCase()} migran al norte a criar`);
      }
      continue;
    }
    if (month === s.birthMonth && st.done[`rescate:${key}`] === undefined) {
      st.done[`rescate:${key}`] = 1;
      const adults = present(s.id).filter((a) => stageOfIndividual(a) === "adulto");
      const back = Math.min(st.away[s.id] ?? 0, s.cap - present(s.id).length);
      if (back > 0) {
        st.away[s.id]! -= back;
        for (let i = 0; i < back; i++) {
          const b: Individual = { id: st.nextId++, species: s.id, female: i % 2 === 0, age: s.childDays + s.teenDays + 365 * (1 + (i % 3)), reserve: s.fastDays, lastBirthYear: -99, debt: {} };
          st.animals.push(b);
          adults.push(b);
        }
        log(st, { species: s.id, kind: "llega", n: back }, `Vuelven ${back} ${s.name.toLowerCase()} que se fueron a comer a otra parte`);
      }
      for (const female of [true, false])
        if (!adults.some((a) => a.female === female)) {
          st.animals.push({ id: st.nextId++, species: s.id, female, age: s.childDays + s.teenDays + 365, reserve: s.fastDays, lastBirthYear: -99, debt: {} });
          log(st, { species: s.id, kind: "llega", n: 1 }, `Llega ${female ? "una hembra" : "un macho"} de ${s.name.toLowerCase()} de otra colonia`);
        }
    }
  }
  // 6. Carrion rots.
  st.carrion *= Math.exp(-CARRION.rotPerDay * dt);
  for (const [sp, [g, w]] of Object.entries(fedSum)) st.fed[sp] = w > 0 ? g / w : 1;
  st.day += dt;
}

/** Shares `need` kg among `foods` by preference and by how much there is of each (a scarce food is sought less). */
function split(foods: readonly Food[], need: number, to: (food: string, kg: number) => void, availOf: (food: string) => number, daily: number, stock: Record<string, number>, reach: (food: string) => number = () => 1): void {
  if (need <= 0 || !foods.length) return;
  // A food is sought as much as it is there: a bank at a tenth of what the place holds is sought a fifth as much (prey switching).
  const w = foods.map((f) => {
    const a = availOf(f.food);
    const k = stock[f.food];
    return prefOf(f) * (k ? Math.min(1, (2 * a) / k) : a / (a + 5 * Math.max(1e-9, daily))) * (f.food === "kril" ? reach(f.food) : 1);
  });
  const total = w.reduce((t, x) => t + x, 0);
  if (total <= 0) {
    // Nothing anywhere: it still asks (and goes hungry).
    to(foods[0]!.food, need);
    return;
  }
  foods.forEach((f, i) => to(f.food, (need * w[i]!) / total));
}

function takeFromSwarm(st: BiomeState, s: SwarmSpec, kg: number): void {
  const c = st.swarms[s.id]!;
  if (c.kg <= 0) return;
  const f = Math.max(0, 1 - kg / c.kg);
  c.kg *= f;
  c.spawnKg *= f;
}

/** The animals of each species as of the last step (newborns join at the next). */
const INDEX = new WeakMap<BiomeState, Map<string, Individual[]>>();
/** The animals a diet entry can take now: of the species, of its stages. */
function victims(st: BiomeState, f: Food): Individual[] {
  const list = INDEX.get(st)?.get(f.food) ?? st.animals.filter((v) => v.species === f.food);
  return list.filter((v) => !v.dead && (!f.stages || f.stages.includes(stageOfIndividual(v))));
}
/** The mean worth (kg eaten) of the animals of one species and stages it can take now; 0 if there are none. */
function preyWorth(st: BiomeState, f: Food): number {
  const v = victims(st, f);
  return v.length ? v.reduce((t, x) => t + massOf(x) * 0.7, 0) / v.length : 0;
}
/** Owed three or more prey of some kind: it cannot catch what it needs. */
function overdue(st: BiomeState, a: Individual, s: AnimalSpec): boolean {
  return s.diet.some((f) => {
    const w = isAnimal(f.food) ? preyWorth(st, f) : 0;
    return w > 0 && (a.debt[f.food] ?? 0) > 3 * w;
  });
}

/** A hunt by the chain itself (off stage), when it is owed a prey's worth of one kind (on stage, only when three are owed). */
function huntIfOwed(st: BiomeState, a: Individual, s: AnimalSpec, onStage: boolean): void {
  for (const f of s.diet) {
    if (!isAnimal(f.food) || !(a.debt[f.food]! > 0)) continue;
    const list = victims(st, f);
    if (!list.length) {
      a.debt[f.food] = 0;
      continue;
    }
    const worth = preyWorth(st, f);
    if (a.debt[f.food]! < worth * (onStage ? 3 : 1)) continue;
    if (rand(st) >= (s.huntSuccess ?? 0.5)) return;
    // The weakest are caught most: the young and the old (ours).
    const weight = (v: Individual) => ({ cria: 4, joven: 2, adulto: 1, anciano: 2 })[stageOfIndividual(v)];
    const total = list.reduce((t, v) => t + weight(v), 0);
    let r = rand(st) * total;
    let prey = list[0]!;
    for (const v of list)
      if ((r -= weight(v)) < 0) {
        prey = v;
        break;
      }
    huntKill(st, a.id, prey.id);
    return;
  }
}

/** A mating (the chain's or the scene's courtship): she is due in the next birth season, if she is ready (her interval between births). */
export function mate(st: BiomeState, female: number, male: number): boolean {
  const f = st.animals.find((a) => a.id === female && !a.dead && a.female);
  const m = st.animals.find((a) => a.id === male && !a.dead && !a.female);
  if (!f || !m || f.species !== m.species || f.pregnant !== undefined) return false;
  const s = animalSpec(f.species);
  const due = dueYear(st.day, s);
  const last = st.done[`cria:${f.id}`];
  if ((last !== undefined && (due - last) * 12 < s.intervalMonths) || f.reserve < s.fastDays * 0.5) return false;
  f.pregnant = due;
  log(st, { species: s.id, kind: "aparea", n: 1 }, `Se aparea una pareja de ${s.name.toLowerCase()}`);
  return true;
}

/** A kill (the chain's or the scene's chase): the prey dies, the hunter's debt is paid. */
export function huntKill(st: BiomeState, hunter: number, prey: number): boolean {
  const h = st.animals.find((a) => a.id === hunter && !a.dead);
  const p = st.animals.find((a) => a.id === prey && !a.dead);
  if (!h || !p) return false;
  h.debt[p.species] = Math.max(0, (h.debt[p.species] ?? 0) - massOf(p) * 0.7);
  kill(st, p, "depredacion", h.species);
  return true;
}

/** How hungry an animal is, 0–1 (the scene gives it to fauna's Ecosystem as its hunger). */
export function hungerOf(st: BiomeState, a: Individual): number {
  const s = animalSpec(a.species);
  let owed = 0;
  for (const f of s.diet) {
    const w = isAnimal(f.food) ? preyWorth(st, f) : 0;
    if (w > 0) owed = Math.max(owed, Math.min(1, (a.debt[f.food] ?? 0) / w));
  }
  return Math.max(owed * 0.9, 1 - a.reserve / s.fastDays);
}

/** Its young that are with it now. */
export const youngOf = (st: BiomeState, a: Individual): Individual[] => st.animals.filter((y) => y.mother === a.id && !y.dead && stageOfIndividual(y) === "cria");

// ── The census (the research hut's board) ─────────────────────────────────────────────────────────────────────────
export interface CensusRow {
  readonly id: string;
  readonly name: string;
  readonly latin: string;
  readonly kind: BiomeSpec["kind"];
  /** Individuals (plants: none). */
  readonly count: number;
  readonly stages: Readonly<Record<Stage, number>>;
  readonly kg: number;
  /** Share of the most the place holds (plants and banks). */
  readonly cover?: number;
  readonly eats: readonly string[];
  readonly eatenBy: readonly string[];
  readonly fed: number;
  readonly births: number;
  readonly deaths: Readonly<Partial<Record<Cause, number>>>;
  readonly note?: string;
}

const eatersOf = (food: string) => BIOME.filter((s) => s.kind !== "planta" && s.diet.some((f) => f.food === food)).map((s) => s.name);

export function census(st: BiomeState): CensusRow[] {
  const month = monthOfDay(st.day);
  const rows: CensusRow[] = [];
  for (const s of BIOME) {
    const base = { id: s.id, name: s.name, latin: s.latin, kind: s.kind, eatenBy: eatersOf(s.id), fed: st.fed[s.id] ?? 1, births: Math.round(st.births[s.id] ?? 0), deaths: st.deaths[s.id] ?? {} };
    if (s.kind === "planta") {
      const f = growthFactor(s, dayOfYear(st.day));
      rows.push({ ...base, count: 0, stages: { cria: 0, joven: 0, adulto: 0, anciano: 0 }, kg: st.plants[s.id]!, cover: st.plants[s.id]! / st.stock[s.id]!, eats: [], note: f > 0.05 ? "creciendo" : "en reposo (frío u oscuridad)" });
    } else if (s.kind === "banco") {
      const c = st.swarms[s.id]!;
      const { ages, spawn } = swarmCounts(s, c);
      const stages = { cria: spawn, joven: 0, adulto: 0, anciano: 0 };
      ages.forEach((n, a) => {
        const k: Stage = a < s.matureYears ? "joven" : a === ages.length - 1 && ages.length > s.matureYears + 1 ? "anciano" : "adulto";
        stages[k] += n;
      });
      const kg = swarmKg(s, c);
      rows.push({ ...base, count: Object.values(stages).reduce((t, v) => t + v, 0), stages, kg, cover: kg / st.stock[s.id]!, eats: s.diet.map((f) => nameOf(f.food)), note: inWindow(month, s.spawnMonth, s.spawnMonths) ? "en época de puesta" : undefined });
    } else {
      const here = st.animals.filter((a) => a.species === s.id && !a.dead);
      const stages = { cria: 0, joven: 0, adulto: 0, anciano: 0 };
      for (const a of here) stages[stageOfIndividual(a)]++;
      const away = s.visitor && !here.length ? "fuera: cría en el Ártico" : st.away[s.id] ? `${st.away[s.id]} comiendo en otra parte; vuelven en su época de cría` : undefined;
      rows.push({ ...base, count: here.length, stages, kg: here.reduce((t, a) => t + massOf(a), 0), eats: s.diet.map((f) => nameOf(f.food) + (f.stages ? ` (${f.stages.map((x) => STAGE_LABEL[x]).join(", ")})` : "")), note: away ?? (month === s.birthMonth ? "en época de crías" : undefined) });
    }
  }
  return rows;
}

/** «1,2 millones», «3 400», «12». */
export function count(n: number): string {
  if (n >= 1e6) return `${(Math.round(n / 1e5) / 10).toLocaleString("es-ES")} millones`;
  if (n >= 1e4) return `${Math.round(n / 1000).toLocaleString("es-ES")} mil`;
  return Math.round(n).toLocaleString("es-ES");
}
