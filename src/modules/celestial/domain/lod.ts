/** How a body is drawn: a real mesh, or a cheap point (impostor). */
export type Lod = "mesh" | "point";

/** Pixels per radian for a vertical field of view and viewport height. */
export function pixelsPerRadian(fovYDeg: number, heightPx: number): number {
  return heightPx / (2 * Math.tan((fovYDeg * Math.PI) / 360));
}

/** On-screen size of a body, pixels. */
export function apparentSizePx(diameterM: number, distanceM: number, pxPerRad: number): number {
  return 2 * Math.atan(diameterM / (2 * Math.max(distanceM, 1e-6))) * pxPerRad;
}

/** Bodies wider than this on screen get a mesh; smaller ones a point. Game tuning value. */
export const MESH_MIN_PX = 8;

export function chooseLod(diameterM: number, distanceM: number, pxPerRad: number, meshMinPx = MESH_MIN_PX): Lod {
  return apparentSizePx(diameterM, distanceM, pxPerRad) >= meshMinPx ? "mesh" : "point";
}

/**
 * Point size and opacity for a star-like body of a given apparent magnitude. Brighter by 1
 * magnitude = ×2,512 light; screens can't show that range, so it is squeezed: about 1 px per
 * 1,5 magnitudes, and bodies fainter than the naked-eye limit (~6,5) fade almost out. Game tuning.
 */
export function impostorForMagnitude(m: number): { sizePx: number; alpha: number } {
  const sizePx = Math.max(1.5, Math.min(6, 2.2 + (1 - m) / 1.5));
  const alpha = Math.max(0.06, Math.min(1, (7 - m) / 6));
  return { sizePx, alpha };
}
