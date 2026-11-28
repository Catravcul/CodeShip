import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ECLSS_RACKS } from "@modules/life-support/data/eclss-machines";
import { PART_OF_FAILURE, eclssRackModel, mountOnWall } from "./eclss-racks";

const sizeOf = (g: THREE.Object3D) => new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());

describe("SV-10 the 3D kit of rack-sized machines", () => {
  it("draws each rack at its real size times the scale the host asks for (nothing baked in)", () => {
    for (const r of ECLSS_RACKS.filter((x) => x.bays > 0))
      for (const k of [1, 1.5]) {
        const s = sizeOf(eclssRackModel(r.kind, { scale: k }).group);
        expect(s.x, r.kind).toBeCloseTo(r.size.w * k, 1);
        expect(s.y, r.kind).toBeCloseTo(r.size.h * k, 1);
      }
  });

  it("has the part each failure changes, and tags every mesh with the host's fixture", () => {
    for (const [failure, part] of Object.entries(PART_OF_FAILURE)) {
      const kind = ECLSS_RACKS.find((r) => r.machines.some((m) => failure.startsWith(m)))!.kind;
      expect(eclssRackModel(kind, { scale: 1 }).parts.has(part), failure).toBe(true);
    }
    const m = eclssRackModel("ar", { scale: 1, fixtureId: "sv-ar" });
    m.group.traverse((o) => expect(o.userData.fixture).toBe("sv-ar"));
  });

  it("a repair lights one lamp per step and clears them", () => {
    const m = eclssRackModel("ar", { scale: 1 });
    const before = m.group.children.length;
    const v = m.repairVisual("lechos", 6);
    expect(m.group.children.length).toBe(before + 6);
    v.stepDone(0);
    m.tick(1);
    v.clear();
    expect(m.group.children.length).toBe(before);
  });

  it("mounts on a wall facing the aisle", () => {
    const m = eclssRackModel("ogs", { scale: 1 });
    mountOnWall(m, new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0));
    const b = new THREE.Box3().setFromObject(m.group);
    // Details (pumps, cylinders) stand out of the front a little; nothing reaches far into the aisle.
    expect(b.min.x).toBeGreaterThan(1 - 0.25);
    expect(b.max.x).toBeCloseTo(1 + 0.86, 1);
  });
});
