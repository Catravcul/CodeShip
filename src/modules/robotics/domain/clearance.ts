import type { Vec3 } from "@core/math/vec3";
import type { StationLayout } from "@modules/station/domain/structure";

/**
 * «Nada atraviesa nada» outside (reglas.md §4.2): whether a point is inside the station's hull (a module's
 * cylinder) or one of its outside parts (truss, arrays, radiators, the exposed platform), less `marginM` (what
 * touches is not through). Which one, or undefined. Used by the arm's and the spacewalk's live audits.
 */
export function insideStation(p: Vec3, layout: StationLayout, marginM = 0.05): string | undefined {
  for (const m of layout.modules) {
    const axis = m.to.sub(m.from);
    const len = axis.length();
    if (len < 1e-9) continue;
    const u = axis.scale(1 / len);
    const rel = p.sub(m.from);
    const t = rel.dot(u);
    if (t < marginM || t > len - marginM) continue;
    const radial = rel.sub(u.scale(t)).length();
    if (radial < m.radiusM - marginM) return m.label;
  }
  for (const part of layout.parts) {
    const d = p.sub(part.centre);
    if (Math.abs(d.x) < part.half.x - marginM && Math.abs(d.y) < part.half.y - marginM && Math.abs(d.z) < part.half.z - marginM) return part.label;
  }
  return undefined;
}

/** Whether the segment a→b stays out of the station (sampled every `stepM`). */
export function segmentClear(a: Vec3, b: Vec3, layout: StationLayout, stepM = 0.5, marginM = 0.05): string | undefined {
  const d = b.sub(a);
  const n = Math.max(1, Math.ceil(d.length() / stepM));
  for (let i = 0; i <= n; i++) {
    const hit = insideStation(a.add(d.scale(i / n)), layout, marginM);
    if (hit) return hit;
  }
  return undefined;
}
