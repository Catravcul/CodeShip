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
 * After hatching it grows up in the globe (Berón 2026-11-28: «el pulpo de sanctuary1 debería llegar a ocupar el 66 % del
 * globo de agua»): planktonic paralarva, the juvenile that settles, the subadult and the adult, its arms spread, whose
 * arm span (tip to tip of two opposite arms) is 66 % of the globe's diameter (PULPO_SIZE; ficción: the hatchling is a
 * third of it, so it grows only ~2× here, ~500× in reality, from ~2 mm to ~1 m of arms). Real, aproximado: the
 * paralarva lives ~2 months in the plankton and settles at ~6–8 mm of mantle (Villanueva 1995, Can. J. Fish. Aquat.
 * Sci. 52: 2639–2650; Iglesias et al. 2007, Aquaculture 266: 1–15), matures in ~1 year and lives 1–2 (Mangold 1983,
 * in Boyle, Cephalopod Life Cycles I); the adult's arms are ~4 times its mantle (mantle up to ~25 cm, arms up to ~1 m:
 * Jereb et al. 2016, FAO Cephalopods of the World 3). The adult female lays her eggs and dies with them: a new egg.
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
  { at: 1, naef: "—", label: "Eclosión: la paralarva sale del huevo y nada (3 ventosas por brazo)" },
  { at: 1.15, naef: "—", label: "Paralarva en el plancton: los brazos se alargan y ganan ventosas (unos 2 meses)" },
  { at: 1.4, naef: "—", label: "Asentamiento: el juvenil deja el plancton y vive en el fondo" },
  { at: 1.6, naef: "—", label: "Subadulto: los brazos llegan a ser 4 veces el manto" },
  { at: 1.8, naef: "—", label: "Adulto: con los brazos abiertos ocupa dos tercios del globo (en el mar, ~1 m)" },
];

/** After hatching, it grows up in the globe for this share of the cycle (to the adult, LIFE), then a new egg is laid. */
export const LIFE_SHARE = 1;
/** Its life after hatching (k from 1): growing from the hatchling to the adult, the adult, and leaving. */
export const LIFE = { grown: 1.8, leave: 1.93 } as const;

/**
 * Its size in the globe (Berón 2026-11-22 and 2026-11-28): the hatchling's length a third of the globe's diameter, the
 * adult's arm span (tip to tip, arms open) 66 % of it. Diameter, not volume: the arms are what one sees fill the globe.
 */
export const PULPO_SIZE = { hatchling: 1 / 3, adultSpan: 0.66 } as const;

/** Shares of its length: the hatchling's (Villanueva y Norman 2008) and the adult's (arms ~4× the mantle, head ~0,4×: Jereb et al. 2016). */
const HATCHLING = { mantle: 0.55, head: 0.23, arms: 0.22, splay: 0, eye: 0.09, armThick: 0.022 } as const;
const ADULT_SHARES = { mantle: 0.185, head: 0.075, arms: 0.74, splay: 1.35 } as const;

/** Its body's measures (hatchling lengths) from a look: the arms' length, the head's, the mantle's, their radii and the span. */
export function pulpoBody(p: Pick<PulpoLook, "body" | "arms" | "head" | "mantle" | "splay">): { armLen: number; headH: number; mantleLen: number; mR: number; hR: number; rootR: number; span: number } {
  const armLen = p.arms * p.body;
  const headH = p.head * p.body;
  const mantleLen = p.mantle * p.body;
  const mR = mantleLen * 0.4;
  const hR = Math.min(headH * 0.6, mR * 0.95);
  const rootR = hR * 0.5;
  return { armLen, headH, mantleLen, mR, hR, rootR, span: 2 * (rootR + armLen * Math.sin(p.splay)) };
}

/** The adult's length (hatchling lengths): the one whose arm span is PULPO_SIZE.adultSpan of the globe. */
export const ADULT_LENGTH = (PULPO_SIZE.adultSpan / PULPO_SIZE.hatchling) / pulpoBody({ body: 1, ...ADULT_SHARES }).span;

