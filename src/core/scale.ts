/**
 * How much bigger than real the game draws interior spaces and machinery (docs/design/escala.md).
 *
 * Berón (2026-11-14): «la maquinaria debe ser grande para poder apreciarse; a tamaño real a través de
 * la cámara se ve pequeña». Data stay real (metres from the sources: console heights, rack pitch,
 * room sizes); the Three.js adapters multiply by this when they build a room, place its machines,
 * signs and tap boxes, and move the walker. Characters are NOT scaled: Doménica and her eye height
 * (1,45 m) stay real, so the room and its machines read `WORLD_SCALE` times bigger around her.
 *
 * Measured on an iPhone 13 (390 × 844 pt, 72° vertical first-person lens) at 1×, 1,25×, 1,5× and 2×:
 * see docs/design/escala.md for the numbers and the screenshots in docs/screenshots/escala-*.png.
 */
export const WORLD_SCALE = 1.5;

/** Machinery (consoles, racks, controls) uses the same factor as the spaces, so it fits where it stands. */
export const MACHINE_SCALE = WORLD_SCALE;

/** A real length, m, as drawn in the game's interiors. */
export const toWorld = (m: number): number => m * WORLD_SCALE;

/** A drawn length back to the real one, m (for rules that work on real data). */
export const toReal = (m: number): number => m / WORLD_SCALE;

/** The 2 m rule (src/core/spacing.ts) is checked on real data; drawn, the space is this many metres. */
export const drawnSpacing = (realM: number): number => realM * WORLD_SCALE;
