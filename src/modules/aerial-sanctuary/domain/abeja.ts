/**
 * THE HONEYBEE OF THE PUPA at the hollow pyramid's middle (Berón 2026-11-25 and 2026-11-26; docs/design/pupa-abeja.md; it was the cloud globe's), sanctuary 3's sibling of sanctuary 1's
 * octopus egg (sanctuary-one/domain/pulpo.ts): a worker of the Asian honeybee, Apis cerana (the honeybee native to
 * Hunza and Gilgit; data/bioma.ts), from the egg the queen lays in its wax cell to the adult that chews through the cap
 * and flies off. Pure: what it looks like at a moment `k` of its development (0 laid … 1 the adult out of its cell),
 * between its real stages, every value continuous so the change is fluid; the clock, the stages and the ramps are the
 * globe embryo's shared ones (fauna/domain/globe-embryo.ts).
 *
 * Its days (real, aproximado): a worker of A. mellifera takes 21 days, 3 an egg + 6 an open larva + 12 capped (Winston
 * 1987, The Biology of the Honey Bee, Harvard, cap. 4); A. cerana's workers 1–2 days fewer, about 19–20 (Oldroyd y
 * Wongsiri 2006, Asian Honey Bees, Harvard, cap. 3): here 3 + 5 + 11 = 19. Inside the egg, the embryo's stages and
 * hours at 35 °C are A. mellifera's (DuPraw 1967, Annals Ent. Soc. Am. 60: 1147–1157; Fleig y Sander 1986, J.
 * Morphol. 189: 133–158, their stages 1–10 in ~72 h), the only bee embryo described stage by stage; the egg stands on
 * the cell's floor on day 1, leans on day 2 and lies on day 3 (Winston 1987). The larva moults 4 times (5 instars),
 * grows ~1 500-fold in weight and lies curled in a C at the cell's bottom; it is capped, spins its cocoon and
 * stretches (prepupa), moults into the white pupa, whose eyes darken first (white, pink, purple, brown) and then its
 * body, thorax first (Jay 1962, Can. J. Zool. 40: 661–672, the colour stages of the pupa).
 *
 * Unit: the adult worker's length = 1 (A. cerana ~10–11 mm). Real proportions: the egg ~1,5 × 0,35 mm (0,14 × 0,03),
 * the worker cell's width ~4,5 mm and depth ~11 mm (0,42 × 1,05; Oldroyd y Wongsiri 2006), its axis tilted up ~13°.
 *
 * Nothing leaves the cell before the adult chews out (Berón 2026-11-28: «empieza a crecer muchísimo con una forma rara
 * saliendo de los límites del contenedor amarillo»): the egg stands on the bottom, leans and lies (real, Winston 1987);
 * the larva lies curled in a C on the bottom, in the plane of the floor, and grows until the C fills the bottom
 * (LARVA: its outer edge at 95 % of the cell's half width), not longer; once capped it uncoils and stretches along the
 * cell's axis, head to the cap (the prepupa), and the pupa forms inside it (Winston 1987, cap. 4).
 */
import { advanceCycle, ramp, smooth, stageIn, type EmbryoStage } from "@modules/fauna/domain/globe-embryo";

export type BeePhase = "huevo" | "larva" | "prepupa" | "pupa" | "adulta";

export interface BeeStage extends EmbryoStage {
  /** Its day of development (from the egg laid; 19 = the adult out). */
  readonly day: number;
  readonly phase: BeePhase;
}

/** Worker development of Apis cerana, days (see the header): egg, open larva, capped. */
export const BEE_DAYS = { egg: 3, larva: 5, capped: 11 } as const;
export const BEE_TOTAL_DAYS = BEE_DAYS.egg + BEE_DAYS.larva + BEE_DAYS.capped;
const D = (day: number) => day / BEE_TOTAL_DAYS;

