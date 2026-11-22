import { describe, expect, it } from "vitest";
import { buildS1Layout } from "./layout";
import { globeSkin } from "./globo";
import { WalkIndex } from "./walk-index";
import { model } from "./catalog";

/**
 * The performance budget of sanctuary 1 (Berón 2026-11-22: «sería ideal tener un control de rendimiento para conservar
 * la jugabilidad tras los cambios»): what the phone draws and what the walk scans, counted from the data so it holds
 * in every run. Measured on 2026-11-22 (in brackets) with some room; a change that passes a budget is looked at live
 * (tools/rendimiento-s1.mjs: draw calls, triangles and frames per second on the iPhone 13 view) before raising it.
 */
const BUDGET = {
  instances: 3500, // (3 011) placed things
  pieces: 32_000, // (27 389) boxes of their models, drawn instanced
  solids: 14_500, // (12 654) walk solids
  waters: 2_000, // (1 695) water boxes, the globe's 1 610 among them
  globeQuads: 15_000, // (13 081) faces of the globe's skin
  nearSolids: 3_600, // (3 096) the most solids the walk scans at one spot (WalkIndex.near)
} as const;

describe("control de rendimiento del santuario 1", () => {
  const L = buildS1Layout(1);
  it("lo que se dibuja cabe en su presupuesto", () => {
    expect(L.instances.length).toBeLessThanOrEqual(BUDGET.instances);
    expect(L.instances.reduce((n, i) => n + (model(i.model).parts?.length ?? 1), 0)).toBeLessThanOrEqual(BUDGET.pieces);
    expect(globeSkin().length / 18).toBeLessThanOrEqual(BUDGET.globeQuads);
  });
  it("lo que el paseo mira en cada paso cabe en su presupuesto", () => {
    expect(L.world.solids.length).toBeLessThanOrEqual(BUDGET.solids);
    expect(L.world.waters.length).toBeLessThanOrEqual(BUDGET.waters);
    const ix = new WalkIndex(L.world);
    let most = 0;
    for (const f of L.world.floors) most = Math.max(most, ix.near((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, f.y).solids.length);
    expect(most).toBeLessThanOrEqual(BUDGET.nearSolids);
  });
});
