/**
 * Travel between the islands of sanctuary 3 (Berón, 2026-11-18): from each island's navigation machine, by a flight
 * that is seen (reglas.md §3: no teleport by default). Each island lets in what lands there: the training island and
 * the crew pad are real and take the helicopter; Cold Sanctuary's caps keep their flying carpets (fiction); the
 * aerial dock takes both. A trip is the fewest legs from pad to pad, each one flown by a vehicle both ends take.
 */
export type Craft = "helicoptero" | "alfombra";

export interface IslandPad {
  readonly island: string;
  /** Where the craft lands, m (plan x, z; y the deck). */
  readonly at: { readonly x: number; readonly y: number; readonly z: number };
  readonly crafts: readonly Craft[];
}

export interface CraftSpec {
  /** Cruise speed, m/s. */
  readonly cruiseMs: number;
  /** Take-off and climb to cruise height, and descent and landing, s each. */
  readonly climbS: number;
  /** Cruise height above the higher of the two pads, m. */
  readonly cruiseAboveM: number;
  /** A fixed time for a leg instead of the distance (Cold Sanctuary's carpet: 30 s), s. */
  readonly fixedS?: number;
}

export interface Leg {
  readonly from: string;
  readonly to: string;
  readonly craft: Craft;
  readonly a: IslandPad["at"];
  readonly b: IslandPad["at"];
  readonly distanceM: number;
  readonly seconds: number;
}

const flat = (a: IslandPad["at"], b: IslandPad["at"]) => Math.hypot(b.x - a.x, b.z - a.z);

export function legSeconds(distanceM: number, c: CraftSpec): number {
  return c.fixedS ?? 2 * c.climbS + distanceM / c.cruiseMs;
}

/** The legs from one island to another (fewest legs, then the shortest time); none if no craft links them. */
export function planTrip(from: string, to: string, pads: readonly IslandPad[], crafts: Readonly<Record<Craft, CraftSpec>>): Leg[] | undefined {
  if (from === to) return [];
  const byId = new Map(pads.map((p) => [p.island, p]));
  if (!byId.has(from) || !byId.has(to)) return undefined;
  // Dijkstra on (legs, seconds).
  const best = new Map<string, { legs: number; s: number; path: Leg[] }>([[from, { legs: 0, s: 0, path: [] }]]);
  const open = [from];
  const done = new Set<string>();
  while (open.length) {
    open.sort((a, b) => best.get(a)!.legs - best.get(b)!.legs || best.get(a)!.s - best.get(b)!.s);
    const u = open.shift()!;
    if (done.has(u)) continue;
    done.add(u);
    if (u === to) return best.get(u)!.path;
    const pu = byId.get(u)!;
    for (const pv of pads) {
      if (pv.island === u || done.has(pv.island)) continue;
      const craft = pu.crafts.find((c) => pv.crafts.includes(c));
      if (!craft) continue;
      const d = flat(pu.at, pv.at);
      const leg: Leg = { from: u, to: pv.island, craft, a: pu.at, b: pv.at, distanceM: d, seconds: legSeconds(d, crafts[craft]) };
      const cur = best.get(u)!;
      const next = { legs: cur.legs + 1, s: cur.s + leg.seconds, path: [...cur.path, leg] };
      const old = best.get(pv.island);
      if (!old || next.legs < old.legs || (next.legs === old.legs && next.s < old.s)) {
        best.set(pv.island, next);
        open.push(pv.island);
      }
    }
  }
  return undefined;
}

export const tripSeconds = (legs: readonly Leg[]): number => legs.reduce((s, l) => s + l.seconds, 0);

/** Where the craft is `t` s into a leg: it climbs, cruises in a straight line and comes down. Heading in radians (atan2 x, z). */
export function legPose(leg: Leg, t: number, c: CraftSpec): { x: number; y: number; z: number; heading: number; phase: "despegue" | "crucero" | "aterrizaje" | "llegada" } {
  const total = leg.seconds;
  const tc = Math.max(0, Math.min(total, t));
  const climb = Math.min(c.climbS, total / 3);
  const cruiseY = Math.max(leg.a.y, leg.b.y) + c.cruiseAboveM;
  const heading = Math.atan2(leg.b.x - leg.a.x, leg.b.z - leg.a.z);
  const ease = (u: number) => u * u * (3 - 2 * u);
  if (tc >= total) return { ...leg.b, heading, phase: "llegada" };
  if (tc < climb) return { x: leg.a.x, y: leg.a.y + (cruiseY - leg.a.y) * ease(tc / climb), z: leg.a.z, heading, phase: "despegue" };
  if (tc > total - climb) {
    const u = (total - tc) / climb;
    return { x: leg.b.x, y: leg.b.y + (cruiseY - leg.b.y) * ease(u), z: leg.b.z, heading, phase: "aterrizaje" };
  }
  const u = ease((tc - climb) / Math.max(1e-6, total - 2 * climb));
  return { x: leg.a.x + (leg.b.x - leg.a.x) * u, y: cruiseY, z: leg.a.z + (leg.b.z - leg.a.z) * u, heading, phase: "crucero" };
}

/**
 * A worker's trip each way, as a number (Cold Sanctuary's AereoRule.TripSeconds): the flight and, if the work is up
 * a tree, the lift. Kept for the trainers' schedules (a hook: they come in a later branch).
 */
export function workerTripSeconds(flightS: number, liftS: number | undefined): number {
  return flightS + (liftS ?? 0);
}
