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
import {
  bioreactorChores,
  catChores,
  catLessonChore,
  catMeal,
  cookingChore,
  henChores,
  machineRepairChore,
  patientChore,
  plantChores,
  processChore,
  repairChore,
  stepPool,
  yogaChore,
} from "@modules/chores/application/catalog";
import type { Stimulus } from "@modules/pets/domain/behavior";
import type { Hen } from "@modules/poultry/domain/hen";
import { Bioreactor, type CultureStage } from "@modules/cultured-meat/domain/bioreactor";
import { Machine, type MachineId, type MachineSpec } from "@modules/life-support/domain/machine";
import type { Process } from "@modules/kitchen/data/processes";
import type { Patient } from "@modules/medical/domain/health";

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
  | { type: "posture"; sequenceId: string; index: number }
  | { type: "cat-grass"; catId: string }
  | { type: "hens-stalked"; catId: string }
  | { type: "cats-fought"; a: string; b: string }
  | { type: "eggs-laid"; count: number }
  | { type: "culture-stage"; stage: CultureStage }
  | { type: "machine-broken"; machineId: MachineId }
  | { type: "injured"; patientId: string; cause: string };

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
  /** Cats that would bite a plant chew the cat grass instead, if it is ready (Hart et al. 2021: plant eating is normal). */
  catGrassRedirect: 0.7,
  henVisitsPerDay: 1.5,
  stalkStress: 0.4,
  stalkInjuryChance: 0.25,
  /** A hiss between cats this stressed can turn into a fight. */
  fightStress: 0.6,
  fightChance: 0.5,
  toxicBiteSeverity: 0.5,
  /** Hours of light in the coop (Merck: 14–16 h for laying hens). */
  coopLightHours: 16,
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

/** What a chore may need to look up when it is started. */
export interface ChoreContext {
  readonly recipes?: readonly Recipe[];
  readonly yoga?: readonly YogaSequence[];
  readonly processes?: readonly Process[];
  readonly lessons?: readonly CatLesson[];
}

/**
 * Life on board during long legs: plants grow, cats and hens live, the bioreactor grows meat, the
 * crew needs food, yoga and sometimes the sickbay, and machines and hull need repairs. Everything
 * the player does here is a code challenge (a chore). Time in days. Randomness is injected.
 */
export class Habitat {
  private readonly _plants = new Map<string, Plant>();
  private readonly _cats = new Map<string, Cat>();
  private readonly _hens = new Map<string, Hen>();
  private readonly _intros: Introduction[] = [];
  private readonly _larder = new Map<string, number>();
  private readonly _scenarios = new Map<string, string>();
  private readonly _machines = new Map<MachineId, Machine>();
  /** Which stimuli each cat has met: programming a cat makes sense once the problem showed up. */
  private readonly _seen = new Map<string, Map<Stimulus, string>>();
  private _events: HabitatEvent[] = [];
  private _seed = 1;
  private _repairs = 0;
  nestEggs = 0;
  meals = 0;
  lightsOn = true;
  readonly crew: CrewMember;
  readonly bioreactor = new Bioreactor();

  constructor(
    private readonly rng: () => number,
    /** Litter boxes, bowls, beds… the scarcest of them. AAFP: one per cat plus one. */
    public resourceSets = 2,
    readonly ship?: RepairableShip,
    crewName = "Tripulante",
    machines: readonly MachineSpec[] = [],
  ) {
    this.crew = new CrewMember(crewName);
    for (const m of machines) this._machines.set(m.id, new Machine(m));
  }

