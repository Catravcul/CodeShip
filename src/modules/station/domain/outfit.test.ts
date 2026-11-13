import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { MaterialStock } from "./materials";
import { Hangar } from "./hangar";
import { Station } from "./station";
import { StationStructure } from "./structure";
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
  RADIATORS_DOUBLE,
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
  it("starts with the refinery, glovebox, foundry, small printer and plant in the fabrication module", () => {
    const o = startingOutfit();
    expect(o.equipment.map((e) => e.spec.id).sort()).toEqual(["fundicion", "guantera", "impresora", "planta", "refineria"]);
    expect(o.equipment.every((e) => e.moduleId === "fabrica")).toBe(true);
    expect(o.freeRacks("fabrica")).toBe(12 - 5);
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

  it("has node 1's two spare ports free, and each new module fits at one", () => {
    const o = startingOutfit();
    expect(o.berths.map((b) => b.id)).toEqual(["nodo-1-babor", "nodo-1-estribor"]);
    for (const m of MODULES.filter((x) => x.kind !== "hangar")) expect(o.freeBerths(m).length, m.id).toBe(2);
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
    expect(o.freeRacks("fabrica")).toBe(7 - 2);
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
    build(st, `plano-equipo-${EQ_EBW.id}`);
    expect(st.locked(bp(`plano-equipo-${EQ_BIG_PLANT.id}`))).toMatch(/módulo de la planta/);
    build(st, `plano-modulo-${MOD_PLANT.id}`);
    expect(st.locked(bp(`plano-equipo-${EQ_BIG_PLANT.id}`))).toBeUndefined();
    build(st, `plano-equipo-${EQ_BIG_PLANT.id}`);
    const e = st.outfit!.equipment.find((x) => x.spec.id === EQ_BIG_PLANT.id)!;
    expect(e.moduleId).toBe(MOD_PLANT.id);
    // The small plant's rack in the fabrication module is free again.
    expect(st.outfit!.equipment.some((x) => x.spec.id === "planta")).toBe(false);
    expect(st.outfit!.rate("planta")).toBe(3);
  });

  it("more equipment than the radiators can cool is blocked until they are upgraded in the Estación tab", () => {
    const st = station();
    const o = st.outfit!;
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-equipo-${EQ_CARBONYL.id}`);
    build(st, `plano-equipo-${EQ_COMPOSITES.id}`);
    build(st, `plano-modulo-${MOD_FARM.id}`);
    build(st, `plano-modulo-${MOD_PLANT.id}`);
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
    expect(Math.abs(m.from.x)).toBeCloseTo(4.57 / 2, 2);
    expect(o.module(MOD_FAB2.id)!.code).toBe("FAB2");
    expect(o.berths.some((b) => b.id === `${MOD_FAB2.id}-extremo`)).toBe(true);
    expect(o.freeBerths(MOD_PLANT).length).toBe(2);
    expect(o.freeRacks(MOD_FAB2.id)).toBe(12);
  });

  it("a module that would hit the solar wings does not fit at the end of a long arm", () => {
    const st = station();
    build(st, `plano-equipo-${EQ_EBW.id}`);
    build(st, `plano-equipo-${EQ_COMPOSITES.id}`);
    build(st, `plano-modulo-${MOD_FAB2.id}`);
    build(st, `plano-modulo-${MOD_PLANT.id}`);
    const o = st.outfit!;
    // Past the plant or the second fabrication module a 25 m module would reach the wings (x > 32 m).
    const ends = o.berths.filter((b) => b.id.endsWith("-extremo"));
    expect(ends.length).toBe(2);
    const long = { ...MOD_FARM, id: "largo", lengthM: 25 };
    for (const b of ends) expect(o.fitsAt(long, b), b.id).toBe(false);
    expect(o.freeBerths(long)).toEqual([]);
    // The farm module (16,9 m) still fits at the end of either arm.
    expect(o.freeBerths(MOD_FARM).length).toBe(2);
  });

  it("the hangar extension makes the hangar 10 m longer without a port", () => {
    const st = station();
    build(st, `plano-equipo-${EQ_CARBONYL.id}`);
    build(st, `plano-equipo-${EQ_BIG_PRINTER.id}`);
    const before = st.outfit!.layout.parts.find((p) => p.kind === "hangar")!;
    build(st, `plano-modulo-${MOD_HANGAR.id}`);
    const after = st.outfit!.layout.parts.find((p) => p.kind === "hangar")!;
    expect(2 * after.half.z - 2 * before.half.z).toBeCloseTo(10);
    expect(after.centre.z - after.half.z).toBeCloseTo(before.centre.z - before.half.z);
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
    build(st, `plano-equipo-${EQ_CARBONYL.id}`);
    build(st, `plano-modulo-${MOD_FARM.id}`);
    build(st, `plano-modulo-${MOD_PLANT.id}`);
    build(st, `plano-equipo-${EQ_CROPS.id}`);
    expect(o.drawKw).toBeGreaterThan(70);
    expect(o.componentBlocker(eatcs)).toMatch(/radiadores/);
    expect(() => o.fitComponent(eatcs)).toThrow();
  });
});
