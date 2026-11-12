import type { Answer } from "@modules/mind-duel/domain/exercise";
import type { DuelProfile } from "@modules/mind-duel/domain/difficulty";
import { MindDuel } from "@modules/mind-duel/domain/duel";
import { Plant } from "@modules/garden/domain/plant";
import type { PlantSpecies } from "@modules/garden/domain/species";
import { decide, HOSTILE_ACTIONS, INSTINCTS_BY_SPECIES, WARM_ACTIONS, type AnimalAction, type AnimalRule } from "@modules/pets/domain/behavior";
import type { Cat } from "@modules/pets/domain/cat";
import type { Dog } from "@modules/pets/domain/dog";
import { Introduction } from "@modules/pets/domain/introduction";
import type { AnimalLesson, CatLesson } from "@modules/pets/data/rules";
import { Bonds, companionship, FAMILY_TUNING, type Family, type Member } from "@modules/family/domain/family";
import { CrewMember } from "@modules/crew/domain/crew-member";
import type { ShipDesign } from "@modules/ship/domain/ship";
import { withPart, type PartSlot } from "@modules/ship/domain/refit";
import { partById } from "@modules/ship/data/parts";
import type { Recipe } from "@modules/kitchen/data/recipes";
import { portionNutrients } from "@modules/kitchen/data/nutrition";
import type { YogaSequence } from "@modules/wellness/data/yoga";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import {
  bioreactorChores,
  catChores,
  catMeal,
  coopDoorChore,
  cookingChore,
  dogChores,
  dogMeal,
  lessonChore,
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
import type { Mailbox } from "@modules/story/domain/mailbox";
import { HEN_FEED_KCAL, selfSufficiency, type Eater, type Sustainability } from "@modules/life-support/domain/sustainability";

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
  | { type: "injured"; patientId: string; cause: string }
  | { type: "hen-pecked-plant"; henId: string; plantId: string }
  | { type: "animal-hostile"; actorId: string; targetId: string; action: AnimalAction }
  | { type: "animal-warm"; actorId: string; targetId: string; action: AnimalAction }
  | { type: "family-formed"; memberIds: readonly string[] };

/** The ship as the habitat sees it: its design (for its code) and its hull. */
export interface RepairableShip {
  readonly design: ShipDesign;
  readonly hullIntegrity: number;
  repair(fraction: number): void;
  /** Swap parts (ship bay). Optional so simple setups and tests can leave it out. */
  refit?(design: ShipDesign): void;
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
  /** Meetings per day between two animals of different species roaming the ship together. */
  encountersPerDay: 2,
  /** Free-range hens visit the farm deck's new seedlings. */
  henPlantVisitsPerDay: 1,
  henPeckSeverity: 0.2,
  hostileStartle: 0.3,
  chaseInjuryChance: 0.1,
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
  readonly lessons?: readonly AnimalLesson[];
}

type Animal = (Cat | Dog | Hen) & Member & { ruleFor: Cat["ruleFor"]; startle(a: number): void; readonly stress: number; readonly rules: readonly AnimalRule[] };

/**
 * Life on board during long legs: plants grow, cats and hens live, the bioreactor grows meat, the
 * crew needs food, yoga and sometimes the sickbay, and machines and hull need repairs. Everything
 * the player does here is a code challenge (a chore). Time in days. Randomness is injected.
 */
export class Habitat {
  private readonly _plants = new Map<string, Plant>();
  private readonly _cats = new Map<string, Cat>();
  private readonly _hens = new Map<string, Hen>();
  private readonly _dogs = new Map<string, Dog>();
  private readonly _familyKeys = new Set<string>();
  /** Stimuli each animal has met calmly: family lessons make sense once they know each other. */
  private readonly _met = new Map<string, Map<Stimulus, string>>();
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
  /** The coop door is programmed: hens roam the ship by day and sleep in the coop. */
  hensFree = false;
  readonly bonds = new Bonds();
  readonly crew: CrewMember;
  /** Gravity the crew member feels right now, in g (set by whoever knows where she is: ring floor, spoke, hub, cockpit). */
  crewGravityG: number | undefined = undefined;
  readonly bioreactor = new Bioreactor();
  /** The ship's radio: letters and their missions, if the story is on. */
  mailbox?: Mailbox;

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
  get dogs(): readonly Dog[] {
    return [...this._dogs.values()];
  }
  /** Cats, dogs and hens. */
  get animals(): readonly Animal[] {
    return [...this._cats.values(), ...this._dogs.values(), ...this._hens.values()] as Animal[];
  }
  /** Families of different species tied by strong bonds. */
  get families(): Family[] {
    return this.bonds.families(this.animals);
  }
  get machines(): readonly Machine[] {
    return [...this._machines.values()];
  }
  /** Everyone the sickbay looks after: the crew, the cats, the hens (and future characters). */
  get patients(): readonly Patient[] {
    return [this.crew, ...this._cats.values(), ...this._dogs.values(), ...this._hens.values()];
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

  /** A bed of one crop on the farm deck's artificial soil, watered by drip lines. */
  bed(id: string, species: PlantSpecies, areaM2: number): Plant {
    const p = new Plant(id, species, areaM2, true);
    this._plants.set(id, p);
    return p;
  }

  /** A fruit tree in a planter on the farm deck, taking the ground one tree needs; drip-watered. */
  tree(id: string, species: PlantSpecies): Plant {
    return this.bed(id, species, species.areaPerPlantM2?.value ?? 1);
  }

  /** Put a whole list of stores in the larder (e.g. the launch stock). */
  stockAll(items: Readonly<Record<string, number>>): void {
    for (const [item, n] of Object.entries(items)) this.stock(item, n);
  }

  /** How much of everyone's food the growing area can provide (1 = self-sufficient). */
  get sustainability(): Sustainability {
    const eaters: Eater[] = [
      { name: this.crew.name, kcal: this.crew.dailyKcal },
      ...[...this._cats.values(), ...this._dogs.values()].map((a) => ({ name: a.name, kcal: a.dailyKcal })),
      ...[...this._hens.values()].map((h) => ({ name: h.name, kcal: HEN_FEED_KCAL.value })),
    ];
    const area = this.plants.filter((p) => p.alive).reduce((s, p) => s + p.areaM2, 0);
    return selfSufficiency(area, eaters, this.crew.dailyKcal);
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

  addDog(dog: Dog): void {
    this._dogs.set(dog.id, dog);
  }

  drainEvents(): HabitatEvent[] {
    const out = this._events;
    this._events = [];
    return out;
  }

  tick(dtDays: number): void {
    const t = HABITAT_TUNING;
    this.crew.tick(dtDays, companionship(this.families), this.crewGravityG);
    this.mailbox?.tick(dtDays);
    const lit = this.lightsOn && this.working("bastidores");
    for (const p of this._plants.values()) {
      const wasAlive = p.alive;
      p.tick(dtDays, { lit });
      if (wasAlive && !p.alive) this._events.push({ type: "plant-died", plantId: p.id });
    }
    for (const c of this._cats.values()) c.tick(dtDays, { resourcesOk: this.resourcesOk });
    for (const d of this._dogs.values()) d.tick(dtDays, { resourcesOk: true });
    const light = this.lightsOn && this.working("gallinero") ? t.coopLightHours : 0;
    let eggs = 0;
    for (const h of this._hens.values()) eggs += h.tick(dtDays, light, this.hensFree);
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
        if (!this.happens(t.henVisitsPerDay, dtDays)) continue;
        const act = decide(c, "gallina", this.rng);
        if (act !== "acechar") {
          if (this.hensFree) {
            const hens = this.hens;
            this.meet(c, hens[Math.floor(this.rng() * hens.length)]!, "gallina", act);
          }
          continue;
        }
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
    this.encounters(dtDays);
  }

  /** Free hens, dogs and cats meeting around the ship; then families are checked. */
  private encounters(dtDays: number): void {
    const t = HABITAT_TUNING;
    if (this.hensFree) {
      for (const h of this._hens.values())
        for (const p of this._plants.values()) {
          if (!p.isNew || !p.alive || !this.happens(t.henPlantVisitsPerDay, dtDays)) continue;
          const act = decide(h, "planta-nueva", this.rng, INSTINCTS_BY_SPECIES.gallina);
          if (act !== "picotear") continue;
          p.damage(t.henPeckSeverity);
          const what = `${h.name} escarbó y picoteó ${p.species.name.toLowerCase()} (${p.id})`;
          this._scenarios.set(p.id, what);
          this.see(h.id, "planta-nueva", what);
          this._events.push({ type: "hen-pecked-plant", henId: h.id, plantId: p.id });
        }
    }
    const animals = this.animals.filter((a) => a.kind !== "gallina" || this.hensFree);
    for (const x of animals)
      for (const y of animals) {
        if (x === y) continue;
        // Cats meeting cats go through introductions; cats meeting hens are handled above.
        if (x.kind === "gato" && (y.kind === "gato" ? !y.young || x.young : y.kind === "gallina")) continue;
        const s = this.stimulusFor(x, y);
        if (!s || !this.happens(t.encountersPerDay, dtDays)) continue;
        this.meet(x, y, s, decide(x, s, this.rng, INSTINCTS_BY_SPECIES[x.kind]));
      }
    const families = this.families;
    for (const f of families) {
      const ids = f.members.map((m) => m.id).sort();
      const k = ids.join("|");
      if (this._familyKeys.has(k)) continue;
      this._familyKeys.add(k);
      this._events.push({ type: "family-formed", memberIds: ids });
      this.mailbox?.notify("familia");
    }
  }

  private stimulusFor(x: Animal, y: Animal): Stimulus | undefined {
    if (y.young && !x.young) return "cria";
    if (x.kind === "gallina") return undefined;
    if (y.kind === "gallina") return "gallina";
    if (y.kind === "perro" && x.kind === "gato") return "perro";
    if (y.kind === "gato" && x.kind === "perro") return "gato";
    return undefined;
  }

  /** `x` reacts to `y`: warm acts bond them (brooding a young one bonds fastest), hostile ones hurt. */
  private meet(x: Animal, y: Animal, s: Stimulus, decided: AnimalAction): void {
    const t = HABITAT_TUNING;
    const ft = FAMILY_TUNING;
    let act: AnimalAction = decided === "cobijar" && !(x.kind === "gallina" && (x as Hen).broody) ? "ignorar" : decided;
    // Family is family: an animal does not chase or peck the one it grew up with, whatever its instinct.
    if (HOSTILE_ACTIONS.has(act) && this.bonds.get(x.id, y.id) >= ft.familyAt) act = "acurrucarse";
    if (WARM_ACTIONS.has(act)) {
      this.remember(this._met, x.id, s, `${x.name} conoce a ${y.name}`);
      if (y.stress >= 0.5) return;
      const amount = ft.warmMeetingBond * (s === "cria" ? ft.motherBonus : 1);
      if (s === "cria") this.bonds.nurture(x.id, y.id, amount);
      else this.bonds.add(x.id, y.id, amount);
      this._events.push({ type: "animal-warm", actorId: x.id, targetId: y.id, action: act });
      return;
    }
    if (!HOSTILE_ACTIONS.has(act)) {
      this.remember(this._met, x.id, s, `${x.name} conoce a ${y.name}`);
      return;
    }
    y.startle(t.hostileStartle);
    this.bonds.add(x.id, y.id, -ft.hostileBondLoss);
    const verb: Partial<Record<AnimalAction, string>> = { perseguir: "persiguió", ladrar: "ladró", bufar: "bufó", picotear: "picoteó", acechar: "acechó" };
    const why = `${x.name} ${verb[act] ?? act} a ${y.name}`;
    this._scenarios.set(x.id, why);
    this.see(x.id, s, why);
    this._events.push({ type: "animal-hostile", actorId: x.id, targetId: y.id, action: act });
    if ((act === "perseguir" || act === "picotear") && this.rng() < t.chaseInjuryChance) {
      y.health.add("herida", 0.3, why);
      this._events.push({ type: "injured", patientId: y.id, cause: "herida" });
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
    for (const d of this._dogs.values()) {
      d.startle(0.6 * s);
      this._scenarios.set(d.id, `${cause}: ${d.name} ladra temblando bajo la cama`);
    }
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
    this.mailbox?.notify("sacudida");
  }

  /** Everything that needs doing right now, each as a chain of code challenges. */
  chores(recipes: readonly Recipe[], yoga: readonly YogaSequence[], more: { processes?: readonly Process[]; lessons?: readonly AnimalLesson[] } = {}): Chore[] {
    const processes = more.processes ?? [];
    const pool = stepPool([...recipes.map((r) => r.steps.value), ...processes.map((p) => p.steps.value)]);
    const out: Chore[] = [];
    for (const m of this._machines.values()) if (!m.working) out.push(machineRepairChore(m, this._repairs, this._scenarios.get(`maq:${m.id}`)));
    for (const pt of this.patients) for (const c of pt.health.untreated) out.push(patientChore(pt, c, pool));
    for (const p of this._plants.values()) out.push(...plantChores(p, this._scenarios.get(p.id)));
    const food = { meatG: this.larder("carne-cultivada"), kibbleG: this.larder("pienso-gatos") };
    for (const c of this._cats.values()) out.push(...catChores(c, this._scenarios.get(c.id), food));
    const dogFood = { meatG: this.larder("carne-cultivada"), eggs: this.larder("huevo") };
    for (const d of this._dogs.values()) out.push(...dogChores(d, this._scenarios.get(d.id), dogFood));
    out.push(...this.lessonChores(more.lessons ?? []));
    if (this._hens.size && !this.hensFree) out.push(coopDoorChore());
    out.push(...henChores(this.hens, this.nestEggs, this.larder("pienso-gallinas"), this.lightsOn && this.working("gallinero") ? HABITAT_TUNING.coopLightHours : 0));
    out.push(...bioreactorChores(this.bioreactor, this.larder("medio-cultivo"), this._scenarios.get("cultivo")));
    for (const p of processes) if (this.has(p.inputs)) out.push(processChore(p, pool));
    if (this.ship && this.ship.hullIntegrity < 0.999) out.push(repairChore(this.ship.design, this.ship.hullIntegrity, this._repairs + 3, this._scenarios.get("nave")));
    for (const r of recipes) if (this.canCook(r)) out.push(cookingChore(r, pool));
    for (const y of yoga) out.push(yogaChore(y));
    // Nevaeh's missions are nano_net work, done landed on a core (modules/nano-net), not chores on board.
    // A broken machine blocks its chores, except its own repair.
    return out.filter((c) => c.kind === "reparar-maquina" || this.working(c.machine));
  }

  /**
   * Lessons that make sense now. Level 1 rules that stop a problem appear once the problem showed
   * up; warm rules once the animals have met; level 2 (family) on top of the level-1 rule when the
   * animal ever caused that problem.
   */
  private lessonChores(lessons: readonly AnimalLesson[]): Chore[] {
    const out: Chore[] = [];
    const levelOf = (id: string | undefined) => (id ? (lessons.find((l) => l.rule.id === id)?.level ?? 1) : 0);
    for (const a of this.animals) {
      for (const l of lessons) {
        if ((l.species ?? "gato") !== a.kind) continue;
        if (l.broodyOnly && !(a as Hen).broody) continue;
        const current = a.rules.find((r) => r.when === l.rule.when);
        const level = l.level ?? 1;
        const problem = this._seen.get(a.id)?.get(l.rule.when);
        if (current?.id === l.rule.id || levelOf(current?.id) >= level) continue;
        // A family rule goes on top of the rule that solved a problem, if there ever was one.
        if (levelOf(current?.id) < level - 1 && problem) continue;
        const warm = WARM_ACTIONS.has(l.rule.then);
        const met = this._met.get(a.id)?.get(l.rule.when) ?? problem;
        if (!warm && problem) out.push(lessonChore(a, l, `${problem}: escríbele una regla`));
        else if (warm && met) out.push(lessonChore(a, l, `${met}: prográmalo para hacer familia`));
      }
    }
    return out;
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
        case "programar-animal": {
          const lesson = context.lessons?.find((l) => chore.id === `programar-${chore.targetId}-${l.rule.id}`);
          const animal = this.animals.find((a) => a.id === chore.targetId);
          if (!lesson || !animal) throw new Error(`Unknown lesson for ${chore.id}`);
          animal.learn(lesson.rule);
          this._events.push({ type: "rule-learned", catId: animal.id, ruleId: lesson.rule.id });
          break;
        }
        case "alimentar-perro": {
          const d = this._dogs.get(chore.targetId!)!;
          const meal = dogMeal(d, { meatG: this.larder("carne-cultivada"), eggs: this.larder("huevo") });
          if (!meal) throw new Error(`No food for ${d.id}`);
          this.stock(meal.food === "meat" ? "carne-cultivada" : "huevo", -meal.amount);
          d.feed(meal.kcal);
          break;
        }
        case "jugar-perro": {
          const d = this._dogs.get(chore.targetId!)!;
          d.playWith();
          d.pet();
          d.startle(-0.4);
          this._scenarios.delete(d.id);
          break;
        }
        case "abrir-gallinero":
          this.hensFree = true;
          break;
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
          // Doménica eats one portion: its real energy fills her satiety.
          this.crew.eatKcal(portionNutrients(r).kcal);
          break;
        }
        case "reparar-nave":
          this.ship?.repair(HABITAT_TUNING.repairPerChore);
          this._repairs++;
          if ((this.ship?.hullIntegrity ?? 1) >= 0.999) this._scenarios.delete("nave");
          break;
        case "cambiar-pieza": {
          const [slot, partId] = chore.targetId!.split(":") as [PartSlot, string];
          const part = partById(partId);
          if (this.ship && part) this.ship.refit?.(withPart(this.ship.design, slot, part));
          break;
        }
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

  private see(animalId: string, stimulus: Stimulus, why: string): void {
    this.remember(this._seen, animalId, stimulus, why);
  }

  private remember(map: Map<string, Map<Stimulus, string>>, id: string, stimulus: Stimulus, why: string): void {
    if (!map.has(id)) map.set(id, new Map());
    map.get(id)!.set(stimulus, why);
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
