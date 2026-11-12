import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { G0 } from "@core/units";
import { Ship, type ShipDesign } from "./ship";
import { buildRcsLayout } from "./rcs-layout";
import type { ThrusterModel } from "./components";

const main: ThrusterModel = { id: "m", name: "Main", thrustN: 500, ispS: 300, dryMassKg: 5, propellant: "MMH/NTO", sources: [] };
const rcs: ThrusterModel = { id: "r", name: "RCS", thrustN: 20, ispS: 200, dryMassKg: 1, propellant: "Hydrazine", sources: [] };

const design = (): ShipDesign => ({
  hull: { name: "Test hull", dryMassKg: 300, size: new Vec3(2, 2, 4) },
  tanks: [
    { spec: { propellant: "MMH/NTO", capacityKg: 100, dryMassKg: 10 }, fillKg: 100 },
    { spec: { propellant: "Hydrazine", capacityKg: 20, dryMassKg: 2 }, fillKg: 20 },
  ],
  mainEngines: [{ model: main, position: new Vec3(0, 0, 2), direction: new Vec3(0, 0, -1) }],
  rcs: buildRcsLayout(rcs, new Vec3(2, 2, 4)),
});

const idle = { mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.ZERO };

describe("Ship", () => {
  it("adds up hull, thrusters, tanks and propellant mass", () => {
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

describe("Explorer ring", () => {
  it("carries a counter-rotating 1 g ring that is not part of the contact hull", async () => {
    const { explorerDesign } = await import("../data/explorer");
    const d = explorerDesign();
    expect(d.ring?.counterRotating).toBe(true);
    expect(d.ring!.floorRadiusM).toBeGreaterThan(d.hull.size.length() * 5);
    expect(d.hull.size.y).toBe(2);
  });
});
