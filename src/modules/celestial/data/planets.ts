import type { Sourced } from "@core/units";
import type { MeanElements } from "../domain/orbit";

const STANDISH = "https://ssd.jpl.nasa.gov/planets/approx_pos.html";
const FACT_SHEET = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/";
const MALLAMA = "https://arxiv.org/abs/1808.01973";

/** V(1, α): magnitude at 1 AU from Sun and observer, as a function of phase angle in degrees. */
export type PhaseLaw = (alphaDeg: number) => number;

export interface PlanetData {
  readonly id: string;
  readonly name: string;
  /** Mean elements valid 1800–2050 AD (J2000 ecliptic). */
  readonly orbit: Sourced<MeanElements>;
  /** Volumetric mean radius, km. */
  readonly radiusKm: Sourced<number>;
  readonly magnitude: Sourced<PhaseLaw>;
  /** Display colour for the impostor (game value, eyeballed from photographs). */
  readonly colour: number;
}

const el = (a: [number, number], e: [number, number], I: [number, number], L: [number, number], longPeri: [number, number], longNode: [number, number]): Sourced<MeanElements> => ({
  value: { a, e, I, L, longPeri, longNode },
  source: STANDISH,
  note: "Table 1, 1800 AD – 2050 AD (E. M. Standish, JPL)",
});
const r = (km: number): Sourced<number> => ({ value: km, source: FACT_SHEET, note: "volumetric mean radius" });
const mag = (law: PhaseLaw, note: string): Sourced<PhaseLaw> => ({ value: law, source: MALLAMA, note: `Mallama & Hilton 2018, Astronomy and Computing 25:10. ${note}` });

/** The eight planets with JPL mean elements, real radii and apparent-magnitude laws. */
export const PLANETS: readonly PlanetData[] = [
  {
    id: "mercurio",
    name: "Mercurio",
    orbit: el([0.38709927, 0.00000037], [0.20563593, 0.00001906], [7.00497902, -0.00594749], [252.2503235, 149472.67411175], [77.45779628, 0.16047689], [48.33076593, -0.12534081]),
    radiusKm: r(2439.7),
    magnitude: mag((a) => -0.613 + 6.328e-2 * a - 1.6336e-3 * a ** 2 + 3.3644e-5 * a ** 3 - 3.4265e-7 * a ** 4 + 1.6893e-9 * a ** 5 - 3.0334e-12 * a ** 6, "eq. for Mercury"),
    colour: 0xb8aea4,
  },
  {
    id: "venus",
    name: "Venus",
    orbit: el([0.72333566, 0.0000039], [0.00677672, -0.00004107], [3.39467605, -0.0007889], [181.9790995, 58517.81538729], [131.60246718, 0.00268329], [76.67984255, -0.27769418]),
    radiusKm: r(6051.8),
    magnitude: mag((a) => (a < 163.7 ? -4.384 - 1.044e-3 * a + 3.687e-4 * a ** 2 - 2.814e-6 * a ** 3 + 8.938e-9 * a ** 4 : 236.05828 - 2.81914 * a + 8.39034e-3 * a ** 2), "eq. for Venus"),
    colour: 0xfff1d0,
  },
  {
    id: "tierra",
    name: "Tierra",
    orbit: el([1.00000261, 0.00000562], [0.01671123, -0.00004392], [-0.00001531, -0.01294668], [100.46457166, 35999.37244981], [102.93768193, 0.32327364], [0, 0]),
    radiusKm: r(6371.0),
    magnitude: mag((a) => -3.99 - 1.06e-3 * a + 2.054e-4 * a ** 2, "eq. for Earth. Orbit is the Earth–Moon barycentre."),
    colour: 0x9cc8ff,
  },
  {
    id: "marte",
    name: "Marte",
    orbit: el([1.52371034, 0.00001847], [0.0933941, 0.00007882], [1.84969142, -0.00813131], [-4.55343205, 19140.30268499], [-23.94362959, 0.44441088], [49.55953891, -0.29257343]),
    radiusKm: r(3389.5),
    magnitude: mag((a) => (a <= 50 ? -1.601 + 2.267e-2 * a - 1.302e-4 * a ** 2 : -0.367 - 0.02573 * a + 3.445e-4 * a ** 2), "eq. for Mars, without rotation and orbital-longitude corrections"),
    colour: 0xffa27a,
  },
  {
    id: "jupiter",
    name: "Júpiter",
    orbit: el([5.202887, -0.00011607], [0.04838624, -0.00013253], [1.30439695, -0.00183714], [34.39644051, 3034.74612775], [14.72847983, 0.21252668], [100.47390909, 0.20469106]),
    radiusKm: r(69911),
    magnitude: mag((a) => {
      if (a <= 12) return -9.395 - 3.7e-4 * a + 6.16e-4 * a ** 2;
      const x = a / 180;
      return -9.428 - 2.5 * Math.log10(1 - 1.507 * x - 0.363 * x ** 2 - 0.062 * x ** 3 + 2.809 * x ** 4 - 1.876 * x ** 5);
    }, "eqs. for Jupiter"),
    colour: 0xf3dcb8,
  },
  {
    id: "saturno",
    name: "Saturno",
    orbit: el([9.53667594, -0.0012506], [0.05386179, -0.00050991], [2.48599187, 0.00193609], [49.95424423, 1222.49362201], [92.59887831, -0.41897216], [113.66242448, -0.28867794]),
    radiusKm: r(58232),
    magnitude: mag(
      (a) => (a <= 6.5 ? -8.95 - 3.7e-4 * a + 6.16e-4 * a ** 2 : -8.94 + 2.446e-4 * a + 2.672e-4 * a ** 2 - 1.506e-6 * a ** 3 + 4.767e-9 * a ** 4),
      "globe only: the rings were edge-on in 2025 and still nearly so in 2026, so their light is left out",
    ),
    colour: 0xf0dca0,
  },
  {
    id: "urano",
    name: "Urano",
    orbit: el([19.18916464, -0.00196176], [0.04725744, -0.00004397], [0.77263783, -0.00242939], [313.23810451, 428.48202785], [170.9542763, 0.40805281], [74.01692503, 0.04240589]),
    radiusKm: r(25362),
    magnitude: mag((a) => -7.11 + (a > 3.1 ? 6.587e-3 * a + 1.045e-4 * a ** 2 : 0), "eq. for Uranus, without the sub-latitude term"),
    colour: 0xbfeef0,
  },
  {
    id: "neptuno",
    name: "Neptuno",
    orbit: el([30.06992276, 0.00026291], [0.00859048, 0.00005105], [1.77004347, 0.00035372], [-55.12002969, 218.45945325], [44.96476227, -0.32241464], [131.78422574, -0.00508664]),
    radiusKm: r(24622),
    magnitude: mag((a) => -7.0 + (a > 1.9 ? 7.944e-3 * a + 9.617e-5 * a ** 2 : 0), "eq. for Neptune after 2000"),
    colour: 0x7fa6ff,
  },
];

/** The Sun. */
export const SUN = {
  name: "Sol",
  radiusKm: { value: 695_700, source: "https://www.iau.org/static/resolutions/IAU2015_English.pdf", note: "IAU 2015 Resolution B3, nominal solar radius" } as Sourced<number>,
  magnitudeAt1AU: { value: -26.74, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html", note: "apparent visual magnitude from 1 AU" } as Sourced<number>,
};

/** Astronomical unit, km (IAU 2012 Resolution B2). */
export const AU_KM: Sourced<number> = { value: 149_597_870.7, source: "https://www.iau.org/static/resolutions/IAU2012_English.pdf", note: "IAU 2012 Resolution B2" };
