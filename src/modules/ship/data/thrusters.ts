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
