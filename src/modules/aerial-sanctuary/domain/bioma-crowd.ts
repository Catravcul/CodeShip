import type { AnimalSpec } from "../data/bioma";
import type { CrowdSpec } from "../data/bioma-crowd";
import { dormantIn, monthOfDay, stageOfIndividual, type BiomeState } from "./bioma";

/**
 * THE COLONIES THE CHAIN STANDS FOR (docs/design/bioma-s3.md §Colonias): how many workers and nests are drawn around
 * the colonies the food chain lives one by one (each by its queen), by its `perAdult` scale factor (licencia), the share
 * out that month and the colony's winter (none out while it overwinters; a bumblebee's or a hornet's nest is gone with
 * the old colony, a hive or an ant mound stands all year). Any biome: the species come from the chain's own
 * `BiomeDef`. Pure: the scene places them (adapters/three/s3-biome-crowd.ts). `nestPhase` (a bird's year on its nest)
 * stays for any biome with birds.
 */
export type NestPhase = "sin-nidos" | "nidos" | "huevos" | "pollos";

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const BUILD_DAYS = 14;

/** Day of year the young hatch or are born (mid birth month). */
export const hatchDoy = (s: AnimalSpec): number => MONTH_START[s.birthMonth - 1]! + 15;

/** Where a nesting bird is in its year on day-of-year `doy`: building, on eggs, with chicks, or none. */
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
  /** Workers out now. */
  readonly adults: number;
  readonly young: number;
  readonly broodNests: number;
  readonly eggs: number;
  /** Nests (hives, mounds) standing. */
  readonly nests: number;
  readonly phase: NestPhase;
  /** The colony overwinters: no worker out. */
  readonly asleep: boolean;
}

/** The species of a crowd in the chain's biome. */
export const crowdSpecies = (st: BiomeState, c: CrowdSpec): AnimalSpec | undefined => st.def.species.find((s): s is AnimalSpec => s.kind === "animal" && s.id === c.species);

/** What colony crowd `c` draws now: a nest for each grown one of the chain, its workers × `perAdult` out. */
export function crowdCounts(st: BiomeState, c: CrowdSpec): CrowdCounts {
  const s = crowdSpecies(st, c);
  const none = { adults: 0, young: 0, broodNests: 0, eggs: 0, nests: 0, phase: "sin-nidos" as const, asleep: false };
  if (!s) return none;
  let colonies = 0;
  for (const a of st.animals) if (a.species === c.species && !a.dead && a.female && stageOfIndividual(a) !== "cria" && stageOfIndividual(a) !== "joven") colonies++;
  const month = monthOfDay(st.day, st.def.startDayOfYear);
  const asleep = dormantIn(s, month);
  const here = asleep ? 0 : (c.here[month - 1] ?? 1);
  return { ...none, adults: Math.round(colonies * c.perAdult * here), nests: asleep && !c.perennial ? 0 : colonies, asleep };
}
