import { describe, expect, it } from "vitest";
import { Vec3 } from "@core/math/vec3";
import { BERTHED_MOTHERSHIP, KEVLAR_SOFTGOODS, POLANA_DRY_DOCK } from "../data/dry-dock";
import { HANGAR_SIZE, LANDER_ENVELOPE, MOTHERSHIP_ENVELOPE } from "../data/hangar-craft";
import { POLANA_LAYOUT } from "../data/structure";
import { airDensityKgM3, craftCoords, freeSpans, gapToCraft, holdsCraft, pressurisedEnclosure } from "./dry-dock";
import { fitsInHangar } from "./hangar-berth";

const d = POLANA_DRY_DOCK;
const c = BERTHED_MOTHERSHIP;

describe("EST-25 the dry dock: an open cradle for the mothership", () => {
  it("is sized from the mothership: its 152,7 m and its rings (57 m) fit inside with room for the spinning rims", () => {
    expect(c.lengthM).toBeCloseTo(152.7, 1);
    expect(c.reachM).toBe(57);
    expect(holdsCraft(d, c)).toBe(true);
    expect(d.halfWidthM).toBeGreaterThan(c.reachM + 5);
    expect(d.toM - d.fromM).toBeGreaterThan(140);
    // The lander still goes in the pressurised hangar; the mothership does not.
    expect(fitsInHangar(LANDER_ENVELOPE, HANGAR_SIZE)).toBe(true);
    expect(fitsInHangar(MOTHERSHIP_ENVELOPE, HANGAR_SIZE)).toBe(false);
  });

  it("no beam, hoop or strut comes within 5 m of the ship (the rings spin)", () => {
    for (const b of [...d.beams, ...d.links]) expect(gapToCraft(c, b)).toBeGreaterThan(5);
  });

  it("holds her with arms that reach the bare spine between the rings and the radiators, and past the thrusters", () => {
    const at = [...new Set(d.arms.map((a) => Math.round(a.atM)))];
    expect(at.length).toBe(2);
    expect(d.arms.length).toBe(8);
    for (const a of d.arms) {
      // The grapple touches the hull (within 0,5 m) and nothing on the way cuts through a ring or a wing.
      expect(gapToCraft(c, a, 1)).toBeGreaterThan(0);
      expect(craftCoords(c, a.to).offM).toBeLessThan(3);
    }
    const spans = freeSpans(c, d.fromM);
    for (const m of at) expect(spans.some((s) => m > s.fromM && m < s.toM)).toBe(true);
  });

  it("has umbilicals to the nose, floodlights at every hoop corner, and two struts to the station's truss", () => {
    expect(d.umbilicals.length).toBe(2);
    for (const u of d.umbilicals) expect(craftCoords(c, u.to).alongM).toBeLessThan(25);
    expect(d.lights.length).toBe(4 * d.hoopsM.length);
    expect(d.links.length).toBe(2);
  });

  it("leaves the lander's approach to node 2 (nadir) clear: 15 m or more from the frame", () => {
    const sonda = POLANA_LAYOUT.ports.find((p) => p.user === "sonda")!;
    for (const b of d.beams)
      for (let k = 0; k <= 1; k += 0.02) {
        const p = b.from.add(b.to.sub(b.from).scale(k));
        // The lander comes straight up the port's axis from 300 m below.
        const rel = p.sub(sonda.position);
        const down = -rel.dot(sonda.normal.scale(-1));
        const side = rel.sub(sonda.normal.scale(rel.dot(sonda.normal))).length();
        if (down <= 0) expect(side).toBeGreaterThan(15);
      }
  });

  it("stays clear of the station's wings and radiators", () => {
    const inBox = (p: Vec3, c0: Vec3, h: Vec3) => Math.abs(p.x - c0.x) <= h.x && Math.abs(p.y - c0.y) <= h.y && Math.abs(p.z - c0.z) <= h.z;
    for (const part of POLANA_LAYOUT.parts.filter((p) => p.kind !== "celosia"))
      for (const b of [...d.beams, ...d.links])
        for (let k = 0; k <= 1; k += 0.02) expect(inBox(b.from.add(b.to.sub(b.from).scale(k)), part.centre, part.half)).toBe(false);
  });
});

describe("EST-26 a pressurised hangar for the mothership: possible, at a price", () => {
  it("air is 1,2 kg/m³ at sea-level pressure", () => {
    expect(airDensityKgM3(101.3)).toBeCloseTo(1.2, 1);
  });

  it("a Kevlar cylinder round her (r 66 m, 165 m) at 101 kPa: 7,4 mm of fabric (~1 000 t) and ~2 700 t of air", () => {
    const e = pressurisedEnclosure(66, 165, 101.3, KEVLAR_SOFTGOODS);
    expect(e.volumeM3 / 1e6).toBeCloseTo(2.26, 2);
    expect(e.wallMm).toBeCloseTo(7.43, 1);
    expect(e.wallKg / 1000).toBeCloseTo(1025, -1);
    expect(e.airKg / 1000).toBeCloseTo(2700, -2);
    // Over four times the mothership herself (877 t) and about nine ISSs (~420 t), before shielding and the door.
    expect((e.wallKg + e.airKg) / 1000 / 877).toBeGreaterThan(4);
  });

  it("at a third of an atmosphere (34 kPa) it is still more than the mothership", () => {
    const e = pressurisedEnclosure(66, 165, 34, KEVLAR_SOFTGOODS);
    expect((e.wallKg + e.airKg) / 1000).toBeGreaterThan(877);
  });
});
