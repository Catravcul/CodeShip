import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { MaterialStock } from "./materials";
import { Hangar } from "./hangar";
import { Station } from "./station";
import { StationStructure } from "./structure";
import { storeCapacityKg } from "./outfit";
import { POLANA_STATION } from "../data/station";
import {
  EQUIPMENT,
  EQ_BIG_PLANT,
  EQ_BIG_PRINTER,
  EQ_CARBONYL,
  EQ_COMPOSITES,
  EQ_CROPS,
  EQ_EBW,
  GROWTH_BLUEPRINTS,
  MODULES,
  MOD_FAB2,
  MOD_FARM,
  MOD_HANGAR,
  MOD_PLANT,
  MOD_AXIOM_HAB,
  MOD_HAVEN2,
  RADIATORS_DOUBLE,
  offeredBlueprints,
  STATION_COMPONENTS,
  WINGS_IROSA,
  startingOutfit,
} from "../data/outfit";
import { BLUEPRINTS, blueprintForPart } from "../data/blueprints";
import { REFINE_PROCESSES } from "../data/processes";
import { PROPELLANT_PROCESSES } from "../data/propellant-processes";
import { MATERIALS } from "../data/materials";

const plenty = () => new MaterialStock(Object.fromEntries(MATERIALS.map((m) => [m.id, 1e6])));
const station = (outfit = startingOutfit()) => new Station(POLANA_STATION, plenty(), new Hangar(), outfit);
const bp = (id: string) => BLUEPRINTS.find((b) => b.id === id)!;
const build = (st: Station, id: string) => {
  st.fabricate(bp(id));
  st.tick(1e5);
};

describe("station outfit: what is built at the start", () => {
  it("EST-43 starts with the ISS's real machines in Destiny and Kibo, and the licensed workshop in Columbus", () => {
    const o = startingOutfit();
    const where = (m: string) => o.equipment.filter((e) => e.moduleId === m).map((e) => e.spec.id).sort();
    // Destiny: the glovebox, Redwire's AMF and its own life-support racks (eclss-real), as on the ISS.
    expect(where("destiny")).toEqual(["amf", "guantera"]);
    expect(where("kibo")).toEqual(["refabricator"]);
    // Columbus is the workshop: the printer is real, the refinery, foundry and plant are licences.
    expect(where("columbus")).toEqual(["fundicion", "impresora", "planta", "refineria"]);
    expect(o.freeRacks("columbus")).toBe(10 - 4);
    for (const e of o.equipment) expect(e.spec.status ?? "real", e.spec.id).toMatch(/^(real|licencia)$/);
    expect(o.equipment.filter((e) => e.spec.status === "licencia").map((e) => e.spec.id).sort()).toEqual(["fundicion", "impresora", "planta", "refineria"]);
    expect(o.has(EQ_CARBONYL.id)).toBe(false);
  });

  it("runs on what the wings give and the radiators reject: 124 kW of wings, 70 kW of radiators", () => {
    const o = startingOutfit();
    expect(o.supplyKw).toBe(124);
    expect(o.rejectKw).toBe(70);
    expect(o.capacityKw).toBe(70);
    expect(o.drawKw).toBeLessThan(o.capacityKw);
    expect(o.massKg).toBeGreaterThan(100000);
  });

  it("has Tranquility's two free CBM ports (BEAM's and Leonardo's); a long module only fits aft, clear of Kibo", () => {
    const o = startingOutfit();
    expect(o.berths.map((b) => b.id)).toEqual(["nodo-3-popa", "nodo-3-proa"]);
    for (const m of MODULES.filter((x) => x.kind !== "hangar")) expect(o.freeBerths(m).length, m.id).toBeGreaterThanOrEqual(1);
    // Haven-2 (15,1 m) and Axiom's Hab-1 (11 m) forward of Tranquility would reach Kibo, on Harmony's port side.
    expect(o.freeBerths(MOD_HAVEN2).map((b) => b.id)).toEqual(["nodo-3-popa"]);
    expect(o.freeBerths(MOD_AXIOM_HAB).map((b) => b.id)).toEqual(["nodo-3-popa"]);
    // A Leonardo-sized module (6,6 m) fits at either.
    expect(o.freeBerths({ ...MOD_HAVEN2, lengthM: 6.6 }).length).toBe(2);
  });
});

