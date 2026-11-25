import { describe, expect, it } from "vitest";
import { elementCounts, formulaText, parseFormula } from "./formula";

describe("una fórmula como glifos", () => {
  it("los números tras un símbolo son subíndices", () => {
    expect(parseFormula("C6H12O6").map((g) => `${g.char}${g.role[0]}`).join(" ")).toBe("Cb 6s Hb 1s 2s Ob 6s");
  });
  it("paréntesis, el n de un polímero y la carga", () => {
    expect(parseFormula("(C6H10O5)n").at(-1)).toEqual({ char: "n", role: "sub" });
    expect(parseFormula("Al(C2H5)3").at(-1)).toEqual({ char: "3", role: "sub" });
    expect(parseFormula("SO4^2-").slice(-2)).toEqual([{ char: "2", role: "sup" }, { char: "−", role: "sup" }]);
  });
  it("texto con subíndices", () => {
    expect(formulaText("C6H12O6")).toBe("C₆H₁₂O₆");
    expect(formulaText("(C6H10O5)n")).toBe("(C₆H₁₀O₅)ₙ");
    expect(formulaText("NH4^+")).toBe("NH₄⁺");
  });
  it("cuenta los átomos de cada elemento", () => {
    expect(elementCounts("C6H12O6")).toEqual({ C: 6, H: 12, O: 6 });
    expect(elementCounts("Al(C2H5)3")).toEqual({ Al: 1, C: 6, H: 15 });
    expect(elementCounts("(C6H10O5)n")).toEqual({ C: 6, H: 10, O: 5 });
    expect(elementCounts("Mg2SiO4")).toEqual({ Mg: 2, Si: 1, O: 4 });
    expect(elementCounts("NaCl")).toEqual({ Na: 1, Cl: 1 });
  });
});
