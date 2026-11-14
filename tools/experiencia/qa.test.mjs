import { describe, expect, it } from "vitest";
import { checkBudgets, exitCodeFor, journeyPasses, makeChecker, renderRunLog, runLogName, updateRegistro, verdict } from "./qa.mjs";
import { BUDGETS, JOURNEYS } from "./presupuestos.mjs";

describe("experience checker", () => {
  it("zero checks is not OK, setup steps do not count", () => {
    const c = makeChecker();
    expect(verdict(c.checks)).toBe("SIN COMPROBACIONES");
    c.setup("teleport");
    expect(verdict(c.checks)).toBe("SIN COMPROBACIONES");
    c.check("se ve", true);
    expect(verdict(c.checks)).toBe("OK");
    c.check("falla", false);
    expect(verdict(c.checks)).toBe("FALLA");
  });

  it("exit code is 0 only when every journey is OK and there is at least one", () => {
    expect(exitCodeFor([])).toBe(1);
    expect(exitCodeFor(["OK", "OK"])).toBe(0);
    expect(exitCodeFor(["OK", "SIN COMPROBACIONES"])).toBe(1);
    expect(exitCodeFor(["FALLA"])).toBe(1);
  });
});

describe("budgets", () => {
  const perf = { frames: 120, loadMs: 900, frameP95Ms: 20, slowFramesPct: 2, longTasksPerMin: 1, heapMB: 60, drawCalls: 50, trianglesK: 100 };
  it("passes within budget", () => {
    const rows = checkBudgets(perf, BUDGETS);
    expect(rows.every((r) => r.ok && r.binding)).toBe(true);
    expect(journeyPasses([{ name: "x", ok: true }], rows)).toBe(true);
  });

  it("a missing sample is «no medido» and fails, never 0", () => {
    const rows = checkBudgets({ ...perf, frames: 0, heapMB: undefined }, BUDGETS);
    const p95 = rows.find((r) => r.key === "frameP95Ms");
    const heap = rows.find((r) => r.key === "heapMB");
    expect(p95.measured).toBe(false);
    expect(heap.measured).toBe(false);
    expect(heap.ok).toBe(false);
    expect(journeyPasses([{ name: "x", ok: true }], rows)).toBe(false);
  });

  it("GPU-bound budgets are informative on a software GPU, unless strict", () => {
    const slow = { ...perf, frameP95Ms: 180 };
    expect(journeyPasses([{ name: "x", ok: true }], checkBudgets(slow, BUDGETS, { softwareGl: true }))).toBe(true);
    expect(journeyPasses([{ name: "x", ok: true }], checkBudgets(slow, BUDGETS, { softwareGl: true, strict: true }))).toBe(false);
    expect(journeyPasses([{ name: "x", ok: true }], checkBudgets({ ...perf, heapMB: 900 }, BUDGETS, { softwareGl: true }))).toBe(false);
  });
});

describe("run log and registro", () => {
  const date = new Date(Date.UTC(2026, 10, 13, 9, 5));
  it("names runs by UTC minute and journey IDs", () => {
    expect(runLogName(date, ["PX-01", "PX-03"])).toBe("2026-11-13-0905-PX-01-PX-03.md");
  });

  it("renders commit, journey table and budgets", () => {
    const budgets = checkBudgets({ frames: 0 }, BUDGETS);
    const md = renderRunLog({ date, commit: "abc1234", branch: "x", env: "iPhone 13", results: [{ id: "PX-01", title: "Cocinar", checks: [{ name: "a", ok: true }], verdict: "OK", passed: false, budgets, perf: { frames: 0 } }] });
    expect(md).toContain("`abc1234`");
    expect(md).toContain("| PX-01 | Cocinar | FALLA | 1/1 |");
    expect(md).toContain("no medido");
  });

  it("rewrites a journey's row in registro.md and lists the run on top of the run table", () => {
    const md = [
      "## Estado por caso", "", "| ID | Estado | Fecha | Commit | Evidencia / run |", "|---|---|---|---|---|",
      "| CV-01 | Probado (suite) | 2026-11-13 | `x` | [run](runs/a.md): OK |", "| PX-01 | Sin probar | | | sin run log |",
      "", "## Última ejecución por run log", "", "| Fecha | Casos | Modo | Resultado | Run |", "|---|---|---|---|---|",
      "| 2026-11-13 10:18 | CV-01 | Vitest | OK | [run](runs/a.md) |", "",
    ].join("\n");
    const out = updateRegistro(md, {
      when: "2026-11-13 11:05",
      log: "r.md",
      rows: [
        { id: "PX-01", passed: true, date: "2026-11-13", commit: "abc", summary: "12 OK" },
        { id: "PX-02", passed: false, date: "2026-11-13", commit: "abc", summary: "1 FALLA" },
      ],
    });
    expect(out).toContain("| PX-01 | Probado (en vivo) | 2026-11-13 | `abc` | [run](runs/r.md): 12 OK |");
    expect(out).toContain("| CV-01 | Probado (suite) |");
    expect(out.indexOf("| PX-02 | FAIL |")).toBeGreaterThan(out.indexOf("| PX-01 | Probado"));
    expect(out.indexOf("| PX-02 | FAIL |")).toBeLessThan(out.indexOf("## Última"));
    const runs = out.slice(out.indexOf("## Última"));
    expect(runs.indexOf("| 2026-11-13 11:05 | PX-01, PX-02 | Experiencia (Playwright) | 1/2 recorridos bien | [run](runs/r.md) |")).toBeLessThan(runs.indexOf("10:18"));
  });

  it("journey IDs are unique and stable in shape", () => {
    const ids = JOURNEYS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^PX-\d{2}$/);
  });
});
