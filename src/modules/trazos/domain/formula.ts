/**
 * A chemical formula as the glyphs to draw, one by one (docs/design/retos-trazos.md §Glifos): «C6H12O6», «Al(C2H5)3»,
 * «(C6H10O5)n», «SO4^2-». Digits after a symbol or a bracket are subscripts; after «^», superscripts (the charge, with
 * «+» or «-»); an «n» right after «)» is the polymer's subscript. «-» is drawn as the minus sign «−».
 */
export type GlyphRole = "base" | "sub" | "sup";

export interface FormulaGlyph {
  readonly char: string;
  readonly role: GlyphRole;
}

export function parseFormula(formula: string): FormulaGlyph[] {
  const out: FormulaGlyph[] = [];
  let sup = false;
  let prev = "";
  for (const ch of formula) {
    if (ch === "^") {
      sup = true;
      continue;
    }
    if (ch === " ") continue;
    const char = ch === "-" ? "−" : ch;
    let role: GlyphRole = "base";
    if (sup) role = "sup";
    else if (/[0-9]/.test(ch)) role = "sub";
    else if (ch === "n" && prev === ")") role = "sub";
    out.push({ char, role });
    prev = ch;
  }
  return out;
}

/** The formula as text with Unicode subscripts and superscripts (for labels and aria). */
export function formulaText(formula: string): string {
  const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", n: "ₙ" };
  const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "−": "⁻" };
  return parseFormula(formula)
    .map((g) => (g.role === "sub" ? (SUB[g.char] ?? g.char) : g.role === "sup" ? (SUP[g.char] ?? g.char) : g.char))
    .join("");
}

/** How many atoms of each element a formula has (brackets multiplied; a polymer's «n» and a charge ignored). */
export function elementCounts(formula: string): Record<string, number> {
  const body = formula.split("^")[0]!;
  let i = 0;
  const group = (): Record<string, number> => {
    const out: Record<string, number> = {};
    const add = (el: string, n: number) => (out[el] = (out[el] ?? 0) + n);
    while (i < body.length) {
      const ch = body[i]!;
      if (ch === "(") {
        i++;
        const inner = group();
        const n = count();
        for (const [el, k] of Object.entries(inner)) add(el, k * n);
      } else if (ch === ")") {
        i++;
        return out;
      } else if (/[A-Z]/.test(ch)) {
        let el = ch;
        i++;
        if (i < body.length && /[a-z]/.test(body[i]!) && !(body[i] === "n" && body[i - 1] === ")")) el += body[i++];
        add(el, count());
      } else i++;
    }
    return out;
  };
  const count = (): number => {
    let s = "";
    while (i < body.length && /[0-9]/.test(body[i]!)) s += body[i++];
    if (!s && body[i] === "n") i++;
    return s ? Number(s) : 1;
  };
  return group();
}
