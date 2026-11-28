import type { Reality } from "@core/reality";

/**
 * THE COMPOUNDS TO DRAW (docs/design/retos-trazos.md §Compuestos): each with its real formula and name, its real look
 * (PubChem's physical description, «Physical Description» / «Color/Form»), and the look its glyphs take on screen: a
 * palette, the particles the wand's trail gives off (drops for water, bubbles for gases, cubic crystals for the salts
 * that crystallise as cubes…) and a 2D drawing of its molecule (or of a bit of its crystal) for the closing animation.
 * Heavy atoms only in the big molecules (as chemists draw them); the H in the small ones.
 *
 * PubChem's CIDs were written from memory on 2026-11-25: PubChem was out of reach from the build machine (the proxy
 * blocks it), so they are marked «por confirmar» until checked; where we were not sure of the CID it is left out and
 * the compound named as PubChem names it.
 */
export type Particle = "gotas" | "burbujas" | "cristales" | "chispas" | "humo" | "llamas" | "fibras" | "polvo";

export interface Atom2D {
  readonly el: string;
  readonly x: number;
  readonly y: number;
}
export interface Bond2D {
  readonly a: number;
  readonly b: number;
  /** 1, 2 or 3; 0 for an ionic contact in a crystal (drawn dashed). */
  readonly n: 0 | 1 | 2 | 3;
}
export interface Molecule2D {
  /** «molecula»: every atom (H too if `withH`); «red»: a bit of a crystal or an ionic solid, in the formula's ratio. */
  readonly kind: "molecula" | "red";
  readonly withH: boolean;
  readonly atoms: readonly Atom2D[];
  readonly bonds: readonly Bond2D[];
}

export interface Compound {
  readonly id: string;
  /** As drawn: «C6H12O6», «Al(C2H5)3», «(C6H10O5)n» (domain/formula.ts). */
  readonly formula: string;
  readonly name: string;
  readonly pubchem: { readonly name: string; readonly cid?: number };
  /** Its real look (PubChem), in Spanish. */
  readonly real: string;
  readonly reality: Reality;
  /** The look of its glyphs: [trail, glow, deep background], and its particles. */
  readonly look: { readonly palette: readonly [string, string, string]; readonly particle: Particle };
  readonly molecule: Molecule2D;
}

// --- Building the 2D drawings ----------------------------------------------------------------------------------------
class Draw {
  readonly atoms: Atom2D[] = [];
  readonly bonds: Bond2D[] = [];
  constructor(
    private readonly kind: Molecule2D["kind"] = "molecula",
    private readonly withH = false,
  ) {}
  /** An atom (an existing one at the same place is reused: fused rings share their edge). */
  at(el: string, x: number, y: number): number {
    const i = this.atoms.findIndex((a) => Math.hypot(a.x - x, a.y - y) < 0.05);
    if (i >= 0) return i;
    this.atoms.push({ el, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
    return this.atoms.length - 1;
  }
  bond(a: number, b: number, n: Bond2D["n"] = 1): this {
    if (!this.bonds.some((q) => (q.a === a && q.b === b) || (q.a === b && q.b === a))) this.bonds.push({ a, b, n });
    return this;
  }
  /** A chain of atoms, each bonded to the last: [el, x, y, bond to the last]. */
  chain(from: number | undefined, ...links: [string, number, number, Bond2D["n"]?][]): number[] {
    const out: number[] = [];
    let last = from;
    for (const [el, x, y, n] of links) {
      const i = this.at(el, x, y);
      if (last !== undefined) this.bond(last, i, n ?? 1);
      out.push(i);
      last = i;
    }
    return out;
  }
  /** A hexagon of side 1 round (cx, cy) from angle `start` (degrees, y down), its atoms `els`, aromatic if asked. */
  ring(els: readonly string[], cx: number, cy: number, start: number, aromatic = false): number[] {
    const ids = els.map((el, k) => {
      const a = ((start + (360 * k) / els.length) * Math.PI) / 180;
      const r = els.length === 6 ? 1 : 0.55 / Math.sin(Math.PI / els.length);
      return this.at(el, cx + r * Math.cos(a), cy + r * Math.sin(a));
    });
    ids.forEach((id, k) => this.bond(id, ids[(k + 1) % ids.length]!, aromatic && k % 2 === 0 ? 2 : 1));
    return ids;
  }
  /** A grid of a crystal: `el(col, row)` at each point, ionic contacts between neighbours. */
  grid(cols: number, rows: number, el: (c: number, r: number) => string, gap = 1.1): this {
    const id: number[][] = [];
    for (let r = 0; r < rows; r++) {
      id.push([]);
      for (let c = 0; c < cols; c++) id[r]!.push(this.at(el(c, r), (c - (cols - 1) / 2) * gap, (r - (rows - 1) / 2) * gap));
    }
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols) this.bond(id[r]![c]!, id[r]![c + 1]!, 0);
        if (r + 1 < rows) this.bond(id[r]![c]!, id[r + 1]![c]!, 0);
      }
    return this;
  }
  done(): Molecule2D {
    return { kind: this.kind, withH: this.withH, atoms: this.atoms, bonds: this.bonds };
  }
}

