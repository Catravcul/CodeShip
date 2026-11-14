/** Something that happened on board or in flight that a letter can answer to. */
export type StoryEvent = "sacudida" | "asteroide-persuadido" | "asteroide-furioso" | "familia";

/**
 * What a nano_net mission asks for: plant a core, teach it a stage, or repair a fault. Missions are
 * code challenges done landed on the core (modules/nano-net), not on the ship's panel.
 */
export type NanoGoal = "nucleo" | "generar" | "mover" | "cubrir" | "enlazar" | "reparar";

/** What a letter's mission asks for: a nano_net goal, or persuading one target (Nevaeh's main missions, modules/missions). */
export type MissionGoal = NanoGoal | "persuadir";

/** A mission in a letter. `faultId` ties a repair mission to one fault; `targetId` names who to persuade. */
export interface Mission {
  readonly title: string;
  readonly goal: MissionGoal;
  readonly faultId?: string;
  readonly targetId?: string;
  /** Where to go and what to do, shown under the letter. */
  readonly where: string;
}

/** When a letter reaches the ship's radio. */
export type LetterTrigger =
  | { readonly kind: "start" }
  /** `days` after the mission of another letter is done. */
  | { readonly kind: "mission-done"; readonly letterId: string; readonly days: number }
  | { readonly kind: "event"; readonly event: StoryEvent }
  /** On a given day of the trip (calls from friends). */
  | { readonly kind: "day"; readonly day: number }
  /** Written on the spot and handed to `Mailbox.post` (fault reports). */
  | { readonly kind: "posted" };

/** A letter: text, an optional code example and an optional nano_net mission. */
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
  readonly mission?: Mission;
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
  /** Goals reached before their letter arrived: that letter's mission comes already done. */
  private readonly achieved = new Set<MissionGoal>();
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

  /** The nano_net reached a goal: every pending mission asking for it is done (a repair only for its fault). */
  achieve(goal: NanoGoal, faultId?: string): void {
    if (goal !== "reparar") this.achieved.add(goal);
    for (const r of this.inbox) {
      const m = r.letter.mission;
      if (!m || r.missionDone || m.goal !== goal || (m.faultId && m.faultId !== faultId)) continue;
      this.completeMission(r.letter.id);
    }
  }

  /** A letter written on the spot (Nevaeh announcing a fault). Ignored if one with that id arrived already. */
  post(letter: Letter): void {
    if (!this.has(letter.id)) this.deliver(letter);
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
    const done = !!l.mission && !l.mission.faultId && this.achieved.has(l.mission.goal);
    this.inbox.push({ letter: l, day: this.day, read: false, missionDone: done });
    if (done) this.doneAt.set(l.id, this.day);
    this.fresh.push(l);
  }
}
