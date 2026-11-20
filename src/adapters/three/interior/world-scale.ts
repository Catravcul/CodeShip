import { WORLD_SCALE } from "@core/scale";

/**
 * The interiors' drawing scale (src/core/scale.ts). With `?escala=1.25` in the URL (and `?prueba`, the test
 * builds' flag) another value is drawn instead, to compare scales on a phone (docs/design/escala.md).
 */
export function worldScale(): number {
  try {
    const q = new URLSearchParams(location.search);
    const v = Number(q.get("escala"));
    if (q.has("prueba") && v >= 0.5 && v <= 3) return v;
  } catch {
    /* no location (tests) */
  }
  return WORLD_SCALE;
}

/**
 * Scale a room built at real size: positions and sizes times `k`, and its lights' reach with them (a
 * light's distance is in world units, not its parent's), with the intensity kept at what it was at 1×.
 */
export function scaleLights(root: { traverse(fn: (o: unknown) => void): void }, k: number): void {
  root.traverse((o) => {
    const l = o as { isPointLight?: boolean; isSpotLight?: boolean; distance: number; intensity: number; decay: number };
    if (l.isPointLight || l.isSpotLight) {
      l.distance *= k;
      l.intensity *= Math.pow(k, l.decay);
    }
  });
}
