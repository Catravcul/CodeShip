import type { AnimalSpec } from "../data/bioma";
import { DENSITY, type CrowdSpec } from "../data/bioma-crowd";
import { dayOfYear, dormantIn, monthOfDay, stageOfIndividual, type BiomeState } from "./bioma";

/**
 * THE CROWD THE CHAIN STANDS FOR (docs/design/bioma-s3.md §Multitudes): how many adults, young, nests and eggs are
 * drawn around the few the food chain lives one by one, by its `perAdult` scale factor (licencia), the share in view
 * that month, the species' sleep (marmots underground from September to April), and its breeding calendar (its real
 * birth month, incubation and nestling days). Any biome: the species come from the chain's own `BiomeDef`. Pure: the
 * scene places them (adapters/three/s3-biome-crowd.ts).
 */
export type NestPhase = "sin-nidos" | "nidos" | "huevos" | "pollos";

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
/** Days the nest stands built before the first egg (ours: some two weeks of carrying sticks or lining a crevice). */
const BUILD_DAYS = 14;

/** Day of year the young hatch or are born (mid birth month). */
export const hatchDoy = (s: AnimalSpec): number => MONTH_START[s.birthMonth - 1]! + 15;

/**
 * Where a nesting bird is in its year on day-of-year `doy`: building the nest, on eggs (its real incubation, the
 * chain's `gestationMonths`), with chicks in the nest (its `childDays`), or none.
 */
export function nestPhase(s: AnimalSpec, doy: number): NestPhase {
  const lay = -s.gestationMonths * 30.4;
  const from = lay - BUILD_DAYS;
  const d = ((((doy - hatchDoy(s) - from) % 365) + 365) % 365) + from;
  if (d < lay) return "nidos";
  if (d < 0) return "huevos";
  if (d < s.childDays) return "pollos";
  return "sin-nidos";
}

export interface CrowdCounts {
  readonly adults: number;
  readonly young: number;
  /** Nests with eggs, and the eggs in them. */
  readonly broodNests: number;
  readonly eggs: number;
  /** Nests (or burrows) standing. */
  readonly nests: number;
  readonly phase: NestPhase;
  /** Asleep underground: none in view, only their burrows. */
  readonly asleep: boolean;
}

/** The species of a crowd in the chain's biome. */
export const crowdSpecies = (st: BiomeState, c: CrowdSpec): AnimalSpec | undefined => st.def.species.find((s): s is AnimalSpec => s.kind === "animal" && s.id === c.species);

/** What crowd `c` draws now: the chain's adults, young and sitting females, each × `perAdult`. */
export function crowdCounts(st: BiomeState, c: CrowdSpec): CrowdCounts {
  const s = crowdSpecies(st, c);
  const none = { adults: 0, young: 0, broodNests: 0, eggs: 0, nests: 0, phase: "sin-nidos" as const, asleep: false };
  if (!s) return none;
  let adults = 0;
  let young = 0;
  let sitting = 0;
  for (const a of st.animals) {
    if (a.species !== c.species || a.dead) continue;
    if (stageOfIndividual(a) === "cria") young++;
    else {
      adults++;
      if (a.female && a.pregnant !== undefined) sitting++;
    }
  }
  const start = st.def.startDayOfYear;
  const month = monthOfDay(st.day, start);
  const doy = dayOfYear(st.day, start);
  const asleep = dormantIn(s, month);
  const here = asleep ? 0 : (c.here[month - 1] ?? 1);
  const A = Math.round(adults * c.perAdult * here);
  const Y = asleep ? 0 : Math.round(young * c.perAdult);
  if (c.nest === "madriguera") {
    // The burrows stand all year (three to a family of up to seven: real), whether they sleep in them or not.
    const fam = DENSITY.marmotFamily.value;
    return { ...none, adults: A, young: Y, nests: Math.ceil((adults * c.perAdult * fam.burrows) / fam.adults), asleep };
  }
  if (!c.nest) return { ...none, adults: A, young: Y, asleep };
  const phase = nestPhase(s, doy);
  const clutch = Math.max(1, s.young);
  const broodNests = phase === "sin-nidos" ? 0 : Math.round(sitting * c.perAdult);
  const chickNests = phase === "pollos" ? Math.ceil(Y / clutch) : 0;
  const building = phase === "nidos" ? Math.round(A / 2) : 0;
  const nests = Math.max(broodNests + chickNests, building);
  return { adults: A, young: Y, broodNests, eggs: broodNests * clutch, nests, phase, asleep };
}
