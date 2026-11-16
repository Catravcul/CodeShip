import { describe, expect, it } from "vitest";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { STEP_AREAS } from "@modules/chores/application/step-visuals";
import { CHORE_CATEGORY } from "@modules/chores/domain/chore";
import type { SanctuaryArea } from "@modules/sanctuary/domain/area";
import { SPECIES_CATALOG } from "../data/catalog";
import { RACK_HABITATS } from "../data/rack-habitats";
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
  return { ops: new AdoptionOps(SPECIES_CATALOG, ALL_SPECIES, RACK_HABITATS, ports), log, ports };
}

describe("VID-30 a new game: Doménica alone, the animals come from the catalogue", () => {
  it("no animal is aboard and no colony has chores", () => {
    const { ops } = world();
    for (const h of RACK_HABITATS) expect(ops.residentsOf(h.id)).toEqual([]);
    for (const e of SPECIES_CATALOG.filter((x) => x.lodging !== "bucle")) expect(ops.status(e.id).kind, e.id).toBe("disponible");
    expect(ops.chores()).toEqual([]);
  });
});

describe("VID-32 adopt: only real species, into a real habitat; it pays the import and arrives after the transfer", () => {
  it("medaka for the aquatic habitat (JAXA AQH type): it fits and its filter and gas exchange close the loop", () => {
    const { ops, log } = world();
    const c = ops.check("medaka");
    expect(c.ok).toBe(true);
    expect(c.placement.area?.id).toBe("habitat-acuatico");
    expect(c.cost.kind).toBe("importar");
    if (c.cost.kind === "importar") expect(c.cost.kg).toBeCloseTo(0.004 + 3 + 0.0003 * 370, 1);
    ops.adopt("medaka");
    expect(log.orders).toHaveLength(1);
    expect(ops.status("medaka").kind).toBe("en-camino");
    expect(ops.check("medaka").ok).toBe(false);
    expect(ops.drainEvents()).toContainEqual(expect.objectContaining({ type: "pedido" }));
    expect(ops.delivered(1)).toBe(true);
    expect(log.arrived).toEqual([{ id: "medaka", n: 8, area: "habitat-acuatico" }]);
    expect(ops.status("medaka")).toMatchObject({ kind: "a-bordo", count: 8, areaId: "habitat-acuatico" });
    expect(ops.drainEvents()).toContainEqual(expect.objectContaining({ type: "llegada", count: 8 }));
    expect(ops.delivered(99)).toBe(false);
  });

  it("the Biomphalaria (flew in C.E.B.A.S.) shares the tank; mice go to the rodent habitat", () => {
    const { ops } = world();
    expect(ops.check("caracol").placement.area?.id).toBe("habitat-acuatico");
    expect(ops.check("pez-cebra").ok).toBe(true);
    expect(ops.check("raton").placement.area?.id).toBe("habitat-roedores");
  });

  it("«pendiente»: never lived in microgravity (nerite, hens), or no real habitat flown with it (cats, crickets)", () => {
    const { ops } = world();
    for (const id of ["nerita", "gallina", "lombriz", "gamba-roja"]) {
      const c = ops.check(id);
      expect(c.ok, id).toBe(false);
      expect(c.pendiente, id).toBe(true);
    }
    expect(ops.check("nerita").why).toBe("Pendiente: nunca ha vivido en ingravidez");
    for (const id of ["gato", "chihuahua", "grillo", "gusano-seda", "tardigrado", "artemia"]) {
      expect(SPECIES_CATALOG.find((e) => e.id === id)!.real, id).toBe(true);
      expect(ops.check(id).why, id).toMatch(/hábitat real/);
    }
    expect(() => ops.adopt("nerita")).toThrow();
  });

  it("the habitat has room for so many: the AQH-type tank takes 16 animals", () => {
    const { ops } = world();
    ops.adopt("medaka");
    ops.adopt("medaka-himedaka");
    const c = ops.check("caracol");
    expect(c.ok).toBe(false);
    expect(c.why).toMatch(/lleno: caben 0 más/);
  });

  it("a tank with no filter (no loop machines) takes one consumer but turns down a second", () => {
    const habitats = RACK_HABITATS.map((h) => (h.id === "habitat-acuatico" ? { ...h, area: { ...h.area, support: [] } } : h));
    const ops = new AdoptionOps(SPECIES_CATALOG, ALL_SPECIES, habitats, world().ports);
    ops.adopt("medaka");
    expect(ops.check("pez-cebra").why).toMatch(/no se cierra: falta un productor y un descomponedor/);
  });

  it("without the credits nothing is ordered", () => {
    const { ops, log } = world(0);
    const c = ops.check("raton");
    expect(c.ok).toBe(false);
    expect(c.why).toMatch(/Faltan \d+ créditos/);
    expect(() => ops.adopt("raton")).toThrow();
    expect(log.orders).toHaveLength(0);
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

  it("befriend the mice, then ask them for help; help lasts 10 days", () => {
    const { ops, log } = world();
    ops.adopt("raton");
    ops.delivered(1);
    expect(ops.areaOf("raton")).toBe("habitat-roedores");
    expect(ops.chores().map((c) => c.id)).toEqual(["especie-amistad-raton"]);
    solve(ops, "especie-amistad-raton");
    expect(ops.friends("raton")).toBe(true);
    expect(log.calm).toBeGreaterThan(0);
    const help = ops.chores()[0]!;
    expect(help.id).toBe("especie-ayuda-raton");
    expect(help.title).toBe("Pedir ayuda a los ratones");
    solve(ops, help.id);
    expect(ops.helping("raton")).toBe(true);
    expect(ops.chores()).toEqual([]);
    ops.tick(10.1);
    expect(ops.drainEvents()).toContainEqual(expect.objectContaining({ type: "ayuda-terminada" }));
    expect(ops.chores().map((c) => c.id)).toEqual(["especie-ayuda-raton"]);
    expect(CHORE_CATEGORY["amistad-especie"]).toBe("animales");
    expect(STEP_AREAS["ayuda-especie"].only).toBe("programar");
    for (const c of ops.chores()) for (const ex of c.exercises) if (ex.kind === "choice") expect(new Set(ex.options).size).toBe(ex.options.length);
  });

  it("the school and the snails have their own system: no colony chores for them", () => {
    const { ops } = world();
    for (const id of ["medaka", "caracol"]) ops.adopt(id);
    for (let d = 1; d <= 2; d++) ops.delivered(d);
    expect(ops.chores()).toEqual([]);
  });
});
