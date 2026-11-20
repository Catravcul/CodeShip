import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { aisleRails, closestOnRail, discRails, gridRails, hatchRails, RAIL_LAYOUT, RailGraph, railGap, tubeRails, type Handrail } from "./handrails";

const rail = (id: string, a: Vec3, b: Vec3, normal = Vec3.X): Handrail => ({ id, a, b, normal });

describe("rails", () => {
  it("closest point of a bar clamps to its ends", () => {
    const r = rail("r", new Vec3(0, 0, 0), new Vec3(0, 0, 1));
    expect(closestOnRail(r, new Vec3(1, 0, 0.5)).t).toBeCloseTo(0.5);
    expect(closestOnRail(r, new Vec3(0, 0, 3)).t).toBe(1);
    expect(closestOnRail(r, new Vec3(0, 0, 3)).distance).toBeCloseTo(2);
  });

  it("the gap between two bars in line is end to end", () => {
    expect(railGap(rail("a", new Vec3(0, 0, 0), new Vec3(0, 0, 0.5)), rail("b", new Vec3(0, 0, 1.05), new Vec3(0, 0, 1.55)))).toBeCloseTo(0.55);
  });
});

describe("RailGraph", () => {
  const row = [0, 1, 2, 4].map((i) => rail(`r${i}`, new Vec3(0, 0, i * 1.05), new Vec3(0, 0, i * 1.05 + 0.5)));
  const g = new RailGraph(row);

  it("links bars within a hand's reach, not further", () => {
    expect(g.neighbours("r0")).toEqual(["r1"]);
    expect(g.neighbours("r1")).toEqual(["r0", "r2"]);
    expect(g.neighbours("r4")).toEqual([]);
  });

  it("finds the nearest bar in reach, and can skip one", () => {
    expect(g.nearest(new Vec3(0.3, 0, 1.1), 0.75)?.rail.id).toBe("r1");
    expect(g.nearest(new Vec3(0.3, 0, 1.1), 0.75, "r1")?.rail.id).toBe("r0");
    expect(g.nearest(new Vec3(3, 0, 1.2), 0.75)).toBeUndefined();
  });

  it("refuses two rails with the same id", () => {
    expect(() => new RailGraph([row[0]!, row[0]!])).toThrow();
  });
});

describe("rail layouts", () => {
  const box = { id: "m", centre: new Vec3(0, 0, 0), half: new Vec3(1, 1, 3.15) };

  it("an aisle gets four rows, one bar per ISPR rack bay, facing into the aisle", () => {
    const rs = aisleRails(box, "z", "x");
    expect(rs).toHaveLength(4 * 6);
    for (const r of rs) {
      expect(Math.abs(r.a.x)).toBeCloseTo(1 - RAIL_LAYOUT.standoffM);
      expect(Math.sign(r.normal.x)).toBe(-Math.sign(r.a.x));
      expect(r.b.sub(r.a).length()).toBeCloseTo(RAIL_LAYOUT.lengthM);
    }
    // Neighbours in a row are a bay apart and within reach of each other.
    expect(new RailGraph(rs).neighbours(rs[0]!.id)).toContain(rs[1]!.id);
  });

  it("puts bars beside a hatch only where the bulkhead has room", () => {
    expect(hatchRails(box, "z", "x", 1, 0.635)).toHaveLength(2);
    expect(hatchRails({ ...box, half: new Vec3(0.6, 0.85, 3) }, "z", "x", 1, 0.635)).toHaveLength(0);
  });

  it("covers the faces of a big volume with a grid", () => {
    const rs = gridRails({ id: "h", centre: Vec3.ZERO, half: new Vec3(5, 5, 5) }, ["-y", "+z"], 2);
    expect(rs.length).toBeGreaterThan(20);
    expect(rs.every((r) => (r.normal.y === 1 && r.a.y < 0) || (r.normal.z === -1 && r.a.z > 0))).toBe(true);
  });

  it("lines a tube round its wall and its end discs", () => {
    const rs = tubeRails("t", 10, 0, 2, 0, 6.3);
    expect(rs).toHaveLength(4 * 6);
    for (const r of rs) expect(Math.hypot(r.a.y - 10, r.a.z)).toBeCloseTo(2 - RAIL_LAYOUT.standoffM);
    const d = discRails("d", 6.3, -1, 10, 0, 1);
    expect(d.every((r) => r.normal.x === -1 && r.a.x < 6.3)).toBe(true);
  });
});
