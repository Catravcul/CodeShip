import type { Rect } from "./walk";

/**
 * A WAY ACROSS A FURNISHED FLOOR (docs/design/montana-hueca.md §Edificios): sanctuary 1's floors, migrated into the
 * mountain of sanctuary 3, are full of furniture, so the «Ir» graph cannot join two points of a floor with a straight
 * line. This finds a way on a grid over the floor (`cell` m), round the things in the way (each grown by half a body),
 * and keeps only its corners: straight stretches that cross nothing. Pure: the floor's rectangles and the things are
 * given.
 */
export interface FloorWayOptions {
  /** Grid step, m. */
  readonly cell?: number;
  /** Half a body: how far the way keeps from each thing, m. */
  readonly body?: number;
  /** If `to` cannot be stood on (it is a thing's middle), end at the nearest free spot within this many m of it. */
  readonly near?: number;
}

type P = { readonly x: number; readonly z: number };

export function floorWay(floors: readonly Rect[], things: readonly Rect[], from: P, to: P, o: FloorWayOptions = {}): P[] | undefined {
  const c = o.cell ?? 0.5;
  const r = o.body ?? 0.4;
  if (!floors.length) return undefined;
  const x0 = Math.min(...floors.map((f) => f.x0));
  const z0 = Math.min(...floors.map((f) => f.z0));
  const nx = Math.ceil((Math.max(...floors.map((f) => f.x1)) - x0) / c);
  const nz = Math.ceil((Math.max(...floors.map((f) => f.z1)) - z0) / c);
  if (nx <= 0 || nz <= 0 || nx * nz > 4e6) return undefined;
  const open = new Uint8Array(nx * nz);
  const cx = (i: number) => x0 + (i + 0.5) * c;
  const cz = (k: number) => z0 + (k + 0.5) * c;
  // A cell is open if its middle is on a floor, a body's half in from the floor's outer edge (not across the seam of two).
  for (const f of floors) {
    for (let i = Math.max(0, Math.floor((f.x0 - x0) / c)); i < Math.min(nx, Math.ceil((f.x1 - x0) / c)); i++)
      for (let k = Math.max(0, Math.floor((f.z0 - z0) / c)); k < Math.min(nz, Math.ceil((f.z1 - z0) / c)); k++) {
        const x = cx(i);
        const z = cz(k);
        if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) open[i * nz + k] = 1;
      }
  }
  const onFloor = (x: number, z: number) => floors.some((f) => x >= f.x0 - 1e-6 && x <= f.x1 + 1e-6 && z >= f.z0 - 1e-6 && z <= f.z1 + 1e-6);
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      const q = i * nz + k;
      if (!open[q]) continue;
      const x = cx(i);
      const z = cz(k);
      if (!onFloor(x - r, z) || !onFloor(x + r, z) || !onFloor(x, z - r) || !onFloor(x, z + r)) open[q] = 0;
    }
  for (const t of things)
    for (let i = Math.max(0, Math.floor((t.x0 - r - x0) / c)); i < Math.min(nx, Math.ceil((t.x1 + r - x0) / c)); i++)
      for (let k = Math.max(0, Math.floor((t.z0 - r - z0) / c)); k < Math.min(nz, Math.ceil((t.z1 + r - z0) / c)); k++) {
        const x = cx(i);
        const z = cz(k);
        if (x > t.x0 - r && x < t.x1 + r && z > t.z0 - r && z < t.z1 + r) open[i * nz + k] = 0;
      }
  const cellOf = (p: P) => ({ i: Math.min(nx - 1, Math.max(0, Math.floor((p.x - x0) / c))), k: Math.min(nz - 1, Math.max(0, Math.floor((p.z - z0) / c))) });
  /** The open cell nearest to a point (within `max` m), or none. */
  const nearestOpen = (p: P, max: number): number | undefined => {
    const { i, k } = cellOf(p);
    const R = Math.ceil(max / c);
    let best: number | undefined;
    let bd = Infinity;
    for (let a = Math.max(0, i - R); a <= Math.min(nx - 1, i + R); a++)
      for (let b = Math.max(0, k - R); b <= Math.min(nz - 1, k + R); b++) {
        if (!open[a * nz + b]) continue;
        const d = Math.hypot(cx(a) - p.x, cz(b) - p.z);
        if (d < bd && d <= max) [best, bd] = [a * nz + b, d];
      }
    return best;
  };
  const start = nearestOpen(from, 1.5);
  if (start === undefined) return undefined;
  // Breadth first over the 8 neighbours (a diagonal only where both its sides are open).
  const prev = new Int32Array(nx * nz).fill(-1);
  prev[start] = start;
  const queue = new Int32Array(nx * nz);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  const goal = to;
  const exact = cellOf(goal);
  const exactId = exact.i * nz + exact.k;
  let end: number | undefined;
  while (head < tail) {
    const q = queue[head++]!;
    if (q === exactId) {
      end = q;
      break;
    }
    const i = Math.floor(q / nz);
    const k = q % nz;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const a = i + di;
      const b = k + dk;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const n = a * nz + b;
      if (!open[n] || prev[n] !== -1) continue;
      if (di && dk && (!open[(i + di) * nz + k] || !open[i * nz + k + dk])) continue;
      prev[n] = q;
      queue[tail++] = n;
    }
  }
  if (end === undefined) {
    // The goal is not open (a thing's middle): the reached cell nearest to it, within `near` m.
    if (!o.near) return undefined;
    let bd = Infinity;
    for (let j = 0; j < tail; j++) {
      const q = queue[j]!;
      const d = Math.hypot(cx(Math.floor(q / nz)) - goal.x, cz(q % nz) - goal.z);
      if (d < bd) [end, bd] = [q, d];
    }
    if (end === undefined || bd > o.near) return undefined;
  }
  const cells: number[] = [];
  for (let q = end; ; q = prev[q]!) {
    cells.unshift(q);
    if (q === start) break;
  }
  const pt = (q: number): P => ({ x: cx(Math.floor(q / nz)), z: cz(q % nz) });
  // Line of sight over open cells (every quarter cell), to keep only the corners.
  const clear = (a: P, b: P) => {
    const n = Math.max(1, Math.ceil((Math.hypot(b.x - a.x, b.z - a.z) / c) * 4));
    for (let j = 0; j <= n; j++) {
      const { i, k } = cellOf({ x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n });
      if (!open[i * nz + k]) return false;
    }
    return true;
  };
  const first = pt(cells[0]!);
  const last = end === exactId && open[exactId] ? goal : pt(cells[cells.length - 1]!);
  const pts: P[] = [first];
  let at = 0;
  const raw = [...cells.map(pt).slice(0, -1), last];
  while (at < raw.length - 1) {
    let j = raw.length - 1;
    while (j > at + 1 && !clear(raw[at]!, raw[j]!)) j--;
    pts.push(raw[j]!);
    at = j;
  }
  // Its start: the given point itself when it stands on an open cell (else the cell next to it).
  const fc = cellOf(from);
  if (open[fc.i * nz + fc.k] && clear(from, pts[1] ?? first)) pts[0] = from;
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1]!.x, p.z - pts[i - 1]!.z) > 1e-6);
}
