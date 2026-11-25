/**
 * Plane geometry for the glyphs' strokes (docs/design/retos-trazos.md): points, polylines, arcs, resampling and
 * distances. Glyph boxes are in em units, y down: 0 is the top of a capital, 1 the baseline (lowercase x-height at
 * 0,42, descenders to 1,32). The same functions work in screen pixels.
 */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const pt = (x: number, y: number): Pt => ({ x, y });

/**
 * Points of an elliptic arc round (cx, cy), angles in degrees with 0 to the right and 90 down (y down): growing angles
 * turn clockwise on screen, shrinking ones counterclockwise. About one point every 12°.
 */
export function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number): Pt[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 12));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    out.push(pt(round(cx + rx * Math.cos(a)), round(cy + ry * Math.sin(a))));
  }
  return out;
}
const round = (v: number) => Math.round(v * 1e4) / 1e4;

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Length of a polyline. */
export function length(line: readonly Pt[]): number {
  let s = 0;
  for (let i = 1; i < line.length; i++) s += dist(line[i - 1]!, line[i]!);
  return s;
}

/** The polyline resampled every `step` along its length (the ends kept; at least 2 points). */
export function resample(line: readonly Pt[], step: number): Pt[] {
  const first = line[0];
  if (!first) return [];
  const total = length(line);
  const n = Math.max(1, Math.ceil(total / Math.max(step, 1e-9)));
  const out: Pt[] = [first];
  let seg = 1;
  let segStart = 0;
  for (let i = 1; i <= n; i++) {
    const at = (total * i) / n;
    while (seg < line.length - 1 && segStart + dist(line[seg - 1]!, line[seg]!) < at) {
      segStart += dist(line[seg - 1]!, line[seg]!);
      seg++;
    }
    const a = line[seg - 1]!;
    const b = line[seg] ?? a;
    const d = dist(a, b);
    const t = d > 0 ? Math.min(1, (at - segStart) / d) : 0;
    out.push(pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
  }
  if (out.length < 2) out.push(first);
  return out;
}

/** Distance from p to the segment ab. */
export function toSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Distance from p to a polyline. */
export function toLine(p: Pt, line: readonly Pt[]): number {
  if (line.length === 1) return dist(p, line[0]!);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, toSegment(p, line[i - 1]!, line[i]!));
  return best;
}

/** The bounding box of some polylines. */
export function bounds(lines: readonly (readonly Pt[])[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of lines)
    for (const p of l) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
  return { x0, y0, x1, y1 };
}