export const BEE_STAGES: readonly BeeStage[] = (
  [
  { day: 0, phase: "huevo", label: "Huevo recién puesto, de pie en el fondo de la celda: los primeros núcleos se dividen (segmentación)" },
  { day: 0.5, phase: "huevo", label: "Blastodermo: los núcleos suben a la superficie del huevo y forman una capa de células" },
  { day: 1, phase: "huevo", label: "Banda germinal: el embrión se pliega a lo largo del vientre del huevo (gastrulación); el huevo se inclina" },
  { day: 1.5, phase: "huevo", label: "Segmentos: cabeza, 3 del tórax y 10 del abdomen" },
  { day: 2, phase: "huevo", label: "Esbozos de las piezas de la boca, de las antenas y de las patas; el huevo se tumba" },
  { day: 2.6, phase: "huevo", label: "Cierre dorsal: la larva está hecha y sus tráqueas se llenan de aire" },
  { day: 3, phase: "larva", label: "Eclosión: la larva de primer estadio, en un lecho de jalea real" },
  { day: 4, phase: "larva", label: "Larva de segundo estadio (primera muda), enroscada en C" },
  { day: 5, phase: "larva", label: "Larva de tercer estadio: desde ahora las obreras la alimentan con jalea de obrera, miel y polen" },
  { day: 6, phase: "larva", label: "Larva de cuarto estadio: llena el fondo de la celda" },
  { day: 7, phase: "larva", label: "Larva de quinto estadio: ha crecido unas 1 500 veces su peso" },
  { day: 8, phase: "prepupa", label: "Celda operculada: las obreras la tapan con cera; la larva teje su capullo y se estira (prepupa)" },
  { day: 10, phase: "pupa", label: "Pupa blanca: ya tiene la forma de una abeja, con los ojos blancos" },
  { day: 12, phase: "pupa", label: "Los ojos se vuelven rosados" },
  { day: 14, phase: "pupa", label: "Los ojos, morados; después pardos" },
  { day: 16, phase: "pupa", label: "La cutícula se oscurece: primero el tórax, después la cabeza y el abdomen" },
  { day: 18, phase: "pupa", label: "Última muda: la abeja adulta, aún dentro de la celda" },
  { day: 19, phase: "adulta", label: "Emergencia: roe el opérculo, sale de la celda y echa a volar" },
  ] as const satisfies readonly Omit<BeeStage, "at">[]
).map((s) => ({ ...s, at: D(s.day) }));

/** After emerging, the adult flies a round under the pyramid's ceiling for this share of the cycle before the queen lays a new egg. */
export const FLY_SHARE = 0.15;

/** The worker's cell (adult lengths) and the egg. */
export const CELL = { width: 0.42, depth: 1.05, tiltRad: (13 * Math.PI) / 180 } as const;
export const BEE_EGG = { length: 0.14, width: 0.032 } as const;

/**
 * The larva's C (ours, from the photos of a worker cell: the full-grown larva curled round the bottom, a ring nearly
 * closed, plump): the share of a full turn its body bends round, its segments (head + 3 thoracic + 10 abdominal, Snodgrass
 * 1956 Anatomy of the Honey Bee), its thickness over its length, and how much of the cell's half width the C fills at
 * most. The prepupa: as long as the cell lets it, head to the cap.
 */
export const LARVA = { arc: 0.85, segments: 14, thickShare: 0.3, fill: 0.95, prepupa: 0.86 } as const;
/** The full-grown larva's length (adult lengths): the longest C whose outer edge (its square segments' corners) fills the bottom. */
export const LARVA_MAX = (LARVA.fill * CELL.width) / 2 / (1 / (2 * Math.PI * LARVA.arc) + LARVA.thickShare * Math.SQRT1_2);

/** The larva's shape at a moment: the C's ring (centre line) radius, its body thickness, its outer reach from the axis and its top. */
export function larvaShape(p: Pick<BeeLook, "larva" | "thick" | "curl">): { ring: number; thick: number; reach: number; top: number } {
  const ring = p.larva / (2 * Math.PI * LARVA.arc);
  // Curled: a flat ring on the bottom; straight: a rod up the axis from the bottom. In between, every point lies between the two.
  return { ring, thick: p.thick, reach: ring * p.curl + p.thick * Math.SQRT1_2, top: Math.max(p.thick + 0.01, p.larva + 0.02) };
}

