import { describe, expect, it } from "vitest";
import { CREW_STATION, LM_PANELS, STATION_BODY } from "./crew-station";
import { LANDER_CABIN_REAL } from "./cabin";

describe("the LM's crew station (docs/design/cabina-lm.md)", () => {
  it("HAB-27 the stations are 44 in apart and the windows have their real areas", () => {
    const c = LANDER_CABIN_REAL.stations.find((s) => s.id === "asiento")!;
    const p = LANDER_CABIN_REAL.stations.find((s) => s.id === "mente")!;
    expect(p.stand.x - c.stand.x).toBeCloseTo(CREW_STATION.stationsApartM.value, 9);
    expect(CREW_STATION.stationsApartM.value).toBeCloseTo(1.118, 3);
    // Each triangular window: about 2 ft² (0,186 m²); the docking window about 80 in² (0,052 m²).
    expect((CREW_STATION.forwardWindowWidthM.value * CREW_STATION.forwardWindowHeightM.value) / 2).toBeCloseTo(CREW_STATION.forwardWindowM2.value, 2);
    expect(CREW_STATION.dockingWindowWidthM.value * CREW_STATION.dockingWindowDepthM.value).toBeCloseTo(CREW_STATION.dockingWindowM2.value, 2);
    // The commander's eye (1,45 m standing) looks out through his window.
    const bottom = CREW_STATION.forwardWindowBottomM.value;
    expect(bottom).toBeLessThan(1.45);
    expect(bottom + CREW_STATION.forwardWindowHeightM.value).toBeGreaterThan(1.45);
    expect(bottom + CREW_STATION.forwardWindowHeightM.value).toBeLessThan(LANDER_CABIN_REAL.heightM);
  });

  it("HAB-27 panels 1 to 6 are in front, 8 and 11 on the commander's left, 12, 14 and 16 on the pilot's right, each with what it holds", () => {
    const at = (id: string) => LM_PANELS.find((p) => p.id === id)!;
    expect(LM_PANELS.map((p) => p.id).sort()).toEqual(["1", "11", "12", "14", "16", "2", "3", "4", "5", "6", "8"]);
    for (const id of ["1", "2", "3", "4", "5", "6"]) expect(at(id).wall).toBe("front");
    for (const id of ["8", "11"]) expect(at(id).wall).toBe("left");
    for (const id of ["12", "14", "16"]) expect(at(id).wall).toBe("right");
    expect(at("1").at.x).toBeLessThan(0);
    expect(at("2").at.x).toBeGreaterThan(0);
    expect(at("1").holds).toMatch(/FDAI/);
    expect(at("1").holds).toMatch(/X-pointer/);
    expect(at("4").holds).toMatch(/DSKY/);
    expect(at("8").holds).toMatch(/COAS/);
    // Above the forward hatch (0,81 m) and under the roof.
    for (const p of LM_PANELS) {
      expect(p.at.y - p.hM / 2).toBeGreaterThan(p.wall === "front" && Math.abs(p.at.x) < 0.2 ? CREW_STATION.forwardHatchM.value : 0);
      expect(p.at.y + p.hM / 2).toBeLessThan(LANDER_CABIN_REAL.heightM);
    }
  });

  it("HAB-27 hand controllers and armrests are at hand height, within the station", () => {
    expect(STATION_BODY.controllerY).toBeGreaterThan(0.8);
    expect(STATION_BODY.controllerY).toBeLessThan(1.2);
    expect(STATION_BODY.controllerSideM).toBeLessThan(CREW_STATION.stationsApartM.value / 2);
  });
});
