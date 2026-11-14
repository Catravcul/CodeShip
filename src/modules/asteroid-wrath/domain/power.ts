import { G } from "@core/units";
import type { AsteroidData, CompositionEntry, SpectralType } from "@modules/celestial/domain/asteroid";

/**
 * What an angry asteroid can do, from its real data (mass, size, spectral type, composition).
 * Five tiers, each one adding to the arsenal and the reach of the one below.
 * See docs/design/poderes-ira.md.
 */
export type PowerTier = 1 | 2 | 3 | 4 | 5;

/** Who an attack can reach: the uncrewed probe, the crewed lander (and the crew in a suit), the travel ship, the station. */
export type TargetKind = "sonda" | "aterrizador" | "traje" | "nodriza" | "estacion";

/** `chorro`: a comet's outgassing jet (docs/design/importacion.md). */
export type Weapon = "roca" | "carga" | "pulso" | "nuclear" | "agarre" | "chorro";

export interface TierSpec {
  readonly tier: PowerTier;
  readonly name: string;
  /** One line for the player. */
  readonly summary: string;
  readonly reaches: readonly TargetKind[];
  readonly weapons: readonly Weapon[];
  /**
   * How far from the surface it can still steer and aim, m (game value). Past it the pursuit ends:
   * projectiles lose guidance and nothing new is thrown at what is beyond.
   */
  readonly reachM: number;
  /** Anger half-life, s of game time (game value). */
  readonly angerHalfLifeS: number;
  /** Seconds between throws at full anger (game value). */
  readonly fireIntervalS: number;
  /** Top speed of a thrown rock relative to the asteroid, m/s. */
  readonly rockSpeedMs: number;
  /** Guidance acceleration at the surface at full anger, m/s² (game value; falls with 1/r²). */
  readonly guidanceMs2: number;
}

/**
 * Game values, except the tier-1 rock speed: Bennu was seen throwing centimetre-sized particles at up to
 * about 3 m/s (Lauretta et al. 2019, Science 366:eaay3544).
 */
export const TIERS: Readonly<Record<PowerTier, TierSpec>> = {
  1: {
    tier: 1,
    name: "Rocas",
    summary: "Lanza piedras de su superficie y las guía con su gravedad",
    reaches: ["sonda"],
    weapons: ["roca"],
    reachM: 2000,
    angerHalfLifeS: 30,
    fireIntervalS: 3,
    rockSpeedMs: 3.3,
    guidanceMs2: 0.03,
  },
  2: {
    tier: 2,
    name: "Grandes proyectiles",
    summary: "Lanza bloques grandes: la energía crece con la masa y el cuadrado de la velocidad",
    reaches: ["sonda", "aterrizador", "traje"],
    weapons: ["roca"],
    reachM: 3000,
    angerHalfLifeS: 60,
    fireIntervalS: 3,
    rockSpeedMs: 15,
    guidanceMs2: 0.08,
  },
  3: {
    tier: 3,
    name: "Explosivos",
    summary: "Carga sus volátiles (agua, carbono) en rocas que revientan cerca de la nave",
    reaches: ["sonda", "aterrizador", "traje", "nodriza"],
    weapons: ["roca", "carga"],
    reachM: 5000,
    angerHalfLifeS: 120,
    fireIntervalS: 3.5,
    rockSpeedMs: 20,
    guidanceMs2: 0.12,
  },
  4: {
    tier: 4,
    name: "Átomos",
    summary: "Dispara radiación dirigida y, en lo más alto de su ira, cargas nucleares",
    reaches: ["sonda", "aterrizador", "traje", "nodriza", "estacion"],
    weapons: ["roca", "carga", "pulso", "nuclear"],
    reachM: 8000,
    angerHalfLifeS: 240,
    fireIntervalS: 4,
    rockSpeedMs: 25,
    guidanceMs2: 0.15,
  },
  5: {
    tier: 5,
    name: "Gravedad",
    summary: "Atrapa con su gravedad: cerca de él, escapar puede ser imposible",
    reaches: ["sonda", "aterrizador", "traje", "nodriza", "estacion"],
    weapons: ["roca", "carga", "pulso", "nuclear", "agarre"],
    reachM: 12000,
    angerHalfLifeS: 480,
    fireIntervalS: 4,
    rockSpeedMs: 30,
    guidanceMs2: 0.2,
  },
};

