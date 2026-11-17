import { FAMILY_TUNING } from "@modules/family/domain/family";

/**
 * The ring aquarium (docs/design/santuario-espacial.md, «Acuario del anillo»): 1 m³ of fresh water on the
 * mothership's farm deck at 1 g, with a school of medaka, snails, cherry shrimp, hornwort and a nitrifying
 * biofilter. The loop is C.E.B.A.S.'s and the AQH's: hornwort makes oxygen and takes nitrate, the animals
 * eat and excrete, the bacteria turn ammonia into nitrate.
 *
 * Canon (Berón, 2026-11-14): the fish are friends, never food. Doménica befriends the school by writing a
 * rule into its mind, and then can ask the snails or the fish for help: another mind program.
 *
 * Units: mg/L, days. Rates are game values anchored on real ones (AQUARIUM_TUNING).
 */
export const AQUARIUM_TUNING = {
  volumeL: 1000,
  /** A gentle stocking: 40 adult medaka of ~0,5 g (game value; hobby guides allow far more). */
  fishCount: 40,
  fishMassG: 0.5,
  snailCount: 12,
  /** Daily ration, fraction of body mass (2–3 % is usual for small fish; game value). */
  feedFraction: 0.03,
  /** Feed protein and the classic aquaculture rule: TAN = feed × protein × 0,092. */
  feedProtein: 0.4,
  tanPerProtein: 0.092,
  /** A cycled biofilter clears ammonia fast: first-order, per day (game value). */
  biofilterPerDay: 5,
  /** Nitrate made per mg of ammonia nitrified (NO₃⁻ / NH₄⁺-N mass ratio ≈ 4,43). */
  nitratePerAmmonia: 4.43,
  /** Hornwort uptake of nitrate, per day and per 100 g of plant (game value). */
  hornwortUptakePerDayPer100G: 0.001,
  hornwortG: 200,
  /** Algae film on the glass, 0..1 a day under the LED day (game value), faster with nitrate. */
  algaePerDay: 0.06,
  /** What a dozen snails scrape on their own, and what they scrape when asked (0..1 a day). */
  snailGrazePerDay: 0.03,
  snailHelpGrazePerDay: 0.25,
  /** Snails asked for help go straight up the glass: what they clear at once. */
  snailHelpStart: 0.15,
  hungerPerDay: 0.25,
  /** Nitrate where a water change is due; with the medaka asked to warn, earlier. */
  nitrateChangeMgL: 40,
  nitrateWarnMgL: 30,
  /** Ammonia that harms fish (TAN, mg/L; game threshold). */
  ammoniaHarmMgL: 0.5,
  nitrateHarmMgL: 80,
  healthLossPerDay: 0.15,
  healthGainPerDay: 0.1,
  /** How long a help program runs before they go back to their own life, days. */
  helpDays: 10,
  /** How much calmer the crew gets per day with friends in the tank (Cracknell et al. 2016; game value). */
  friendsCalmPerDay: 0.03,
} as const;

export type AquariumHelper = "caracoles-limpian" | "medakas-avisan";
export const AQUARIUM_HELPERS: readonly AquariumHelper[] = ["caracoles-limpian", "medakas-avisan"];

/** Who in the tank: the fish school or the snails (each has its own friendship). */
export type AquariumGroup = "banco" | "caracoles";

export type AquariumEvent =
  | { readonly type: "amigos"; readonly who?: AquariumGroup }
  | { readonly type: "ayuda"; readonly helper: AquariumHelper }
  | { readonly type: "ayuda-terminada"; readonly helper: AquariumHelper }
  /** The medaka gather at the front glass and the surface: something in the water is off. */
  | { readonly type: "aviso"; readonly reason: "nitrato" | "amonio" };

export interface AquariumNeeds {
  readonly feed: boolean;
  readonly cleanGlass: boolean;
  readonly changeWater: boolean;
}

