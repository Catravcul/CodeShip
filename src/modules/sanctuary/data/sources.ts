/** Real sources behind the space sanctuary (docs/research/agua-y-fauna-en-ingravidez.md). Checked 2026-11-14. */
export const SANCTUARY_SRC = {
  /** Ijiri 1995 (Biol. Sci. Space 9:3): four medaka on IML-2 (STS-65, July 1994) mated, laid eggs that hatched; first vertebrates to mate in space. */
  medakaIml2: "https://www.jstage.jst.go.jp/article/bss/9/1/9_1_3/_article",
  /** Ijiri (Nagoya repository): the flown strain did not loop in ~20 s of parabolic micro-g and relied on its eyes. */
  medakaStrain: "https://nagoya.repo.nii.ac.jp/records/11922",
  /** JAXA Aquatic Habitat (AQH): 2 × 0.7 L tanks, 3.2 L loop, 0–0.5 L/min, artificial-lung gas exchange, nitrifying biofilter, LEDs 0–1000 lux, up to 90 days. */
  aqh: "https://iss.jaxa.jp/en/kiboexp/pm/aqh",
  /** IHB-CAS 2025: four zebrafish and 4 g of hornwort ran 43 days in a closed aquatic ecosystem on Tiangong (2024) and laid eggs. */
  zebrafishTiangong: "https://english.ihb.cas.cn/newsroom/itm/202501/t20250117_898908.html",
  /** Sixth Tone 2025: the Tiangong zebrafish flipped and spun around day 20, then adapted; 1.2 L tank; previous record 16 days with swordtails. */
  zebrafishBehaviour: "https://www.sixthtone.com/news/1016541",
  /** Blüm et al. 1999 (SAE 1999-01-1988): C.E.B.A.S. Minimodule with swordtails, Biomphalaria snails, hornwort and filter bacteria flew on STS-89 and STS-90 (1998). */
  cebas: "https://saemobilus.sae.org/papers/cebas-minimodule-development-realization-perspectives-1999-01-1988",
  /** DLR 2013: Omegahab on Bion-M1 with Euglena, hornwort, 40 tilapia larvae, Hyalella shrimp and ramshorn snails. */
  omegahab: "https://dlr.de/en/latest/news/2013/20130419_lift-off-mini-ecosystem-and-mini-satellites-en-route-to-space_6797/@@download/file",
  /** Scientific American: mummichogs on Skylab 3 (1973) looped at first, then swam with their backs to the cabin lights; fry hatched in orbit did not loop. */
  skylabFish: "https://www.scientificamerican.com/blog/guest-blog/the-first-fish-in-orbit/",
  /** Wiederhold et al. (NTRS 20030068205): Neurolab snails and swordtail larvae grew larger gravity-sensing stones in orbit. */
  neurolabOtoliths: "https://ntrs.nasa.gov/citations/20030068205",
  /** STS-90 press kit: Neurolab carried crickets (Horn, Ulm) to study how their gravity sensors develop. */
  neurolabCrickets: "https://www.nasa.gov/wp-content/uploads/2023/05/sts-090-press-kit.pdf",
  /** Miquel (NASA Ames, NTRS 19850027266): on STS-3 velvetbean moths flew normally, house flies managed, honeybees tumbled and floated. */
  sts3Insects: "https://ntrs.nasa.gov/api/citations/19850027266/downloads/19850027266.pdf",
  /** Nadezhda: cockroach conceived on Foton-M3 (Sept. 2007); 33 offspring. */
  nadezhda: "https://en.wikipedia.org/wiki/Nadezhda_(cockroach)",
  /** Jönsson et al. 2008, Current Biology: dried tardigrades survived open space on FOTON-M3. */
  tardigrades: "https://www.sciencedaily.com/releases/2008/09/080908135906.htm",
  /** Moran et al. 2014, PLOS ONE: blind cavefish spend 27 % less energy than surface fish in light/dark (38 % vs surface fish in the dark). */
  cavefish: "https://www.sciencenews.org/blog/wild-things/blind-cavefish-got-no-circadian-rhythm",
  /** University of Hawaiʻi 2021: >120 Hawaiian bobtail squid flew to the ISS (SpaceX CRS-22, UMAMI). */
  bobtailIss: "https://hawaii.edu/news/2021/06/24/squids-in-space",
  /** Drazen, Bird & Barry 2005 (L&O Methods 3:488): a grenadier held at 13–14.5 MPa lived 84 h; 10 % pressure drops killed it. */
  deepSeaPressure: "https://www.aanderaa.com/media/pdfs/drazen-et-al-2005-hyperbaric-fish-incubator-reduced-size.pdf",
  /** Yancey et al. 2014, PNAS: TMAO rises with depth; fish limit near 8 200 m. */
  tmao: "https://phys.org/news/2014-03-marine-fish-dont-deeper-blue.html",
  /** Solar Foods (Solein): bacteria grown on hydrogen, CO2 and ammonia — chemosynthesis without light. */
  solein: "https://en.wikipedia.org/wiki/Solar_Foods",
  /** UF/IFAS FA27: dissolved oxygen ≥ 5 mg/L for good health; distress at 2–4; deaths below 2. */
  dissolvedOxygen: "https://ask.ifas.ufl.edu/publication/FA002/pdf",
  /** NASA Veggie and APH: crops grow on the ISS under LEDs. */
  issCrops: "https://www.nasa.gov/missions/station/growing-plants-in-space/",
} as const;
