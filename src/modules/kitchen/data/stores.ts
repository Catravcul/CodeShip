/**
 * What the larder holds on day 1: stores the ship left with, in larder units (kitchen/data/items.ts).
 * Game values, not a real manifest: produce that keeps for months without a freezer (potatoes in the
 * cool store, dry peanuts, flour), a few eggs and some cultured meat, plus the animals' food and the
 * bioreactor's medium. Dry stores (oats, lentils, beans, oil, spices…) are not counted: recipes may
 * always use them.
 */
export const LAUNCH_STOCK: Readonly<Record<string, number>> = {
  "papa-norland": 12,
  "cacahuete-georgia-red": 20,
  harina: 10,
  huevo: 6,
  "carne-cultivada": 500,
  "pienso-gatos": 1500,
  "pienso-gallinas": 4,
  "medio-cultivo": 12,
};
