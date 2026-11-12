import { describe, expect, it } from "vitest";
import { POWER_NONE, SHIELD_NONE, SHIELD_WHIPPLE, SHIELD_WHIPPLE_NODE, SHIELD_WHIPPLE_STEEL } from "@modules/ship/data/equipment";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import { partById } from "@modules/ship/data/parts";
import { withPart } from "@modules/ship/domain/refit";
import { Machine } from "@modules/life-support/domain/machine";
import { MACHINES } from "@modules/life-support/data/machines";
import { Plant } from "@modules/garden/domain/plant";
import { WHEAT_APOGEE } from "@modules/garden/data/species";
import { selfSufficiency } from "@modules/life-support/domain/sustainability";
import { machineRepairChore, repairChore } from "@modules/chores/application/catalog";
import type { Chore } from "@modules/chores/domain/chore";
import { bayActions, bayStatus, needingAttention, type BayInput } from "./bay";

const input = (over: Partial<BayInput> = {}): BayInput => ({
  ship: Ship.create(explorerDesign()),
  machines: MACHINES.map((m) => new Machine(m)),
  beds: [new Plant("bancal-trigo-1", WHEAT_APOGEE, 15, true)],
  sustainability: selfSufficiency(200, [{ name: "Doménica", kcal: 2000 }], 2000),
  stores: [{ id: "pienso-gatos", name: "Pienso de gatos", amount: 1500, capacity: 1500, unit: "g" }],
  ...over,
});
const byId = (list: ReturnType<typeof bayStatus>, id: string) => list.find((c) => c.id === id)!;

describe("ship bay status", () => {
  it("lists every part: hull, engine, RCS, each tank, power, battery, shield, fixed systems, each machine, farm deck and stores", () => {
    const list = bayStatus(input());
    expect(list.map((c) => c.id)).toEqual([
      "casco",
      "motor",
      "rcs",
      "tanque-0",
      "tanque-1",
      "alas-solares",
      "bateria",
      "escudo-mmod",
      "sistemas-fijos",
      ...MACHINES.map((m) => `maquina:${m.id}`),
      "cubierta-cultivo",
      "despensa",
    ]);
    expect(needingAttention(list)).toEqual([]);
  });

  it("shows real specs with their sources", () => {
    const motor = byId(bayStatus(input()), "motor");
    expect(motor.slot).toBe("motor");
    expect(motor.specs.find((s) => s.label === "Empuje")!.value).toBe("490 N");
    expect(motor.specs.some((s) => s.source?.includes("wikipedia.org/wiki/R-4D"))).toBe(true);
    const rcs = byId(bayStatus(input()), "rcs");
    expect(rcs.specs.find((s) => s.label === "Propulsores")!.value).toBe("24");
  });

  it("a damaged hull and a broken machine need attention, critical first", () => {
    const ship = Ship.create(explorerDesign());
    ship.damage(0.2);
    const machines = MACHINES.map((m) => new Machine(m));
    machines[3]!.damage(0.7);
    const urgent = needingAttention(bayStatus(input({ ship, machines })));
    expect(urgent.map((c) => c.id)).toEqual([`maquina:${MACHINES[3]!.id}`, "casco"]);
    expect(urgent[0]!.issues[0]!.text).toMatch(/averiad/i);
  });

  it("low propellant warns on the tank and on the thrusters it feeds", () => {
    const d = explorerDesign();
    const dry = Ship.create({ ...d, tanks: [{ spec: d.tanks[0]!.spec, fillKg: 20 }, d.tanks[1]!] });
    const list = bayStatus(input({ ship: dry }));
    expect(byId(list, "tanque-0").attention).toBe("aviso");
    expect(byId(list, "tanque-0").level).toEqual({ amount: 20, capacity: 180, unit: "kg" });
    expect(byId(list, "motor").attention).toBe("aviso");
    expect(byId(list, "rcs").attention).toBe("ok");
  });

  it("a tank no thruster drinks from is flagged as dead mass", () => {
    const ship = Ship.create(explorerDesign());
    ship.refit(withPart(ship.design, "motor", partById("aerojet-mr-104h")!));
    const tank = byId(bayStatus(input({ ship })), "tanque-0");
    expect(tank.attention).toBe("aviso");
    expect(tank.issues.map((i) => i.text).join()).toMatch(/ningún propulsor/i);
  });

  it("missing resources and a farm deck short of area show up", () => {
    const list = bayStatus(
      input({
        stores: [{ id: "medio-cultivo", name: "Medio de cultivo", amount: 0, capacity: 12, unit: "lotes" }],
        sustainability: selfSufficiency(20, [{ name: "Doménica", kcal: 2000 }], 2000),
      }),
    );
    expect(byId(list, "despensa").attention).toBe("critico");
    expect(byId(list, "despensa").issues[0]!.text).toContain("Falta medio de cultivo");
    expect(byId(list, "cubierta-cultivo").attention).toBe("aviso");
    expect(byId(list, "cubierta-cultivo").issues[0]!.text).toMatch(/faltan \d+ m²/);
  });
});

