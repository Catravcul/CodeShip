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

/** How an area moves her: floating (zero g), walking with gravity, or swimming. */
export type AreaMotion = "ingravidez" | "gravedad" | "agua";

/**
 * Every area she can be in, and how it moves her (Berón, 2026-11-17 18:54; reglas.md §2): in space every Starship,
 * ISS and LM area is zero g, the LM landed on an asteroid included (microgravity), and outside on the asteroid too:
 * she moves by herself along routes (arrows, «Ir», taps, the spacewalk's buttons) and the on-screen joystick only
 * moves the camera. The aerial sanctuary (level 3) is on Earth (Berón, 2026-11-18; santuario3-iniciacion.md): she
 * walks its islands with gravity and swims its sea, pools and water trunks, so there the stick moves her.
 */
export const AREA_MOTION = {
  "cabina-lm": "ingravidez",
  puente: "ingravidez",
  starship: "ingravidez",
  estacion: "ingravidez",
  "paseo-estacion": "ingravidez",
  "paseo-asteroide": "ingravidez",
  // The ring ship's 1 g decks are fiction and unwired (REAL_ONLY): if they come back, they say «gravedad» here.
  anillo: "ingravidez",
  // Sanctuary 3: its decks and floors, and its water (the sea, the NBL pool, the trees' trunks).
  "santuario-aereo": "gravedad",
  "santuario-aereo-agua": "agua",
} as const satisfies Readonly<Record<string, AreaMotion>>;

export type AreaId = keyof typeof AREA_MOTION;

/** Whether an area has a joystick that moves her (walking with gravity or swimming): only sanctuary 3's. */
export function moveJoystick(area: AreaId): boolean {
  return AREA_MOTION[area] !== "ingravidez";
}
