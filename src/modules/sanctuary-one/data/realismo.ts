import type { ModelDef, Part } from "./models/kit";

/**
 * The realism review of a 3D model (Berón 2026-11-22: «una revisión de realismo para cada objeto 3D, conectado a las
 * fuentes y un puntaje… sería regla de creación para los objetos 3d… tests que vigilen que se mantiene el realismo»).
 * A score out of 100 from what can be checked in the data, so a test can hold it:
 *
 * - **fuente** (25): it names where its shape and size come from (a product, a standard, Cold Sanctuary's code).
 * - **forma** (35): built of its pieces (legs, top, screen…), not one box; 5 points a piece up to 7. Shapes the
 *   renderer draws itself (animals, trees, figures, cylinders) count as built.
 * - **color** (20): three colours or more (a cube of one colour is not recognisable); two, half.
 * - **apoyo** (20): no piece hangs in the air (the «silla voladora»): each rests on the floor or on another piece. One
 *   that does not loses the 20 and 10 more for each such piece (up to 30).
 *
 * Floors, carpets and beds of soil are flat by nature: they are reviewed for their source only (`plano`).
 */
export interface Realism {
  readonly score: number;
  readonly pieces: number;
  readonly colors: number;
  /** Pieces resting on nothing. */
  readonly floating: number;
  readonly flat: boolean;
  /** What took points off, in words (for the review and the test's message). */
  readonly notes: readonly string[];
}

/** A finish, carpet or bed of soil: flat, one colour by nature. */
export const FLAT = /suelo|alfombra|bancal|esterilla|-zona|^zona-|campo-|bahia|tatami|tapiz|moqueta|cesped|pista/;
const PROCEDURAL = new Set(["figura", "cuadrupedo", "cetaceo", "pinnipedo", "pinguino", "ave", "arbol", "cilindro", "jaula", "banco", "maquina"]);

const bottom = (p: Part) => p[1] - p[4] / 2;
const top = (p: Part) => p[1] + p[4] / 2;
/** Do two pieces touch or overlap (8 cm of play: boxes standing in for round or slanted pieces)? */
const touch = (a: Part, b: Part, e = 0.08) =>
  Math.abs(a[0] - b[0]) <= (a[3] + b[3]) / 2 + e && Math.abs(a[2] - b[2]) <= (a[5] + b[5]) / 2 + e && bottom(b) <= top(a) + 0.03 && top(b) >= bottom(a) - 0.03;

/**
 * The pieces that rest on nothing: those of a group of touching pieces none of which reaches the floor (a seat with no
 * leg, a screen with no stand). A piece held from above or from the side (a punching bag, a screen on its wall) is held.
 */
export function floatingParts(parts: readonly Part[]): Part[] {
  // A model that stands on another or hangs on a wall (a mattress on its platform, a map) rests at its lowest piece.
  const base = Math.max(0, Math.min(...parts.map(bottom)));
  const held = parts.map((p) => bottom(p) <= base + 0.03);
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < parts.length; i++) {
      if (held[i]) continue;
      if (parts.some((q, j) => held[j] && touch(parts[i]!, q))) {
        held[i] = true;
        changed = true;
      }
    }
  }
  return parts.filter((_, i) => !held[i]);
}

/**
 * The pieces settled (the creation rule's mechanical half): a group of touching pieces that floats less than `gap` m
 * over what is under it (a mattress 5 cm over its frame, a drum over its table) is set down on it. Wider gaps stay,
 * for the review to flag: a piece that needs its stand.
 */
