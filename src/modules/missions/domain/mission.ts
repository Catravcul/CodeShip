/** What a mission target is: the story grows from asteroids to a moon and then a planet. */
export type TargetKind = "asteroide" | "luna" | "planeta";

/** A real number behind a mission, with where it comes from. */
export interface MissionFact {
  readonly label: string;
  readonly value: string;
  readonly source: string;
  /** "medido", "calculado con…", "valor de juego"… */
  readonly note?: string;
}

/** What finishing a main mission gives: station materials by id (kg or kit units). Game values. */
export interface MissionReward {
  readonly amounts: Readonly<Record<string, number>>;
  /** Credits Nevaeh pays, spent on imports from the Sanctuary (1 crédito = 1 000 US$; game values). */
  readonly credits?: number;
  /** In-game words, e.g. "2 kits importados". */
  readonly text: string;
}

/**
 * One of Nevaeh's main missions: persuade one named target. `playable: false` marks a later chapter
 * that is written down but has no gameplay yet; it stays locked even when its turn comes.
 */
export interface MainMission {
  readonly id: string;
  readonly chapter: number;
  readonly chapterTitle: string;
  readonly target: { readonly id: string; readonly name: string; readonly kind: TargetKind };
  readonly title: string;
  /** One line on why Nevaeh wants it, grounded in the facts. */
  readonly why: string;
  readonly facts: readonly MissionFact[];
  readonly reward?: MissionReward;
  /** The radio letter that asks for it. */
  readonly letterId: string;
  readonly playable: boolean;
  /** Why it is locked when it is not playable yet. */
  readonly lockedNote?: string;
}

export type MissionState = "bloqueada" | "activa" | "hecha";

/** A target with no main mission: persuading it is a side mission. */
export interface SideTarget {
  readonly id: string;
  readonly name: string;
}

export type MissionEvent =
  | { readonly type: "main-done"; readonly mission: MainMission }
  /** The next main mission can be played now. */
  | { readonly type: "main-active"; readonly mission: MainMission }
  /** Its turn came but it has no gameplay yet: Nevaeh announces it, it stays locked. */
  | { readonly type: "main-announced"; readonly mission: MainMission }
  | { readonly type: "side-done"; readonly target: SideTarget };

/**
 * The mission log. Main missions are a chain: only the first is active at the start and finishing
 * one opens the next. Every other known target is a side mission. Progress comes from one question,
 * "is this target persuaded?", so the log does not depend on how the duel is played.
 */
export class MissionLog {
  private readonly done = new Set<string>();
  private readonly sideDone = new Set<string>();
  /** Index of the first main mission not done (the active or announced one). */
  private cursor = 0;
  readonly sides: readonly SideTarget[];

  constructor(
    readonly main: readonly MainMission[],
    targets: readonly SideTarget[],
  ) {
    const ids = new Set(main.map((m) => m.id));
    if (ids.size !== main.length) throw new Error("Main mission ids must be unique");
    const mainTargets = new Set(main.map((m) => m.target.id));
    this.sides = targets.filter((t) => !mainTargets.has(t.id));
  }

  /** The main mission being played, if the chain has not reached a locked chapter. */
  get active(): MainMission | undefined {
    const m = this.main[this.cursor];
    return m?.playable ? m : undefined;
  }

  /** The main mission whose turn it is, playable or not (undefined when the chain is finished). */
  get current(): MainMission | undefined {
    return this.main[this.cursor];
  }

  state(missionId: string): MissionState {
    if (this.done.has(missionId)) return "hecha";
    return this.active?.id === missionId ? "activa" : "bloqueada";
  }

  /** Whether Nevaeh has already asked for it (done, active, or its turn came while still locked). */
  isAnnounced(missionId: string): boolean {
    const i = this.main.findIndex((m) => m.id === missionId);
    return i >= 0 && i <= this.cursor;
  }

  mainFor(targetId: string): MainMission | undefined {
    return this.main.find((m) => m.target.id === targetId);
  }

  isSideDone(targetId: string): boolean {
    return this.sideDone.has(targetId);
  }

  get mainDone(): number {
    return this.done.size;
  }
  get sideCount(): { done: number; total: number } {
    return { done: this.sideDone.size, total: this.sides.length };
  }

  /**
   * Bring the log up to date with what is persuaded. A target persuaded before its mission's turn
   * counts as soon as the turn comes, so the chain can advance several steps at once.
   */
  update(isPersuaded: (targetId: string) => boolean): MissionEvent[] {
    const events: MissionEvent[] = [];
    for (const t of this.sides) {
      if (!this.sideDone.has(t.id) && isPersuaded(t.id)) {
        this.sideDone.add(t.id);
        events.push({ type: "side-done", target: t });
      }
    }
    for (let m = this.active; m && isPersuaded(m.target.id); m = this.active) {
      this.done.add(m.id);
      this.cursor++;
      events.push({ type: "main-done", mission: m });
      const next = this.current;
      if (next) events.push({ type: next.playable ? "main-active" : "main-announced", mission: next });
    }
    return events;
  }
}