describe("blueprint tree", () => {
  it("every component names the equipment it needs, and that equipment exists and works its machine", () => {
    const ids = new Set(EQUIPMENT.map((e) => e.id));
    for (const b of BLUEPRINTS.filter((x) => x.product.kind === "part" || x.product.kind === "craft")) {
      expect(b.requires, b.id).toBeDefined();
      expect(ids.has(b.requires!), `${b.id} → ${b.requires}`).toBe(true);
    }
  });

  it("growth blueprints have sources, steps and only reachable requirements (no cycles)", () => {
    const reachable = new Set(startingOutfit().equipment.map((e) => e.spec.id));
    const pending = [...GROWTH_BLUEPRINTS];
    for (let pass = 0; pass < 10 && pending.length; pass++)
      for (const b of [...pending])
        if (!b.requires || reachable.has(b.requires)) {
          if (b.product.kind === "equipment") reachable.add(b.product.equipment.id);
          pending.splice(pending.indexOf(b), 1);
        }
    expect(pending.map((b) => b.id)).toEqual([]);
    for (const b of GROWTH_BLUEPRINTS) {
      expect(b.process.source, b.id).toMatch(/^https:\/\//);
      expect(b.steps.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("small printed parts need the small printer, big ones the big printer, tanks the welder, fibre parts the composites cell", () => {
    expect(blueprintForPart("aerojet-mr-104h")!.requires).toBe("impresora");
    expect(blueprintForPart("x3")?.requires ?? BLUEPRINTS.find((b) => b.name.includes("X3"))!.requires).toBe(EQ_BIG_PRINTER.id);
    expect(blueprintForPart("tanque-n2h4-80397")!.requires).toBe(EQ_EBW.id);
    expect(blueprintForPart("tanque-n2h4-80397")!.machine).toBe("soldadora");
    expect(blueprintForPart(WINGS_IROSA.id)!.requires).toBe(EQ_COMPOSITES.id);
  });

  it("refining the metal needs the carbonyl reactor; water, MRE and the plant work from the start", () => {
    const st = station();
    const carbonyl = REFINE_PROCESSES.find((p) => p.id === "carbonilo")!;
    expect(st.processLocked(carbonyl)).toMatch(/Reactor de carbonilo/);
    for (const p of [...REFINE_PROCESSES.filter((x) => x !== carbonyl), ...PROPELLANT_PROCESSES]) expect(st.processLocked(p), p.id).toBeUndefined();
    build(st, `plano-equipo-${EQ_CARBONYL.id}`);
    expect(st.processLocked(carbonyl)).toBeUndefined();
  });
});

describe("building equipment", () => {
  it("a component is locked until its equipment is built, then it can be made", () => {
    const st = station();
    const tank = blueprintForPart("tanque-n2h4-80397")!;
    expect(st.locked(tank)).toMatch(/Soldadora por haz de electrones/);
    expect(st.canFabricate(tank)).toBe(false);
    expect(() => st.fabricate(tank)).toThrow();
    build(st, `plano-equipo-${EQ_EBW.id}`);
    expect(st.canFabricate(tank)).toBe(true);
  });

  it("equipment takes rack bays side by side; jobs claim them so two cannot be queued into the same space", () => {
    const st = station();
    const o = st.outfit!;
    st.fabricate(bp(`plano-equipo-${EQ_CARBONYL.id}`));
    expect(o.freeRacks("columbus")).toBe(6 - 2);
    expect(st.locked(bp(`plano-equipo-${EQ_CARBONYL.id}`))).toBe("En construcción");
    st.tick(1e5);
    const e = o.equipment.find((x) => x.spec.id === EQ_CARBONYL.id)!;
    expect(e.place.count).toBe(2);
    expect(st.locked(bp(`plano-equipo-${EQ_CARBONYL.id}`))).toBe("Ya está montado");
  });

  it("an upgrade replaces what it upgrades, works faster, and still counts as what it replaced", () => {
    const st = station();
    const o = st.outfit!;
    expect(st.locked(bp(`plano-equipo-${EQ_BIG_PRINTER.id}`))).toMatch(/carbonilo/);
    build(st, `plano-equipo-${EQ_CARBONYL.id}`);
    const before = o.equipment.find((e) => e.spec.id === "impresora")!.place;
    build(st, `plano-equipo-${EQ_BIG_PRINTER.id}`);
    expect(o.equipment.some((e) => e.spec.id === "impresora")).toBe(false);
    const big = o.equipment.find((e) => e.spec.id === EQ_BIG_PRINTER.id)!;
    expect(big.moduleId).toBe("columbus");
    expect(big.place.side).toBe(before.side);
    expect(big.place.first).toBe(before.first);
    expect(o.has("impresora")).toBe(true);
    expect(o.rate("impresora")).toBe(2);
    // Small parts still print, and in half the time.
    const job = st.fabricate(blueprintForPart("aerojet-mr-104h")!);
    expect(job.hoursTotal).toBeCloseTo(blueprintForPart("aerojet-mr-104h")!.hours / 2);
  });

  it("equipment for another kind of module needs that module first", () => {
    const st = station();
    const crops = bp(`plano-equipo-${EQ_CROPS.id}`);
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-equipo-${EQ_COMPOSITES.id}`);
    expect(st.locked(crops)).toMatch(/[Mm]ódulo agrícola/);
    build(st, `plano-modulo-${MOD_FARM.id}`);
    expect(st.locked(crops) ?? "").not.toMatch(/[Mm]ódulo agrícola/);
  });

  it("the big plant takes the small one's place in Columbus and works faster", () => {
    const st = station();
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-equipo-${EQ_BIG_PLANT.id}`);
    const e = st.outfit!.equipment.find((x) => x.spec.id === EQ_BIG_PLANT.id)!;
    expect(e.moduleId).toBe("columbus");
    expect(st.outfit!.equipment.some((x) => x.spec.id === "planta")).toBe(false);
    expect(st.outfit!.rate("planta")).toBe(3);
  });

  it("more equipment than the radiators can cool is blocked until they are upgraded in the Estación tab", () => {
    const st = station();
    const o = st.outfit!;
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-equipo-${EQ_COMPOSITES.id}`);
    // Columbus has 10 bays (the old fabrication module had 12): the carbonyl reactor goes in the plant's module.
    build(st, `plano-modulo-${MOD_PLANT.id}`);
    build(st, `plano-equipo-${EQ_CARBONYL.id}`);
    build(st, `plano-modulo-${MOD_FARM.id}`);
    expect(o.capacityKw - o.drawKw).toBeLessThan(EQ_CROPS.powerKw);
    expect(st.locked(bp(`plano-equipo-${EQ_CROPS.id}`))).toMatch(/Falta energía/);
    // Bigger radiators alone: the wings (124 kW) now limit.
    o.fitComponent(RADIATORS_DOUBLE);
    expect(o.capacityKw).toBe(124);
    expect(st.locked(bp(`plano-equipo-${EQ_CROPS.id}`))).toBeUndefined();
    build(st, `plano-equipo-${EQ_CROPS.id}`);
    expect(o.cropAreaM2).toBe(60);
  });
});

describe("building modules", () => {
  it("a module berths at a free port, the structure and mass grow, and a module with an end port offers a new berth", () => {
    const st = station();
    const o = st.outfit!;
    const mass = o.massKg;
    build(st, `plano-equipo-${EQ_EBW.id}`);
    const events = st.drainEvents();
    expect(events.some((e) => e.type === "grew")).toBe(true);
    build(st, `plano-modulo-${MOD_FAB2.id}`);
    expect(o.hasModule(MOD_FAB2.id)).toBe(true);
    expect(o.massKg).toBeGreaterThan(mass + MOD_FAB2.massKg - 1);
    const m = o.layout.modules.find((x) => x.id === MOD_FAB2.id)!;
    expect(m.to.sub(m.from).length()).toBeCloseTo(8.53, 2);
    // On Tranquility's aft CBM: along z, from its hull (Tranquility is 4,48 m across).
    expect(m.from.z).toBeCloseTo(4.48 / 2, 2);
    expect(m.to.z).toBeGreaterThan(m.from.z);
    // Columbus is COL1: the first module of the fabrication kind with its own code is FAB1.
    expect(o.module(MOD_FAB2.id)!.code).toBe("FAB1");
    expect(o.berths.some((b) => b.id === `${MOD_FAB2.id}-extremo`)).toBe(true);
    expect(o.freeBerths(MOD_PLANT).length).toBe(2);
    expect(o.freeRacks(MOD_FAB2.id)).toBe(12);
  });

  it("a module that would hit Kibo does not fit forward of Tranquility, nor past a module berthed there", () => {
    const st = station();
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-modulo-${MOD_PLANT.id}`);
    const o = st.outfit!;
    expect(o.module(MOD_PLANT.id)).toBeDefined();
    const long = { ...MOD_FARM, id: "largo", lengthM: 12 };
    const fwd = o.berths.find((b) => b.id === "nodo-3-proa");
    if (fwd) expect(o.fitsAt(long, fwd)).toBe(false);
    for (const b of o.berths.filter((x) => x.id.endsWith("-extremo") && x.normal.z < 0)) expect(o.fitsAt(long, b), b.id).toBe(false);
  });

  it("EST-43 the ring ship's modules and the hangar extension are backlog: not offered unless ?ficcion", () => {
    const all = [...BLUEPRINTS, ...GROWTH_BLUEPRINTS];
    const ids = (f: boolean) => new Set(offeredBlueprints(all, f).map((b) => b.id));
    for (const m of [MOD_FAB2, MOD_PLANT, MOD_FARM, MOD_HANGAR]) {
      expect(ids(false).has(`plano-modulo-${m.id}`), m.id).toBe(false);
      expect(ids(true).has(`plano-modulo-${m.id}`), m.id).toBe(true);
      expect(m.status).toBe("ficcion");
    }
    for (const m of [MOD_HAVEN2, MOD_AXIOM_HAB]) {
      expect(ids(false).has(`plano-modulo-${m.id}`), m.id).toBe(true);
      expect(m.status).toBe("en-desarrollo");
    }
  });

  it("the structure in space takes the new layout and keeps its docking ports", () => {
    const st = station();
    const s = new StationStructure(POLANA_STATION, st.outfit!.layout);
    const ports = s.ports;
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-modulo-${MOD_FAB2.id}`);
    s.setLayout(st.outfit!.layout);
    expect(s.ports).toBe(ports);
    const m = st.outfit!.layout.modules.find((x) => x.id === MOD_FAB2.id)!;
    const mid = m.from.add(m.to).scale(0.5);
    expect(s.clearance(s.toWorld(mid))).toBeLessThan(0);
    expect(s.boundingRadiusM).toBeLessThanOrEqual(POLANA_STATION.radiusM);
    expect(() => s.setLayout({ ...st.outfit!.layout, ports: [] })).toThrow();
    expect(new Vec3(0, 0, 0).length()).toBe(0);
  });
});

describe("station components", () => {
  it("each slot has a starting component and an upgrade, with a blueprint", () => {
    const o = startingOutfit();
    for (const slot of ["alas", "radiadores", "escudo"] as const) {
      expect(o.component(slot), slot).toBeDefined();
      const up = STATION_COMPONENTS.find((c) => c.slot === slot && c.id !== o.component(slot)!.id)!;
      expect(blueprintForPart(up.id), up.id).toBeDefined();
    }
  });

  it("smaller radiators cannot be fitted once the machines draw more than they reject", () => {
    const st = station();
    const o = st.outfit!;
    const eatcs = o.component("radiadores")!;
    o.fitComponent(RADIATORS_DOUBLE);
    o.fitComponent(WINGS_IROSA);
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-equipo-${EQ_COMPOSITES.id}`);
    build(st, `plano-modulo-${MOD_PLANT.id}`);
    build(st, `plano-equipo-${EQ_CARBONYL.id}`);
    build(st, `plano-modulo-${MOD_FARM.id}`);
    build(st, `plano-equipo-${EQ_CROPS.id}`);
    expect(o.drawKw).toBeGreaterThan(70);
    expect(o.componentBlocker(eatcs)).toMatch(/radiadores/);
    expect(() => o.fitComponent(eatcs)).toThrow();
  });
});

describe("store capacity by module (HC-02)", () => {
  it("the starting station keeps 25 rack bays of stowage (17,5 t) and every new module adds its own", async () => {
    const { STORE_STOWAGE } = await import("../data/store");
    const o = startingOutfit();
    expect(storeCapacityKg(o.modules, STORE_STOWAGE)).toBe(25 * 700);
    const before = storeCapacityKg(o.modules, STORE_STOWAGE);
    const st = new Station(POLANA_STATION, new MaterialStock(Object.fromEntries(MATERIALS.map((m) => [m.id, 1e6]))), new Hangar(), o);
    for (const id of [`plano-equipo-${EQ_EBW.id}`, `plano-equipo-${EQ_COMPOSITES.id}`, `plano-modulo-${MOD_FARM.id}`]) {
      st.fabricate(GROWTH_BLUEPRINTS.find((b) => b.id === id) ?? BLUEPRINTS.find((b) => b.id === id)!);
      st.tick(1e4);
    }
    expect(storeCapacityKg(o.modules, STORE_STOWAGE)).toBe(before + 4 * 700);
    // The hangar keeps raw rock in bulk.
    expect(storeCapacityKg([{ kind: "hangar" }], STORE_STOWAGE)).toBe(20000);
  });
});

describe("what takes room in the store (HC-02)", () => {
  it("propellants live in the depot's tanks and take no rack room; kits weigh 25 kg each", async () => {
    const { storeKgOf } = await import("../data/store");
    expect(storeKgOf("xenon", 20000)).toBe(0);
    expect(storeKgOf("hidracina", 45)).toBe(0);
    expect(storeKgOf("kit", 2)).toBe(50);
    expect(storeKgOf("silicatos", 10)).toBe(10);
    const { STARTING_STOCK } = await import("../data/station");
    const { STORE_STOWAGE } = await import("../data/store");
    const s = new MaterialStock(STARTING_STOCK, { capacityKg: () => storeCapacityKg(startingOutfit().modules, STORE_STOWAGE), kgOf: storeKgOf });
    // The starting store is well under its 17,5 t.
    expect(s.usedKg).toBeLessThan(1000);
    expect(s.full).toBe(false);
  });
});
