import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { orbitAround } from "./orbit-around";
import walkRoom from "../../walk-room.ts?raw";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const heading = (from: THREE.Vector3, aim: THREE.Vector3) => Math.atan2(aim.x - from.x, aim.z - from.z);

describe("UI-09 the camera joystick turns the camera in third person too (Berón, 2026-11-18)", () => {
  const aim = new THREE.Vector3(0.2, 0.55, -0.3);
  const from = new THREE.Vector3(0.1, 2.9, 2.4);

  it("yaw turns the dollhouse camera round her, at the same distance", () => {
    const at = orbitAround(from, aim, 0.5, 0);
    expect(at.distanceTo(aim)).toBeCloseTo(from.distanceTo(aim), 6);
    expect(wrap(heading(at, aim) - heading(from, aim))).toBeCloseTo(0.5, 6);
  });

  it("no input leaves the camera where the room puts it", () => {
    expect(orbitAround(from, aim, 0, 0).distanceTo(from)).toBeLessThan(1e-9);
  });

  it("pitch raises or lowers it, never under her level nor past overhead", () => {
    const up = orbitAround(from, aim, 0, -5);
    const down = orbitAround(from, aim, 0, 5);
    expect(up.y).toBeGreaterThan(from.y);
    expect(down.y).toBeLessThan(from.y);
    expect(down.y).toBeGreaterThan(aim.y);
    expect(Math.hypot(up.x - aim.x, up.z - aim.z)).toBeGreaterThan(0.05);
  });

  it("the LM cabin and the flight deck (walk-room.ts) feed the stick to the orbit in third person and seated", () => {
    expect(walkRoom).toMatch(/this\.orbitYaw \+= look\.yaw/);
    expect(walkRoom).toMatch(/orbitAround\(from, aim, this\.orbitYaw, this\.orbitPitch\)/);
  });

});
