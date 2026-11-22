/**
 * How many animals of each species live in sanctuary 1: Cold Sanctuary's PopulationPlan (Assets/Scripts/World/
 * PopulationPlan.cs), ported as is. K animals per human (3), shared out by trophic level (70 % prey, 22 % meso,
 * 8 % apex) and, inside a level, by each species' weight per human; every species keeps its minimum viable group
 * and the sum is exact. Cold Sanctuary then lets its food chain nudge the prey; that live step is not ported.
 */
export type Trophic = "presa" | "meso" | "apice";

/** Cold Sanctuary's K (3); sanctuary 1 asks for 4 by default (Berón 2026-11-22), a setting («Animales por persona»). */
export const ANIMALS_PER_HUMAN = 3;
export const LEVEL_SHARE: Readonly<Record<Trophic, number>> = { presa: 0.7, meso: 0.22, apice: 0.08 };

export const PER_HUMAN: Readonly<Record<string, number>> = {
  Bear: 0.3, Penguin: 1.2, Seal: 0.6, Whale: 0.2, Orca: 0.1, Wolf: 0.3,
  SnowPetrel: 0.55, Walrus: 0.3, EmperorPenguin: 0.8, Reindeer: 0.6, MuskOx: 0.3, ArcticHare: 0.5, ArcticFox: 0.2,
};

/** Family groups of each species in the scene (PopulationPlan.Groups). */
export const GROUPS: Readonly<Record<string, number>> = {
  Bear: 1, Seal: 3, Whale: 2, Penguin: 2, Orca: 1, SnowPetrel: 1, Walrus: 2, EmperorPenguin: 2, Reindeer: 2, MuskOx: 1, ArcticHare: 2, ArcticFox: 1, Wolf: 1,
};

const LEVEL: Readonly<Record<string, Trophic>> = {
  Penguin: "presa", EmperorPenguin: "presa", SnowPetrel: "presa", Reindeer: "presa", MuskOx: "presa", ArcticHare: "presa",
  Seal: "meso", Walrus: "meso", Whale: "meso", ArcticFox: "meso",
  Bear: "apice", Wolf: "apice", Orca: "apice",
};

const MIN_VIABLE: Readonly<Record<string, number>> = { ArcticFox: 4 };

export const levelOf = (s: string): Trophic => LEVEL[s] ?? "meso";
const minOf = (s: string): number => MIN_VIABLE[s] ?? 2;
const weight = (s: string): number => Math.max(0.01, PER_HUMAN[s] ?? 0.2);
const sum = (l: readonly string[], f: (s: string) => number) => l.reduce((a, s) => a + f(s), 0);
const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Each species' share (they add up to 1): its level's, split inside the level by weight. A missing level's share goes to the rest. */
export function shares(species: readonly string[]): Map<string, number> {
  const w = new Map<Trophic, number>();
  for (const s of species) w.set(levelOf(s), (w.get(levelOf(s)) ?? 0) + weight(s));
  let levels = 0;
  for (const t of w.keys()) levels += LEVEL_SHARE[t];
  const r = new Map<string, number>();
  for (const s of species) {
    const lw = w.get(levelOf(s)) ?? 0;
    r.set(s, lw > 0 && levels > 0 ? ((LEVEL_SHARE[levelOf(s)] / levels) * weight(s)) / lw : 0);
  }
  return r;
}

/** Shares `total` animals out (PopulationPlan.Allocate): minimum viable groups, exact sum; if the minimums don't fit, the rarest predators go first. */
export function allocate(total: number, species: readonly string[]): { counts: Map<string, number>; dropped: string[] } {
  let list = [...species];
  const dropped: string[] = [];
  let sh = shares(list);
  const predators = list
    .filter((s) => levelOf(s) !== "presa")
    .sort((a, b) => (levelOf(a) === "apice" ? 0 : 1) - (levelOf(b) === "apice" ? 0 : 1) || sh.get(a)! - sh.get(b)! || byName(a, b));
  while (sum(list, minOf) > total && predators.length) {
    const gone = predators.shift()!;
    list = list.filter((s) => s !== gone);
    dropped.push(gone);
  }
  const r = new Map<string, number>();
  for (const s of dropped) r.set(s, 0);
  if (!list.length || sum(list, minOf) > total) {
    for (const s of list) r.set(s, 0);
    return { counts: r, dropped };
  }
  sh = shares(list);
  for (const s of list) r.set(s, Math.max(minOf(s), Math.floor(sh.get(s)! * total)));
  const tot = () => sum(list, (s) => r.get(s)!);
  for (let g = 0; g < 1000 && tot() > total; g++) {
    const s = list.filter((x) => r.get(x)! > minOf(x)).sort((a, b) => r.get(b)! - sh.get(b)! * total - (r.get(a)! - sh.get(a)! * total))[0];
    if (!s) break;
    r.set(s, r.get(s)! - 1);
  }
  for (let g = 0; g < 1000 && tot() < total; g++) {
    const s = [...list].sort((a, b) => sh.get(b)! * total - r.get(b)! - (sh.get(a)! * total - r.get(a)!) || byName(a, b))[0]!;
    r.set(s, r.get(s)! + 1);
  }
  return { counts: r, dropped };
}

/** The plan of sanctuary 1 for `humans` people, `k` animals each: species → individuals. */
export function plan(humans: number, k = ANIMALS_PER_HUMAN): Map<string, number> {
  return allocate(Math.max(0, k * humans), Object.keys(GROUPS)).counts;
}

/** `n` animals into `groups` families: the first ones one more if it is not exact (PopulationPlan.Split). */
export function split(n: number, groups: number): number[] {
  const g = Math.max(1, groups);
  return Array.from({ length: g }, (_, i) => Math.floor(n / g) + (i < n % g ? 1 : 0));
}
