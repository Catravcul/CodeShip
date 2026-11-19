import { hash01 } from "./motion";
import type { Stage } from "./life-cycle";

/**
 * What each animal does, when it is calm (Cold Sanctuary's Ethogram, Assets/Animals/Ethogram.cs: «lo que cada animal
 * HACE en la naturaleza y con qué elemento del entorno, con su fuente»). Here each activity becomes a way of moving
 * about its territory: still (resting, still-hunting, nesting), grazing (slow steps), strolling, patrolling (fast),
 * huddling with its family, or following its mother (the young). data/etograma.ts holds each species' list.
 */
export type Mode = "quieto" | "pacer" | "pasear" | "patrullar" | "apinarse" | "seguir";

export interface EthoAct {
  readonly verb: string;
  readonly mode: Mode;
  /** How often it picks it, among its species' activities. */
  readonly weight: number;
  /** How long it lasts, s. */
  readonly seconds: number;
  readonly source: string;
}

export interface SpeciesEthogram {
  readonly acts: readonly EthoAct[];
  /** What its young do instead (a seal pup keeps to its mother; a penguin chick waits in the crèche). */
  readonly young: EthoAct;
}

/** Speed over its strolling speed, by mode. */
export const MODE_SPEED: Readonly<Record<Mode, number>> = { quieto: 0, pacer: 0.25, pasear: 1, patrullar: 1.5, apinarse: 0.6, seguir: 1.3 };

/** The activities in one cycle of an animal's day: a fixed draw, so every load sees the same. */
const CYCLE = 12;

function pick(acts: readonly EthoAct[], r: number): EthoAct {
  const total = acts.reduce((a, x) => a + x.weight, 0);
  let k = r * total;
  for (const a of acts) if ((k -= a.weight) < 0) return a;
  return acts[acts.length - 1]!;
}

/** The activity of an animal (`seed`) at time `t` (s), by its stage: a cycle of its species' activities drawn by weight. */
export function actAt(e: SpeciesEthogram, seed: number, t: number, stage: Stage): EthoAct {
  if (stage === "cria") return e.young;
  const seq = Array.from({ length: CYCLE }, (_, i) => pick(e.acts, hash01(seed, i + 101)));
  const len = seq.reduce((a, x) => a + x.seconds, 0);
  let k = ((t % len) + len) % len;
  for (const a of seq) if ((k -= a.seconds) < 0) return a;
  return seq[seq.length - 1]!;
}
