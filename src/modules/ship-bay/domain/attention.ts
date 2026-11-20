/** How urgently a part of the ship needs a look. */
export type Attention = "ok" | "aviso" | "critico";

const RANK: Readonly<Record<Attention, number>> = { ok: 0, aviso: 1, critico: 2 };

/** Thresholds of the ship bay's warnings. Game values (ajuste de juego), not real limits. */
export const ATTENTION_TUNING = {
  /** Any hull damage shows up; under half it is critical (the HUD also turns the hull red under 50 %). */
  hullWarnBelow: 0.999,
  hullCriticalBelow: 0.5,
  /** A tank or store under a quarter of its capacity is a warning; empty is critical. */
  levelWarnBelow: 0.25,
  /** A machine under 80 % is worn; under BROKEN_BELOW (50 %) it stops and is critical. */
  machineWarnBelow: 0.8,
  /** A bed under this health needs care. */
  bedHealthWarnBelow: 0.7,
} as const;

export const byIntegrity = (v: number): Attention => (v < ATTENTION_TUNING.hullCriticalBelow ? "critico" : v < ATTENTION_TUNING.hullWarnBelow ? "aviso" : "ok");

export const byLevel = (fraction: number): Attention => (fraction <= 0 ? "critico" : fraction < ATTENTION_TUNING.levelWarnBelow ? "aviso" : "ok");

export const byMachine = (condition: number, working: boolean): Attention => (!working ? "critico" : condition < ATTENTION_TUNING.machineWarnBelow ? "aviso" : "ok");

export const worst = (list: readonly Attention[]): Attention => list.reduce<Attention>((a, b) => (RANK[b] > RANK[a] ? b : a), "ok");

/** Stable sort: critical first, then warnings, then the rest in their original order. */
export const mostUrgentFirst = <T extends { readonly attention: Attention }>(list: readonly T[]): T[] =>
  list.map((x, i) => [x, i] as const).sort(([a, i], [b, j]) => RANK[b.attention] - RANK[a.attention] || i - j).map(([x]) => x);