describe("ship bay actions", () => {
  it("offers the matching repair chore and the parts that fit", () => {
    const ship = Ship.create(explorerDesign());
    ship.damage(0.3);
    const machines = MACHINES.map((m) => new Machine(m));
    machines[0]!.damage(0.8);
    const chores: Chore[] = [repairChore(ship.design, ship.hullIntegrity, 1), machineRepairChore(machines[0]!, 0)];
    const list = bayStatus(input({ ship, machines }));
    const hull = bayActions(byId(list, "casco"), chores, ship.design);
    expect(hull[0]).toEqual(expect.objectContaining({ kind: "tarea", choreId: chores[0]!.id }));
    // The hull is the cabin: the other cabins can replace it.
    expect(hull.slice(1).every((a) => a.kind === "cambiar" && a.slot === "cabina")).toBe(true);
    expect(hull.length).toBe(5);
    const machine = bayActions(byId(list, `maquina:${machines[0]!.id}`), chores, ship.design);
    expect(machine[0]!.choreId).toBe(chores[1]!.id);
    const motor = bayActions(byId(list, "motor"), chores, ship.design);
    expect(motor).toEqual([expect.objectContaining({ kind: "cambiar", slot: "motor", partId: "aerojet-mr-104h" })]);
    expect(motor[0]!.label).toContain("MR-104H");
  });

  it("with a hangar, a swap needs the part there; the rest are shown locked, to build at the station", () => {
    const ship = Ship.create(explorerDesign());
    const list = bayStatus(input({ ship }));
    const empty = bayActions(byId(list, "motor"), [], ship.design, { count: () => 0 });
    expect(empty).toEqual([expect.objectContaining({ kind: "cambiar", partId: "aerojet-mr-104h", locked: true })]);
    const tanks = bayActions(byId(list, "tanque-1"), [], ship.design, { count: (id) => (id === "tanque-n2h4-120" ? 2 : 0) });
    expect(tanks.map((a) => [a.partId, !!a.locked])).toEqual([
      ["tanque-n2h4-120", false],
      ["tanque-n2h4-80", true],
    ]);
    expect(tanks[0]!.detail).toContain("2 en el hangar");
  });

  it("farm deck actions are the chores of its beds", () => {
    const bed: Chore = { id: "regar-bancal-papa-1", kind: "regar", targetId: "bancal-papa-1", title: "Regar", scenario: "", exercises: [] };
    const pot: Chore = { id: "regar-l1", kind: "regar", targetId: "l1", title: "Regar", scenario: "", exercises: [] };
    const list = bayStatus(input());
    expect(bayActions(byId(list, "cubierta-cultivo"), [bed, pot], explorerDesign()).map((a) => a.choreId)).toEqual([bed.id]);
  });
});

describe("ship bay: equipment", () => {
  it("the hull's dry mass is the sum of the fitted parts, shown in the hull's sheet", () => {
    const ship = Ship.create(explorerDesign());
    const hull = byId(bayStatus(input({ ship })), "casco");
    expect(hull.slot).toBe("cabina");
    expect(hull.specs.find((s) => s.label === "Masa en seco")!.value).toContain(Math.round(ship.dryMassKg).toLocaleString("es-ES"));
  });

  it("the power entry shows production against consumption; with no source the battery's hours are a warning", () => {
    const ok = byId(bayStatus(input()), "alas-solares");
    expect(ok.attention).toBe("ok");
    expect(ok.specs.find((s) => s.label === "Balance")!.value).toMatch(/^Sobran/);
    const ship = Ship.create(withPart(explorerDesign(), "energia", partById(POWER_NONE.id)!));
    const dark = byId(bayStatus(input({ ship })), "alas-solares");
    expect(dark.specs.find((s) => s.label === "Balance")!.value).toMatch(/^Faltan 660 W/);
    expect(dark.attention).toBe("aviso");
  });

  it("removing the shield or the source needs nothing from the hangar", () => {
    const ship = Ship.create(withPart(explorerDesign(), "escudo", partById(SHIELD_WHIPPLE.id)!));
    const shield = bayActions(byId(bayStatus(input({ ship })), "escudo-mmod"), [], ship.design, { count: () => 0 });
    const none = shield.find((a) => a.partId === SHIELD_NONE.id)!;
    expect(none.locked).toBeUndefined();
    expect(shield.filter((a) => a.locked).map((a) => a.partId)).toEqual([SHIELD_WHIPPLE_STEEL.id, SHIELD_WHIPPLE_NODE.id]);
  });

  it("a shield's sheet shows its critical diameter and how much debris damage gets through", () => {
    const ship = Ship.create(withPart(explorerDesign(), "escudo", partById(SHIELD_WHIPPLE.id)!));
    const s = byId(bayStatus(input({ ship })), "escudo-mmod");
    expect(s.specs.find((x) => x.label === "Daño de las piedras")!.value).toMatch(/^1\d %/);
  });
});
