import { describe, expect, it } from "vitest";
import { BioLab, BIO_TUNING, overallSelfSufficiency, selfSufficiencyGauge, type BioProcess, type GaugeInput } from "./bioreactor";
import { MaterialStock } from "./materials";

const basis = { value: "test", source: "https://example.org" };
const grow: BioProcess = { id: "a", name: "A", equipmentId: "eq-a", organism: "x", inputs: { co2: 1, fertilizante: 0.1 }, outputs: { oxigeno: 0.7, grano: 0.3 }, basis, steps: ["revisa", "ajusta el caudal", "recoge"] };
const eat: BioProcess = { id: "b", name: "B", equipmentId: "eq-b", organism: "y", inputs: { grano: 0.2 }, outputs: { co2: 0.1 }, basis, steps: ["revisa", "recoge"] };
const all = () => true;

describe("BioLab: continuous living machines", () => {
  it("does nothing until a process is tuned, then runs at full speed for the tuned hours", () => {
    const lab = new BioLab([grow]);
    const s = new MaterialStock({ co2: 100, fertilizante: 10 });
    lab.tick(10, s, all);
    expect(lab.state("a")).toBe("parado");
    expect(s.amount("oxigeno")).toBe(0);
    lab.tune("a");
    lab.tick(10, s, all);
    expect(lab.state("a")).toBe("en-marcha");
    expect(s.amount("oxigeno")).toBeCloseTo(7);
    expect(s.amount("co2")).toBeCloseTo(90);
    expect(lab.hoursLeft("a")).toBeCloseTo(BIO_TUNING.tunedHours - 10);
  });

  it("drifts to half speed after the tuned hours, until tuned again", () => {
    const lab = new BioLab([grow]);
    const s = new MaterialStock({ co2: 1e6, fertilizante: 1e6 });
    lab.tune("a");
    lab.tick(BIO_TUNING.tunedHours, s, all);
    expect(lab.state("a")).toBe("desajustado");
    const before = s.amount("grano");
    lab.tick(10, s, all);
    expect(s.amount("grano") - before).toBeCloseTo(0.3 * 10 * BIO_TUNING.driftEfficiency);
    lab.tune("a");
    expect(lab.state("a")).toBe("en-marcha");
  });

  it("slows to the scarcest input and says which one", () => {
    const lab = new BioLab([grow]);
    const s = new MaterialStock({ co2: 100, fertilizante: 0.5 });
    lab.tune("a");
    lab.tick(10, s, all);
    expect(lab.run("a").k).toBeCloseTo(0.5);
    expect(lab.run("a").short).toBe("fertilizante");
    expect(s.amount("fertilizante")).toBe(0);
  });

  it("does not run equipment that is not installed", () => {
    const lab = new BioLab([grow]);
    const s = new MaterialStock({ co2: 100, fertilizante: 10 });
    lab.tune("a");
    lab.tick(10, s, () => false);
    expect(lab.run("a").k).toBe(0);
    expect(s.amount("co2")).toBe(100);
  });

  it("puts the crew's exhaled CO₂ in the store before the processes take it", () => {
    const lab = new BioLab([grow]);
    const s = new MaterialStock({ fertilizante: 10 });
    lab.tune("a");
    lab.tick(10, s, all, 0.5);
    expect(lab.run("a").k).toBeCloseTo(0.5);
    expect(lab.run("a").short).toBe("co2");
  });

  it("feeds one process with the other's output in catalogue order, and counts what it made", () => {
    const lab = new BioLab([grow, eat]);
    const s = new MaterialStock({ co2: 100, fertilizante: 10 });
    lab.tune("a");
    lab.tune("b");
    lab.tick(1, s, all);
    expect(s.amount("grano")).toBeCloseTo(0.1);
    expect(lab.made.oxigeno).toBeCloseTo(0.7);
    const day = lab.perDay();
    expect(day.made.grano).toBeCloseTo(0.3 * 24);
    expect(day.used.grano).toBeCloseTo(0.2 * 24);
  });

  it("refuses to tune an unknown process", () => {
    expect(() => new BioLab([grow]).tune("nope")).toThrow();
  });
});

describe("self-sufficiency gauge", () => {
  const needs = { o2KgPerDay: 0.816, co2KgPerDay: 1.04, waterKgPerDay: 3.8, waterRecovered: 0.98 };
  const input = (over: Partial<GaugeInput> = {}): GaugeInput => ({
    perDay: { made: { oxigeno: 1.0, grano: 0.5, fertilizante: 0.018 }, used: { oxigeno: 0.2, co2: 1.5, fertilizante: 0.036 } },
    crew: 1,
    needs,
    eatersKcalPerDay: 3400,
    kcalPerKg: { grano: 3400 },
    wasteLoopRuns: false,
    resinLocalKg: 30,
    resinImportedKg: 120,
    ...over,
  });
  const byId = (rows: ReturnType<typeof selfSufficiencyGauge>) => Object.fromEntries(rows.map((r) => [r.id, r]));

  it("oxygen is net of what the bacteria breathe; food counts kcal; shares are capped at 1", () => {
    const g = byId(selfSufficiencyGauge(input()));
    expect(g.oxigeno!.local).toBeCloseTo(0.8);
    expect(g.oxigeno!.share).toBeCloseTo(0.8 / 0.816);
    expect(g.comida!.local).toBeCloseTo(1700);
    expect(g.comida!.share).toBeCloseTo(0.5);
    expect(g.co2!.share).toBe(1);
  });

  it("water: 98 % from the ECLSS, all of it once the waste loop runs", () => {
    expect(byId(selfSufficiencyGauge(input())).agua!.share).toBeCloseTo(0.98);
    expect(byId(selfSufficiencyGauge(input({ wasteLoopRuns: true }))).agua!.share).toBe(1);
  });

  it("nitrogen does not close on the loop alone: the shortfall is imported fertiliser", () => {
    const n = byId(selfSufficiencyGauge(input())).nitrogeno!;
    expect(n.share).toBeCloseTo(0.5);
    expect(n.imported).toBeCloseTo(0.018);
    expect(n.note).toMatch(/importado/);
  });

  it("a local nitrogen source (the comet ammonia hook) closes the gap; an imported one does not count", () => {
    const local = byId(selfSufficiencyGauge(input({ nitrogen: [{ id: "cometa", label: "Amoníaco de cometa", kgNPerDay: 0.018, local: true }] }))).nitrogeno!;
    expect(local.share).toBeCloseTo(1);
    expect(local.imported).toBeCloseTo(0);
    const imported = byId(selfSufficiencyGauge(input({ nitrogen: [{ id: "bidon", label: "Bidón", kgNPerDay: 0.018, local: false }] }))).nitrogeno!;
    expect(imported.share).toBeCloseTo(0.5);
  });

  it("resin: the share of all resin that was grown here", () => {
    const rows = selfSufficiencyGauge(input());
    expect(byId(rows).resina!.share).toBeCloseTo(30 / 150);
    expect(overallSelfSufficiency(rows)).toBeGreaterThan(0);
    expect(overallSelfSufficiency(rows)).toBeLessThanOrEqual(1);
  });
});
