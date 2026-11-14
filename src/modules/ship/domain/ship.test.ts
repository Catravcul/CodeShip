import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { G0 } from "@core/units";
import { Ship, type ShipDesign } from "./ship";
import { buildRcsLayout } from "./rcs-layout";
import type { ThrusterModel } from "./components";

const main: ThrusterModel = { id: "m", name: "Main", thrustN: 500, ispS: 300, dryMassKg: 5, propellant: "MMH/NTO", sources: [] };
const rcs: ThrusterModel = { id: "r", name: "RCS", thrustN: 20, ispS: 200, dryMassKg: 1, propellant: "Hydrazine", sources: [] };

const design = (): ShipDesign => ({
  hull: { name: "Test hull", size: new Vec3(2, 2, 4) },
  equipment: [{ id: "s", name: "Estructura", kind: "estructura", massKg: 300, powerW: 0, materials: "", flight: "", basis: "", sources: [] }],
  tanks: [
    { spec: { propellant: "MMH/NTO", capacityKg: 100, dryMassKg: 10 }, fillKg: 100 },
    { spec: { propellant: "Hydrazine", capacityKg: 20, dryMassKg: 2 }, fillKg: 20 },
  ],
  mainEngines: [{ model: main, position: new Vec3(0, 0, 2), direction: new Vec3(0, 0, -1) }],
  rcs: buildRcsLayout(rcs, new Vec3(2, 2, 4)),
});

const idle = { mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.ZERO };

describe("Ship", () => {
  it("adds up equipment, thrusters, tanks and propellant mass", () => {
    const ship = Ship.create(design());
    expect(ship.rcsCount).toBe(24);
    expect(ship.dryMassKg).toBe(300 + 5 + 24 * 1 + 10 + 2);
    expect(ship.massKg).toBe(ship.dryMassKg + 120);
  });

  it("main engine pushes forward (-Z) with its real thrust and burns propellant", () => {
    const ship = Ship.create(design());
    const out = ship.fire({ ...idle, mainThrottle: 1 }, 1);
    expect(out.forceBody.z).toBeCloseTo(-500);
    expect(out.torqueBody.length()).toBeCloseTo(0);
    expect(ship.propellantKg("MMH/NTO")).toBeCloseTo(100 - 500 / (300 * G0));
  });

  it("RCS translation gives pure force on the commanded axis", () => {
    const ship = Ship.create(design());
    const out = ship.fire({ ...idle, translation: new Vec3(1, 0, 0) }, 1);
    expect(out.forceBody.x).toBeCloseTo(40);
    expect(out.forceBody.y).toBeCloseTo(0);
    expect(out.forceBody.z).toBeCloseTo(0);
    expect(out.torqueBody.length()).toBeCloseTo(0);
  });

  it("RCS rotation gives pure torque on the commanded axis", () => {
    const ship = Ship.create(design());
    const out = ship.fire({ ...idle, rotation: new Vec3(0, -1, 0) }, 1);
    expect(out.forceBody.length()).toBeCloseTo(0);
    expect(out.torqueBody.y).toBeLessThan(0);
    expect(Math.abs(out.torqueBody.x) + Math.abs(out.torqueBody.z)).toBeCloseTo(0);
  });

  it("partial commands fire thrusters proportionally (duty cycle)", () => {
    const ship = Ship.create(design());
    const out = ship.fire({ ...idle, translation: new Vec3(0, 0.5, 0) }, 1);
    expect(out.forceBody.y).toBeCloseTo(20);
  });

  it("an empty tank means its thrusters produce nothing", () => {
    const d = design();
    const ship = Ship.create({ ...d, tanks: [{ spec: d.tanks[0]!.spec, fillKg: 0 }, d.tanks[1]!] });
    expect(ship.fire({ ...idle, mainThrottle: 1 }, 1).forceBody.length()).toBe(0);
  });

  it("never burns more propellant than is left", () => {
    const ship = Ship.create(design());
    ship.fire({ ...idle, mainThrottle: 1 }, 10_000);
    expect(ship.propellantKg("MMH/NTO")).toBe(0);
  });

  it("reports main-engine delta-v from current masses", () => {
    const ship = Ship.create(design());
    const before = ship.mainDeltaV();
    expect(before).toBeCloseTo(300 * G0 * Math.log(ship.massKg / (ship.massKg - 100)));
    ship.fire({ ...idle, mainThrottle: 1 }, 10);
    expect(ship.mainDeltaV()).toBeLessThan(before);
  });

  it("box inertia grows with mass and size", () => {
    const ship = Ship.create(design());
    const m = ship.massKg;
    expect(ship.inertiaKgM2.x).toBeCloseTo((m / 12) * (4 + 16));
    expect(ship.inertiaKgM2.z).toBeCloseTo((m / 12) * (4 + 4));
  });
});

