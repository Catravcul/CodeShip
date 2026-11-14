/**
 * How much bigger than real the game draws interior spaces and machinery (docs/design/escala.md).
 *
 * Berón (2026-11-14): «la maquinaria debe ser grande para poder apreciarse; a tamaño real a través de
 * la cámara se ve pequeña». Data stay real (metres from the sources: console sizes, rack pitch, room
 * plans); the Three.js adapters multiply by this when they draw a room: its floor plan, walls and
 * ceiling, and its machines' widths, depths, screens and switches. Two things are NOT scaled:
 * - the characters (Doménica and her eye, 1,45 m standing, 1,2 m belted to a seat);
 * - the heights and sizes where her body meets a machine (work surface, seat, hand controllers, foot
 *   loops, handrails), so she still fits it.
 *
 * Measured on an iPhone 13 (390 × 664 visible, 72° vertical first-person lens) at 1×, 1,25×, 1,5× and 2×
 * (docs/design/escala.md, screenshots docs/screenshots/escala-*.png): 1,5× is the smallest scale at which a
 * console's toggle switch is 44 px across (Apple's minimum touch target) and its screen text ≈ 16 px seen
 * from where she stands, while the screen stays within MSIS's 0,71 m reach; at 2× it is 0,87 m away.
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