/** Thresholds of the tier rule (game values, each anchored in docs/design/poderes-ira.md). */
export const POWER_RULE = {
  /** Bodies above this diameter throw "big projectiles" instead of handfuls of rubble, m. */
  bigBodyDiameterM: 1000,
  /** Water plus carbon (mid of the ranges) that makes a body volatile-rich: Bennu has ~8 %, ordinary chondrites under 1 %. */
  volatileRichFraction: 0.05,
  /** Free metal (iron-nickel, platinum-group) that makes a body metallic. */
  metallicFraction: 0.3,
  /** Escape speed from which gravity itself is a weapon, m/s: the big asteroids (Vesta, Ceres), moons and planets. */
  gravityEscapeMs: 50,
} as const;

/** Volatiles assumed by spectral class when there is no composition (CI-like for B and C, as Bennu's sample). */
const ASSUMED_VOLATILES: Record<SpectralType, number> = { B: 0.082, C: 0.082, S: 0.005, M: 0, X: 0 };

const mid = (e: CompositionEntry) => (e.massFraction.value[0] + e.massFraction.value[1]) / 2;
const sumOf = (c: readonly CompositionEntry[], re: RegExp) => c.filter((e) => re.test(e.material)).reduce((s, e) => s + mid(e), 0);

export interface AsteroidPower {
  readonly tier: PowerTier;
  readonly spec: TierSpec;
  readonly diameterM: number;
  readonly escapeSpeedMs: number;
  /** Surface gravity, m/s². */
  readonly surfaceGravityMs2: number;
  /** Water plus carbon mass fraction (mid of ranges, or assumed from the class). */
  readonly volatileFraction: number;
  readonly volatilesAssumed: boolean;
  /** Free metal mass fraction. */
  readonly metalFraction: number;
  /** Why it got this tier, in Spanish for the player. */
  readonly reason: string;
  /** A comet: on top of its tier it fires outgassing jets. */
  readonly comet: boolean;
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")} %`;

/** Tier of an asteroid from its real data. Checked from the strongest power down. */
export function powerOf(data: AsteroidData): AsteroidPower {
  const R = data.meanRadiusM.value;
  const M = data.massKg.value;
  const diameterM = 2 * R;
  const escapeSpeedMs = Math.sqrt((2 * G * M) / R);
  const surfaceGravityMs2 = (G * M) / (R * R);
  const comp = data.composition;
  const volatilesAssumed = comp.length === 0;
  const volatileFraction = volatilesAssumed ? ASSUMED_VOLATILES[data.spectralType.value] : sumOf(comp, /water|agua|ice|hielo|carbon/i);
  const metalFraction = sumOf(comp, /iron-nickel|platinum|hierro-n[ií]quel/i);
  const r = POWER_RULE;
  let tier: PowerTier;
  let reason: string;
  if (escapeSpeedMs >= r.gravityEscapeMs) {
    tier = 5;
    reason = `Velocidad de escape de ${escapeSpeedMs.toFixed(0)} m/s: su gravedad es un arma`;
  } else if (data.spectralType.value === "M" || metalFraction >= r.metallicFraction) {
    tier = 4;
    reason = data.spectralType.value === "M" ? "Tipo M, metálico: domina sus átomos" : `${pct(metalFraction)} de metal libre: domina sus átomos`;
  } else if (diameterM > r.bigBodyDiameterM && volatileFraction >= r.volatileRichFraction) {
    tier = 3;
    reason = `${(diameterM / 1000).toFixed(2).replace(".", ",")} km y ${pct(volatileFraction)} de agua y carbono${volatilesAssumed ? " (supuesto por su tipo)" : ""}: fabrica explosivos`;
  } else if (diameterM > r.bigBodyDiameterM) {
    tier = 2;
    reason = `${(diameterM / 1000).toFixed(2).replace(".", ",")} km y pocos volátiles: lanza bloques grandes`;
  } else {
    tier = 1;
    reason = `${diameterM.toFixed(0)} m, un montón de escombros: lanza piedras`;
  }
  const comet = data.kind === "cometa";
  // A comet's ice is its weapon too: it opens vents and fires gas and dust (Rosetta's outbursts on 67P).
  const spec: TierSpec = comet ? { ...TIERS[tier], weapons: [...TIERS[tier].weapons, "chorro"], summary: `${TIERS[tier].summary}; y, como cometa, dispara chorros de gas y polvo` } : TIERS[tier];
  if (comet) reason = `${reason} · cometa: dispara chorros de gas y polvo`;
  return { tier, spec, diameterM, escapeSpeedMs, surfaceGravityMs2, volatileFraction, volatilesAssumed, metalFraction, reason, comet };
}

/** Whether a tier's attacks can reach a kind of target. */
export const reaches = (tier: PowerTier, kind: TargetKind): boolean => TIERS[tier].reaches.includes(kind);
