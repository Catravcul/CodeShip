import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { landingSketch, tripSketch } from "./plan-sketch";

describe("plan sketch: each right step shows what it does (NAV-07)", () => {
  const route = { from: new Vec3(0, 0, 0), waypoints: [new Vec3(1000, 0, 0)], arrival: new Vec3(1000, 0, 2000), brakeM: 400, cruiseMS: 25, deltaVMS: 50, totalS: 120, targetName: "Bennu" };

  it("NAV-07 a trip chain draws the route, the burn, the arrival, the braking point and the whole plan", () => {
    const s = tripSketch(route);
    expect(s).toHaveLength(5);
    expect(s[0]!.items[0]).toMatchObject({ kind: "line", tone: "plan" });
    expect(s[0]!.caption).toContain("2 tramos");
    const burn = s[1]!.items[0]!;
    expect(burn.kind === "arrow" && burn.to.x).toBeGreaterThan(0);
    const arrival = s[2]!.items[0]!;
    expect(arrival.kind === "ring" && arrival.centre).toEqual(route.arrival);
    // The braking point sits 400 m before the arrival, on the last leg.
    const brake = s[3]!.items[0]!;
    expect(brake.kind === "ring" && brake.centre.sub(new Vec3(1000, 0, 1600)).length()).toBeLessThan(1e-9);
    expect(s[4]!.items[0]!.tone).toBe("ok");
  });

  it("NAV-07 a landing chain marks the site, the drift, the descent curve, the flare height and the anchors", () => {
    const up = new Vec3(0, 1, 0);
    const s = landingSketch({ craft: new Vec3(0, 300, 0), site: Vec3.ZERO, up, siteRadiusM: 5, groundVelocity: new Vec3(0.08, 0, 0), maxDescentMs: 1.5, flareM: 3, touchdownMs: 0.04, brakeMs2: 0.035 });
    expect(s).toHaveLength(5);
    const site = s[0]!.items[0]!;
    expect(site.kind === "ring" && site.radiusM).toBe(5);
    expect(s[0]!.caption).toContain("300 m");
    const drift = s[1]!.items[0]!;
    expect(drift.kind === "arrow" && drift.to.sub(drift.from).normalize().x).toBeCloseTo(1, 6);
    // The curve goes from the ground to the craft's height, wider (faster) higher up.
    const curve = s[2]!.items[0]!;
    expect(curve.kind === "line" && curve.points.length).toBe(13);
    const flare = s[3]!.items[0]!;
    expect(flare.kind === "ring" && flare.centre.y).toBe(3);
    expect(s[4]!.items.filter((i) => i.kind === "arrow")).toHaveLength(3);
  });
});
