/**
 * THE EMBRYO OF A SANCTUARY'S GLOBE (Berón 2026-11-24 and 2026-11-25): sanctuary 1's water globe holds an octopus egg
 * developing until it hatches (sanctuary-one/domain/pulpo.ts); sanctuary 3's cloud globe, a honeybee from egg to
 * adult (aerial-sanctuary/domain/abeja.ts). What they share: a list of real stages, each from a share `at` of the
 * development (0 laid … 1 born), a clock that runs on real seconds by a setting's minutes and starts again after a
 * tail (the newborn swimming or flying off), and smooth ramps so every change is fluid. Pure; each species brings
 * its own stages and its own look.
 */
export interface EmbryoStage {
  /** When it starts, as a share of the development (0–1). */
  readonly at: number;
  /** What happens, for the player. */
  readonly label: string;
}

/** 0 … 1 with eased ends (smoothstep). */
export const smooth = (x: number): number => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** From `a` to `b` while k goes from k0 to k1, smoothly. */
export const ramp = (k: number, k0: number, k1: number, a: number, b: number): number => a + (b - a) * smooth((k - k0) / (k1 - k0));

/** The stage at a moment `k` of a list ordered by `at`. */
export function stageIn<S extends EmbryoStage>(stages: readonly S[], k: number): S {
  let s = stages[0]!;
  for (const q of stages) if (q.at <= k + 1e-9) s = q;
  return s;
}

/** The clock: advances by real seconds over `minutes` for the whole development, and loops after `tail` (a new one). */
export function advanceCycle(k: number, dtSeconds: number, minutes: number, tail: number): number {
  const next = k + dtSeconds / (minutes * 60);
  return next > 1 + tail ? 0 : next;
}
