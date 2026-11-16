/**
 * What a piece of data is (brief of the real rebuild): real (flown or flying), in development (funded
 * programme with a date), licence (studied or tested, not built at this scale) or fiction.
 */
export type Reality = "real" | "en-desarrollo" | "licencia" | "ficcion";

export const REALITY_NAME: Readonly<Record<Reality, string>> = { real: "real", "en-desarrollo": "en desarrollo", licencia: "licencia", ficcion: "ficción" };
