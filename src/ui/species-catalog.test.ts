import { describe, expect, it } from "vitest";
import { AdoptionOps, type AdoptionPorts } from "@modules/adoption/application/adoption-ops";
import { SPECIES_CATALOG } from "@modules/adoption/data/catalog";
import { RACK_HABITATS } from "@modules/adoption/data/rack-habitats";
import { ALL_SPECIES } from "@modules/adoption/data/species-extra";
import { BOARD_HOURS_PER_REAL_S } from "@core/board-time";
import { comingText, realCountdown, statusText } from "./species-catalog";
import wiring from "../sanctuary-life.ts?raw";

/** The import system as a fake: 25 board hours of transfer, plenty of credits. */
function ops(): AdoptionOps {
  let id = 0;
  const ports: AdoptionPorts = {
    quote: () => ({ credits: 1, transitDays: 370, gameHours: 25, launcher: "Starship (objetivo)" }),
    credits: () => 1e6,
    order: () => ({ deliveryId: ++id }),
    arrive: (e) => (e.names ? e.names.slice(0, 1) : []),
    calm: () => undefined,
  };
  return new AdoptionOps(SPECIES_CATALOG, ALL_SPECIES, RACK_HABITATS, ports);
}

describe("VID-49 the adopted animals' arrival time counts down live in the open catalogue", () => {
  it("the badge and the page say the time left, and it changes as board time passes", () => {
    const o = ops();
    o.adopt("medaka");
    const at0 = { badge: statusText(o.status("medaka"), o.check("medaka")).text, page: comingText(o.status("medaka"), true) };
    expect(at0.badge).toBe("En camino · 25 h");
    expect(at0.page).toMatch(/llega en 25 h de a bordo \(25:00 reales\)/);
    // One real second of play (sanctuary-life.ts's update ticks the hours every frame).
    o.tickHours(BOARD_HOURS_PER_REAL_S);
    expect(comingText(o.status("medaka"), true)).toMatch(/\(24:59 reales\)/);
    o.tickHours(6);
    expect(statusText(o.status("medaka"), o.check("medaka")).text).toBe("En camino · 19 h");
  });

  it("nothing to count once it has arrived or was never asked for", () => {
    const o = ops();
    expect(comingText(o.status("medaka"))).toBeUndefined();
    o.adopt("medaka");
    o.delivered(1);
    expect(comingText(o.status("medaka"))).toBeUndefined();
    expect(statusText(o.status("medaka"), o.check("medaka")).text).toMatch(/^A bordo/);
  });

  it("real countdown as m:ss, or h:mm:ss past an hour", () => {
    expect(realCountdown(0)).toBe("0:00");
    expect(realCountdown(BOARD_HOURS_PER_REAL_S * 75)).toBe("1:15");
    expect(realCountdown(BOARD_HOURS_PER_REAL_S * 3725)).toBe("1:02:05");
  });

  it("the wiring redraws the open catalogue every frame, after board time passes", () => {
    const update = wiring.slice(wiring.indexOf("update: (lifeDays)"));
    expect(update.indexOf("catalog.tick()")).toBeGreaterThan(update.indexOf("ops.tickHours("));
  });
});