/** The egg (chorion) in hatchling lengths. */
export const EGG = { length: 1.25, width: 0.45 } as const;

/** What to draw at a moment: sizes in hatchling lengths, angles in radians. */
export interface PulpoLook {
  readonly stage: PulpoStage;
  /** The blastoderm cap over the yolk (0 once it is the embryo). */
  readonly cap: number;
  /** The embryo proper: its length (mantle + head + arms), its mantle's, head's and arms' shares of it, its eyes. */
  readonly body: number;
  readonly mantle: number;
  readonly head: number;
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
  /** After hatching: 0 the hatchling … 1 the adult; how far its arms open (0 down along the body … ~1,35 rad, spread). */
  readonly grow: number;
  readonly splay: number;
  /** The arms' radius at their root (hatchling lengths). */
  readonly armThick: number;
  /** The adult leaving at the end of its life (0 … 1 gone; a new egg then). */
  readonly leave: number;
}

/** The stage at a moment (after 1, its life in the globe). */
export function stageAt(k: number): PulpoStage {
  return stageIn(STAGES, k);
}

/**
 * The look at `k` (0 laid … 1 hatching … LIFE.grown the adult … 1 + LIFE_SHARE gone). Every value changes continuously, so the
 * egg moves smoothly from one stage to the next.
 */
export function pulpoAt(k: number): PulpoLook {
  const kk = Math.max(0, Math.min(1 + LIFE_SHARE, k));
  // The embryo grows from a speck at stage VIII to the hatchling, faster in the second half (as the yolk is used).
  const hatchling = ramp(kk, 0.22, 0.3, 0, 0.12) + ramp(kk, 0.3, 0.98, 0, 0.88);
  const yolk = ramp(kk, 0.3, 0.98, 1.1, 0.08);
  // Then it grows up, fastest early (a paralarva's growth is exponential, then it slows): its arms lengthen most.
  const grow = ramp(kk, 1.02, LIFE.grown, 0, 1);
  const g = Math.sqrt(grow);
  const mix = (a: number, b: number) => a + (b - a) * g;
  const adultEye = 0.2 * ADULT_SHARES.mantle * ADULT_LENGTH;
  return {
    stage: stageAt(kk),
    cap: ramp(kk, 0, 0.18, 0.1, 0.24) * (1 - smooth((kk - 0.22) / 0.08)),
    body: mix(hatchling, ADULT_LENGTH),
    mantle: mix(ramp(kk, 0.3, 0.9, 0.35, HATCHLING.mantle), ADULT_SHARES.mantle),
    head: mix(HATCHLING.head, ADULT_SHARES.head),
    eyes: mix(ramp(kk, 0.3, 0.6, 0.02, HATCHLING.eye), adultEye),
    eyeDark: ramp(kk, 0.42, 0.55, 0, 1),
    arms: mix(ramp(kk, 0.3, 0.95, 0.05, HATCHLING.arms), ADULT_SHARES.arms),
    chromato: ramp(kk, 0.58, 0.95, 0, 1),
    yolk,
    yolkW: Math.min(EGG.width * 0.9, yolk * 0.4),
    pole: ramp(kk, 0.18, 0.26, 0, Math.PI),
    flip: ramp(kk, 0.82, 0.9, 0, Math.PI),
    beat: ramp(kk, 0.72, 0.78, 0, 1),
    chorion: 1 - ramp(kk, 1, 1.02, 0, 1),
    grow,
    splay: mix(HATCHLING.splay, ADULT_SHARES.splay),
    armThick: mix(HATCHLING.armThick * hatchling, 0.16 * ADULT_SHARES.mantle * ADULT_LENGTH),
    leave: ramp(kk, LIFE.leave, 1 + LIFE_SHARE, 0, 1),
  };
}

/** The clock of the egg: advances by real seconds (the setting's minutes to hatching, as many again to the adult), then a new egg. */
export function advance(k: number, dtSeconds: number, minutes: number): number {
  return advanceCycle(k, dtSeconds, minutes, LIFE_SHARE);
}
