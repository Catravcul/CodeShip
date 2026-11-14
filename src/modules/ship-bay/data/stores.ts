/**
 * Stores the ship left with (main.ts stocks the larder with these). The bay measures what is left
 * against them: under a quarter is a warning, none is critical. Game values.
 */
export const SHIP_STORES: readonly { readonly id: string; readonly capacity: number }[] = [
  { id: "pienso-gatos", capacity: 1500 },
  { id: "pienso-gallinas", capacity: 4 },
  { id: "medio-cultivo", capacity: 12 },
];
