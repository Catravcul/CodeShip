import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { asanaById } from "@modules/body/data/asanas";
import { CubeFigure } from "./figure";

const meshes = (f: CubeFigure) => {
  let n = 0;
  f.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n++;
  });
  return n;
};
/** World-space centres of every box, rounded (to compare looks). */
const boxes = (f: CubeFigure) => {
  f.root.updateMatrixWorld(true);
  const out: string[] = [];
  f.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.push(o.getWorldPosition(new THREE.Vector3()).toArray().map((v) => v.toFixed(3)).join(","));
  });
  return out.sort();
};

describe("CubeFigure on Cold Sanctuary's skeleton (docs/design/esqueleto.md)", () => {
  it("looks as before standing: the torso is two boxes of the old one's size, one draw call more", () => {
    const f = new CubeFigure(0xe8b48f, 0x2f7f8f, 0xb9a3d9, true);
    expect(meshes(f)).toBe(20); // 19 before: the torso box split in lumbar + chest
    f.root.updateMatrixWorld(true);
    const head = new THREE.Vector3();
    f.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && ((o as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.height === 0.25) o.getWorldPosition(head);
    });
    expect(head.y).toBeCloseTo(0.95 + 0.58 + 0.13, 6);
  });

  it("an asana drives every joint, rests on the floor and reports palms and soles", () => {
    const f = new CubeFigure();
    f.asana(asanaById("uttanasana-flexion-adelante")!, 1);
    for (let i = 0; i < 90; i++) f.update(1 / 60);
    expect(f.asanaArrived).toBe(true);
    const c = f.contacts()!;
    expect(c.HandLeft).toBeLessThan(0.035);
    expect(c.FootRight).toBeLessThan(0.035);
    expect(f.breath).toMatch(/inhala|exhala/);
    // The hand the step visuals use follows the skeleton.
    f.root.updateMatrixWorld(true);
    expect(f.handWorld(0, new THREE.Vector3()).y).toBeLessThan(0.1);
  });

  it("gestures take over again after yoga, with the extra joints back at rest", () => {
    const fresh = boxes(new CubeFigure());
    const f = new CubeFigure();
    f.asana(asanaById("bhujangasana-cobra")!, 0.5);
    for (let i = 0; i < 60; i++) f.update(1 / 60);
    f.pose("stand");
    for (let i = 0; i < 600; i++) f.update(1 / 60, 10);
    expect(f.currentAsana).toBeUndefined();
    expect(f.contacts()).toBeUndefined();
    expect(boxes(f)).toEqual(fresh);
  });
});
