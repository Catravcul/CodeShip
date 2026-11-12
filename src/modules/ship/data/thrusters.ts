import type { ThrusterModel } from "../domain/components";

/**
 * Real thruster models. Values are copied from the cited pages (checked 2026-11-11).
 * When a page gives a range, the conservative end is used and the range is noted.
 */
export const R4D: ThrusterModel = {
  id: "aerojet-r-4d",
  name: "Aerojet Rocketdyne R-4D",
  thrustN: 490, // "110 lbf (490 N)" vacuum
  ispS: 312, // "312 s" vacuum
  dryMassKg: 3.6, // "8 lb (3.6 kg)"; the R-4D-11 variant is listed at 4.31 kg on SatCatalog
  propellant: "MMH/NTO",
  sources: [
    "https://en.wikipedia.org/wiki/R-4D",
    "https://www.satcatalog.com/component/r-4d-11-490n-300-to-1/",
  ],
};

export const MR106L: ThrusterModel = {
  id: "aerojet-mr-106l",
  name: "Aerojet Rocketdyne MR-106L (22 N class)",
  thrustN: 22, // nominal class; steady state "10 to 34 N" depending on feed pressure
  ispS: 228, // "228 to 235 sec"
  dryMassKg: 0.59, // "total mass of 0.59 kg"
  propellant: "Hydrazine",
  sources: ["https://satcatalog.com/component/mr-106l-22n"],
};

/**
 * Hydrazine monopropellant engine in the 510 N class: a main engine that drinks from the RCS tank.
 * Steady state "201.0 to 554.2 N" depending on feed pressure; Isp "223 to 237 seconds" (low end used).
 */
export const MR104H: ThrusterModel = {
  id: "aerojet-mr-104h",
  name: "Aerojet Rocketdyne MR-104H (510 N class)",
  thrustN: 510, // class thrust; steady state 201.0–554.2 N
  ispS: 223, // "223 to 237 seconds"
  dryMassKg: 2.4, // "total mass of 2.4 kg" (engine and valves)
  propellant: "Hydrazine",
  sources: ["https://satcatalog.com/component/mr-104h-510n/"],
};

/** Small attitude thruster: gentle, light and frugal with mass. */
export const MR111G: ThrusterModel = {
  id: "aerojet-mr-111g",
  name: "Aerojet Rocketdyne MR-111G (4 N class)",
  thrustN: 4, // class thrust; steady state "1.8 to 4.9 N"
  ispS: 219, // "219 to 229 sec"
  dryMassKg: 0.37, // engine, valves and heaters
  propellant: "Hydrazine",
  sources: ["https://satcatalog.com/component/mr-111g-4n/"],
};

/** Heavy attitude thruster: five times the push of the MR-106L, for a nimble but thirsty ship. */
export const MR107T: ThrusterModel = {
  id: "aerojet-mr-107t",
  name: "Aerojet Rocketdyne MR-107T (110 N class)",
  thrustN: 110, // class thrust; steady state "54 to 125 N"
  ispS: 222, // "222 to 225 sec"
  dryMassKg: 1.01, // "total mass of 1.01 kg (includes engine, valves, and heaters)"
  propellant: "Hydrazine",
  sources: ["https://satcatalog.com/component/mr-107t-110n/"],
};
