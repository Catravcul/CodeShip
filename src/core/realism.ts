/**
 * The real-only switch for interiors and vehicles (Berón, 2026-11-16; docs/pendientes.md).
 *
 * «Empezamos de cero con naves y procesos reales». The correction of 19:54 narrows it: the rule
 * applies to INTERIORS AND VEHICLES only (ships, station, compartments, life on board). The asteroid
 * gameplay stays as it is: mind duels, wrath, attacks and pursuit, self-travel, the subjugation
 * levels, the nano_net, and the imports.
 *
 * With `REAL_ONLY` on (the default), the wiring (main.ts and the scenes) does not build the fictional
 * interiors: the 1 g rings with their spoke and lift, the farm deck, the non-flown animals and their
 * families, and the sanctuary and aquarium biomes. The mothership is a Starship with a 0 g interior
 * («distribución nuestra») instead. Their code stays: each one is listed in docs/pendientes.md with
 * how it could come back as a declared licence or fiction layer.
 *
 * Development override: `?ficcion` in the URL turns the switch off and wires the old ring ship.
 * Domain code never reads this switch: it stays pure and its tests run either way.
 */
const search = typeof location === "undefined" ? "" : location.search;

/** Only real interiors and vehicles (the asteroid gameplay is not affected). */
export const REAL_ONLY: boolean = !new URLSearchParams(search).has("ficcion");

/** The opposite, for readability at the wiring. */
export const FICTION = !REAL_ONLY;

/** Build a fictional interior system only when the switch allows it. */
export function fiction<T>(make: () => T): T | undefined {
  return REAL_ONLY ? undefined : make();
}