/** What to draw at a moment: sizes in adult lengths, angles in radians, colours 0 (white) … 1 (dark). */
export interface BeeLook {
  readonly stage: BeeStage;
  readonly phase: BeePhase;
  /** The egg: 1 whole … 0 gone (hatched); its lean from upright (0) to lying on the cell floor (π/2). */
  readonly egg: number;
  readonly lean: number;
  /** Inside the egg: the blastoderm (0–1), the germ band (0–1), its segments seen (0–14), the appendage buds (0–1). */
  readonly blastoderm: number;
  readonly band: number;
  readonly segments: number;
  readonly buds: number;
  /** The larva: its length along its body (curled in a C until it stretches), its thickness, how curled (1 a C … 0 straight). */
  readonly larva: number;
  readonly thick: number;
  readonly curl: number;
  /** Its instar (1–5; 0 before hatching). */
  readonly instar: number;
  /** The royal jelly bed under the young larva (0–1). */
  readonly jelly: number;
  /** The wax cap: 0 open … 1 sealed; 0 again once she has chewed through it. */
  readonly cap: number;
  /** The pupa (and the adult): 0 none … 1 the bee's full shape (head, thorax, abdomen, legs, wing pads). */
  readonly bee: number;
  /** Eye colour (0 white … 1 dark brown) and the cuticle's: the thorax's, then the rest. */
  readonly eyes: number;
  readonly thorax: number;
  readonly body: number;
  /** The wings: 0 folded pads … 1 spread (the adult). */
  readonly wings: number;
  /** Out of the cell: 0 inside … 1 flown off round the hall. */
  readonly out: number;
}

/** The stage at a moment. */
export const beeStageAt = (k: number): BeeStage => stageIn(BEE_STAGES, Math.min(1, k));

/** The look at `k` (0 laid … 1 out of the cell … 1 + FLY_SHARE flown round and gone). */
export function beeAt(k: number): BeeLook {
  const kk = Math.max(0, Math.min(1 + FLY_SHARE, k));
  const day = kk * BEE_TOTAL_DAYS;
  const st = beeStageAt(kk);
  const r = (d0: number, d1: number, a: number, b: number) => ramp(day, d0, d1, a, b);
  // The larva grows ~1 500-fold in weight in 5 days: its length about the cube root (~11×), most of it at the end; here
  // it stops when its C fills the bottom (LARVA_MAX ≈ 4,4× the egg: the rest of its growth is girth).
  const grow = smooth((day - 3) / 5) ** 1.6;
  const hatch = r(2.95, 3.05, 0, 1);
  const young = BEE_EGG.length + (LARVA_MAX - BEE_EGG.length) * grow;
  // It comes out of the egg as the egg goes; capped, it stretches; then the pupa forms inside it as it thins away.
  const length = day < 8 ? young * hatch : r(8, 9.5, LARVA_MAX, LARVA.prepupa);
  const girth = day < 8 ? LARVA.thickShare * young * hatch : LARVA.thickShare * LARVA_MAX * Math.sqrt(LARVA_MAX / length);
  const thin = 1 - r(9.6, 10.2, 0, 1);
  return {
    stage: st,
    phase: st.phase,
    egg: 1 - r(2.95, 3.05, 0, 1),
    lean: r(0.8, 2.6, 0, Math.PI / 2),
    blastoderm: r(0.3, 0.7, 0, 1),
    band: r(0.9, 1.4, 0, 1),
    segments: r(1.4, 1.9, 0, 14),
    buds: r(1.9, 2.5, 0, 1),
    larva: length * (1 - r(10.1, 10.25, 0, 1)),
    thick: girth * thin,
    curl: 1 - r(8, 9.5, 0, 1),
    instar: day < 3 ? 0 : Math.min(5, 1 + Math.floor(day - 3)),
    jelly: r(2.9, 3.2, 0, 1) * (1 - r(5, 7.5, 0, 1)),
    cap: r(8, 8.6, 0, 1) * (1 - r(18.7, 19, 0, 1)),
    bee: r(9.6, 10.2, 0, 1),
    eyes: r(11.5, 16, 0, 1),
    thorax: r(15.5, 17, 0, 1),
    body: r(16.5, 18.2, 0, 1),
    // The wings stay folded pads in the cell and spread once she is out (a fresh worker's wings unfold in minutes).
    wings: ramp(ramp(kk, 1, 1 + FLY_SHARE, 0, 1), 0.2, 0.4, 0, 1),
    out: ramp(kk, 1, 1 + FLY_SHARE, 0, 1),
  };
}

/** The clock of the cell: advances by real seconds over `minutes`, and a new egg once the adult has flown off. */
export function advanceBee(k: number, dtSeconds: number, minutes: number): number {
  return advanceCycle(k, dtSeconds, minutes, FLY_SHARE);
}
