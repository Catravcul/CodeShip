import { describe, expect, it } from "vitest";
import { CAMERA_RATES, cameraStep } from "./camera-stick";
import { AREA_MOTION, moveJoystick, type AreaId } from "@core/realism";

/** Every TypeScript source of the game, as text (tests left out). */
const SOURCES = import.meta.glob<string>(["/src/**/*.ts", "!/src/**/*.test.ts"], { query: "?raw", import: "default", eager: true });

describe("UI-07 camera only by joystick (reglas.md §5.7)", () => {
  const files = Object.entries(SOURCES).map(([f, text]) => ({ f: f.slice(1), text }));

  it("reads the game's sources", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("no OrbitControls or other drag camera controls from three/examples", () => {
    const bad = files.filter(({ text }) => /OrbitControls|TrackballControls|MapControls|ArcballControls|PointerLockControls/.test(text)).map(({ f }) => f);
    expect(bad).toEqual([]);
  });

  it("only the on-screen sticks follow a moving finger: no pointermove, touchmove or mousemove on the screen", () => {
    // A camera that follows a finger needs move events; the stick (stick.ts) is the one place that may listen to them,
    // and the 3D maps' finger (map-gestures.ts), the rule's one exception.
    const allowed = new Set(["src/adapters/input/stick.ts", "src/ui/map-gestures.ts"]);
    const bad = files.filter(({ f, text }) => !allowed.has(f) && /["'](pointermove|touchmove|mousemove)["']/.test(text)).map(({ f }) => f);
    expect(bad).toEqual([]);
  });

  it("the one exception: only the map windows' 3D maps turn and zoom with a finger (map-gestures.ts, through map-window.ts)", () => {
    const users = files.filter(({ f, text }) => f !== "src/ui/map-gestures.ts" && /\bmapGestures\(/.test(text)).map(({ f }) => f).sort();
    expect(users).toEqual(["src/ui/map-window.ts"]);
    // The map windows: the start screen, Navigation and Áreas (Berón, 2026-11-18: one model for all of them).
    const windows = files.filter(({ f, text }) => f !== "src/ui/map-window.ts" && /\bnew MapWindow\(/.test(text)).map(({ f }) => f).sort();
    expect(windows).toEqual(["src/ui/areas-window.ts", "src/ui/nav-map.ts", "src/ui/start-screen.ts"]);
  });

  it("the stick listens to moves on its own element only, never on the window or the canvas", () => {
    const stick = files.find(({ f }) => f === "src/adapters/input/stick.ts")!.text;
    const moves = stick.split("\n").filter((l: string) => l.includes('"pointermove"'));
    expect(moves.length).toBeGreaterThan(0);
    for (const l of moves) expect(l).toMatch(/this\.el\.addEventListener\("pointermove"/);
  });

  it("every view that turns a camera has a joystick for it", () => {
    // The views whose drag turned the camera before (Berón, 2026-11-17) now build a stick.
    const views = ["src/ship-bay.ts", "src/station-screen.ts", "src/station-eva.ts", "src/ui/map-window.ts", "src/adapters/three/dock-view.ts", "src/adapters/three/trip-preview.ts"];
    for (const v of views) expect(files.find(({ f }) => f === v)?.text, v).toMatch(/new CameraStick\(/);
    for (const v of ["src/adapters/input/walker.ts", "src/adapters/three/flight-view.ts", "src/probe-mode.ts"]) expect(files.find(({ f }) => f === v)?.text, v).toMatch(/new VirtualStick\(/);
  });
});

describe("UI-08 no gravity areas for now: the joystick moves the camera, never her (Berón, 2026-11-17 18:54)", () => {
  const src = (f: string) => SOURCES[`/${f}`]!;

  it("no area is flagged with gravity or water, the LM on an asteroid and the asteroid outside included", () => {
    for (const [area, motion] of Object.entries(AREA_MOTION)) {
      expect(motion, area).toBe("ingravidez");
      expect(moveJoystick(area as AreaId), area).toBe(false);
    }
    expect(Object.keys(AREA_MOTION)).toEqual(expect.arrayContaining(["cabina-lm", "puente", "starship", "estacion", "paseo-estacion", "paseo-asteroide"]));
  });

  it("every area's controls ask core/realism.ts whether a stick may move her", () => {
    const calls = Object.entries(SOURCES).flatMap(([f, text]) => (text.match(/new Walker\([^;]*;/g) ?? []).map((c) => [f, c] as const));
    expect(calls.length).toBeGreaterThanOrEqual(4);
    for (const [f, c] of calls) expect(c, f).toMatch(/moveJoystick\(/);
  });

  it("the walker builds the stick that moves her only in a gravity or water area, and its look stick zooms the camera", () => {
    const w = src("src/adapters/input/walker.ts");
    expect(w).toMatch(/this\.moveStick = moves \? new VirtualStick\(/);
    expect(w).toMatch(/if \(!this\.moves \|\| !this\.moveStick\) return \{ forward: 0, right: 0 \}/);
    expect(w).toMatch(/addZoomButtons\(this\.lookStick\.el/);
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
