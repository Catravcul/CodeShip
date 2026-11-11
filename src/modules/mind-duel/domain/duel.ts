import type { DuelProfile } from "./difficulty";
import { blockCount, hasDistractors, isCorrect, type Answer, type Exercise } from "./exercise";

export type DuelStatus = "thinking" | "persuaded" | "aggressive";

export type DuelEvent =
  | { type: "idea-accepted"; exerciseId: string }
  | { type: "idea-rejected"; exerciseId: string }
  | { type: "asteroid-persuaded" }
  | { type: "asteroid-enraged" };

/** Deterministic shuffle (mulberry32) so a duel can be replayed in tests. */
function shuffle<T>(items: readonly T[], seed: number): T[] {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Entering the asteroid's mind. Each exercise is an idea surfacing in it: solved ideas persuade,
 * failed ideas wear down its patience. Persuaded = it obeys; no patience left = it turns aggressive.
 */
export class MindDuel {
  private _persuasion = 0;
  private _patience: number;
  private _status: DuelStatus = "thinking";
  private cursor = 0;

  private constructor(
    readonly profile: DuelProfile,
    private readonly queue: readonly Exercise[],
  ) {
    this._patience = profile.patience;
  }

  static start(profile: DuelProfile, bank: readonly Exercise[], seed: number): MindDuel {
    const fits = bank.filter(
      (e) => e.concept <= profile.maxConcept && blockCount(e) <= profile.maxBlocks && (profile.distractors || !hasDistractors(e)),
    );
    if (fits.length === 0) throw new Error("No exercises fit this asteroid's profile");
    // Harder concepts later in the duel, random within the same concept.
    const ordered = shuffle(fits, seed).sort((a, b) => a.concept - b.concept);
    return new MindDuel(profile, ordered);
  }

  get status(): DuelStatus {
    return this._status;
  }
  get persuasion(): number {
    return this._persuasion;
  }
  get patience(): number {
    return this._patience;
  }
  get current(): Exercise | undefined {
    return this._status === "thinking" ? this.queue[this.cursor % this.queue.length] : undefined;
  }

  submit(answer: Answer): DuelEvent[] {
    const ex = this.current;
    if (!ex) return [];
    const events: DuelEvent[] = [];
    if (isCorrect(ex, answer)) {
      this._persuasion++;
      events.push({ type: "idea-accepted", exerciseId: ex.id });
      if (this._persuasion >= this.profile.persuasionGoal) {
        this._status = "persuaded";
        events.push({ type: "asteroid-persuaded" });
      }
    } else {
      this._patience--;
      events.push({ type: "idea-rejected", exerciseId: ex.id });
      if (this._patience <= 0) {
        this._status = "aggressive";
        events.push({ type: "asteroid-enraged" });
      }
    }
    this.cursor++;
    return events;
  }
}
