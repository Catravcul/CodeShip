import type { Chore } from "@modules/chores/domain/chore";

/**
 * A CHALLENGE'S STEPS DRAWN AS A FORMULA (docs/design/retos-trazos.md §Pasos): a challenge of N steps drawn as a
 * formula of G glyphs keeps its steps' beats: when glyph i is done, the steps up to ⌈(i+1)·N/G⌉ are done, so every
 * step still plays its animation (`beat(index, part)`, all the parts of an order step at once, as on the sheet).
 */
export const stepsUpTo = (glyph: number, glyphs: number, steps: number): number => Math.min(steps, Math.ceil(((glyph + 1) * steps) / glyphs));

/** The parts of each step: an order's blocks, one for any other kind. */
export const choreParts = (chore: Chore): number[] => chore.exercises.map((e) => (e.kind === "order" ? e.solution.length : 1));

/** The beats `[index, part]` that glyph `glyph` (of `glyphs`) completes. */
export function glyphBeats(parts: readonly number[], glyph: number, glyphs: number): [number, number][] {
  const from = glyph > 0 ? stepsUpTo(glyph - 1, glyphs, parts.length) : 0;
  const to = stepsUpTo(glyph, glyphs, parts.length);
  const out: [number, number][] = [];
  for (let i = from; i < to; i++) for (let p = 0; p < parts[i]!; p++) out.push([i, p]);
  return out;
}
