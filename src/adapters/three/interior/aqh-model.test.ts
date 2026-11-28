import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { GEAR } from "@modules/wellness/data/gear";
import { AqhModel, FISH_M, fishPose } from "./aqh-model";

/** A tank as the domain gives it to the model. */
const tank = (fish: number, friends = false) => ({ fishCount: fish, snailCount: 6, algae: 0, friends }) as unknown as Parameters<AqhModel["update"]>[1];

/** Head and tail of fish `i` (its length along its local z), in the unit's frame. */
function ends(g: AqhModel, i: number): THREE.Vector3[] {
  const m = new THREE.Matrix4();
  g.fish.getMatrixAt(i, m);
  return [g.fishLength / 2, -g.fishLength / 2].map((z) => new THREE.Vector3(0, 0, z).applyMatrix4(m));
}

describe("VID-50 JAXA's Aquatic Habitat at real size: the fish swim inside its chambers, never through the glass", () => {
  for (const k of [1, 1.5]) {
    it(`at presentation scale ${k}×, every fish stays inside its chamber for a minute of swimming`, () => {
      const g = new AqhModel(k);
      for (const friends of [false, true]) {
        for (let t = 0; t < 60; t += 0.25) {
          g.update(0.25, tank(16, friends));
          for (let i = 0; i < g.fish.count; i++) {
            const ch = g.chambers[i % 2]!;
            for (const p of ends(g, i)) {
              const d = p.clone().sub(ch.centre);
              expect(Math.abs(d.x), `fish ${i} x`).toBeLessThan(ch.half.x);
              expect(Math.abs(d.y), `fish ${i} y`).toBeLessThan(ch.half.y);
              expect(Math.abs(d.z), `fish ${i} z`).toBeLessThan(ch.half.z);
            }
          }
        }
      }
    });
  }

  it("the chambers are 15 × 7 × 7 cm and a medaka about 3.5 cm, both grown alike by the presentation scale", () => {
    expect(GEAR.aqh.size.value).toEqual({ w: 0.15, h: 0.07, d: 0.07 });
    for (const k of [1, 1.5]) {
      const g = new AqhModel(k);
      expect(g.fishLength).toBeCloseTo(FISH_M * k);
      // Inner half-sizes: the chamber less its 2 mm of glass.
      expect(g.chambers[0]!.half.x * 2).toBeCloseTo(0.15 * k - 0.004);
      expect(g.chambers[0]!.half.z * 2).toBeCloseTo(0.07 * k - 0.004);
      // A medaka is under a quarter of its chamber's length: it has room to swim.
      expect(g.fishLength / (g.chambers[0]!.half.x * 2)).toBeLessThan(0.25);
    }
  });

  it("nothing of it goes behind the wall it is mounted on (its frame: z ≥ 0 is the aisle)", () => {
    const g = new AqhModel(1.5);
    g.update(0.1, tank(8));
    g.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g.root);
    expect(box.min.z).toBeGreaterThanOrEqual(-1e-6);
  });

  it("each fish heads the way it swims", () => {
    const ch = { centre: new THREE.Vector3(), half: new THREE.Vector3(0.075, 0.035, 0.035) };
    const a = fishPose(ch, FISH_M, 3, 10, "libre");
    const b = fishPose(ch, FISH_M, 3, 10.01, "libre");
    const v = b.at.clone().sub(a.at).setY(0).normalize();
    const h = new THREE.Vector3(Math.sin(a.heading), 0, Math.cos(a.heading));
    expect(v.dot(h)).toBeGreaterThan(0.9);
  });
});
