import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { MaterialStock, STOCK_PRIORITY } from "./materials";
import { Hangar } from "./hangar";
import { Station, type StationSite } from "./station";
import { batchScale, canRefine, type Blueprint, type RefineProcess } from "./blueprint";

const SITE: StationSite = { id: "s", name: "S", position: new Vec3(100, 0, 0), radiusM: 50, dockingRangeM: 300 };
const BP: Blueprint = {
  id: "plano-x",
  name: "X",
  product: { kind: "part", partId: "x" },
  machine: "impresora",
  massKg: 4,
  inputs: { hierro: 4, kit: 1 },
  hours: 10,
  process: { value: "p", source: "s" },
  steps: ["a", "b"],
};
const PROC: RefineProcess = { id: "r", name: "R", machine: "refineria", inputs: { roca: 100 }, outputs: { metal: 40 }, hours: 20, process: { value: "p", source: "s" }, steps: { value: ["a"], source: "s" } };
const make = (stock = {}) => new Station(SITE, new MaterialStock(stock), new Hangar());

describe("materials stock", () => {
  it("adds, tells what is missing and never goes negative", () => {
    const s = new MaterialStock({ hierro: 3 });
    expect(s.missing({ hierro: 5, kit: 1 })).toEqual({ hierro: 2, kit: 1 });
    expect(s.has({ hierro: 3 })).toBe(true);
    expect(() => s.take({ hierro: 4 })).toThrow();
    s.take({ hierro: 3 });
    expect(s.amount("hierro")).toBe(0);
    expect(s.entries()).toEqual([]);
  });
});

describe("hangar", () => {
  it("swapping fits the new part and stores the old one", () => {
    const h = new Hangar({ a: 1 });
    h.swap("a", "b");
    expect(h.count("a")).toBe(0);
    expect(h.count("b")).toBe(1);
    expect(() => h.swap("a", "b")).toThrow();
  });
  it("numbers crafts of the same kind", () => {
    const h = new Hangar();
    h.addCraft({ id: "sonda", name: "Sonda", kind: "sonda", massKg: 30 });
    expect(h.addCraft({ id: "sonda", name: "Sonda", kind: "sonda", massKg: 30 }).name).toBe("Sonda 2");
  });
});

describe("station", () => {
  it("a part can only be built with enough materials, and building takes them", () => {
    const st = make({ hierro: 3, kit: 1 });
    expect(st.canFabricate(BP)).toBe(false);
    expect(() => st.fabricate(BP)).toThrow();
    st.stock.add({ hierro: 2 });
    st.fabricate(BP);
    expect(st.stock.amount("hierro")).toBe(1);
    expect(st.stock.amount("kit")).toBe(0);
  });

  it("the part reaches the hangar when its machine finishes", () => {
    const st = make({ hierro: 8, kit: 2 });
    st.fabricate(BP);
    st.fabricate(BP);
    st.tick(9);
    expect(st.hangar.count("x")).toBe(0);
    expect(st.queue("impresora")).toHaveLength(2);
    st.tick(2); // spare hour goes to the next job
    expect(st.hangar.count("x")).toBe(1);
    expect(st.queue("impresora")[0]!.hoursLeft).toBeCloseTo(9);
    st.tick(9);
    expect(st.hangar.count("x")).toBe(2);
    expect(st.drainEvents()).toHaveLength(2);
  });

  it("machines work in parallel", () => {
    const st = make({ hierro: 4, kit: 1, roca: 100 });
    st.fabricate(BP);
    st.refine(PROC);
    st.tick(10);
    expect(st.hangar.count("x")).toBe(1);
    expect(st.queue("refineria")[0]!.hoursLeft).toBeCloseTo(10);
  });

  it("refines a partial batch when the rock is short", () => {
    const st = make({ roca: 50 });
    expect(batchScale(PROC, st.stock)).toBeCloseTo(0.5);
    const job = st.refine(PROC);
    expect(job.hoursTotal).toBeCloseTo(10);
    st.tick(10);
    expect(st.stock.amount("metal")).toBeCloseTo(20);
    expect(st.stock.amount("roca")).toBe(0);
    expect(canRefine(PROC, st.stock)).toBe(false);
  });

  it("unloads a hold into the store and keeps what it cannot use out", () => {
    const st = make();
    const r = st.unload(
      [
        { material: "Rock", kg: 10 },
        { material: "Gold", kg: 1 },
      ],
      (m) => (m === "Rock" ? "roca" : undefined),
    );
    expect(st.stock.amount("roca")).toBe(10);
    expect(r.ignored).toEqual(["Gold"]);
  });

  it("knows when a ship is alongside", () => {
    const st = make();
    expect(st.isAlongside(new Vec3(350, 0, 0))).toBe(true);
    expect(st.isAlongside(new Vec3(500, 0, 0))).toBe(false);
  });
});

