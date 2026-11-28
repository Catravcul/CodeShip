import { describe, expect, it } from "vitest";
import { glyphOf } from "../data/glyphs";
import { parseFormula } from "./formula";
import { TraceRun } from "./run";

const ok = { ok: true, coverage: 1, stray: 0 };
const bad = { ok: false, coverage: 0.3, stray: 0, why: "corto" as const };

describe("dibujar una fórmula glifo a glifo", () => {
  it("H2O: los tres trazos de la H, el del 2 y el de la O", () => {
    const run = new TraceRun(parseFormula("H2O"), glyphOf);
    expect(run.glyph!.char).toBe("H");
    expect(run.submit(ok)).toBe("trazo");
    expect(run.submit(ok)).toBe("trazo");
    expect(run.submit(ok)).toBe("glifo");
    expect(run.glyph!.char).toBe("2");
    expect(run.submit(ok)).toBe("glifo");
    expect(run.submit(ok)).toBe("compuesto");
    expect(run.done).toBe(true);
  });
  it("un trazo mal hecho se repite sin castigo, y tras dos fallos la tolerancia se ensancha", () => {
    const run = new TraceRun(parseFormula("O2"), glyphOf);
    expect(run.help.widen).toBe(1);
    expect(run.submit(bad)).toBe("repite");
    expect(run.submit(bad)).toBe("repite");
    expect(run.glyphIndex).toBe(0);
    expect(run.help.widen).toBe(1.4);
    run.submit(bad);
    run.submit(bad);
    expect(run.help.widen).toBe(1.8);
    expect(run.help.rules.need).toBe(0.75);
    expect(run.submit(ok)).toBe("glifo");
    expect(run.help.widen).toBe(1);
    expect(run.misses).toBe(4);
  });
});
