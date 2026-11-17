import { describe, expect, it } from "vitest";
import { CARGO_VEHICLES } from "../data/cargo-vehicles";
import { ECLSS_MACHINES } from "../data/eclss-machines";
import { LifeSupport } from "../domain/life-support";
import { cargoManifest, CargoResupply } from "./cargo-resupply";

const station = () => new LifeSupport(ECLSS_MACHINES, { crew: 1, freeAirM3: 388, waterKg: 1200, foodKg: 50, o2TankKg: 100, n2TankKg: 100, spares: {} });

describe("SV-17 cargo vehicles fill the pantry", () => {
  it("real vehicles: Dragon carries 2507 kg pressurised in 18 h, Cygnus 3749 kg in 60 h", () => {
    const [dragon, cygnus] = CARGO_VEHICLES;
    expect(dragon).toMatchObject({ id: "dragon", pressurizedKg: { value: 2507 }, transitH: { value: 18 } });
    expect(cygnus).toMatchObject({ id: "cygnus", pressurizedKg: { value: 3749 }, transitH: { value: 60 } });
    for (const v of CARGO_VEHICLES) expect(v.transitH.source).toMatch(/^https:\/\//);
  });

  it("a cargo brings half a year of food for one (430 kg), the water and gas lost, and spares; it fits", () => {
    const m = cargoManifest("dragon", 1, ECLSS_MACHINES);
    expect(m.days).toBe(180);
    expect(m.foodKg).toBeCloseTo(2.39 * 180, 3);
    expect(m.waterKg).toBeGreaterThan(0);
    expect(Object.keys(m.spares).length).toBeGreaterThan(0);
    expect(m.massKg).toBeLessThanOrEqual(2507);
  });

  it("for a big crew the vehicle limits the days it brings", () => {
    const m = cargoManifest("dragon", 6, ECLSS_MACHINES);
    expect(m.days).toBeLessThan(180);
    expect(m.massKg).toBeLessThanOrEqual(2507);
    expect(cargoManifest("cygnus", 6, ECLSS_MACHINES).days).toBeGreaterThan(m.days);
  });

  it("ordered, it flies its transit on the board clock and unloads into the pantry; one at a time", () => {
    const ls = station();
    const cargo = new CargoResupply(ls, ECLSS_MACHINES);
    const m = cargo.order("dragon");
    expect(typeof m).not.toBe("string");
    expect(cargo.order("cygnus")).toMatch(/Ya viene Dragon/);
    cargo.tick(17);
    expect(ls.readout().foodKg).toBe(50);
    expect(cargo.inFlight?.hoursLeft).toBeCloseTo(1, 6);
    cargo.tick(1);
    expect(ls.readout().foodKg).toBeCloseTo(50 + 2.39 * 180, 3);
    expect(ls.spares("lecho-mf")).toBeGreaterThanOrEqual(1);
    expect(cargo.inFlight).toBeUndefined();
    expect(cargo.drainEvents().map((e) => e.kind)).toEqual(["lanzado", "llegada"]);
  });
});

describe("A Cygnus waits for the arm", () => {
  it("holds at the 10 m capture point and fills the pantry only once berthed; no other order meanwhile", () => {
    const ls = station();
    const cargo = new CargoResupply(ls, ECLSS_MACHINES);
    cargo.order("cygnus");
    cargo.drainEvents();
    cargo.tick(60);
    expect(cargo.drainEvents().map((e) => e.kind)).toEqual(["punto-captura"]);
    expect(ls.readout().foodKg).toBe(50);
    expect(cargo.awaitingCapture?.vehicle.id).toBe("cygnus");
    expect(cargo.order("dragon")).toMatch(/punto de captura/);
    expect(cargo.unload()).toBe(true);
    expect(ls.readout().foodKg).toBeGreaterThan(50);
    expect(cargo.drainEvents().map((e) => e.kind)).toEqual(["llegada"]);
    expect(cargo.unload()).toBe(false);
  });
});
