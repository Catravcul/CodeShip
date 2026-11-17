import { describe, expect, it } from "vitest";
import { CAMERA_RATES, cameraStep } from "./camera-stick";

/** Every TypeScript source of the game, as text (tests left out). */
const SOURCES = import.meta.glob<string>(["/src/**/*.ts", "!/src/**/*.test.ts"], { query: "?raw", import: "default", eager: true });

describe("camera only by joystick (reglas.md §5.7)", () => {
  const files = Object.entries(SOURCES).map(([f, text]) => ({ f: f.slice(1), text }));

  it("reads the game's sources", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("no OrbitControls or other drag camera controls from three/examples", () => {
    const bad = files.filter(({ text }) => /OrbitControls|TrackballControls|MapControls|ArcballControls|PointerLockControls/.test(text)).map(({ f }) => f);
    expect(bad).toEqual([]);
  });

  it("only the on-screen sticks follow a moving finger: no pointermove, touchmove or mousemove on the screen", () => {
    // A camera that follows a finger needs move events; the stick (stick.ts) is the one place that may listen to them.
    const allowed = new Set(["src/adapters/input/stick.ts"]);
    const bad = files.filter(({ f, text }) => !allowed.has(f) && /["'](pointermove|touchmove|mousemove)["']/.test(text)).map(({ f }) => f);
    expect(bad).toEqual([]);
  });

  it("the stick listens to moves on its own element only, never on the window or the canvas", () => {
    const stick = files.find(({ f }) => f === "src/adapters/input/stick.ts")!.text;
    const moves = stick.split("\n").filter((l: string) => l.includes('"pointermove"'));
    expect(moves.length).toBeGreaterThan(0);
    for (const l of moves) expect(l).toMatch(/this\.el\.addEventListener\("pointermove"/);
  });

  it("every view that turns a camera has a joystick for it", () => {
    // The views whose drag turned the camera before (Berón, 2026-11-17) now build a stick.
    const views = ["src/ship-bay.ts", "src/station-screen.ts", "src/station-eva.ts", "src/ui/nav-map.ts", "src/adapters/three/dock-view.ts", "src/adapters/three/trip-preview.ts"];
    for (const v of views) expect(files.find(({ f }) => f === v)?.text, v).toMatch(/new CameraStick\(/);
    for (const v of ["src/adapters/input/walker.ts", "src/adapters/three/flight-view.ts", "src/probe-mode.ts"]) expect(files.find(({ f }) => f === v)?.text, v).toMatch(/new VirtualStick\(/);
  });
});

describe("cameraStep", () => {
  it("is still with the knob centred and no zoom held", () => {
    expect(cameraStep({ x: 0, y: 0 }, 0, 0.016)).toEqual({ yaw: -0, pitch: -0, zoom: 1 });
  });

  it("full right turns right (negative yaw) at the full rate, full up looks up", () => {
    const s = cameraStep({ x: 1, y: -1 }, 0, 0.5);
    expect(s.yaw).toBeCloseTo(-CAMERA_RATES.yaw * 0.5);
    expect(s.pitch).toBeCloseTo(CAMERA_RATES.pitch * 0.5);
  });

  it("small moves are gentle (squared response)", () => {
    expect(Math.abs(cameraStep({ x: 0.2, y: 0 }, 0, 1).yaw)).toBeCloseTo(0.04 * CAMERA_RATES.yaw);
  });

  it("«+» brings the camera closer and «−» takes it away, symmetrically", () => {
    const inn = cameraStep({ x: 0, y: 0 }, 1, 0.1).zoom;
    const out = cameraStep({ x: 0, y: 0 }, -1, 0.1).zoom;
    expect(inn).toBeLessThan(1);
    expect(out).toBeGreaterThan(1);
    expect(inn * out).toBeCloseTo(1);
  });
});