describe("Ship.preview", () => {
  it("returns full-command force without burning propellant", () => {
    const ship = Ship.create(design());
    const before = ship.massKg;
    const out = ship.preview({ ...idle, rotation: new Vec3(0, 0, 1) });
    expect(out.torqueBody.z).toBeGreaterThan(0);
    expect(ship.massKg).toBe(before);
  });
});

describe("Ship.refit", () => {
  it("swaps parts and recomputes mass, keeping the propellant on board", () => {
    const ship = Ship.create(design());
    const heavier: ThrusterModel = { ...main, id: "m2", thrustN: 1000, dryMassKg: 15 };
    const d = design();
    ship.refit({ ...d, mainEngines: [{ ...d.mainEngines[0]!, model: heavier }] });
    expect(ship.dryMassKg).toBe(300 + 15 + 24 + 12);
    expect(ship.propellantKg("MMH/NTO")).toBe(100);
    expect(ship.fire({ ...idle, mainThrottle: 1 }, 0.001).forceBody.z).toBeCloseTo(-1000);
  });

  it("vents what no longer fits in a smaller tank", () => {
    const ship = Ship.create(design());
    const d = design();
    ship.refit({ ...d, tanks: [{ spec: { ...d.tanks[0]!.spec, capacityKg: 60 }, fillKg: 0 }, d.tanks[1]!] });
    expect(ship.propellantKg("MMH/NTO")).toBe(60);
    expect(ship.propellantKg("Hydrazine")).toBe(20);
  });
});

describe("Explorer probe", () => {
  it("is a light lander with a dorsal docking port and no ring (the rings are on the mothership)", async () => {
    const { explorerDesign } = await import("../data/explorer");
    const d = explorerDesign();
    expect("ring" in d).toBe(false);
    expect(d.dockingPort!.y).toBeGreaterThan(d.hull.size.y / 2);
    // Every kilogram is a fitted part now: lighter than the lunar module's ascent stage (2150 kg dry), not a 420 kg placeholder.
    const ship = Ship.create(d);
    expect(ship.dryMassKg).toBeGreaterThan(1000);
    expect(ship.dryMassKg).toBeLessThan(2150);
  });

  it("debris damage is cut by the shield; a crash is not", async () => {
    const { explorerDesign } = await import("../data/explorer");
    const { partById } = await import("../data/parts");
    const { withPart } = await import("./refit");
    const bare = Ship.create(explorerDesign());
    bare.damage(0.2, "escombros");
    expect(bare.hullIntegrity).toBeCloseTo(0.8);
    const shielded = Ship.create(withPart(explorerDesign(), "escudo", partById("whipple-al")!));
    shielded.damage(0.2, "escombros");
    expect(shielded.hullIntegrity).toBeGreaterThan(0.95);
    shielded.damage(0.2);
    expect(shielded.hullIntegrity).toBeLessThan(0.8);
  });
});

describe("Ship.refit with a new tank", () => {
  it("the swapped tank leaves with its share; the new one comes loaded from the station", () => {
    const ship = Ship.create(design());
    ship.fire({ ...idle, mainThrottle: 1 }, 10);
    const d = ship.design;
    const green = { propellant: "LMP-103S" as const, capacityKg: 30, dryMassKg: 3 };
    ship.refit({ ...d, tanks: [d.tanks[0]!, { spec: green, fillKg: 0 }] });
    expect(ship.propellantKg("Hydrazine")).toBe(0);
    expect(ship.propellantKg("LMP-103S")).toBe(30);
    expect(ship.propellantKg("MMH/NTO")).toBeLessThan(100);
  });
});

describe("Explorer default propulsion (docs/design/componentes.md, «Recomendación»)", () => {
  it("HiPAT on MESSENGER's pair: Δv from the rocket equation with the real masses", async () => {
    const { explorerDesign } = await import("../data/explorer");
    const ship = Ship.create(explorerDesign());
    const prop = ship.propellantKg("MMH/NTO");
    expect(prop).toBe(438);
    expect(ship.mainDeltaV()).toBeCloseTo(322 * G0 * Math.log(ship.massKg / (ship.massKg - prop)), 6);
    expect(ship.mainDeltaV()).toBeGreaterThan(900);
    expect(445 / ship.massKg).toBeGreaterThan(0.25);
  });
});

describe("refuelling", () => {
  it("loads up to the tanks' capacity and says how much it took", () => {
    const d = design();
    const ship = Ship.create({ ...d, tanks: [{ spec: d.tanks[0]!.spec, fillKg: 0 }, ...d.tanks.slice(1)] });
    const p = d.tanks[0]!.spec.propellant;
    const cap = ship.propellantCapacityKg(p);
    expect(ship.refuel(p, 10)).toBe(10);
    expect(ship.refuel(p, cap)).toBeCloseTo(cap - 10, 9);
    expect(ship.propellantKg(p)).toBeCloseTo(cap, 9);
    expect(ship.refuel(p, 5)).toBe(0);
    expect(ship.refuel(p, -3)).toBe(0);
  });
});

