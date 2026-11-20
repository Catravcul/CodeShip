/**
 * What the station's own larder holds on day 1, in larder units (kitchen/data/items.ts). Game values:
 * dry and long-keeping stores like the ISS's (flour, peanuts, potatoes in the cool store) and cultured
 * meat from the station's protein line; no eggs, there are no hens here. Its crops (Vida) fill it up.
 */
export const STATION_LARDER: Readonly<Record<string, number>> = {
  harina: 8,
  "cacahuete-georgia-red": 12,
  "papa-norland": 6,
  "carne-cultivada": 300,
};

/** Share of each larder item that goes aboard the mothership as trip stores when she is berthed (game value). */
export const TRIP_STORES_SHARE = 0.5;