export function settled(parts: readonly Part[], gap = 0.15): Part[] {
  let out = [...parts];
  for (let pass = 0; pass < 4; pass++) {
    const free = new Set(floatingParts(out));
    if (!free.size) break;
    // The floating groups, each with the pieces it touches.
    const groups: Part[][] = [];
    for (const p of free) {
      const g = groups.find((gr) => gr.some((q) => touch(p, q)));
      if (g) g.push(p);
      else groups.push([p]);
    }
    let moved = false;
    for (const g of groups) {
      const y0 = Math.min(...g.map(bottom));
      // What is under it: the highest top below its foot among the held pieces it stands over (or the model's base).
      const base = Math.max(0, Math.min(...out.map(bottom)));
      let rest = base;
      for (const q of out) if (!free.has(q) && g.some((p) => touch(p, q, 0.08) || (Math.abs(p[0] - q[0]) <= (p[3] + q[3]) / 2 && Math.abs(p[2] - q[2]) <= (p[5] + q[5]) / 2)) && top(q) <= y0 + 0.03) rest = Math.max(rest, top(q));
      const dy = y0 - rest;
      if (dy > 0.03 && dy <= gap) {
        out = out.map((p) => (g.includes(p) ? ([p[0], p[1] - dy, p[2], p[3], p[4], p[5], ...(p.length > 6 ? [p[6]] : [])] as unknown as Part) : p));
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}

export function realism(d: ModelDef): Realism {
  const notes: string[] = [];
  const flat = FLAT.test(d.id) && d.size.y <= 0.3;
  const src = d.source.trim().length >= 12 ? 25 : 0;
  if (!src) notes.push("sin fuente");
  if (flat) return { score: src ? 100 : 0, pieces: 1, colors: 1, floating: 0, flat, notes };
  const parts = d.parts ?? [];
  const pieces = parts.length || (PROCEDURAL.has(d.shape) ? 7 : 1);
  const forma = Math.min(35, pieces * 5);
  if (pieces < 4) notes.push(`${pieces} pieza${pieces === 1 ? "" : "s"}`);
  const colors = parts.length ? new Set(parts.map((p) => p[6] ?? d.color)).size : PROCEDURAL.has(d.shape) ? 3 : 1;
  const color = colors >= 3 ? 20 : colors === 2 ? 10 : 0;
  if (colors < 3) notes.push(`${colors} color${colors === 1 ? "" : "es"}`);
  const floating = floatingParts(parts).length;
  const apoyo = floating ? -Math.min(30, 10 * floating) : 20;
  if (floating) notes.push(`${floating} pieza${floating === 1 ? "" : "s"} en el aire`);
  return { score: Math.max(0, src + forma + color + apoyo), pieces, colors, floating, flat, notes };
}

/** The bar a model must reach: 80 points and nothing in the air. */
export const MIN_SCORE = 80;

/**
 * The models of today's floors still under the bar when the review began (2026-11-22): each to be redone from its
 * source. The list only shrinks: a model that reaches the bar leaves it (realismo.test.ts), and a new one never enters.
 */
export const PENDIENTES: ReadonlySet<string> = new Set([
  "asamblea-fila-10", "asamblea-fila-8", "asamblea-marcador", "asamblea-mesa-comision", "aula-armario",
  "b-autoclave", "b-cabina", "b-prepcr", "ballet-altavoz", "ballet-caja-resina", "ballet-fuente", "ballet-vestuario",
  "cal-fondos-v", "cf-cajon-61", "cf-cajones-pliometricos", "cf-rig", "cocina-barra-servicio", "cocina-lavado",
  "cocina-prep-carne", "cocina-puesto", "cons-hormigonera", "cons-ladrillos", "cons-tuberias", "cons-vigas",
  "cria-pizarra", "dojo-banco", "dojo-espejo", "dojo-kamiza", "dojo-makiwara", "dojo-pera", "dojo-vestuario",
  "gym-assault-bike", "gym-eliptica", "gym-escaladora", "gym-jaula", "gym-plataforma", "gym-prensa",
  "gym-press-hombros", "gym-press-pecho", "gym-remo", "gym-smith", "hospital-banco-sangre", "hospital-camilla",
  "hospital-consulta", "hospital-epi", "hospital-lavabotas", "hospital-lavamanos", "hospital-quirofano",
  "hospital-silla-examen", "hospital-telemedicina", "hospital-triaje", "i-monitor", "mec-barca-remolque",
  "mec-baterias", "mec-compresor", "mec-elevador-tractor", "mus-sofa", "pk-barandilla-05", "pk-barandilla-10",
  "pk-bloques", "pk-cajon", "pk-lache", "pk-muro-alto", "pk-muro-medio", "q-campana", "q-ducha", "tex-maniqui",
  "tex-rueca", "tex-telar-pie", "tex-tina", "vet-aislamiento", "vet-dietas", "vet-jaulas", "vet-pediluvio",
  "vf-camara", "vf-compostador", "vf-descanso", "vf-dosificador", "vf-rack", "yoga-buda",
]);
