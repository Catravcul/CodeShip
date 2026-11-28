import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { MaterialStock } from "./materials";
import { Hangar } from "./hangar";
import { planRefuel, planTakes, transferHours, type PropellantLine } from "./refuel";
import { Station } from "./station";

const pair: PropellantLine = { id: "MMH/NTO", label: "MMH/NTO", capacityKg: 100, onBoardKg: 20, perKg: { mmh: 0.4, nto: 0.6, helio: 0.01 } };
const mono: PropellantLine = { id: "Hydrazine", label: "hidracina", capacityKg: 40, onBoardKg: 40, perKg: { hidracina: 1 } };

describe("refuel plan", () => {
  it("fills the room left, split into the materials of the line", () => {
    const [p, m] = planRefuel([pair, mono], new MaterialStock({ mmh: 100, nto: 100, helio: 5, hidracina: 10 }));
    expect(p!.roomKg).toBe(80);
    expect(p!.loadKg).toBe(80);
    expect(p!.takes.mmh).toBeCloseTo(32);
    expect(p!.takes.nto).toBeCloseTo(48);
    expect(p!.takes.helio).toBeCloseTo(0.8);
    expect(p!.shortOf).toBeUndefined();
    // A full tank takes nothing.
    expect(m!.loadKg).toBe(0);
    expect(m!.takes).toEqual({});
  });

  it("the scarcest material limits the load and is named", () => {
    const [p] = planRefuel([pair], new MaterialStock({ mmh: 100, nto: 30, helio: 5 }));
    expect(p!.loadKg).toBeCloseTo(50, 3); // 30 kg of NTO / 0,6
    expect(p!.shortOf).toBe("nto");
    expect(p!.takes.mmh).toBeCloseTo(20, 2);
  });

  it("lines share the store in order, and kg already on the way leave less room", () => {
    const twin = { ...pair, id: "B" };
    const plan = planRefuel([pair, twin], new MaterialStock({ mmh: 100, nto: 100, helio: 1 }), { "MMH/NTO": 30 });
    expect(plan[0]!.roomKg).toBe(50);
    expect(plan[0]!.loadKg).toBe(50);
    expect(plan[1]!.loadKg).toBeCloseTo(50, 3); // 0,5 kg of helium left / 0,01
    expect(planTakes(plan).helio).toBeCloseTo(1, 6);
  });

  it("transfer time is the load over the flow", () => {
    expect(transferHours(120, 60)).toBe(2);
    expect(transferHours(0, 60)).toBe(0);
  });
});

describe("station transfers", () => {
  const site = { id: "s", name: "S", position: Vec3.ZERO, radiusM: 10, dockingRangeM: 100 };

  it("take the store when queued and go on board when the line finishes", () => {
    const st = new Station(site, new MaterialStock({ mmh: 10 }), new Hangar());
    const got: Record<string, number>[] = [];
    st.setReceiver("sonda", (l) => (got.push({ ...l }), true));
    st.transfer("Repostar", { craftId: "sonda", loads: { "MMH/NTO": 10 }, taken: { mmh: 4 } }, 2);
    expect(st.stock.amount("mmh")).toBe(6);
    expect(st.pendingTransfers("sonda")).toHaveLength(1);
    st.tick(1);
    expect(got).toEqual([]);
    st.tick(1);
    expect(got).toEqual([{ "MMH/NTO": 10 }]);
    expect(st.pendingTransfers("sonda")).toHaveLength(0);
  });

  it("a craft that left gets nothing and the propellant goes back to the store", () => {
    const st = new Station(site, new MaterialStock({ xenon: 100 }), new Hangar());
    st.setReceiver("nodriza", () => false);
    st.transfer("Repostar", { craftId: "nodriza", loads: { xenon: 100 }, taken: { xenon: 100 } }, 1);
    expect(st.stock.amount("xenon")).toBe(0);
    st.tick(1);
    expect(st.stock.amount("xenon")).toBe(100);
  });
});
