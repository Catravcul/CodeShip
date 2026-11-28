/** Real sources behind imports and the station's own import sources (docs/design/importacion.md). Checked 2026-11-13. */
export const IMPORT_SRC = {
  /** Jones 2018, ICES-2018-81 (NASA Ames), Table A2: Falcon 9 $2,72 k/kg, Falcon Heavy $1,41 k/kg, Shuttle $61,7 k/kg to LEO (2018 $). */
  launchCost: "https://ntrs.nasa.gov/api/citations/20200001093/downloads/20200001093.pdf",
  /** New Space Economy, 2026-06-21: Falcon 9 about $74 M in early 2026 (≈ $3 246/kg at 22 800 kg); Starship targets only, no public price. */
  launchPrices2026: "https://newspaceeconomy.ca/2026/06/21/how-accurate-were-elon-musks-falcon-9-and-starship-kg-claims/",
  /** SpaceX Raptor: the vacuum engine targets Isp ≈ 380 s. */
  raptor: "https://en.wikipedia.org/wiki/SpaceX_Raptor",
  /** Hohmann transfer orbit: Δv and transfer time between circular orbits. */
  hohmann: "https://en.wikipedia.org/wiki/Hohmann_transfer_orbit",
  /** Oberth effect / hyperbolic departure: Δv = √(v∞² + v_esc²) − v_circ from a parking orbit. */
  oberth: "https://en.wikipedia.org/wiki/Oberth_effect",
  /** Tsiolkovsky rocket equation. */
  rocketEquation: "https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation",
  /** Brophy et al. 2012, Keck Institute for Space Studies: Asteroid Retrieval Feasibility Study (~7 m, ~500 t, 40 kW SEP, Isp 3000 s, 6–10 years, ~$2,6 B). */
  keck: "https://kiss.caltech.edu/final_reports/Asteroid_final_report.pdf",
  /** NASA Asteroid Redirect Mission, option B: a boulder up to 4 m lifted off a larger asteroid; 50 kW SEP; cancelled 2017. */
  arm: "https://en.wikipedia.org/wiki/Asteroid_Redirect_Mission",
  /** Hall-effect thrusters: efficiencies of 45–60 %; thrust F = 2ηP / (g0·Isp). */
  hall: "https://en.wikipedia.org/wiki/Hall-effect_thruster",
  /** Arnold, O'Neill et al., Mass Drivers III: Engineering (Ames 1977): lunar launcher 10,5 kg buckets at 4 Hz, 2 400 m/s, 1 000 g, 488 m, 125 MW. */
  massDriverAmes: "https://settlement.nss.org/spaceres/III-3.html",
  /** Mass driver: Mass Driver Two's nominal 5 000 m/s² for 112 m/s; Mass Driver 1 fired 40 m/s at 33 g. */
  massDriver: "https://en.wikipedia.org/wiki/Mass_driver",
} as const;
