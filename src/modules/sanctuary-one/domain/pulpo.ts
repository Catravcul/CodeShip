/**
 * The octopus egg in the whales' globe, developing until it hatches (Berón 2026-11-24: «el pulpo sería ideal que se
 * vaya desarrollando para nacer en unas 2 horas, siguiendo sus fases… la transición debe ser fluida… el tiempo por
 * setting»). Pure: what the egg looks like at a moment `k` of its development (0 laid … 1 hatching), between the
 * stages of Octopus vulgaris (Naef 1928, stages I–XX; their days at 19 °C after Deryckere et al. 2021, eLife 10:e69161,
 * «aproximado»), each part's size relative to the hatchling.
 *
 * Unit: the hatchling's total length (mantle and arms) = 1. Real proportions (O. vulgaris): the egg (chorion) is
 * ~2,5 × 0,9 mm and the hatchling ~2 mm long with its mantle ~1,1 mm and short arms (Villanueva y Norman 2008,
 * Oceanogr. Mar. Biol. 46): the egg is 1,25 hatchlings long and 0,45 wide; the mantle 0,55, the head 0,23, the arms 0,22.
 *
 * The clock, the stages and the ramps are the globe embryo's shared ones (fauna/domain/globe-embryo.ts; sanctuary 3's
 * cloud globe uses them for its honeybee).
 */
import { advanceCycle, ramp, smooth, stageIn, type EmbryoStage } from "@modules/fauna/domain/globe-embryo";

export interface PulpoStage extends EmbryoStage {
  /** Naef's stages it covers. */
  readonly naef: string;
}

export const STAGES: readonly PulpoStage[] = [
  { at: 0, naef: "I–VI", label: "Segmentación: el blastodisco, un casquete de células sobre el vitelo" },
  { at: 0.18, naef: "VII", label: "Primera inversión: el embrión gira y pasa al otro polo del huevo" },
  { at: 0.26, naef: "VIII–X", label: "Esbozos de los órganos: manto, ojos y brazos" },
  { at: 0.42, naef: "XI–XIII", label: "Los ojos se pigmentan y los brazos crecen" },
  { at: 0.58, naef: "XIV–XVI", label: "Primeros cromatóforos; el vitelo externo se encoge" },
  { at: 0.72, naef: "XVII–XVIII", label: "Late el corazón; el saco de la tinta" },
  { at: 0.82, naef: "XIX", label: "Segunda inversión: vuelve a girar, el manto hacia el extremo libre" },
  { at: 0.92, naef: "XX", label: "A punto de nacer: casi sin vitelo" },
  { at: 1, naef: "—", label: "Eclosión: la paralarva sale del huevo y nada" },
];

/** After hatching, the paralarva swims away for this share of the cycle before a new egg is laid. */
export const SWIM_SHARE = 0.12;

/** The egg (chorion) in hatchling lengths. */
export const EGG = { length: 1.25, width: 0.45 } as const;

/** What to draw at a moment: sizes in hatchling lengths, angles in radians. */
export interface PulpoLook {
  readonly stage: PulpoStage;
  /** The blastoderm cap over the yolk (0 once it is the embryo). */
  readonly cap: number;
  /** The embryo proper: its length (mantle + head + arms), its mantle's share of it, its eyes, arms. */
  readonly body: number;
  readonly mantle: number;
  readonly eyes: number;
  /** Eye colour: 0 clear, 1 dark (pigmented retina). */
  readonly eyeDark: number;
  readonly arms: number;
  /** Chromatophores: 0 none … 1 all of them. */
  readonly chromato: number;
  /** The yolk: its length and width. */
  readonly yolk: number;
  readonly yolkW: number;
  /**
   * The first inversion (stage VII): the embryo moves round the yolk from one pole of the egg to the other (0 … π,
   * the angle round the yolk). The yolk, fluid in its membrane, stays along the egg.
   */
  readonly pole: number;
  /** The second inversion (stage XIX): embryo and yolk turn over together, the mantle to the free end (0 … π). */
  readonly flip: number;
  /** The mantle's breathing: 0 still … 1 full (heart and mantle from stage XVII on). */
  readonly beat: number;
  /** The chorion: 1 whole … 0 gone (after hatching). */
  readonly chorion: number;
  /** After hatching: 0 at the egg … 1 swum away. */
  readonly away: number;
}

/** The stage at a moment. */
export function stageAt(k: number): PulpoStage {
  return stageIn(STAGES, k);
}

/**
 * The look at `k` (0 laid … 1 hatching … 1 + SWIM_SHARE the paralarva gone). Every value changes continuously, so the
 * egg moves smoothly from one stage to the next.
 */
export function pulpoAt(k: number): PulpoLook {
  const kk = Math.max(0, Math.min(1 + SWIM_SHARE, k));
  // The embryo grows from a speck at stage VIII to the hatchling, faster in the second half (as the yolk is used).
  const body = ramp(kk, 0.22, 0.3, 0, 0.12) + ramp(kk, 0.3, 0.98, 0, 0.88);
  const yolk = ramp(kk, 0.3, 0.98, 1.1, 0.08);
  return {
    stage: stageAt(Math.min(1, kk)),
    cap: ramp(kk, 0, 0.18, 0.1, 0.24) * (1 - smooth((kk - 0.22) / 0.08)),
    body,
    mantle: ramp(kk, 0.3, 0.9, 0.35, 0.55),
    eyes: ramp(kk, 0.3, 0.6, 0.02, 0.09),
    eyeDark: ramp(kk, 0.42, 0.55, 0, 1),
    arms: ramp(kk, 0.3, 0.95, 0.05, 0.22),
    chromato: ramp(kk, 0.58, 0.95, 0, 1),
    yolk,
    yolkW: Math.min(EGG.width * 0.9, yolk * 0.4),
    pole: ramp(kk, 0.18, 0.26, 0, Math.PI),
    flip: ramp(kk, 0.82, 0.9, 0, Math.PI),
    beat: ramp(kk, 0.72, 0.78, 0, 1),
    chorion: 1 - ramp(kk, 1, 1.02, 0, 1),
    away: ramp(kk, 1, 1 + SWIM_SHARE, 0, 1),
  };
}

/** The clock of the egg: advances by real seconds, loops after the paralarva has swum away (a new egg). */
export function advance(k: number, dtSeconds: number, minutes: number): number {
  return advanceCycle(k, dtSeconds, minutes, SWIM_SHARE);
}
