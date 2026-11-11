import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import type { DuelProfile } from "@modules/mind-duel/domain/difficulty";
import { MindDuel } from "@modules/mind-duel/domain/duel";
import { Plant, type Harvest } from "@modules/garden/domain/plant";
import type { PlantSpecies } from "@modules/garden/domain/species";
import { decide } from "@modules/pets/domain/behavior";
import type { Cat } from "@modules/pets/domain/cat";
import { Introduction } from "@modules/pets/domain/introduction";
import type { CatLesson } from "@modules/pets/data/rules";

export type HabitatEvent =
  | { type: "plant-bitten"; catId: string; plantId: string }
  | { type: "plant-sniffed"; catId: string; plantId: string }
  | { type: "plant-died"; plantId: string }
  | { type: "cats-hissed"; a: string; b: string }
  | { type: "cats-greeted"; a: string; b: string }
  | { type: "introduction-advanced"; newcomerId: string; residentId: string; stage: string }
  | { type: "rule-learned"; catId: string; ruleId: string }
  | { type: "cat-annoyed"; catId: string }
  | { type: "plant-encouraged"; plantId: string };

/** Game tuning for life on board. Encounter rates are per day. */
export const HABITAT_TUNING = {
  plantVisitsPerDay: 2,
  meetingsPerDay: 3,
  biteSeverity: 0.3,
  hissStress: 0.25,
  catTalk: { difficulty: 0.2, persuasionGoal: 2, patience: 2, maxBlocks: 6, distractors: false, maxConcept: 10 } satisfies DuelProfile,
  plantTalk: { difficulty: 0.1, persuasionGoal: 2, patience: 3, maxBlocks: 5, distractors: false, maxConcept: 10 } satisfies DuelProfile,
} as const;

/** Talking to a mind: a short duel whose outcome changes the cat or plant. */
export class Conversation {
  constructor(
    readonly duel: MindDuel,
    private readonly onPersuaded: () => void,
    private readonly onEnraged: () => void,
  ) {}

  answer(a: Answer): boolean {
    const before = this.duel.status;
    const events = this.duel.submit(a);
    if (before === "thinking" && this.duel.status === "persuaded") this.onPersuaded();
    if (before === "thinking" && this.duel.status === "aggressive") this.onEnraged();
    return events.some((e) => e.type === "idea-accepted");
  }
}

/**
 * Life on board during long legs: plants grow, cats live and meet each other, and the player talks
 * to their minds to program them. Time in days. Randomness is injected so runs are reproducible.
 */
export class Habitat {
  private readonly _plants = new Map<string, Plant>();
  private readonly _cats = new Map<string, Cat>();
  private readonly _intros: Introduction[] = [];
  private _events: HabitatEvent[] = [];
  private _seed = 1;
  lightsOn = true;

  constructor(
    private readonly rng: () => number,
    /** Litter boxes, bowls, beds… the scarcest of them. AAFP: one per cat plus one. */
    public resourceSets = 2,
  ) {}

  get plants(): readonly Plant[] {
    return [...this._plants.values()];
  }
  get cats(): readonly Cat[] {
    return [...this._cats.values()];
  }
  get introductions(): readonly Introduction[] {
    return this._intros;
  }
  get resourcesOk(): boolean {
    return this.resourceSets >= this._cats.size + 1;
  }

  plant(id: string, species: PlantSpecies): Plant {
    const p = new Plant(id, species);
    this._plants.set(id, p);
    return p;
  }

  /** Bring a cat aboard. Every resident must be introduced to it step by step. */
  adopt(cat: Cat): void {
    for (const resident of this._cats.values()) this._intros.push(new Introduction(cat.id, resident.id));
    this._cats.set(cat.id, cat);
  }

  harvest(plantId: string): Harvest {
    return this.get(this._plants, plantId).harvest();
  }

  drainEvents(): HabitatEvent[] {
    const out = this._events;
    this._events = [];
    return out;
  }

  tick(dtDays: number): void {
    const t = HABITAT_TUNING;
    for (const p of this._plants.values()) {
      const wasAlive = p.alive;
      p.tick(dtDays, { lit: this.lightsOn });
      if (wasAlive && !p.alive) this._events.push({ type: "plant-died", plantId: p.id });
    }
    for (const c of this._cats.values()) c.tick(dtDays, { resourcesOk: this.resourcesOk });

    // Curious cats visit new plants.
    for (const c of this._cats.values()) {
      for (const p of this._plants.values()) {
        if (!p.isNew || !p.alive || !this.happens(t.plantVisitsPerDay, dtDays)) continue;
        const act = decide(c, "planta-nueva", this.rng);
        if (act === "morder-planta") {
          p.bite(t.biteSeverity);
          this._events.push({ type: "plant-bitten", catId: c.id, plantId: p.id });
        } else this._events.push({ type: "plant-sniffed", catId: c.id, plantId: p.id });
      }
    }

    // Cats being introduced meet once they can see each other.
    for (const intro of this._intros) {
      const a = this.get(this._cats, intro.newcomerId);
      const b = this.get(this._cats, intro.residentId);
      let friendly = false;
      if (intro.canMeet && !intro.friends && this.happens(t.meetingsPerDay, dtDays)) {
        const hiss = decide(a, "gato-desconocido", this.rng) === "bufar" || decide(b, "gato-desconocido", this.rng) === "bufar";
        if (hiss) {
          a.startle(t.hissStress);
          b.startle(t.hissStress);
          intro.setback();
          this._events.push({ type: "cats-hissed", a: a.id, b: b.id });
        } else {
          friendly = true;
          this._events.push({ type: "cats-greeted", a: a.id, b: b.id });
        }
      }
      if (intro.tick(dtDays, a.stress, b.stress, friendly))
        this._events.push({ type: "introduction-advanced", newcomerId: a.id, residentId: b.id, stage: intro.stage });
    }
  }

  /** Talk to a cat's mind to write a rule into it. Failing annoys the cat. */
  talkToCat(catId: string, lesson: CatLesson): Conversation {
    const cat = this.get(this._cats, catId);
    return new Conversation(
      this.duel(HABITAT_TUNING.catTalk, lesson.exercises),
      () => {
        cat.learn(lesson.rule);
        this._events.push({ type: "rule-learned", catId, ruleId: lesson.rule.id });
      },
      () => {
        cat.startle(0.3);
        this._events.push({ type: "cat-annoyed", catId });
      },
    );
  }

  /** Talk to a plant's mind to encourage it. Failing leaves it a little discouraged. */
  talkToPlant(plantId: string, bank: readonly Exercise[]): Conversation {
    const plant = this.get(this._plants, plantId);
    return new Conversation(
      this.duel(HABITAT_TUNING.plantTalk, bank),
      () => {
        plant.encourage(1);
        this._events.push({ type: "plant-encouraged", plantId });
      },
      () => plant.encourage(-0.3),
    );
  }

  private duel(profile: DuelProfile, bank: readonly Exercise[]): MindDuel {
    return MindDuel.start(profile, bank, this._seed++);
  }

  /** Poisson event with `ratePerDay` during `dtDays`. */
  private happens(ratePerDay: number, dtDays: number): boolean {
    return this.rng() < 1 - Math.exp(-ratePerDay * dtDays);
  }

  private get<T>(map: Map<string, T>, id: string): T {
    const v = map.get(id);
    if (!v) throw new Error(`Unknown id ${id}`);
    return v;
  }
}
