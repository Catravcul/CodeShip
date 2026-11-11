import type { CompositionEntry } from "./asteroid";

/** Game value of each material per unit of mass fraction. Water and metals are what a ship needs most. */
const VALUE: Record<string, number> = {
  "Water (in hydrated minerals)": 10,
  Water: 10,
  "Iron-nickel": 8,
  "Platinum-group metals": 20,
  Carbon: 5,
};

const mid = (e: CompositionEntry) => (e.massFraction.value[0] + e.massFraction.value[1]) / 2;

/** 0..1 measure of how valuable an asteroid's known composition is. */
export function resourceRichness(composition: readonly CompositionEntry[]): number {
  const v = composition.reduce((s, e) => s + mid(e) * (VALUE[e.material] ?? 1), 0);
  return Math.min(1, v);
}

/** What a persuaded asteroid hands over: cargo filled in proportion to its known materials. */
export function extractToCargo(composition: readonly CompositionEntry[], capacityKg: number): { material: string; kg: number }[] {
  const total = composition.reduce((s, e) => s + mid(e), 0);
  if (total === 0) return [];
  return composition.map((e) => ({ material: e.material, kg: (capacityKg * mid(e)) / total }));
}
