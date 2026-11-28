import { describe, expect, it } from "vitest";
import { COMPOUNDS, ELEMENT_COLOR } from "./compounds";
import { GLYPHS, glyphOf, hasGlyph } from "./glyphs";
import { elementCounts, parseFormula } from "../domain/formula";
import { checkStroke } from "../domain/trace";
import { bounds, length } from "../domain/shape";

const ELEMENTS = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");

describe("los glifos", () => {
  it("hay glifo para cada letra de cada símbolo químico, los dígitos, + − y paréntesis", () => {
    for (const el of ELEMENTS) for (const ch of el) expect(hasGlyph(ch), `${el}: ${ch}`).toBe(true);
    for (const ch of "0123456789+−()") expect(hasGlyph(ch), ch).toBe(true);
  });
  it("cada glifo cabe en su caja (alto 0–1,32, ancho el suyo) y no repite carácter", () => {
    expect(new Set(GLYPHS.map((g) => g.char)).size).toBe(GLYPHS.length);
    for (const g of GLYPHS) {
      const b = bounds(g.strokes);
      expect(b.y0, g.char).toBeGreaterThanOrEqual(-0.02);
      expect(b.y1, g.char).toBeLessThanOrEqual(1.33);
      expect(b.x0, g.char).toBeGreaterThanOrEqual(-0.02);
      expect(b.x1, g.char).toBeLessThanOrEqual(g.width + 0.02);
      for (const s of g.strokes) expect(s.length, g.char).toBeGreaterThanOrEqual(2);
    }
  });
  it("cada trazo de cada glifo, recorrido tal cual a 300 px de alto, cuenta", () => {
    for (const g of GLYPHS)
      for (const s of g.strokes) {
        const px = s.map((p) => ({ x: p.x * 300, y: p.y * 300 }));
        expect(checkStroke(px, px, 0.12 * 300).ok, g.char).toBe(true);
      }
  });
  it("los trazos largos al revés no cuentan", () => {
    for (const g of GLYPHS)
      for (const s of g.strokes) {
        const px = s.map((p) => ({ x: p.x * 300, y: p.y * 300 }));
        // A closed loop or a short stroke reads the same both ways.
        const closed = Math.hypot(px[0]!.x - px.at(-1)!.x, px[0]!.y - px.at(-1)!.y) < 0.3 * 300;
        if (length(px) < 0.6 * 300 || closed) continue;
        expect(checkStroke(px, [...px].reverse(), 0.12 * 300).ok, g.char).toBe(false);
      }
  });
});

describe("los compuestos", () => {
  it("cada fórmula se puede dibujar entera", () => {
    for (const c of COMPOUNDS) for (const f of parseFormula(c.formula)) expect(() => glyphOf(f.char), `${c.id}: ${f.char}`).not.toThrow();
  });
  it("su molécula tiene los átomos de la fórmula (sin los H si no los dibuja; en una red, en su proporción)", () => {
    for (const c of COMPOUNDS) {
      const want = elementCounts(c.formula);
      const got: Record<string, number> = {};
      for (const a of c.molecule.atoms) got[a.el] = (got[a.el] ?? 0) + 1;
      if (!c.molecule.withH) delete want.H;
      if (c.molecule.kind === "molecula") expect(got, c.id).toEqual(want);
      else {
        const els = Object.keys(want);
        expect(Object.keys(got).sort(), c.id).toEqual(els.sort());
        const k = got[els[0]!]! / want[els[0]!]!;
        for (const el of els) expect(got[el]! / want[el]!, `${c.id} ${el}`).toBeCloseTo(k);
      }
      for (const b of c.molecule.bonds) {
        const a = c.molecule.atoms[b.a]!;
        const z = c.molecule.atoms[b.b]!;
        expect(Math.hypot(a.x - z.x, a.y - z.y), `${c.id} enlace`).toBeLessThan(1.8);
      }
      for (const a of c.molecule.atoms) expect(ELEMENT_COLOR[a.el], a.el).toBeDefined();
    }
  });
  it("cada uno con su nombre de PubChem, su aspecto real y su paleta", () => {
    for (const c of COMPOUNDS) {
      expect(c.pubchem.name.length).toBeGreaterThan(1);
      expect(c.real.length).toBeGreaterThan(5);
      for (const col of c.look.palette) expect(col).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(COMPOUNDS.map((c) => c.id)).size).toBe(COMPOUNDS.length);
  });
});