describe("store capacity (HC-02)", () => {
  it("counts the kg in store against a capacity; kits weigh what the composition root says", () => {
    const s = new MaterialStock({ hierro: 300, kit: 2 }, { capacityKg: () => 1000, kgOf: (id, n) => (id === "kit" ? n * 25 : n) });
    expect(s.usedKg).toBe(350);
    expect(s.roomKg).toBe(650);
    expect(s.fits({ agua: 650 })).toBe(true);
    expect(s.fits({ agua: 651 })).toBe(false);
    expect(s.full).toBe(false);
    // Taking back what was there (a returned transfer) is never refused, even above the capacity.
    s.add({ agua: 700 });
    expect(s.roomKg).toBe(0);
    expect(s.full).toBe(true);
  });

  it("without a capacity the store has no top", () => {
    const s = new MaterialStock({ hierro: 1e9 });
    expect(s.roomKg).toBe(Infinity);
    expect(s.fits({ agua: 1e12 })).toBe(true);
  });

  it("a refinery batch that does not fit waits on its machine, done, until there is room", () => {
    let cap = 150;
    const st = new Station(SITE, new MaterialStock({ roca: 100 }, { capacityKg: () => cap }), new Hangar());
    st.refine(PROC);
    st.stock.add({ agua: 120 });
    st.tick(PROC.hours + 5);
    // 40 kg of metal into 30 kg of room: it stays on the machine.
    expect(st.stock.amount("metal")).toBe(0);
    expect(st.queue("refineria")).toHaveLength(1);
    expect(st.storeFullJobs()).toHaveLength(1);
    cap = 200;
    st.tick(0.1);
    expect(st.stock.amount("metal")).toBe(40);
    expect(st.queue("refineria")).toHaveLength(0);
  });

  it("unloading a hold stores what fits, in proportion, and gives back the rest", () => {
    const st = new Station(SITE, new MaterialStock({}, { capacityKg: () => 100 }), new Hangar());
    const r = st.unload(
      [
        { material: "a", kg: 150 },
        { material: "b", kg: 50 },
      ],
      (m) => m,
    );
    expect(r.stored).toEqual({ a: 75, b: 25 });
    expect(r.left).toEqual([
      { material: "a", kg: 75 },
      { material: "b", kg: 25 },
    ]);
    expect(st.stock.full).toBe(true);
  });
});

describe("store reservations (HC-04)", () => {
  it("a process with a lower priority only sees what is above the reservations of the higher ones", () => {
    const s = new MaterialStock({ amoniaco: 5 });
    s.reserve("propelente", { amoniaco: 3.4 }, STOCK_PRIORITY.propelente);
    expect(s.reservedKg("amoniaco")).toBeCloseTo(3.4, 9);
    expect(s.availableTo("amoniaco", STOCK_PRIORITY.bio)).toBeCloseTo(1.6, 9);
    // The reservation's owner sees it all.
    expect(s.availableTo("amoniaco", STOCK_PRIORITY.propelente)).toBe(5);
    s.take({ amoniaco: 3 });
    expect(s.availableTo("amoniaco", STOCK_PRIORITY.bio)).toBe(0);
    // A new reservation by the same holder replaces the old one.
    s.reserve("propelente", { amoniaco: 1 }, STOCK_PRIORITY.propelente);
    expect(s.availableTo("amoniaco", STOCK_PRIORITY.bio)).toBeCloseTo(1, 9);
    expect(s.reservations()).toEqual([{ holder: "propelente", material: "amoniaco", kg: 1, priority: STOCK_PRIORITY.propelente }]);
  });
});
