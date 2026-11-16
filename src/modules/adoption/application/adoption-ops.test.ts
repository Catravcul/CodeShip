import { describe, expect, it } from "vitest";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { STEP_AREAS } from "@modules/chores/application/step-visuals";
import { CHORE_CATEGORY } from "@modules/chores/domain/chore";
import { SANCTUARY_AREAS } from "@modules/sanctuary/data/areas";
import type { SanctuaryArea } from "@modules/sanctuary/domain/area";
import { SPECIES_CATALOG } from "../data/catalog";
import { ALL_SPECIES } from "../data/species-extra";
import type { CatalogEntry } from "../domain/entry";
import { AdoptionOps, type AdoptionPorts } from "./adoption-ops";

const right = (ex: Exercise): Answer => (ex.kind === "order" ? { kind: "order", order: ex.solution } : { kind: "choice", index: ex.correct });

/** The import system as a fake: 1 credit per 10 kg, 25 station hours of transfer; deliveries numbered. */
function world(credits = 1000) {
  const log = { credits, orders: [] as { label: string; kg: number; id: number }[], arrived: [] as { id: string; n: number; area: string }[], calm: 0 };
  const ports: AdoptionPorts = {
    quote: (kg) => ({ credits: Math.ceil(kg / 10), transitDays: 370, gameHours: 25, launcher: "Starship (objetivo)" }),
    credits: () => log.credits,
    order: (label, kg) => {
      const c = Math.ceil(kg / 10);
      if (c > log.credits) return { error: "sin créditos" };
      log.credits -= c;
      const id = log.orders.length + 1;
      log.orders.push({ label, kg, id });
      return { deliveryId: id };
    },
    arrive: (e: CatalogEntry, n: number, a: SanctuaryArea) => {
      log.arrived.push({ id: e.id, n, area: a.id });
      return e.names ? e.names.slice(0, 1) : [];
    },
    calm: (x) => (log.calm += x),
  };
  return { ops: new AdoptionOps(SPECIES_CATALOG, ALL_SPECIES, SANCTUARY_AREAS, ports), log, ports };
}

describe("VID-30 a new game: Doménica alone, the animals come from the catalogue", () => {
  it("only the crops, the hornwort and the biofilter live aboard; no animal is aboard", () => {
    const { ops } = world();
    expect([...ops.residentsOf("jardin-anillo")]).toEqual(["cultivos"]);
    expect([...ops.residentsOf("acuario-anillo")].sort()).toEqual(["ceratofilo", "nitrificantes"]);
    for (const e of SPECIES_CATALOG.filter((x) => x.lodging !== "bucle")) expect(ops.status(e.id).kind, e.id).toBe("disponible");
    expect(ops.status("ceratofilo").kind).toBe("a-bordo");
    expect(ops.chores()).toEqual([]);
  });
});

describe("VID-32 adopt: it must fit the area and the loop, it pays the import and arrives after the transfer", () => {
  it("medaka for the empty tank: they fit the ring aquarium and close its loop (hornwort produces, bacteria decompose)", () => {
    const { ops, log } = world();
    const c = ops.check("medaka");
    expect(c.ok).toBe(true);
    expect(c.placement.area?.id).toBe("acuario-anillo");
    expect(c.cost.kind).toBe("importar");
    if (c.cost.kind === "importar") expect(c.cost.kg).toBeCloseTo(0.01 + 12 + 0.0003 * 370, 1);
    ops.adopt("medaka");
    expect(log.orders).toHaveLength(1);
    expect(ops.status("medaka").kind).toBe("en-camino");
    expect(ops.check("medaka").ok).toBe(false);
    expect(ops.drainEvents()).toContainEqual(expect.objectContaining({ type: "pedido" }));
    // The import system lands the delivery: the medaka arrive in the tank.
    expect(ops.delivered(1)).toBe(true);
    expect(log.arrived).toEqual([{ id: "medaka", n: 20, area: "acuario-anillo" }]);
    expect(ops.status("medaka")).toMatchObject({ kind: "a-bordo", count: 20, areaId: "acuario-anillo" });
    expect(ops.residentsOf("acuario-anillo")).toContain("medaka");
    expect(ops.drainEvents()).toContainEqual(expect.objectContaining({ type: "llegada", count: 20 }));
    expect(ops.delivered(99)).toBe(false);
  });

  it("the nerite goes to the same tank; a cat to the farm deck (the crew eats its crops: consumer)", () => {
    const { ops } = world();
    expect(ops.check("nerita").placement.area?.id).toBe("acuario-anillo");
    expect(ops.check("gato").placement.area?.id).toBe("jardin-anillo");
    expect(ops.check("gallina").ok).toBe(true);
  });

  it("the rules can say no: salt water, a cold-water worm, a deep-sea fish, an area not built yet", () => {
    const { ops } = world();
    expect(ops.check("artemia").why).toMatch(/aún no está construida|No cabe/);
    const worm = ops.check("lombriz-comun");
    expect(worm.ok).toBe(false);
    expect(worm.placement.verdicts.find((v) => v.areaId === "jardin-anillo")!.fit.reasons).toContain("temperatura");
    expect(ops.check("granadero").why).toBe("No cabe en ningún área de la nave");
    const sphere = ops.check("medaka").placement.verdicts.find((v) => v.areaId === "esfera-de-agua")!;
    expect(sphere.built).toBe(false);
    expect(sphere.fit.ok).toBe(true);
  });

  it("the loop: a tank with no decomposers turns down a second consumer, but takes the decomposer it lacks", () => {
    const areas = SANCTUARY_AREAS.map((a) => (a.id === "acuario-anillo" ? { ...a, residents: ["ceratofilo", "medaka"] } : a));
    const ops = new AdoptionOps(
      SPECIES_CATALOG.map((e) => (e.id === "medaka" ? { ...e, aboard: true } : e)),
      ALL_SPECIES,
      areas,
      world().ports,
    );
    const zebra = ops.check("pez-cebra");
    expect(zebra.ok).toBe(false);
    expect(zebra.why).toMatch(/no se cierra: falta un descomponedor/);
    expect(ops.check("gamba-roja").ok).toBe(true);
  });

  it("without the credits nothing is ordered", () => {
    const { ops, log } = world(1);
    const c = ops.check("gallina");
    expect(c.ok).toBe(false);
    expect(c.why).toMatch(/Faltan \d+ créditos/);
    expect(() => ops.adopt("gallina")).toThrow();
    expect(log.orders).toHaveLength(0);
  });

  it("dormant eggs and cysts hatch aboard in board days, for free", () => {
    const { ops, log } = world();
    ops.adopt("grillo");
    expect(log.orders).toHaveLength(0);
    expect(ops.status("grillo")).toMatchObject({ kind: "eclosionando", daysLeft: 12 });
    ops.tick(11.9);
    expect(ops.status("grillo").kind).toBe("eclosionando");
    ops.tick(0.2);
    expect(ops.status("grillo").kind).toBe("a-bordo");
    expect(log.arrived[0]).toMatchObject({ id: "grillo", area: "jardin-anillo" });
    // Silkworms want 22–28 °C: the farm deck (20–26 °C) is too cool for them.
    expect(ops.check("gusano-seda").ok).toBe(false);
  });
});