  get plants(): readonly Plant[] {
    return [...this._plants.values()];
  }
  get cats(): readonly Cat[] {
    return [...this._cats.values()];
  }
  get hens(): readonly Hen[] {
    return [...this._hens.values()];
  }
  get machines(): readonly Machine[] {
    return [...this._machines.values()];
  }
  /** Everyone the sickbay looks after: the crew, the cats, the hens (and future characters). */
  get patients(): readonly Patient[] {
    return [this.crew, ...this._cats.values(), ...this._hens.values()];
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
  stock(item: string, amount: number): void {
    this._larder.set(item, this.larder(item) + amount);
  }
  machine(id: MachineId): Machine | undefined {
    return this._machines.get(id);
  }
  /** A machine that is not installed counts as working (simpler setups and tests). */
  working(id: MachineId | string | undefined): boolean {
    if (!id) return true;
    return this._machines.get(id as MachineId)?.working ?? true;
  }

  plant(id: string, species: PlantSpecies): Plant {
    const p = new Plant(id, species);
    this._plants.set(id, p);
    return p;
  }

  /** Bring a cat aboard. Every resident must be introduced to it step by step. */
  adopt(cat: Cat): Introduction[] {
    const made: Introduction[] = [];
    for (const resident of this._cats.values()) {
      const intro = new Introduction(cat.id, resident.id);
      this._intros.push(intro);
      made.push(intro);
    }
    this._cats.set(cat.id, cat);
    return made;
  }

  addHen(hen: Hen): void {
    this._hens.set(hen.id, hen);
  }

  drainEvents(): HabitatEvent[] {
    const out = this._events;
    this._events = [];
    return out;
  }

  tick(dtDays: number): void {
    const t = HABITAT_TUNING;
    this.crew.tick(dtDays);
    const lit = this.lightsOn && this.working("bastidores");
    for (const p of this._plants.values()) {
      const wasAlive = p.alive;
      p.tick(dtDays, { lit });
      if (wasAlive && !p.alive) this._events.push({ type: "plant-died", plantId: p.id });
    }
    for (const c of this._cats.values()) c.tick(dtDays, { resourcesOk: this.resourcesOk });
    const light = this.lightsOn && this.working("gallinero") ? t.coopLightHours : 0;
    let eggs = 0;
    for (const h of this._hens.values()) eggs += h.tick(dtDays, light);
    if (eggs) {
      this.nestEggs += eggs;
      this._events.push({ type: "eggs-laid", count: eggs });
    }
    if (this.working("biorreactor")) {
      const before = this.bioreactor.stage;
      this.bioreactor.tick(dtDays);
      if (this.bioreactor.stage !== before) this._events.push({ type: "culture-stage", stage: this.bioreactor.stage });
    }

    // Curious cats visit new plants; ready cat grass draws most bites away.
    const grass = this.plants.find((p) => p.species.forCats && p.alive && p.developmentDays >= (p.species.harvestDays.value[0] ?? 0));
    for (const c of this._cats.values()) {
      for (const p of this._plants.values()) {
        if (!p.isNew || !p.alive || p.species.forCats || !this.happens(t.plantVisitsPerDay, dtDays)) continue;
        const act = decide(c, "planta-nueva", this.rng);
        if (act !== "morder-planta") {
          this._events.push({ type: "plant-sniffed", catId: c.id, plantId: p.id });
          continue;
        }
        if (grass && this.rng() < t.catGrassRedirect) {
          this._events.push({ type: "cat-grass", catId: c.id });
          continue;
        }
        p.damage(t.biteSeverity);
        const what = `${c.name} mordisqueó ${p.species.name.toLowerCase()} (${p.id})`;
        this._scenarios.set(p.id, what);
        this.see(c.id, "planta-nueva", what);
        this._events.push({ type: "plant-bitten", catId: c.id, plantId: p.id });
        if (p.species.toxicToCats.value === "toxic") {
          c.health.add("intoxicacion", t.toxicBiteSeverity, `${what}, que es tóxica para gatos`);
          this._events.push({ type: "injured", patientId: c.id, cause: "intoxicación" });
        }
      }
    }

    // Cats and hens: an unprogrammed cat stalks them.
    if (this._hens.size) {
      for (const c of this._cats.values()) {
        if (!this.happens(t.henVisitsPerDay, dtDays) || decide(c, "gallina", this.rng) !== "acechar") continue;
        const what = `${c.name} acechó a las gallinas`;
        for (const h of this._hens.values()) h.startle(t.stalkStress);
        this._scenarios.set("gallinas", what);
        this.see(c.id, "gallina", what);
        this._events.push({ type: "hens-stalked", catId: c.id });
        if (this.rng() < t.stalkInjuryChance) {
          const hens = this.hens;
          const h = hens[Math.floor(this.rng() * hens.length)]!;
          h.health.add("herida", 0.4, `${c.name} atacó a ${h.name}`);
          this._events.push({ type: "injured", patientId: h.id, cause: "herida" });
        }
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
          let why = `${a.name} y ${b.name} se bufaron`;
          if (Math.max(a.stress, b.stress) >= t.fightStress && this.rng() < t.fightChance) {
            why = `${a.name} y ${b.name} se pelearon`;
            a.health.add("herida", 0.35 + 0.2 * this.rng(), why, true);
            b.health.add("herida", 0.35 + 0.2 * this.rng(), why, true);
            intro.regress();
            this._events.push({ type: "cats-fought", a: a.id, b: b.id });
          } else this._events.push({ type: "cats-hissed", a: a.id, b: b.id });
          this._scenarios.set(a.id, why);
          this._scenarios.set(b.id, why);
          this.see(a.id, "gato-desconocido", why);
          this.see(b.id, "gato-desconocido", why);
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
   * A jolt shakes the ship (a furious asteroid throwing it off): pots tip over, animals panic, the
   * crew may be hurt, the bioreactor may be contaminated and machines break. `severity` 0..1.
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
    for (const h of this._hens.values()) h.startle(0.7 * s);
    if (this._hens.size) this._scenarios.set("gallinas", `${cause}: las gallinas dejaron de poner del susto`);
    this.crew.startle(0.3 * s);
    if (s >= 0.5) {
      this.crew.health.add("contusion", 0.3 + 0.4 * s, `${cause}: ${this.crew.name} se golpeó contra un mamparo`);
      this._events.push({ type: "injured", patientId: this.crew.id, cause: "contusión" });
    }
    if (this.bioreactor.stage !== "vacio" && this.rng() < 0.6 * s) {
      this.bioreactor.contaminate();
      this._scenarios.set("cultivo", `${cause}: se abrió una junta y entraron bacterias en el biorreactor`);
      this._events.push({ type: "culture-stage", stage: this.bioreactor.stage });
    }
    const machines = this.machines;
    for (let k = 0; k < Math.min(2, machines.length); k++) {
      const m = machines[Math.floor(this.rng() * machines.length)]!;
      const was = m.working;
      m.damage(0.3 + 0.4 * s);
      this._scenarios.set(`maq:${m.id}`, `${cause}: ${m.spec.name.toLowerCase()} quedó dañado`);
      if (was && !m.working) this._events.push({ type: "machine-broken", machineId: m.id });
    }
    this._scenarios.set("nave", `${cause}: el casco tiene daños`);
    this._events.push({ type: "jolt", severity: s });
  }

  /** Everything that needs doing right now, each as a chain of code challenges. */
  chores(recipes: readonly Recipe[], yoga: readonly YogaSequence[], more: { processes?: readonly Process[]; lessons?: readonly CatLesson[] } = {}): Chore[] {
    const processes = more.processes ?? [];
    const pool = stepPool([...recipes.map((r) => r.steps.value), ...processes.map((p) => p.steps.value)]);
    const out: Chore[] = [];
    for (const m of this._machines.values()) if (!m.working) out.push(machineRepairChore(m, this._repairs, this._scenarios.get(`maq:${m.id}`)));
    for (const pt of this.patients) for (const c of pt.health.untreated) out.push(patientChore(pt, c, pool));
    for (const p of this._plants.values()) out.push(...plantChores(p, this._scenarios.get(p.id)));
    const food = { meatG: this.larder("carne-cultivada"), kibbleG: this.larder("pienso-gatos") };
    for (const c of this._cats.values()) {
      out.push(...catChores(c, this._scenarios.get(c.id), food));
      for (const l of more.lessons ?? []) {
        const why = this._seen.get(c.id)?.get(l.rule.when);
        if (why && !c.rules.some((r) => r.id === l.rule.id)) out.push(catLessonChore(c, l, `${why}: escríbele una regla`));
      }
    }
    out.push(...henChores(this.hens, this.nestEggs, this.larder("pienso-gallinas"), this.lightsOn && this.working("gallinero") ? HABITAT_TUNING.coopLightHours : 0));
    out.push(...bioreactorChores(this.bioreactor, this.larder("medio-cultivo"), this._scenarios.get("cultivo")));
    for (const p of processes) if (this.has(p.inputs)) out.push(processChore(p, pool));
    if (this.ship && this.ship.hullIntegrity < 0.999) out.push(repairChore(this.ship.design, this.ship.hullIntegrity, this._repairs + 3, this._scenarios.get("nave")));
    for (const r of recipes) if (this.canCook(r)) out.push(cookingChore(r, pool));
    for (const y of yoga) out.push(yogaChore(y));
    // A broken machine blocks its chores, except its own repair.
    return out.filter((c) => c.kind === "reparar-maquina" || this.working(c.machine));
  }

  canCook(r: Recipe): boolean {
    return this.has(r.ingredients);
  }

  private has(items: Readonly<Record<string, number>>): boolean {
    return Object.entries(items).every(([item, n]) => this.larder(item) >= n);
  }
  private use(items: Readonly<Record<string, number>>): void {
    for (const [item, n] of Object.entries(items)) this._larder.set(item, this.larder(item) - n);
  }

  /** Start a chore; its effect is applied when every challenge is solved. */
  start(chore: Chore, context: ChoreContext = {}): ChoreSession {
    const run = new ChoreRun(chore, Math.max(2, Math.ceil(chore.exercises.length / 3)));
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
          this.stock(plant!.species.id, h.portions);
          break;
        }
        case "alimentar-gato": {
          const meal = catMeal(cat!, { meatG: this.larder("carne-cultivada"), kibbleG: this.larder("pienso-gatos") });
          if (!meal) throw new Error(`No food for ${cat!.id}`);
          this.stock(meal.food === "meat" ? "carne-cultivada" : "pienso-gatos", -meal.grams);
          cat!.feed(meal.kcal);
          break;
        }
        case "calmar-gato":
          cat!.playWith();
          cat!.pet();
          cat!.startle(-0.4);
          this._scenarios.delete(cat!.id);
          break;
        case "programar-gato": {
          const lesson = context.lessons?.find((l) => chore.id === `programar-${cat!.id}-${l.rule.id}`);
          if (!lesson) throw new Error(`Unknown lesson for ${chore.id}`);
          cat!.learn(lesson.rule);
          this._events.push({ type: "rule-learned", catId: cat!.id, ruleId: lesson.rule.id });
          break;
        }
        case "alimentar-gallinas":
          this.stock("pienso-gallinas", -1);
          for (const h of this._hens.values()) h.feed();
          break;
        case "recoger-huevos":
          this.stock("huevo", this.nestEggs);
          this.nestEggs = 0;
          this._scenarios.delete("gallinas");
          break;
        case "procesar": {
          const p = context.processes?.find((x) => x.id === chore.targetId);
          if (!p || !this.has(p.inputs)) throw new Error(`Cannot process ${chore.targetId}`);
          this.use(p.inputs);
          for (const [item, n] of Object.entries(p.outputs)) this.stock(item, n);
          break;
        }
        case "cultivo-sembrar":
          this.stock("medio-cultivo", -1);
          this.bioreactor.seed();
          break;
        case "cultivo-renovar":
          this.stock("medio-cultivo", -1);
          this.bioreactor.renewMedium();
          break;
        case "cultivo-diferenciar":
          this.bioreactor.differentiate();
          break;
        case "cultivo-cosechar":
          this.stock("carne-cultivada", this.bioreactor.harvest());
          break;
        case "cultivo-esterilizar":
          this.bioreactor.sterilize();
          this._scenarios.delete("cultivo");
          break;
        case "reparar-maquina":
          this._machines.get(chore.targetId as MachineId)?.repair();
          this._scenarios.delete(`maq:${chore.targetId}`);
          this._repairs++;
          break;
        case "atender-paciente": {
          const pt = this.patients.find((x) => x.id === chore.targetId);
          pt?.health.treat(chore.conditionId!);
          break;
        }
        case "cocinar": {
          const r = context.recipes?.find((x) => x.id === chore.targetId);
          if (!r || !this.canCook(r)) throw new Error(`Cannot cook ${chore.targetId}`);
          this.use(r.ingredients);
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

  private see(catId: string, stimulus: Stimulus, why: string): void {
    if (!this._seen.has(catId)) this._seen.set(catId, new Map());
    this._seen.get(catId)!.set(stimulus, why);
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
