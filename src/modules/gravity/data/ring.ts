import type { Sourced } from "@core/units";
import type { ComfortLimit, RingSpec } from "../domain/spin-gravity";

const HALL_1999 = "Hall, T. W. (1999), «Inhabiting Artificial Gravity», AIAA-99-4524, tabla 1: https://spacearchitect.org/pubs/AIAA-99-4524.pdf";
const GLOBUS_HALL_2017 = "Globus, A. y Hall, T. W. (2017), «Space Settlement Population Rotation Tolerance», NSS Space Settlement Journal: https://nss.org/wp-content/uploads/NSS-JOURNAL-Space-Settlement-Population-Rotation-Tolerance.pdf";
const SP_413 = "NASA SP-413 (1977), «Space Settlements: A Design Study», cap. 3: https://settlement.nss.org/75SummerStudy/Chapt3.html";

/**
 * Comfort boundaries for artificial gravity collected by Hall (1999, table 1), plus Globus & Hall
 * (2017) and the Stanford torus study. Gilruth's 2 rpm is his "optimum"; 6 rpm his general limit.
 */
export const COMFORT_LIMITS: readonly ComfortLimit[] = [
  { id: "hill-schnitzer", author: "Hill y Schnitzer", year: 1962, maxRpm: 4, minG: 0.035, maxG: 1, minRimSpeedMs: 6, source: HALL_1999 },
  { id: "gilruth", author: "Gilruth", year: 1969, maxRpm: 6, minG: 0.3, maxG: 0.9, maxGradient: 0.08, source: HALL_1999 },
  { id: "gordon-gervais", author: "Gordon y Gervais", year: 1969, maxRpm: 6, minG: 0.2, maxG: 1, maxGradient: 0.08, minRimSpeedMs: 7, source: HALL_1999 },
  { id: "stone", author: "Stone", year: 1973, maxRpm: 6.4, minG: 0.1, maxG: 1, maxGradient: 0.25, minRimSpeedMs: 10.2, source: HALL_1999 },
  { id: "cramer", author: "Cramer", year: 1985, maxRpm: 3, minG: 0.1, maxG: 1, maxGradientG: 0.03, minRimSpeedMs: 7, source: HALL_1999 },
  { id: "globus-hall", author: "Globus y Hall", year: 2017, maxRpm: 4, maxG: 1, source: GLOBUS_HALL_2017 },
  { id: "sp-413", author: "NASA SP-413 (toro de Stanford)", year: 1977, maxRpm: 1, minG: 0.9, maxG: 1, source: SP_413 },
];

/**
 * The Codeship's habitat ring. 4 rpm is the most Globus & Hall (2017) and Hill & Schnitzer (1962)
 * accept for residents; at that rate 1 g needs a floor radius of 55.9 m (a = ω²r). A ring for 2 rpm
 * would need 224 m. The farm deck (7 m) is the tallest deck; the ring is as wide as it (18 m).
 */
export const CODESHIP_RING: RingSpec = {
  name: "Anillo habitable",
  floorRadiusM: 56,
  widthM: 18,
  deckHeightM: 7,
  rpm: 4,
  /** Game value: about 25 min from rest to 4 rpm with the spin motor between the two twin rings. */
  spinUpRadS2: 0.0003,
  counterRotating: true,
  sources: [GLOBUS_HALL_2017, HALL_1999, SP_413],
};

/** Bone loss in microgravity, used to size the crew's small fitness penalty away from the ring. */
export const MICROGRAVITY_BONE_LOSS: Sourced<number> = {
  value: 0.0125,
  source: "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/",
  note: "«on average, bones lose between 1% and 1.5% of their density each month» en misiones de 4–6 meses; valor medio por mes",
};

/** Real precedent: Gemini 11 spun with the Agena on a 30 m tether and got about 0.00015 g (1966). */
export const GEMINI_11_TETHER_G: Sourced<number> = { value: 0.00015, source: "https://en.wikipedia.org/wiki/Gemini_11" };
