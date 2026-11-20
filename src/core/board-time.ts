/**
 * The pace of life on board (docs/design/vida-a-bordo.md, «Ritmo de los días»): how many real seconds a
 * day on board lasts. Every «per day» and «per hour» of the game reads it through `frameClocks`
 * (src/modules/navigation/domain/travel-time.ts): the crew, the garden, the animals, the bioreactor, the
 * nano_net, the station's machines, bio lab and import inbox, and the asteroids' services.
 *
 * Berón (2026-11-16): «los días pasan muy rápido, ¿por eso el hambre parece constante?». It was 40 s, so
 * she was hungry every 13 s. Now 24 real minutes, the ratio of The Sims (a game minute every real
 * second). Berón (2026-11-16): «las comidas serán 2 al día»: hungry about twice a day, one meal every
 * ~12 real minutes, two or three per play session.
 * Compared in vida-a-bordo.md with Stardew Valley (~14 min), Don't Starve (8 min), Animal Crossing (real
 * time) and Cold Sanctuary (60 min). Game value.
 */
export const BOARD_DAY_REAL_S = 24 * 60;

/** Days on board per real second at ×1. */
export const BOARD_DAYS_PER_REAL_S = 1 / BOARD_DAY_REAL_S;

/** Hours on board (and of the station's clock, which follows it) per real second at ×1. */
export const BOARD_HOURS_PER_REAL_S = 24 / BOARD_DAY_REAL_S;

/**
 * Game seconds per real second at the pace of life on board: 86 400 s of a day in 24 real minutes, ×60
 * (a game hour every real minute). The automatic space trips play at this same pace
 * (docs/design/viajes.md, «Un solo reloj»): what the crew lives through on board during a trip is
 * exactly the trip's game time. Derived from BOARD_DAY_REAL_S.
 */
export const BOARD_TIME_LAPSE = 86400 / BOARD_DAY_REAL_S;
