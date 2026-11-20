import { describe, expect, it } from "vitest";
import { MapSelection, clampZoom, nearestPick, orbitProjector, turnBy, type MapChoice } from "./map-window-model";

const LIMITS = { turnPerPx: 0.01, minElevation: 0.1, minZoom: 0.5, maxZoom: 8 };

describe("the map window's projection", () => {
  it("seen straight down, x goes right and z goes down the canvas; the height does not move a point", () => {
    const P = orbitProjector({ yaw: 0, elevation: Math.PI / 2 }, 10, 100, 50);
    const a = P({ x: 2, y: 0, z: 3 });
    expect(a.x).toBeCloseTo(120);
    expect(a.y).toBeCloseTo(80);
    expect(P({ x: 2, y: 5, z: 3 }).y).toBeCloseTo(80);
  });

  it("seen from the side, up is up the canvas and the stalk's foot stays on the plane", () => {
    const P = orbitProjector({ yaw: 0, elevation: 0 }, 10, 100, 50);
    const p = P({ x: 0, y: 2, z: 0 });
    expect(p.y).toBeCloseTo(30);
    expect(p.gy).toBeCloseTo(50);
  });

  it("turns round the origin it is given, which is drawn at the centre", () => {
    const P = orbitProjector({ yaw: 1.2, elevation: 0.7 }, 7, 100, 50, { x: 3, y: -2, z: 4 });
    const c = P({ x: 3, y: -2, z: 4 });
    expect(c.x).toBeCloseTo(100);
    expect(c.y).toBeCloseTo(50);
  });

  it("a finger drag turns it and tilts it, never past straight down or under the lowest tilt", () => {
    const v = { yaw: 0, elevation: 1, zoom: 1 };
    turnBy(v, 50, 0, LIMITS);
    expect(v.yaw).toBeCloseTo(-0.5);
    turnBy(v, 0, 1000, LIMITS);
    expect(v.elevation).toBeCloseTo(Math.PI / 2);
    turnBy(v, 0, -1000, LIMITS);
    expect(v.elevation).toBeCloseTo(0.1);
    expect(clampZoom(100, LIMITS)).toBe(8);
    expect(clampZoom(0.1, LIMITS)).toBe(0.5);
  });

  it("a tap picks the nearest point within a fingertip, or nothing", () => {
    const pts = [{ id: "a", x: 10, y: 10 }, { id: "b", x: 30, y: 10 }];
    expect(nearestPick(pts, 22, 10, 32)?.id).toBe("b");
    expect(nearestPick(pts, 200, 200, 32)).toBeUndefined();
  });
});

describe("the map window's selection", () => {
  let list: MapChoice[] = [{ id: "uno", selectable: false, locked: "Próximamente" }, { id: "tres", locked: "En construcción" }, { id: "seis" }];
  const sel = new MapSelection(() => list);

  it("picks an option only if it is in the list and selectable", () => {
    expect(sel.pick("uno")).toBe(false);
    expect(sel.picked).toBeUndefined();
    expect(sel.pick("nada")).toBe(false);
    expect(sel.pick("tres")).toBe(true);
    expect(sel.picked).toBe("tres");
  });

  it("does the action only of an unlocked option, and says why not otherwise", () => {
    expect(sel.act()).toEqual({ ok: false, why: "En construcción" });
    expect(sel.act("uno")).toEqual({ ok: false, why: "Próximamente" });
    expect(sel.act("seis")).toEqual({ ok: true, id: "seis" });
    expect(sel.act("nada").ok).toBe(false);
  });

  it("forgets the pick when the list loses it", () => {
    sel.pick("seis");
    list = [{ id: "tres" }];
    sel.keep();
    expect(sel.picked).toBeUndefined();
    sel.pick("tres");
    sel.clear();
    expect(sel.picked).toBeUndefined();
  });
});
