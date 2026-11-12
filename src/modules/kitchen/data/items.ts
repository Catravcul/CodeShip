/** What the larder holds, and in which unit. Crops are kept by their species id. */
export interface Item {
  readonly id: string;
  readonly name: string;
  readonly unit: "porción" | "g" | "huevo" | "lote" | "día";
}

export const ITEMS: readonly Item[] = [
  { id: "lechuga-outredgeous", name: "lechuga", unit: "porción" },
  { id: "chile-espanola", name: "chile", unit: "porción" },
  { id: "tomate-red-robin", name: "tomate", unit: "porción" },
  { id: "rabano-cherry-belle", name: "rábano", unit: "porción" },
  { id: "papa-norland", name: "papa", unit: "porción" },
  { id: "soja-hoyt", name: "soja", unit: "porción" },
  { id: "trigo-apogee", name: "trigo", unit: "porción" },
  { id: "cacahuete-georgia-red", name: "cacahuetes", unit: "porción" },
  { id: "fresa-seascape", name: "fresas", unit: "porción" },
  { id: "higo", name: "higos", unit: "porción" },
  { id: "crema-cacahuete", name: "crema de cacahuete", unit: "porción" },
  { id: "harina", name: "harina", unit: "porción" },
  { id: "tofu", name: "tofu", unit: "porción" },
  { id: "huevo", name: "huevos", unit: "huevo" },
  { id: "carne-cultivada", name: "carne cultivada", unit: "g" },
  { id: "pienso-gallinas", name: "pienso de gallinas", unit: "día" },
  { id: "pienso-gatos", name: "pienso de gatos", unit: "g" },
  { id: "medio-cultivo", name: "medio de cultivo", unit: "lote" },
];

export const itemName = (id: string): string => ITEMS.find((i) => i.id === id)?.name ?? id;
