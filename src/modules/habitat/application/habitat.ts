import type { Answer } from "@modules/mind-duel/domain/exercise";
import type { DuelProfile } from "@modules/mind-duel/domain/difficulty";
import { MindDuel } from "@modules/mind-duel/domain/duel";
import { Plant } from "@modules/garden/domain/plant";
import type { PlantSpecies } from "@modules/garden/domain/species";
import { decide } from "@modules/pets/domain/behavior";
import type { Cat } from "@modules/pets/domain/cat";
import { Introduction } from "@modules/pets/domain/introduction";
import type { CatLesson } from "@modules/pets/data/rules";
import { CrewMember } from "@modules/crew/domain/crew-member";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { Recipe } from "@modules/kitchen/data/recipes";
import type { YogaSequence } from "@modules/wellness/data/yoga";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import { catChores, cookingChore, plantChores, repairChore, yogaChore } from "@modules/chores/application/catalog";

export type HabitatEvent =
  | { type: "plant-bitten"; catId: string; plantId: string }
  | { type: "plant-sniffed"; catId: string; plantId: string }
  | { type: "plant-died"; plantId: string }
  | { type: "cats-hissed"; a: string; b: string }
  | { type: "cats-greeted"; a: string; b: string }
  | { type: "introduction-advanced"; newcomerId: string; residentId: string; stage: string }
  | { type: "rule-learned"; catId: string; ruleId: string }
  | { type: "cat-annoyed"; catId: string }
  | { type: "jolt"; severity: number }
  | { type: "chore-done"; choreId: string }
  | { type: "chore-failed"; choreId: string }
  | { type: "posture"; sequenceId: string; index: number };

/** The ship as the habitat sees it: its design (for its code) and its hull. */
export interface RepairableShip {
  readonly design: ShipDesign;
  readonly hullIntegrity: number;
  repair(fraction: number): void;
}

/** Game tuning for life on board. Encounter rates are per day. */
export const HABITAT_TUNING = {
  plantVisitsPerDay: 2,
  meetingsPerDay: 3,
  biteSeverity: 0.3,
  hissStress: 0.25,
  repairPerChore: 0.3,
  catTalk: { difficulty: 0.2, persuasionGoal: 2, patience: 2, maxBlocks: 6, distractors: false, maxConcept: 10 } satisfies DuelProfile,
} as const;

/** Talking to a cat's mind: a short duel whose outcome changes the cat. */
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

/** Doing a chore. Each right answer is a step done; effects apply when it is finished. */
export class ChoreSession {
  constructor(
    readonly run: ChoreRun,
    private readonly onStep: (step: number) => void,
    private readonly onDone: () => void,
    private readonly onFailed: () => void,
  ) {}

  answer(a: Answer): boolean {
    const ok = this.run.submit(a);
    if (ok) this.onStep(this.run.step - 1);
    if (this.run.status === "done") this.onDone();
    if (this.run.status === "failed") this.onFailed();
    return ok;
  }
}

/**
 * Life on board during long legs: plants grow, cats live and meet, the crew needs food and yoga and
 * the ship needs repairs. Everything the player does here is a code challenge (a chore).
 * Time in days. Randomness is injected so runs are reproducible.
 */
export class Habitat {
  private readonly _plants = new Map<string, Plant>();
  private readonly _cats = new Map<string, Cat>();
  private readonly _intros: Introduction[] = [];
  private readonly _larder = new Map<string, number>();
  private readonly _scenarios = new Map<string, string>();
  private _events: HabitatEvent[] = [];
  private _seed = 1;
  private _repairs = 0;
  meals = 0;
  lightsOn = true;
  readonly crew: CrewMember;

