/**
 * Space between interactables (docs/design/interiores.md, «Espacio entre interactuables»).
 *
 * Cold Sanctuary solved crowded action buttons by leaving room between the things one can use: the
 * designer asked for «2 m entre objetos» (2026-10-24) and its `FurnitureSpacing` checks 2,0 m between
 * lab blocks; its training building keeps ≥ 2,0 m between machine footprints. Codeship takes the same
 * 2,0 m, measured between centres (where the thing and its sign are) and between action anchors
 * (where she stands or holds on to get its button). With the button shown within half of that
 * (`ACTION_REACH_M`), two buttons can never show at once; and on an iPhone 13 (390 pt across, 70°
 * vertical field, ≈45° across in portrait) two signs ~1,5 m wide two metres apart sit side by side
 * at any distance instead of on top of each other.
 */
export const INTERACTABLE_SPACING = {
  minM: 2.0,
  source: "Cold Sanctuary: docs/edificios-investigacion.md («2 m entre objetos», Berón 2026-10-24), Assets/Scripts/World/FurnitureSpacing.cs (regla `Bloque_`, 2,0 m) y docs/entrenamiento-areas.md §3.6 (≥ 2,0 m entre huellas)",
} as const;

/** The button of a walked-to thing shows within this distance of its anchor, m: half the spacing, so two never show at once. */
export const ACTION_REACH_M = INTERACTABLE_SPACING.minM / 2 - 0.1;

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A thing one can use: where it is and where she must be to get its action. */
export interface Interactable {
  readonly id: string;
  readonly centre: Point3;
  readonly anchor: Point3;
}

export interface SpacingViolation {
  readonly a: string;
  readonly b: string;
  readonly what: "centro" | "accion";
  readonly distanceM: number;
}

const dist = (p: Point3, q: Point3) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

/** Pairs of interactables closer than `minM` (centres or anchors). */
export function spacingViolations(items: readonly Interactable[], minM: number = INTERACTABLE_SPACING.minM): SpacingViolation[] {
  const out: SpacingViolation[] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      const dc = dist(a.centre, b.centre);
      const da = dist(a.anchor, b.anchor);
      if (dc < minM - 1e-6) out.push({ a: a.id, b: b.id, what: "centro", distanceM: dc });
      if (da < minM - 1e-6) out.push({ a: a.id, b: b.id, what: "accion", distanceM: da });
    }
  return out;
}

/** The smallest distance between two interactables (centres or anchors), m. */
export function minSpacing(items: readonly Interactable[]): number {
  let best = Infinity;
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) best = Math.min(best, dist(items[i]!.centre, items[j]!.centre), dist(items[i]!.anchor, items[j]!.anchor));
  return best;
}
