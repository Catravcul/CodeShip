import type { Exercise } from "@modules/mind-duel/domain/exercise";

/** Something that happened on board or in flight that a letter can answer to. */
export type StoryEvent = "sacudida" | "asteroide-persuadido" | "asteroide-furioso" | "familia";

/** When a letter reaches the ship's radio. */
export type LetterTrigger =
  | { readonly kind: "start" }
  /** `days` after the mission of another letter is done. */
  | { readonly kind: "mission-done"; readonly letterId: string; readonly days: number }
  | { readonly kind: "event"; readonly event: StoryEvent }
  /** On a given day of the trip (calls from friends). */
  | { readonly kind: "day"; readonly day: number };

/** A letter: text, an optional code example and an optional mission (a chain of code challenges). */
export interface Letter {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  /** A written letter (default) or a call over the sanctuary's line, shown as its transcript. */
  readonly channel?: "carta" | "llamada";
  readonly subject: string;
  readonly body: readonly string[];
  readonly example?: { readonly pseudo: string; readonly js: string };
  readonly postscripts: readonly string[];
  readonly mission?: { readonly title: string; readonly exercises: readonly Exercise[] };
  readonly trigger: LetterTrigger;
  /** Where the text comes from (the 2023 draft, or new). */
  readonly origin: string;
}

export interface Received {
  readonly letter: Letter;
  readonly day: number;
  read: boolean;
  missionDone: boolean;
}

/** The ship's radio: delivers letters when their trigger fires, keeps them, tracks missions. Time in days. */
export class Mailbox {
  private readonly inbox: Received[] = [];
  private readonly doneAt = new Map<string, number>();
  private fresh: Letter[] = [];
  private day = 0;

  constructor(private readonly letters: readonly Letter[]) {
    for (const l of letters) if (l.trigger.kind === "start") this.deliver(l);
  }

  get received(): readonly Received[] {
    return this.inbox;
  }
  get unread(): number {
    return this.inbox.filter((r) => !r.read).length;
  }
  /** Letters whose mission is waiting to be done. */
  get pendingMissions(): readonly Letter[] {
    return this.inbox.filter((r) => r.letter.mission && !r.missionDone).map((r) => r.letter);
  }

  tick(dtDays: number): void {
    this.day += dtDays;
    for (const l of this.letters) {
      const t = l.trigger;
      if (this.has(l.id)) continue;
      if (t.kind === "day" && this.day >= t.day) this.deliver(l);
      if (t.kind !== "mission-done") continue;
      const done = this.doneAt.get(t.letterId);
      if (done !== undefined && this.day >= done + t.days) this.deliver(l);
    }
  }

  notify(event: StoryEvent): void {
    for (const l of this.letters) if (l.trigger.kind === "event" && l.trigger.event === event && !this.has(l.id)) this.deliver(l);
  }

  read(letterId: string): void {
    const r = this.inbox.find((x) => x.letter.id === letterId);
    if (r) r.read = true;
  }

  completeMission(letterId: string): void {
    const r = this.inbox.find((x) => x.letter.id === letterId);
    if (!r?.letter.mission) throw new Error(`No mission in letter ${letterId}`);
    r.missionDone = true;
    this.doneAt.set(letterId, this.day);
  }

  /** Letters delivered since the last call. */
  drainNew(): Letter[] {
    const out = this.fresh;
    this.fresh = [];
    return out;
  }

  private has(id: string): boolean {
    return this.inbox.some((r) => r.letter.id === id);
  }
  private deliver(l: Letter): void {
    this.inbox.push({ letter: l, day: this.day, read: false, missionDone: false });
    this.fresh.push(l);
  }
}
