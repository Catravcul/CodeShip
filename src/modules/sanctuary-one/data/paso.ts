import { TREE } from "@modules/aerial-sanctuary/data/facts";
import { PRODUCCION_MODELS } from "./models/produccion";
import type { ModelDef } from "./models/kit";

/**
 * How wide the tree's water is in sanctuary 1 (Berón 2026-11-20: «las ramas y el tronco deben ser más anchos, quizás
 * las ramas ×2 y los troncos ×1,5… la regla base es que el submarino esté hecho a escala y pueda pasar por las ramas
 * con espacio sobrante para que puedan haber también personas y animales circulando, y la regla debe ser dinámica»).
 * The rule: every branch, and every trunk door, lets the largest water vehicle of the sanctuary through with a person
 * or an animal swimming beside it on each side and over it; and never less than Cold Sanctuary's sizes ×2 (branches)
 * and ×1,5 (trunk). Ours. The vehicles are the models with `travels: "agua"` (a test checks none is left out).
 */

/** Room beside the vehicle for someone swimming past it (each side), and over it, m. */
export const PASSAGE = { beside: 2, over: 2 } as const;

/** The water vehicles the rule looks at: those of the catalogue's vehicle makers (produccion.ts). */
export const WATER_VEHICLES: readonly ModelDef[] = PRODUCCION_MODELS.filter((m) => m.travels === "agua");

/** The largest of them (its width, height and length, m). */
export const LARGEST_SUB = WATER_VEHICLES.reduce((a, m) => ({ x: Math.max(a.x, m.size.x), y: Math.max(a.y, m.size.y), z: Math.max(a.z, m.size.z) }), { x: 0, y: 0, z: 0 });

/** The opening something must have to let it through with people beside and over it (width, height). */
export const NEEDED = { w: LARGEST_SUB.x + 2 * PASSAGE.beside, h: LARGEST_SUB.y + PASSAGE.over } as const;

/** The trunk's water, half its side (Cold Sanctuary's 20 m × 1,5, and at least the passage). */
export const TRUNK_HALF = Math.max(TREE.waterHalf.value * 1.5, NEEDED.w);
/** A floor's branch: half its side (Cold Sanctuary's door-sized 7 m tube × 2, and at least the passage). */
export const ROOM_BRANCH_HALF = Math.max(3.5 * 2, NEEDED.w / 2, NEEDED.h / 2);
/** An orchard tip's branch: half its width (×2) and half its height (as in Cold Sanctuary: the levels are 22 m apart). */
export const ORCHARD_BRANCH = { halfWidth: Math.max(TREE.tubeHalf.value * 2, NEEDED.w / 2), halfHeight: Math.max(TREE.tubeHalf.value, NEEDED.h / 2) } as const;