  constructor(
    private readonly rng: () => number,
    /** Litter boxes, bowls, beds… the scarcest of them. AAFP: one per cat plus one. */
    public resourceSets = 2,
    readonly ship?: RepairableShip,
    crewName = "Tripulante",
  ) {
    this.crew = new CrewMember(crewName);
  }

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
  larder(item: string): number {
    return this._larder.get(item) ?? 0;
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

  drainEvents(): HabitatEvent[] {
    const out = this._events;
    this._events = [];
    return out;
  }

  tick(dtDays: number): void {
    const t = HABITAT_TUNING;
    this.crew.tick(dtDays);
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
          p.damage(t.biteSeverity);
          this._scenarios.set(p.id, `${c.name} mordisqueó ${p.species.name.toLowerCase()} (${p.id})`);
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
          const why = `${a.name} y ${b.name} se bufaron`;
          this._scenarios.set(a.id, why);
          this._scenarios.set(b.id, why);
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

  /**
   * A jolt shakes the ship (a furious asteroid throwing it off): pots tip over, cats panic, the crew
   * is shaken. `severity` 0..1. The ship's own hull damage is applied by the flight side.
   */
  jolt(severity: number, cause: string): void {
    const s = Math.min(1, Math.max(0, severity));
    for (const p of this._plants.values()) {
      if (!p.alive) continue;
      p.damage(s * (0.2 + 0.3 * this.rng()));
      this._scenarios.set(p.id, `${cause}: la maceta de ${p.species.name.toLowerCase()} (${p.id}) se volcó`);
    }
    for (const c of this._cats.values()) {
      c.startle(0.6 * s);
      this._scenarios.set(c.id, `${cause}: ${c.name} se escondió temblando`);
    }
    this.crew.startle(0.3 * s);
    this._scenarios.set("nave", `${cause}: el casco tiene daños`);
    this._events.push({ type: "jolt", severity: s });
  }

  /** Everything that needs doing right now, each as a chain of code challenges. */
  chores(recipes: readonly Recipe[], yoga: readonly YogaSequence[]): Chore[] {
    const out: Chore[] = [];
    for (const p of this._plants.values()) out.push(...plantChores(p, this._scenarios.get(p.id)));
    for (const c of this._cats.values()) out.push(...catChores(c, this._scenarios.get(c.id)));
    if (this.ship && this.ship.hullIntegrity < 0.999) out.push(repairChore(this.ship.design, this.ship.hullIntegrity, this._repairs + 3, this._scenarios.get("nave")));
    for (const r of recipes) if (this.canCook(r)) out.push(cookingChore(r));
    for (const y of yoga) out.push(yogaChore(y));
    return out;
  }

  canCook(r: Recipe): boolean {
    return Object.entries(r.crops).every(([item, n]) => this.larder(item) >= n);
  }

  /** Start a chore; its effect is applied when every challenge is solved. */
  start(chore: Chore, context: { recipes?: readonly Recipe[]; yoga?: readonly YogaSequence[] } = {}): ChoreSession {
    const run = new ChoreRun(chore);
    const plant = chore.targetId ? this._plants.get(chore.targetId) : undefined;
    const cat = chore.targetId ? this._cats.get(chore.targetId) : undefined;
    const steps = chore.exercises.length;
    const onStep = (i: number) => {
      if (chore.kind === "yoga") {
        this.crew.practice(steps);
        this._events.push({ type: "posture", sequenceId: chore.targetId!, index: i });
      }
    };
    const onDone = () => {
      switch (chore.kind) {
        case "curar-planta":
          plant!.tend();
          this._scenarios.delete(plant!.id);
          break;
        case "regar":
          plant!.waterIt();
          break;
        case "agitar":
          plant!.shake();
          break;
        case "cosechar": {
          const h = plant!.harvest();
          this._larder.set(plant!.species.id, this.larder(plant!.species.id) + h.portions);
          break;
        }
        case "alimentar-gato":
          cat!.feed(cat!.dailyKcal / 2);
          break;
        case "calmar-gato":
          cat!.playWith();
          cat!.pet();
          cat!.startle(-0.4);
          this._scenarios.delete(cat!.id);
          break;
        case "cocinar": {
          const r = context.recipes?.find((x) => x.id === chore.targetId);
          if (!r || !this.canCook(r)) throw new Error(`Cannot cook ${chore.targetId}`);
          for (const [item, n] of Object.entries(r.crops)) this._larder.set(item, this.larder(item) - n);
          this.meals += r.portions;
          this.crew.eat();
          break;
        }
        case "reparar-nave":
          this.ship?.repair(HABITAT_TUNING.repairPerChore);
          this._repairs++;
          if ((this.ship?.hullIntegrity ?? 1) >= 0.999) this._scenarios.delete("nave");
          break;
        case "yoga":
          break;
      }
      this._events.push({ type: "chore-done", choreId: chore.id });
    };
    const onFailed = () => this._events.push({ type: "chore-failed", choreId: chore.id });
    return new ChoreSession(run, onStep, onDone, onFailed);
  }

  /** Talk to a cat's mind to write a rule into it. Failing annoys the cat. */
  talkToCat(catId: string, lesson: CatLesson): Conversation {
    const cat = this.get(this._cats, catId);
    return new Conversation(
      MindDuel.start(HABITAT_TUNING.catTalk, lesson.exercises, this._seed++),
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
