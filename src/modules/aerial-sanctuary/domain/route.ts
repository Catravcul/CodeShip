/**
 * The way she walks by herself (the task list's and Áreas' «Ir» in «Viaje»; reglas.md §3.1): points of an island
 * joined by the paths between them, through doorways and by the trunk lift. The shortest way is found on that graph
 * and walked in straight lines; a lift edge is ridden, not walked.
 */
export interface WayPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The lift stop it is, if any (its lift and stop index). */
  readonly lift?: { readonly id: string; readonly stop: number };
  /** The carpet station it is the pad of, if any (two stations linked are flown between, not walked). */
  readonly carpet?: string;
}

export interface WayGraph {
  readonly points: readonly WayPoint[];
  readonly links: readonly (readonly [string, string])[];
}

/** A link's cost, m: its length, and a lift ride counted by height (it is quicker than walking it). */
function cost(a: WayPoint, b: WayPoint): number {
  if (a.lift && b.lift && a.lift.id === b.lift.id) return 10 + Math.abs(b.y - a.y) * 0.2;
  // A carpet flight: boarding and the flight, quicker than walking the same distance.
  if (a.carpet && b.carpet) return 15 + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) * 0.15;
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function shortestWay(g: WayGraph, from: string, to: string): WayPoint[] | undefined {
  const byId = new Map(g.points.map((p) => [p.id, p]));
  if (!byId.has(from) || !byId.has(to)) return undefined;
  const adj = new Map<string, string[]>();
  for (const [a, b] of g.links) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set([from]);
  while (open.size) {
    let u = "";
    let best = Infinity;
    for (const o of open) if (dist.get(o)! < best) [u, best] = [o, dist.get(o)!];
    open.delete(u);
    if (u === to) break;
    for (const v of adj.get(u) ?? []) {
      const d = best + cost(byId.get(u)!, byId.get(v)!);
      if (d < (dist.get(v) ?? Infinity)) {
        dist.set(v, d);
        prev.set(v, u);
        open.add(v);
      }
    }
  }
  if (!dist.has(to)) return undefined;
  const path: WayPoint[] = [];
  for (let c: string | undefined = to; c; c = prev.get(c)) path.unshift(byId.get(c)!);
  return path;
}

/** The point of the graph nearest to her on the plan, among those within `dy` m of her height. */
export function nearestPoint(g: WayGraph, p: { x: number; y: number; z: number }, dy = 3): WayPoint | undefined {
  let best: WayPoint | undefined;
  let bd = Infinity;
  for (const q of g.points) {
    if (Math.abs(q.y - p.y) > dy) continue;
    const d = Math.hypot(q.x - p.x, q.z - p.z);
    if (d < bd) [best, bd] = [q, d];
  }
  return best;
}

/** Every point reachable from `from` (to check that each area can be walked to). */
export function reachable(g: WayGraph, from: string): Set<string> {
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const u = q.shift()!;
    for (const [a, b] of g.links) {
      const v = a === u ? b : b === u ? a : undefined;
      if (v && !seen.has(v)) {
        seen.add(v);
        q.push(v);
      }
    }
  }
  return seen;
}
