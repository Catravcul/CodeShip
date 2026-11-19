import type { AnimalSpec } from "../data/bioma";
import { BIOME } from "../data/bioma";
import { MOULT, type CrowdSpec } from "../data/bioma-crowd";
import { dayOfYear, monthOfDay, stageOfIndividual, type BiomeState } from "./bioma";

/**
 * THE CROWD THE CHAIN STANDS FOR (docs/design/bioma-s3.md §Multitudes): how many adults, young, nests and eggs are
 * drawn around the few the food chain lives one by one, by its `perAdult` scale factor (licencia), the share ashore
 * that month, the breeding calendar of the species (its real birth month, incubation and nestling days) and its moult.
 * Pure: the scene places them (adapters/three/s3-biome-crowd.ts).
 */
export type NestPhase = "sin-nidos" | "nidos" | "huevos" | "pollos";

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
/** Days the nest stands built before the first egg (ours: gentoos gather pebbles some two weeks). */
const BUILD_DAYS = 14;

const specOf = new Map(BIOME.filter((s): s is AnimalSpec => s.kind === "animal").map((s) => [s.id, s]));

/** Day of year the young hatch or are born (mid birth month). */
export const hatchDoy = (s: AnimalSpec): number => MONTH_START[s.birthMonth - 1]! + 15;

/**
 * Where a nesting bird is in its year on day-of-year `doy`: building the nest, on eggs (its real incubation, the
 * chain's `gestationMonths`), with chicks in the nest (its `childDays`: the albatross chick sits through the winter),
 * or none.
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

/** Share of the adults in moult on day-of-year `doy` (gentoo: 25 days once the chicks fledge; elephant seal: by month). */
export function moultShare(species: string, doy: number): number {
  if (species === "papua") {
    const s = specOf.get("papua")!;
    const d = (((doy - hatchDoy(s) - s.childDays) % 365) + 365) % 365;
    return d < MOULT.papua.value.days ? 0.85 : 0;
  }
  if (species === "elefante") {
    let m = 11;
    while (MONTH_START[m]! > doy) m--;
    return MOULT.elefante.value[m]!;
  }
  return 0;
}

export interface CrowdCounts {
  readonly adults: number;
  readonly young: number;
  /** Nests with eggs, and the eggs in them. */
  readonly broodNests: number;
  readonly eggs: number;
  /** Nests standing (with eggs, with chicks, or being built). */
  readonly nests: number;
  readonly phase: NestPhase;
  /** Share of the adults moulting. */
  readonly moult: number;
}

/** What crowd `c` draws now: the chain's adults, young and sitting females, each × `perAdult`. */
export function crowdCounts(st: BiomeState, c: CrowdSpec): CrowdCounts {
  const s = specOf.get(c.species)!;
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
  const doy = dayOfYear(st.day);
  const ashore = c.ashore[monthOfDay(st.day) - 1] ?? 1;
  const A = Math.round(adults * c.perAdult * ashore);
  const Y = Math.round(young * c.perAdult);
  if (!c.nest) return { adults: A, young: Y, broodNests: 0, eggs: 0, nests: 0, phase: "sin-nidos", moult: moultShare(c.species, doy) };
  const phase = nestPhase(s, doy);
  const clutch = Math.max(1, s.young);
  const broodNests = phase === "sin-nidos" ? 0 : Math.round(sitting * c.perAdult);
  const chickNests = phase === "pollos" ? Math.ceil(Y / clutch) : 0;
  const building = phase === "nidos" ? Math.round(A / 2) : 0;
  const nests = Math.max(broodNests + chickNests, building);
  return { adults: A, young: Y, broodNests, eggs: broodNests * clutch, nests, phase, moult: moultShare(c.species, doy) };
}