describe("VID-32 a colony that arrives: the friendship program, then its help", () => {
  const solve = (ops: AdoptionOps, id: string) => {
    const chore = ops.chores().find((c) => c.id === id);
    if (!chore) throw new Error(`no hay ${id}: ${ops.chores().map((c) => c.id).join(", ")}`);
    const s = ops.start(chore);
    for (const ex of chore.exercises) expect(s.answer(right(ex))).toBe(true);
    expect(s.run.status).toBe("done");
  };

  it("befriend the crickets, then ask them for help; help lasts 10 days", () => {
    const { ops, log } = world();
    ops.adopt("grillo");
    ops.tick(12);
    expect(ops.chores().map((c) => c.id)).toEqual(["especie-amistad-grillo"]);
    solve(ops, "especie-amistad-grillo");
    expect(ops.friends("grillo")).toBe(true);
    expect(log.calm).toBeGreaterThan(0);
    const help = ops.chores()[0]!;
    expect(help.id).toBe("especie-ayuda-grillo");
    expect(help.title).toBe("Pedir ayuda a los grillos");
    solve(ops, help.id);
    expect(ops.helping("grillo")).toBe(true);
    expect(ops.chores()).toEqual([]);
    ops.tick(10.1);
    expect(ops.drainEvents()).toContainEqual(expect.objectContaining({ type: "ayuda-terminada" }));
    expect(ops.chores().map((c) => c.id)).toEqual(["especie-ayuda-grillo"]);
  });

  it("colony chores are animal care and mind programs; the colony lives in its area (the ring tank's shrimp, the farm deck's crickets)", () => {
    expect(CHORE_CATEGORY["amistad-especie"]).toBe("animales");
    expect(STEP_AREAS["ayuda-especie"].only).toBe("programar");
    const { ops } = world();
    // A shrimp alone would not close the tank's loop (it lacks a consumer): the medaka first.
    expect(ops.check("gamba-roja").why).toMatch(/falta un consumidor/);
    ops.adopt("medaka");
    ops.adopt("gamba-roja");
    ops.delivered(1);
    ops.delivered(2);
    ops.adopt("grillo");
    ops.tick(12);
    const [shrimp, silk] = [ops.chores().find((c) => c.targetId === "gamba-roja")!, ops.chores().find((c) => c.targetId === "grillo")!];
    expect(ops.areaOf(shrimp.targetId!)).toBe("acuario-anillo");
    expect(ops.areaOf(silk.targetId!)).toBe("jardin-anillo");
    for (const c of ops.chores()) for (const ex of c.exercises) if (ex.kind === "choice") expect(new Set(ex.options).size).toBe(ex.options.length);
  });

  it("cats, dogs, hens, the school and the snails have their own systems: no colony chores for them", () => {
    const { ops } = world();
    for (const id of ["gato", "chihuahua", "gallina", "medaka", "nerita"]) ops.adopt(id);
    for (let d = 1; d <= 5; d++) ops.delivered(d);
    expect(ops.chores()).toEqual([]);
  });
});
