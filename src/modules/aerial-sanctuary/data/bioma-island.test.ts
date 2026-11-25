import { describe, expect, it } from "vitest";
import { climbTarget } from "@modules/sanctuary-one/domain/climb";
import { dropTo, floorAt, placeAt, step, type Body } from "../domain/walk";
import { BIOME_ISLAND, BIOME_ZONES, MOUNTAIN, beltAt } from "./bioma-island";
import { buildLayout } from "./layout";

const L = buildLayout(1.5);
const C = BIOME_ISLAND.centre.value;

describe("the air island in the walk world", () => {
  it("replaces the subantarctic island: «Isla de las alturas», one Áreas node per zone with its belt", () => {
    const isl = L.islands.find((i) => i.id === "bioma")!;
    expect(isl.name).toBe("Isla de las alturas");
    for (const z of BIOME_ZONES) {
      const a = L.areas.find((q) => q.id === `bioma:${z.id}`)!;
      expect(a.belt?.id).toBe(beltAt(z.point.x, z.point.z).belt.id);
    }
    // Nothing of the other islands overlaps it (the campus is inside its mountain: docs/design/montana-hueca.md).
    for (const o of L.islands.filter((i) => i.id !== "bioma" && i.id !== "entrenamiento")) {
      const apart = o.rect.x1 < isl.rect.x0 || o.rect.x0 > isl.rect.x1 || o.rect.z1 < isl.rect.z0 || o.rect.z0 > isl.rect.z1;
      expect(apart, o.id).toBe(true);
    }
  });

  it("she stands on the mountain's ground where it is gentle, at its height; not on a cliff", () => {
    const meadow = BIOME_ZONES.find((z) => z.id === "pradera")!.point;
    const b = dropTo(L.world, C.x + meadow.x, 1000, C.z + meadow.z);
    expect(b?.motion).toBe("gravedad");
    expect(b!.area).toBe("bioma:pradera");
    // Straight up the cliff ring south of the summit: no floor on the wall.
    const cliff = { x: C.x + MOUNTAIN.value.peak.x, z: C.z + MOUNTAIN.value.peak.z - 200 };
    expect(floorAt(L.world, cliff.x, 270, cliff.z)).toBeUndefined();
  });

  it("walking up the trail from the hut climbs the slope step by step", () => {
    let b: Body = placeAt(L.world, C.x - 150, 6.5, C.z - 476)!;
    const to = { x: C.x - 250, z: C.z - 400 };
    for (let i = 0; i < 400 && Math.hypot(to.x - b.x, to.z - b.z) > 0.5; i++) {
      const d = Math.hypot(to.x - b.x, to.z - b.z);
      b = step(L.world, b, { dx: ((to.x - b.x) / d) * Math.min(0.4, d), dz: ((to.z - b.z) / d) * Math.min(0.4, d) });
    }
    expect(Math.hypot(to.x - b.x, to.z - b.z)).toBeLessThan(0.6);
    expect(b.y).toBeGreaterThan(20);
  });

  it("the farallón's ledges are climbed one after another with X (Trepar)", () => {
    const ledges = L.world.floors.filter((f) => f.id.startsWith("bioma:repisa")).sort((a, c) => a.y - c.y);
    expect(ledges.length).toBeGreaterThanOrEqual(8);
    const f = ledges[0]!;
    // From the foot of the cliff below the first ledge, facing north (yaw π: forward is +z).
    let b: Body = dropTo(L.world, (f.x0 + f.x1) / 2, f.y, f.z0 - 0.4)!;
    expect(b.motion).toBe("gravedad");
    expect(b).toBeDefined();
    let climbed = 0;
    for (let i = 0; i < ledges.length; i++) {
      const c = climbTarget(L.world, b, Math.PI);
      if (!c) break;
      b = { x: c.x, y: c.y, z: c.z, motion: "gravedad", area: c.floor.area };
      climbed++;
      // She walks to the back of the ledge, under the next one.
      for (let k = 0; k < 10 && b.z < c.floor.z1 - 0.4; k++) b = step(L.world, b, { dx: 0, dz: Math.min(0.3, c.floor.z1 - 0.35 - b.z) });
    }
    expect(climbed).toBe(ledges.length);
    expect(b.y).toBeCloseTo(ledges.at(-1)!.y);
  });
});
