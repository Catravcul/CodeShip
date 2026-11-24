/**
 * The pillow war (Berón 2026-11-24: «las peleas de almohadas pasan a ser guerras de almohadas donde cada equipo tiene un
 * castillo y un tesoro en su interior, gana el que tenga todos los tesoros o el que tenga más tesoros al terminar el
 * tiempo máximo»). Pure: the game's state and its rules; who stands where is the caller's.
 *
 * - Every team starts with its own treasure in its castle.
 * - One takes a treasure that is not her team's to hold: from another castle or from the floor where it fell.
 * - A treasure is her team's while she carries it, and when she leaves it in her castle.
 * - Hit by a pillow while carrying one, she drops it where she is (on the ring it is nobody's).
 * - A team holding every treasure wins at once; at the end of the time, the team holding most; level, a draw.
 */
export interface Treasure {
  /** Its team (whose castle it started in). */
  readonly id: string;
  /** The castle it lies in (undefined: on the floor, nobody's), or who carries it. */
  readonly castle?: string;
  readonly carrier?: { readonly who: string; readonly team: string };
}

export interface War {
  readonly teams: readonly string[];
  readonly treasures: readonly Treasure[];
  /** Seconds left. */
  readonly left: number;
  readonly winner?: string | "empate";
}

/** The default length of a war, s (ours: a good round on a phone). */
export const WAR_SECONDS = 300;

export const newWar = (teams: readonly string[], seconds = WAR_SECONDS): War => ({ teams, treasures: teams.map((t) => ({ id: t, castle: t })), left: seconds });

/** Which team a treasure counts for now, if any. */
export const holder = (t: Treasure): string | undefined => t.carrier?.team ?? t.castle;

/** How many treasures each team holds. */
export function score(w: War): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(w.teams.map((t) => [t, 0]));
  for (const t of w.treasures) {
    const h = holder(t);
    if (h !== undefined) out[h] = (out[h] ?? 0) + 1;
  }
  return out;
}

function judged(w: War): War {
  if (w.winner) return w;
  const s = score(w);
  const all = w.teams.find((t) => s[t] === w.treasures.length);
  if (all) return { ...w, winner: all };
  if (w.left > 0) return w;
  const best = Math.max(...w.teams.map((t) => s[t]!));
  const top = w.teams.filter((t) => s[t] === best);
  return { ...w, winner: top.length === 1 ? top[0]! : "empate" };
}

const set = (w: War, id: string, f: (t: Treasure) => Treasure): War => judged({ ...w, treasures: w.treasures.map((t) => (t.id === id ? f(t) : t)) });

/** Can `team` take this treasure: not carried, and not already its own. */
export const canTake = (w: War, team: string, id: string): boolean => {
  const t = w.treasures.find((q) => q.id === id);
  return !w.winner && !!t && !t.carrier && t.castle !== team;
};

/** She takes it (one at a time). */
export function take(w: War, who: string, team: string, id: string): War {
  if (!canTake(w, team, id) || w.treasures.some((t) => t.carrier?.who === who)) return w;
  return set(w, id, () => ({ id, carrier: { who, team } }));
}

/** She puts down what she carries: in a castle (`castle`) or on the floor (undefined). */
export function drop(w: War, who: string, castle?: string): War {
  const t = w.treasures.find((q) => q.carrier?.who === who);
  if (!t || w.winner) return w;
  return set(w, t.id, () => ({ id: t.id, ...(castle ? { castle } : {}) }));
}

/** Hit by a pillow: what she carries falls where she is (out of any castle: nobody's). */
export const hit = (w: War, who: string, castle?: string): War => drop(w, who, castle);

/** Time goes on. */
export const tick = (w: War, dt: number): War => (w.winner ? w : judged({ ...w, left: Math.max(0, w.left - dt) }));

/** What she carries, if anything. */
export const carrying = (w: War, who: string): Treasure | undefined => w.treasures.find((t) => t.carrier?.who === who);
