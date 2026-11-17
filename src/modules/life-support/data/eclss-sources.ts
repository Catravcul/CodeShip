/**
 * Sources of the real life-support system (ECLSS) of the game (docs/research/soporte-vital.md).
 * Every number in data/crew-balance.ts, data/eclss-machines.ts and the domain cites one of these.
 */
export const ECLSS_SOURCES = {
  /** NASA MetMan crew balance (ICES-2019): 0,89 kg O₂, 1,08 kg CO₂, 2,53 kg of water vapour, 12 778 kJ a day. */
  metman: "https://ntrs.nasa.gov/api/citations/20190027563/downloads/20190027563.pdf",
  /** NASA OCHMO technical brief on CO₂: 3 mmHg (1 h, NASA-STD-3001 V2 6004), headaches 2,8–4,5 mmHg. */
  co2Brief: "https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/",
  /** NASA OCHMO technical brief on the habitable atmosphere: PIO₂ 149 mmHg normoxia, 122 mmHg lower limit. */
  atmosphereBrief: "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf",
  /** NASA OCHMO technical brief on water: 2,5 L a day minimum, 2,5 % of body mass lost impairs. */
  waterBrief: "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf",
  /** ISS ECLSS facts (Marshall): OGA 2,3–9 kg/day continuous, 5,4 kg/day cyclic; WRS saves 2760 kg/year for six. */
  marshall: "https://www.nasa.gov/centers/marshall/pdf/174687main_eclss_facts.pdf",
  /** OGA on-orbit performance (Erickson et al., NTRS 20080036243): 3573 W processing, 382 W standby. */
  ogaPerformance: "https://ntrs.nasa.gov/api/citations/20080036243/downloads/20080036243.pdf",
  /** ISS ECLS status, ICES-2024-141: OGA pump gear lockups, H₂ dome, cell stack; CDRA ASV 103 and blower. */
  eclsStatus2024: "https://ntrs.nasa.gov/api/citations/20240007995/downloads/ICES2024141%20ISS%20ECLS%20Presentaton%20RevA.pdf",
  /** CDRA-4EU tests (Knox et al., NTRS 20150016500): 4,8 kg CO₂/day at 3 torr, 4,1 crew at 2 torr, 10,5 at 5 torr. */
  cdra4eu: "https://ntrs.nasa.gov/api/citations/20150016500/downloads/20150016500.pdf",
  /** Status of ISS water management, ICES-2022-098: UPA 87 %, DA, PCPA, fluids pump; WPA MF bed; BPA ~98 %. */
  water2022: "https://ntrs.nasa.gov/api/citations/20220006163/downloads/ICES%202022-098%20Status%20of%20ISS%20Water%20Management%20and%20Recovery_Final%20Manuscript.pdf",
  /** 98 % water recovery on the ISS (June 2023). */
  water98: "https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf",
  /** ISS ECLSS overview: CDRA in Destiny and Node 3, Sabatier converts ~50 % of the CO₂, SFOG one person-day. */
  issEclss: "https://en.wikipedia.org/wiki/ISS_ECLSS",
  /** ISS consumables per crew-day from 15 years of logistics (Frontiers in Space Technologies, 2024). */
  logistics2024: "https://frontiersin.org/articles/10.3389/frspt.2024.1461389/full",
  /** TCCS post-sorbent and catalytic oxidizer beds after 5 years in orbit (NTRS 20070019823). */
  tccs: "https://ntrs.nasa.gov/api/citations/20070019823/downloads/20070019823.pdf",
  /** ISS active thermal control overview: LTL 4 °C, MTL 17 °C, ammonia 2,8 °C, 70 kW, pump module 354 kg. */
  atcs: "https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf",
  /** ISS internal thermal control loops: pump package, check valve and QD leak anomalies (NTRS 20040086485). */
  itcs: "https://ntrs.nasa.gov/api/citations/20040086485/downloads/20040086485.pdf",
  /** ISS fire detection and suppression (NTRS 20030053429): smoke detectors, CO₂ PFE of 6 lb at 850 psi, PBA 15 min. */
  fire: "https://ntrs.nasa.gov/api/citations/20030053429/downloads/20030053429.pdf",
  /** RadWorks storm shelter (NTRS 20150001237): water walls, 50 % dose reduction with 9,3–10,8 g/cm². */
  shelter: "https://ntrs.nasa.gov/api/citations/20150001237/downloads/20150001237.pdf",
  /** ISS CDRA failure causes and sorbent retainment redesign (NTRS 20050210002): a bed seal let zeolite fines out into the check valve, the air save pump and the selector valves. */
  cdraFailures: "https://ntrs.nasa.gov/api/citations/20050210002/downloads/20050210002.pdf",
  /** ISS hardware lessons (NASASpaceflight, 2013): CDRA selector valves sticking for years; Sabatier stopped by moisture in the CO₂ accumulator. */
  issHardware2013: "https://www.nasaspaceflight.com/2013/10/iss-hardware-providing-lessons-learned-deep-space-missions/",
  /** Cargo Dragon (Dragon 2): up to 2507 kg pressurised and 800 kg in the trunk to the ISS, 9,3 m³ pressurised. */
  dragon2: "https://en.wikipedia.org/wiki/SpaceX_Dragon_2",
  /** SpaceX CRS-28: launched 5 June 2023 15:47 UTC, docked 6 June 09:54 UTC (18 h); 3304 kg, 1098 kg of crew supplies. */
  crs28: "https://en.wikipedia.org/wiki/SpaceX_CRS-28",
  /** Cygnus NG-19: launched 2 August 2023 00:31 UTC, berthed on Unity nadir 4 August 12:28 UTC (60 h); 3749 kg pressurised, 1590 kg of crew supplies. */
  ng19: "https://en.wikipedia.org/wiki/Cygnus_NG-19",
  /** International Standard Payload Rack: about 2 m high, 1,05 m wide and 0,86 m deep. */
  ispr: "https://en.wikipedia.org/wiki/International_Standard_Payload_Rack",
  /** ISS facts: 916 m³ pressurised, 388 m³ habitable. */
  issFacts: "https://www.nasa.gov/international-space-station/space-station-facts-and-figures/",
} as const;

/**
 * How real a value or a machine is (docs/design/naves-reales.md, «Reglas de datos»): flown hardware,
 * in development, a licence (studied, not built), or fiction. Game tuning values say «valor de juego».
 */
export type Realism = "real" | "en-desarrollo" | "licencia" | "ficcion";

/** Note for tuning values: they make the game playable and are not measured. */
export const GAME_VALUE = "Valor de juego (no medido)";
