/**
 * The general presentation layer (Berón, 2026-11-16 19:54; docs/design/nodriza-starship.md, «Capa de
 * presentación»). Ships and compartments are stored at their true size; how they are drawn is a
 * player's setting, chosen on the yoga mat:
 *
 * - **Escala de interiores**: «Real» draws them 1:1; «Cómoda» draws rooms and machinery 1,5× bigger
 *   (the scale measured on an iPhone 13 in docs/design/escala.md).
 * - **Separación**: «Real» leaves the interactables where the data put them; «Amplia» moves them apart
 *   (lengthening the room) until no two are closer than 2 m (src/core/spacing.ts).
 *
 * Both are read once when the game loads (src/core/scale.ts, src/core/spacing.ts and the rooms are
 * built from them), from the same stored settings as the rest of the mat's rows («codeship.ajustes»).
 * Changing them applies on the next load. Without storage (tests), the defaults hold: Cómoda and Amplia,
 * the game's look until now.
 */
export type InteriorScale = "real" | "comoda";
export type InteriorSpacing = "real" | "amplia";

export const INTERIOR_SCALES: readonly InteriorScale[] = ["comoda", "real"];
export const INTERIOR_SPACINGS: readonly InteriorSpacing[] = ["amplia", "real"];

/** Drawing factor of each choice. */
export const SCALE_FACTOR: Readonly<Record<InteriorScale, number>> = { real: 1, comoda: 1.5 };

export interface Presentation {
  readonly interiorScale: InteriorScale;
  readonly spacing: InteriorSpacing;
}

export const DEFAULT_PRESENTATION: Presentation = { interiorScale: "comoda", spacing: "amplia" };

/** The two choices from the stored settings (JSON or nothing); anything unknown falls back to the defaults. */
export function presentationFrom(raw: string | null): Presentation {
  let o: Record<string, unknown> = {};
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === "object") o = v as Record<string, unknown>;
  } catch {
    o = {};
  }
  return {
    interiorScale: INTERIOR_SCALES.includes(o.interiorScale as InteriorScale) ? (o.interiorScale as InteriorScale) : DEFAULT_PRESENTATION.interiorScale,
    spacing: INTERIOR_SPACINGS.includes(o.spacing as InteriorSpacing) ? (o.spacing as InteriorSpacing) : DEFAULT_PRESENTATION.spacing,
  };
}

/** Key of the stored settings (src/ui/settings-store.ts). */
export const SETTINGS_KEY = "codeship.ajustes";

function stored(): string | null {
  try {
    const ls = (globalThis as { localStorage?: { getItem(k: string): string | null } }).localStorage;
    return ls ? ls.getItem(SETTINGS_KEY) : null;
  } catch {
    return null;
  }
}

/** The presentation this load of the game uses. */
export const PRESENTATION: Presentation = presentationFrom(stored());