const water = (() => {
  const d = new Draw("molecula", true);
  const o = d.at("O", 0, 0);
  d.chain(o, ["H", -0.8, 0.6]);
  d.chain(o, ["H", 0.8, 0.6]);
  return d.done();
})();
const pair = (a: string, b: string, n: Bond2D["n"]) => {
  const d = new Draw("molecula", true);
  d.chain(undefined, [a, -0.6, 0], [b, 0.6, 0, n]);
  return d.done();
};
const co2 = (() => {
  const d = new Draw("molecula", true);
  d.chain(undefined, ["O", -1.2, 0], ["C", 0, 0, 2], ["O", 1.2, 0, 2]);
  return d.done();
})();
const methane = (() => {
  const d = new Draw("molecula", true);
  const c = d.at("C", 0, 0);
  for (const [x, y] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) d.chain(c, ["H", x, y]);
  return d.done();
})();
const salt = (a: string, b: string) => new Draw("red").grid(4, 3, (c, r) => ((c + r) % 2 ? b : a)).done();
const glucose = (() => {
  // β-D-glucopyranose: the ring O5–C1…C5, the OH of C1–C4 and C6 with its OH (no H drawn).
  const d = new Draw();
  const ring = d.ring(["O", "C", "C", "C", "C", "C"], 0, 0, -30);
  const out = (k: number, r = 1.9) => {
    const a = ((-30 + 60 * k) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  };
  for (const k of [1, 2, 3, 4]) d.chain(ring[k], ["O", ...out(k)]);
  const [x6, y6] = out(5);
  d.chain(ring[5], ["C", x6, y6], ["O", x6 - 0.2, y6 - 1]);
  return d.done();
})();
const cellulose = (() => {
  // One glucose unit of the chain: the ring, the OH of C2 and C3, C6 and its OH, and the O that links to the next.
  const d = new Draw();
  const ring = d.ring(["O", "C", "C", "C", "C", "C"], 0, 0, -30);
  const out = (k: number, r = 1.9) => {
    const a = ((-30 + 60 * k) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  };
  d.chain(ring[1], ["O", 1.9, 0.6]);
  d.chain(ring[2], ["O", ...out(2)]);
  d.chain(ring[3], ["O", ...out(3)]);
  const [x6, y6] = out(5);
  d.chain(ring[5], ["C", x6, y6], ["O", x6 - 0.2, y6 - 1]);
  return d.done();
})();
const zigzag = (d: Draw, from: number | undefined, n: number, x0: number, y0: number, dx: number, up: boolean): number[] =>
  d.chain(from, ...Array.from({ length: n }, (_, i) => ["C", x0 + i * dx, y0 + ((i % 2 === 0) === up ? -0.25 : 0.25)] as [string, number, number]));
const dodecane = (() => {
  const d = new Draw();
  zigzag(d, undefined, 12, -4.8, 0, 0.87, true);
  return d.done();
})();
const tea = (() => {
  // Triethylaluminium, drawn as the monomer Al(C2H5)3 (it is a dimer, Al2(C2H5)6, as a liquid).
  const d = new Draw();
  const al = d.at("Al", 0, 0);
  for (const deg of [-90, 30, 150]) {
    const a = (deg * Math.PI) / 180;
    const b = ((deg + 30) * Math.PI) / 180;
    d.chain(al, ["C", Math.cos(a), Math.sin(a)], ["C", Math.cos(a) + 0.95 * Math.cos(b), Math.sin(a) + 0.95 * Math.sin(b)]);
  }
  return d.done();
})();
const n2o4 = (() => {
  const d = new Draw();
  const [a, b] = d.chain(undefined, ["N", -0.7, 0], ["N", 0.7, 0]);
  d.chain(a, ["O", -1.3, -0.85, 2]);
  d.chain(a, ["O", -1.3, 0.85]);
  d.chain(b, ["O", 1.3, -0.85, 2]);
  d.chain(b, ["O", 1.3, 0.85]);
  return d.done();
})();
const fluorescein = (() => {
  // Xanthene (three fused rings, the O in the middle one), its OH and =O, and the benzoic acid below C9.
  const d = new Draw();
  const r3 = Math.sqrt(3);
  d.ring(["C", "C", "C", "C", "C", "C"], -r3, 0, -90, true);
  const mid = d.ring(["O", "C", "C", "C", "C", "C"], 0, 0, -90);
  d.ring(["C", "C", "C", "C", "C", "C"], r3, 0, -90, true);
  d.chain(d.at("C", -r3 - r3 / 2, 0.5), ["O", -r3 - r3, 1]);
  d.chain(d.at("C", r3 + r3 / 2, 0.5), ["O", r3 + r3, 1, 2]);
  const c9 = mid[3]!;
  const ph = d.ring(["C", "C", "C", "C", "C", "C"], 0, 2.7, -90, true);
  d.bond(c9, ph[0]!);
  d.chain(ph[1], ["C", 1.75, 1.6], ["O", 2.7, 1.3, 2]);
  d.chain(d.at("C", 1.75, 1.6), ["O", 1.85, 0.6]);
  return d.done();
})();
const scopolamine = (() => {
  // Tropic acid (the phenyl, CH, CH2OH and the ester's C=O) on scopine (the N-methyl ring with its epoxide bridge).
  const d = new Draw();
  const ring = d.ring(["C", "C", "C", "N", "C", "C"], 3, 0, 180);
  const [c3, , c1, n8, c5] = ring;
  const [c6, c7] = d.chain(c1, ["C", 4.9, -0.75], ["C", 4.9, 0.75]);
  d.bond(c7!, c5!);
  const oe = d.at("O", 5.75, 0);
  d.bond(c6!, oe).bond(c7!, oe);
  d.chain(n8, ["C", 3.95, 1.3]);
  const [, co] = d.chain(c3, ["O", 1, 0], ["C", 0, 0]);
  d.chain(co, ["O", 0, -1.1, 2]);
  const [ca] = d.chain(co, ["C", -0.9, 0.5]);
  d.chain(ca, ["C", -0.9, 1.6], ["O", -1.8, 2.1]);
  const ph = d.ring(["C", "C", "C", "C", "C", "C"], -2.8, 0, 0, true);
  d.bond(ca!, ph[0]!);
  return d.done();
})();
const badge = (() => {
  // Bisphenol A diglycidyl ether: two phenyls on C(CH3)2, each with O–CH2 and its epoxide ring.
  const d = new Draw();
  const c = d.at("C", 0, 0);
  d.chain(c, ["C", 0, -1]);
  d.chain(c, ["C", 0, 1]);
  for (const s of [-1, 1]) {
    const ph = d.ring(["C", "C", "C", "C", "C", "C"], 2 * s, 0, s < 0 ? 0 : 180, true);
    d.bond(c, ph[0]!);
    const [, ch2, ca] = d.chain(ph[3], ["O", 4 * s, 0], ["C", 4.9 * s, 0.5], ["C", 5.8 * s, 0]);
    void ch2;
    const [cb] = d.chain(ca, ["C", 6.7 * s, 0.4]);
    const o = d.at("O", 6.45 * s, -0.55);
    d.bond(ca!, o).bond(cb!, o);
  }
  return d.done();
})();
const pet = (() => {
  // One unit of PET: –O–CH2–CH2–O–C(=O)–C6H4–C(=O)–.
  const d = new Draw();
  const ph = d.ring(["C", "C", "C", "C", "C", "C"], 0, 0, 0, true);
  const [cl] = d.chain(ph[3], ["C", -2, 0]);
  d.chain(cl, ["O", -2.5, -0.9, 2]);
  const [cr] = d.chain(ph[0], ["C", 2, 0]);
  d.chain(cr, ["O", 2.5, -0.9, 2]);
  d.chain(cr, ["O", 2.9, 0.5], ["C", 3.9, 0], ["C", 4.8, 0.5], ["O", 5.7, 0]);
  return d.done();
})();
const caco3 = (() => {
  const d = new Draw("red");
  const c = d.at("C", 0.6, 0);
  d.chain(c, ["O", 0.6, -1.1, 2]);
  const [o] = d.chain(c, ["O", -0.35, 0.55]);
  d.chain(c, ["O", 1.55, 0.55]);
  d.chain(o, ["Ca", -1.6, -0.3, 0]);
  return d.done();
})();
const pyrite = (() => {
  // Fe²⁺ and the S–S pair (S2²⁻) of pyrite's cubic crystal.
  const d = new Draw("red");
  const fe = d.at("Fe", -0.9, 0);
  const [a, b] = d.chain(undefined, ["S", 0.45, -0.55], ["S", 0.45, 0.55]);
  d.bond(fe, a!, 0).bond(fe, b!, 0);
  return d.done();
})();
const forsterite = (() => {
  // The SiO4 tetrahedron and its two Mg²⁺.
  const d = new Draw("red");
  const si = d.at("Si", 0, 0);
  const os = ([[0, -1.1], [1.05, 0.4], [-1.05, 0.4], [0, 1.1]] as const).map(([x, y]) => d.chain(si, ["O", x, y])[0]!);
  d.chain(os[2], ["Mg", -2.1, -0.4, 0]);
  d.chain(os[1], ["Mg", 2.1, -0.4, 0]);
  return d.done();
})();
const lco = (() => {
  // Layers of LiCoO2: a sheet of CoO2 (Co between two O layers) with Li between the sheets.
  const d = new Draw("red");
  const row = (el: string, y: number, n = 3) => Array.from({ length: n }, (_, c) => d.at(el, (c - (n - 1) / 2) * 1.2, y));
  const li = row("Li", -1.6);
  const o1 = row("O", -0.6);
  const co = row("Co", 0);
  const o2 = row("O", 0.6);
  co.forEach((c, k) => d.bond(c, o1[k]!).bond(c, o2[k]!));
  li.forEach((l, k) => d.bond(l, o1[k]!, 0));
  return d.done();
})();

export const COMPOUNDS: readonly Compound[] = [
  { id: "agua", formula: "H2O", name: "Agua", pubchem: { name: "Water", cid: 962 }, real: "Líquido incoloro, sin olor ni sabor; azulado en mucho espesor", reality: "real", look: { palette: ["#7fd6ff", "#c8f0ff", "#06243a"], particle: "gotas" }, molecule: water },
  { id: "oxigeno", formula: "O2", name: "Oxígeno", pubchem: { name: "Oxygen", cid: 977 }, real: "Gas incoloro e inodoro; líquido, azul pálido", reality: "real", look: { palette: ["#9fd2ff", "#e3f3ff", "#081a33"], particle: "burbujas" }, molecule: pair("O", "O", 2) },
  { id: "nitrogeno", formula: "N2", name: "Nitrógeno", pubchem: { name: "Nitrogen", cid: 947 }, real: "Gas incoloro e inodoro, el 78 % del aire", reality: "real", look: { palette: ["#b9c4ff", "#eef0ff", "#0d1030"], particle: "burbujas" }, molecule: pair("N", "N", 3) },
  { id: "co2", formula: "CO2", name: "Dióxido de carbono", pubchem: { name: "Carbon dioxide", cid: 280 }, real: "Gas incoloro e inodoro", reality: "real", look: { palette: ["#cfd8e3", "#ffffff", "#141a22"], particle: "burbujas" }, molecule: co2 },
  { id: "co", formula: "CO", name: "Monóxido de carbono", pubchem: { name: "Carbon monoxide", cid: 281 }, real: "Gas incoloro, inodoro y tóxico", reality: "real", look: { palette: ["#a9aeb8", "#e0e2e6", "#16171b"], particle: "humo" }, molecule: pair("C", "O", 3) },
  { id: "metano", formula: "CH4", name: "Metano", pubchem: { name: "Methane", cid: 297 }, real: "Gas incoloro e inodoro; arde con llama azul", reality: "real", look: { palette: ["#5aa8ff", "#d5ecff", "#050d26"], particle: "llamas" }, molecule: methane },
  { id: "glucosa", formula: "C6H12O6", name: "Glucosa", pubchem: { name: "D-Glucose", cid: 5793 }, real: "Polvo cristalino blanco, dulce", reality: "real", look: { palette: ["#fff3d6", "#ffffff", "#2a1f0f"], particle: "polvo" }, molecule: glucose },
  { id: "celulosa", formula: "(C6H10O5)n", name: "Celulosa", pubchem: { name: "Cellulose" }, real: "Fibras o polvo blancos, sin olor (el papel)", reality: "real", look: { palette: ["#f1e6cf", "#fffaf0", "#2b2418"], particle: "fibras" }, molecule: cellulose },
  { id: "cloruro-plata", formula: "AgCl", name: "Cloruro de plata", pubchem: { name: "Silver chloride", cid: 24561 }, real: "Sólido cristalino blanco que se oscurece a la luz (cristales cúbicos)", reality: "real", look: { palette: ["#e8eef5", "#ffffff", "#1a1e24"], particle: "cristales" }, molecule: salt("Ag", "Cl") },
  { id: "sal", formula: "NaCl", name: "Cloruro de sodio (sal)", pubchem: { name: "Sodium chloride", cid: 5234 }, real: "Cristales cúbicos blancos o incoloros", reality: "real", look: { palette: ["#ffffff", "#e6f4ff", "#101824"], particle: "cristales" }, molecule: salt("Na", "Cl") },
  { id: "fluoresceina", formula: "C20H12O5", name: "Fluoresceína", pubchem: { name: "Fluorescein", cid: 16850 }, real: "Polvo rojo anaranjado; en el agua, verde fluorescente", reality: "real", look: { palette: ["#7dff6a", "#e4ffb0", "#03230c"], particle: "gotas" }, molecule: fluorescein },
  { id: "escopolamina", formula: "C17H21NO4", name: "Escopolamina", pubchem: { name: "Scopolamine", cid: 3000322 }, real: "Líquido viscoso incoloro; su bromhidrato, cristales blancos", reality: "real", look: { palette: ["#d9c8ff", "#f6f0ff", "#160d2a"], particle: "polvo" }, molecule: scopolamine },
  { id: "tetroxido", formula: "N2O4", name: "Tetróxido de dinitrógeno", pubchem: { name: "Dinitrogen tetroxide", cid: 25352 }, real: "Líquido o gas pardo rojizo (con NO₂), de olor picante", reality: "real", look: { palette: ["#ff8a4c", "#ffd0a8", "#2a0e04"], particle: "humo" }, molecule: n2o4 },
  { id: "epoxi", formula: "C21H24O4", name: "Éter diglicidílico del bisfenol A (resina epoxi)", pubchem: { name: "Bisphenol A diglycidyl ether", cid: 2286 }, real: "Líquido viscoso de incoloro a amarillo pálido", reality: "real", look: { palette: ["#ffd24a", "#fff3b8", "#0b0b0b"], particle: "fibras" }, molecule: badge },
  { id: "litio-cobalto", formula: "LiCoO2", name: "Óxido de litio y cobalto", pubchem: { name: "Lithium cobalt oxide" }, real: "Polvo gris azulado oscuro", reality: "real", look: { palette: ["#4fc3ff", "#d2f1ff", "#06101c"], particle: "chispas" }, molecule: lco },
  { id: "dodecano", formula: "C12H26", name: "Dodecano (modelo del queroseno)", pubchem: { name: "Dodecane", cid: 8182 }, real: "Líquido incoloro", reality: "real", look: { palette: ["#ffc35a", "#fff0c4", "#241404"], particle: "gotas" }, molecule: dodecane },
  { id: "forsterita", formula: "Mg2SiO4", name: "Forsterita (olivino)", pubchem: { name: "Forsterite" }, real: "Cristales verde oliva (el olivino), incoloros si son puros", reality: "real", look: { palette: ["#a8c84a", "#e8f5b8", "#121804"], particle: "cristales" }, molecule: forsterite },
  { id: "pet", formula: "C10H8O4", name: "Poli(tereftalato de etileno), PET (una unidad)", pubchem: { name: "Polyethylene terephthalate" }, real: "Sólido blanco o transparente; en fibra, el poliéster", reality: "real", look: { palette: ["#f4f7ff", "#ffffff", "#141824"], particle: "fibras" }, molecule: pet },
  { id: "trietilaluminio", formula: "Al(C2H5)3", name: "Trietilaluminio (TEA)", pubchem: { name: "Triethylaluminum", cid: 16682 }, real: "Líquido incoloro que arde solo en el aire; con trietilborano, llama verde", reality: "real", look: { palette: ["#5dff8f", "#d0ffe0", "#021a0a"], particle: "llamas" }, molecule: tea },
  { id: "pirita", formula: "FeS2", name: "Pirita (disulfuro de hierro)", pubchem: { name: "Pyrite" }, real: "Cristales cúbicos amarillo latón con brillo metálico", reality: "real", look: { palette: ["#ffd76a", "#fff4c2", "#1c1404"], particle: "cristales" }, molecule: pyrite },
  { id: "carbonato-calcio", formula: "CaCO3", name: "Carbonato de calcio", pubchem: { name: "Calcium carbonate", cid: 10112 }, real: "Polvo blanco o cristales incoloros (calcita); la cáscara del huevo", reality: "real", look: { palette: ["#fff8ef", "#ffffff", "#1d1a16"], particle: "polvo" }, molecule: caco3 },
];

const BY = new Map(COMPOUNDS.map((c) => [c.id, c]));
export function compound(id: string): Compound {
  const c = BY.get(id);
  if (!c) throw new Error(`Sin compuesto «${id}»`);
  return c;
}

/** Element colours for the molecule's drawing (CPK, as chemists colour them). */
export const ELEMENT_COLOR: Readonly<Record<string, string>> = {
  H: "#ffffff", C: "#5a5a5a", N: "#3b5bff", O: "#ff2d2d", Cl: "#2fd33a", Na: "#ab5cf2", Ag: "#c0c0c0", Ca: "#3dff00",
  Fe: "#e06633", S: "#ffd52b", Si: "#f0c8a0", Mg: "#8aff00", Li: "#cc80ff", Co: "#f090a0", Al: "#bfa6a6",
};