export interface AquariumInit {
  readonly nitrateMgL?: number;
  readonly ammoniaMgL?: number;
  readonly algae?: number;
  readonly hunger?: number;
  readonly hornwortG?: number;
  readonly fishHealth?: number;
  /**
   * Fish and snails in the tank (default: the tuned school and dozen snails). A new game starts with an empty
   * tank (Berón, 2026-11-16: «al principio es Doménica sola»): only hornwort and the cycled biofilter; the
   * animals come through the species catalogue (modules/adoption).
   */
  readonly fish?: number;
  readonly snails?: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export class RingAquarium {
  readonly volumeL = AQUARIUM_TUNING.volumeL;
  private _fish: number;
  private _snails: number;
  /** What the player calls the school, with its article («las medakas», «los peces»): the first fish that came. */
  private _fishName = "las medakas";
  private _snailBond = 0;
  private _nitrate: number;
  private _ammonia: number;
  private _algae: number;
  private _hunger: number;
  private _health: number;
  private readonly hornwortG: number;
  private _bond = 0;
  private readonly _help = new Map<AquariumHelper, number>();
  private warned = new Set<"nitrato" | "amonio">();

  constructor(init: AquariumInit = {}) {
    this._nitrate = init.nitrateMgL ?? 38;
    this._ammonia = init.ammoniaMgL ?? 0;
    this._algae = init.algae ?? 0.45;
    this._hunger = init.hunger ?? 0.6;
    this._health = init.fishHealth ?? 1;
    this.hornwortG = init.hornwortG ?? AQUARIUM_TUNING.hornwortG;
    this._fish = init.fish ?? AQUARIUM_TUNING.fishCount;
    this._snails = init.snails ?? AQUARIUM_TUNING.snailCount;
  }

  get fishCount(): number {
    return this._fish;
  }
  get snailCount(): number {
    return this._snails;
  }
  /** «las medakas», «los peces cebra», or «los peces» when two kinds share the tank. */
  get fishName(): string {
    return this._fishName;
  }
  /** The school's name without its article («medakas»). */
  get fishBare(): string {
    return this._fishName.replace(/^(las|los) /, "");
  }
  /** Feminine plural (las medakas): «amigas» rather than «amigos». */
  get fishFeminine(): boolean {
    return this._fishName.startsWith("las ");
  }

  /**
   * Animals arrive (adopted from the catalogue): `name` is the plural the player reads. Fish that arrive come
   * hungry from the trip; the first ones name the school.
   */
  stock(group: AquariumGroup, n: number, name?: string): void {
    if (n <= 0) return;
    if (group === "banco") {
      if (this._fish === 0) {
        this._fishName = name ?? this._fishName;
        this._hunger = Math.max(this._hunger, 0.6);
      } else if (name && name !== this._fishName) this._fishName = "los peces";
      this._fish += n;
    } else this._snails += n;
  }

  /**
   * Animals leave for another tank (a transfer between vehicles): all of a group, or `n`. Returns how many went.
   * The school's name goes with them when the last fish leaves.
   */
  release(group: AquariumGroup, n = Infinity): number {
    const k = Math.max(0, Math.min(n, group === "banco" ? this._fish : this._snails));
    if (group === "banco") this._fish -= k;
    else this._snails -= k;
    return k;
  }

  /** Doménica ↔ the snails, 0..1: their own friendship (a mind program), apart from the school's. */
  get snailFriends(): boolean {
    return this._snailBond >= FAMILY_TUNING.familyAt;
  }
  get canBefriendSnails(): boolean {
    return this._snails > 0 && !this.snailFriends;
  }

  get nitrateMgL(): number {
    return this._nitrate;
  }
  get ammoniaMgL(): number {
    return this._ammonia;
  }
  /** Algae film on the glass, 0 (clear) to 1 (green). */
  get algae(): number {
    return this._algae;
  }
  get hunger(): number {
    return this._hunger;
  }
  get fishHealth(): number {
    return this._health;
  }
  /** Doménica ↔ the school, 0..1 (the family module's scale). */
  get bond(): number {
    return this._bond;
  }
  get friends(): boolean {
    return this._bond >= FAMILY_TUNING.familyAt;
  }
  /** They have met her calmly at least once and are not friends yet. */
  get canBefriend(): boolean {
    return this._fish > 0 && this._bond > 0 && !this.friends;
  }
  helping(h: AquariumHelper): boolean {
    return (this._help.get(h) ?? 0) > 0;
  }
  get calmPerDay(): number {
    return this.friends || this.snailFriends ? AQUARIUM_TUNING.friendsCalmPerDay : 0;
  }

  get needs(): AquariumNeeds {
    const t = AQUARIUM_TUNING;
    const limit = this.helping("medakas-avisan") ? t.nitrateWarnMgL : t.nitrateChangeMgL;
    return {
      feed: this._fish > 0 && this._hunger >= 0.5,
      cleanGlass: this._algae >= 0.4 && !this.helping("caracoles-limpian"),
      changeWater: this._nitrate >= limit || this._ammonia >= t.ammoniaHarmMgL,
    };
  }

  tick(days: number): AquariumEvent[] {
    if (days <= 0) return [];
    const t = AQUARIUM_TUNING;
    const out: AquariumEvent[] = [];
    // Ammonia from the fish (what they eat), nitrified by the biofilter into nitrate.
    const feedG = this.fishCount * t.fishMassG * t.feedFraction;
    const tanMgLPerDay = (feedG * 1000 * t.feedProtein * t.tanPerProtein) / this.volumeL;
    const nitrified = this._ammonia * Math.min(1, t.biofilterPerDay * days);
    this._ammonia = Math.max(0, this._ammonia + tanMgLPerDay * days - nitrified);
    const uptake = this._nitrate * t.hornwortUptakePerDayPer100G * (this.hornwortG / 100) * days;
    this._nitrate = Math.max(0, this._nitrate + nitrified * t.nitratePerAmmonia - uptake);
    // Algae under the LED day, faster with nitrate; snails graze, much more when asked.
    // Grazing scales with the snails there are (the tuned dozen scrape `snailGrazePerDay`).
    const graze = (t.snailGrazePerDay * Math.min(this._snails, t.snailCount)) / t.snailCount + (this.helping("caracoles-limpian") ? t.snailHelpGrazePerDay : 0);
    this._algae = clamp01(this._algae + (t.algaePerDay * (0.5 + this._nitrate / 40) - graze) * days);
    if (this._fish > 0) this._hunger = clamp01(this._hunger + t.hungerPerDay * days);
    const stressed = this._hunger > 0.9 || this._nitrate > t.nitrateHarmMgL || this._ammonia > t.ammoniaHarmMgL;
    this._health = clamp01(this._health + (stressed ? -t.healthLossPerDay : t.healthGainPerDay) * days);
    for (const [h, left] of this._help) {
      const now = left - days;
      if (now <= 0) {
        this._help.delete(h);
        out.push({ type: "ayuda-terminada", helper: h });
      } else this._help.set(h, now);
    }
    out.push(...this.signals());
    return out;
  }

  /** The medaka asked to warn gather at the glass once per problem (it re-arms when the water is good again). */
  private signals(): AquariumEvent[] {
    const out: AquariumEvent[] = [];
    const t = AQUARIUM_TUNING;
    const on = { nitrato: this._nitrate >= t.nitrateWarnMgL, amonio: this._ammonia >= t.ammoniaHarmMgL / 2 } as const;
    for (const reason of ["nitrato", "amonio"] as const) {
      if (!on[reason]) this.warned.delete(reason);
      else if (this.helping("medakas-avisan") && !this.warned.has(reason)) {
        this.warned.add(reason);
        out.push({ type: "aviso", reason });
      }
    }
    return out;
  }

  /** Every care visit done calmly is a warm meeting (the family module's rule). */
  private meet(): void {
    this._bond = clamp01(this._bond + FAMILY_TUNING.warmMeetingBond);
  }

  feed(): void {
    this._hunger = 0;
    this.meet();
  }

  cleanGlass(): void {
    this._algae = Math.min(this._algae, 0.03);
    this.meet();
  }

  /** Replace `fraction` of the water with clean, conditioned water at tank temperature. */
  changeWater(fraction: number): void {
    const f = clamp01(fraction);
    this._nitrate *= 1 - f;
    this._ammonia *= 1 - f;
    if (f > 0) this.meet();
  }

  /** The «make friends» program was written into the school's mind (or the snails'). */
  befriend(who: AquariumGroup = "banco"): AquariumEvent[] {
    if (who === "caracoles") {
      if (this.snailFriends || this._snails === 0) return [];
      this._snailBond = Math.max(FAMILY_TUNING.familyAt, clamp01(this._snailBond + 0.6));
      return [{ type: "amigos", who }];
    }
    if (this.friends) return [];
    this._bond = Math.max(FAMILY_TUNING.familyAt, clamp01(this._bond + 0.6));
    return [{ type: "amigos", who }];
  }

  /** A help program was written: the snails or the fish do a task for a while. Only friends help. */
  ask(h: AquariumHelper): AquariumEvent[] {
    const friends = h === "caracoles-limpian" ? this.snailFriends : this.friends;
    if (!friends) throw new Error("Solo ayudan los amigos: primero haz amistad con ellos");
    this._help.set(h, AQUARIUM_TUNING.helpDays);
    if (h === "caracoles-limpian") this._algae = Math.max(0, this._algae - AQUARIUM_TUNING.snailHelpStart);
    return [{ type: "ayuda", helper: h }, ...this.signals()];
  }
}
