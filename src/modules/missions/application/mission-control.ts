import type { Letter, Mailbox } from "@modules/story/domain/mailbox";
import type { MainMission, MissionEvent, MissionLog } from "../domain/mission";

/** Something to tell the pilot, in game words. */
export interface MissionNotice {
  readonly kind: "cumplida" | "nueva" | "anunciada" | "secundaria";
  readonly text: string;
}

/**
 * Use case: keep Nevaeh's missions moving. Reads who is persuaded, closes the radio mission of a
 * finished main mission, hands its reward to the station and posts the letter of the next one.
 */
export class MissionControl {
  private readonly letters: ReadonlyMap<string, Letter>;

  constructor(
    readonly log: MissionLog,
    private readonly mailbox: Mailbox,
    /** Letters the chain posts (any letter it names that is not here is expected to be in the story already). */
    letters: readonly Letter[],
    /** Give a reward to the station's store. */
    private readonly grant: (amounts: Readonly<Record<string, number>>) => void,
  ) {
    this.letters = new Map(letters.map((l) => [l.id, l]));
    const first = log.current;
    if (first) this.post(first);
  }

  /** The letter that asks for a mission, once it has reached the radio. */
  letterFor(m: MainMission): Letter | undefined {
    return this.mailbox.received.find((r) => r.letter.id === m.letterId)?.letter;
  }

  update(isPersuaded: (targetId: string) => boolean): MissionNotice[] {
    return this.log.update(isPersuaded).map((e) => this.apply(e));
  }

  private apply(e: MissionEvent): MissionNotice {
    switch (e.type) {
      case "main-done": {
        const m = e.mission;
        const r = this.mailbox.received.find((x) => x.letter.id === m.letterId);
        if (r?.letter.mission?.goal === "persuadir" && !r.missionDone) this.mailbox.completeMission(m.letterId);
        if (m.reward) this.grant(m.reward.amounts);
        return { kind: "cumplida", text: `Misión de Nevaeh cumplida: ${m.title}${m.reward ? ` · llegan ${m.reward.text} a la estación` : ""}` };
      }
      case "main-active":
        this.post(e.mission);
        return { kind: "nueva", text: `Carta de Nevaeh: ${e.mission.title}` };
      case "main-announced":
        this.post(e.mission);
        return { kind: "anunciada", text: `Carta de Nevaeh sobre ${e.mission.target.name}: misión bloqueada por ahora` };
      case "side-done": {
        const c = this.log.sideCount;
        return { kind: "secundaria", text: `Misión secundaria: ${e.target.name} subyugado (${c.done}/${c.total})` };
      }
    }
  }

  private post(m: MainMission): void {
    const l = this.letters.get(m.letterId);
    if (l) this.mailbox.post(l);
  }
}
